/**
 * GET /api/v1/system/ready — DB+Redis 就绪探针（API-001 / REQ-NF-002 / TASK-003）。
 *
 * 语义（契约 contracts/01-api.contract.ts §S0 冻结，唯一源 @aidean/shared）：
 * - DB 与 Redis 均可达 → 200 + SystemReadySchema（status:"ready"、checks.db/redis:"ok"、time:ISO）；
 * - 任一不可达 → 抛 ApiError(SERVICE_UNAVAILABLE=50010)，由 withApi 依
 *   DEFAULT_STATUS_BY_CODE[50010]=503 映射为 HTTP 503，message 形如 "依赖不可用: db" / "依赖不可用: redis"。
 * force-dynamic：就绪状态须实时探测，禁止构建期预渲染固化时间/结论。
 * PUBLIC：无鉴权（端点注册表 API-001 auth=PUBLIC）。
 */
import { SystemReadySchema } from "@aidean/shared";

import { getReadiness } from "../../../../../lib/features/system/readiness";
import { withApi } from "../../_lib/handler";
import { ApiError, ERROR_CODES } from "../../_lib/errors";

export const dynamic = "force-dynamic";

export const GET = withApi(async () => {
  const result = await getReadiness();
  if (!result.ready) {
    throw new ApiError(ERROR_CODES.SERVICE_UNAVAILABLE, `依赖不可用: ${result.failed}`);
  }
  // 出口即校验：返回体恒符合冻结契约（不放宽为裸对象，防漂移）
  return SystemReadySchema.parse({
    status: "ready",
    checks: { db: "ok", redis: "ok" },
    time: new Date().toISOString(),
  });
});
