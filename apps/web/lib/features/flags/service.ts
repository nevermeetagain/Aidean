/**
 * lib/features/flags/service — 功能开关运行时读服务（TASK-015 / 需求 §3.9 / DESIGN-001）。
 *
 * - getFeatureFlags()：unstable_cache tag `feature-flags`（05-events.contract.ts CACHE_TAGS），
 *   后台 PATCH 开关后由 TASK-016 `revalidateTag("feature-flags")` 即时失效；60s revalidate 兜底。
 * - fail-open（DESIGN-001，待 U-7 最终裁决）：DB 读取异常时**普通开关视为开启**并 console.error 留痕；
 *   安全类开关（FAIL_CLOSED_FEATURE_FLAGS：auth.password_reset）此时视为**关闭**（Q-12-08 裁决 B，T120-20 跟进），
 *   避免探活/开关基础设施抖动导致整站在 403 下不可用；吞异常在缓存 loader 内完成，
 *   使缓存值恒为成功快照（异常不落缓存）。
 * - requireFeature(code)：受控 API/页面首行守卫（于鉴权/下游逻辑之前短路，阻断未鉴权流量进入计费/tier；
 *   受控态本身已由 PUBLIC GET /system/features 全量公开，故该顺序不新增泄露面）；
 *   关闭时抛 ApiError(FEATURE_DISABLED=50011) → withApi 依 DEFAULT_STATUS_BY_CODE[50011] 映射 HTTP 403。
 */
import { unstable_cache } from "next/cache";

import type { FeatureFlagCode } from "@aidean/shared";
import { ApiError, ERROR_CODES } from "../../../app/api/v1/_lib/errors";

import { allEnabled, loadFeatureFlags, type FeatureFlagState } from "./repository";

async function loadFeatureFlagsSafe(): Promise<FeatureFlagState> {
  try {
    return await loadFeatureFlags();
  } catch (err) {
    // 结构化留痕：仅记错误类别，不落连接串等敏感载荷（对齐 system/readiness 安全边界）
    console.error(
      JSON.stringify({
        tag: "feature-flags",
        reason: "load-failed-fail-open",
        name: (err as { name?: string })?.name ?? "Unknown",
        code: (err as { code?: string })?.code,
      })
    );
    return allEnabled();
  }
}

/**
 * 缓存版 loader（tag feature-flags，可被 TASK-016 `revalidateTag("feature-flags")` 即时失效；60s revalidate 兜底）。
 * 在 Next 请求上下文内命中缓存；`unstable_cache` 于模块顶层只求值定义（不在路由 import 期调用）。
 */
const cachedFeatureFlags = unstable_cache(loadFeatureFlagsSafe, ["feature-flags"], {
  tags: ["feature-flags"],
  revalidate: 60,
});

/**
 * 全量开关快照：优先走 unstable_cache（tag feature-flags，后台保存即时失效）。
 * 若缓存通道**本身不可用**——典型为「非 Next 请求上下文」下调用（单测直调路由 handler，见 routes-gateway/
 * routes-evaluations 既有 spec 不 mock next/cache），或缓存基础设施异常——降级为直连 loadFeatureFlagsSafe
 * （其内部已 fail-open），确保 requireFeature 守卫绝不因缓存环境问题抛 500，与 DESIGN-001 可用性优先一致。
 */
export async function getFeatureFlags(): Promise<FeatureFlagState> {
  try {
    return await cachedFeatureFlags();
  } catch (err) {
    console.error(
      JSON.stringify({
        tag: "feature-flags",
        reason: "cache-channel-unavailable-direct-fallback",
        name: (err as { name?: string })?.name ?? "Unknown",
      })
    );
    return loadFeatureFlagsSafe();
  }
}

/** 单码判定：开启返回 true，否则 false。 */
export async function isFeatureEnabled(code: FeatureFlagCode): Promise<boolean> {
  const flags = await getFeatureFlags();
  return flags[code] === true;
}

/** 受控面守卫：功能关闭时抛 50011（HTTP 403，文案「该功能暂未开放」）。 */
export async function requireFeature(code: FeatureFlagCode): Promise<void> {
  if (!(await isFeatureEnabled(code))) {
    throw new ApiError(ERROR_CODES.FEATURE_DISABLED, "该功能暂未开放");
  }
}
