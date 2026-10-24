/**
 * middleware 登录守卫（rebuild-admin-console-and-harden-auth Phase 0）：拦截 /user/* 与 /admin/*。
 *
 * - RS256/JWKS 验签（M-SSO 0743f48 起登录签发为 RS256，HS256 旧版已不匹配）：
 *   createRemoteJWKSet 自取同源 /.well-known/jwks.json（jose 内建 kid 缓存与
 *   cooldown），Edge Runtime 兼容——不可 import lib/features/auth/keys.ts
 *   （node:crypto 与 Redis 无法进 Edge bundle）。
 * - JWKS 地址基准 = AUTH_ISSUER（NEXT_PUBLIC_SITE_URL，部署对齐 docker env），
 *   与签发侧 issuer 同源，保证自取公钥集的一致性。
 * - 验签口径与 lib/features/auth/tokens.ts 的 verifyAccess 对齐：RS256 + iss + aud，
 *   claims 须含 string sub/tier、number ver、string jti（refresh 令牌混入 access 位
 *   因缺 tier/ver 被拒）。
 * - fail-closed：JWKS 拉取失败/无 Cookie/验签任何异常 → 视为未登录重定向，不 crash。
 * - matcher 分流：/admin/* 未登录 → /admin/login（/admin/login 自身放行防重定向环）；
 *   /user/* 未登录 → /login。均携带原始路径+查询串供登录成功后回跳。
 * - TASK-102 展示币种头：所有经 middleware 放行的请求附加 `x-display-currency`（CNY/USD，按部署层国家头
 *   解析，覆盖客户端自带值；不做外网 GeoIP；只影响展示，不参与扣费）。为此 matcher 扩至站点页与 API
 *   （排除静态资源）；非 /user、/admin 路径只加头直接放行，**登录守卫逻辑与作用范围不变**。
 * - B11-06 会话提示 Cookie：所有经过 middleware 的响应按「access/refresh 令牌 Cookie 是否存在」同步一枚
 *   非 HttpOnly 的 `aidean_session_hint`（仅存在性，不含令牌内容；状态一致时不写 Set-Cookie），供客户端
 *   会话 store 在无提示时零请求判定匿名（DEF-011-08）。**不改放行/拦截判定，不改 /auth/me 契约。**
 */
import { createRemoteJWKSet } from "jose/jwks/remote";
import { jwtVerify } from "jose/jwt/verify";
import { NextResponse, type NextRequest } from "next/server";

import { AUTH_AUDIENCE_SELF, AUTH_ISSUER, AUTH_ISSUERS_ACCEPTED, COOKIE_ACCESS } from "./lib/features/auth/edge-constants";
import { COOKIE_SESSION_HINT, SESSION_HINT_ATTRS, decideSessionHint } from "./lib/features/auth/session-hint";
import { withDisplayCurrencyHeader } from "./lib/currency/display";

const jwks = createRemoteJWKSet(new URL("/.well-known/jwks.json", AUTH_ISSUER), {
  cooldownDuration: 60_000,
});

/** B11-06：按令牌 Cookie 存在性同步会话提示 Cookie（已一致则不动，不额外产生 Set-Cookie） */
function withSessionHint(req: NextRequest, res: NextResponse): NextResponse {
  const action = decideSessionHint((name) => req.cookies.get(name)?.value);
  if (action === "set") res.cookies.set(COOKIE_SESSION_HINT, "1", SESSION_HINT_ATTRS);
  else if (action === "clear") res.cookies.set(COOKIE_SESSION_HINT, "", { ...SESSION_HINT_ATTRS, maxAge: 0 });
  return res;
}

/** TASK-102：放行时附加展示币种请求头（仅新增头，不改放行/拦截判定）；B11-06 顺带同步会话提示 */
function passWithCurrency(req: NextRequest): NextResponse {
  return withSessionHint(req, NextResponse.next({ request: { headers: withDisplayCurrencyHeader(req.headers) } }));
}

/** 登录守卫作用范围（与原 matcher 一致）：/user/*、/admin/* */
function isGuardedPath(pathname: string): boolean {
  return pathname === "/user" || pathname.startsWith("/user/") || pathname === "/admin" || pathname.startsWith("/admin/");
}

export async function middleware(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;
  // TASK-102：守卫范围外（站点页 / API）只加展示币种头后放行
  if (!isGuardedPath(pathname)) {
    return passWithCurrency(req);
  }
  // 登录页自身放行（否则未登录访问 /admin/login 会被重定向成环）
  if (pathname === "/admin/login") {
    return passWithCurrency(req);
  }

  const token = req.cookies.get(COOKIE_ACCESS)?.value;
  let valid = false;
  // A-T20 fail-closed 诊断：记录最近一次验签拒绝原因（经 x-auth-guard 响应头取证——
  // Edge sandbox 生产模式吞 console.error，stderr/stdout 均不可观测，实测确认）
  let lastDeny: { code: string; iss: string | null } | null = null;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, jwks, {
        algorithms: ["RS256"],
        issuer: AUTH_ISSUERS_ACCEPTED,
        audience: AUTH_AUDIENCE_SELF,
      });
      valid =
        typeof payload.sub === "string" &&
        typeof payload.tier === "string" &&
        payload.tier.length > 0 &&
        typeof payload.ver === "number" &&
        typeof payload.jti === "string";
    } catch (e) {
      valid = false; // 签名错误/过期/kid 不匹配 → 未登录
      // A-T20 fail-closed 结构化诊断：记录被拒令牌的校验失败类别与 iss（审计/排障）
      const dbg = e as { code?: string; claims?: { iss?: string }; message?: string };
      lastDeny = { code: dbg.code ?? "unknown", iss: dbg.claims?.iss ?? null };
      console.error(
        JSON.stringify({ tag: "auth-guard", ...lastDeny }),
      );
    }
  }

  if (!valid) {
    // 未登录/无效：307 到对应登录页并携带原始路径+查询串，供登录成功后回跳
    // RC-02：base 固定公开基址 AUTH_ISSUER（构建期常量，Edge 内联），不依赖 req.url 的
    // Host 头推断——standalone HOSTNAME=0.0.0.0 不再泄漏进 Location。
    const toAdmin = pathname.startsWith("/admin");
    const url = new URL(toAdmin ? "/admin/login" : "/login", AUTH_ISSUER);
    url.searchParams.set("redirect", pathname + req.nextUrl.search);
    const res = NextResponse.redirect(url); // 默认状态码 307
    // A-T20 fail-closed 诊断头：Edge sandbox 生产模式吞 console，拒绝原因改由响应头取证
    if (lastDeny) {
      res.headers.set("x-auth-guard", JSON.stringify(lastDeny));
    }
    return withSessionHint(req, res);
  }

  return passWithCurrency(req);
}

export const config = {
  // 原守卫范围 /user、/admin 保持；TASK-102 追加其余路径（排除 _next 静态资源与带扩展名的文件）以写展示币种头
  matcher: ["/user/:path*", "/admin/:path*", "/((?!_next/static|_next/image|favicon\\.ico|.*\\.[a-zA-Z0-9]+$).*)"],
};
