/**
 * TASK-102 · 展示币种解析单测：CN / US / JP / 缺头 / 非法值 / 多头优先级 / 防伪造覆盖 / middleware 接线。
 */
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import {
  DISPLAY_CURRENCY_HEADER,
  countryFromHeaders,
  readDisplayCurrency,
  resolveDisplayCurrencyFromHeaders,
  withDisplayCurrencyHeader,
} from "../index";

const h = (init: Record<string, string>) => new Headers(init);

describe("resolveDisplayCurrencyFromHeaders", () => {
  it("CN → CNY（cf-ipcountry）", () => {
    expect(resolveDisplayCurrencyFromHeaders(h({ "cf-ipcountry": "CN" }))).toBe("CNY");
  });

  it("小写 cn 同样 → CNY（x-vercel-ip-country）", () => {
    expect(resolveDisplayCurrencyFromHeaders(h({ "x-vercel-ip-country": "cn" }))).toBe("CNY");
  });

  it("US → USD", () => {
    expect(resolveDisplayCurrencyFromHeaders(h({ "cf-ipcountry": "US" }))).toBe("USD");
  });

  it("JP → USD（其他地区）；HK/TW 亦按契约 → USD", () => {
    expect(resolveDisplayCurrencyFromHeaders(h({ "x-geo-country": "JP" }))).toBe("USD");
    expect(resolveDisplayCurrencyFromHeaders(h({ "cf-ipcountry": "HK" }))).toBe("USD");
    expect(resolveDisplayCurrencyFromHeaders(h({ "cf-ipcountry": "TW" }))).toBe("USD");
  });

  it("缺头 → USD", () => {
    expect(resolveDisplayCurrencyFromHeaders(h({}))).toBe("USD");
    expect(countryFromHeaders(h({}))).toBeNull();
  });

  it("非法值（T1/空/数字/超长/XX 未知）→ 视为缺失 → USD", () => {
    for (const v of ["T1", "", "  ", "86", "CHN", "C"]) {
      expect(resolveDisplayCurrencyFromHeaders(h({ "cf-ipcountry": v }))).toBe("USD");
    }
    expect(resolveDisplayCurrencyFromHeaders(h({ "cf-ipcountry": "XX" }))).toBe("USD");
    // 非 ASCII（Headers 不允许，普通对象形态可能出现）
    expect(resolveDisplayCurrencyFromHeaders({ "cf-ipcountry": "中国" })).toBe("USD");
  });

  it("多头优先级：cf-ipcountry > x-vercel-ip-country > x-geo-country", () => {
    expect(resolveDisplayCurrencyFromHeaders(h({ "cf-ipcountry": "US", "x-vercel-ip-country": "CN", "x-geo-country": "CN" }))).toBe("USD");
    expect(resolveDisplayCurrencyFromHeaders(h({ "x-vercel-ip-country": "CN", "x-geo-country": "US" }))).toBe("CNY");
    expect(resolveDisplayCurrencyFromHeaders(h({ "x-geo-country": "CN" }))).toBe("CNY");
  });

  it("高优先级头非法时回落下一个合法头", () => {
    expect(countryFromHeaders(h({ "cf-ipcountry": "T1", "x-vercel-ip-country": "CN" }))).toBe("CN");
    expect(resolveDisplayCurrencyFromHeaders(h({ "cf-ipcountry": "T1", "x-vercel-ip-country": "CN" }))).toBe("CNY");
  });

  it("支持普通对象头（Node IncomingHttpHeaders 形态）", () => {
    expect(resolveDisplayCurrencyFromHeaders({ "cf-ipcountry": "CN" })).toBe("CNY");
    expect(resolveDisplayCurrencyFromHeaders({ "x-geo-country": ["CN", "US"] })).toBe("CNY");
  });
});

describe("readDisplayCurrency / withDisplayCurrencyHeader", () => {
  it("优先读 middleware 写入的 x-display-currency", () => {
    expect(readDisplayCurrency(h({ [DISPLAY_CURRENCY_HEADER]: "CNY", "cf-ipcountry": "US" }))).toBe("CNY");
  });

  it("x-display-currency 缺失或非法时回退国家头", () => {
    expect(readDisplayCurrency(h({ "cf-ipcountry": "CN" }))).toBe("CNY");
    expect(readDisplayCurrency(h({ [DISPLAY_CURRENCY_HEADER]: "EUR", "cf-ipcountry": "CN" }))).toBe("CNY");
  });

  it("withDisplayCurrencyHeader 覆盖客户端伪造的 x-display-currency", () => {
    const out = withDisplayCurrencyHeader(h({ [DISPLAY_CURRENCY_HEADER]: "CNY", "cf-ipcountry": "US", cookie: "a=1" }));
    expect(out.get(DISPLAY_CURRENCY_HEADER)).toBe("USD");
    expect(out.get("cookie")).toBe("a=1");
  });
});

describe("middleware 接线（站点页只加币种头，不触发登录守卫）", () => {
  it("/pricing：放行（200 next），并以 x-middleware-request-x-display-currency 下发 CNY", async () => {
    process.env.NEXT_PUBLIC_SITE_URL ??= "http://localhost:3000";
    const { middleware } = await import("../../../middleware");
    const res = await middleware(new NextRequest("http://localhost:3000/pricing", { headers: { "cf-ipcountry": "CN" } }));
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
    expect(res.headers.get(`x-middleware-request-${DISPLAY_CURRENCY_HEADER}`)).toBe("CNY");
  });

  it("/models/x：境外 → USD；客户端伪造头被覆盖", async () => {
    const { middleware } = await import("../../../middleware");
    const res = await middleware(
      new NextRequest("http://localhost:3000/models/gpt-4o", { headers: { "x-vercel-ip-country": "JP", [DISPLAY_CURRENCY_HEADER]: "CNY" } }),
    );
    expect(res.headers.get(`x-middleware-request-${DISPLAY_CURRENCY_HEADER}`)).toBe("USD");
  });

  it("/user/* 未登录仍 307 → /login（登录守卫逻辑不变）", async () => {
    const { middleware } = await import("../../../middleware");
    const res = await middleware(new NextRequest("http://localhost:3000/user/balance", { headers: { "cf-ipcountry": "CN" } }));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
  });
});
