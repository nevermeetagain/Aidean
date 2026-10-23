/**
 * POST /api/v1/auth/password — 已登录改密（T120-19 · contracts/03b · ChangePasswordRequest）。
 * 流程：requireUserApi（10004/10005）→ 登录同桶 IP 限流（rl:login:{ip}，超限 10006/429）
 *       → authService.changePassword（旧密错 10003；新密弱/同旧密 40000；同事务 哈希 + ver++ + 吊销全部 refresh）
 *       → 为当前设备签发新令牌对并落库 refresh → 种两 Cookie → 审计 password.change（不记哈希）。
 * 效果：其他设备的 access 下一请求即 401（T120-18 ver 比对），refresh 已整体吊销。
 */
import {
  COOKIE_ACCESS,
  COOKIE_REFRESH,
  LOGIN_IP_RATE_LIMIT,
  LOGIN_IP_RATE_WINDOW_SECONDS,
  baseCookieOptions,
  loginRateLimitBypassed,
} from "../../../../../lib/features/auth/constants";
import { authRepository } from "../../../../../lib/features/auth/repository";
import { authService } from "../../../../../lib/features/auth/service";
import { requireUserApi } from "../../../../../lib/features/auth/session";
import { signTokenPair } from "../../../../../lib/features/auth/tokens";
import { checkFixedWindow, clientIpFrom } from "../../../../../lib/rate-limit";
import { writeAudit } from "../../_lib/audit";
import { ApiError, ERROR_CODES } from "../../_lib/errors";
import { withApi } from "../../_lib/handler";
import { successResponse } from "../../_lib/response";

export const POST = withApi(async (req: Request) => {
  const session = await requireUserApi();

  // 旧密尝试与登录共用 IP 限流桶（防借改密接口暴力猜旧密）
  const ip = clientIpFrom(req);
  const rl = await checkFixedWindow(`rl:login:${ip}`, LOGIN_IP_RATE_LIMIT, LOGIN_IP_RATE_WINDOW_SECONDS);
  if (!loginRateLimitBypassed() && !rl.allowed) {
    throw new ApiError(ERROR_CODES.TOO_MANY_REQUESTS, "请求过于频繁，请稍后再试");
  }

  const payload = await req.json().catch(() => null);
  const profile = await authService.changePassword(session.userId, payload);

  const pair = await signTokenPair(profile);
  await authRepository.createRefreshTokenRecord({
    jti: pair.refreshJti,
    userId: profile.id,
    clientId: null,
    chainId: pair.refreshJti,
    rotatedFrom: null,
    expiresAt: pair.refreshExpiresAt,
    userAgent: req.headers.get("user-agent"),
    ip,
  });

  await writeAudit({
    actorId: profile.id,
    tableName: "users",
    recordId: profile.id,
    action: 2,
    changedFields: ["password", "tokenVersion"],
    newData: { event: "password.change", tokenVersion: profile.tokenVersion },
    requestId: req.headers.get("x-request-id"),
  });

  const res = successResponse({ changed: true as const });
  res.cookies.set(COOKIE_ACCESS, pair.accessToken, { ...baseCookieOptions(), maxAge: pair.accessTtlSeconds });
  res.cookies.set(COOKIE_REFRESH, pair.refreshToken, { ...baseCookieOptions(), maxAge: pair.refreshTtlSeconds });
  return res;
});

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../_lib/method-not-allowed";
export const { GET, HEAD, PUT, PATCH, DELETE, OPTIONS } = methodNotAllowed(["POST"]);
