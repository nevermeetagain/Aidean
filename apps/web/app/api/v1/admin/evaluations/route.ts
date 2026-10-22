/**
 * GET  /api/v1/admin/evaluations — list evaluations (paginated, status filter)
 * DELETE /api/v1/admin/evaluations/[id] — soft-delete evaluation
 *
 * R-50: 评估管理 admin 板块——查看用户评估任务、删除违规评估。
 */
import { prisma } from "../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../lib/features/auth/session";
import { parseOptionalInt, parseIntParam, parsePagination } from "../../../../../lib/http/pagination";
import { ApiError, ERROR_CODES } from "../../_lib/errors";
import { withApi, type RouteContext } from "../../_lib/handler";
import { writeAudit } from "../../_lib/audit";

export const dynamic = "force-dynamic";

export const GET = withApi(async (req: Request) => {
  await requireAdminApi("admin.evaluations.read");

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
  const status = url.searchParams.get("status");

  const where: { deletedAt: null; status?: number } = { deletedAt: null };
  if (status !== null && status !== "") {
    const parsedStatus = parseOptionalInt(url, "status");
    if (parsedStatus === undefined) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, "参数 status 必须为整数");
    }
    where.status = parsedStatus;
  }

  const [items, total] = await Promise.all([
    prisma.evaluation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: {
        evaluationModels: {
          select: { id: true, modelId: true, model: { select: { nameDisplay: true, nameCn: true, slug: true } } },
        },
        _count: { select: { evaluationModels: true } },
      },
    }),
    prisma.evaluation.count({ where }),
  ]);

  return {
    items: items.map(e => ({
      ...e,
      cost: Number(e.cost),
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
});

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../_lib/method-not-allowed";
export const { POST, PUT, PATCH, DELETE, OPTIONS } = methodNotAllowed(["GET"]);
