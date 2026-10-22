/**
 * lib/http/pagination.ts 穷举单测（B11-11 / DEF-011-15）。
 *
 * 核心不变式：任意输入下 page/pageSize/skip/take/limit 恒为有限整数且落在声明区间内，
 * 绝不出现 NaN / Infinity / 负数（否则会被送进 Prisma skip/take → 500）。
 */
import { describe, expect, it } from "vitest";

import {
  MAX_SAFE_SKIP,
  clampInt,
  parseIntParam,
  parseLimit,
  parseOptionalInt,
  parsePagination,
  toSearchParams,
} from "./pagination";

const qs = (s: string) => new URLSearchParams(s);

/** 用户可控的“恶意/畸形”取值全集（含 parseInt 的各种边角） */
const HOSTILE = [
  "",
  " ",
  "abc",
  "NaN",
  "Infinity",
  "-Infinity",
  "undefined",
  "null",
  "0x10",
  "--1",
  "+",
  "-",
  ".5",
  "1e309",
  "9".repeat(400),
  "-" + "9".repeat(400),
  "%00",
  "１２", // 全角数字
  "[]",
  "{}",
];

const isInt = (n: number) => Number.isInteger(n) && Number.isFinite(n);

describe("parseIntParam", () => {
  it.each([
    [null, 7, 7],
    [undefined, 7, 7],
    ["", 7, 7],
    ["abc", 7, 7],
    ["NaN", 7, 7],
    ["12", 7, 12],
    ["-3", 7, -3],
    ["0", 7, 0],
    [" 5", 7, 5], // parseInt 容忍前导空白（与历史写法兼容）
    ["10abc", 7, 10], // parseInt 截断尾部（与历史写法兼容）
    ["1e3", 7, 1],
    ["3.9", 7, 3],
    ["0x10", 7, 0], // 十进制解析：'0x10' → 0
  ] as const)("parseIntParam(%j, %d) → %d", (raw, fb, expected) => {
    expect(parseIntParam(raw, fb)).toBe(expected);
  });

  it("超长数字串得到巨大但有限的值或回退，绝不返回 NaN", () => {
    for (const raw of HOSTILE) {
      const n = parseIntParam(raw, 1);
      expect(Number.isNaN(n)).toBe(false);
    }
  });
});

describe("clampInt", () => {
  it("区间内原样、越界钳制、上下界相等", () => {
    expect(clampInt(5, 1, 10)).toBe(5);
    expect(clampInt(-5, 1, 10)).toBe(1);
    expect(clampInt(50, 1, 10)).toBe(10);
    expect(clampInt(3, 4, 4)).toBe(4);
  });
  it("Infinity 被钳制到边界（parseInt 超长串可得 Infinity）", () => {
    expect(clampInt(Number.POSITIVE_INFINITY, 1, 10)).toBe(10);
    expect(clampInt(Number.NEGATIVE_INFINITY, 1, 10)).toBe(1);
  });
});

describe("toSearchParams", () => {
  it("接受 URLSearchParams / URL / Request 三种来源", () => {
    const sp = qs("page=2");
    expect(toSearchParams(sp)).toBe(sp);
    const url = new URL("http://x/api?page=3");
    expect(toSearchParams(url)).toBe(url.searchParams);
    expect(toSearchParams(new Request("http://x/api?page=4")).get("page")).toBe("4");
  });
});

