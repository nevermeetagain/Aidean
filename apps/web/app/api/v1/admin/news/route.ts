/**
 * /api/v1/admin/news — 资讯管理（news-admin-cms T3）。
 *
 * GET：requireAdminApi → 全量（含 DRAFT，pinned desc → publishedAt desc → createdAt desc），contentMarkdown 原样返回（编辑回读即库内 Markdown）。
 * POST：AdminNewsCreateSchema 新建（slug 唯一冲突 400）；首次置 PUBLISHED 写 publishedAt；写 AuditLog(action=1)；revalidatePath("/news")。
 */
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

import { prisma } from "../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../lib/features/auth/session";
import { ApiError, ERROR_CODES, formatZodMessage } from "../../_lib/errors";
import { withApi } from "../../_lib/handler";
import { writeAudit } from "../../_lib/audit";
import { AdminNewsCreateSchema } from "@aidean/shared";

export const dynamic = "force-dynamic";

export const GET = withApi(async () => {
  await requireAdminApi("admin.news.read");
  const rows = await prisma.newsItem.findMany({
    orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
  });
  return {
    items: rows.map((n) => ({
      id: n.id,
      slug: n.slug,
      title: n.title,
      summary: n.summary,
      category: n.category,
      contentMarkdown: n.contentMarkdown,
      pinned: n.pinned,
      status: n.status as string,
      publishedAt: n.publishedAt ? n.publishedAt.toISOString() : null,
      updatedAt: n.updatedAt.toISOString(),
    })),
  };
});

export const POST = withApi(async (req: Request) => {
  const session = await requireAdminApi("admin.news.write");
  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = AdminNewsCreateSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, formatZodMessage(parsed.error.issues[0]));
  }
  const data = parsed.data;
  try {
    const item = await prisma.newsItem.create({
      data: {
        slug: data.slug,
        title: data.title,
        summary: data.summary,
        category: data.category,
        contentMarkdown: data.contentMarkdown,
        pinned: data.pinned,
        status: data.status,
        publishedAt: data.status === "PUBLISHED" ? new Date() : null,
      },
      select: { id: true, slug: true, title: true, status: true, pinned: true },
    });
    revalidatePath("/news");
    await writeAudit({
      actorId: session.userId,
      tableName: "news_items",
      recordId: item.id,
      action: 1,
      changedFields: Object.keys(data),
      newData: item,
      requestId: req.headers.get("x-request-id"),
    });
    return { item };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, "资讯 slug 已存在");
    }
    throw err;
  }
});

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../_lib/method-not-allowed";
export const { PUT, PATCH, DELETE, OPTIONS } = methodNotAllowed(["GET", "POST"]);
