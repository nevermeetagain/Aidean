/**
 * POST /api/v1/auth/email/code — 发送邮箱验证码（登录方案实施手册 E-S2）。
 * 限流：IP 10/分钟（route 层）+ 同邮箱 60s/次与每日 10 封（service 层，Redis 固定窗口 fail-open）。
 * 响应恒为 {sent:true}：不暴露邮箱是否已注册（防枚举）；验证码仅经邮件/服务端日志投递。
 */
import { emailCodeService } from "../../../../../../lib/features/auth/email-code";
import { checkFixedWindow, clientIpFrom } from "../../../../../../lib/rate-limit";
import { ApiError, ERROR_CODES } from "../../../_lib/errors";
import { withApi } from "../../../_lib/handler";
import { successResponse } from "../../../_lib/response";

export const POST = withApi(async (req: Request) => {
  const ip = clientIpFrom(req);
  const rl = await checkFixedWindow(`rl:ec:ip:${ip}`, 10, 60);
  if (!rl.allowed) {
    throw new ApiError(ERROR_CODES.TOO_MANY_REQUESTS, "请求过于频繁，请稍后再试");
  }
  const payload = await req.json().catch(() => null);
  await emailCodeService.request(payload);
  return successResponse({ sent: true });
});
