/**
 * /api/v1/user/custom-channels — 自定义平台渠道管理（Task G.4.1）。
 *
 * GET：本人渠道列表（apiKey 恒掩码不回显明文）；
 * POST：新建（CustomChannelUpsertSchema 校验，fail→40000）。
 * 渠道语义：自填 base_url + Key，免费纯代理不扣余额（FREE_PROXY），无限制中转。
 */
import { CustomChannelUpsertSchema } from "@aidean/shared";

import { requireUserApi } from "../../../../../lib/features/auth/session";
import { gatewayService } from "../../../../../lib/features/gateway/service";
import { ApiError, ERROR_CODES } from "../../_lib/errors";
import { withApi } from "../../_lib/handler";

export const dynamic = "force-dynamic";

export const GET = withApi(async () => {
  const session = await requireUserApi();
  return { items: await gatewayService.listChannels(session.userId) };
});

export const POST = withApi(async (req: Request) => {
  const session = await requireUserApi();
  const raw = await req.json().catch(() => null);
  const parsed = CustomChannelUpsertSchema.safeParse(raw);
  if (!parsed.success) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, "渠道参数非法（name/baseUrl/apiKey/format）");
  }
  return gatewayService.saveChannel(session.userId, parsed.data);
});
