import { ProductsManager } from "../../../../components/admin/ProductsManager";

export const dynamic = "force-dynamic";

export default function AdminProductsPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">产品管理</h1>
        <p className="mt-1 text-xs text-slate-500">
          产品矩阵（slug/名称/徽标/权益/排序）维护；保存与上下架即时同步前台 /products。
        </p>
      </div>
      <ProductsManager />
    </div>
  );
}
