/**
 * GET /api/v1/user/usage/breakdown —— 消耗多维明细（问题 4：渠道×模型×计费路径）。
 *
 * requireUserApi → UsageBreakdownQuerySchema 校验（range 或 dateFrom+dateTo，≤92 天，fail→40000）
 * → gatewayService.getUsageBreakdown（仅本人；走 usage_logs 有界 groupBy，来源解析站点/渠道名）。
 */
import { UsageBreakdownQuerySchema } from "@aidean/shared";

import { requireUserApi } from "../../../../../../lib/features/auth/session";
import { gatewayService } from "../../../../../../lib/features/gateway/service";
import { ApiError, ERROR_CODES } from "../../../_lib/errors";
import { withApi } from "../../../_lib/handler";

export const dynamic = "force-dynamic";

export const GET = withApi(async (req: Request) => {
  const session = await requireUserApi();
  const url = new URL(req.url);
  const parsed = UsageBreakdownQuerySchema.safeParse({
    range: url.searchParams.get("range") ?? undefined,
    dateFrom: url.searchParams.get("dateFrom") ?? undefined,
    dateTo: url.searchParams.get("dateTo") ?? undefined,
  });
  if (!parsed.success) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, "消耗明细查询参数非法");
  }
  return gatewayService.getUsageBreakdown(session.userId, parsed.data);
});

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../../_lib/method-not-allowed";
export const { POST, PUT, PATCH, DELETE, OPTIONS } = methodNotAllowed(["GET"]);
