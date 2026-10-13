import { describe, expect, it } from "vitest";

import {
  CURRENCY_SYMBOLS,
  DEFAULT_PRICING,
  PRICING_CONFIG_KEYS,
  PRICING_CURRENCIES,
  formatEvalPrice,
  parsePricingConfig,
} from "../utils/pricing-config";
import { ADMIN_CONFIG_KEYS } from "../schemas/admin.schema";

describe("pricing 读侧契约（B-N9）", () => {
  it("① 键名常量必须落在管理端白名单内（防读侧引用漂移出可编辑范围）", () => {
    const whitelist = ADMIN_CONFIG_KEYS as readonly string[];
    expect(whitelist).toContain(PRICING_CONFIG_KEYS.evalPerModel);
    expect(whitelist).toContain(PRICING_CONFIG_KEYS.currency);
    expect(PRICING_CONFIG_KEYS.evalPerModel).toBe("pricing.evalPerModel");
    expect(PRICING_CONFIG_KEYS.currency).toBe("pricing.currency");
  });

  it("② parsePricingConfig 正常解析：'2'/'CNY' 与数字入参", () => {
    expect(parsePricingConfig({ evalPerModel: "2", currency: "CNY" })).toEqual({
      evalPerModel: 2,
      currency: "CNY",
    });
    expect(parsePricingConfig({ evalPerModel: 5, currency: "USD" })).toEqual({
      evalPerModel: 5,
      currency: "USD",
    });
  });

  it("③ 缺失/非法一律回退默认（与 GET /admin/configs 缺行兜底同口径）", () => {
    expect(parsePricingConfig()).toEqual(DEFAULT_PRICING);
    expect(parsePricingConfig({ evalPerModel: "abc", currency: "XXX" })).toEqual(DEFAULT_PRICING);
    expect(parsePricingConfig({ evalPerModel: "", currency: null })).toEqual(DEFAULT_PRICING);
  });

  it("④ formatEvalPrice：¥2.00 / $3.50 / 非法回退 0，且符号覆盖全部枚举", () => {
    expect(formatEvalPrice(2)).toBe("¥2.00");
    expect(formatEvalPrice(3.5, "USD")).toBe("$3.50");
    expect(formatEvalPrice(Number.NaN)).toBe("¥0.00");
    for (const c of PRICING_CURRENCIES) {
      expect(CURRENCY_SYMBOLS[c]).toBeTruthy();
    }
  });
});
