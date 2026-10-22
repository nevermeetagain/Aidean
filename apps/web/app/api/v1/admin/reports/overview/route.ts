/**
 * /api/v1/admin/reports/overview — 管理端报表看板只读聚合（S8.1 / WC#7）。
 *
 * GET：requireAdminApi("admin.reports.read")（S9 B2：报表含充值收入金额，改为权限码级鉴权——
 *      仅 SUPER_ADMIN 通配 / ADMIN / 显式授予该码的自定义角色可读；MODERATOR 不持有→403，越权不泄金额）
 *      → AdminReportsQuerySchema（days 7-90，缺省 30）
 *      → usage_daily_stats 日汇总（禁扫 usage_logs 明细）+ recharge_orders(PAID) + 独立用户数
 *      → buildReportView 零填充日序列 + 分→元。仅 GET、只读，无写/删。
 */
import { prisma } from "../../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../../lib/features/auth/session";
import { buildReportView } from "../../../../../../lib/admin/reports-core";
import { ApiError, ERROR_CODES, formatZodMessage } from "../../../_lib/errors";
import { withApi } from "../../../_lib/handler";
import { AdminReportsQuerySchema } from "@aidean/shared";

export const dynamic = "force-dynamic";

export const GET = withApi(async (req: Request) => {
  await requireAdminApi("admin.reports.read");

  const url = new URL(req.url);
  const parsed = AdminReportsQuerySchema.safeParse({ days: url.searchParams.get("days") ?? undefined });
  if (!parsed.success) throw new ApiError(ERROR_CODES.BAD_REQUEST, formatZodMessage(parsed.error.issues[0]));
  const { days } = parsed.data;

  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  const [usageDaily, modelTop, rechargeRows, userGroups] = await Promise.all([
    prisma.usageDailyStat.groupBy({
      by: ["day"],
      where: { day: { gte: start, lte: end } },
      _sum: { requestCount: true, quotaMinor: true },
    }),
    prisma.usageDailyStat.groupBy({
      by: ["model"],
      where: { day: { gte: start, lte: end } },
      _sum: { requestCount: true, quotaMinor: true },
      orderBy: { _sum: { requestCount: "desc" } },
      take: 8,
    }),
    prisma.rechargeOrder.findMany({
      where: { status: "PAID", paidAt: { gte: start, lte: end } },
      select: { paidAt: true, amountMinor: true },
    }),
    prisma.usageDailyStat.groupBy({
      by: ["userId"],
      where: { day: { gte: start, lte: end } },
      _count: { _all: true },
    }),
  ]);

  return buildReportView({
    days,
    usageDaily,
    modelTop,
    rechargeRows: rechargeRows
      .filter((r) => r.paidAt != null)
      .map((r) => ({ paidAt: r.paidAt as Date, amountMinor: r.amountMinor })),
    activeUsers: userGroups.length,
    now: end,
  });
});

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../../_lib/method-not-allowed";
export const { POST, PUT, PATCH, DELETE, OPTIONS } = methodNotAllowed(["GET"]);
