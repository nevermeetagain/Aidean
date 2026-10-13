// /admin/sync —— 同步管理（R-10/R-11 修复：页面入口 + 变更列表）。
import { SyncManager } from "../../../../components/admin/SyncManager";

export const dynamic = "force-dynamic";

export default function AdminSyncPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">同步管理</h1>
        <p className="mt-1 text-xs text-slate-500">
          查看同步批次状态与模型变更记录；支持回滚单条 SYNC/UPDATE 变更。
        </p>
      </div>
      <SyncManager />
    </div>
  );
}
