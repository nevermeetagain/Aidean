/**
 * /api/v1/admin/providers/batch — 提供商批量操作。
 *
 * POST：requireAdminApi → 批量 activate/deactivate/delete
 *   body: { ids: string[], action: "activate" | "deactivate" | "delete" }
 */
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { prisma } from "../../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../../lib/features/auth/session";
import { writeAudit } from "../../../_lib/audit";
import { withApi } from "../../../_lib/handler";

export const dynamic = "force-dynamic";

const MAX_BATCH = 100;
const VALID_ACTIONS = ["activate", "deactivate", "delete"] as const;
type BatchAction = (typeof VALID_ACTIONS)[number];

export const POST = withApi(async (req: Request) => {
  const session = await requireAdminApi("admin.providers.write");

  const body = (await req.json().catch(() => null)) as { ids?: string[]; action?: string };
  const { ids, action } = body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids 为必填数组" }, { status: 400 });
  }
  if (ids.length > MAX_BATCH) {
    return NextResponse.json({ error: `单次最多 ${MAX_BATCH} 条` }, { status: 400 });
  }
  if (!action || !VALID_ACTIONS.includes(action as BatchAction)) {
    return NextResponse.json({ error: "action 非法" }, { status: 400 });
  }

  const act = action as BatchAction;
  const now = new Date();

  if (act === "delete") {
    await prisma.modelProvider.updateMany({
      where: { id: { in: ids }, deletedAt: null },
      data: { deletedAt: now, isActive: false },
    });
  } else {
    await prisma.modelProvider.updateMany({
      where: { id: { in: ids }, deletedAt: null },
      data: { isActive: act === "activate" },
    });
  }

  // S8.4 批量审计并行化：原 for-await 串行 N 次往返 → Promise.all 并发（ids≤100 封顶）
  await Promise.all(
    ids.map((rid) =>
      writeAudit({
        actorId: session.userId,
        tableName: "model_providers",
        action: act === "delete" ? 3 : 2,
        recordId: rid,
        newData: { action: act },
      })
    )
  );

  revalidatePath("/providers");
  return { updated: ids.length };
});
