// /admin/providers —— 服务平台（ModelProvider CRUD + Offerings；UX-26 裁定 4 展示名「服务平台」）。
import { ProvidersManager } from "../../../../components/admin/ProvidersManager";

export const dynamic = "force-dynamic";

export default function AdminProvidersPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">服务平台</h1>
        <p className="mt-1 text-xs text-slate-500">
          管理平台级模型聚合商（充值比例、标价币种）及其模型挂载（上线时间、标价、可用倍率、折扣价区间）。
          与「厂商管理」的区别：厂商是模型研发方（如 OpenAI、Anthropic），服务平台是提供模型调用的聚合商 / 中转站。
        </p>
      </div>
      <ProvidersManager />
    </div>
  );
}
