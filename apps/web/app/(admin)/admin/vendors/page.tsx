// /admin/vendors —— 厂商管理（SubTask 2.3.2；UX-26 裁定 4 展示名「厂商管理」）。
import { VendorsManager } from "../../../../components/admin/VendorsManager";

export const dynamic = "force-dynamic";

export default function AdminVendorsPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">厂商管理</h1>
        <p className="mt-1 text-xs text-slate-500">
          模型研发厂商（如 OpenAI、Anthropic）的新建 / 编辑 / 删除与天梯优先级（1–99，越小越靠前）；删除为软删，不影响既有模型数据。平台聚合商 / 中转站请到「服务平台」维护。
        </p>
      </div>
      <VendorsManager />
    </div>
  );
}
