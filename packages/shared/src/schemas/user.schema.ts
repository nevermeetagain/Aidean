import { z } from "zod";

/**
 * 用户域契约（Task A.0.1）。
 * 敏感字段（折扣/加价率族，如 station_billing_rules.markupRate/tokenMultiplier）永不进本域。
 */

/** 模型优先级单行（1 最高 / 99 最低；0 与 ≥100 非法——free 只读档不在可写范围） */
export const PriorityUpsertSchema = z.object({
  /** modelId：cuid 或短串，宽松 min(1) */
  modelId: z.string().min(1),
  priority: z.number().int().min(1).max(99),
});
export type PriorityUpsert = z.infer<typeof PriorityUpsertSchema>;

/** 等级映射单行：模型 → Opus/Sonnet/Fable/Haiku 固定四档（FREE 不在枚举内即被拒） */
export const TierMappingUpsertSchema = z.object({
  tier: z.enum(["OPUS", "SONNET", "FABLE", "HAIKU"]),
  modelId: z.string().min(1),
});
export type TierMappingUpsert = z.infer<typeof TierMappingUpsertSchema>;

/** 用户公开资料（不含任何敏感列；tier 对齐 Prisma AccountTier） */
export const UserProfileSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  nickname: z.string().nullable(),
  tier: z.enum(["NORMAL", "PRO", "MAX"]),
});
export type UserProfile = z.infer<typeof UserProfileSchema>;

/** 免费额度用量单行（quota 按 resetCycle 周期刷新） */
export const QuotaUsageItemSchema = z.object({
  modelId: z.string().min(1),
  modelName: z.string(),
  quotaTokens: z.number(),
  totalQuotaTokens: z.number(),
  resetCycle: z.enum(["DAY", "WEEK", "MONTH"]),
  /** 宽 ISO：接受带时区偏移的 ISO 字符串；不做严格 datetime 门禁（由服务端生成保证） */
  nextResetAt: z.string().datetime().or(z.string()),
  usedTokens: z.number().default(0),
});
export type QuotaUsageItem = z.infer<typeof QuotaUsageItemSchema>;

/** PUT 整组覆盖数组上限（防滥用） */
export const PrioritiesPutSchema = z.array(PriorityUpsertSchema).max(99);
export type PrioritiesPut = z.infer<typeof PrioritiesPutSchema>;

export const TierMappingsPutSchema = z.array(TierMappingUpsertSchema).max(32);
export type TierMappingsPut = z.infer<typeof TierMappingsPutSchema>;


// ---------------------------------------------------------------- V0.12.0 增量（T120-10，原样落地自 docs/任务规划V0.12.0/contracts/01b-channel-probe.contract.ts）
// V0.12.0 · 自定义渠道连通性探测（REQ-N-010）。落地：packages/shared/src/schemas/user.schema.ts

/** POST /api/v1/user/custom-channels/{id}/probe —— 鉴权：已登录用户，仅能探测自己的渠道（他人渠道按 404 处理，防枚举）。
 *  幂等：无副作用（只读外连），可重试；限流：每用户 10 次/分钟 → 10006(429)。 */
export const ChannelProbeParams = z.object({ id: z.string().uuid() });

export const ChannelProbeOutcome = z.enum([
  "reachable",     // 2xx，且响应体可解析为 OpenAI 兼容 /models
  "auth_failed",   // 401/403
  "timeout",       // 3s 内无响应
  "bad_response",  // 非 2xx（除 401/403）或响应体不可解析
]);

export const ChannelProbeResponse = z.object({
  outcome: ChannelProbeOutcome,
  httpStatus: z.number().int().nullable(),
  latencyMs: z.number().int().nonnegative().nullable(),
  modelCount: z.number().int().nonnegative().nullable(),
  probedAt: z.string().datetime(),
});
// 目标被拒（非 https / 解析到私网、回环、链路本地、云元数据地址 / 发生重定向）不是 outcome，而是错误 30005（见 02b）。
export type ChannelProbeResult = z.infer<typeof ChannelProbeResponse>;
