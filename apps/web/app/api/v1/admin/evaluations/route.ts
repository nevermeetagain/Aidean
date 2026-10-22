/**
 * GET  /api/v1/admin/evaluations — list evaluations (paginated, status filter)
 * DELETE /api/v1/admin/evaluations/[id] — soft-delete evaluation
 *
 * R-50: 评估管理 admin 板块——查看用户评估任务、删除违规评估。
 */
import { prisma } from "../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../lib/features/auth/session";
import { ApiError, ERROR_CODES } from "../../_lib/errors";
import { withApi, type RouteContext } from "../../_lib/handler";
import { writeAudit } from "../../_lib/audit";

export const dynamic = "force-dynamic";

export const GET = withApi(async (req: Request) => {
  await requireAdminApi("admin.evaluations.read");

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") ?? "20")));
  const status = url.searchParams.get("status");

  const where = {
    deletedAt: null,
    ...(status !== null ? { status: parseInt(status) } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.evaluation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
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
