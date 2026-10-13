// /admin/users —— 用户管理（rebuild-admin-console-and-harden-auth SubTask 2.1.2 + RBAC S3.5 角色分配）。
import { UsersTable } from "../../../../components/admin/UsersTable";
import { getSession } from "../../../../lib/features/auth/session";
import { getAdminPermissions, hasPermission } from "../../../../lib/features/auth/permissions";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  // 角色分配为 SUPER_ADMIN 专属（后端 admin.roles.write 强制）；据当前用户有效权限决定是否露出编辑入口。
  const session = await getSession();
  const perms = session ? await getAdminPermissions(session.userId) : null;
  const canAssignRoles = !!perms && hasPermission(perms, "admin.roles.write");
  // 凭据吊销为写操作（后端 admin.users.write 强制）；据当前用户有效权限决定是否露出吊销入口。
  const canRevokeCredentials = !!perms && hasPermission(perms, "admin.users.write");
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">用户管理</h1>
        <p className="mt-1 text-xs text-slate-500">
          搜索、调级、封禁/解封与余额调账；封禁即时失效该用户全部令牌（tokenVersion++）。
          超级管理员可另行为用户分配角色（多对多，改动即时生效）。
        </p>
      </div>
      <UsersTable canAssignRoles={canAssignRoles} canRevokeCredentials={canRevokeCredentials} />
    </div>
  );
}
