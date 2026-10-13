// ==================================================================
// S3 RBAC 权限码注册表（A2 接口级权限的唯一契约源）
// 码形如 `admin.<域>.<read|write>`；`*` = SUPER_ADMIN 通配（解析层注入，不落库）。
// 变更纪律：新增/删除域 → 同步本表 + prisma/seed-rbac.ts（系统角色权限集）+ API 文档；
//           逐路由 requireAdminApi("<code>") 只能引用本表已登记的码（否则视为缺陷）。
// ==================================================================

/** 管理域（与后台菜单/板块一一对应）。key = 域标识（进码名），label = 中文名（进角色 UI）。 */
export const ADMIN_DOMAINS = {
  overview: "概览",
  reports: "报表统计",
  users: "用户管理",
  models: "模型管理",
  vendors: "提供商管理",
  providers: "模型提供商",
  products: "产品管理",
  "api-stations": "API站点",
  news: "资讯管理",
  announcements: "公告管理",
  evaluations: "评估管理",
  "tier-mappings": "等级映射",
  "free-quotas": "免费额度",
  benchmarks: "基准测试",
  sync: "同步管理",
  scripts: "脚本调度",
  discovery: "市场发现",
  intelligence: "智能仪表盘",
  protocols: "协议矩阵",
  capabilities: "能力矩阵",
  wallets: "钱包管理",
  orders: "订单流水",
  "partner-keys": "卡商密钥",
  packages: "套餐管理",
  redemptions: "兑换码",
  configs: "站点配置",
  "audit-logs": "审计日志",
  logs: "日志中心",
  menus: "菜单配置",
  roles: "角色权限",
} as const;

export type AdminDomainKey = keyof typeof ADMIN_DOMAINS;
export const ADMIN_DOMAIN_KEYS = Object.keys(ADMIN_DOMAINS) as AdminDomainKey[];

/** SUPER_ADMIN 通配码（解析层持有，逐接口校验命中即绕过）。 */
export const PERMISSION_WILDCARD = "*";

const ACTIONS = ["read", "write"] as const;
export type PermissionAction = (typeof ACTIONS)[number];

/** 拼接权限码。 */
export function permissionCode(domain: AdminDomainKey, action: PermissionAction): string {
  return `admin.${domain}.${action}`;
}

export interface PermissionDef {
  code: string;
  domain: AdminDomainKey;
  domainLabel: string;
  action: PermissionAction;
  label: string;
}

/** 全量权限原子（域 × {read,write}），供角色 UI 与 seed 落库。 */
export const ALL_PERMISSIONS: PermissionDef[] = ADMIN_DOMAIN_KEYS.flatMap((domain) =>
  ACTIONS.map((action) => ({
    code: permissionCode(domain, action),
    domain,
    domainLabel: ADMIN_DOMAINS[domain],
    action,
    label: `${ADMIN_DOMAINS[domain]}·${action === "read" ? "查看" : "编辑"}`,
  })),
);

export const ALL_PERMISSION_CODES: string[] = ALL_PERMISSIONS.map((p) => p.code);

/** 权限码类型（逐路由 requireAdminApi 入参；允许任意已登记码或通配）。 */
export type PermissionCode = string;

/** 某域的全部码（read+write）。 */
function domainCodes(domain: AdminDomainKey): string[] {
  return ACTIONS.map((a) => permissionCode(domain, a));
}

export type SystemRoleKey = "SUPER_ADMIN" | "ADMIN" | "MODERATOR";

export interface SystemRoleDef {
  code: SystemRoleKey;
  name: string;
  description: string;
  /** "*"=通配（SUPER_ADMIN）；否则具体权限码集合。 */
  permissions: string[];
}

const ALL = ALL_PERMISSION_CODES;
// 内容/审核向的受限子集（MODERATOR）：全域可读（roles/reports 除外）+ 内容类可写；金融/配置/角色/菜单只读。
// RBAC 管理（roles 域）整体保留给 SUPER_ADMIN：MODERATOR 连 roles.read 也不持有。
// 报表（reports 域，含充值收入金额）对 MODERATOR 整体隐藏（S9 B2）：read/write 均不授予，需显式经自定义角色下发。
const MODERATOR_READ = ALL.filter((c) => c.endsWith(".read") && !c.startsWith("admin.roles.") && !c.startsWith("admin.reports."));
const MODERATOR_WRITE_DOMAINS: AdminDomainKey[] = ["news", "announcements", "evaluations", "discovery", "benchmarks"];
const MODERATOR = [
  ...MODERATOR_READ,
  ...MODERATOR_WRITE_DOMAINS.flatMap((d) => domainCodes(d).filter((c) => c.endsWith(".write"))),
];

/**
 * 系统内置角色权限集（seed 收敛真源）。
 * - SUPER_ADMIN：通配 `*`。
 * - ADMIN：除「角色权限(roles)」外全部（RBAC 管理保留给 SUPER_ADMIN）。
 * - MODERATOR：全域可读 + 内容/评估/发现/基准可写（金融/配置/菜单/角色只读）。
 */
export const SYSTEM_ROLES: SystemRoleDef[] = [
  {
    code: "SUPER_ADMIN",
    name: "超级管理员",
    description: "全站最高权限，持有通配，可管理角色与授权。",
    permissions: [PERMISSION_WILDCARD],
  },
  {
    code: "ADMIN",
    name: "管理员",
    description: "运营/数据/财务/配置全权；不含角色与权限管理。",
    permissions: ALL.filter((c) => !c.startsWith("admin.roles.")),
  },
  {
    code: "MODERATOR",
    name: "内容审核员",
    description: "全域可读；资讯/公告/评估/发现/基准可写；金融/配置/菜单/角色只读。",
    permissions: MODERATOR,
  },
];
