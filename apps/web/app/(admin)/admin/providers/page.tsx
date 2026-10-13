// /admin/providers —— 模型提供商管理（ModelProvider CRUD + Offerings）。
import { ProvidersManager } from "../../../../components/admin/ProvidersManager";

export const dynamic = "force-dynamic";

export default function AdminProvidersPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">模型提供商</h1>
        <p className="mt-1 text-xs text-slate-500">
          管理平台级模型聚合商（充值比例、标价币种）及其模型挂载（上线时间、标价、可用倍率、折扣价区间）。
          与「提供商管理」（厂商 Vendor）的区别：Vendor 是模型研发方（OpenAI/Anthropic），ModelProvider 是平台聚合商/中转站。
        </p>
      </div>
      <ProvidersManager />
    </div>
  );
}
