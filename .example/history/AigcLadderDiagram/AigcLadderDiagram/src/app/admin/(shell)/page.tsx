"use client";

import { StatsCards } from "@/components/admin/dashboard/StatsCards";
import { QuickActions } from "@/components/admin/dashboard/QuickActions";
import { RecentActivity } from "@/components/admin/dashboard/RecentActivity";
import { AdminCard } from "@/components/admin/shared/AdminCard";
import { Zap, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6" data-admin>
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[rgb(var(--admin-text-primary))]">
            仪表盘
          </h1>
          <p className="mt-1 text-sm text-[rgb(var(--admin-text-secondary))]">
            Aidean 后台管理系统概览
          </p>
        </div>
        <div className="text-sm text-[rgb(var(--admin-text-muted))]">
          数据更新于：{new Date().toLocaleString("zh-CN")}
        </div>
      </div>

      {/* 统计卡片 + 趋势图 */}
      <StatsCards />

      {/* 快捷操作 + 最近活动 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <QuickActions />
        </div>
        <div className="lg:col-span-2">
          <RecentActivity />
        </div>
      </div>

      {/* 快捷导航 */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "模型管理", href: "/admin/models", color: "blue" },
          { label: "用户管理", href: "/admin/users", color: "green" },
          { label: "订单管理", href: "/admin/finance/balance", color: "purple" },
          { label: "系统配置", href: "/admin/settings", color: "gray" },
        ].map((item) => (
          <Link key={item.href} href={item.href}>
            <AdminCard className="flex items-center justify-between p-4 hover:bg-[rgb(var(--admin-bg-hover))] transition-colors cursor-pointer group">
              <div className="flex items-center gap-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-${item.color}-50`}>
                  <Zap className={`h-4 w-4 text-${item.color}-600`} />
                </div>
                <span className="text-sm font-medium text-[rgb(var(--admin-text-primary))]">
                  {item.label}
                </span>
              </div>
              <ArrowRight className="h-4 w-4 text-[rgb(var(--admin-text-muted))] group-hover:text-[rgb(var(--admin-primary))] transition-colors" />
            </AdminCard>
          </Link>
        ))}
      </div>
    </div>
  );
}
