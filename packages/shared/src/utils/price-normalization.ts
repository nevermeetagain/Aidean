// TASK-047（改写，2026-10-20）· 计价口径归一契约（ADR-P005 v0.3 ACCEPTED；U-15 用户裁决见 26_用户裁决记录.md）
//
// 用户裁决（2026-10-20 11:09/11:12 CST）：
//   ① 展示币种按访问者 IP：中国大陆 → CNY；其他地区与未知 → USD；
//   ② 汇率取最新市场汇率，**每天只用一个汇率**（日快照，日期按 Asia/Shanghai 自然日）；
//   ③ 实际扣费按账户余额币种（现为 CNY）结算，换算同样使用当日快照。
//
// 本模块只放纯函数与常量，不读库、不读时钟（时间与汇率一律由调用方传入，便于计费与展示同口径复现）：
//   - normalizeUnitPrice：任意（币种, 单位）→ 目标币种 / 每百万 Token，十进制串精确运算（BigInt 定点），不经浮点；
//   - resolveDisplayCurrency：国家码 → 展示币种（TASK-102 在 middleware 接线）；
//   - fxDateOf：时刻 → 汇率日（Asia/Shanghai），日快照的唯一取日口径；
//   - FxDailyRateSchema：日汇率快照 DTO（表 fx_daily_rates，TASK-101 写、apps/web/lib/features/pricing/fx.ts 读）。
// 不可归一（未知币种/单位、汇率缺失或 ≤0、数值非法）一律抛 PriceNormalizationError：
//   网关 fail-closed 跳过该候选（降级链继续，最终 30002）；读侧显示「价格待核」（onUnnormalizable）。
import { z } from "zod";

export const SUPPORTED_CURRENCIES = ["CNY", "USD"] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

/** 单位 → 换算到「每百万 Token」的倍数（别名并存：库内既有 per_1m_tokens 与 per_million_tokens 两种写法） */
export const UNIT_FACTOR_TO_MILLION = {
  per_million_tokens: 1n,
  per_1m_tokens: 1n,
  per_1k_tokens: 1000n,
  per_token: 1_000_000n,
} as const;
export type NormalizableUnit = keyof typeof UNIT_FACTOR_TO_MILLION;

export const PRICE_NORMALIZATION = {
  targetUnit: "per_million_tokens",
  /** 结算币种：账户余额币种（现行全部为 CNY）；展示币种另由 resolveDisplayCurrency 决定 */
  settlementCurrency: "CNY",
  supportedCurrencies: SUPPORTED_CURRENCIES,
  /** 结果小数位（与 model_prices Decimal(19,6) 一致），半入（half-up） */
  scale: 6,
  /** 汇率日所用时区（每天一个汇率） */
  fxTimeZone: "Asia/Shanghai",
  /** 读侧可接受的汇率最大陈旧天数：当日快照缺失时允许回退到最近一日，超过则视为汇率缺失（fail-closed） */
  fxMaxStaleDays: 3,
  onUnnormalizable: "skip-candidate",
} as const;

/** 部署层国家头读取顺序（不做外网 GeoIP；TASK-102 接线） */
export const GEO_COUNTRY_HEADERS = ["cf-ipcountry", "x-vercel-ip-country", "x-geo-country"] as const;

export class PriceNormalizationError extends Error {
  constructor(
    public readonly reason: "unknown_currency" | "unknown_unit" | "invalid_value" | "fx_missing" | "fx_invalid",
    message: string,
  ) {
    super(message);
    this.name = "PriceNormalizationError";
  }
}

// ------------------------------------------------------------------ 日汇率快照
const DecimalStr = z.string().regex(/^\d+(\.\d+)?$/);
const PositiveDecimalStr = DecimalStr.refine((v) => /[1-9]/.test(v), "汇率必须为正");
const DateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** 日汇率快照：1 USD = usdCny CNY；每个 rateDate 只有一行（唯一键 rate_date + base + quote） */
export const FxDailyRateSchema = z.object({
  rateDate: DateStr,
  base: z.literal("USD"),
  quote: z.literal("CNY"),
  rate: PositiveDecimalStr,
  source: z.string().min(1).max(40),
  sourceUrl: z.string().url(),
  fetchedAt: z.string().datetime(),
});
export type FxDailyRate = z.infer<typeof FxDailyRateSchema>;

/** 归一所需的最小汇率输入 */
export interface FxRates {
  /** 汇率日 YYYY-MM-DD（Asia/Shanghai） */
  date: string;
  /** 1 USD = usdCny CNY，十进制串 */
  usdCny: string;
}

