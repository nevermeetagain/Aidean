/**
 * /api/v1/admin/vendors/batch — 厂商批量操作（R-28 补齐）。
 *
 * POST：requireAdminApi → 批量 activate/deactivate/delete（软删）
 *   body: { ids: string[], action: "activate" | "deactivate" | "delete" }
 */
import { revalidatePath } from "next/cache";
import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/db/prisma';
import { requireAdminApi } from '../../../../../../lib/features/auth/session';
import { writeAudit } from '../../../_lib/audit';
import { withApi } from '../../../_lib/handler';

export const dynamic = 'force-dynamic';

const MAX_BATCH = 100;
const VALID_ACTIONS = ['activate', 'deactivate', 'delete'] as const;
type BatchAction = typeof VALID_ACTIONS[number];

export const POST = withApi(async (req: Request) => {
  const ctx = await requireAdminApi("admin.vendors.write");

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
    const result = await prisma.vendor.updateMany({
      where: { id: { in: ids }, deletedAt: null },
      data: { deletedAt: new Date(), isActive: false },
    });
    affected = result.count;
  } else if (batchAction === 'activate') {
    const result = await prisma.vendor.updateMany({
      where: { id: { in: ids }, deletedAt: null },
      data: { isActive: true },
    });
    affected = result.count;
  } else {
    const result = await prisma.vendor.updateMany({
      where: { id: { in: ids }, deletedAt: null },
      data: { isActive: false },
    });
    affected = result.count;
  }

  await writeAudit({
    actorId: ctx.userId,
    tableName: 'vendors',
    recordId: ids.join(',').slice(0, 100),
    action: batchAction === 'delete' ? 3 : 2,
    changedFields: [batchAction],
    oldData: { count: ids.length },
    newData: { affected, action: batchAction },
  });

  revalidatePath('/vendors');
  return { action: batchAction, requested: ids.length, affected };
});
