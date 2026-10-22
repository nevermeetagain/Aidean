/**
 * /api/v1/admin/models/batch — 模型批量操作（R-16 修复）。
 *
 * POST：requireAdminApi → 批量更新 isActive/visibility/sortOrder/删除
 *   body: { ids: string[], action: "activate" | "deactivate" | "hide" | "delete" }
 *
 * 安全约束：
 * - 单次最多 100 条
 * - 每条写 AuditLog
 * - delete 为软删
 */

import { revalidatePath } from "next/cache";
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '../../../../../../lib/db/prisma';
import { requireAdminApi } from '../../../../../../lib/features/auth/session';
import { writeAudit } from '../../../_lib/audit';
import { withApi } from '../../../_lib/handler';

export const dynamic = 'force-dynamic';

const MAX_BATCH = 100;

const VALID_ACTIONS = ['activate', 'deactivate', 'hide', 'delete'] as const;
type BatchAction = typeof VALID_ACTIONS[number];

export const POST = withApi(async (req: Request) => {
  const ctx = await requireAdminApi("admin.models.write");

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
    // Soft delete
    const result = await prisma.aiModel.updateMany({
      where: { id: { in: ids }, deletedAt: null },
      data: { deletedAt: new Date(), isActive: false },
    });
    affected = result.count;
  } else if (batchAction === 'activate') {
    const result = await prisma.aiModel.updateMany({
      where: { id: { in: ids }, deletedAt: null },
      data: { isActive: true },
    });
    affected = result.count;
  } else if (batchAction === 'deactivate') {
    const result = await prisma.aiModel.updateMany({
      where: { id: { in: ids }, deletedAt: null },
      data: { isActive: false },
    });
    affected = result.count;
  } else if (batchAction === 'hide') {
    const result = await prisma.aiModel.updateMany({
      where: { id: { in: ids }, deletedAt: null },
      data: { visibility: 'HIDDEN' },
    });
    affected = result.count;
  }

  // Write audit log (via writeAudit helper — includes actorId + requestId)
  await writeAudit({
    actorId: ctx.userId,
    tableName: 'ai_models',
    recordId: ids.join(',').slice(0, 100),
    action: batchAction === 'delete' ? 3 : 2,
    changedFields: [batchAction],
    oldData: { count: ids.length },
    newData: { affected, action: batchAction },
    requestId: req.headers.get('x-request-id'),
  });

  revalidatePath('/models');

  return {
    action: batchAction,
    requested: ids.length,
    affected,
  };
});

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../../_lib/method-not-allowed";
export const { GET, HEAD, PUT, PATCH, DELETE, OPTIONS } = methodNotAllowed(["POST"]);
