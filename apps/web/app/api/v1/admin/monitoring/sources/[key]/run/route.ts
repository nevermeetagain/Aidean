/**
 * POST /api/v1/admin/monitoring/sources/{key}/run — 手动触发采集（受理语义，202）。
 *
 * 鉴权：admin.sync.write。
 * T120-12 起：插入 monitor_run_requests pending 意图行，由 monitor_catalogs 下一调度节拍原子领取并真实采集。
 * 防重入（两层）：
 *   1. Redis SETNX lock:monitor:run:{key} TTL 300s —— 可失的快速前置拦截（未配 REDIS_URL / Redis 故障即跳过）；
 *   2. DB 部分唯一索引 (source_key) WHERE status IN ('pending','running') —— 权威防线，冲突 → 10006(429)。
 * 凭证：authRequired 源本版本无 keyed collector → MONITOR_SOURCE_CREDENTIAL_MISSING(50012, 503)，不入队。
 * 审计：audit_logs(monitor_run_requests, INSERT)。
 * 响应：AdminMonitoringRunResponseV2 { accepted, requestId }，并保留既有 sourceKey / lockTtlSeconds（向后兼容）。
 */
import { AdminMonitoringRunResponse, AdminMonitoringRunResponseV2 } from "@aidean/shared";

import { getRedis } from "../../../../../../../../lib/db/redis";
import { prisma } from "../../../../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../../../../lib/features/auth/session";
import { createRunRequest } from "../../../../../../../../lib/monitoring/run-requests";
import { writeAudit } from "../../../../../_lib/audit";
import { successResponse } from "../../../../../_lib/response";
import { ApiError, ERROR_CODES } from "../../../../../_lib/errors";
import { withApi, type RouteContext } from "../../../../../_lib/handler";

export const dynamic = "force-dynamic";

const LOCK_TTL_SECONDS = 300;

type Params = { key: string };

async function tryRedisLock(key: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return true;
  try {
    const owner = `${Date.now()}-${crypto.randomUUID()}`;
    return (await redis.setNxEx(`lock:monitor:run:${key}`, owner, LOCK_TTL_SECONDS)) === "OK";
  } catch {
    // 可失降级：Redis 故障不阻断受理，由 DB 唯一索引兜底
    return true;
  }
}

export const POST = withApi(async (req: Request, ctx: RouteContext<Params>) => {
  const session = await requireAdminApi("admin.sync.write");
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

  if (!(await tryRedisLock(key))) {
    throw new ApiError(ERROR_CODES.TOO_MANY_REQUESTS, "该源正在执行中，请稍后重试");
  }
  const row = await createRunRequest(prisma, { sourceKey: key, requestedBy: session.userId });
  if (!row) {
    throw new ApiError(ERROR_CODES.TOO_MANY_REQUESTS, "该源已有待执行或执行中的请求，请稍后重试");
  }

  await writeAudit({
    actorId: session.userId,
    tableName: "monitor_run_requests",
    recordId: row.id,
    action: 1,
    changedFields: ["status"],
    newData: { sourceKey: key, status: "pending" },
    requestId: req.headers.get("x-request-id"),
  });

  const legacy = AdminMonitoringRunResponse.parse({ accepted: true, sourceKey: key, lockTtlSeconds: LOCK_TTL_SECONDS });
  const v2 = AdminMonitoringRunResponseV2.parse({ accepted: true, requestId: row.id });
  return successResponse(
    { ...legacy, ...v2 },
    { status: 202, requestId: req.headers.get("x-request-id") ?? undefined }
  );
});

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../../../../_lib/method-not-allowed";
export const { GET, HEAD, PUT, PATCH, DELETE, OPTIONS } = methodNotAllowed(["POST"]);
