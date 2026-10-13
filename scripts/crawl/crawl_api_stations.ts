/**
 * API 中转站数据采集同步脚本
 * 功能：站点可用性探测 + 价格/模型列表同步 → Prisma upsert
 *
 * 数据源：公开 API 中转站目录（HuggingFace Spaces / GitHub awesome-lists / 站点自行公布的 /v1/models）
 * 采集策略：
 *   1. 从预设站点列表读取 baseUrl
 *   2. 探测 /v1/models 端点获取支持的模型列表
 *   3. 可用性探测：记录响应时间 + 状态码
 *   4. upsert 到 APIStation 表（按 name 去重）
 *
 * 用法：
 *   npx tsx scripts/crawl/crawl_api_stations.ts [--limit 50] [--dry-run] [--timeout 10000]
 */

import { prisma } from '../../apps/web/lib/db/prisma';

interface StationProbe {
  name: string;
  baseUrl: string;
  website?: string;
  description?: string;
}

/** 预设站点列表（可扩展为外部配置或数据库驱动） */
const KNOWN_STATIONS: StationProbe[] = [
  { name: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1', website: 'https://openrouter.ai', description: '统一 API 路由，支持 100+ 模型' },
  { name: 'Together AI', baseUrl: 'https://api.together.xyz/v1', website: 'https://together.ai', description: '开源模型托管平台' },
  { name: 'Fireworks AI', baseUrl: 'https://api.fireworks.ai/inference/v1', website: 'https://fireworks.ai', description: '高性能推理服务' },
  { name: 'Groq', baseUrl: 'https://api.groq.com/openai/v1', website: 'https://groq.com', description: '超低延迟推理' },
  { name: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', website: 'https://deepseek.com', description: 'DeepSeek 官方 API' },
  { name: 'SiliconFlow', baseUrl: 'https://api.siliconflow.cn/v1', website: 'https://siliconflow.cn', description: '硅基流动，国内多模型聚合' },
  { name: 'Volcengine', baseUrl: 'https://ark.cn-beijing.volces.com/api/v3', website: 'https://volcengine.com', description: '火山引擎，豆包系列模型' },
];

function parseArgs() {
  const args = process.argv.slice(2);
  const config = { limit: 0, dryRun: false, timeout: 10000 };
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--limit': {
        const val = parseInt(args[++i]);
        if (!isNaN(val)) config.limit = val;
        break;
      }
      case '--dry-run':
        config.dryRun = true;
        break;
      case '--timeout': {
        const val = parseInt(args[++i]);
        if (!isNaN(val)) config.timeout = val;
        break;
      }
      case '--help':
      case '-h':
        console.log(`
API中转站采集同步脚本

用法: npx tsx scripts/crawl/crawl_api_stations.ts [options]

选项:
  --limit <number>   限制探测的站点数量
  --dry-run          仅预览不写入数据库
  --timeout <ms>     单站点探测超时（默认 10000ms）
  --help             显示帮助信息
`);
        process.exit(0);
    }
  }
  return config;
}

interface ProbeResult {
  station: StationProbe;
  online: boolean;
  models: string[];
  latency: number | null;
  error?: string;
}

async function probeStation(station: StationProbe, timeout: number): Promise<ProbeResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  const start = Date.now();

  try {
    const res = await fetch(`${station.baseUrl}/models`, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });
    const latency = Date.now() - start;

    if (!res.ok) {
      return { station, online: false, models: [], latency, error: `HTTP ${res.status}` };
    }

    const data = await res.json() as { data?: Array<{ id: string }> };
    const models = (data.data ?? []).map(m => m.id);

    return { station, online: true, models, latency };
  } catch (err) {
    const latency = Date.now() - start;
    return {
      station,
      online: false,
      models: [],
      latency,
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const config = parseArgs();
  const stations = config.limit > 0 ? KNOWN_STATIONS.slice(0, config.limit) : KNOWN_STATIONS;

  console.log('========================================');
  console.log('  API 中转站采集同步脚本');
  console.log('========================================');
  console.log(`探测站点数: ${stations.length}`);
  console.log(`预览模式: ${config.dryRun ? '是' : '否'}`);
  console.log(`超时: ${config.timeout}ms`);
  console.log('----------------------------------------\n');

  const results: ProbeResult[] = [];
  for (const station of stations) {
    process.stdout.write(`  探测 ${station.name}...`);
    const result = await probeStation(station, config.timeout);
    results.push(result);

    if (result.online) {
      console.log(` ✅ 在线 (${result.latency}ms, ${result.models.length} 模型)`);
    } else {
      console.log(` ❌ 离线 (${result.error})`);
    }
  }

  const onlineCount = results.filter(r => r.online).length;
  console.log(`\n探测完成: ${onlineCount}/${results.length} 在线\n`);

  if (config.dryRun) {
    console.log('[dry-run] 跳过数据库写入');
    console.log('========================================\n');
    process.exit(0);
  }

  // Upsert to database
  let upserted = 0;
  let failed = 0;

  for (const result of results) {
    try {
      const slug = result.station.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const existing = await prisma.aPIStation.findFirst({
        where: { name: result.station.name, deletedAt: null },
      });

      const data = {
        name: result.station.name,
        displayName: result.station.name,
        description: result.station.description ?? '',
        website: result.station.website,
        baseUrl: result.station.baseUrl,
        models: result.models,
        protocols: ['openai'],
        isVerified: result.online,
        lastVerified: new Date(),
        avgLatency: result.latency,
        uptime: result.online ? 100 : 0,
      };

      if (existing) {
        await prisma.aPIStation.update({ where: { id: existing.id }, data });
      } else {
        await prisma.aPIStation.create({ data: { ...data, nameCn: undefined } as never });
      }
      upserted++;
    } catch (err) {
      console.error(`  ❌ upsert 失败 ${result.station.name}: ${err instanceof Error ? err.message : err}`);
      failed++;
    }
  }

  console.log('========================================');
  console.log('  同步结果');
  console.log('========================================');
  console.log(`探测: ${results.length} | 在线: ${onlineCount}`);
  console.log(`写入: ${upserted} | 失败: ${failed}`);
  console.log('========================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);
