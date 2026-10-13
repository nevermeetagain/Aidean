/**
 * GET /oauth/authorize — 授权码端点（M-SSO P1.3 / FOLLOWUP D2 consent 分流）。
 *
 * 流程（浏览器交互，非信封 API）：
 *   1. client/redirect_uri 白名单校验 —— **失败直接 400 文本页，绝不重定向**（防开放重定向）；
 *   2. 参数校验（response_type/scope/PKCE/state）—— 失败经 redirect_uri 以 error 码回传；
 *   3. 登录态（Cookie）—— 未登录 302 /login?redirect=<本请求完整回跳>；
 *   4. consent 分流 —— third-party 且无有效同意记录 → 302 /oauth/consent（透传授权参数）；
 *      first-party 或已有 consent → 直接进入签发；
 *   5. 签发一次性 code（60s，Redis 绑定 userId/clientId/redirectUri/challenge/nonce）
 *      → 302 redirect_uri?code=..&state=..。
 */
import { NextResponse } from "next/server";

import { prisma } from "../../../lib/db/prisma";
import { AUTH_ISSUER } from "../../../lib/features/auth/constants";
import { getSession } from "../../../lib/features/auth/session";
import { oidcClientService } from "../../../lib/features/oauth/clients";
import { issueAuthorizationCode } from "../../../lib/features/oauth/codes";

export const dynamic = "force-dynamic";

function redirectWithParams(uri: string, params: Record<string, string>): NextResponse {
  const url = new URL(uri);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return NextResponse.redirect(url);
}

function textError(status: number, message: string): Response {
  return new NextResponse(
    `<html><body style="font-family:sans-serif;padding:2rem"><h2>授权请求无效</h2><p>${message}</p></body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8" } }
  );
}

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const sp = url.searchParams;
  const clientId = sp.get("client_id") ?? "";
  const redirectUri = sp.get("redirect_uri") ?? "";
  const responseType = sp.get("response_type") ?? "";
  const state = sp.get("state") ?? "";
  const scope = sp.get("scope");
  const nonce = sp.get("nonce") ?? undefined;
  const challenge = sp.get("code_challenge") ?? undefined;
  const challengeMethod = sp.get("code_challenge_method") ?? "";

  // 1) client 与 redirect_uri：不合法 → 不重定向（防开放重定向）
  const client = await oidcClientService.getActiveClient(clientId);
  if (!client) {
    return textError(400, "未知的接入方（client_id 无效或已停用）");
  }
  if (!redirectUri || !oidcClientService.isRedirectUriAllowed(client, redirectUri)) {
    return textError(400, "redirect_uri 不在白名单内");
  }

  // 2) 参数校验：错误经 redirect_uri 回传（携带 state 防 CSRF 关联丢失）
  if (responseType !== "code") {
    return redirectWithParams(redirectUri, { error: "unsupported_response_type", state });
  }
  const scopes = oidcClientService.resolveScopes(client, scope);
  if (scopes === null) {
    return redirectWithParams(redirectUri, { error: "invalid_scope", state });
  }
  // PKCE：公共客户端强制；S256 唯一方法（plain 明确不支持）
  if (!challenge) {
    if (client.pkceRequired) {
      return redirectWithParams(redirectUri, { error: "invalid_request", error_description: "code_challenge required", state });
    }
  } else if (challengeMethod !== "S256") {
    return redirectWithParams(redirectUri, { error: "invalid_request", error_description: "only S256 supported", state });
  }
  if (!state) {
    return redirectWithParams(redirectUri, { error: "invalid_request", error_description: "state required", state });
  }

  // 3) 登录态：未登录 → 登录页（带回跳，登录后继续本授权流）
  // RC-02：origin 固定为公开基址 AUTH_ISSUER（NEXT_PUBLIC_SITE_URL 构建期注入），
  // 不依赖请求 Host 头/监听 hostname——standalone HOSTNAME=0.0.0.0 不再泄漏进 Location。
  const session = await getSession();
  if (!session) {
    const back = new URL("/oauth/authorize", AUTH_ISSUER);
    for (const [k, v] of sp.entries()) back.searchParams.set(k, v);
    return NextResponse.redirect(
      new URL(`/login?redirect=${encodeURIComponent(back.pathname + back.search)}`, AUTH_ISSUER)
    );
  }

  // 4) consent 分流（M-SSO-FOLLOWUP D2）：first-party 免同意；third-party 需用户已授权该 client+scope 面
  if (!client.firstParty) {
    const consent = await prisma.oidcUserConsent.findUnique({
      where: { userId_clientId: { userId: session.userId, clientId: client.clientId } },
    });
    const scopesChanged =
      !consent || scopes.some((s) => !consent.scopes.includes(s));
    if (scopesChanged) {
      const consentUrl = new URL("/oauth/consent", AUTH_ISSUER);
      for (const [k, v] of sp.entries()) consentUrl.searchParams.set(k, v);
      return NextResponse.redirect(consentUrl);
    }
  }

  // 5) 签发一次性 code
  try {
    const issued = await issueAuthorizationCode({
      userId: session.userId,
      clientId: client.clientId,
      redirectUri,
      scope: scopes.join(" "),
      challenge,
      nonce: nonce || undefined,
    });
    return redirectWithParams(redirectUri, { code: issued.code, state });
  } catch {
    return textError(503, "授权服务暂不可用，请稍后重试");
  }
}
