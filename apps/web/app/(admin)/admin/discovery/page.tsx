// /admin/discovery —— AI 市场发现管道 + 候选管理。
import { DiscoveryPipeline } from "../../../../components/admin/DiscoveryPipeline";
import { CandidateManager } from "../../../../components/admin/CandidateManager";

export const dynamic = "force-dynamic";

export default function AdminDiscoveryPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">AI 市场发现</h1>
        <p className="mt-1 text-xs text-slate-500">
          主动发现新 AI 模型/提供商/平台，验证 API，提取价格与能力元数据。
        </p>
      </div>
      <DiscoveryPipeline />
      <div>
        <h2 className="text-base font-medium text-slate-800 mb-2">候选管理</h2>
        <CandidateManager />
      </div>
    </div>
  );
}
