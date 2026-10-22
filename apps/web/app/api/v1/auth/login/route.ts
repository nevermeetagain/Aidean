/**
 * POST /api/v1/auth/login — 邮箱密码登录并签发双令牌 Cookie（Task A.1.4 / M-SSO P0 重构）。
 * 流程：IP 限流（P0.5）→ authService.login（10003 防枚举 + 失败锁定）→ signTokenPair
 *       （RS256 + ver claims）→ refresh 落库（chainId=jti 首代）→ 种两 Cookie。
 * 失败路径：ApiError(10003/10005/10006) → withApi 转 401/403/429 信封。
 */
import {
  COOKIE_ACCESS,
  COOKIE_REFRESH,
  LOGIN_IP_RATE_LIMIT,
  LOGIN_IP_RATE_WINDOW_SECONDS,
  baseCookieOptions,
  loginRateLimitBypassed,
} from "../../../../../lib/features/auth/constants";
import { authService } from "../../../../../lib/features/auth/service";
import { signTokenPair } from "../../../../../lib/features/auth/tokens";
import { authRepository } from "../../../../../lib/features/auth/repository";
import { checkFixedWindow, clientIpFrom } from "../../../../../lib/rate-limit";
import { ApiError, ERROR_CODES } from "../../_lib/errors";
import { withApi } from "../../_lib/handler";
import { successResponse } from "../../_lib/response";

export const POST = withApi(async (req: Request) => {
  // M-SSO P0.5：IP 固定窗口限流（Redis fail-open，DB 锁定兜底）
  const ip = clientIpFrom(req);
  const rl = await checkFixedWindow(`rl:login:${ip}`, LOGIN_IP_RATE_LIMIT, LOGIN_IP_RATE_WINDOW_SECONDS);
  if (!loginRateLimitBypassed() && !rl.allowed) {
    throw new ApiError(ERROR_CODES.TOO_MANY_REQUESTS, "请求过于频繁，请稍后再试");
  }

  const payload = await req.json().catch(() => null);
  const profile = await authService.login(payload);
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
    ip,
  });

  const res = successResponse({ user: profile });
  // O-B2：maxAge 与 JWT exp-iat 对齐（同源读库 60s 缓存 fail-open），永不依赖硬编码 900/604800
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

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../_lib/method-not-allowed";
export const { GET, HEAD, PUT, PATCH, DELETE, OPTIONS } = methodNotAllowed(["POST"]);
