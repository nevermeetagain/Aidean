// /admin/audit-logs —— 审计日志查看（R-10 修复：页面入口缺失）。
// UX-26 裁定 3：审计唯一入口（日志中心已去掉审计 Tab）。UX-23：?page=/?tableName=/?action= 深链与刷新保持。
import {
  AUDIT_ACTION_VALUES,
  AUDIT_TABLE_VALUES,
} from "../../../../components/admin/audit-labels";
import { AuditLogsTable } from "../../../../components/admin/AuditLogsTable";
import { parsePageParam, pickAllowed, pickParam } from "../../../../components/admin/url-query";

export const dynamic = "force-dynamic";

export default async function AdminAuditLogsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">审计日志</h1>
        <p className="mt-1 text-xs text-slate-500">
          管理端所有写操作（新增 / 修改 / 删除）的留痕记录，支持按数据对象和操作类型筛选。
        </p>
      </div>
      <AuditLogsTable
        initialPage={parsePageParam(pickParam(sp, "page"))}
        initialTable={pickAllowed(pickParam(sp, "tableName"), AUDIT_TABLE_VALUES)}
        initialAction={pickAllowed(pickParam(sp, "action"), AUDIT_ACTION_VALUES)}
      />
    </div>
  );
}
