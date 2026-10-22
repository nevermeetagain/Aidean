/**
 * 协议兼容 / 能力矩阵回填种子（B11-03a，Q-11-01=A）。
 *
 * 派生逻辑在 lib/features/admin/matrix/backfill.ts（纯函数 + 单测），本文件只负责连库与输出。
 * 幂等：createMany skipDuplicates，重复执行 0 新增、不覆盖后台人工编辑行。
 * 用法：
 *   pnpm --filter web db:seed:matrix            # 写库
 *   pnpm --filter web db:seed:matrix -- --dry-run  # 只派生不写库
 * seed.ts 主流程末尾亦调用 seedMatrixBackfill(prisma)。
 */
import { PrismaClient } from "@prisma/client";
import { backfillMatrices, type BackfillResult } from "../lib/features/admin/matrix/backfill";

export async function seedMatrixBackfill(prisma: PrismaClient, opts: { dryRun?: boolean } = {}): Promise<BackfillResult> {
  return backfillMatrices(prisma, opts);
}

const isDirect = process.argv[1] && /seed-matrix-backfill\.ts$/.test(process.argv[1]);
if (isDirect) {
  const prisma = new PrismaClient();
  const dryRun = process.argv.includes("--dry-run");
  seedMatrixBackfill(prisma, { dryRun })
    .then((r) => {
      console.log(JSON.stringify(r));
    })
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
