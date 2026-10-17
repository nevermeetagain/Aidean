// S2.1 出厂默认三级导航树（板块 level1 → 分组 level2 → 叶 level3）。
// 纯数据 + 展平函数：供 prisma/seed-admin-nav-default.ts 落库，及 lib/admin-nav-default-tree.spec.ts 直接
// 喂 buildAdminNav 校验「7 板块 / 32 叶 / href 零缺失」。URL 全部沿用现值，仅重组层级与归属（只增不减）。
import type { NavRow } from "./admin-navigation-core";

export interface LeafSeed {
  code: string;
  name: string;
  href: string;
  icon: string;
  /** 侧栏可见所需权限码（AND）；未设 = 对所有 isStaff 可见（向后兼容）。 */
  perms?: string[];
}
export interface NavGroupSeed {
  code: string;
  name: string;
  order: number;
  leaves: LeafSeed[];
}
export interface SectionSeed {
  code: string;
  name: string;
  order: number;
  groups: NavGroupSeed[];
}

/** 概览：独立置顶、非下拉、一级（path=/admin）。 */
export const OVERVIEW = {
  code: "adm_overview",
  name: "概览",
  href: "/admin",
  icon: "M3 12h4l3-8 4 16 3-8h4",
} as const;

/**
 * 7 大业务板块（按用户心智：数据报表 / 模型与采集 / 用户与权限 / 交易与财务 /
 * 渠道与子平台 / 内容运营 / 站点与系统）。板块→分组→叶三级，叶 href 全部复用现值。
 */
