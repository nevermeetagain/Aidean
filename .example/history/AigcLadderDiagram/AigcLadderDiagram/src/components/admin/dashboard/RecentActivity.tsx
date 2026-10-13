"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { AdminCard } from "@/components/admin/shared/AdminCard";
import { Activity, User, Box, CreditCard, Settings } from "lucide-react";
import type { ApiResponse } from "@/lib/api/response";

interface ActivityItem {
  id: string;
  type: "user" | "model" | "transaction" | "system" | "tool";
  action: string;
  description: string;
  user?: string;
  timestamp: string;
}

const TYPE_ICONS: Record<string, { icon: typeof Activity; color: string }> = {
  user: { icon: User, color: "text-blue-600 bg-blue-50" },
  model: { icon: Box, color: "text-emerald-600 bg-emerald-50" },
  transaction: { icon: CreditCard, color: "text-purple-600 bg-purple-50" },
  system: { icon: Settings, color: "text-gray-600 bg-gray-50" },
  tool: { icon: Activity, color: "text-amber-600 bg-amber-50" },
};

export function RecentActivity() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get<ApiResponse<ActivityItem[]>>('/admin/activities');
        if (res && 'success' in res && res.success && 'data' in res) {
          setActivities(res.data);
        }
      } catch (err) {
        console.error("[Activities Load Error]", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60 * 1000) return "刚刚";
    if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60 / 1000)}分钟前`;
    if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / 60 / 60 / 1000)}小时前`;
    return date.toLocaleDateString("zh-CN");
  };

  return (
    <AdminCard className="h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-[rgb(var(--admin-text-primary))]">最近活动</h2>
        <span className="text-xs text-[rgb(var(--admin-text-muted))]">实时更新</span>
      </div>
      
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3 p-2">
              <div className="h-8 w-8 rounded-full bg-gray-100 animate-pulse" />
              <div className="flex-1 space-y-1">
                <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
                <div className="h-3 w-32 bg-gray-100 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : activities.length === 0 ? (
        <p className="text-sm text-[rgb(var(--admin-text-muted))] text-center py-8">暂无活动记录</p>
      ) : (
        <div className="space-y-1">
          {activities.map((activity) => {
            const { icon: Icon, color } = TYPE_ICONS[activity.type] || TYPE_ICONS.system;
            return (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-2 rounded-lg hover:bg-[rgb(var(--admin-bg-hover))] transition-colors"
              >
                <div className={`flex h-8 w-8 items-center justify-center rounded-full ${color} flex-shrink-0`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[rgb(var(--admin-text-primary))]">{activity.action}</p>
                  <p className="text-xs text-[rgb(var(--admin-text-muted))] truncate">{activity.description}</p>
                  <p className="text-[10px] text-[rgb(var(--admin-text-muted))] mt-1">{formatTime(activity.timestamp)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AdminCard>
  );
}
