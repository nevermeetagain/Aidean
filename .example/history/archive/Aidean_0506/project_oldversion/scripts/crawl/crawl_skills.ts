/**
 * Skills 数据采集同步脚本
 * 数据源：skillsmp.com / smithery.ai / skills.sh
 * 功能：多平台聚合 → 优先级去重 → Prisma upsert
 *
 * 用法：
 *   npx tsx scripts/crawl/crawl_skills.ts [--source skillsmp,smithery,skills_sh] [--limit 100] [--dry-run] [--timeout 30000] [--retry 3]
 */

import { executeSkillsSync } from '../../src/lib/sync/tool-sync-orchestrator';
import { parseToolSyncArgs } from '../../src/lib/sync/tool-sync-utils';
import type { ToolSyncConfig } from '../../src/lib/sync/types/tool-sync';

function parseArgs(): Partial<ToolSyncConfig> & { help?: boolean } {
  const args = process.argv.slice(2);
  const config = parseToolSyncArgs(args);
  config.entityType = 'skill';
  if (!config.sources) {
    config.sources = ['skillsmp', 'smithery', 'skills_sh'];
  }
  return config;
}

async function main() {
  const config = parseArgs();

  if (config.help) {
    console.log(`
Skills 数据采集同步脚本

用法: npx tsx scripts/crawl/crawl_skills.ts [options]

选项:
  --source <sources>   数据源，逗号分隔 (skillsmp,smithery,skills_sh)，默认全部
  --limit <number>     限制处理的数量
  --dry-run            仅预览不写入数据库
  --timeout <ms>       API请求超时时间，默认30000
  --retry <count>      重试次数，默认3
  --help               显示帮助信息

数据源优先级:
  P1: skillsmp.com (最高)
  P2: smithery.ai
  P3: skills.sh
`);
    process.exit(0);
  }

  console.log('========================================');
  console.log('  Skills 数据采集同步脚本');
  console.log('========================================');
  console.log(`数据源: ${config.sources?.join(', ') || 'skillsmp,smithery,skills_sh'}`);
  console.log(`预览模式: ${config.dryRun ? '是' : '否'}`);
  console.log(`超时时间: ${config.timeout}ms`);
  console.log(`重试次数: ${config.retryCount}`);
  if (config.limit) console.log(`数量限制: ${config.limit}`);
  console.log('----------------------------------------');
  console.log('开始同步...\n');

  const startTime = Date.now();

  try {
    const result = await executeSkillsSync(config as ToolSyncConfig);
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('\n========================================');
    console.log('  同步结果');
    console.log('========================================');
    console.log(`状态: ${result.success ? '✅ 成功' : '❌ 失败'}`);
    console.log(`耗时: ${duration}s`);
    console.log('----------------------------------------');
    console.log(`获取总数: ${result.stats.totalFetched}`);
    console.log(`新增: ${result.stats.totalCreated}`);
    console.log(`更新: ${result.stats.totalUpdated}`);
    console.log(`跳过(低优先级): ${result.stats.totalSkipped}`);
    console.log(`失败: ${result.stats.totalFailed}`);

    if (result.phases.length > 0) {
      console.log('----------------------------------------');
      console.log('阶段详情:');
      for (const phase of result.phases) {
        console.log(`  ${phase.name}: ${phase.status} (获取${phase.stats?.fetched ?? 0}, 新增${phase.stats?.created ?? 0}, 更新${phase.stats?.updated ?? 0}, 失败${phase.stats?.failed ?? 0})`);
      }
    }

    if (result.errors.length > 0) {
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
