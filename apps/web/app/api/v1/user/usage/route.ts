/**
 * GET /api/v1/user/usage — Token 用量与扣费明细分页（Task G.4.1）。
 *
 * requireUserApi → UsageQuerySchema 校验（page/pageSize/model/billingPath，fail→40000）
 * → gatewayService.listUsagePage（仅本人；时间倒序；quotaYuan 元字符串）。
 */
import { UsageQuerySchema } from "@aidean/shared";

import { requireUserApi } from "../../../../../lib/features/auth/session";
import { gatewayService } from "../../../../../lib/features/gateway/service";
import { ApiError, ERROR_CODES } from "../../_lib/errors";
import { withApi } from "../../_lib/handler";

export const dynamic = "force-dynamic";

export const GET = withApi(async (req: Request) => {
  const session = await requireUserApi();
  const url = new URL(req.url);
  const parsed = UsageQuerySchema.safeParse({
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
    model: url.searchParams.get("model") ?? undefined,
    billingPath: url.searchParams.get("billingPath") ?? undefined,
  });
  if (!parsed.success) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, "用量查询参数非法");
  }
  return gatewayService.listUsagePage(session.userId, parsed.data);
});
