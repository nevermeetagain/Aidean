// 统一计费网关常量（单一来源）
export const PRIORITY_MIN = 1;
export const PRIORITY_MAX = 99;
export const PRIORITY_DEFAULT = 50;

/** free 兜底优先级：大于任何用户可配置值，保证降级链末端语义 */
export const FREE_FALLBACK_PRIORITY = 100;

export const GATEWAY_FORMATS = ["openai", "anthropic", "openai-responses", "gemini"] as const;
export type GatewayFormat = (typeof GATEWAY_FORMATS)[number];

/**
 * 上游协议 wire 格式 ↔ Prisma `ChannelFormat` 枚举成员名的边界映射（连字符 ↔ 下划线）。
 * DB 列以 @map 数字串存储（'1'~'4'），Prisma 运行时返回枚举成员名（OPENAI / ANTHROPIC /
 * OPENAI_RESPONSES / GEMINI）；落库/读侧的唯一归一即此对函数，杜绝 `toUpperCase()` 漏转连字符。
 */
export function gatewayFormatToChannelEnum(f: GatewayFormat): "OPENAI" | "ANTHROPIC" | "OPENAI_RESPONSES" | "GEMINI" {
  return f.toUpperCase().replace(/-/g, "_") as "OPENAI" | "ANTHROPIC" | "OPENAI_RESPONSES" | "GEMINI";
}

/** 枚举成员名（或任意大小写/连字符变体）→ wire 格式；未知一律回落 openai（向后兼容旧数据） */
export function channelEnumToGatewayFormat(v: string | null | undefined): GatewayFormat {
  const wire = (v ?? "").toLowerCase().replace(/_/g, "-");
  return (GATEWAY_FORMATS as readonly string[]).includes(wire) ? (wire as GatewayFormat) : "openai";
}

/** 通用版等级固定序（需求 §3.6：Opus > Sonnet > Fable > Haiku 映射优先级 1/2/3/4） */
export const TIER_ORDER = ["OPUS", "SONNET", "FABLE", "HAIKU"] as const;
export type TierKey = (typeof TIER_ORDER)[number];
export const TIER_PRIORITY: Readonly<Record<TierKey, number>> = {
  OPUS: 1,
  SONNET: 2,
  FABLE: 3,
  HAIKU: 4,
};

/** 入口未传 max_tokens 时的预扣高估上限（保证实际消耗 ≤ 预扣额） */
export const DEFAULT_MAX_TOKENS = 4096;
/** 字符 → token 估算除数（输入预扣启发式） */
export const TOKEN_ESTIMATE_DIVISOR = 4;
/** 上游调用超时（毫秒） */
export const UPSTREAM_TIMEOUT_MS = 60_000;
/** Key 连续失败达阈值进入冷却 */
export const KEY_FAILURE_THRESHOLD = 5;
/** Key 冷却时长（分钟） */
export const KEY_COOLDOWN_MINUTES = 5;

/** 请求幂等键前缀（usage_logs.requestId / hold 幂等键共用） */
export const GATEWAY_IDEMPOTENCY_PREFIX = "gw:";
