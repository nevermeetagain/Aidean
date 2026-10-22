/**
 * UX-23：管理端列表「分页/筛选回写 URL query」的共用小工具（无 UI 依赖，可在 node 单测直接调用）。
 *
 * 口径：
 * - 读：服务端 page.tsx 从 searchParams 解析初值传入客户端组件（避免首帧默认值→再跳变）。
 * - 写：客户端用 history.replaceState 回写（不触发 RSC 重新请求，不新增历史记录）；
 *       默认值（page=1、空串）不写入 URL，保持「无筛选 = 干净地址」。
 */

export type SearchParamsLike =
  | Record<string, string | string[] | undefined>
  | URLSearchParams
  | null
  | undefined;

/** 取单值（数组取首项；URLSearchParams 走 get）。 */
export function pickParam(sp: SearchParamsLike, key: string): string {
  if (!sp) return "";
  if (sp instanceof URLSearchParams) return sp.get(key) ?? "";
  const v = sp[key];
  if (Array.isArray(v)) return v[0] ?? "";
  return v ?? "";
}

/** 解析正整数页码；非法/缺省回落 1（与后端分页守卫 400 口径不冲突：前端永不发非法 page）。 */
export function parsePageParam(raw: string | undefined | null): number {
  if (!raw || !/^\d{1,6}$/.test(raw)) return 1;
  const n = Number(raw);
  return n >= 1 ? n : 1;
}

/** 白名单取值：不在 allowed 内一律回落空串（防止 URL 被手改成后端会 400 的枚举）。 */
export function pickAllowed(raw: string, allowed: readonly string[]): string {
  return allowed.includes(raw) ? raw : "";
}

/**
 * 由当前列表态生成 query 串（不含 `?`）：默认值省略、键序稳定。
 * 例：buildListQuery({ page: 2, q: "gpt" }) → "page=2&q=gpt"
 */
export function buildListQuery(state: Record<string, string | number | undefined | null>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(state)) {
    if (v === undefined || v === null || v === "") continue;
    if (k === "page" && Number(v) <= 1) continue;
    params.set(k, String(v));
  }
  return params.toString();
}

/**
 * 回写到地址栏（保留与本列表无关的既有参数，如 ?tab=）。仅浏览器执行；node/SSR 下为 no-op。
 * `keys` = 本列表管理的全部参数名：先删后写，确保清空筛选时旧值被移除。
 */
export function replaceUrlQuery(
  state: Record<string, string | number | undefined | null>,
  keys: readonly string[] = Object.keys(state),
): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  for (const k of keys) url.searchParams.delete(k);
  const next = new URLSearchParams(buildListQuery(state));
  next.forEach((v, k) => url.searchParams.set(k, v));
  const target = `${url.pathname}${url.search}${url.hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (target !== current) window.history.replaceState(window.history.state, "", target);
}
