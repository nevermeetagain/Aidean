/**
 * POST /api/v1/auth/password/reset — 匿名，凭邮箱验证码重置密码（T120-20 · contracts/03b · ResetPasswordRequest）。
 * 流程：IP 限流 → emailCodeService.resetPassword（reset 键空间校验码，错满 5 次作废；
 *       同事务 哈希 + tokenVersion++ + 吊销全部 refresh）→ 审计 password.reset（不含哈希/验证码）。
 * 不自动登录：响应 {reset:true}，不签发 Cookie；全端旧令牌下一请求 401（T120-18）。
 */
import { emailCodeService } from "../../../../../../lib/features/auth/email-code";
import { checkFixedWindow, clientIpFrom } from "../../../../../../lib/rate-limit";
import { writeAudit } from "../../../_lib/audit";
import { ApiError, ERROR_CODES } from "../../../_lib/errors";
import { withApi } from "../../../_lib/handler";
import { successResponse } from "../../../_lib/response";

export const POST = withApi(async (req: Request) => {
  const ip = clientIpFrom(req);
  const rl = await checkFixedWindow(`rl:pwreset:ip:${ip}`, 10, 60);
  if (!rl.allowed) {
    throw new ApiError(ERROR_CODES.TOO_MANY_REQUESTS, "请求过于频繁，请稍后再试");
  }
  const payload = await req.json().catch(() => null);
  const { userId, tokenVersion } = await emailCodeService.resetPassword(payload);
  await writeAudit({
    actorId: userId,
    tableName: "users",
    recordId: userId,
    action: 2,
    changedFields: ["password", "tokenVersion"],
    newData: { event: "password.reset", tokenVersion },
    requestId: req.headers.get("x-request-id"),
  });
  return successResponse({ reset: true as const });
});

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../../_lib/method-not-allowed";
export const { GET, HEAD, PUT, PATCH, DELETE, OPTIONS } = methodNotAllowed(["POST"]);
