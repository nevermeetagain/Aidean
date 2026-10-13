// /admin/benchmarks —— 基准测试管理（R-10/R-15 修复：页面入口缺失）。
import { BenchmarksManager } from "../../../../components/admin/BenchmarksManager";

export const dynamic = "force-dynamic";

export default function AdminBenchmarksPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">基准测试管理</h1>
        <p className="mt-1 text-xs text-slate-500">
          录入和审核模型基准测试数据（MMLU/HumanEval 等）；verifiedStatus 控制是否参与天梯排名计算。
        </p>
      </div>
      <BenchmarksManager />
    </div>
  );
}
