// TASK-047（改写）· 计价口径归一纯函数单测（ADR-P005 v0.3；U-15 = IP 定展示币种 + 日汇率快照）
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  EffectivePriceSchema,
  FxDailyRateSchema,
  PRICE_NORMALIZATION,
  PriceNormalizationError,
  fxDateOf,
  normalizeUnitPrice,
  resolveDisplayCurrency,
  splitObservedPriceUnit,
} from "../index";

const FX = { date: "2026-10-20", usdCny: "7.1234" };

describe("normalizeUnitPrice 四象限（币种 × 单位）", () => {
  it("CNY / per_million → CNY：原值（不需要汇率）", () => {
    const r = normalizeUnitPrice({ value: "12.5", sourceCurrency: "CNY", sourceUnit: "per_million_tokens", targetCurrency: "CNY" });
    expect(r).toMatchObject({ value: "12.5", currency: "CNY", unit: "per_million_tokens", fxRate: null, fxDate: null });
  });

  it("CNY / per_1k → CNY：×1000", () => {
    expect(normalizeUnitPrice({ value: "0.012", sourceCurrency: "CNY", sourceUnit: "per_1k_tokens", targetCurrency: "CNY" }).value).toBe("12");
  });

  it("USD / per_million → CNY：×usdCny，记录 fxRate/fxDate", () => {
    const r = normalizeUnitPrice({ value: "2.5", sourceCurrency: "USD", sourceUnit: "per_1m_tokens", targetCurrency: "CNY", fx: FX });
    expect(r).toMatchObject({ value: "17.8085", fxRate: "7.1234", fxDate: "2026-10-20", sourceCurrency: "USD", sourceValue: "2.5" });
  });

  it("USD / per_1k → CNY：×1000×usdCny", () => {
    expect(normalizeUnitPrice({ value: "0.0025", sourceCurrency: "USD", sourceUnit: "per_1k_tokens", targetCurrency: "CNY", fx: FX }).value).toBe("17.8085");
  });

  it("CNY → USD（海外访客展示）：÷usdCny，半入到 6 位", () => {
    // 10 / 7.1234 = 1.40382401... → 1.403824
    expect(normalizeUnitPrice({ value: "10", sourceCurrency: "CNY", sourceUnit: "per_million_tokens", targetCurrency: "USD", fx: FX }).value).toBe("1.403824");
  });

  it("精确定点：不出现浮点误差（0.1 + 精度 6 位半入）", () => {
    expect(normalizeUnitPrice({ value: "0.1", sourceCurrency: "USD", sourceUnit: "per_million_tokens", targetCurrency: "CNY", fx: { date: "2026-10-20", usdCny: "3" } }).value).toBe("0.3");
    expect(normalizeUnitPrice({ value: "0.0000005", sourceCurrency: "CNY", sourceUnit: "per_million_tokens", targetCurrency: "CNY" }).value).toBe("0.000001");
  });

  it("0 价（限免）保持 0", () => {
    expect(normalizeUnitPrice({ value: "0", sourceCurrency: "USD", sourceUnit: "per_1k_tokens", targetCurrency: "CNY", fx: FX }).value).toBe("0");
  });
});

