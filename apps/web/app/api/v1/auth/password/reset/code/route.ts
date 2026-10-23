/**
 * POST /api/v1/auth/password/reset/code — 匿名，发送重置验证码（T120-20 · contracts/03b · ResetCodeRequest）。
 * 限流：IP 10/分钟（route 层，独立于登录发码桶）+ 同邮箱 60s/次与每日 10 封（service 层，reset 键空间）。
 * 响应恒为 {sent:true}：存在与不存在邮箱状态码与响应体一致（防枚举）。
 */
import { emailCodeService } from "../../../../../../../lib/features/auth/email-code";
import { checkFixedWindow, clientIpFrom } from "../../../../../../../lib/rate-limit";
import { ApiError, ERROR_CODES } from "../../../../_lib/errors";
import { withApi } from "../../../../_lib/handler";
import { successResponse } from "../../../../_lib/response";

export const POST = withApi(async (req: Request) => {
  const ip = clientIpFrom(req);
  const rl = await checkFixedWindow(`rl:ec:reset:ip:${ip}`, 10, 60);
  if (!rl.allowed) {
    throw new ApiError(ERROR_CODES.TOO_MANY_REQUESTS, "请求过于频繁，请稍后再试");
  }
  const payload = await req.json().catch(() => null);
  await emailCodeService.requestReset(payload);
  return successResponse({ sent: true as const });
});

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../../../_lib/method-not-allowed";
export const { GET, HEAD, PUT, PATCH, DELETE, OPTIONS } = methodNotAllowed(["POST"]);
