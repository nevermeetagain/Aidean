/**
 * POST /oauth/token — 授权码换取令牌（M-SSO P1.4）。
 *
 * 安全部约：
 * - client 认证：HTTP Basic（优先）或 form body 的 client_secret，bcrypt 恒时比对；
 * - code **一次性**（Redis GETDEL 原子消费）：重放/过期/不存在统一 invalid_grant；
 * - redirect_uri / code_verifier 与签发载荷逐字段复核；
 * - 响应禁缓存（token/secret 不入任何中间层）；
 * - id_token 含 nonce 透传（防重放关联）；aud=clientId 令牌隔离。
 */
import { NextResponse } from "next/server";
import { SignJWT } from "jose";

import { authRepository } from "../../../lib/features/auth/repository";
import {
  ACCESS_TTL_SECONDS,
  AUTH_ISSUER,
  REFRESH_TTL_SECONDS,
} from "../../../lib/features/auth/constants";
import { getCurrentKid, getSigningKey } from "../../../lib/features/auth/keys";
import { signTokenPair, verifyRefresh } from "../../../lib/features/auth/tokens";
import { oidcClientService } from "../../../lib/features/oauth/clients";
import { consumeAuthorizationCode, verifyPkce } from "../../../lib/features/oauth/codes";

export const dynamic = "force-dynamic";

const NO_STORE = { "cache-control": "no-store", pragma: "no-cache" };

function oauthError(status: number, error: string, description?: string): Response {
  return NextResponse.json(
    { error, error_description: description },
    { status, headers: NO_STORE }
  );
}

/** client 认证：Basic 头优先，回退 form 字段 */
async function readClientCredentials(
  req: Request,
  form: URLSearchParams
): Promise<{ clientId: string; clientSecret: string } | null> {
  const basic = req.headers.get("authorization");
  if (basic?.startsWith("Basic ")) {
    try {
      const decoded = atob(basic.slice(6));
      const idx = decoded.indexOf(":");
      if (idx > 0) {
        return { clientId: decoded.slice(0, idx), clientSecret: decoded.slice(idx + 1) };
      }
    } catch {
      return null;
    }
  }
  const clientId = form.get("client_id");
  const clientSecret = form.get("client_secret");
  if (clientId && clientSecret) {
    return { clientId, clientSecret };
  }
  return null;
}

export async function POST(req: Request): Promise<Response> {
  const form = new URLSearchParams(await req.text().catch(() => ""));
  const grantType = form.get("grant_type") ?? "";
  if (grantType === "refresh_token") {
    return handleRefreshGrant(req, form);
  }
  if (grantType !== "authorization_code") {
    return oauthError(400, "unsupported_grant_type");
  }
  return handleAuthorizationCodeGrant(req, form);
}

/** grant_type=refresh_token：轮换链消费（含重放检测）→ 签发新代 */
async function handleRefreshGrant(req: Request, form: URLSearchParams): Promise<Response> {
  const creds = await readClientCredentials(req, form);
  if (!creds) {
    return oauthError(401, "invalid_client");
  }
  const client = await oidcClientService.getActiveClient(creds.clientId);
  if (!client || !oidcClientService.verifyClientSecret(client, creds.clientSecret)) {
    return oauthError(401, "invalid_client");
  }
  const oldToken = form.get("refresh_token") ?? "";
  const claims = await verifyRefresh(oldToken, { audience: client.clientId });
  if (!claims || claims.clientId !== client.clientId) {
    return oauthError(400, "invalid_grant", "refresh token invalid for this client");
  }
  const consumed = await authRepository.consumeRefreshToken(claims.jti, new Date());
  if (consumed.kind !== "ok") {
    return oauthError(400, "invalid_grant", "refresh token revoked or replayed");
  }
  const user = await authRepository.findUserById(claims.userId);
  if (!user || user.status !== "ACTIVE" || user.tokenVersion !== claims.ver) {
    await authRepository.revokeRefreshChain(consumed.record.chainId);
    return oauthError(400, "invalid_grant", "user unavailable or tokens rotated");
  }
  const pair = await signTokenPair(
    { id: user.id, tier: user.tier, tokenVersion: user.tokenVersion },
    { audience: client.clientId, clientId: client.clientId }
  );
  await authRepository.createRefreshTokenRecord({
    jti: pair.refreshJti,
    userId: user.id,
    clientId: client.clientId,
    chainId: consumed.record.chainId,
    rotatedFrom: claims.jti,
    expiresAt: pair.refreshExpiresAt,
    userAgent: req.headers.get("user-agent"),
    ip: req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
  });
  return NextResponse.json(
    {
      access_token: pair.accessToken,
      token_type: "Bearer",
      expires_in: ACCESS_TTL_SECONDS,
      refresh_token: pair.refreshToken,
      id_token: await buildIdToken({ userId: user.id }, user, client.clientId),
      scope: client.scopes.join(" "),
    },
    { headers: NO_STORE }
  );
}

