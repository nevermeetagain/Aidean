// TASK-026 限时优惠契约单测：窗口校验 / 非负十进制字符串 / PATCH strict / EffectivePrice 无敏感键
import { describe, expect, it } from "vitest";
import { EffectivePriceSchema, PromotionPriceCreateSchema, PromotionPricePatchSchema } from "../index";

const base = {
  modelId: "m-1",
  priceInput: "1.5",
  priceOutput: "3",
  effectiveFrom: "2026-11-01T00:00:00.000Z",
  effectiveUntil: "2026-11-08T00:00:00.000Z",
};

describe("PromotionPriceCreateSchema（TASK-026）", () => {
  it("合法窗口通过；免费价 \"0\" 通过", () => {
    expect(PromotionPriceCreateSchema.safeParse(base).success).toBe(true);
    expect(PromotionPriceCreateSchema.safeParse({ ...base, priceInput: "0", priceOutput: "0" }).success).toBe(true);
  });
  it("until == from 拒绝（半开区间，空窗口无意义）", () => {
    expect(PromotionPriceCreateSchema.safeParse({ ...base, effectiveUntil: base.effectiveFrom }).success).toBe(false);
  });
  it("until < from 拒绝", () => {
    expect(PromotionPriceCreateSchema.safeParse({ ...base, effectiveUntil: "2026-10-01T00:00:00.000Z" }).success).toBe(false);
  });
  it("缺 effectiveUntil 拒绝（限时优惠必须有结束时间）", () => {
    const { effectiveUntil: _u, ...rest } = base;
    expect(PromotionPriceCreateSchema.safeParse(rest).success).toBe(false);
  });
  it.each(["-1", "abc", "1e3", "", " 1", "1.", ".5"])("价格非法字符串 %j 拒绝", (bad) => {
    expect(PromotionPriceCreateSchema.safeParse({ ...base, priceInput: bad }).success).toBe(false);
  });
  it("价格必须是字符串（number 拒绝，避免浮点精度漂移）", () => {
    expect(PromotionPriceCreateSchema.safeParse({ ...base, priceInput: 1.5 }).success).toBe(false);
  });
  it("非 ISO 时间拒绝", () => {
    expect(PromotionPriceCreateSchema.safeParse({ ...base, effectiveFrom: "2026/11/01" }).success).toBe(false);
  });
  it("idempotencyKey 长度 8..64", () => {
    expect(PromotionPriceCreateSchema.safeParse({ ...base, idempotencyKey: "short" }).success).toBe(false);
    expect(PromotionPriceCreateSchema.safeParse({ ...base, idempotencyKey: "k".repeat(8) }).success).toBe(true);
  });
});

describe("PromotionPricePatchSchema（TASK-026）", () => {
  it("strict：未知键（含 modelId / markupRate）拒绝", () => {
    expect(PromotionPricePatchSchema.safeParse({ modelId: "x" }).success).toBe(false);
    expect(PromotionPricePatchSchema.safeParse({ markupRate: "1.2" }).success).toBe(false);
  });
  it("部分字段通过；priceCache 可置 null", () => {
    expect(PromotionPricePatchSchema.safeParse({ priceInput: "0.8", priceCache: null }).success).toBe(true);
  });
});

describe("EffectivePriceSchema（TASK-026）", () => {
  const ep = {
    modelId: "m-1",
    priceInput: "0",
    priceOutput: "0",
    priceCache: null,
    isPromotion: true,
    promotionEndsAt: "2026-11-08T00:00:00.000Z",
    basePriceInput: "1.5",
    basePriceOutput: "3",
  };
  it("合法样例可解析；非优惠时 base*/promotionEndsAt 为 null", () => {
    expect(EffectivePriceSchema.safeParse(ep).success).toBe(true);
    expect(
      EffectivePriceSchema.safeParse({ ...ep, isPromotion: false, promotionEndsAt: null, basePriceInput: null, basePriceOutput: null }).success,
    ).toBe(true);
  });
  it("keyof() 不含 markupRate/tokenMultiplier 及任何 markup/multiplier 键（价格透明 · 敏感字段一票否决）", () => {
    const keys = EffectivePriceSchema.keyof().options as string[];
    expect(keys).not.toContain("markupRate");
    expect(keys).not.toContain("tokenMultiplier");
    expect(keys.filter((k) => /markup|multiplier/i.test(k))).toEqual([]);
  });
  it("parse 剥离意外注入的敏感键（输出不外泄）", () => {
    const out = EffectivePriceSchema.parse({ ...ep, markupRate: "1.3", tokenMultiplier: "2" });
    expect(Object.keys(out)).not.toContain("markupRate");
    expect(Object.keys(out)).not.toContain("tokenMultiplier");
  });
});
