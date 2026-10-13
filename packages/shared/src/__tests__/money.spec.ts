import { describe, expect, it } from "vitest";
import { assertNonNegative, fenToYuan, yuanToFen } from "../utils/money";

describe("yuanToFen", () => {
  it("'10'(字符串) -> 1000n:元到分语义", () => {
    expect(yuanToFen("10")).toBe(1000n);
  });

  it("10(数值) -> 1000n:与字符串语义一致", () => {
    expect(yuanToFen(10)).toBe(1000n);
  });

  it("零值:'0' 与 0 -> 0n", () => {
    expect(yuanToFen("0")).toBe(0n);
    expect(yuanToFen(0)).toBe(0n);
  });

  it("'0.01' -> 1n:最小分粒度", () => {
    expect(yuanToFen("0.01")).toBe(1n);
  });

  it("'10.5' -> 1050n:一位小数右侧补零对齐", () => {
    expect(yuanToFen("10.5")).toBe(1050n);
  });

  it("负数抛错", () => {
    expect(() => yuanToFen("-1")).toThrow();
  });

  it("非法字符与超精度小数抛错", () => {
    expect(() => yuanToFen("abc")).toThrow(/非法金额/);
    expect(() => yuanToFen("12.345")).toThrow(/非法金额/);
  });

  it("超大额 '99999999999' 元 -> 9999999999900n 无损", () => {
    expect(yuanToFen("99999999999")).toBe(9999999999900n);
  });
});

describe("fenToYuan 与往返一致性", () => {
  it("固定两位小数:1050n -> '10.50',负值 -250n -> '-2.50'", () => {
    expect(fenToYuan(1050n)).toBe("10.50");
    expect(fenToYuan(-250n)).toBe("-2.50");
  });

  it("往返无损:fenToYuan(yuanToFen('123.45')) === '123.45'", () => {
    expect(fenToYuan(yuanToFen("123.45"))).toBe("123.45");
  });
});

describe("assertNonNegative", () => {
  it("负分抛 RangeError,零与正数放行", () => {
    expect(() => assertNonNegative(-1n)).toThrow(RangeError);
    expect(() => assertNonNegative(0n)).not.toThrow();
    expect(() => assertNonNegative(7n)).not.toThrow();
  });
});