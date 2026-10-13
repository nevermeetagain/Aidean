// 站点配置 pricing 组「读侧契约」：键名常量 + 货币枚举 + 默认值 + 纯解析/格式化。
// 背景（B-N9）：pricing.evalPerModel / pricing.currency 此前仅写侧（admin/configs）引用，读侧零消费，
// 且对比测评（¥2/模型/次）尚未立项 → 当前无落点。本模块先把"读什么键、什么货币、什么兜底"固化为契约，
// 避免后续 UI/billing 接线时再次散落硬编码字符串；接线落码点见 docs/architecture/API接口文档.md §5.8 备注。
//
// 四处同步约束（与 admin/configs CONFIG_REGISTRY、seed systemConfigsData、ADMIN_CONFIG_KEYS 一致）：
//   键名 / 货币枚举 / 默认值 任一变更，必须同步上述三处，否则 admin-config-seed-parity 守卫会失败。

/** pricing 组白名单键（读侧统一引用，禁止在页面/服务里再写字面量） */
export const PRICING_CONFIG_KEYS = {
  /** 测评每模型价格（元） */
  evalPerModel: "pricing.evalPerModel",
  /** 默认货币 */
  currency: "pricing.currency",
} as const;

/** 允许货币（须与 CONFIG_REGISTRY pricing.currency 的 valueRule.allowed 严格一致） */
export const PRICING_CURRENCIES = ["CNY", "USD"] as const;
export type PricingCurrency = (typeof PRICING_CURRENCIES)[number];

/** 货币符号（读侧展示用，非换算：换算属支付域，不在本模块） */
export const CURRENCY_SYMBOLS: Record<PricingCurrency, string> = {
  CNY: "¥",
  USD: "$",
};

/** 默认值（与 seed systemConfigsData 值真源一致：'2' / 'CNY'；仅作缺配置兜底） */
export const DEFAULT_PRICING: { evalPerModel: number; currency: PricingCurrency } = {
  evalPerModel: 2,
  currency: "CNY",
};

export interface PricingConfig {
  /** 测评每模型价格（元） */
  evalPerModel: number;
  currency: PricingCurrency;
}

/**
 * 解析 system_configs 的 pricing 两键为强类型；缺失/非法一律回退默认（读侧容错不抛错，
 * 与 GET /admin/configs 的"缺行回退默认值"同口径）。
 */
export function parsePricingConfig(raw?: {
  evalPerModel?: string | number | null;
  currency?: string | null;
}): PricingConfig {
  // 空串/null/undefined 视为"缺失"回退默认（避免 Number("")=0 被当成"免费 0 元"）
  const rawEval = raw?.evalPerModel;
  let evalPerModel = DEFAULT_PRICING.evalPerModel;
  if (typeof rawEval === "number") {
    if (Number.isFinite(rawEval) && rawEval >= 0) evalPerModel = rawEval;
  } else if (typeof rawEval === "string" && rawEval.trim() !== "") {
    const n = Number(rawEval);
    if (Number.isFinite(n) && n >= 0) evalPerModel = n;
  }
  const currency = (PRICING_CURRENCIES as readonly string[]).includes(raw?.currency ?? "")
    ? (raw?.currency as PricingCurrency)
    : DEFAULT_PRICING.currency;
  return { evalPerModel, currency };
}

/** 金额展示：`¥2.00` / `$3.50`（固定两位小数；非法值回退 0） */
export function formatEvalPrice(amountYuan: number, currency: PricingCurrency = "CNY"): string {
  const safe = Number.isFinite(amountYuan) && amountYuan >= 0 ? amountYuan : 0;
  return `${CURRENCY_SYMBOLS[currency]}${safe.toFixed(2)}`;
}
