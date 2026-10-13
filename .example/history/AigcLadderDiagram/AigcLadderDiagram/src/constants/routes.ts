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
    label: "Aidean",
    href: "/aidean",
    icon: "Cpu",
    children: [
      { label: "性能榜", href: "/aidean" },
      { label: "移动端榜", href: "/aidean/mobile" },
      { label: "图像榜", href: "/aidean/image" },
      { label: "视频榜", href: "/aidean/video" },
      { label: "音频榜", href: "/aidean/audio" },
      { label: "所有模型", href: "/aidean" },
    ],
  },
  {
    label: "AideanSpace",
    href: "/space",
    icon: "Library",
    children: [
      { label: "Skills", href: "/space/skills" },
      { label: "MCP服务器", href: "/space/mcp" },
      { label: "Agent", href: "/space/agent" },
      { label: "AI资讯", href: "/space/news" },
      { label: "场景方案", href: "/space/scenarios" },
    ],
  },
  {
    label: "Sphere",
    href: "/sphere",
    icon: "Package",
    children: [
      { label: "数字分身", href: "/sphere/ai-employee" },
      { label: "知识库", href: "/sphere/knowledge-base", external: true },
      { label: "解决方案", href: "/sphere/solutions" },
      { label: "业务咨询", href: "/sphere/consulting" },
    ],
  },
  {
    label: "文档",
    href: "#",
    icon: "FileText",
    children: [
      { label: "API文档", href: "/docs/api" },
      { label: "使用指南", href: "/docs/help" },
      { label: "帮助中心", href: "/docs/help-center" },
      { label: "定价方案", href: "/docs/pricing" },
    ],
  },
  {
    label: "关于",
    href: "#",
    icon: "Info",
    children: [
      { label: "关于我们", href: "/about" },
      { label: "商务合作", href: "/about/cooperation" },
      { label: "加入我们", href: "/about/jobs" },
      { label: "联系我们", href: "/about/contact" },
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
  "/aidean",
  "/aidean/*",
  "/models",
  "/models/ladder/*",
  "/space",
  "/space/*",
  "/resources/*",
  "/sphere",
  "/sphere/*",
  "/about",
  "/docs/*",
  "/auth/login",
  "/auth/register",
] as const;
