/**
 * GET  /api/v1/admin/announcements — list (paginated, type filter)
 * POST /api/v1/admin/announcements — create
 *
 * R-51: 公告管理 admin 板块——系统公告/维护通知/更新公告/推广。
 */
import { prisma } from "../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../lib/features/auth/session";
import { parseIntParam, parsePagination } from "../../../../../lib/http/pagination";
import { ApiError, ERROR_CODES } from "../../_lib/errors";
import { withApi } from "../../_lib/handler";
import { writeAudit } from "../../_lib/audit";

export const dynamic = "force-dynamic";

export const GET = withApi(async (req: Request) => {
  await requireAdminApi("admin.announcements.read");

  const url = new URL(req.url);
  // B11-11（Q-11-05=A / DEF-011-15）：非法整数串显式 400（不再 500，也不静默回退）；
  // 空串视同缺省；合法值仍由 parsePagination 钳制到既有区间。
  for (const key of ["page", "pageSize"] as const) {
    const raw = url.searchParams.get(key);
    if (raw !== null && raw !== "" && Number.isNaN(parseIntParam(raw, Number.NaN))) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, `参数 ${key} 必须为整数`);
    }
  }
  const { page, pageSize, skip, take } = parsePagination(url, { defaultPageSize: 20, maxPageSize: 100 });
  const type = url.searchParams.get("type");
  const published = url.searchParams.get("published");

  const where = {
    deletedAt: null,
    ...(type ? { type } : {}),
    ...(published === "1" ? { isPublished: true } : {}),
    ...(published === "0" ? { isPublished: false } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.announcement.findMany({
      where,
      orderBy: [{ isPinned: "desc" }, { priority: "desc" }, { createdAt: "desc" }],
      skip,
      take,
    }),
    prisma.announcement.count({ where }),
  ]);

  return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
});

export const POST = withApi(
  async (req: Request) => {
    const session = await requireAdminApi("admin.announcements.write");

    const body = await req.json().catch(() => ({}));
    const { title, content, type, priority, isPinned, isPublished, expiredAt, targetRoles } = body as Record<string, unknown>;

    if (!title || !content) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, "标题和内容不能为空");
    }

    const created = await prisma.announcement.create({
      data: {
        title: String(title),
        content: String(content),
        type: type ? String(type) : "system",
        priority: typeof priority === "number" ? priority : 0,
        isPinned: Boolean(isPinned),
        isPublished: Boolean(isPublished),
        publishedAt: isPublished ? new Date() : null,
        expiredAt: expiredAt ? new Date(expiredAt as string) : null,
        targetRoles: Array.isArray(targetRoles) ? targetRoles.map(Number) : [],
        authorId: session.userId,
      },
    });

    await writeAudit({
      actorId: session.userId,
      tableName: "announcements",
      recordId: created.id,
      action: 1,
      changedFields: ["title", "type", "isPublished"],
      newData: { title: created.title, type: created.type, isPublished: created.isPublished },
      requestId: req.headers.get("x-request-id"),
    });

    return { item: created };
  }
);

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../_lib/method-not-allowed";
export const { PUT, PATCH, DELETE, OPTIONS } = methodNotAllowed(["GET", "POST"]);
