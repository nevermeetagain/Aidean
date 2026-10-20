// TASK-032 · S5 全局搜索契约单测
import { describe, expect, it } from "vitest";

import { SEARCH_TYPES, SearchHitSchema, SearchQuerySchema, SearchResponseSchema } from "../schemas/search.schema";

describe("[TASK-032] SearchQuerySchema", () => {
  it("q 去空白：前后空格被 trim 后通过", () => {
    const r = SearchQuerySchema.safeParse({ q: "  deepseek  " });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.q).toBe("deepseek");
  });

  it("q 去空白后为空：拒绝", () => {
    expect(SearchQuerySchema.safeParse({ q: "   " }).success).toBe(false);
  });

  it("q 超过 50 字：拒绝", () => {
    expect(SearchQuerySchema.safeParse({ q: "x".repeat(51) }).success).toBe(false);
  });

  it("types 缺省：默认全类型", () => {
    const r = SearchQuerySchema.safeParse({ q: "m" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.types).toEqual([...SEARCH_TYPES]);
  });

  it("types 逗号串解析为枚举数组", () => {
    const r = SearchQuerySchema.safeParse({ q: "m", types: "model,news" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.types).toEqual(["model", "news"]);
  });

  it("types 含未知值：拒绝", () => {
    expect(SearchQuerySchema.safeParse({ q: "m", types: "model,bogus" }).success).toBe(false);
  });

  it("types 空串：视为缺省 → 全类型", () => {
    const r = SearchQuerySchema.safeParse({ q: "m", types: "" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.types).toEqual([...SEARCH_TYPES]);
  });

  it("limit 缺省：默认 5", () => {
    const r = SearchQuerySchema.safeParse({ q: "m" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.limit).toBe(5);
  });

  it("limit 字符串可 coerce", () => {
    const r = SearchQuerySchema.safeParse({ q: "m", limit: "8" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.limit).toBe(8);
  });

  it("limit 上限 10：超过拒绝；下限 1：0 拒绝", () => {
    expect(SearchQuerySchema.safeParse({ q: "m", limit: 10 }).success).toBe(true);
    expect(SearchQuerySchema.safeParse({ q: "m", limit: 11 }).success).toBe(false);
    expect(SearchQuerySchema.safeParse({ q: "m", limit: 0 }).success).toBe(false);
  });
});

describe("[TASK-032] SearchHitSchema", () => {
  const okHit = { type: "model", id: "m-1", title: "DeepSeek-V3", subtitle: null, href: "/models/deepseek-v3" };

  it("合法命中通过", () => {
    expect(SearchHitSchema.safeParse(okHit).success).toBe(true);
  });

  it("subtitle 必须可空（null 通过，缺省拒绝）", () => {
    expect(SearchHitSchema.safeParse({ ...okHit, subtitle: "副标题" }).success).toBe(true);
    expect(SearchHitSchema.safeParse({ ...okHit, subtitle: undefined }).success).toBe(false);
  });

  it("href 不以 / 开头：拒绝", () => {
    expect(SearchHitSchema.safeParse({ ...okHit, href: "models/x" }).success).toBe(false);
  });

  it("type 非白名单：拒绝", () => {
    expect(SearchHitSchema.safeParse({ ...okHit, type: "doc" }).success).toBe(false);
  });
});

describe("[TASK-032] SearchResponseSchema", () => {
  it("响应信封载荷：hits 可空数组、tookMs 非负整数", () => {
    const ok = SearchResponseSchema.safeParse({ q: "m", hits: [], tookMs: 3 });
    expect(ok.success).toBe(true);
    expect(SearchResponseSchema.safeParse({ q: "m", hits: [], tookMs: -1 }).success).toBe(false);
    expect(SearchResponseSchema.safeParse({ q: "m", hits: [], tookMs: 1.5 }).success).toBe(false);
  });
});