describe("fail-closed：不可归一一律抛 PriceNormalizationError", () => {
  const bad = (input: Parameters<typeof normalizeUnitPrice>[0], reason: string) => {
    try {
      normalizeUnitPrice(input);
      throw new Error("should throw");
    } catch (e) {
      expect(e).toBeInstanceOf(PriceNormalizationError);
      expect((e as PriceNormalizationError).reason).toBe(reason);
    }
  };
  it("未知币种", () => bad({ value: "1", sourceCurrency: "EUR", sourceUnit: "per_million_tokens", targetCurrency: "CNY", fx: FX }, "unknown_currency"));
  it("未知单位（per_request）", () => bad({ value: "1", sourceCurrency: "CNY", sourceUnit: "per_request", targetCurrency: "CNY" }, "unknown_unit"));
  it("跨币种缺汇率", () => bad({ value: "1", sourceCurrency: "USD", sourceUnit: "per_million_tokens", targetCurrency: "CNY" }, "fx_missing"));
  it("汇率为 0", () => bad({ value: "1", sourceCurrency: "USD", sourceUnit: "per_million_tokens", targetCurrency: "CNY", fx: { date: "2026-10-20", usdCny: "0" } }, "fx_invalid"));
  it("负数/非数字价格", () => {
    bad({ value: "-1", sourceCurrency: "CNY", sourceUnit: "per_million_tokens", targetCurrency: "CNY" }, "invalid_value");
    bad({ value: "abc", sourceCurrency: "CNY", sourceUnit: "per_million_tokens", targetCurrency: "CNY" }, "invalid_value");
  });
});

describe("展示币种与汇率日", () => {
  it("中国大陆 → CNY；港澳台/海外/缺失/非法 → USD", () => {
    expect(resolveDisplayCurrency("CN")).toBe("CNY");
    expect(resolveDisplayCurrency(" cn ")).toBe("CNY");
    for (const c of ["HK", "MO", "TW", "US", "JP", "", null, undefined, "XX"]) expect(resolveDisplayCurrency(c)).toBe("USD");
  });

  it("汇率日按 Asia/Shanghai 自然日（UTC 16:00 即次日）", () => {
    expect(fxDateOf(new Date("2026-10-19T15:59:59Z"))).toBe("2026-10-19");
    expect(fxDateOf(new Date("2026-10-19T16:00:00Z"))).toBe("2026-10-20");
  });

  it("FxDailyRateSchema：正汇率通过，0 拒绝", () => {
    const ok = { rateDate: "2026-10-20", base: "USD", quote: "CNY", rate: "7.1234", source: "frankfurter", sourceUrl: "https://api.frankfurter.app/latest", fetchedAt: "2026-10-20T01:00:00.000Z" };
    expect(FxDailyRateSchema.safeParse(ok).success).toBe(true);
    expect(FxDailyRateSchema.safeParse({ ...ok, rate: "0" }).success).toBe(false);
  });

  it("监控合成单位拆分", () => {
    expect(splitObservedPriceUnit("usd_per_1m_tokens")).toEqual({ currency: "USD", unit: "per_1m_tokens" });
    expect(splitObservedPriceUnit("cny_per_1m_tokens")).toEqual({ currency: "CNY", unit: "per_1m_tokens" });
    expect(splitObservedPriceUnit("ratio")).toBeNull();
  });
});

describe("契约约束", () => {
  it("EffectivePriceSchema：旧形状仍合法（追加字段 optional），新字段可解析", () => {
    const legacy = { modelId: "m", priceInput: "1", priceOutput: "2", priceCache: null, isPromotion: false, promotionEndsAt: null, basePriceInput: null, basePriceOutput: null };
    expect(EffectivePriceSchema.safeParse(legacy).success).toBe(true);
    const full = { ...legacy, currency: "CNY", unit: "per_million_tokens", sourceCurrency: "USD", sourceUnit: "per_1k_tokens", sourcePriceInput: "0.001", sourcePriceOutput: "0.002", fxRate: "7.1234", fxDate: "2026-10-20" };
    expect(EffectivePriceSchema.safeParse(full).success).toBe(true);
    expect(EffectivePriceSchema.safeParse({ ...full, currency: "EUR" }).success).toBe(false);
  });

  it("price-normalization.ts 无硬编码汇率数值（汇率只来自参数）", () => {
    const src = readFileSync(fileURLToPath(new URL("../utils/price-normalization.ts", import.meta.url)), "utf-8");
    expect(src).not.toMatch(/\b(7\.\d+|6\.\d+|5(\.0+)?)\b(?!\s*位)/);
    expect(PRICE_NORMALIZATION.settlementCurrency).toBe("CNY");
  });
});
