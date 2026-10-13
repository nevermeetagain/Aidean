// S2.2 应用「出厂默认三级导航树」的共用落库逻辑（幂等 upsert + 清理旧遗留）。
// 由 prisma/seed-admin-nav-default.ts（部署/新库）与 app/api/v1/admin/menus/apply-default（面板按钮）共同复用。
// 语义：URL 不变、只增不减；不在新树内的旧 ADMIN 行置 isActive=false（停用而非删除，保历史）。
import { NavScope, LinkType, type PrismaClient } from "@prisma/client";
import { OVERVIEW, SECTIONS, ALL_MENU_CODES } from "../admin-nav-default-tree";

type MenuDelegate = PrismaClient["navigationMenu"];

export interface MenuUpsertInput {
  menuCode: string;
  name: string;
  level: number;
  path?: string | null;
  icon?: string | null;
  parentCode?: string | null;
  isDropdown: boolean;
  sortOrder: number;
  requiredPermissions?: string[];
}

export interface ApplyDefaultNavResult {
  upserted: number;
  deactivated: number;
}

async function upsertMenu(db: MenuDelegate, m: MenuUpsertInput): Promise<void> {
  const common = {
    name: m.name,
    level: m.level,
    scope: NavScope.ADMIN,
    linkType: m.isDropdown ? LinkType.DROPDOWN : LinkType.INTERNAL,
    isDropdown: m.isDropdown,
    isVisible: true,
    isActive: true,
    path: m.path ?? null,
    icon: m.icon ?? null,
    parentCode: m.parentCode ?? null,
    sortOrder: m.sortOrder,
    requiredPermissions: m.requiredPermissions ?? [],
  };
  await db.upsert({
    where: { menuCode: m.menuCode },
    update: common,
    create: { menuCode: m.menuCode, ...common, showInHeader: false },
  });
}

/** 写入 7 板块三级默认树并停用旧遗留 ADMIN 行。返回写入与停用计数。 */
export async function applyDefaultAdminNav(db: MenuDelegate): Promise<ApplyDefaultNavResult> {
  let upserted = 0;
  const step = async (m: MenuUpsertInput): Promise<void> => {
    await upsertMenu(db, m);
    upserted++;
  };

  await step({ menuCode: OVERVIEW.code, name: OVERVIEW.name, level: 1, path: OVERVIEW.href, icon: OVERVIEW.icon, isDropdown: false, sortOrder: -1 });
  for (const s of SECTIONS) {
    await step({ menuCode: s.code, name: s.name, level: 1, isDropdown: true, sortOrder: s.order });
    for (const g of s.groups) {
      await step({ menuCode: g.code, name: g.name, level: 2, parentCode: s.code, isDropdown: true, sortOrder: g.order });
      for (let i = 0; i < g.leaves.length; i++) {
        const l = g.leaves[i];
        await step({ menuCode: l.code, name: l.name, level: 3, parentCode: g.code, path: l.href, icon: l.icon, isDropdown: false, sortOrder: i, requiredPermissions: l.perms });
      }
    }
  }

  const cleaned = await db.updateMany({
    where: { scope: NavScope.ADMIN, menuCode: { notIn: ALL_MENU_CODES }, isActive: true },
    data: { isActive: false },
  });

  return { upserted, deactivated: cleaned.count };
}
