// /admin/roles —— 角色权限管理（restructure-admin-nav-rbac-cms S3.5 · A2+B2）。
// 敏感入口：后端 admin.roles.* 仅 SUPER_ADMIN 持有；此处再叠加 RSC 守卫，直连 URL 亦拦截回后台首页。
import { redirect } from "next/navigation";

import { RolesManager } from "../../../../components/admin/RolesManager";
import { getSession } from "../../../../lib/features/auth/session";
import { getAdminPermissions, hasPermission } from "../../../../lib/features/auth/permissions";

export const dynamic = "force-dynamic";

export default async function AdminRolesPage() {
  const session = await getSession();
  const perms = session ? await getAdminPermissions(session.userId) : null;
  if (!session || !perms || !hasPermission(perms, "admin.roles.read")) {
    redirect("/admin?denied=rbac");
  }
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">角色权限</h1>
        <p className="mt-1 text-xs text-slate-500">
          管理自定义角色与其权限集（按业务域勾选读 / 写），并为用户分配角色。
          仅超级管理员可访问；改动即时生效，侧边栏入口在重新登录后刷新。
        </p>
      </div>
      <RolesManager />
    </div>
  );
}
