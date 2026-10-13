/**
 * POST /api/v1/auth/refresh — 刷新令牌轮换（Task A.1.4 / M-SSO P0.3 重构）。
 *
 * 轮换链流程（持久化语义）：
 *   1. 读 COOKIE_REFRESH → verifyRefresh（RS256 纯 JWT 验签）；
 *   2. consumeRefreshToken(jti)：查库三态——
 *      invalid（不存在/过期）/ revoked（链已撤销）→ 10004；
 *      **replayed（已轮换代被复用 = 重放攻击）→ 整链撤销 + 10004（安全事件口径）**；
 *      ok → 本代标记 rotatedAt，携带链锚点；
 *   3. 查库回填最新 tier/status/tokenVersion —— ver 不匹配 = 改密/封号后旧链，拒绝并撤链；
 *      用户已删除/停用同理拒绝；
 *   4. signTokenPair 签发新代（chainId 继承、rotatedFrom=旧 jti）→ 落库 → 种新 Cookie。
 * 失败路径：抛 ApiError(10004) → withApi 转 401 信封（body.code=10004）。
 */
import { cookies } from "next/headers";

import { authRepository } from "../../../../../lib/features/auth/repository";
import {
  COOKIE_ACCESS,
  COOKIE_REFRESH,
  baseCookieOptions,
} from "../../../../../lib/features/auth/constants";
import {
  signTokenPair,
  verifyRefresh,
} from "../../../../../lib/features/auth/tokens";
import { ApiError, ERROR_CODES } from "../../_lib/errors";
import { withApi } from "../../_lib/handler";
import { successResponse } from "../../_lib/response";

export const POST = withApi(async () => {
  const cookieStore = await cookies();
  const oldToken = cookieStore.get(COOKIE_REFRESH)?.value;
  if (!oldToken) {
    throw new ApiError(ERROR_CODES.UNAUTHENTICATED, "刷新令牌无效或已过期");
  }

  const claims = await verifyRefresh(oldToken);
  if (!claims) {
    throw new ApiError(ERROR_CODES.UNAUTHENTICATED, "刷新令牌无效或已过期");
  }

  // 持久化消费：重放检测命中时整链已撤销（安全事件口径，统一 401 不泄露细节）
  const consumed = await authRepository.consumeRefreshToken(claims.jti, new Date());
  if (consumed.kind !== "ok") {
    throw new ApiError(ERROR_CODES.UNAUTHENTICATED, "刷新令牌无效或已过期");
  }

  // 查库回填：轮换必须携带用户当前 tier/tokenVersion；已删除/停用拒绝并撤链
  const user = await authRepository.findUserById(claims.userId);
  if (!user || user.status !== "ACTIVE" || user.tokenVersion !== claims.ver) {
    await authRepository.revokeRefreshChain(consumed.record.chainId);
    throw new ApiError(ERROR_CODES.UNAUTHENTICATED, "刷新令牌无效或已过期");
  }

  const profile = {
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    tier: user.tier,
  };
  // 新代签发：chainId 继承、aud/clientId 与旧代一致（防跨 client 套利）
  const pair = await signTokenPair(
    { ...profile, tokenVersion: user.tokenVersion },
    { clientId: consumed.record.clientId ?? undefined }
  );
  await authRepository.createRefreshTokenRecord({
    jti: pair.refreshJti,
    userId: user.id,
    clientId: consumed.record.clientId,
    chainId: consumed.record.chainId,
    rotatedFrom: claims.jti,
    expiresAt: pair.refreshExpiresAt,
    userAgent: null,
    ip: null,
  });

  const res = successResponse({ user: profile });
  // O-B2：maxAge 与 JWT exp-iat 对齐（同源读库 60s 缓存 fail-open）
  res.cookies.set(COOKIE_ACCESS, pair.accessToken, {
    ...baseCookieOptions(),
    maxAge: pair.accessTtlSeconds,
  });
  res.cookies.set(COOKIE_REFRESH, pair.refreshToken, {
    ...baseCookieOptions(),
    maxAge: pair.refreshTtlSeconds,
  });
  return res;
});
