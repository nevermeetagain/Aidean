/**
 * GET/POST /oauth/consent — 第三方接入方授权同意页（M-SSO-FOLLOWUP D3）。
 *
 * GET：渲染 client 名称与申请 scopes，用户已登录（authorize 已校验）。
 * POST：确认后 upsert OidcUserConsent（scope 面覆盖检查），302 回 authorize 签发 code。
 * 拒绝：302 回 redirect_uri?error=access_denied（RFC 6749 §4.1.2.1 标准拒绝口径）。
 * 安全：POST 前重查 client 活跃性与 redirect 白名单（不信任 GET 透传参数）。
 */
import { NextResponse } from "next/server";

import { prisma } from "../../../lib/db/prisma";
import { AUTH_ISSUER } from "../../../lib/features/auth/constants";
import { getSession } from "../../../lib/features/auth/session";
import { oidcClientService } from "../../../lib/features/oauth/clients";
import { issueAuthorizationCode } from "../../../lib/features/oauth/codes";

export const dynamic = "force-dynamic";

const SCOPE_LABELS: Record<string, string> = {
  openid: "确认你的身份（用户 ID）",
  profile: "读取基本资料（邮箱、昵称）",
  "wallet:read": "读取余额与套餐信息（只读）",
  "billing:write": "在你的授权下记录消费账目",
};

/** GET 与 POST 共用的参数核验：client 活跃 + redirect 白名单 + scope 合法 */
async function resolveContext(sp: URLSearchParams) {
  const clientId = sp.get("client_id") ?? "";
  const redirectUri = sp.get("redirect_uri") ?? "";
  const scope = sp.get("scope") ?? "";
  const client = await oidcClientService.getActiveClient(clientId);
  if (!client || !oidcClientService.isRedirectUriAllowed(client, redirectUri)) {
    return null;
  }
  const scopes = oidcClientService.resolveScopes(client, scope);
  if (!scopes) return null;
  return { client, redirectUri, scopes, sp };
}

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const ctx = await resolveContext(url.searchParams);
  if (!ctx) {
    return textPage(400, "授权请求无效（接入方或回调地址未注册）");
  }
  const session = await getSession();
  if (!session) {
    // RC-02：origin 固定公开基址 AUTH_ISSUER，不依赖 Host 头（standalone 0.0.0.0 不泄漏）
    return NextResponse.redirect(
      new URL(`/login?redirect=${encodeURIComponent("/oauth/authorize?" + url.searchParams.toString())}`, AUTH_ISSUER)
    );
  }
  const rows = ctx.scopes
    .map((s) => `<li>${SCOPE_LABELS[s] ?? s} <code>${s}</code></li>`)
    .join("");
  const hidden = [...url.searchParams.entries()]
    .map(([k, v]) => `<input type="hidden" name="${k}" value="${v}">`)
    .join("");
  const html = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><title>授权确认 · Aidean</title>
<style>body{font-family:system-ui,sans-serif;background:#f8fafc;display:flex;justify-content:center;padding:4rem 1rem}
.card{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:2rem;max-width:26rem;box-shadow:0 1px 3px rgba(0,0,0,.08)}
h1{font-size:1.15rem;margin:0 0 .5rem}p{color:#475569;font-size:.9rem;line-height:1.6}
ul{padding-left:1.1rem;color:#334155;font-size:.9rem}li{margin:.4rem 0}
code{background:#f1f5f9;padding:.1rem .35rem;border-radius:4px;font-size:.8rem}
button{width:100%;padding:.65rem;border:0;border-radius:8px;font-size:.95rem;cursor:pointer;margin-top:.4rem}
.allow{background:#4f46e5;color:#fff}.deny{background:#f1f5f9;color:#334155}</style></head><body>
<div class="card"><h1>授权确认</h1>
<p><strong>${ctx.client.name}</strong>（第三方应用）请求以下权限：</p>
<ul>${rows}</ul>
<p>授权后可随时在主平台撤回。拒绝将返回该应用。</p>
<form method="POST" action="/oauth/consent">${hidden}
<button class="allow" type="submit" name="decision" value="allow">同意授权</button>
<button class="deny" type="submit" name="decision" value="deny">拒绝</button></form></div></body></html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}

export async function POST(req: Request): Promise<Response> {
  const form = new URLSearchParams(await req.text().catch(() => ""));
  const ctx = await resolveContext(form);
  if (!ctx) {
    return textPage(400, "授权请求无效");
  }
  const session = await getSession();
  if (!session) {
    return textPage(401, "登录态已失效，请重新发起授权");
  }
  const decision = form.get("decision") ?? "deny";

  if (decision !== "allow") {
    // RFC 6749 §4.1.2.1：用户拒绝 → access_denied 回传
    // （appendParams 已返回 NextResponse，不得再包一层 redirect——双重包装会把
    //   Response 对象 String 化为 "[object Response]" 抛 malformed URL，最终 503）
    return appendParams(ctx.redirectUri, { error: "access_denied", state: form.get("state") ?? "" });
  }

  await prisma.oidcUserConsent.upsert({
    where: { userId_clientId: { userId: session.userId, clientId: ctx.client.clientId } },
    update: { scopes: ctx.scopes },
    create: { userId: session.userId, clientId: ctx.client.clientId, scopes: ctx.scopes },
  });

  try {
    const issued = await issueAuthorizationCode({
      userId: session.userId,
      clientId: ctx.client.clientId,
      redirectUri: ctx.redirectUri,
      scope: ctx.scopes.join(" "),
      challenge: form.get("code_challenge") ?? undefined,
      nonce: form.get("nonce") ?? undefined,
    });
    return appendParams(ctx.redirectUri, { code: issued.code, state: form.get("state") ?? "" });
  } catch (err) {
    console.error("[oauth/consent] 授权码签发失败:", err);
    return textPage(503, "授权服务暂不可用，请稍后重试");
  }
}

function appendParams(uri: string, params: Record<string, string>): NextResponse {
  const url = new URL(uri);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return NextResponse.redirect(url);
}

function textPage(status: number, message: string): Response {
  return new Response(
    `<html><body style="font-family:sans-serif;padding:2rem"><p>${message}</p></body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8" } }
  );
}
