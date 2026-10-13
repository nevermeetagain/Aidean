// /admin/menus —— 菜单配置（restructure S2.4）。菜单为系统级配置，后端 admin.menus.* 强制；
// S9.2.1：叠加页级 RSC 守卫——无 admin.menus.read 的角色直访重定向概览（避免进页后 API 403 的空态）。
import { redirect } from "next/navigation";

import { MenuManager } from "../../../../components/admin/MenuManager";
import { getSession } from "../../../../lib/features/auth/session";
import { getAdminPermissions, hasPermission } from "../../../../lib/features/auth/permissions";

export const dynamic = "force-dynamic";

export default async function AdminMenusPage() {
  const session = await getSession();
  const perms = session ? await getAdminPermissions(session.userId) : null;
  if (!session || !perms || !hasPermission(perms, "admin.menus.read")) {
    redirect("/admin?denied=menus");
  }
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">菜单配置</h1>
        <p className="mt-1 text-xs text-slate-500">
          自定义后台侧边栏：新建一级分组、二级子项（选归属 / 排序 / 改名 / 改路径 / 显隐）。
          保存后需重新登录后台生效。
        </p>
      </div>
      <MenuManager />
    </div>
  );
}
