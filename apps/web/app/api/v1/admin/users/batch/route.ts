/**
 * /api/v1/admin/users/batch — 用户批量操作（R-21 修复）。
 *
 * POST：requireAdminApi → 批量封禁 / 批量解禁
 *   body: { ids: string[], action: "suspend" | "activate" }
 *
 * 安全约束：
 * - 单次最多 100 条
 * - suspend 时 tokenVersion++ 使所有 token 失效
 * - 每条写 AuditLog
 */

import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../../lib/features/auth/session";
import { writeAudit } from "../../../_lib/audit";
import { withApi } from "../../../_lib/handler";

export const dynamic = "force-dynamic";

const MAX_BATCH = 100;

export const POST = withApi(async (req: Request) => {
  const ctx = await requireAdminApi("admin.users.write");

  const body = await req.json();
  const { ids, action } = body as { ids?: string[]; action?: string };

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids 为必填数组" }, { status: 400 });
  }
  if (ids.length > MAX_BATCH) {
    return NextResponse.json({ error: `单次最多 ${MAX_BATCH} 条` }, { status: 400 });
  }
  if (!action || !["suspend", "activate"].includes(action)) {
    return NextResponse.json({ error: "action 必须为: suspend, activate" }, { status: 400 });
  }

  let affected = 0;
  if (action === "suspend") {
    const result = await prisma.user.updateMany({
      where: { id: { in: ids }, deletedAt: null },
      data: { status: "SUSPENDED", tokenVersion: { increment: 1 } },
    });
    affected = result.count;
  } else {
    const result = await prisma.user.updateMany({
      where: { id: { in: ids }, deletedAt: null },
      data: { status: "ACTIVE" },
    });
    affected = result.count;
  }

  await writeAudit({
    actorId: ctx.userId,
    tableName: "users",
    recordId: ids.join(",").slice(0, 100),
    action: 2,
    changedFields: [action],
    oldData: { count: ids.length },
    newData: { affected, action },
    requestId: req.headers.get("x-request-id"),
  });

  return { action, requested: ids.length, affected };
});

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../../_lib/method-not-allowed";
export const { GET, HEAD, PUT, PATCH, DELETE, OPTIONS } = methodNotAllowed(["POST"]);
