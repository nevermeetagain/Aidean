/**
 * /api/v1/admin/intelligence/reports — 智能报告列表 + 生成。
 */
import { withApi } from "../../../_lib/handler";
import { requireAdminApi } from "../../../../../../lib/features/auth/session";
import { parseLimit, parseIntParam } from "../../../../../../lib/http/pagination";
import { ApiError, ERROR_CODES } from "../../../_lib/errors";
import { listReports, generateDailyReport } from "../../../../../../lib/intelligence/report-generator";
import { writeAudit } from "../../../_lib/audit";

export const dynamic = "force-dynamic";

export const GET = withApi(async (req: Request) => {
  await requireAdminApi("admin.intelligence.read");
  const url = new URL(req.url);
  // B11-11（Q-11-05=A / DEF-011-15）：原 `parseInt(limit ?? '30')` 在 ?limit=abc 时把 NaN 直送
  // Prisma take（500）。现非法串显式 400；合法值钳制到 [1,1000]（新增安全上限，防一次拉全表）。
  const limitRaw = url.searchParams.get("limit");
  if (limitRaw !== null && limitRaw !== "" && Number.isNaN(parseIntParam(limitRaw, Number.NaN))) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, "参数 limit 必须为整数");
  }
  const limit = parseLimit(url, { defaultLimit: 30, max: 1000 });
  return await listReports(limit);
});

export const POST = withApi(async () => {
  const session = await requireAdminApi("admin.intelligence.write");

  const report = await generateDailyReport();

  await writeAudit({
    actorId: session.userId,
    tableName: "market_snapshots",
    action: 1,
    recordId: `report_${report.reportDate}`,
    newData: report.summary,
  });

  return report;
});

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../../_lib/method-not-allowed";
export const { PUT, PATCH, DELETE, OPTIONS } = methodNotAllowed(["GET", "POST"]);
