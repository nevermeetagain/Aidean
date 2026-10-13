// S2.3 管理端菜单建树「纯逻辑」：无 prisma/next 副作用导入，供单测直接引用。
// 数据取数与缓存见 lib/admin-navigation.ts（import 本模块）。
// S3.5 RBAC 侧栏过滤：新增 filterNavByPerms（纯函数），基于 leaf.requiredPermissions 判定可见性。
import { toNavRows } from "./admin-nav-default-tree";

export interface NavLeafVM {
  label: string;
  /** 可导航的叶必须有 href；纯分组的小节（level2 有子但自身不可跳转）可省略。 */
  href?: string;
  iconPath: string | null;
  /** 可见所需权限码（AND）。空/未提供 = 对所有后台入场者可见（向后兼容既有菜单）。 */
  requiredPermissions?: string[];
  /** 三级导航：level3 子项（存在则该叶按可展开小节渲染）。 */
  children?: NavLeafVM[];
}
export interface NavGroupVM {
  label: string;
  /** 直接挂在组下的叶（level2 无子，兼容旧两级树）。 */
  leaves: NavLeafVM[];
  /** 三级小节（level2 有 level3 子）。可选：2 级树不产生该键，保证向后兼容与既有字面量不破。 */
  sections?: NavLeafVM[];
}
export interface AdminNavVM {
  overview: NavLeafVM | null;
  groups: NavGroupVM[];
}

/** 建树输入行：仅取导航渲染所需字段（与 Prisma 查询投影一致）。 */
export interface NavRow {
  menuCode: string;
  name: string;
  level: number;
  path: string | null;
  icon: string | null;
  parentCode: string | null;
  isDropdown: boolean;
  sortOrder: number;
  /** S3.5：菜单可见所需权限码；未列入 = 对所有 isStaff 可见。 */
  requiredPermissions?: string[];
}

/** 纯函数：扁平行 → { overview, groups }。分组按 sortOrder 升序；子项按 parentCode 归属、sortOrder 升序、无 path 者跳过。 */
export function buildAdminNav(rows: NavRow[]): AdminNavVM {
  const sorted = [...rows].sort((a, b) => a.sortOrder - b.sortOrder);

  const overviewRow = sorted.find(
    (r) => r.level === 1 && !r.isDropdown && r.path === "/admin",
  );
  const overview: NavLeafVM | null = overviewRow
    ? { label: overviewRow.name, href: "/admin", iconPath: overviewRow.icon, requiredPermissions: overviewRow.requiredPermissions }
    : null;

  const toLeaf = (c: NavRow): NavLeafVM => ({
    label: c.name,
    href: c.path as string,
    iconPath: c.icon,
    requiredPermissions: c.requiredPermissions,
  });

  const groups: NavGroupVM[] = sorted
    .filter((r) => r.level === 1 && r.isDropdown)
    .map((g) => {
      const children = sorted.filter((c) => c.level === 2 && c.parentCode === g.menuCode);
      const leaves: NavLeafVM[] = [];
      const sections: NavLeafVM[] = [];
      for (const c of children) {
        const grandchildren = sorted.filter((gc) => gc.level === 3 && gc.parentCode === c.menuCode && !!gc.path);
        if (grandchildren.length > 0) {
          // level2 有 level3 子 → 作为可展开小节（自身可带 href，也可纯分组）
          const section: NavLeafVM = { label: c.name, iconPath: c.icon, children: grandchildren.map(toLeaf) };
          if (c.path) section.href = c.path;
          if (c.requiredPermissions) section.requiredPermissions = c.requiredPermissions;
          sections.push(section);
        } else if (c.path) {
          // level2 无子且可跳转 → 直接叶（旧行为）
          leaves.push(toLeaf(c));
        }
      }
      return sections.length > 0 ? { label: g.name, leaves, sections } : { label: g.name, leaves };
    });

  return { overview, groups };
}

/**
 * S3.5 RBAC 侧栏过滤（纯函数）：按用户权限集剪枝菜单。
 * - wildcard（SUPER_ADMIN）→ 全可见。
 * - 叶无 requiredPermissions 或空 → 保留（向后兼容 S2 种子未设权限的入口）。
 * - 叶有 requiredPermissions → 仅当用户持有 **ALL** 才可见。
 * - 分组剪枝后无可见叶 → 丢弃（避免空壳分组）。
 * - overview 不受本函数影响（无权限门槛的入口总可见）。
 */
export function filterNavByPerms(
  nav: AdminNavVM,
  perms: { wildcard: boolean; codes: string[] },
): AdminNavVM {
  const leafOk = (leaf: NavLeafVM): boolean => {
    if (perms.wildcard) return true;
    const req = leaf.requiredPermissions;
    if (!req || req.length === 0) return true;
    return req.every((code) => perms.codes.includes(code));
  };
  const prune = (leaf: NavLeafVM): NavLeafVM | null => {
    if (leaf.children) {
      const kids = leaf.children.filter(leafOk);
      return kids.length > 0 ? { ...leaf, children: kids } : null;
    }
    return leafOk(leaf) ? leaf : null;
  };
  return {
    overview: nav.overview,
    groups: nav.groups
      .map((g) => {
        const leaves = g.leaves.map(prune).filter((l): l is NavLeafVM => l !== null);
        const sections = (g.sections ?? []).map(prune).filter((l): l is NavLeafVM => l !== null);
        const out: NavGroupVM = { label: g.label, leaves };
        if (g.sections && g.sections.length > 0) out.sections = sections;
        return out;
      })
      .filter((g) => g.leaves.length > 0 || (g.sections?.length ?? 0) > 0),
  };
}

/**
 * 兜底默认树（缺库/空表用）：直接由 S2.1 出厂三级 7 板块树生成（buildAdminNav(toNavRows())），
 * 与 prisma/seed-admin-nav-default.ts 完全同构，消除「兜底树滞后于 seed」的 D-1/D-2 不一致。
 */
export const DEFAULT_ADMIN_NAV: AdminNavVM = buildAdminNav(toNavRows());
