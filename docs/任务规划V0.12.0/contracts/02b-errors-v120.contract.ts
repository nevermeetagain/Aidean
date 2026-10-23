// V0.12.0 · 错误码增量（唯一源 packages/shared/src/errors.ts；既有 27 码值不得改动）
export const V120_ERROR_CODES = {
  /** 自定义渠道探测目标被安全策略拒绝（SSRF 防护）。HTTP 400，前端 inline 展示于渠道行 */
  CHANNEL_PROBE_TARGET_FORBIDDEN: 30005,
} as const;

export const V120_STATUS_BY_CODE = { 30005: 400 } as const;
export const V120_DISPLAY = { CHANNEL_PROBE_TARGET_FORBIDDEN: "inline" } as const;

/** 失败路径增量 → 复用既有码（不新增）的显式登记，保证 §4.4「错误码覆盖所有已知失败路径」 */
export const V120_FAILURE_PATHS = [
  { path: "改密：旧密码错误", code: "INVALID_CREDENTIALS" },          // 10003/401，计入登录限流桶
  { path: "改密 / 重置：新密码不满足强度（zod）", code: "BAD_REQUEST" },
  { path: "重置：验证码错误 / 过期 / 已用 / 错满 5 次作废", code: "INVALID_CREDENTIALS" }, // 与「邮箱不存在」同响应，防枚举
  { path: "重置发码：同邮箱 60s 内 / 当日 >10 封 / IP 10/分钟", code: "TOO_MANY_REQUESTS" },
  { path: "access token 的 ver 与库内 tokenVersion 不等", code: "UNAUTHENTICATED" },
  { path: "监控立即运行：该源已有 pending/running 请求", code: "TOO_MANY_REQUESTS" },   // 10006/429，沿用现锁语义
  { path: "可靠性读取：station id 不存在或已软删", code: "SITE_UNAVAILABLE" },
  { path: "渠道探测：渠道不属于当前用户或不存在", code: "BAD_REQUEST" },             // 不暴露存在性
  { path: "渠道探测：目标被 SSRF 策略拒绝", code: "CHANNEL_PROBE_TARGET_FORBIDDEN" },
  { path: "功能开关 auth.password_reset 关闭时访问重置端点", code: "FEATURE_DISABLED" },
] as const;
