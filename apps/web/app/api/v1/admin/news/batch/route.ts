/**
 * /api/v1/admin/news/batch — 资讯批量操作（R-21 修复 + TP-5.1 扩展）。
 *
 * POST：requireAdminApi → 批量发布/下架/置顶/取消置顶
 *   body: { ids: string[], action: "publish" | "unpublish" | "pin" | "unpin" }
 */

import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../../lib/features/auth/session";
import { writeAudit } from "../../../_lib/audit";
import { withApi } from "../../../_lib/handler";

export const dynamic = "force-dynamic";

const MAX_BATCH = 100;
const VALID_ACTIONS = ["publish", "unpublish", "pin", "unpin"] as const;
type BatchAction = (typeof VALID_ACTIONS)[number];

export const POST = withApi(async (req: Request) => {
  const ctx = await requireAdminApi("admin.news.write");

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
  let affected = 0;

  if (batchAction === "publish") {
    const result = await prisma.newsItem.updateMany({
      where: { id: { in: ids }, status: "DRAFT" },
      data: { status: "PUBLISHED", publishedAt: new Date() },
    });
    affected = result.count;
  } else if (batchAction === "unpublish") {
    const result = await prisma.newsItem.updateMany({
      where: { id: { in: ids }, status: "PUBLISHED" },
      data: { status: "DRAFT", publishedAt: null },
    });
    affected = result.count;
  } else if (batchAction === "pin") {
    const result = await prisma.newsItem.updateMany({
      where: { id: { in: ids }, pinned: false },
      data: { pinned: true },
    });
    affected = result.count;
  } else {
    // unpin
    const result = await prisma.newsItem.updateMany({
      where: { id: { in: ids }, pinned: true },
      data: { pinned: false },
    });
    affected = result.count;
  }

  await writeAudit({
    actorId: ctx.userId,
    tableName: "news_items",
    recordId: ids.join(",").slice(0, 100),
    action: 2,
    changedFields: [batchAction],
    oldData: { count: ids.length },
    newData: { affected, action: batchAction },
    requestId: req.headers.get("x-request-id"),
  });

  revalidatePath("/news");

  return { action: batchAction, requested: ids.length, affected };
});

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../../_lib/method-not-allowed";
export const { GET, HEAD, PUT, PATCH, DELETE, OPTIONS } = methodNotAllowed(["POST"]);
