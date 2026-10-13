/**
 * llmtest.cn API 站点采集同步脚本（L3）
 *
 * 功能：拉取 llmtest 公开榜单数据接口 → 映射为 discovery 候选 → 幂等落库。
 *   1. safeFetch GET https://llmtest.cn/api/leaderboard/composite（L0 实证 200/公开）
 *   2. data[] 每项（被监控的中转站/网关）映射为候选（sourceType='crawl', candidateType='gateway'）
 *   3. 按 domain 预检去重（discoverFromCrawl 内置，同域已存在候选则跳过 → 幂等）
 *   4. persistCandidates 写 DiscoveryCandidate(status='discovered') + EvidenceChain
 *   后续经后台人工审核「verify → promote」升级为 APIStation（promotedToType 支持 APIStation）。
 *
 * 采集逻辑真源在 apps/web/lib/discovery/{candidate-discovery,llmtest,entity-resolution}.ts，
 * 本脚本仅薄封装，便于与调度器（ScheduledScript）共用同一实现、防漂移。
 *
 * 用法：
 *   npx tsx scripts/crawl/crawl_llmtest.ts [--limit N] [--dry-run] [--help]
 */

import { discoverFromCrawl } from '../../apps/web/lib/discovery/candidate-discovery';
import { persistCandidates } from '../../apps/web/lib/discovery/entity-resolution';

interface Config {
  limit: number;
  dryRun: boolean;
}

function parseArgs(): Config {
  const args = process.argv.slice(2);
  const config: Config = { limit: 0, dryRun: false };
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--limit': {
        const val = parseInt(args[++i]);
        if (!isNaN(val) && val > 0) config.limit = val;
        break;
      }
      case '--dry-run':
        config.dryRun = true;
        break;
      case '--help':
      case '-h':
        console.log(`
llmtest.cn API 站点采集同步脚本

用法: npx tsx scripts/crawl/crawl_llmtest.ts [options]

选项:
  --limit <number>   限制本次落库的候选数量（调试用）
  --dry-run          仅发现并预览，不写入数据库
  --help             显示帮助信息
`);
        process.exit(0);
    }
  }
  return config;
}

async function main() {
  const config = parseArgs();

  console.log('========================================');
  console.log('  llmtest.cn 站点采集（discovery 候选）');
  console.log('========================================');

  const discovered = await discoverFromCrawl();
  console.log(`新发现候选（去重后）: ${discovered.length}`);

  if (discovered.length === 0) {
    console.log('无新增候选（可能均已存在或接口无数据），结束。');
    console.log('========================================\n');
    process.exit(0);
  }

  const toPersist = config.limit > 0 ? discovered.slice(0, config.limit) : discovered;
  for (const c of toPersist.slice(0, 10)) {
    console.log(`  - ${c.domain} | ${c.name} | ${c.description ?? ''}`);
  }
  if (toPersist.length > 10) console.log(`  ... 其余 ${toPersist.length - 10} 条`);

  if (config.dryRun) {
    console.log('\n[dry-run] 跳过数据库写入');
    console.log('========================================\n');
    process.exit(0);
  }

  const { created } = await persistCandidates(toPersist);
  console.log(`\n写入候选: ${created} | 证据链同步创建`);
  console.log('提示：请到「后台 · 发现候选」审核 verify → promote 为 APIStation');
  console.log('========================================\n');

  process.exit(0);
}

main().catch((err) => {
  console.error('crawl_llmtest 执行失败:', err instanceof Error ? err.message : err);
  process.exit(1);
});
