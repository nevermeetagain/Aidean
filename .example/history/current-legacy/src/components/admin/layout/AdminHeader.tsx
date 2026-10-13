"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Bell,
  User,
  Settings,
  LogOut,
  Home,
  ChevronDown,
} from "lucide-react";
import { api } from "@/lib/api/client";

interface UserInfo {
  id: string;
  email: string;
  nickname?: string;
  avatar?: string;
  role: string;
}

export function AdminHeader() {
  const pathname = usePathname();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notificationCount, setNotificationCount] = useState(0);

  // 获取用户信息
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const res = await api.get<{ success: boolean; data: UserInfo }>("/auth/me");
        if (res.success) {
          setUserInfo(res.data);
        }
      } catch (error) {
        console.error("Failed to fetch user info:", error);
      }
    };

    fetchUserInfo();
  }, []);

  // 获取通知数量
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await api.get<{ success: boolean; data: { unread: number } }>(
          "/notifications/unread-count"
        );
        if (res.success) {
          setNotificationCount(res.data.unread);
        }
      } catch (error) {
        // 静默处理，不影响用户体验
      }
    };

    fetchNotifications();
  }, []);

  // 获取页面标题
  const getPageTitle = () => {
    const pathMap: Record<string, string> = {
      "/admin": "仪表盘",
      "/admin/models": "模型管理",
      "/admin/models/vendors": "厂商管理",
      "/admin/models/categories": "类型管理",
      "/admin/models/benchmarks": "基准测试",
      "/admin/tools/skills": "Skills",
      "/admin/tools/mcp": "MCP",
      "/admin/tools/agents": "Agent",
      "/admin/tools/api-stations": "API站",
      "/admin/tools/combinations": "组合方案",
      "/admin/tools/others": "其他工具",
      "/admin/ladder": "天梯图",
      "/admin/ladder/rankings": "排名管理",
      "/admin/users": "用户管理",
      "/admin/rbac/roles": "角色管理",
      "/admin/rbac/permissions": "权限列表",
      "/admin/org/departments": "部门管理",
      "/admin/org/teams": "团队管理",
      "/admin/feedback": "用户反馈",
      "/admin/content/news": "资讯管理",
      "/admin/content/docs": "文档管理",
      "/admin/content/announcements": "公告管理",
      "/admin/content/api-docs": "API文档",
      "/admin/finance/transactions": "交易记录",
      "/admin/finance/balance": "余额管理",
      "/admin/finance/recharge": "充值订单",
      "/admin/finance/plans": "套餐管理",
      "/admin/finance/quotas": "配额管理",
      "/admin/finance/costs": "成本分析",
      "/admin/evaluations": "模型评测",
      "/admin/system/notices": "系统公告",
      "/admin/scripts": "脚本管理",
      "/admin/scripts/tasks": "任务管理",
      "/admin/scripts/backups": "数据备份",
      "/admin/settings": "系统设置",
      "/admin/settings/menus": "菜单管理",
      "/admin/settings/features": "功能开关",
      "/admin/settings/monitoring": "性能监控",
      "/admin/settings/dicts": "字典管理",
      "/admin/settings/logs": "日志查看",
      "/admin/settings/notifications": "消息推送",
    };

    return pathMap[pathname] || "管理后台";
  };

  // 处理搜索
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // 搜索功能待实现
    console.log("Search:", searchQuery);
  };

  // 处理退出登录
  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/admin/login";
  };

  // 获取用户显示名
  const getDisplayName = () => {
    if (!userInfo) return "管理员";
    return userInfo.nickname || userInfo.email.split("@")[0];
  };

  // 获取头像首字母
  const getAvatarInitial = () => {
    const name = getDisplayName();
    return name.charAt(0).toUpperCase();
  };

  return (
    <header className="sticky top-0 z-30 bg-[rgb(var(--admin-bg-sidebar))] border-b border-[rgb(var(--admin-border))] px-6 py-3 shadow-[var(--admin-shadow-sm)]">
      <div className="flex items-center justify-between gap-4">
        {/* 左侧：页面标题 */}
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-[rgb(var(--admin-text-primary))]">
            {getPageTitle()}
          </h1>
        </div>

        {/* 中间：搜索框 */}
        <form onSubmit={handleSearch} className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgb(var(--admin-text-muted))]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索功能、菜单、数据..."
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-[rgb(var(--admin-bg))] border border-[rgb(var(--admin-border))] text-sm text-[rgb(var(--admin-text-primary))] placeholder:text-[rgb(var(--admin-text-muted))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--admin-primary-ring))] focus:border-transparent transition-all duration-200"
            />
          </div>
        </form>

        {/* 右侧：通知 + 用户信息 */}
        <div className="flex items-center gap-3">
          {/* 通知铃铛 */}
          <button
            className="relative p-2 rounded-lg text-[rgb(var(--admin-text-secondary))] hover:bg-[rgb(var(--admin-bg-hover))] hover:text-[rgb(var(--admin-text-primary))] transition-all duration-200"
            aria-label="通知"
          >
            <Bell className="h-5 w-5" />
            {notificationCount > 0 && (
              <span className="absolute top-1 right-1 h-4 w-4 flex items-center justify-center rounded-full bg-[rgb(var(--admin-danger))] text-white text-[10px] font-medium">
                {notificationCount > 9 ? "9+" : notificationCount}
              </span>
            )}
          </button>

          {/* 用户下拉菜单 */}
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[rgb(var(--admin-bg-hover))] transition-all duration-200"
            >
              {/* 头像 */}
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-semibold shadow-sm">
                {getAvatarInitial()}
              </div>

              {/* 用户信息 */}
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-[rgb(var(--admin-text-primary))]">
                  {getDisplayName()}
                </p>
                <p className="text-xs text-[rgb(var(--admin-text-muted))]">
                  {userInfo?.role === "SUPER_ADMIN" ? "超级管理员" : "管理员"}
                </p>
              </div>

              <ChevronDown className="h-4 w-4 text-[rgb(var(--admin-text-muted))]" />
            </button>

            {/* 下拉菜单 */}
            {isDropdownOpen && (
              <>
                {/* 点击外部关闭 */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsDropdownOpen(false)}
                />

                <div className="absolute right-0 top-full mt-1 w-56 rounded-lg bg-[rgb(var(--admin-bg-sidebar))] border border-[rgb(var(--admin-border))] shadow-[var(--admin-shadow-lg)] z-50 py-1">
                  {/* 用户信息头部 */}
                  <div className="px-4 py-3 border-b border-[rgb(var(--admin-border-light))]">
                    <p className="text-sm font-medium text-[rgb(var(--admin-text-primary))]">
                      {getDisplayName()}
                    </p>
                    <p className="text-xs text-[rgb(var(--admin-text-muted))]">
                      {userInfo?.email}
                    </p>
                  </div>

                  {/* 菜单项 */}
                  <div className="py-1">
                    <Link
                      href="/admin/settings"
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-[rgb(var(--admin-text-secondary))] hover:bg-[rgb(var(--admin-bg-hover))] hover:text-[rgb(var(--admin-text-primary))] transition-colors"
                    >
                      <Settings className="h-4 w-4" />
                      系统设置
                    </Link>

                    <Link
                      href="/admin/users/me"
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-[rgb(var(--admin-text-secondary))] hover:bg-[rgb(var(--admin-bg-hover))] hover:text-[rgb(var(--admin-text-primary))] transition-colors"
                    >
                      <User className="h-4 w-4" />
                      我的信息
                    </Link>
                  </div>

                  {/* 分隔线 */}
                  <div className="my-1 border-t border-[rgb(var(--admin-border-light))]" />

                  {/* 返回用户端 */}
                  <div className="py-1">
                    <Link
                      href="/"
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-[rgb(var(--admin-primary))] hover:bg-[rgb(var(--admin-primary-light))] transition-colors"
                    >
                      <Home className="h-4 w-4" />
                      返回用户端
                    </Link>
                  </div>

                  {/* 分隔线 */}
                  <div className="my-1 border-t border-[rgb(var(--admin-border-light))]" />

                  {/* 退出登录 */}
                  <div className="py-1">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[rgb(var(--admin-danger))] hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      退出登录
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
