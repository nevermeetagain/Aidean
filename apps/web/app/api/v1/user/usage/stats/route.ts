/**
 * GET /api/v1/user/usage/stats —— 用量统计聚合（WF-21 / AT-21.3，P5 报表读侧）。
 *
 * requireUserApi → UsageStatsQuerySchema 校验（range，缺省 30d，fail→40000）
 * → gatewayService.getUsageStats（仅本人；只读 usage_daily_stats 日表，禁扫 usage_logs）。
 */
import { UsageStatsQuerySchema } from "@aidean/shared";

import { requireUserApi } from "../../../../../../lib/features/auth/session";
import { gatewayService } from "../../../../../../lib/features/gateway/service";
import { ApiError, ERROR_CODES } from "../../../_lib/errors";
import { withApi } from "../../../_lib/handler";

export const dynamic = "force-dynamic";

export const GET = withApi(async (req: Request) => {
  const session = await requireUserApi();
  const url = new URL(req.url);
  const parsed = UsageStatsQuerySchema.safeParse({
    range: url.searchParams.get("range") ?? undefined,
    dateFrom: url.searchParams.get("dateFrom") ?? undefined,
    dateTo: url.searchParams.get("dateTo") ?? undefined,
  });
  if (!parsed.success) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, "统计查询参数非法");
  }
  return gatewayService.getUsageStats(session.userId, parsed.data);
});
