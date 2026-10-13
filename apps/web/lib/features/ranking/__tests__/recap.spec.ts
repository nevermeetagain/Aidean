import { describe, expect, it } from "vitest";
import { computeComposite } from "../service";

/** 等权 25×4 基线（与 ranking_weights seed 的相对比值等价） */
const W_FULL = { official: 25, actual: 25, review: 25, selfTest: 25 };

describe("computeComposite 四维加权重算（不连 DB）", () => {
  it("等权均值：四维各 25 权重时等于算术平均", () => {
    expect(computeComposite({ official: 80, actual: 90, review: 70, selfTest: 60 }, W_FULL)).toBe(75);
  });

  it("缺 official 维：跳过该维并把权重和归一化为剩余 75", () => {
    // (90×25 + 70×25 + 60×25) / 75 = 5500/75 ≈ 73.33
    expect(computeComposite({ actual: 90, review: 70, selfTest: 60 }, W_FULL)).toBe(73.33);
  });

  it("全缺评分维度：受控抛错而非静默返 0 —— 文档化选择（防 0 分污染榜单，见 service JSDoc）", () => {
    expect(() => computeComposite({}, W_FULL)).toThrow(/评分数值/);
  });

  it("有分数但有效权重全零：同样防除零抛错", () => {
    expect(() => computeComposite({ official: 88 }, { official: 0 })).toThrow();
    expect(() => computeComposite({ actual: 88 }, {})).toThrow();
  });

  it("非对称权重：按实际权重比例聚合 (70×30+90×70)/100 = 84", () => {
    expect(computeComposite({ review: 70, selfTest: 90 }, { review: 30, selfTest: 70 })).toBe(84);
  });

  it("精度两位小数且 round half up：87.125 → 87.13", () => {
    expect(computeComposite({ actual: 87.125 }, { actual: 100 })).toBe(87.13);
  });

  it("多维缺口仍正常：仅两维可用时按两维权归一化", () => {
    // (80×20 + 96×30) / 50 = 89.6
    expect(computeComposite({ official: 80, review: 96 }, { official: 20, review: 30 })).toBe(89.6);
  });
});
