/**
 * AI 模型数据采集同步脚本（R-71：聚合采集）
 * 数据源：OpenRouter（主源） + Quanzil / ArenaAI / HuggingFace / LMSys / ArtificialAnalysis / EpochAI（交叉验证源）
 *
 * 聚合采集策略（优于单源）：
 * - 主源 OpenRouter 提供模型 ID + 定价 + 上下文长度 + benchmarks
 * - Quanzil 提供中国区中转站价格（367 模型，24 厂商）
 * - ArenaAI 提供 LMSys Arena ELO 排名（通过 OpenRouter benchmarks 代理）
 * - HuggingFace 提供参数量 + 多模态 + 开源标志 + 下载量
 * - LMSys 提供 Arena ELO 排名（实际用户盲测）
 * - ArtificialAnalysis 提供综合能力指数 + 速度 + 价格
 * - EpochAI 提供发布时间 + 参数 + 训练算力
 *
 * 多源数据经 CrossValidator 比对，冲突写入 validationSummary 供 admin 决策。
 *
 * 用法：
 *   npx tsx scripts/crawl/crawl_models.ts [--source all|openrouter|quanzil|arena] [--dry-run] [--limit 100]
 */

import { SyncOrchestrator } from '../../apps/web/lib/sync/sync-orchestrator';
import { buildAdapter } from '../../apps/web/lib/sync/sources/adapters';
import { MODEL_AGGREGATION_CROSS_KEYS } from '../../apps/web/lib/sync/sources/registry';
import type { SyncAdapter } from '../../apps/web/lib/sync/adapters/base';
import type { SyncConfig } from '../../apps/web/lib/sync/types/sync';

function parseArgs(): SyncConfig & { limit?: number; sourceName?: string } {
  const config: SyncConfig & { limit?: number; sourceName?: string } = {
    source: 'official_api',
    dryRun: false,
    batchSize: 500,
    options: {},
  };

  for (let i = 0; i < process.argv.slice(2).length; i++) {
    const args = process.argv.slice(2);
    switch (args[i]) {
      case '--source':
        config.sourceName = args[++i];
        config.options!.source = config.sourceName;
        break;
      case '--limit': {
        const val = parseInt(args[++i]);
        if (!isNaN(val)) { config.limit = val; config.options!.limit = val; }
        break;
      }
      case '--dry-run':
        config.dryRun = true;
        break;
      case '--timeout':
        config.options!.timeout = parseInt(args[++i]);
        break;
      case '--help':
      case '-h':
        console.log(`
模型数据聚合采集同步脚本（R-71）

用法: npx tsx scripts/crawl/crawl_models.ts [options]

选项:
  --source <name>    数据源模式:
                       all        = 主源 + 全部交叉验证源（默认）
                       openrouter = 仅 OpenRouter 主源
                       quanzil    = 仅 quanzil.com 数据源
                       arena      = 仅 arena.ai 数据源
  --limit <number>   限制每个源处理的模型数量
  --dry-run          仅预览不写入数据库
  --timeout <ms>     API请求超时时间
  --help             显示帮助信息

数据源:
  主源:     OpenRouter (模型 ID + 定价 + benchmarks)
  交叉验证: Quanzil (中国区中转站价格, 367 模型)
            ArenaAI (Arena ELO 排名, OpenRouter 代理)
            HuggingFace (参数 + 开源标志)
            LMSys (Arena ELO 排名)
            ArtificialAnalysis (综合能力指数)
            EpochAI (发布时间 + 训练算力)
`);
        process.exit(0);
    }
  }
  return config;
}

async function main() {
  const config = parseArgs();
  const sourceMode = config.sourceName ?? 'all';

  console.log('========================================');
  console.log('  模型数据聚合采集同步脚本（R-71）');
  console.log('========================================');
  console.log(`采集模式: ${sourceMode}`);
  console.log(`预览模式: ${config.dryRun ? '是' : '否'}`);
  if (config.limit) console.log(`数量限制: ${config.limit}`);
  console.log('----------------------------------------');

  // 注册表驱动选源（去硬编码 switch）：--source 值 → 适配器工厂查构造器
  // CLI 向后兼容别名：arena → arena-ai；其余任意注册表 key 均可单源运行。
  const CLI_KEY_ALIASES: Record<string, string> = { arena: 'arena-ai' };

  let primaryAdapter: SyncAdapter;
  let additionalAdapters: SyncAdapter[];

  if (sourceMode === 'all') {
    // 全量聚合模式（默认）：主源 OpenRouter + 有序交叉验证源
    const primary = buildAdapter('openrouter');
    if (!primary) { console.error('主源 openrouter 构造失败'); process.exit(1); }
    primaryAdapter = primary;
    additionalAdapters = MODEL_AGGREGATION_CROSS_KEYS
      .map(buildAdapter)
      .filter((a): a is SyncAdapter => !!a);
  } else {
    const key = CLI_KEY_ALIASES[sourceMode] ?? sourceMode;
    const built = buildAdapter(key);
    if (!built) {
      console.error(`未知数据源: ${sourceMode}（请检查 lib/sync/sources/registry.ts）`);
      process.exit(1);
    }
    primaryAdapter = built;
    additionalAdapters = [];
  }

  if (additionalAdapters.length > 0) {
    console.log(`主源: ${primaryAdapter.name}`);
    console.log(`交叉验证源 (${additionalAdapters.length}):`);
    for (const a of additionalAdapters) {
      console.log(`  - ${a.name}`);
    }
  } else {
    console.log(`数据源: ${primaryAdapter.name}（仅单源模式）`);
  }

  console.log('\n开始同步...\n');

  const orchestrator = new SyncOrchestrator(primaryAdapter, additionalAdapters);

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
