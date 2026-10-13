/**
 * 路由配置常量
 */

// 导航菜单项
export const NAV_ITEMS = [
  {
    label: "首页",
    href: "/",
    icon: "Home",
  },
  {
    label: "模型",
    href: "#",
    icon: "Cpu",
    children: [
      { label: "天梯图", href: "/models/ladder/performance" },
      { label: "性价比榜", href: "/models/ladder/price" },
      { label: "开源榜", href: "/models/ladder/opensource" },
      { label: "移动端榜", href: "/models/ladder/mobile" },
      { label: "所有模型", href: "/models" },
    ],
  },
  {
    label: "资源",
    href: "#",
    icon: "Library",
    children: [
      { label: "Skills", href: "/resources/skills" },
      { label: "MCP服务器", href: "/resources/mcp" },
      { label: "Agent", href: "/resources/agent" },
      { label: "AI资讯", href: "/resources/news" },
      { label: "场景方案", href: "/resources/scenarios" },
    ],
  },
  {
    label: "产品",
    href: "#",
    icon: "Package",
    children: [
      { label: "数字分身", href: "/products/ai-employee" },
      { label: "知识库", href: "/products/knowledge-base", external: true },
      { label: "解决方案", href: "/products/solutions" },
      { label: "业务咨询", href: "/products/consulting" },
    ],
  },
  {
    label: "文档",
    href: "#",
    icon: "FileText",
    children: [
      { label: "API文档", href: "/docs/api" },
      { label: "帮助中心", href: "/docs/help" },
      { label: "开发指南", href: "/docs/guide" },
      { label: "社区", href: "/docs/community" },
    ],
  },
  {
    label: "关于",
    href: "#",
    icon: "Info",
    children: [
      { label: "关于我们", href: "/about" },
      { label: "商务合作", href: "/about/cooperation" },
      { label: "加入我们", href: "/about/join" },
    ],
  },
] as const;

// 用户中心菜单
export const USER_MENU_ITEMS = [
  { label: "个人中心", href: "/profile", icon: "User" },
  { label: "我的收藏", href: "/profile/favorites", icon: "Heart" },
  { label: "测评历史", href: "/profile/evaluations", icon: "History" },
  { label: "余额充值", href: "/profile/balance", icon: "Wallet" },
  { divider: true },
  { label: "设置", href: "/profile/settings", icon: "Settings" },
  { label: "退出登录", action: "logout", icon: "LogOut" },
] as const;

// 管理后台菜单
export const ADMIN_MENU_ITEMS = [
  { label: "仪表盘", href: "/admin", icon: "LayoutDashboard" },
  { label: "模型管理", href: "/admin/models", icon: "Cpu" },
  { label: "工具管理", href: "/admin/tools", icon: "Wrench", children: [
    { label: "Skills", href: "/admin/tools/skills" },
    { label: "MCP", href: "/admin/tools/mcp" },
    { label: "Agents", href: "/admin/tools/agents" },
  ]},
  { label: "天梯管理", href: "/admin/ladder", icon: "Trophy" },
  { label: "用户管理", href: "/admin/users", icon: "Users" },
  { label: "财务管理", href: "/admin/finance", icon: "DollarSign" },
  { label: "内容管理", href: "/admin/content", icon: "FileText" },
  { label: "系统设置", href: "/admin/settings", icon: "Settings" },
] as const;

// 路由权限映射
export const ROUTE_PERMISSIONS: Record<string, string[]> = {
  "/admin": ["ADMIN", "SUPER_ADMIN"],
  "/admin/models": ["ADMIN", "SUPER_ADMIN"],
  "/admin/users": ["SUPER_ADMIN"],
  "/admin/finance": ["SUPER_ADMIN"],
  "/admin/settings": ["SUPER_ADMIN"],
  "/profile/balance": ["USER", "ADMIN", "SUPER_ADMIN"],
  "/profile/evaluations": ["USER", "ADMIN", "SUPER_ADMIN"],
};

// 无需登录即可访问的路由
export const PUBLIC_ROUTES = [
  "/",
  "/models",
  "/models/ladder/*",
  "/resources/*",
  "/about",
  "/docs/*",
  "/auth/login",
  "/auth/register",
] as const;
