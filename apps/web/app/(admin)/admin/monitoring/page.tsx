import { MonitoringPanel } from "@/components/admin/monitoring/MonitoringPanel";
import { getSession } from "@/lib/features/auth/session";
import { getAdminPermissions, hasPermission } from "@/lib/features/auth/permissions";

export const dynamic = "force-dynamic";

export default async function AdminMonitoringPage() {
  // 读权限决定能否进入监控视图；写权限只控制启停与手动运行（后端 admin.sync.* 兜底）。
  const session = await getSession();
  const perms = session ? await getAdminPermissions(session.userId) : null;
  const canRead = !!perms && hasPermission(perms, "admin.sync.read");
  const canWrite = !!perms && hasPermission(perms, "admin.sync.write");
  return (
    <div className="mx-auto max-w-6xl space-y-4 p-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">模型源监控</h1>
        <p className="mt-1 text-xs text-slate-500">
          监控源分级与最近运行状态、目录变更流（上架/下架/首次发现/价格变更）。启停与手动运行需「同步管理-写」权限；分级为来源可靠性分级，而非实测可用率承诺。
        </p>
      </div>
      <MonitoringPanel canRead={canRead} canWrite={canWrite} />
    </div>
  );
}
