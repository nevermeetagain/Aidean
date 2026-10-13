import { PackagesManager } from "../../../../components/admin/PackagesManager";

export const dynamic = "force-dynamic";

export default function AdminPackagesPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">套餐管理</h1>
        <p className="mt-1 text-xs text-slate-500">
          套餐（标题/价格/有效期/权益/排序）维护与已兑换订单对账；删除时若已有码引用则自动停售。
        </p>
      </div>
      <PackagesManager />
    </div>
  );
}
