// S2r（B1 裁决）：/admin/reports 独立完整报表页 —— compact 概览报表的超集，
// 预留导出 / 自定义区间 / 多维度切换的扩展位。数据经 ReportsBoard 客户端 SWR 拉 /api/v1/admin/reports/overview（只读聚合）。
// S9（B2）：报表含充值收入金额，页级 RSC 按 admin.reports.read 守卫——无此码角色（如 MODERATOR）直访重定向概览；
// 与侧栏剪枝（filterNavByPerms）、端点 requireAdminApi("admin.reports.read") 三处同口径，越权不泄金额。
import { redirect } from "next/navigation";

import { ReportsBoard } from "@/components/admin/ReportsBoard";
import { getSession } from "@/lib/features/auth/session";
import { getAdminPermissions, hasPermission } from "@/lib/features/auth/permissions";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  const session = await getSession();
  const perms = session ? await getAdminPermissions(session.userId) : null;
  if (!session || !perms || !hasPermission(perms, "admin.reports.read")) {
    redirect("/admin?denied=reports");
  }
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">运营报表</h1>
        <p className="mt-1 text-sm text-slate-500">
          网关调用与充值收入的只读聚合视图，支持近 7 / 30 / 90 天区间切换；完整看板含模型调用排行，后续可在此扩展导出与多维度切换。
        </p>
      </div>
      <ReportsBoard variant="full" />
    </div>
  );
}
