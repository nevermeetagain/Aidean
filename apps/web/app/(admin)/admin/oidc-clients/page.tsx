import { OidcClientsManager } from "@/components/admin/OidcClientsManager";
import { getSession } from "@/lib/features/auth/session";
import { getAdminPermissions, hasPermission } from "@/lib/features/auth/permissions";

export const dynamic = "force-dynamic";

export default async function AdminOidcClientsPage() {
  // OIDC 客户端读写复用配置域（与 ranking-weights 同域）：编辑元数据后端强制 admin.configs.write。
  // secret 由 seed/env 供用，本页不提供发放/展示（尊重既有安全设计）。
  const session = await getSession();
  const perms = session ? await getAdminPermissions(session.userId) : null;
  const canWrite = !!perms && hasPermission(perms, "admin.configs.write");
  return (
    <div className="mx-auto max-w-6xl space-y-4 p-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">OIDC 客户端</h1>
        <p className="mt-1 text-xs text-slate-500">
          平台 SSO 应用管理：编辑名称、回调地址、授权范围与启停；密钥不经此页发放或回显（由部署环境变量提供）。停用即时使该客户端不可登录。
        </p>
      </div>
      <OidcClientsManager canWrite={canWrite} />
    </div>
  );
}
