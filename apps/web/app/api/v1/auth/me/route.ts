/**
 * GET /api/v1/auth/me — 当前会话用户资料（Task A.1.4）。
 * 未登录/会话失效 → ApiError(10004,'会话无效或已过期') → 401 信封；
 * 已登录回 prisma 实时资料（UserProfile 形状：id/email/nickname/tier）。
 */
import { authRepository } from "../../../../../lib/features/auth/repository";
import { requireUserApi } from "../../../../../lib/features/auth/session";
import { ApiError, ERROR_CODES } from "../../_lib/errors";
import { withApi } from "../../_lib/handler";

export const dynamic = "force-dynamic";

export const GET = withApi(async () => {
  const session = await requireUserApi();
  const user = await authRepository.findUserById(session.userId);
  if (!user || user.status !== "ACTIVE") {
    throw new ApiError(ERROR_CODES.UNAUTHENTICATED, "会话无效或已过期");
  }
  return {
    user: { id: user.id, email: user.email, nickname: user.nickname, tier: user.tier },
  };
});

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../_lib/method-not-allowed";
export const { POST, PUT, PATCH, DELETE, OPTIONS } = methodNotAllowed(["GET"]);
