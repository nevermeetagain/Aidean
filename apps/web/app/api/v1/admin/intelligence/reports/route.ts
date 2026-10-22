/**
 * /api/v1/admin/intelligence/reports — 智能报告列表 + 生成。
 */
import { withApi } from "../../../_lib/handler";
import { requireAdminApi } from "../../../../../../lib/features/auth/session";
import { listReports, generateDailyReport } from "../../../../../../lib/intelligence/report-generator";
import { writeAudit } from "../../../_lib/audit";

export const dynamic = "force-dynamic";

export const GET = withApi(async (req: Request) => {
  await requireAdminApi("admin.intelligence.read");
  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get("limit") ?? "30", 10);
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
