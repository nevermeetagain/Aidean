"use client";

import Link from "next/link";
import { Plus, Upload, Download, RefreshCw } from "lucide-react";
import { AdminCard } from "@/components/admin/shared/AdminCard";

const ACTIONS = [
  { label: "添加模型", href: "/admin/models", icon: Plus, color: "text-[rgb(var(--admin-primary))]", bgColor: "bg-[rgb(var(--admin-primary-light))]" },
  { label: "同步工具", href: "/admin/tools/skills", icon: RefreshCw, color: "text-[rgb(var(--admin-success))]", bgColor: "bg-[rgb(var(--admin-success))]/10" },
  { label: "发布公告", href: "/admin/content/announcements", icon: Upload, color: "text-[rgb(var(--admin-warning))]", bgColor: "bg-[rgb(var(--admin-warning))]/10" },
  { label: "导出数据", href: "#", icon: Download, color: "text-[rgb(var(--admin-danger))]", bgColor: "bg-[rgb(var(--admin-danger))]/10" },
];

export function QuickActions() {
  return (
    <AdminCard>
      <h3 className="mb-4 text-sm font-semibold text-[rgb(var(--admin-text-primary))]">快捷操作</h3>
      <div className="grid grid-cols-2 gap-3">
        {ACTIONS.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="flex items-center gap-2 rounded-lg border border-[rgb(var(--admin-border))] px-4 py-3 text-sm text-[rgb(var(--admin-text-secondary))] transition-colors hover:border-[rgb(var(--admin-primary))]/30 hover:bg-[rgb(var(--admin-bg-hover))] hover:text-[rgb(var(--admin-text-primary))]"
          >
            <div className={`flex h-7 w-7 items-center justify-center rounded-md ${action.bgColor}`}>
              <action.icon className={`h-4 w-4 ${action.color}`} />
            </div>
            {action.label}
          </Link>
        ))}
      </div>
    </AdminCard>
  );
}

