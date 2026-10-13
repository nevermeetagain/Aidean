/**
 * /api/v1/admin/benchmarks/batch — 评测数据批量操作（R-28 补齐）。
 *
 * POST：requireAdminApi → 批量 verify/unverify/delete（硬删，Benchmark 无 deletedAt）
 *   body: { ids: string[], action: "verify" | "unverify" | "delete" }
 */
import { revalidatePath } from "next/cache";
import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/db/prisma';
import { requireAdminApi } from '../../../../../../lib/features/auth/session';
import { writeAudit } from '../../../_lib/audit';
import { withApi } from '../../../_lib/handler';

export const dynamic = 'force-dynamic';

const MAX_BATCH = 100;
const VALID_ACTIONS = ['verify', 'unverify', 'delete'] as const;
type BatchAction = typeof VALID_ACTIONS[number];

export const POST = withApi(async (req: Request) => {
  const ctx = await requireAdminApi("admin.benchmarks.write");

  const body = await req.json();
  const { ids, action } = body as { ids?: string[]; action?: string };

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'ids 为必填数组' }, { status: 400 });
  }
  if (ids.length > MAX_BATCH) {
    return NextResponse.json({ error: `单次最多 ${MAX_BATCH} 条` }, { status: 400 });
  }
  if (!action || !VALID_ACTIONS.includes(action as BatchAction)) {
    return NextResponse.json({ error: `action 必须为: ${VALID_ACTIONS.join(', ')}` }, { status: 400 });
  }

  const batchAction = action as BatchAction;
  let affected = 0;

  if (batchAction === 'delete') {
    const result = await prisma.benchmark.deleteMany({
      where: { id: { in: ids } },
    });
    affected = result.count;
  } else if (batchAction === 'verify') {
    const result = await prisma.benchmark.updateMany({
      where: { id: { in: ids } },
      data: { verifiedStatus: 1 },
    });
    affected = result.count;
  } else {
    const result = await prisma.benchmark.updateMany({
      where: { id: { in: ids } },
      data: { verifiedStatus: 0 },
    });
    affected = result.count;
  }

  await writeAudit({
    actorId: ctx.userId,
    tableName: 'benchmarks',
    recordId: ids.join(',').slice(0, 100),
    action: batchAction === 'delete' ? 3 : 2,
    changedFields: [batchAction],
    oldData: { count: ids.length },
    newData: { affected, action: batchAction },
  });

  revalidatePath('/models');
  return { action: batchAction, requested: ids.length, affected };
});
