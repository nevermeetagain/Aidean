/**
 * 会话存在性提示 Cookie（B11-06 · DEF-011-08 · Q-11-02=B）。
 *
 * 背景：访问/刷新令牌 Cookie（`aidean_token` / `aidean_refresh`）均为 HttpOnly，浏览器脚本无法感知
 * 「是否可能已登录」，因此客户端只能每页盲探 `/api/v1/auth/me` —— 游客每页 401 红字。
 * 站点页受 ISR 约束不能在 RSC 读 `cookies()`（见 HeaderSession 注释），故由 **middleware**（能读 HttpOnly
 * Cookie）把「令牌 Cookie 是否存在」镜像成一枚**非 HttpOnly、不含任何令牌内容**的提示 Cookie：
 *
 * - 有 access 或 refresh Cookie 且提示缺失 → 写 `aidean_session_hint=1`；
 * - 二者皆无且提示仍在 → 删除提示；状态一致时不写 Set-Cookie（不污染可缓存响应）。
 *
 * 语义只有一位：「可能已登录，值得探测一次」。它**不是**鉴权凭证（伪造它只会让客户端多发一次
 * auth/me，服务端照常 401），也**不改** `/auth/me` 契约。
 *
 * 本文件须保持纯函数、零依赖：同时被 Edge middleware 与浏览器 bundle 引用。
 */

/** 提示 Cookie 名（非 HttpOnly，值恒为 "1"） */
export const COOKIE_SESSION_HINT = "aidean_session_hint";

/** 与 constants.ts 的 COOKIE_ACCESS / COOKIE_REFRESH 同值（此处复写以免把 prisma 动态 import 带进客户端 bundle；单测断言二者一致） */
export const HINT_SOURCE_COOKIES = ["aidean_token", "aidean_refresh"] as const;

/** 从 `document.cookie` 形态的字符串中判定提示是否存在 */
export function hasSessionHint(cookieString: string | null | undefined): boolean {
  if (!cookieString) return false;
  for (const part of cookieString.split(";")) {
    const eq = part.indexOf("=");
    const name = (eq === -1 ? part : part.slice(0, eq)).trim();
    if (name === COOKIE_SESSION_HINT) {
      const value = eq === -1 ? "" : part.slice(eq + 1).trim();
      return value.length > 0;
    }
  }
  return false;
}

/** 提示 Cookie 公共属性（middleware 与客户端写入口径一致：会话级、全站路径、Lax） */
export const SESSION_HINT_ATTRS = { path: "/", sameSite: "lax" as const, httpOnly: false };

/** 客户端写提示（登录成功后立即生效，不必等下一次经过 middleware 的请求） */
export function writeSessionHintCookie(doc: { cookie: string } | undefined, present: boolean): void {
  if (!doc) return;
  doc.cookie = present
    ? `${COOKIE_SESSION_HINT}=1; Path=/; SameSite=Lax`
    : `${COOKIE_SESSION_HINT}=; Path=/; SameSite=Lax; Max-Age=0`;
}

/**
 * middleware 决策：给定请求 Cookie 读取器，返回应对提示做的动作。
 * 'set' / 'clear' / null（已一致，不动）。
 */
export function decideSessionHint(getCookie: (name: string) => string | undefined): "set" | "clear" | null {
  const hasToken = HINT_SOURCE_COOKIES.some((n) => !!getCookie(n));
  const hasHint = !!getCookie(COOKIE_SESSION_HINT);
  if (hasToken && !hasHint) return "set";
  if (!hasToken && hasHint) return "clear";
  return null;
}
