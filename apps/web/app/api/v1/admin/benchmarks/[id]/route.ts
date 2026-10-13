/**
 * /api/v1/admin/benchmarks/[id] — Benchmark 审核端点（Task T-1.3.2）。
 *
 * PATCH：requireAdminApi → 切换 verifiedStatus（0↔1）+ 写 AuditLog。
 *   body: { verifiedStatus: 0 | 1 }
 *
 * GET：requireAdminApi → 查单条 benchmark 详情（含 sourceName/scores/testDate）。
 */
import { prisma } from "../../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../../lib/features/auth/session";
import { ApiError, ERROR_CODES } from "../../../_lib/errors";
import { withApi, type RouteContext } from "../../../_lib/handler";
import { writeAudit } from "../../../_lib/audit";

export const dynamic = "force-dynamic";

export const GET = withApi(
  async (_req: Request, ctx: RouteContext<{ id: string }>) => {
    await requireAdminApi("admin.benchmarks.read");
    const { id } = await ctx.params;

    const bench = await prisma.benchmark.findUnique({
      where: { id },
      include: {
        model: { select: { id: true, nameDisplay: true, modelCode: true } },
      },
    });
    if (!bench) throw new ApiError(ERROR_CODES.MODEL_NOT_FOUND, "基准测试记录不存在");

    return {
      id: bench.id,
      modelId: bench.modelId,
      modelName: bench.model.nameDisplay,
      sourceType: String(bench.sourceType),
      sourceName: bench.sourceName,
      benchmarkType: bench.benchmarkType,
      scores: bench.scores,
      totalScore: Number(bench.totalScore),
      verifiedStatus: bench.verifiedStatus,
      testDate: bench.testDate?.toISOString() ?? null,
      createdAt: bench.createdAt.toISOString(),
    };
  },
);

export const PATCH = withApi(
  async (req: Request, ctx: RouteContext<{ id: string }>) => {
    const session = await requireAdminApi("admin.benchmarks.write");
    const { id } = await ctx.params;

    const body = (await req.json().catch(() => null)) as { verifiedStatus?: number } | null;
    const target = body?.verifiedStatus;
    if (target !== 0 && target !== 1) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, "verifiedStatus 必须为 0 或 1");
    }

    const existing = await prisma.benchmark.findUnique({ where: { id } });
    if (!existing) throw new ApiError(ERROR_CODES.MODEL_NOT_FOUND, "基准测试记录不存在");

    const updated = await prisma.benchmark.update({
      where: { id },
      data: { verifiedStatus: target },
    });

    await writeAudit({
      actorId: session.userId,
      tableName: "benchmarks",
      recordId: id,
      action: 2,
      changedFields: ["verifiedStatus"],
      oldData: { verifiedStatus: existing.verifiedStatus },
      newData: { verifiedStatus: target },
    });

    return {
      id: updated.id,
      verifiedStatus: updated.verifiedStatus,
    };
  },
);

/**
 * DELETE — 物理删除基准测试记录。
 * 管理员审核后决定移除无效/重复数据时使用。写 AuditLog。
 */
export const DELETE = withApi(
  async (req: Request, ctx: RouteContext<{ id: string }>) => {
    const session = await requireAdminApi("admin.benchmarks.write");
    const { id } = await ctx.params;

    const bench = await prisma.benchmark.findUnique({
      where: { id },
      select: { id: true, modelId: true, sourceName: true, benchmarkType: true, totalScore: true },
    });
    if (!bench) throw new ApiError(ERROR_CODES.MODEL_NOT_FOUND, "基准测试记录不存在");

    await prisma.benchmark.delete({ where: { id } });

    await writeAudit({
      actorId: session.userId,
      tableName: "benchmarks",
      recordId: id,
      action: 3,
      changedFields: ["deleted"],
      oldData: { modelId: bench.modelId, sourceName: bench.sourceName, benchmarkType: bench.benchmarkType, totalScore: bench.totalScore },
      requestId: req.headers.get("x-request-id"),
    });
    return { deleted: true };
  }
);