describe("parsePagination", () => {
  it("缺省 → page=1 pageSize=20 skip=0 take=20", () => {
    expect(parsePagination(qs(""))).toEqual({ page: 1, pageSize: 20, skip: 0, take: 20 });
  });

  it("正常值 → skip=(page-1)*pageSize", () => {
    expect(parsePagination(qs("page=3&pageSize=10"))).toEqual({ page: 3, pageSize: 10, skip: 20, take: 10 });
  });

  it("DEF-011-15 主证：page=abc → 回退 1（旧写法得 NaN）", () => {
    expect(parsePagination(qs("page=abc"))).toEqual({ page: 1, pageSize: 20, skip: 0, take: 20 });
  });

  it("pageSize 非法 → 回退默认；越界 → 钳制", () => {
    expect(parsePagination(qs("pageSize=xyz")).pageSize).toBe(20);
    expect(parsePagination(qs("pageSize=1000")).pageSize).toBe(100);
    expect(parsePagination(qs("pageSize=0")).pageSize).toBe(1);
    expect(parsePagination(qs("pageSize=-5")).pageSize).toBe(1);
  });

  it("page 为 0 / 负数 → 钳到 1", () => {
    expect(parsePagination(qs("page=0")).page).toBe(1);
    expect(parsePagination(qs("page=-9")).page).toBe(1);
  });

  it("自定义参数名 / 默认值 / 上限", () => {
    const p = parsePagination(qs("p=2&size=999"), {
      pageKey: "p",
      pageSizeKey: "size",
      defaultPageSize: 10,
      maxPageSize: 50,
    });
    expect(p).toEqual({ page: 2, pageSize: 50, skip: 50, take: 50 });
    expect(parsePagination(qs(""), { defaultPage: 2, defaultPageSize: 5 })).toEqual({
      page: 2,
      pageSize: 5,
      skip: 5,
      take: 5,
    });
  });

  it("超大页码：skip 恒 ≤ MAX_SAFE_SKIP 且为安全整数", () => {
    for (const raw of ["999999999999", "9".repeat(400), "1e309"]) {
      const p = parsePagination(qs(`page=${raw}&pageSize=100`));
      expect(p.skip).toBeLessThanOrEqual(MAX_SAFE_SKIP);
      expect(Number.isSafeInteger(p.skip)).toBe(true);
    }
  });

  it("穷举畸形输入（page × pageSize 两两组合）：输出恒为有限整数且在区间内", () => {
    for (const a of HOSTILE) {
      for (const b of HOSTILE) {
        const sp = new URLSearchParams();
        sp.set("page", a);
        sp.set("pageSize", b);
        const p = parsePagination(sp, { maxPageSize: 50 });
        for (const v of [p.page, p.pageSize, p.skip, p.take]) expect(isInt(v)).toBe(true);
        expect(p.page).toBeGreaterThanOrEqual(1);
        expect(p.pageSize).toBeGreaterThanOrEqual(1);
        expect(p.pageSize).toBeLessThanOrEqual(50);
        expect(p.skip).toBeGreaterThanOrEqual(0);
        expect(p.skip).toBeLessThanOrEqual(MAX_SAFE_SKIP);
        expect(p.take).toBe(p.pageSize);
        expect(p.skip).toBe((p.page - 1) * p.pageSize);
      }
    }
  });

  it("重复参数取第一个（URLSearchParams.get 语义）", () => {
    expect(parsePagination(qs("page=2&page=abc")).page).toBe(2);
  });

  it("配置错误在调用期抛 RangeError（编程错误，不吞）", () => {
    expect(() => parsePagination(qs(""), { maxPageSize: 0 })).toThrow(RangeError);
    expect(() => parsePagination(qs(""), { defaultPageSize: 200, maxPageSize: 100 })).toThrow(RangeError);
    expect(() => parsePagination(qs(""), { defaultPage: 0 })).toThrow(RangeError);
    expect(() => parsePagination(qs(""), { minPageSize: 10, maxPageSize: 5 })).toThrow(RangeError);
    expect(() => parsePagination(qs(""), { defaultPageSize: 1.5 })).toThrow(RangeError);
  });
});

describe("parseLimit", () => {
  const opts = { defaultLimit: 20, max: 100 };
  it("缺省 / 非法 → 默认；越界 → 钳制；正常原样", () => {
    expect(parseLimit(qs(""), opts)).toBe(20);
    expect(parseLimit(qs("limit=abc"), opts)).toBe(20);
    expect(parseLimit(qs("limit=0"), opts)).toBe(1);
    expect(parseLimit(qs("limit=500"), opts)).toBe(100);
    expect(parseLimit(qs("limit=42"), opts)).toBe(42);
  });
  it("自定义 key 与 min", () => {
    expect(parseLimit(qs("n=0"), { key: "n", defaultLimit: 5, min: 0, max: 10 })).toBe(0);
  });
  it("穷举畸形输入：恒为 [min,max] 内有限整数", () => {
    for (const raw of HOSTILE) {
      const sp = new URLSearchParams();
      sp.set("limit", raw);
      const n = parseLimit(sp, opts);
      expect(isInt(n)).toBe(true);
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(100);
    }
  });
  it("配置错误抛 RangeError", () => {
    expect(() => parseLimit(qs(""), { defaultLimit: 200, max: 100 })).toThrow(RangeError);
    expect(() => parseLimit(qs(""), { defaultLimit: 5, min: 10, max: 5 })).toThrow(RangeError);
  });
});

describe("parseOptionalInt", () => {
  it("缺省 → undefined；合法 → 整数；非法 → undefined（不过滤），绝不 NaN", () => {
    expect(parseOptionalInt(qs(""), "status")).toBeUndefined();
    expect(parseOptionalInt(qs("status=1"), "status")).toBe(1);
    expect(parseOptionalInt(qs("status=0"), "status")).toBe(0);
    expect(parseOptionalInt(qs("status=abc"), "status")).toBeUndefined();
    expect(parseOptionalInt(qs("status="), "status")).toBeUndefined();
    for (const raw of HOSTILE) {
      const sp = new URLSearchParams();
      sp.set("status", raw);
      const v = parseOptionalInt(sp, "status");
      if (v !== undefined) expect(Number.isNaN(v)).toBe(false);
    }
  });
});
