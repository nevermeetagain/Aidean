// /admin/audit-logs —— 审计日志查看（R-10 修复：页面入口缺失）。
import { AuditLogsTable } from "../../../../components/admin/AuditLogsTable";

export const dynamic = "force-dynamic";

export default function AdminAuditLogsPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">审计日志</h1>
        <p className="mt-1 text-xs text-slate-500">
          管理端所有写操作的留痕记录（INSERT/UPDATE/DELETE），支持按表名和操作类型过滤。
        </p>
      </div>
      <AuditLogsTable />
    </div>
  );
}
