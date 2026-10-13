"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, Cpu, Package, Terminal, Shield, Users,
  Receipt, FileText, Settings, ChevronDown, ChevronRight,
  Box, Factory, Layers, BarChart3, Beaker, Repeat,
  Puzzle, Wrench, Bot, MoreHorizontal, ListChecks,
  Database, ArrowUpCircle, CreditCard, Wallet, TrendingUp,
  Newspaper, BookOpen, Bell, BookMarked, Sliders,
  Activity, ScrollText, Send, GitCompare, MessageSquare, Menu, ToggleLeft, Code,
  Building2, Home, FolderGit, BookCopy, Scale
} from "lucide-react";

// ============================================
// 九大一級模塊結構 - 平鋪無分組
// ============================================

interface MenuItem {
  icon: React.ElementType;
  label: string;
  href: string;
}

interface MenuGroup {
  id: string;
  icon: React.ElementType;
  label: string;
  href?: string;
  children?: MenuItem[];
}

// 九大一級模塊定義
const NAV_GROUPS: MenuGroup[] = [
  {
    id: "dashboard",
    icon: LayoutDashboard,
    label: "仪表盘",
    href: "/admin",
  },
  {
    id: "models",
    icon: Cpu,
    label: "模型配置",
    children: [
      { icon: Box, label: "模型列表", href: "/admin/models" },
      { icon: Factory, label: "厂商管理", href: "/admin/models/vendors" },
      { icon: Layers, label: "类型管理", href: "/admin/models/categories" },
      { icon: Beaker, label: "基准测试", href: "/admin/models/benchmarks" },
      { icon: BookCopy, label: "版本管理", href: "/admin/models/versions" },
      { icon: GitCompare, label: "对比评测", href: "/admin/models/comparisons" },
      { icon: Repeat, label: "中转站", href: "/admin/models/api-stations" },
      { icon: BarChart3, label: "天梯图", href: "/admin/ladder" },
    ],
  },
  {
    id: "tools",
    icon: Package,
    label: "资源生态",
    children: [
      { icon: Puzzle, label: "组合方案", href: "/admin/tools/combinations" },
      { icon: Wrench, label: "Skill", href: "/admin/tools/skills" },
      { icon: FolderGit, label: "MCP", href: "/admin/tools/mcp" },
      { icon: Bot, label: "Agent", href: "/admin/tools/agents" },
      { icon: MoreHorizontal, label: "其他", href: "/admin/tools/others" },
    ],
  },
  {
    id: "scripts",
    icon: Terminal,
    label: "任务脚本",
    children: [
      { icon: ListChecks, label: "任务管理", href: "/admin/scripts/tasks" },
      { icon: Code, label: "脚本管理", href: "/admin/scripts" },
      { icon: Database, label: "数据备份", href: "/admin/scripts/backups" },
    ],
  },
  {
    id: "org",
    icon: Shield,
    label: "权限组织",
    children: [
      { icon: Shield, label: "角色管理", href: "/admin/rbac/roles" },
      { icon: ScrollText, label: "权限列表", href: "/admin/rbac/permissions" },
      { icon: Building2, label: "部门管理", href: "/admin/org/departments" },
      { icon: Users, label: "团队管理", href: "/admin/org/teams" },
    ],
  },
  {
    id: "users",
    icon: Users,
    label: "用户管理",
    children: [
      { icon: Users, label: "用户信息", href: "/admin/users" },
      { icon: ArrowUpCircle, label: "升级权限", href: "/admin/users/upgrade" },
    ],
  },
  {
    id: "finance",
    icon: Receipt,
    label: "订单管理",
    children: [
      { icon: Wallet, label: "用户账单", href: "/admin/finance/balance" },
      { icon: CreditCard, label: "充值订单", href: "/admin/finance/recharge" },
      { icon: Package, label: "套餐管理", href: "/admin/finance/plans" },
      { icon: Sliders, label: "配额管理", href: "/admin/finance/quotas" },
      { icon: BookMarked, label: "交易记录", href: "/admin/finance/transactions" },
      { icon: TrendingUp, label: "成本分析", href: "/admin/finance/costs" },
    ],
  },
  {
    id: "content",
    icon: FileText,
    label: "内容管理",
    children: [
      { icon: Newspaper, label: "AI资讯", href: "/admin/content/news" },
      { icon: BookOpen, label: "帮助文档", href: "/admin/content/docs" },
      { icon: Bell, label: "公告", href: "/admin/content/announcements" },
      { icon: BookMarked, label: "API文档", href: "/admin/content/api-docs" },
    ],
  },
  {
    id: "settings",
    icon: Settings,
    label: "系统配置",
    children: [
      { icon: Sliders, label: "全局配置", href: "/admin/settings" },
      { icon: Menu, label: "菜单管理", href: "/admin/settings/menus" },
      { icon: ToggleLeft, label: "功能开关", href: "/admin/settings/features" },
      { icon: Activity, label: "性能监控", href: "/admin/settings/monitoring" },
      { icon: Bell, label: "系统公告", href: "/admin/system/notices" },
      { icon: BookMarked, label: "字典管理", href: "/admin/settings/dicts" },
      { icon: ScrollText, label: "日志查看", href: "/admin/settings/logs" },
      { icon: Send, label: "消息推送", href: "/admin/settings/notifications" },
    ],
  },
];