/** grant_type=authorization_code：code 一次性消费 → 签发对 */
async function handleAuthorizationCodeGrant(req: Request, form: URLSearchParams): Promise<Response> {
  const code = form.get("code") ?? "";
  const redirectUri = form.get("redirect_uri") ?? "";
  const verifier = form.get("code_verifier") ?? undefined;

  const creds = await readClientCredentials(req, form);
  if (!creds) {
    return oauthError(401, "invalid_client");
  }
  const client = await oidcClientService.getActiveClient(creds.clientId);
  if (!client || !oidcClientService.verifyClientSecret(client, creds.clientSecret)) {
    return oauthError(401, "invalid_client");
  }

  const consumed = await consumeAuthorizationCode(code);
  if (consumed.kind !== "ok") {
    return oauthError(400, "invalid_grant", "code invalid, expired or already used");
  }
  const payload = consumed.payload;

  // 绑定复核：code 只能被签发对象在原 redirect_uri 下兑换
  if (payload.clientId !== client.clientId || payload.redirectUri !== redirectUri) {
    return oauthError(400, "invalid_grant", "redirect_uri mismatch");
  }
  // PKCE：签发时带 challenge 则兑换必须提供可验证 verifier
  if (payload.challenge) {
    if (!verifier || !verifyPkce(verifier, payload.challenge)) {
      return oauthError(400, "invalid_grant", "PKCE verification failed");
    }
  } else if (client.pkceRequired) {
    return oauthError(400, "invalid_grant", "PKCE required by client policy");
  }

  const user = await authRepository.findUserById(payload.userId);
  if (!user || user.status !== "ACTIVE") {
    return oauthError(400, "invalid_grant", "user unavailable");
  }

  const pair = await signTokenPair(
    { id: user.id, tier: user.tier, tokenVersion: user.tokenVersion },
    { audience: client.clientId, clientId: client.clientId }
  );
  await authRepository.createRefreshTokenRecord({
    jti: pair.refreshJti,
    userId: user.id,
    clientId: client.clientId,
    chainId: pair.refreshJti,
    rotatedFrom: null,
    expiresAt: pair.refreshExpiresAt,
    userAgent: req.headers.get("user-agent"),
    ip: req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
  });

  return NextResponse.json(
    {
      access_token: pair.accessToken,
      token_type: "Bearer",
      expires_in: ACCESS_TTL_SECONDS,
      refresh_token: pair.refreshToken,
      refresh_expires_in: REFRESH_TTL_SECONDS,
      id_token: await buildIdToken(payload, user, client.clientId),
      scope: payload.scope,
    },
    { headers: NO_STORE }
  );
}

/** id_token 签发：同 RS256 私钥（同一 kid），aud=clientId，nonce 透传 */
async function buildIdToken(
  payload: { nonce?: string; userId: string },
  user: { id: string; email: string; nickname: string | null; tier: string; tokenVersion: number },
  clientId: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({
    email: user.email,
    nickname: user.nickname,
    tier: user.tier,
    ver: user.tokenVersion,
    ...(payload.nonce ? { nonce: payload.nonce } : {}),
  })
    .setProtectedHeader({ alg: "RS256", kid: await getCurrentKid() })
    .setSubject(user.id)
    .setIssuedAt(now)
    .setIssuer(AUTH_ISSUER)
    .setAudience(clientId)
    .setExpirationTime(now + ACCESS_TTL_SECONDS)
    .sign(await getSigningKey());
}
