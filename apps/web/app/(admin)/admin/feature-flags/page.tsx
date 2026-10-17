// /admin/feature-flags —— 后台功能开关管理页（TASK-018 / 需求 §3.9 / API-003/004 消费端）。
// 守卫：(admin)/layout.tsx 承担登录 + isStaff；本页再加细粒度读权限（契约⑥「后台·功能开关」forbidden：
// 无 admin.configs.read → redirect /admin）。开关读写复用配置域权限（S2 无新权限域，与 ranking-weights/oidc 同域）。
import { redirect } from "next/navigation";

import { FeatureFlagsManager } from "@/components/admin/FeatureFlagsManager";
import { getSession } from "@/lib/features/auth/session";
import { getAdminPermissions, hasPermission } from "@/lib/features/auth/permissions";

export const dynamic = "force-dynamic";

export default async function AdminFeatureFlagsPage() {
  const session = await getSession();
  const perms = session ? await getAdminPermissions(session.userId) : null;
  // 读门槛：缺 admin.configs.read（含 SUPER_ADMIN 通配）即回后台首页（不泄露本页存在）。
  if (!perms || !hasPermission(perms, "admin.configs.read")) redirect("/admin");
  const canWrite = hasPermission(perms, "admin.configs.write");

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">功能开关</h1>
        <p className="mt-1 text-xs text-slate-500">
          运行时功能开关：切换即时对前台入口、受控页面与受控 API 生效——关闭时相应导航入口隐藏、受控页面呈「功能关闭」态、受控接口返回 50011。关闭核心开关（网关对话）需二次确认。
        </p>
      </div>
      <FeatureFlagsManager canWrite={canWrite} />
    </div>
  );
}