// 渲染单个菜单组的函数
function renderMenuGroup(
  group: MenuGroup,
  expandedGroups: string[],
  toggleGroup: (id: string) => void,
  isActive: (href: string) => boolean
) {
  const GroupIcon = group.icon;
  const hasChildren = group.children && group.children.length > 0;
  const isExpanded = expandedGroups.includes(group.id);
  const isGroupActive = hasChildren && group.children?.some((item) => isActive(item.href));

  return (
    <div key={group.id} className="mb-0.5">
      {hasChildren ? (
        // 可折叠的一级菜单
        <button
          onClick={() => toggleGroup(group.id)}
          className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            isGroupActive
              ? "bg-[rgb(var(--admin-primary-light))] text-[rgb(var(--admin-primary))]"
              : "text-[rgb(var(--admin-text-primary))] hover:bg-[rgb(var(--admin-bg-hover))]"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <GroupIcon className="h-4 w-4" />
            <span>{group.label}</span>
          </div>
          {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-[rgb(var(--admin-text-muted))]" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-[rgb(var(--admin-text-muted))]" />
          )}
        </button>
      ) : (
        // 独立的一级菜单
        <Link
          href={group.href!}
          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            isActive(group.href!)
              ? "bg-[rgb(var(--admin-primary))] text-white shadow-sm"
              : "text-[rgb(var(--admin-text-primary))] hover:bg-[rgb(var(--admin-bg-hover))]"
          }`}
        >
          <GroupIcon className="h-4 w-4" />
          <span>{group.label}</span>
        </Link>
      )}

      {/* 二级子菜单 */}
      {hasChildren && isExpanded && group.children && (
        <ul className="mt-1 ml-4 space-y-0.5 border-l-2 border-[rgb(var(--admin-border-light))] pl-3">
          {group.children.map((item) => {
            const ItemIcon = item.icon;
            const itemActive = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-all duration-200 ${
                    itemActive
                      ? "bg-[rgb(var(--admin-primary-light))] text-[rgb(var(--admin-primary))] font-medium border-l-2 border-[rgb(var(--admin-primary))] -ml-[2px] pl-[calc(0.75rem-2px)]"
                      : "text-[rgb(var(--admin-text-secondary))] hover:bg-[rgb(var(--admin-bg-hover))] hover:text-[rgb(var(--admin-text-primary))]"
                  }`}
                >
                  <ItemIcon className="h-3.5 w-3.5" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();
  const [expandedGroups, setExpandedGroups] = useState<string[]>(["models", "tools", "finance"]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId]
    );
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <aside className="w-64 min-h-screen bg-[rgb(var(--admin-bg-sidebar))] border-r border-[rgb(var(--admin-border))] flex flex-col shadow-[var(--admin-shadow-sm)]">
      {/* Logo区域 - 晨光蓝渐变 */}
      <div className="p-4 border-b border-[rgb(var(--admin-border))] bg-gradient-to-r from-blue-500 to-indigo-600">
        <Link href="/admin" className="flex items-center gap-2.5 text-xl font-bold text-white">
          <Box className="h-7 w-7 text-white" />
          <span className="tracking-tight">Aidean Admin</span>
        </Link>
      </div>

      {/* 导航菜单 - 九大一級模塊平鋪 */}
      <nav className="flex-1 py-3 px-2 overflow-y-auto">
        <div className="space-y-0.5">
          {NAV_GROUPS.map((group) =>
            renderMenuGroup(group, expandedGroups, toggleGroup, isActive)
          )}
        </div>
      </nav>

      {/* 底部区域 - 返回用户端 + 版本信息 */}
      <div className="p-3 border-t border-[rgb(var(--admin-border))] space-y-2">
        {/* 返回用户端按钮 */}
        <Link
          href="/"
          className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-[rgb(var(--admin-bg-hover))] text-[rgb(var(--admin-text-primary))] text-sm font-medium transition-all duration-200 hover:bg-[rgb(var(--admin-primary-light))] hover:text-[rgb(var(--admin-primary))] group"
        >
          <Home className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-0.5" />
          <span>返回用户端</span>
        </Link>

        {/* 版本信息 */}
        <div className="px-3 py-1.5 text-[10px] text-[rgb(var(--admin-text-muted))] text-center">
          <p>v1.6.0 | Admin System</p>
          <p className="mt-0.5">© 2026 Aidean</p>
        </div>
      </div>
    </aside>
  );
}
