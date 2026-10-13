/**
 * /api/v1/admin/tier-mappings/batch — 模型等级映射批量操作（R-76）。
 *
 * POST：requireAdminApi → 批量删除
 *   body: { ids: string[], action: "delete" }
 *
 * UserTierMapping 无软删除字段（deletedAt），batch delete 为硬删除。
 */

import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../../lib/features/auth/session";
import { writeAudit } from "../../../_lib/audit";
import { withApi } from "../../../_lib/handler";

export const dynamic = "force-dynamic";

const MAX_BATCH = 100;
const VALID_ACTIONS = ["delete"] as const;
type BatchAction = (typeof VALID_ACTIONS)[number];

export const POST = withApi(async (req: Request) => {
  const ctx = await requireAdminApi("admin.tier-mappings.write");

  const body = await req.json();
  const { ids, action } = body as { ids?: string[]; action?: string };

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids 为必填数组" }, { status: 400 });
  }
  if (ids.length > MAX_BATCH) {
    return NextResponse.json({ error: `单次最多 ${MAX_BATCH} 条` }, { status: 400 });
  }
  if (!action || !VALID_ACTIONS.includes(action as BatchAction)) {
    return NextResponse.json(
      { error: `action 必须为: ${VALID_ACTIONS.join(", ")}` },
      { status: 400 }
    );
  }

  const batchAction = action as BatchAction;

  // 硬删除（UserTierMapping 无 deletedAt 字段）
  const result = await prisma.userTierMapping.deleteMany({
    where: { id: { in: ids } },
  });
  const affected = result.count;

  await writeAudit({
    actorId: ctx.userId,
    tableName: "user_tier_mappings",
    recordId: ids.join(",").slice(0, 100),
    action: 3,
    changedFields: [batchAction],
    oldData: { count: ids.length },
    newData: { affected, action: batchAction },
    requestId: req.headers.get("x-request-id"),
  });

  revalidatePath("/admin/tier-mappings");

  return { action: batchAction, requested: ids.length, affected };
});
