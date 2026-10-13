import { PricesManager } from "@/components/admin/PricesManager";
import { getSession } from "@/lib/features/auth/session";
import { getAdminPermissions, hasPermission } from "@/lib/features/auth/permissions";

export const dynamic = "force-dynamic";

export default async function AdminPricesPage() {
  // 定价读写复用模型域（ModelPrice 隶属模型）：编辑/新建后端强制 admin.models.write，此处据此决定是否露出。
  const session = await getSession();
  const perms = session ? await getAdminPermissions(session.userId) : null;
  const canWrite = !!perms && hasPermission(perms, "admin.models.write");
  return (
    <div className="mx-auto max-w-6xl space-y-4 p-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">模型定价</h1>
        <p className="mt-1 text-xs text-slate-500">
          ModelPrice 当前价维护（与前台 /pricing 同源）：可编辑爬虫/官方价，或为尚无当前价的模型新建；保存后前台即时生效并留审计。
        </p>
      </div>
      <PricesManager canWrite={canWrite} />
    </div>
  );
}
