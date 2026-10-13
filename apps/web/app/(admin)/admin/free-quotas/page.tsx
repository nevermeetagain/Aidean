// /admin/free-quotas —— 免费额度配置管理（#18 L4）。
import { FreeQuotasManager } from "../../../../components/admin/FreeQuotasManager";

export const dynamic = "force-dynamic";

export default function AdminFreeQuotasPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">免费额度</h1>
        <p className="mt-1 text-xs text-slate-500">
          按账户等级（NORMAL/PRO/MAX）配置免费模型的 token 额度与刷新周期；网关 FREE 路径自动消费。
        </p>
      </div>
      <FreeQuotasManager />
    </div>
  );
}
