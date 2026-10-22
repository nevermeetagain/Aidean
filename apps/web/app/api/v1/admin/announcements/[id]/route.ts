/**
 * GET    /api/v1/admin/announcements/[id] — get announcement detail (full content)
 * PATCH  /api/v1/admin/announcements/[id] — update (title/content/type/priority/pin/publish)
 * DELETE /api/v1/admin/announcements/[id] — soft-delete
 *
 * R-51: 公告管理 admin 板块。
 */
import { prisma } from "../../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../../lib/features/auth/session";
import { ApiError, ERROR_CODES } from "../../../_lib/errors";
import { withApi, type RouteContext } from "../../../_lib/handler";
import { writeAudit } from "../../../_lib/audit";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export const GET = withApi(
  async (_req: Request, ctx: RouteContext<{ id: string }>) => {
    await requireAdminApi("admin.announcements.read");
    const { id } = await ctx.params;

    const announcement = await prisma.announcement.findUnique({ where: { id } });
    if (!announcement || announcement.deletedAt) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, "公告不存在");
    }

    return { item: announcement };
  }
);

export const PATCH = withApi(
  async (req: Request, ctx: RouteContext<{ id: string }>) => {
    const session = await requireAdminApi("admin.announcements.write");
    const { id } = await ctx.params;

    const existing = await prisma.announcement.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, "公告不存在");
    }

    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const { title, content, type, priority, isPinned, isPublished, expiredAt } = body;

    const nowPublishing = isPublished === true && !existing.isPublished;
    const updated = await prisma.announcement.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title: String(title) } : {}),
        ...(content !== undefined ? { content: String(content) } : {}),
        ...(type !== undefined ? { type: String(type) } : {}),
        ...(priority !== undefined ? { priority: Number(priority) } : {}),
        ...(isPinned !== undefined ? { isPinned: Boolean(isPinned) } : {}),
        ...(isPublished !== undefined ? {
          isPublished: Boolean(isPublished),
          publishedAt: nowPublishing ? new Date() : existing.publishedAt,
        } : {}),
        ...(expiredAt !== undefined ? { expiredAt: expiredAt ? new Date(expiredAt as string) : null } : {}),
      },
    });

    await writeAudit({
      actorId: session.userId,
      tableName: "announcements",
      recordId: id,
      action: 2,
      changedFields: Object.keys(body),
      oldData: { title: existing.title, type: existing.type, isPinned: existing.isPinned, isPublished: existing.isPublished },
      newData: { title: updated.title, type: updated.type, isPinned: updated.isPinned, isPublished: updated.isPublished },
      requestId: req.headers.get("x-request-id"),
    });

    revalidatePath("/admin/announcements");
    revalidatePath("/");

    return { item: updated };
  }
);

export const DELETE = withApi(
  async (req: Request, ctx: RouteContext<{ id: string }>) => {
    const session = await requireAdminApi("admin.announcements.write");
    const { id } = await ctx.params;

    const existing = await prisma.announcement.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, "公告不存在");
    }

    await prisma.announcement.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await writeAudit({
      actorId: session.userId,
      tableName: "announcements",
      recordId: id,
      action: 3,
      changedFields: ["deletedAt"],
      oldData: { title: existing.title, type: existing.type },
      requestId: req.headers.get("x-request-id"),
    });

    revalidatePath("/admin/announcements");
    revalidatePath("/");

    return { deleted: true, id };
  }
);

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../../_lib/method-not-allowed";
export const { POST, PUT, OPTIONS } = methodNotAllowed(["GET", "PATCH", "DELETE"]);
