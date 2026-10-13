import { describe, expect, it } from "vitest";
import { calcCharge } from "../utils/billing";

describe("calcCharge(输出单位=分)", () => {
  it("上游单价为 0(免费)恒为 0 分", () => {
    expect(calcCharge({ pricePerMillionToken: 0, tokens: 987_654_321 })).toBe(0n);
  });

  it("默认系数/倍率均为 1.0:10 元 x 1M tokens -> 1000 分", () => {
    expect(calcCharge({ pricePerMillionToken: 10, tokens: 1_000_000 })).toBe(1000n);
  });

  it("显式传倍率 1.0 与缺省结果一致", () => {
    expect(calcCharge({ pricePerMillionToken: 10, tokens: 1_000_000, tokenMultiplier: 1 })).toBe(1000n);
  });

  it("加价系数 1.1:10 元 x 1M tokens -> 1100 分", () => {
    expect(calcCharge({ pricePerMillionToken: 10, markupRate: 1.1, tokens: 1_000_000 })).toBe(1100n);
  });

  it("round half up:1.25 元 x 4000 tokens = 恰 0.5 分 -> 进位 1 分", () => {
    expect(calcCharge({ pricePerMillionToken: 1.25, tokens: 4_000 })).toBe(1n);
  });

  it("微价小数安全:0.002 元 x 1.5M x 倍率2 = 0.6 分 -> 进位 1 分", () => {
    expect(calcCharge({ pricePerMillionToken: 0.002, tokens: 1_500_000, tokenMultiplier: 2 })).toBe(1n);
  });

  it("浮点陷阱回归:0.1 元 x 3M tokens 精确 30 分(非 29.9999...)", () => {
    expect(calcCharge({ pricePerMillionToken: 0.1, tokens: 3_000_000 })).toBe(30n);
  });

  it("缓存命中不计费(仅以入参演示):计费 tokens 由调用方剔除后传入,计费线性缩水", () => {
    const full = calcCharge({ pricePerMillionToken: 5, tokens: 2_000_000 });
    const billable = calcCharge({ pricePerMillionToken: 5, tokens: 1_500_000 });
    expect(full).toBe(1000n);
    expect(billable).toBe(750n);
  });

  it("非法参数抛错:tokens 非整数/为负、单价为负", () => {
    expect(() => calcCharge({ pricePerMillionToken: 1, tokens: 1.5 })).toThrow();
    expect(() => calcCharge({ pricePerMillionToken: 1, tokens: -1 })).toThrow();
    expect(() => calcCharge({ pricePerMillionToken: -2, tokens: 10 })).toThrow();
  });
});