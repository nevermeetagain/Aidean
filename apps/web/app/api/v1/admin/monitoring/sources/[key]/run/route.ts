/**
 * POST /api/v1/admin/monitoring/sources/{key}/run — 手动触发采集（受理语义，202）。
 *
 * 鉴权：admin.sync.write。
 * 防重入：Redis SETNX lock:monitor:run:{key} TTL 300s；未获得锁 → 10006(429)。
 * 凭证：authRequired 源在本版本无 keyed collector（TASK-070 改写后仅公开页源），
 *       直接 MONITOR_SOURCE_CREDENTIAL_MISSING(50012, 503)，不发起外连。
 * 降级：未配置 REDIS_URL（getRedis()=null）时不加锁直接受理——与 lib/db/redis
 *       「可失组件 fail-open」的既有口径一致。
 * 本端点只受理并占锁；实际采集由 monitor_catalogs.ts 调度侧执行（DESIGN-004 §3）。
 */
import { AdminMonitoringRunResponse } from "@aidean/shared";

import { getRedis } from "../../../../../../../../lib/db/redis";
import { prisma } from "../../../../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../../../../lib/features/auth/session";
import { successResponse } from "../../../../../_lib/response";
import { ApiError, ERROR_CODES } from "../../../../../_lib/errors";
import { withApi, type RouteContext } from "../../../../../_lib/handler";

export const dynamic = "force-dynamic";

const LOCK_TTL_SECONDS = 300;

type Params = { key: string };

export const POST = withApi(async (req: Request, ctx: RouteContext<Params>) => {
  await requireAdminApi("admin.sync.write");
  const { key } = await ctx.params;

  const source = await prisma.monitoringSource.findFirst({
    where: { key, deletedAt: null },
    select: { key: true, authRequired: true },
  });
  if (!source) {
    throw new ApiError(ERROR_CODES.MONITOR_SOURCE_NOT_FOUND, "监控源不存在或已删除");
  }
  if (source.authRequired) {
    throw new ApiError(
      ERROR_CODES.MONITOR_SOURCE_CREDENTIAL_MISSING,
      "该源需要 API Key，请先在部署环境配置"
    );
  }

  const redis = getRedis();
  if (redis) {
    const owner = `${Date.now()}-${crypto.randomUUID()}`;
    const acquired = await redis.setNxEx(`lock:monitor:run:${key}`, owner, LOCK_TTL_SECONDS);
    if (acquired !== "OK") {
      throw new ApiError(ERROR_CODES.TOO_MANY_REQUESTS, "该源正在执行中，请稍后重试");
    }
  }

  return successResponse(
    AdminMonitoringRunResponse.parse({ accepted: true, sourceKey: key, lockTtlSeconds: LOCK_TTL_SECONDS }),
    { status: 202, requestId: req.headers.get("x-request-id") ?? undefined }
  );
});
