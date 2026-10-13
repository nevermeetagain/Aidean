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
 */
import { createRemoteJWKSet } from "jose/jwks/remote";
import { jwtVerify } from "jose/jwt/verify";
import { NextResponse, type NextRequest } from "next/server";

import { AUTH_AUDIENCE_SELF, AUTH_ISSUER, AUTH_ISSUERS_ACCEPTED, COOKIE_ACCESS } from "./lib/features/auth/constants";

const jwks = createRemoteJWKSet(new URL("/.well-known/jwks.json", AUTH_ISSUER), {
  cooldownDuration: 60_000,
});

export async function middleware(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;
  // 登录页自身放行（否则未登录访问 /admin/login 会被重定向成环）
  if (pathname === "/admin/login") {
    return NextResponse.next();
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
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/user/:path*", "/admin/:path*"],
};
