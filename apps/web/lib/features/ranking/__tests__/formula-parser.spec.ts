import { describe, expect, it } from "vitest";
import { compileFormula, evaluateFormula, FormulaError } from "../formula-parser";

describe("evaluateFormula 公式安全求值器", () => {
  it("合法单变量求值", () => {
    expect(evaluateFormula("{score}", { score: 95 })).toBe(95);
  });

  it("多变量组合 {score}*0.9-{priceInput}/100", () => {
    expect(
      evaluateFormula("{score}*0.9-{priceInput}/100", { score: 100, priceInput: 50 }),
    ).toBeCloseTo(89.5);
  });

  it("运算符优先级：1+2*3 === 7", () => {
    expect(evaluateFormula("1+2*3", {})).toBe(7);
  });

  it("括号覆盖优先级：(1+2)*3 === 9", () => {
    expect(evaluateFormula("(1+2)*3", {})).toBe(9);
  });

  it("除数为零：抛 FormulaError 且 message 含『除数』（字面零与变量零双路径）", () => {
    expect(() => evaluateFormula("{score}/0", { score: 10 })).toThrow(FormulaError);
    expect(() => evaluateFormula("1/{x}", { x: 0 })).toThrow(/除数/);
  });

  it("未知变量：抛 FormulaError 且 message 含变量名", () => {
    expect(() => evaluateFormula("{priceInput}*2", {})).toThrow(FormulaError);
    try {
      evaluateFormula("{priceInput}*2", {});
      throw new Error("should not reach");
    } catch (e) {
      expect(e).toBeInstanceOf(FormulaError);
      expect((e as Error).message).toContain("priceInput");
    }
  });

  it("非法字符 @：拒绝并抛 FormulaError", () => {
    expect(() => evaluateFormula("{score}@2", { score: 1 })).toThrow(FormulaError);
  });

  it("连续运算符 1++2：不支持一元符号，必须抛错", () => {
    expect(() => evaluateFormula("1++2", {})).toThrow(FormulaError);
  });

  it("空串与纯空白：抛错", () => {
    expect(() => evaluateFormula("", {})).toThrow(FormulaError);
    expect(() => evaluateFormula("   ", {})).toThrow(FormulaError);
  });

  it("深嵌套括号正确：((((({score}))+1))*2)，score=48 → 98", () => {
    expect(evaluateFormula("((((({score}))+1))*2)", { score: 48 })).toBe(98);
  });

  it("compileFormula 返回可复用闭包，多次求值结果一致且正确", () => {
    const rank = compileFormula("{score}*2-{priceInput}");
    expect(rank({ score: 60, priceInput: 15 })).toBe(105);
    expect(rank({ score: 80, priceInput: 40 })).toBe(120);
    expect(() => rank({} as Record<string, number>)).toThrow(); // 缺变量在求值期暴露
  });

  it("小数与除法组合：10/4 === 2.5；未闭合圆括号 → 括号不匹配", () => {
    expect(evaluateFormula("10/4", {})).toBe(2.5);
    expect(() => evaluateFormula("(1+2", {})).toThrow(/括号不匹配/);
  });
});
