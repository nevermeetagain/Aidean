/**
 * GET /api/v1/admin/sync/batches/[id] — Sync batch 详情 + 关联 changeLogs（R-19 修复）。
 */

import { NextResponse } from "next/server";
import { prisma } from "../../../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../../../lib/features/auth/session";
import { ApiError, ERROR_CODES } from "../../../../_lib/errors";
import { withApi, type RouteContext } from "../../../../_lib/handler";

export const dynamic = "force-dynamic";

export const GET = withApi(
  async (_req: Request, ctx: RouteContext<{ id: string }>) => {
    await requireAdminApi("admin.sync.read");
    const { id } = await ctx.params;

    const batch = await prisma.syncBatch.findUnique({
      where: { id },
      include: {
        changeLogs: {
          orderBy: { createdAt: "desc" },
          take: 200,
          select: {
            id: true,
            modelId: true,
            changeType: true,
            changedFields: true,
            source: true,
            checksum: true,
            isReverted: true,
            revertReason: true,
            createdAt: true,
          },
        },
      },
    });

    if (!batch) throw new ApiError(ERROR_CODES.BAD_REQUEST, "同步批次不存在");

    return {
      batch: {
        id: batch.id,
        batchCode: batch.batchCode,
        source: batch.source,
        sourceUrl: batch.sourceUrl,
        status: batch.status,
        totalRecords: batch.totalRecords,
        successRecords: batch.successRecords,
        failedRecords: batch.failedRecords,
        validationSummary: batch.validationSummary,
        errorSamples: batch.errorSamples,
        operatorId: batch.operatorId,
        operatorNotes: batch.operatorNotes,
        createdAt: batch.createdAt.toISOString(),
        updatedAt: batch.updatedAt.toISOString(),
      },
      changeLogs: batch.changeLogs.map((c) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
      })),
    };
  }
);

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../../../_lib/method-not-allowed";
export const { POST, PUT, PATCH, DELETE, OPTIONS } = methodNotAllowed(["GET"]);
