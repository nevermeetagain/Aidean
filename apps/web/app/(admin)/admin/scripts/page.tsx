// /admin/scripts —— 脚本调度管理（R-13 修复）。
import { ScriptsManager } from "../../../../components/admin/ScriptsManager";

export const dynamic = "force-dynamic";

export default function AdminScriptsPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">脚本调度</h1>
        <p className="mt-1 text-xs text-slate-500">
          管理定时脚本（模型同步、排名更新等）；支持手动触发与查看执行历史。
        </p>
      </div>
      <ScriptsManager />
    </div>
  );
}
