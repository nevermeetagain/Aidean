/**
 * Skills 数据采集同步脚本（R-71：聚合采集实现）
 * 数据源：skillsmp.com
 *
 * 用法：npx tsx scripts/crawl/crawl_skills.ts [--dry-run] [--limit 50]
 */

import { SyncOrchestrator } from '../../apps/web/lib/sync/sync-orchestrator';
import { SkillsMPAdapter } from '../../apps/web/lib/sync/adapters/skillsmp';
import type { SyncConfig } from '../../apps/web/lib/sync/types/sync';

function parseArgs(): SyncConfig & { limit?: number } {
  const args = process.argv.slice(2);
  const config: SyncConfig & { limit?: number } = {
    source: 'crawler',
    dryRun: false,
    batchSize: 500,
    options: {},
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--dry-run':
        config.dryRun = true;
        break;
      case '--limit': {
        const val = parseInt(args[++i]);
        if (!isNaN(val)) { config.limit = val; config.options!.limit = val; }
        break;
      }
      case '--help':
      case '-h':
        console.log(`
Skills 数据采集同步脚本（R-71）

用法: npx tsx scripts/crawl/crawl_skills.ts [options]

选项:
  --dry-run          仅预览不写入数据库
  --limit <number>   限制处理的 Skills 数量
  --help             显示帮助信息

数据源:
  skillsmp.com — AI Skills 索引平台
`);
        process.exit(0);
    }
  }
  return config;
}

async function main() {
  const config = parseArgs();

  console.log('========================================');
  console.log('  Skills 数据采集同步脚本（R-71）');
  console.log('========================================');
  console.log(`预览模式: ${config.dryRun ? '是' : '否'}`);
  if (config.limit) console.log(`数量限制: ${config.limit}`);
  console.log('----------------------------------------');
  console.log('开始同步...\n');

  const adapter = new SkillsMPAdapter();
  const orchestrator = new SyncOrchestrator(adapter);

  try {
    const result = await orchestrator.execute(config);

    console.log('\n========================================');
    console.log('  同步结果');
    console.log('========================================');
    console.log(`状态: ${result.status}`);
    console.log(`批次ID: ${result.batchId}`);
    console.log(`总记录: ${result.totalRecords}`);
    console.log(`成功: ${result.successRecords}`);
    console.log(`跳过: ${result.skippedRecords}`);
    console.log(`失败: ${result.failedRecords}`);

    if (result.errors.length > 0) {
      console.log('----------------------------------------');
      console.log('错误列表:');
      for (const err of result.errors.slice(0, 10)) {
        console.log(`  - ${err.modelCode}: ${err.error}`);
      }
    }

    console.log('========================================\n');
    process.exit(result.status === 'failed' ? 1 : 0);
  } catch (error) {
    console.error('\n❌ 同步失败:', error);
    process.exit(1);
  }
}

main().catch(console.error);
