// (admin) 组布局 —— 管理端守卫外壳（rebuild-admin-console-and-harden-auth SubTask 1.3.2）。
// RSC 守卫：getSession 验签 + 回库复核 role（角色变更即时生效）；未登录 → /admin/login，
// 非管理员 → 首页（不泄露后台存在）。布局为独立浅色冷色管理外壳：左侧 AdminSidebar（两级手风琴），
// 右侧顶栏（身份/返回主站/退出）+ 内容区，与前台 (site) 头尾完全隔离（需求 3/10/11）。
// 视觉口径（UI 重构）：管理端 = 白/冷灰分层 + 主色强调，默认浅色；与前台同令牌体系但布局不同。
//
// 导航性能优化（2026-10-09）：
// 原实现每次导航都串行 getSession（JWT 验签）+ prisma.user.findUnique（DB 往返）。
// 现用 unstable_cache 缓存角色查询 30s TTL——middleware 已在边缘层验签，layout 侧 30s 内
// 重复导航命中缓存免 DB 往返。角色变更时需调 revalidateTag("admin-auth") 失效全部缓存。
import Link from "next/link";
import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";

import { AdminLogoutButton } from "../../components/admin/AdminLogoutButton";
import { AdminMobileNav } from "../../components/admin/AdminMobileNav";
import { AdminSidebar } from "../../components/admin/AdminSidebar";
import { SessionKeepAlive } from "../../components/admin/SessionKeepAlive";
import { prisma } from "../../lib/db/prisma";
import { getAdminNav, filterNavByPerms } from "../../lib/admin-navigation";
import { getSession } from "../../lib/features/auth/session";
import { getAdminPermissions } from "../../lib/features/auth/permissions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "管理控制台 · Aidean",
  robots: { index: false, follow: false },
};

/** 缓存 admin 角色复核结果（30s TTL）。unstable_cache 要求纯函数——不读 cookies/headers，
 *  只做 DB 查询。tag = admin-auth，角色变更时 revalidateTag("admin-auth") 即时失效全部缓存。 */
const cachedAdminCheck = unstable_cache(
  async (userId: string) => {
    return prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, nickname: true, role: true, deletedAt: true },
    });
  },
  ["admin-auth-check"],
  { revalidate: 30, tags: ["admin-auth"] },
);

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/admin/login?redirect=%2Fadmin");
  }
  const user = await cachedAdminCheck(session.userId);
  // S3.3 RBAC 入场总闸：isStaff（role ∈ {ADMIN,SUPER_ADMIN,MODERATOR} 或持有任一角色分配）；与 requireAdminApi 同口径。
  const perms = await getAdminPermissions(session.userId);
  if (!user || user.deletedAt || !perms.isStaff) {
    // 非后台人员：带 denied 标记回管理登录页（登录页可据此提示权限不足）
    redirect("/admin/login?denied=1");
  }

  // S2.4 可配置菜单：以 NavigationMenu(scope=ADMIN) 为真源（unstable_cache tag admin-nav）；缺库/空表自动兜底。
  // S3.5 RBAC：按当前用户有效权限集剪枝侧栏（SUPER_ADMIN 通配全可见；无权限门槛的入口保留）。
  const nav = filterNavByPerms(await getAdminNav(), perms);

  return (
    <div className="flex min-h-dvh bg-slate-100/80 text-slate-700">
      <SessionKeepAlive />
      <div className="sticky top-0 hidden h-dvh shrink-0 md:block">
        <AdminSidebar nav={nav} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/80 px-4 backdrop-blur-xl sm:px-6">
          <div className="flex items-center gap-3">
            {/* S8.2 移动端抽屉触发（md 及以上隐藏，由桌面常驻侧栏承担） */}
            <AdminMobileNav nav={nav} />
            <p className="text-sm font-semibold tracking-wide text-slate-700">
              Aidean 管理控制台
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="hidden h-1.5 w-1.5 rounded-full bg-emerald-500 sm:inline-block" aria-hidden="true" />
              {user.nickname || user.email}
              <span className="ml-1 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                {user.role}
              </span>
            </span>
            <Link
              href="/"
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-800"
            >
              返回主站
            </Link>
            <AdminLogoutButton />
          </div>
        </header>
        <main className="flex-1 overflow-x-hidden px-6 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
