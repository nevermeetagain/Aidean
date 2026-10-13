/**
 * POST /api/v1/auth/email/verify — 验证码核验：登录或注册（登录方案实施手册 E-S3）。
 * 流程：IP 限流 → emailCodeService.verify（一次性消费 + 防枚举 + 未注册自动建号，
 *       与邮箱密码账号同一 User 表）→ signTokenPair（同一 JWT 体系）→ refresh 落库
 *       （chainId=jti 首代）→ 种双 Cookie（aidean_token / aidean_refresh，HttpOnly）。
 * 失败路径：10003（验证码错误或已过期，防枚举）/ 10005（禁用）/ 10006（限流/锁定）→ withApi 转信封。
 */
import { authRepository } from "../../../../../../lib/features/auth/repository";
import {
  COOKIE_ACCESS,
  COOKIE_REFRESH,
  baseCookieOptions,
} from "../../../../../../lib/features/auth/constants";
import { emailCodeService } from "../../../../../../lib/features/auth/email-code";
import { signTokenPair } from "../../../../../../lib/features/auth/tokens";
import { checkFixedWindow, clientIpFrom } from "../../../../../../lib/rate-limit";
import { ApiError, ERROR_CODES } from "../../../_lib/errors";
import { withApi } from "../../../_lib/handler";
import { successResponse } from "../../../_lib/response";

export const POST = withApi(async (req: Request) => {
  const ip = clientIpFrom(req);
  const rl = await checkFixedWindow(`rl:ec:verify:${ip}`, 20, 60);
  if (!rl.allowed) {
    throw new ApiError(ERROR_CODES.TOO_MANY_REQUESTS, "请求过于频繁，请稍后再试");
  }
  const payload = await req.json().catch(() => null);
  const profile = await emailCodeService.verify(payload);
  const pair = await signTokenPair(profile);

  // M-SSO P0.3：refresh 落库（首代：chainId = 自身 jti），与密码登录同口径
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
