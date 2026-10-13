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
