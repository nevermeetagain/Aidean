// /admin/intelligence —— 智能仪表盘（市场快照 + 每日报告 + 变更检测）。
import { IntelligenceDashboard } from "../../../../components/admin/IntelligenceDashboard";

export const dynamic = "force-dynamic";

export default function AdminIntelligencePage() {
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">智能仪表盘</h1>
        <p className="mt-1 text-xs text-slate-500">
          市场快照、每日智能报告、变更事件流与趋势分析。
        </p>
      </div>
      <IntelligenceDashboard />
    </div>
  );
}
