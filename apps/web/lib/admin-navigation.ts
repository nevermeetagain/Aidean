// S2.3 管理端菜单取数与缓存：以 NavigationMenu(scope=ADMIN) 为唯一真源。
// - unstable_cache tag "admin-nav"：菜单变更后 revalidateTag("admin-nav") 即时失效（管理页保存时调用）。
// - 纯逻辑（类型/buildAdminNav/DEFAULT_ADMIN_NAV）在 lib/admin-navigation-core.ts（无副作用，供单测）；本模块只负责取数+缓存。
import { unstable_cache } from "next/cache";
import { NavScope } from "@prisma/client";
import { prisma } from "./db/prisma";
import { buildAdminNav, DEFAULT_ADMIN_NAV, type AdminNavVM, type NavRow } from "./admin-navigation-core";

// 复导出纯逻辑与类型，兼容从本模块引用的既有调用方（如 AdminSidebar 视图模型类型）。
export * from "./admin-navigation-core";

async function fetchAdminNavRaw(): Promise<AdminNavVM> {
  const rows = (await prisma.navigationMenu.findMany({
    where: { scope: NavScope.ADMIN, isVisible: true, isActive: true },
    select: {
      menuCode: true,
      name: true,
      level: true,
      path: true,
      icon: true,
      parentCode: true,
      isDropdown: true,
      sortOrder: true,
      requiredPermissions: true,
    },
    orderBy: { sortOrder: "asc" },
  })) as NavRow[];

  const nav = buildAdminNav(rows);
  // 空表（未种子/查询异常返回空）→ 兜底默认树，避免侧边栏白屏
  if (!nav.overview && nav.groups.length === 0) {
    return DEFAULT_ADMIN_NAV;
  }
  return nav;
}

export const getAdminNav = unstable_cache(fetchAdminNavRaw, ["admin-nav"], {
  revalidate: 60,
  tags: ["admin-nav"],
});
