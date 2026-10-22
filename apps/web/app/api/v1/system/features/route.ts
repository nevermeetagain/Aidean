/**
 * GET /api/v1/system/features — 公开功能开关快照（API-002 / 需求 §3.9 / TASK-015）。
 *
 * 契约（contracts/01-api.contract.ts §S2，唯一源 @aidean/shared）：
 * - PUBLIC：无鉴权（端点注册表 API-002 auth=PUBLIC）；
 * - 成功 → 200 + data = PublicFeaturesSchema（{ flags: Record<code, boolean> }）；
 *   仅暴露开/关布尔，**不暴露 rollout/config/时间窗**（DESIGN-001 隐私边界）。
 * 读经 getFeatureFlags()（unstable_cache tag feature-flags）：后台 PATCH 后即时反映。
 * force-dynamic：受控态须实时（禁止构建期固化快照）。
 */
import { PublicFeaturesSchema } from "@aidean/shared";

import { getFeatureFlags } from "../../../../../lib/features/flags/service";
import { withApi } from "../../_lib/handler";

export const dynamic = "force-dynamic";

export const GET = withApi(async () => {
  const flags = await getFeatureFlags();
  // 出口即校验：返回体恒符合冻结契约（只放行 7 码 boolean，防越权字段泄露）
  return PublicFeaturesSchema.parse({ flags });
});

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../_lib/method-not-allowed";
export const { POST, PUT, PATCH, DELETE, OPTIONS } = methodNotAllowed(["GET"]);
