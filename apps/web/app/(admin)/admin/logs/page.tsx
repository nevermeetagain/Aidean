// /admin/logs —— 日志中心（restructure S5）。只读记录聚合，后端 admin.logs.read 强制；
// S9.2.1：叠加页级 RSC 守卫——无 admin.logs.read 的角色直访重定向概览（与侧栏剪枝同口径）。
import { redirect } from "next/navigation";

import { LogsBoard } from "@/components/admin/LogsBoard";
import { getSession } from "@/lib/features/auth/session";
import { getAdminPermissions, hasPermission } from "@/lib/features/auth/permissions";

export const dynamic = "force-dynamic";

export default async function AdminLogsPage() {
  const session = await getSession();
  const perms = session ? await getAdminPermissions(session.userId) : null;
  if (!session || !perms || !hasPermission(perms, "admin.logs.read")) {
    redirect("/admin?denied=logs");
  }
  return (
    <div className="mx-auto max-w-6xl space-y-4 p-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">日志中心</h1>
        <p className="mt-1 text-xs text-slate-500">
          审计、网关调用、采集同步、脚本执行与安全事件的统一只读视图。记录/账本类仅可查询与筛选，不提供新增、修改或删除。
        </p>
      </div>
      <LogsBoard />
    </div>
  );
}
