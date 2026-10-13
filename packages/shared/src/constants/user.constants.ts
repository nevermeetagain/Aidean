// 用户体系常量（Task 1.3  单一来源）
export const USER_TIERS = ["NORMAL", "PRO", "MAX"] as const;
export type UserTier = (typeof USER_TIERS)[number];

/** 模型能力档位顺序（索引越大越弱） */
export const MODEL_TIER_ORDER = ["OPUS", "SONNET", "FABLE", "HAIKU"] as const;
export type ModelTier = (typeof MODEL_TIER_ORDER)[number];