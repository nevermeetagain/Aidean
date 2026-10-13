// 模型提供商定价纯函数
//
// 核心公式（用户需求）：
//   折扣价(元/M Tokens) = 标价(原币/M Tokens) / (充值比例 × 倍率)
//
// 当标价单位为 per_1k_tokens 时，先换算为 M Tokens 口径：
//   标价(原币/M Tokens) = 标价(原币/K Tokens) × 1000
//
// 示例验证：
//   充值比例 = 20（1 元 = $20），输入标价 = $10/K Tokens = $10000/M Tokens，倍率 = 1
//   折扣价(元/M Tokens) = 10000 / (20 × 1) = 500 元/M Tokens
//   折扣价(元/K Tokens) = 500 / 1000 = 0.5 元/K Tokens
//   → 1 元可买 2K Tokens ✓
//
// 注意：本模块仅做展示口径换算，不参与实际扣费链路（扣费仍走 calcCharge）。

/** 标价单位 */
export type PriceUnit = "per_million_tokens" | "per_1k_tokens";

/** K Tokens → M Tokens 换算因子 */
const K_TO_M = 1000;

/**
 * 将标价统一为 M Tokens 口径。
 *
 * @param listedPrice 原币标价（Decimal 或 number）
 * @param unit 标价单位
 * @returns 原币/M Tokens
 */
export function normalizeToMillionTokens(
  listedPrice: number | string,
  unit: PriceUnit,
): number {
  const v = typeof listedPrice === "string" ? Number(listedPrice) : listedPrice;
  if (!Number.isFinite(v) || v < 0) {
    throw new Error(`非法标价: ${String(listedPrice)}`);
  }
  return unit === "per_1k_tokens" ? v * K_TO_M : v;
}

/**
 * 计算折扣价（元/M Tokens）。
 *
 * 公式: 折扣价 = 标价(原币/M Tokens) / (充值比例 × 倍率)
 *
 * @param listedPrice 标价（原币，单位由 priceUnit 指定）
 * @param priceUnit 标价单位
 * @param rechargeRatio 充值比例（1 元 = rechargeRatio 外币）
 * @param multiplier 可用倍率（默认 1.0）
 * @returns 元/M Tokens
 */
export function calcDiscountPrice(
  listedPrice: number | string,
  priceUnit: PriceUnit,
  rechargeRatio: number,
  multiplier: number = 1.0,
): number {
  if (!Number.isFinite(rechargeRatio) || rechargeRatio <= 0) {
    throw new Error(`非法充值比例: ${String(rechargeRatio)}`);
  }
  if (!Number.isFinite(multiplier) || multiplier <= 0) {
    throw new Error(`非法倍率: ${String(multiplier)}`);
  }
  const priceM = normalizeToMillionTokens(listedPrice, priceUnit);
  return priceM / (rechargeRatio * multiplier);
}

/**
 * 将元/M Tokens 转换为元/K Tokens。
 */
export function millionToK(priceM: number): number {
  return priceM / K_TO_M;
}

/**
 * 将元/K Tokens 转换为元/M Tokens。
 */
export function kToMillion(priceK: number): number {
  return priceK * K_TO_M;
}

/**
 * 格式化价格显示（保留指定小数位，去尾零）。
 *
 * @param value 价格数值
 * @param decimals 小数位数（默认 4）
 * @returns 格式化字符串，如 "500"、"0.5"、"0.0025"
 */
export function formatPrice(value: number, decimals: number = 4): string {
  if (!Number.isFinite(value)) return "—";
  const fixed = value.toFixed(decimals);
  // 去尾零
  return parseFloat(fixed).toString();
}

/**
 * 格式化标价显示，带币种和单位后缀。
 *
 * @param price 标价
 * @param currency 币种符号（如 "$"、"¥"）
 * @param unit 标价单位
 * @returns 如 "$10/K" 或 "$100/M"
 */
export function formatListedPrice(
  price: number | string | null | undefined,
  currency: string,
  unit: PriceUnit,
): string {
  if (price === null || price === undefined) return "未公开";
  const v = typeof price === "string" ? Number(price) : price;
  if (!Number.isFinite(v)) return "—";
  const unitLabel = unit === "per_1k_tokens" ? "K" : "M";
  return `${currency}${formatPrice(v, 6)}/${unitLabel}`;
}

/**
 * 格式化折扣价显示，带"元/M"或"元/K"后缀。
 */
export function formatDiscountPrice(
  priceM: number | null | undefined,
  displayUnit: "M" | "K" = "M",
): string {
  if (priceM === null || priceM === undefined || !Number.isFinite(priceM)) return "—";
  const v = displayUnit === "K" ? millionToK(priceM) : priceM;
  return `${formatPrice(v, 6)}/元·${displayUnit}`;
}

/**
 * 计算折扣价区间。
 *
 * 当标价为单值时，discountMin = discountMax = 折扣价。
 * 当标价为区间 [minPrice, maxPrice] 时，折扣价也为区间。
 *
 * @returns [min元/M, max元/M]，若任一标价缺失则对应位为 null
 */
export function calcDiscountRange(
  minListed: number | string | null | undefined,
  maxListed: number | string | null | undefined,
  priceUnit: PriceUnit,
  rechargeRatio: number,
  multiplier: number = 1.0,
): [number | null, number | null] {
  const min =
    minListed !== null && minListed !== undefined
      ? calcDiscountPrice(minListed, priceUnit, rechargeRatio, multiplier)
      : null;
  const max =
    maxListed !== null && maxListed !== undefined
      ? calcDiscountPrice(maxListed, priceUnit, rechargeRatio, multiplier)
      : null;
  return [min, max];
}

/**
 * 格式化折扣价区间显示。
 *
 * 单值: "500/元·M"
 * 区间: "400~600/元·M"
 */
export function formatDiscountRange(
  minM: number | null,
  maxM: number | null,
  displayUnit: "M" | "K" = "M",
): string {
  if (minM === null && maxM === null) return "—";
  if (minM !== null && maxM !== null && minM === maxM) {
    return formatDiscountPrice(minM, displayUnit);
  }
  const minStr = minM !== null ? formatDiscountPrice(minM, displayUnit) : "—";
  const maxStr = maxM !== null ? formatDiscountPrice(maxM, displayUnit) : "—";
  // 去掉后缀，用区间连接
  const minVal = minStr.replace(/\/元·[MK]$/, "");
  const maxVal = maxStr.replace(/\/元·[MK]$/, "");
  const suffix = displayUnit === "K" ? "/元·K" : "/元·M";
  return `${minVal}~${maxVal}${suffix}`;
}
