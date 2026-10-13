/**
 * /api/v1/user/custom-channels/[id] — 单渠道更新与删除（Task G.4.1；控制台问题 3 修复）。
 *
 * PATCH：部分更新（name/baseUrl/format/isActive，apiKey 可选）——改名/启停免重填密钥；
 * PUT：全量更新（CustomChannelUpsertSchema，apiKey 必填）；
 * DELETE：删除本人渠道，0 行 → 40000。鉴权：requireUserApi。
 */
import { CustomChannelPatchSchema, CustomChannelUpsertSchema } from "@aidean/shared";

import { requireUserApi } from "../../../../../../lib/features/auth/session";
import { gatewayService } from "../../../../../../lib/features/gateway/service";
import { ApiError, ERROR_CODES } from "../../../_lib/errors";
import { withApi, type RouteContext } from "../../../_lib/handler";

export const dynamic = "force-dynamic";

export const PATCH = withApi(async (req: Request, ctx: RouteContext) => {
  const session = await requireUserApi();
  const { id } = await ctx.params;
  const raw = await req.json().catch(() => null);
  const parsed = CustomChannelPatchSchema.safeParse(raw);
  if (!parsed.success) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, "渠道部分更新参数非法（name/baseUrl/format/isActive/apiKey）");
  }
  return gatewayService.patchChannel(session.userId, id, parsed.data);
});

export const PUT = withApi(async (req: Request, ctx: RouteContext) => {
  const session = await requireUserApi();
  const { id } = await ctx.params;
  const raw = await req.json().catch(() => null);
  const parsed = CustomChannelUpsertSchema.safeParse(raw);
  if (!parsed.success) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, "渠道参数非法（name/baseUrl/apiKey/format）");
  }
  return gatewayService.saveChannel(session.userId, parsed.data, id);
});

export const DELETE = withApi(async (_req: Request, ctx: RouteContext) => {
  const session = await requireUserApi();
  const { id } = await ctx.params;
  await gatewayService.removeChannel(session.userId, id);
  return { deleted: true };
});