/** 时刻 → 汇率日（Asia/Shanghai 自然日，YYYY-MM-DD）。计费与展示必须用同一取日口径。 */
export function fxDateOf(at: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PRICE_NORMALIZATION.fxTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** 国家码（ISO 3166-1 alpha-2）→ 展示币种：CN → CNY；其他（含 HK/MO/TW）与缺失/非法 → USD */
export function resolveDisplayCurrency(country: string | null | undefined): SupportedCurrency {
  const c = (country ?? "").trim().toUpperCase();
  return c === "CN" ? "CNY" : "USD";
}

// ------------------------------------------------------------------ 十进制定点运算（不经浮点）
interface Fixed {
  int: bigint; // 值 × 10^scale
  scale: number;
}

function parseDecimal(v: string | number, what: string): Fixed {
  const s = typeof v === "number" ? (Number.isFinite(v) && v >= 0 ? v.toFixed(12) : "") : v.trim();
  if (!/^\d+(\.\d+)?$/.test(s)) throw new PriceNormalizationError("invalid_value", `${what} 非法：${String(v)}`);
  const [i, f = ""] = s.split(".");
  return { int: BigInt(i + f), scale: f.length };
}

const pow10 = (n: number): bigint => 10n ** BigInt(n);

/** 定点值四舍五入（half-up）到目标小数位 */
function rescale(x: Fixed, scale: number): bigint {
  if (x.scale <= scale) return x.int * pow10(scale - x.scale);
  const d = pow10(x.scale - scale);
  return (x.int + d / 2n) / d;
}

function formatFixed(int: bigint, scale: number): string {
  const s = int.toString().padStart(scale + 1, "0");
  const head = s.slice(0, s.length - scale);
  const tail = s.slice(s.length - scale).replace(/0+$/, "");
  return tail ? `${head}.${tail}` : head;
}

function assertCurrency(c: string): asserts c is SupportedCurrency {
  if (!(SUPPORTED_CURRENCIES as readonly string[]).includes(c)) {
    throw new PriceNormalizationError("unknown_currency", `不支持的币种：${c}`);
  }
}

export interface NormalizeInput {
  value: string | number;
  sourceCurrency: string;
  sourceUnit: string;
  targetCurrency: SupportedCurrency;
  /** 源与目标币种相同可省略；不同则必填 */
  fx?: FxRates | null;
}

export interface NormalizedPrice {
  /** 目标币种 / 每百万 Token，十进制串（≤6 位小数，半入） */
  value: string;
  currency: SupportedCurrency;
  unit: "per_million_tokens";
  sourceValue: string;
  sourceCurrency: SupportedCurrency;
  sourceUnit: NormalizableUnit;
  /** 实际参与换算的汇率（同币种为 null） */
  fxRate: string | null;
  fxDate: string | null;
}

/**
 * 唯一归一函数（计费与展示共用）：
 *   value × unitFactor[sourceUnit] × (USD→CNY ? usdCny : CNY→USD ? 1/usdCny : 1)，结果半入到 6 位小数。
 * 汇率只来自参数（本文件无任何汇率字面量）。
 */
export function normalizeUnitPrice(input: NormalizeInput): NormalizedPrice {
  const { sourceCurrency, sourceUnit, targetCurrency } = input;
  assertCurrency(sourceCurrency);
  assertCurrency(targetCurrency);
  const factor = (UNIT_FACTOR_TO_MILLION as Record<string, bigint>)[sourceUnit];
  if (factor === undefined) throw new PriceNormalizationError("unknown_unit", `不可归一的计价单位：${sourceUnit}`);

  const v = parseDecimal(input.value, "价格");
  const scale = PRICE_NORMALIZATION.scale;
  const perMillion: Fixed = { int: v.int * factor, scale: v.scale };

  let result: bigint;
  let fxRate: string | null = null;
  let fxDate: string | null = null;
  if (sourceCurrency === targetCurrency) {
    result = rescale(perMillion, scale);
  } else {
    if (!input.fx) throw new PriceNormalizationError("fx_missing", `缺少汇率：${sourceCurrency}→${targetCurrency}`);
    const fx = parseDecimal(input.fx.usdCny, "汇率");
    if (fx.int === 0n) throw new PriceNormalizationError("fx_invalid", "汇率必须为正");
    fxRate = input.fx.usdCny.trim();
    fxDate = input.fx.date;
    if (sourceCurrency === "USD") {
      result = rescale({ int: perMillion.int * fx.int, scale: perMillion.scale + fx.scale }, scale);
    } else {
      // CNY → USD：perMillion / fx，先多保留 4 位（截断误差 < 10^-(scale+4)）再半入到 scale
      const extra = scale + 4;
      const num = perMillion.int * pow10(extra + fx.scale);
      const den = fx.int * pow10(perMillion.scale);
      result = rescale({ int: num / den, scale: extra }, scale);
    }
  }

  return {
    value: formatFixed(result, scale),
    currency: targetCurrency,
    unit: "per_million_tokens",
    sourceValue: formatFixed(v.int, v.scale),
    sourceCurrency,
    sourceUnit: sourceUnit as NormalizableUnit,
    fxRate,
    fxDate,
  };
}

/** 监控观测的合成单位（usd_per_1m_tokens / cny_per_1m_tokens）→ (币种, 单位)；其余（per_request/ratio）返回 null */
export function splitObservedPriceUnit(u: string | null | undefined): { currency: SupportedCurrency; unit: NormalizableUnit } | null {
  if (u === "usd_per_1m_tokens") return { currency: "USD", unit: "per_1m_tokens" };
  if (u === "cny_per_1m_tokens") return { currency: "CNY", unit: "per_1m_tokens" };
  return null;
}
