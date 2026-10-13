// /admin/vendors —— 提供商管理（SubTask 2.3.2）。
import { VendorsManager } from "../../../../components/admin/VendorsManager";

export const dynamic = "force-dynamic";

export default function AdminVendorsPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">提供商管理</h1>
        <p className="mt-1 text-xs text-slate-500">
          厂商新建/编辑/软删与天梯优先级（1-99，越小越贴近性能轴）；软删不影响既有模型数据。
        </p>
      </div>
      <VendorsManager />
    </div>
  );
}