export const SECTIONS: SectionSeed[] = [
  {
    code: "adm_sec_reports",
    name: "数据报表",
    order: 0,
    groups: [
      {
        code: "adm_grp_analytics",
        name: "经营分析",
        order: 0,
        leaves: [
          { code: "adm_reports", name: "运营报表", href: "/admin/reports", icon: "M3 3v18h18M7 14l3-3 3 3 5-6", perms: ["admin.reports.read"] },
          { code: "adm_intelligence", name: "智能仪表盘", href: "/admin/intelligence", icon: "M3 3v18h18M7 16l4-4 3 3 5-5" },
          { code: "adm_benchmarks", name: "基准测试", href: "/admin/benchmarks", icon: "M3 3v18h18M7 16l4-4 3 3 5-5" },
        ],
      },
      {
        code: "adm_grp_logs",
        name: "日志与审计",
        order: 1,
        leaves: [
          { code: "adm_logs", name: "日志中心", href: "/admin/logs", icon: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01", perms: ["admin.logs.read"] },
          { code: "adm_audit_logs", name: "审计日志", href: "/admin/audit-logs", icon: "M9 17H7A5 5 0 0 1 7 7h2M15 17h2a5 5 0 0 0 0-10h-2M8 12h8" },
        ],
      },
    ],
  },
  {
    code: "adm_sec_models",
    name: "模型与采集",
    order: 1,
    groups: [
      {
        code: "adm_grp_modelcat",
        name: "模型库",
        order: 0,
        leaves: [
          { code: "adm_models", name: "模型管理", href: "/admin/models", icon: "M12 2 2 7l10 5 10-5-10-5ZM2 17l10 5 10-5M2 12l10 5 10-5" },
          { code: "adm_prices", name: "模型定价", href: "/admin/prices", icon: "M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6", perms: ["admin.models.read"] },
          { code: "adm_vendors", name: "提供商管理", href: "/admin/vendors", icon: "M5 17h14M6 17V7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v10M9 9h.01M15 9h.01M9 13h.01M15 13h.01" },
          { code: "adm_providers", name: "模型提供商", href: "/admin/providers", icon: "M12 2 2 7l10 5 10-5-10-5ZM2 17l10 5 10-5M2 12l10 5 10-5" },
        ],
      },
      {
        code: "adm_grp_capability",
        name: "能力与协议",
        order: 1,
        leaves: [
          { code: "adm_capabilities", name: "能力矩阵", href: "/admin/capabilities", icon: "M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" },
          { code: "adm_protocols", name: "协议矩阵", href: "/admin/protocols", icon: "M4 6h16M4 12h16M4 18h16" },
        ],
      },
      {
        code: "adm_grp_collect",
        name: "同步与发现",
        order: 2,
        leaves: [
          { code: "adm_sync", name: "同步管理", href: "/admin/sync", icon: "M21 12a9 9 0 1 1-6.219-8.56M21 3v6h-6" },
          { code: "adm_discovery", name: "市场发现", href: "/admin/discovery", icon: "M11 5L6 9H2v6h4l5 4V5ZM15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" },
        ],
      },
      {
        code: "adm_grp_eval",
        name: "评测",
        order: 3,
        leaves: [
          { code: "adm_evaluations", name: "评估管理", href: "/admin/evaluations", icon: "M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" },
        ],
      },
    ],
  },
  {
    code: "adm_sec_access",
    name: "用户与权限",
    order: 2,
    groups: [
      {
        code: "adm_grp_user",
        name: "用户",
        order: 0,
        leaves: [
          { code: "adm_users", name: "用户管理", href: "/admin/users", icon: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm14 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" },
        ],
      },
      {
        code: "adm_grp_rbac",
        name: "权限",
        order: 1,
        leaves: [
          { code: "adm_roles", name: "角色权限", href: "/admin/roles", icon: "M12 2 2 7l10 5 10-5-10-5ZM2 17l10 5 10-5M2 12l10 5 10-5", perms: ["admin.roles.read"] },
          { code: "adm_menus", name: "菜单配置", href: "/admin/menus", icon: "M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6", perms: ["admin.menus.read"] },
        ],
      },
    ],
  },
  {
    code: "adm_sec_finance",
    name: "交易与财务",
    order: 3,
    groups: [
      {
        code: "adm_grp_txn",
        name: "交易账务",
        order: 0,
        leaves: [
          { code: "adm_wallets", name: "钱包管理", href: "/admin/wallets", icon: "M3 10h18M3 10a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-8ZM7 15h2M11 15h4" },
          { code: "adm_orders", name: "订单流水", href: "/admin/orders", icon: "M9 1h6a2 2 0 0 1 2 2v18a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2ZM9 7h6M9 11h6M9 15h4" },
        ],
      },
      {
        code: "adm_grp_billing",
        name: "套餐与兑换",
        order: 1,
        leaves: [
          { code: "adm_packages", name: "套餐管理", href: "/admin/packages", icon: "M3 8h18v12H3zM3 8l2-4h14l2 4M12 4v16" },
          { code: "adm_redemptions", name: "兑换码", href: "/admin/redemptions", icon: "M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1a2 2 0 0 0 0 4v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1a2 2 0 0 0 0-4V9ZM13 7v10" },
          { code: "adm_partner_keys", name: "卡商密钥", href: "/admin/partner-keys", icon: "M2 12h20M2 12l4-8h12l4 8M2 12v8a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-8M6 16h.01M10 16h4" },
          { code: "adm_free_quotas", name: "免费额度", href: "/admin/free-quotas", icon: "M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07" },
          { code: "adm_tier_mappings", name: "等级映射", href: "/admin/tier-mappings", icon: "M3 6h18M3 12h18M3 18h18M7 6v12M17 6v12" },
        ],
      },
    ],
  },
  {
    code: "adm_sec_channels",
    name: "渠道与子平台",
    order: 4,
    groups: [
      {
        code: "adm_grp_products",
        name: "产品与站点",
        order: 0,
        leaves: [
          { code: "adm_products", name: "产品管理", href: "/admin/products", icon: "M20 7 12 3 4 7v10l8 4 8-4V7ZM4 7l8 4 8-4M12 21V11" },
          { code: "adm_api_stations", name: "API站点", href: "/admin/api-stations", icon: "M5 12h14M5 12a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6ZM9 16h6M12 4v4" },
        ],
      },
      {
        code: "adm_grp_oidc",
        name: "接入协议",
        order: 1,
        leaves: [
          { code: "adm_oidc", name: "OIDC 客户端", href: "/admin/oidc-clients", icon: "M12 2 2 7l10 5 10-5-10-5ZM2 17l10 5 10-5M2 12l10 5 10-5", perms: ["admin.configs.read"] },
        ],
      },
    ],
  },
  {
    code: "adm_sec_content",
    name: "内容运营",
    order: 5,
    groups: [
      {
        code: "adm_grp_sitecontent",
        name: "站点内容",
        order: 0,
        leaves: [
          { code: "adm_news", name: "资讯管理", href: "/admin/news", icon: "M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2M18 14h-8M15 18h-5M10 6h8v4h-8V6Z" },
          { code: "adm_announcements", name: "公告管理", href: "/admin/announcements", icon: "M3 11l19-9-9 19-2-8-8-2Z" },
        ],
      },
    ],
  },
  {
    code: "adm_sec_system",
    name: "站点与系统",
    order: 6,
    groups: [
      {
        code: "adm_grp_config",
        name: "站点配置",
        order: 0,
        leaves: [
          { code: "adm_configs", name: "站点配置", href: "/admin/configs", icon: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1l2-1.6-2-3.4-2.4 1a7.4 7.4 0 0 0-1.7-1L14.8 3h-4l-.4 2.6a7.4 7.4 0 0 0-1.7 1l-2.4-1-2 3.4L6.3 11a7.4 7.4 0 0 0 0 2l-2 1.6 2 3.4 2.4-1a7.4 7.4 0 0 0 1.7 1l.4 2.6h4l.4-2.6a7.4 7.4 0 0 0 1.7-1l2.4 1 2-3.4-2-1.6c.1-.3.1-.7.1-1Z" },
          { code: "adm_feature_flags", name: "功能开关", href: "/admin/feature-flags", icon: "M12 2v10M18.36 6.64a9 9 0 1 1-12.73 0", perms: ["admin.configs.read"] },
        ],
      },
      {
        code: "adm_grp_ops",
        name: "运维调度",
        order: 1,
        leaves: [
          { code: "adm_scripts", name: "脚本调度", href: "/admin/scripts", icon: "M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" },
        ],
      },
    ],
  },
];

/** 展平为 buildAdminNav 输入行（板块 level1 / 分组 level2 / 叶 level3，sortOrder 逐层升序）。 */
export function toNavRows(): NavRow[] {
  const rows: NavRow[] = [
    { menuCode: OVERVIEW.code, name: OVERVIEW.name, level: 1, path: OVERVIEW.href, icon: OVERVIEW.icon, parentCode: null, isDropdown: false, sortOrder: -1 },
  ];
  for (const s of SECTIONS) {
    rows.push({ menuCode: s.code, name: s.name, level: 1, path: null, icon: null, parentCode: null, isDropdown: true, sortOrder: s.order });
    for (const g of s.groups) {
      rows.push({ menuCode: g.code, name: g.name, level: 2, path: null, icon: null, parentCode: s.code, isDropdown: true, sortOrder: g.order });
      g.leaves.forEach((l, i) =>
        rows.push({ menuCode: l.code, name: l.name, level: 3, path: l.href, icon: l.icon, parentCode: g.code, isDropdown: false, sortOrder: i, requiredPermissions: l.perms }),
      );
    }
  }
  return rows;
}

/** 所有叶 href（含概览），供 seed 覆盖断言与既有 31 入口零缺失校验。 */
export const EXPECTED_HREFS: string[] = [
  OVERVIEW.href,
  ...SECTIONS.flatMap((s) => s.groups.flatMap((g) => g.leaves.map((l) => l.href))),
];

/** 所有 menuCode（板块+分组+叶+概览），供 seed 清理旧两级遗留行。 */
export const ALL_MENU_CODES: string[] = [
  OVERVIEW.code,
  ...SECTIONS.flatMap((s) => [s.code, ...s.groups.flatMap((g) => [g.code, ...g.leaves.map((l) => l.code)])]),
];
