import { OrdersManager } from "@/components/admin/OrdersManager";
import { getSession } from "@/lib/features/auth/session";
import { getAdminPermissions, hasPermission } from "@/lib/features/auth/permissions";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  // 处置能力（关单/标异常/冲正）后端逐接口强制 admin.orders.write；此处仅据此决定是否露出动作列。
  const session = await getSession();
  const perms = session ? await getAdminPermissions(session.userId) : null;
  const canWrite = !!perms && hasPermission(perms, "admin.orders.write");
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <h1 className="text-xl font-semibold text-slate-800">订单与流水</h1>
      <p className="-mt-2 text-xs text-slate-500">
        账本类记录只读，不可删除/改写；处置动作（关单 / 标异常 / 冲正）生成状态变更或反向冲正分录并记审计。
      </p>
      <OrdersManager canWrite={canWrite} />
    </div>
  );
}
