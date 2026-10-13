// > 版本: v0.1 | 更新: 2026-10-13 | 变更: 首次冻结（任务规划V0.1.0 · 契约⑤ Events）
// ============================================================================
// 契约⑤ Events —— 本项目【无消息队列】（grep 全仓无 kafka/bull/amqp）。异步/准异步面只有四类，
// 本文件把它们固化为注册表；本规划仅新增 1 个缓存失效标签 `feature-flags`。
// 事实证据：
//   - Next 缓存标签：grep -rn 'revalidateTag("' apps/web/app apps/web/lib → admin-auth×13 / admin-nav×9 / site-branding / site-docs / site-home
//   - OIDC back-channel logout：apps/web/lib/features/oauth/backchannel.ts（HTTP POST logout_token，2 次重试 500ms，best-effort）
//   - 定时调度：POST /api/v1/admin/scripts/run-due（sidecar cron，Bearer timingSafeEqual + Redis SETNX lock:scheduler:run-due TTL 300s）
//   - 资金幂等键：evaluation hold `eval:<id>`；冲正 `recharge-reverse:{id}:{key}`（CHANGELOG S6）
// ============================================================================

export const CACHE_TAGS = {
  "admin-auth": { trigger: "角色/授权变更（roles、users/[id]/roles）", consumer: "getAdminPermissions" },
  "admin-nav": { trigger: "菜单 CRUD / apply-default", consumer: "getAdminNav" },
  "site-branding": { trigger: "configs general 组保存", consumer: "getSiteBranding" },
  "site-home": { trigger: "configs home 组保存", consumer: "getHomeContent" },
  "site-docs": { trigger: "configs docs 组保存", consumer: "getDocsArticles" },
  // —— 本规划新增 ——
  "feature-flags": { trigger: "PATCH /api/v1/admin/feature-flags/[id]（TASK-016）", consumer: "lib/features/flags getFeatureFlags（TASK-015）" },
} as const;
export type CacheTag = keyof typeof CACHE_TAGS;

/** 事件载荷（仅本规划新增；at-least-once 语义由「写库成功后再 revalidateTag」保证，重复失效无副作用 = 天然幂等） */
export interface FeatureFlagChangedEvent {
  name: "feature-flags.changed";
  tag: "feature-flags";
  payload: { flagId: string; flagCode: string; isEnabled: boolean; actorId: string; at: string /* ISO */ };
  idempotencyKey: `${string}:${number}`; // `${flagId}:${updatedAt epoch ms}`，审计日志以此去重
  sideEffects: ["revalidateTag('feature-flags')", "writeAudit(tableName='feature_flags')"];
}

export const EXISTING_ASYNC = [
  { name: "oidc.backchannel.logout", transport: "HTTP POST", trigger: "用户登出/封号", idempotency: "logout_token.jti", retry: "2 次 / 500ms" },
  { name: "scheduler.run-due", transport: "HTTP POST(cron sidecar)", trigger: "每分钟", idempotency: "Redis SETNX lock:scheduler:run-due TTL=300s", retry: "下个周期" },
  { name: "billing.hold.capture", transport: "进程内事务", trigger: "评估/网关结算", idempotency: "eval:<id> / createEntryIfAbsent P2002", retry: "调用方" },
] as const;

/** 本规划限时优惠【不引入】定时任务：生效/失效由读时按时间窗计算（契约① EffectivePrice 规则），无需事件 */
export const NO_NEW_SCHEDULED_JOBS = true as const;
