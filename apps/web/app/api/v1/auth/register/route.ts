/**
 * POST /api/v1/auth/register — 注册并签发双令牌 Cookie（Task A.1.4 / M-SSO P0 重构）。
 * 流程：shared RegisterSchema 校验 → authService.register（users+wallets 事务同建）
 *       → signTokenPair（RS256 + ver claims）→ refresh 落库（首代）→ 种两 HttpOnly Cookie。
 */
import {
  COOKIE_ACCESS,
  COOKIE_REFRESH,
  baseCookieOptions,
} from "../../../../../lib/features/auth/constants";
import { authService } from "../../../../../lib/features/auth/service";
import { signTokenPair } from "../../../../../lib/features/auth/tokens";
import { authRepository } from "../../../../../lib/features/auth/repository";
import { clientIpFrom } from "../../../../../lib/rate-limit";
import { withApi } from "../../_lib/handler";
import { successResponse } from "../../_lib/response";

export const POST = withApi(async (req: Request) => {
  const payload = await req.json().catch(() => null);
  const profile = await authService.register(payload);
  const pair = await signTokenPair(profile);

  // M-SSO P0.3：refresh 落库（首代：chainId = 自身 jti）
  const userAgent = req.headers.get("user-agent");
  await authRepository.createRefreshTokenRecord({
    jti: pair.refreshJti,
    userId: profile.id,
    clientId: null,
    chainId: pair.refreshJti,
    rotatedFrom: null,
    expiresAt: pair.refreshExpiresAt,
    userAgent,
    ip: clientIpFrom(req),
  });

  const res = successResponse({ user: profile });
  // B-03：maxAge 与 JWT exp-iat 对齐（同源读库 60s 缓存 fail-open），与 login/refresh 同式
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
