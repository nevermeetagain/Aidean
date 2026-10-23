/**
 * GET /api/v1/admin/monitoring/sources/{key}/runs?page&pageSize — 立即运行历史（T120-12 · contracts/07b）。
 * 鉴权：admin.sync.read。按 createdAt 倒序；page≥1，pageSize 默认 10、上限 50，越界 → 400。
 * 未知 / 软删源 → 20004（404）。
 */
import { AdminMonitoringRunsResponse } from "@aidean/shared";
import { z } from "zod";

import { prisma } from "../../../../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../../../../lib/features/auth/session";
import {
  RUNS_DEFAULT_PAGE_SIZE,
  RUNS_MAX_PAGE_SIZE,
  listRunRequests,
} from "../../../../../../../../lib/monitoring/run-requests";
import { successResponse } from "../../../../../_lib/response";
import { ApiError, ERROR_CODES } from "../../../../../_lib/errors";
import { withApi, type RouteContext } from "../../../../../_lib/handler";

export const dynamic = "force-dynamic";

const Query = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(RUNS_MAX_PAGE_SIZE).default(RUNS_DEFAULT_PAGE_SIZE),
});

type Params = { key: string };

export const GET = withApi(async (req: Request, ctx: RouteContext<Params>) => {
  await requireAdminApi("admin.sync.read");
  const { key } = await ctx.params;
  const parsed = Query.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, "分页参数非法（page≥1，1≤pageSize≤50）");
  }
  const { page, pageSize } = parsed.data;

  const source = await prisma.monitoringSource.findFirst({ where: { key, deletedAt: null }, select: { key: true } });
  if (!source) {
    throw new ApiError(ERROR_CODES.MONITOR_SOURCE_NOT_FOUND, "监控源不存在或已删除");
  }
  const { items, total } = await listRunRequests(prisma, key, page, pageSize);
  return successResponse(AdminMonitoringRunsResponse.parse({ items, total, page, pageSize }));
});

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../../../../_lib/method-not-allowed";
export const { POST, PUT, PATCH, DELETE, OPTIONS } = methodNotAllowed(["GET"]);
