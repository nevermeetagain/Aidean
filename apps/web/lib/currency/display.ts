/**
 * TASK-102 · 请求级展示币种解析（U-15：中国大陆 IP → CNY，其他地区与未知 → USD）。
 *
 * - 只读部署层注入的国家头（顺序 = 047 契约 GEO_COUNTRY_HEADERS：cf-ipcountry → x-vercel-ip-country → x-geo-country），
 *   不做任何外网 GeoIP 查询；国家码 → 币种映射复用契约 `resolveDisplayCurrency`（CN → CNY，其余 USD）。
 * - 多头时取**第一个合法**（ISO 3166-1 alpha-2 两位字母）的头；非法值（空、超长、数字、"T1" 等）视为缺失，继续看下一个头。
 * - middleware 把结果写入请求头 `x-display-currency`（并覆盖客户端自带的同名头），服务端组件 / 路由经
 *   `readDisplayCurrency(headers)` 读取供 TASK-053 展示用。**只影响展示币种，不参与扣费**（扣费按账户余额币种，见 ADR-P005）。
 *
 * 本文件 Edge 安全（无 node: 依赖），可被 middleware 引入；需要 next/headers 的读取在 ./server.ts。
 */
import { GEO_COUNTRY_HEADERS, resolveDisplayCurrency, type SupportedCurrency } from "@aidean/shared";

/** middleware 写入的规范化展示币种请求头 */
export const DISPLAY_CURRENCY_HEADER = "x-display-currency";

/** 最小头读取接口：兼容 Headers / NextRequest.headers / ReadonlyHeaders / 普通对象 */
export type HeaderSource = { get(name: string): string | null } | Record<string, string | string[] | undefined>;

function getHeader(h: HeaderSource, name: string): string | null {
  if (typeof (h as { get?: unknown }).get === "function") return (h as { get(n: string): string | null }).get(name);
  const rec = h as Record<string, string | string[] | undefined>;
  const v = rec[name] ?? rec[name.toLowerCase()];
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

const ALPHA2 = /^[A-Za-z]{2}$/;

/** 按契约顺序取第一个合法国家码（大写）；全部缺失或非法 → null */
export function countryFromHeaders(h: HeaderSource): string | null {
  for (const name of GEO_COUNTRY_HEADERS) {
    const raw = getHeader(h, name)?.trim();
    if (raw && ALPHA2.test(raw)) return raw.toUpperCase();
  }
  return null;
}

/** 由国家头解析展示币种（CN → CNY；其他、缺失、非法 → USD） */
export function resolveDisplayCurrencyFromHeaders(h: HeaderSource): SupportedCurrency {
  return resolveDisplayCurrency(countryFromHeaders(h));
}

/** 解析 x-display-currency 头值；非 CNY/USD 返回 null */
export function parseDisplayCurrency(v: string | null | undefined): SupportedCurrency | null {
  const c = (v ?? "").trim().toUpperCase();
  return c === "CNY" || c === "USD" ? c : null;
}

/**
 * 读取当前请求的展示币种：优先 middleware 写入的 x-display-currency，
 * 缺失（如未经 middleware 的调用路径）则回退按国家头解析。
 */
export function readDisplayCurrency(h: HeaderSource): SupportedCurrency {
  return parseDisplayCurrency(getHeader(h, DISPLAY_CURRENCY_HEADER)) ?? resolveDisplayCurrencyFromHeaders(h);
}

/**
 * middleware 用：返回附加了展示币种头的新请求头（客户端自带的 x-display-currency 一律被覆盖，防伪造）。
 */
export function withDisplayCurrencyHeader(h: Headers): Headers {
  const next = new Headers(h);
  next.set(DISPLAY_CURRENCY_HEADER, resolveDisplayCurrencyFromHeaders(h));
  return next;
}
