import { EvaluationManager } from "../../../../components/admin/EvaluationManager";

export const dynamic = "force-dynamic";

export default function AdminEvaluationsPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">评估管理</h1>
        <p className="mt-1 text-xs text-slate-500">
          查看用户模型评估任务，包括执行状态、参与模型、结果和费用。
        </p>
      </div>
      <EvaluationManager />
    </div>
  );
}
