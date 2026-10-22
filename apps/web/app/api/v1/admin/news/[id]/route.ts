/**
 * /api/v1/admin/news/[id] — 资讯编辑/删除（news-admin-cms T3）。
 *
 * PATCH：AdminNewsPatchSchema 部分更新；首次 DRAFT→PUBLISHED 补 publishedAt；
 *        变更后 revalidatePath("/news")（前台读库即时生效）。
 * DELETE：硬删（资讯为内容条目，无业务外键关联，删除即消失并审计留痕）。均写 AuditLog。
 */
import { revalidatePath } from "next/cache";

import { prisma } from "../../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../../lib/features/auth/session";
import { ApiError, ERROR_CODES, formatZodMessage } from "../../../_lib/errors";
import { withApi, type RouteContext } from "../../../_lib/handler";
import { writeAudit } from "../../../_lib/audit";
import { AdminNewsPatchSchema } from "@aidean/shared";

export const dynamic = "force-dynamic";

export const PATCH = withApi(
  async (req: Request, ctx: RouteContext<{ id: string }>) => {
    const session = await requireAdminApi("admin.news.write");
    const { id } = await ctx.params;

    const before = await prisma.newsItem.findUnique({ where: { id } });
    if (!before) throw new ApiError(ERROR_CODES.BAD_REQUEST, "资讯不存在");

    const body = (await req.json().catch(() => null)) as unknown;
    const parsed = AdminNewsPatchSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, formatZodMessage(parsed.error.issues[0]));
    }
    const d = parsed.data;

    const item = await prisma.newsItem.update({
      where: { id },
      data: {
        ...(d.slug !== undefined ? { slug: d.slug } : {}),
        ...(d.title !== undefined ? { title: d.title } : {}),
        ...(d.summary !== undefined ? { summary: d.summary } : {}),
        ...(d.category !== undefined ? { category: d.category } : {}),
        ...(d.contentMarkdown !== undefined ? { contentMarkdown: d.contentMarkdown } : {}),
        ...(d.pinned !== undefined ? { pinned: d.pinned } : {}),
        ...(d.status !== undefined ? { status: d.status } : {}),
        ...(d.status === "PUBLISHED" && !before.publishedAt ? { publishedAt: new Date() } : {}),
      },
      select: { id: true, slug: true, title: true, status: true, pinned: true, publishedAt: true },
    });

    revalidatePath("/news");
    await writeAudit({
      actorId: session.userId,
      tableName: "news_items",
      recordId: id,
      action: 2,
      changedFields: Object.keys(d),
      oldData: { slug: before.slug, title: before.title, summary: before.summary, category: before.category, pinned: before.pinned, status: before.status as string },
      newData: { ...item, publishedAt: item.publishedAt ? item.publishedAt.toISOString() : null },
      requestId: req.headers.get("x-request-id"),
    });
    return { item };
  }
);

export const DELETE = withApi(
  async (req: Request, ctx: RouteContext<{ id: string }>) => {
    const session = await requireAdminApi("admin.news.write");
    const { id } = await ctx.params;

    const before = await prisma.newsItem.findUnique({ where: { id } });
    if (!before) throw new ApiError(ERROR_CODES.BAD_REQUEST, "资讯不存在");
    await prisma.newsItem.delete({ where: { id } });

    revalidatePath("/news");
    await writeAudit({
      actorId: session.userId,
      tableName: "news_items",
      recordId: id,
      action: 3,
      changedFields: ["deleted"],
      oldData: { slug: before.slug, title: before.title, status: before.status as string },
      requestId: req.headers.get("x-request-id"),
    });
    return { deleted: true, slug: before.slug };
  }
);

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../../_lib/method-not-allowed";
export const { GET, HEAD, POST, PUT, OPTIONS } = methodNotAllowed(["PATCH", "DELETE"]);
