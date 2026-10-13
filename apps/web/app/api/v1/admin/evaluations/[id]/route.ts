/**
 * GET    /api/v1/admin/evaluations/[id] — get evaluation detail
 * PATCH  /api/v1/admin/evaluations/[id] — archive / unarchive evaluation
 * DELETE /api/v1/admin/evaluations/[id] — soft-delete evaluation
 *
 * R-50: 评估管理 admin 板块。
 * R-62: PATCH archive/unarchive（可逆归档，不同于 DELETE 的永久软删语义）。
 */
import { prisma } from "../../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../../lib/features/auth/session";
import { ApiError, ERROR_CODES } from "../../../_lib/errors";
import { withApi, type RouteContext } from "../../../_lib/handler";
import { writeAudit } from "../../../_lib/audit";

export const dynamic = "force-dynamic";

export const GET = withApi(
  async (_req: Request, ctx: RouteContext<{ id: string }>) => {
    await requireAdminApi("admin.evaluations.read");
    const { id } = await ctx.params;

    const evaluation = await prisma.evaluation.findUnique({
      where: { id },
      include: {
        evaluationModels: {
          select: {
            id: true, modelId: true,
            model: { select: { nameDisplay: true, nameCn: true, slug: true } },
            response: true, thinking: true,
          },
        },
      },
    });

    if (!evaluation || evaluation.deletedAt) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, "评估任务不存在");
    }

    return { item: { ...evaluation, cost: Number(evaluation.cost) } };
  }
);

export const PATCH = withApi(
  async (req: Request, ctx: RouteContext<{ id: string }>) => {
    const session = await requireAdminApi("admin.evaluations.write");
    const { id } = await ctx.params;

    const body = await req.json().catch(() => ({}));
    const action = body.action as string | undefined;

    if (action !== "archive" && action !== "unarchive") {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, "action 必须为 archive 或 unarchive");
    }

    const existing = await prisma.evaluation.findUnique({ where: { id } });
    if (!existing) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, "评估任务不存在");
    }

    if (action === "archive") {
      if (existing.deletedAt) {
        throw new ApiError(ERROR_CODES.BAD_REQUEST, "该评估已归档");
      }
      await prisma.evaluation.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      await writeAudit({
        actorId: session.userId,
        tableName: "evaluations",
        recordId: id,
        action: 3,
        changedFields: ["deletedAt"],
        oldData: { title: existing.title, evalType: existing.evalType, status: existing.status },
        requestId: req.headers.get("x-request-id"),
      });
      return { archived: true, id };
    } else {
      // unarchive
      if (!existing.deletedAt) {
        throw new ApiError(ERROR_CODES.BAD_REQUEST, "该评估未归档");
      }
      await prisma.evaluation.update({
        where: { id },
        data: { deletedAt: null },
      });
      await writeAudit({
        actorId: session.userId,
        tableName: "evaluations",
        recordId: id,
        action: 2,
        changedFields: ["deletedAt"],
        oldData: { deletedAt: existing.deletedAt },
        requestId: req.headers.get("x-request-id"),
      });
      return { unarchived: true, id };
    }
  }
);

export const DELETE = withApi(
  async (req: Request, ctx: RouteContext<{ id: string }>) => {
    const session = await requireAdminApi("admin.evaluations.write");
    const { id } = await ctx.params;

    const existing = await prisma.evaluation.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, "评估任务不存在");
    }

    await prisma.evaluation.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await writeAudit({
      actorId: session.userId,
      tableName: "evaluations",
      recordId: id,
      action: 3,
      changedFields: ["deletedAt"],
      oldData: { title: existing.title, evalType: existing.evalType, status: existing.status },
      requestId: req.headers.get("x-request-id"),
    });

    return { deleted: true, id };
  }
);
