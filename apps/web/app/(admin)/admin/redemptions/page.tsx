import { RedemptionManager } from "../../../../components/admin/RedemptionManager";

export const dynamic = "force-dynamic";

export default function AdminRedemptionsPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">兑换码</h1>
        <p className="mt-1 text-xs text-slate-500">
          批次生成（明文一次性导出 CSV）、批次状态分布、码明细禁用与卡商密钥管理。
        </p>
      </div>
      <RedemptionManager />
    </div>
  );
}
