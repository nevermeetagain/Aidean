/**
 * 排名更新脚本（R-72：对齐到 13 维加权评分）
 *
 * 改用 rankService.recap() 替代手写 2 维 computeComposite 调用。
 * recap() 从 model_scores(isCurrent) 读取 13 维评分，
 * 按 ranking_weights(isActive) 加权计算 compositeScore，
 * 版本化写回（calcVersion+1，旧行 isCurrent=false）。
 *
 * 用法：
 *   npx tsx scripts/ranking/update_ranking.ts [--dry-run]
 *
 * --dry-run：仅预览本次重算的权重快照与预期更新模型数，不写入数据库。
 */

import { prisma } from '../../apps/web/lib/db/prisma';
import { rankService } from '../../apps/web/lib/features/ranking/service';
import { rankingRepository } from '../../apps/web/lib/features/ranking/repository';
import { ALL_DIMENSIONS } from '../../apps/web/lib/features/ranking/types';

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  console.log('========================================');
  console.log('  排名更新脚本（13 维加权 · R-72）');
  console.log('========================================');
  console.log(`模式: ${dryRun ? 'DRY RUN' : '实际执行'}`);
  console.log('----------------------------------------');

  // 1. 预览当前生效权重
  const weights = await rankingRepository.listActiveWeights();
  console.log(`生效权重维度: ${weights.length}`);

  if (weights.length === 0) {
    console.log('⚠️ 无生效权重配置，跳过排名计算');
    console.log('========================================\n');
    process.exit(0);
  }

  const weightsMap: Record<string, number> = {};
  for (const w of weights) {
    weightsMap[w.dimension] = w.weight;
    console.log(`  ${w.dimension}: ${w.weight}`);
  }

  const activeDims = ALL_DIMENSIONS.filter(d => weightsMap[d] !== undefined && weightsMap[d] > 0);
  console.log(`\n参与计算的维度 (${activeDims.length}/${ALL_DIMENSIONS.length}):`);
  for (const dim of activeDims) {
    console.log(`  ${dim} (weight=${weightsMap[dim]})`);
  }

  // 2. 统计待重算模型数
  const scoreCount = await prisma.modelScore.count({
    where: { isCurrent: true },
  });
  console.log(`\n待排名模型（有评分记录）: ${scoreCount}`);

  if (dryRun) {
    console.log('----------------------------------------');
    console.log('DRY RUN — 预览模式，不写入数据库');
    console.log(`预计更新: ${scoreCount} 个模型的 compositeScore`);
    console.log('（缺数模型将被跳过，不计入 updated）');
    console.log('========================================\n');
    process.exit(0);
  }

  // 3. 调用 rankService.recap() 执行 13 维加权重算
  console.log('\n开始重算...');
  const result = await rankService.recap();

  console.log('\n========================================');
  console.log('  重算结果');
  console.log('========================================');
  console.log(`成功更新: ${result.updated}/${scoreCount}`);
  console.log(`跳过（缺数）: ${scoreCount - result.updated}`);
  console.log(`权重快照维度: ${Object.keys(result.weights).length}`);
  console.log('========================================\n');

  process.exit(0);
}

main().catch(err => {
  console.error('❌ 排名更新失败:', err);
  process.exit(1);
});
