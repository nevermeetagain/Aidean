/**
 * API 中转站数据采集同步脚本
 * 功能：站点可用性探测 + 价格/模型列表同步 → Prisma upsert
 *
 * 用法：
 *   npx tsx scripts/crawl/crawl_api_stations.ts [--limit 50] [--dry-run]
 */

async function main() {
  console.log('API中转站采集同步脚本 - 待实现');
}

main().catch(console.error);
