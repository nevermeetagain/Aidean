/**
 * AI 模型数据采集同步脚本
 * 数据源：OpenRouter / LMSys Arena
 * 功能：模型信息+定价+评分采集 → 字段标准化 → 差异比对 → Prisma upsert
 *
 * 用法：
 *   npx tsx scripts/crawl/crawl_models.ts [--source openrouter,arena] [--limit 100] [--dry-run] [--timeout 30000]
 *
 * 参数说明：
 *   --source   数据源，逗号分隔，默认 openrouter,arena
 *   --limit    限制处理的模型数量，默认不限制
 *   --dry-run  仅预览不写入数据库
 *   --timeout  API请求超时时间(ms)，默认30000
 *   --retry    重试次数，默认3
 */

import { executeFullSync } from '../../src/lib/sync/sync-orchestrator';
import type { SyncConfig } from '../../src/lib/sync/types/sync';

function parseArgs(): Partial<SyncConfig> {
  const args = process.argv.slice(2);
  const config: Partial<SyncConfig> = {
    sources: ['openrouter', 'arena'],
    dryRun: false,
    timeout: 30000,
    retryCount: 3,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--source': {
        const val = args[++i];
        if (val) {
          config.sources = val.split(',').filter((s): s is 'openrouter' | 'arena' =>
            s === 'openrouter' || s === 'arena'
          );
        }
        break;
      }
      case '--limit': {
        const val = parseInt(args[++i]);
        if (!isNaN(val)) config.limit = val;
        break;
      }
      case '--dry-run': {
        config.dryRun = true;
        break;
      }
      case '--timeout': {
        const val = parseInt(args[++i]);
        if (!isNaN(val)) config.timeout = val;
        break;
      }
      case '--retry': {
        const val = parseInt(args[++i]);
        if (!isNaN(val)) config.retryCount = val;
        break;
      }
      case '--help':
      case '-h': {
        console.log(`
模型数据采集同步脚本

用法: npx tsx scripts/crawl/crawl_models.ts [options]

选项:
  --source <sources>   数据源，逗号分隔 (openrouter,arena)，默认 openrouter,arena
  --limit <number>     限制处理的模型数量
  --dry-run            仅预览不写入数据库
  --timeout <ms>       API请求超时时间，默认30000
  --retry <count>      重试次数，默认3
  --help               显示帮助信息
`);
        process.exit(0);
      }
    }
  }

  return config;
}

async function main() {
  const config = parseArgs();

  console.log('========================================');
  console.log('  模型数据采集同步脚本');
  console.log('========================================');
  console.log(`数据源: ${config.sources?.join(', ') || 'openrouter,arena'}`);
  console.log(`预览模式: ${config.dryRun ? '是' : '否'}`);
  console.log(`超时时间: ${config.timeout}ms`);
  console.log(`重试次数: ${config.retryCount}`);
  if (config.limit) console.log(`数量限制: ${config.limit}`);
  console.log('----------------------------------------');
  console.log('开始同步...\n');

  const startTime = Date.now();

  try {
    const result = await executeFullSync(config);

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('\n========================================');
    console.log('  同步结果');
    console.log('========================================');
    console.log(`状态: ${result.success ? '✅ 成功' : '❌ 失败'}`);
    console.log(`耗时: ${duration}s`);
    console.log(`批次ID: ${result.batchId}`);
    console.log('----------------------------------------');
    console.log(`发现模型: ${result.stats.modelsFound}`);
    console.log(`新增模型: ${result.stats.modelsNew}`);
    console.log(`更新模型: ${result.stats.modelsUpdated}`);
    console.log(`废弃模型: ${result.stats.modelsDeprecated}`);
    console.log(`未变化: ${result.stats.modelsUnchanged}`);
    console.log(`错误数: ${result.stats.errors}`);

    if (result.phases && result.phases.length > 0) {
      console.log('----------------------------------------');
      console.log('阶段详情:');
      for (const phase of result.phases) {
        console.log(`  ${phase.name}: ${phase.status} (处理${phase.stats?.processed ?? 0}, 成功${phase.stats?.succeeded ?? 0}, 失败${phase.stats?.failed ?? 0})`);
      }
    }

    if (result.errors && result.errors.length > 0) {
      console.log('----------------------------------------');
      console.log('错误列表:');
      for (const err of result.errors.slice(0, 10)) {
        console.log(`  - ${err}`);
      }
      if (result.errors.length > 10) {
        console.log(`  ... 还有 ${result.errors.length - 10} 个错误`);
      }
    }

    console.log('========================================\n');

    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error('\n❌ 同步失败:', error);
    process.exit(1);
  }
}

main().catch(console.error);
