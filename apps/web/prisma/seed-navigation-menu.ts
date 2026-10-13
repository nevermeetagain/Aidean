/**
 * S2.2 种子：将现存管理端菜单（AdminSidebar GROUPS + 概览）落库为 NavigationMenu(scope=ADMIN)。
 * 目标：激活 NavigationMenu 为可配置菜单真源，且「只增不减」——26 个功能入口 href 零缺失。
 * 幂等：按 menuCode 唯一键 upsert，可重复执行。
 * 运行：pnpm --filter web exec tsx prisma/seed-navigation-menu.ts
 */
import { PrismaClient, NavScope, LinkType } from "@prisma/client";

const prisma = new PrismaClient();

interface LeafSeed {
  code: string;
  name: string;
  href: string;
  icon: string;
  /** S3.5：侧栏可见所需权限码（AND）；未设=对所有 isStaff 可见。 */
  perms?: string[];
}
interface GroupSeed {
  code: string;
  name: string;
  order: number;
  children: LeafSeed[];
}

const OVERVIEW: LeafSeed = {
  code: "adm_overview",
  name: "概览",
  href: "/admin",
  icon: "M3 12h4l3-8 4 16 3-8h4",
};

const GROUPS: GroupSeed[] = [
  {
    code: "adm_grp_ops",
    name: "运营管理",
    order: 0,
    children: [
      { code: "adm_users", name: "用户管理", href: "/admin/users", icon: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm14 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" },
      { code: "adm_models", name: "模型管理", href: "/admin/models", icon: "M12 2 2 7l10 5 10-5-10-5ZM2 17l10 5 10-5M2 12l10 5 10-5" },
      { code: "adm_prices", name: "模型定价", href: "/admin/prices", icon: "M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6", perms: ["admin.models.read"] },
      { code: "adm_vendors", name: "提供商管理", href: "/admin/vendors", icon: "M5 17h14M6 17V7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v10M9 9h.01M15 9h.01M9 13h.01M15 13h.01" },
      { code: "adm_providers", name: "模型提供商", href: "/admin/providers", icon: "M12 2 2 7l10 5 10-5-10-5ZM2 17l10 5 10-5M2 12l10 5 10-5" },
      { code: "adm_products", name: "产品管理", href: "/admin/products", icon: "M20 7 12 3 4 7v10l8 4 8-4V7ZM4 7l8 4 8-4M12 21V11" },
      { code: "adm_api_stations", name: "API站点", href: "/admin/api-stations", icon: "M5 12h14M5 12a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6ZM9 16h6M12 4v4" },
      { code: "adm_news", name: "资讯管理", href: "/admin/news", icon: "M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2M18 14h-8M15 18h-5M10 6h8v4h-8V6Z" },
      { code: "adm_announcements", name: "公告管理", href: "/admin/announcements", icon: "M3 11l19-9-9 19-2-8-8-2Z" },
      { code: "adm_evaluations", name: "评估管理", href: "/admin/evaluations", icon: "M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" },
      { code: "adm_tier_mappings", name: "等级映射", href: "/admin/tier-mappings", icon: "M3 6h18M3 12h18M3 18h18M7 6v12M17 6v12" },
      { code: "adm_free_quotas", name: "免费额度", href: "/admin/free-quotas", icon: "M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07" },
      { code: "adm_benchmarks", name: "基准测试", href: "/admin/benchmarks", icon: "M3 3v18h18M7 16l4-4 3 3 5-5" },
    ],
  },
  {
    code: "adm_grp_data",
    name: "数据与同步",
    order: 1,
    children: [
      { code: "adm_sync", name: "同步管理", href: "/admin/sync", icon: "M21 12a9 9 0 1 1-6.219-8.56M21 3v6h-6" },
      { code: "adm_scripts", name: "脚本调度", href: "/admin/scripts", icon: "M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" },
      { code: "adm_discovery", name: "市场发现", href: "/admin/discovery", icon: "M11 5L6 9H2v6h4l5 4V5ZM15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" },
      { code: "adm_intelligence", name: "智能仪表盘", href: "/admin/intelligence", icon: "M3 3v18h18M7 16l4-4 3 3 5-5" },
      { code: "adm_protocols", name: "协议矩阵", href: "/admin/protocols", icon: "M4 6h16M4 12h16M4 18h16" },
      { code: "adm_capabilities", name: "能力矩阵", href: "/admin/capabilities", icon: "M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" },
      { code: "adm_logs", name: "日志中心", href: "/admin/logs", icon: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01", perms: ["admin.logs.read"] },
    ],
  },
  {
    code: "adm_grp_finance",
    name: "财务与配置",
    order: 2,
    children: [
      { code: "adm_wallets", name: "钱包管理", href: "/admin/wallets", icon: "M3 10h18M3 10a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-8ZM7 15h2M11 15h4" },
      { code: "adm_orders", name: "订单流水", href: "/admin/orders", icon: "M9 1h6a2 2 0 0 1 2 2v18a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2ZM9 7h6M9 11h6M9 15h4" },
      { code: "adm_partner_keys", name: "卡商密钥", href: "/admin/partner-keys", icon: "M2 12h20M2 12l4-8h12l4 8M2 12v8a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-8M6 16h.01M10 16h4" },
      { code: "adm_packages", name: "套餐管理", href: "/admin/packages", icon: "M3 8h18v12H3zM3 8l2-4h14l2 4M12 4v16" },
      { code: "adm_redemptions", name: "兑换码", href: "/admin/redemptions", icon: "M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1a2 2 0 0 0 0 4v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1a2 2 0 0 0 0-4V9ZM13 7v10" },
      { code: "adm_configs", name: "站点配置", href: "/admin/configs", icon: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1l2-1.6-2-3.4-2.4 1a7.4 7.4 0 0 0-1.7-1L14.8 3h-4l-.4 2.6a7.4 7.4 0 0 0-1.7 1l-2.4-1-2 3.4L6.3 11a7.4 7.4 0 0 0 0 2l-2 1.6 2 3.4 2.4-1a7.4 7.4 0 0 0 1.7 1l.4 2.6h4l.4-2.6a7.4 7.4 0 0 0 1.7-1l2.4 1 2-3.4-2-1.6c.1-.3.1-.7.1-1Z" },
      { code: "adm_oidc", name: "OIDC 客户端", href: "/admin/oidc-clients", icon: "M12 2 2 7l10 5 10-5-10-5ZM2 17l10 5 10-5M2 12l10 5 10-5", perms: ["admin.configs.read"] },
      { code: "adm_menus", name: "菜单配置", href: "/admin/menus", icon: "M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6", perms: ["admin.menus.read"] },
      { code: "adm_roles", name: "角色权限", href: "/admin/roles", icon: "M12 2 2 7l10 5 10-5-10-5ZM2 17l10 5 10-5M2 12l10 5 10-5", perms: ["admin.roles.read"] },
      { code: "adm_audit_logs", name: "审计日志", href: "/admin/audit-logs", icon: "M9 17H7A5 5 0 0 1 7 7h2M15 17h2a5 5 0 0 0 0-10h-2M8 12h8" },
    ],
  },
];

// 覆盖断言基准：S1 前 AdminSidebar 中全部 26 个可导航 href（概览 + 25 叶）
const EXPECTED_HREFS = [
  OVERVIEW.href,
  ...GROUPS.flatMap((g) => g.children.map((c) => c.href)),
].sort();

async function upsertParent(g: GroupSeed): Promise<void> {
  await prisma.navigationMenu.upsert({
    where: { menuCode: g.code },
    update: {
      name: g.name,
      level: 1,
      scope: NavScope.ADMIN,
      linkType: LinkType.DROPDOWN,
      isDropdown: true,
      isVisible: true,
      isActive: true,
      sortOrder: g.order,
      parentId: null,
      parentCode: null,
    },
    create: {
      menuCode: g.code,
      name: g.name,
      level: 1,
      scope: NavScope.ADMIN,
      linkType: LinkType.DROPDOWN,
      isDropdown: true,
      isVisible: true,
      isActive: true,
      showInHeader: false,
      sortOrder: g.order,
    },
  });
}

async function upsertLeaf(l: LeafSeed, opts: { level: number; parentCode?: string; order: number; isDropdown?: boolean; linkType?: LinkType }): Promise<void> {
  await prisma.navigationMenu.upsert({
    where: { menuCode: l.code },
    update: {
      name: l.name,
      path: l.href,
      icon: l.icon,
      level: opts.level,
      scope: NavScope.ADMIN,
      linkType: opts.linkType ?? LinkType.INTERNAL,
      isDropdown: opts.isDropdown ?? false,
      isVisible: true,
      isActive: true,
      sortOrder: opts.order,
      parentCode: opts.parentCode ?? null,
      requiredPermissions: l.perms ?? [],
    },
    create: {
      menuCode: l.code,
      name: l.name,
      path: l.href,
      icon: l.icon,
      level: opts.level,
      scope: NavScope.ADMIN,
      linkType: opts.linkType ?? LinkType.INTERNAL,
      isDropdown: opts.isDropdown ?? false,
      isVisible: true,
      isActive: true,
      showInHeader: false,
      sortOrder: opts.order,
      parentCode: opts.parentCode ?? null,
      requiredPermissions: l.perms ?? [],
    },
  });
}

async function main(): Promise<void> {
  // 概览：置顶、非下拉、独立一级
  await upsertLeaf(OVERVIEW, { level: 1, order: -1 });

  for (const g of GROUPS) {
    await upsertParent(g);
    for (let i = 0; i < g.children.length; i++) {
      await upsertLeaf(g.children[i], { level: 2, parentCode: g.code, order: i });
    }
  }

  // 覆盖断言：读回所有 scope=ADMIN 且 path 非空的叶，href 集合必须等于既有 26 个
  const rows = await prisma.navigationMenu.findMany({
    where: { scope: NavScope.ADMIN, path: { not: null } },
    select: { path: true },
  });
  const got = rows.map((r) => r.path as string).sort();
  const missing = EXPECTED_HREFS.filter((h) => !got.includes(h));
  const coverage = `coverage ${EXPECTED_HREFS.length - missing.length}/${EXPECTED_HREFS.length}`;
  console.log(`[seed-navigation-menu] ADMIN 叶=${got.length}，${coverage}`);
  if (missing.length > 0) {
    throw new Error(`[seed-navigation-menu] FAIL 缺失 href：${missing.join(", ")}`);
  }
  console.log(`[seed-navigation-menu] OK：${EXPECTED_HREFS.length} 入口零缺失`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
