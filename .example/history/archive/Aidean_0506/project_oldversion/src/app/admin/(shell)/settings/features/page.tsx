"use client";

import { useState, useCallback } from "react";
import { ToggleLeft, Users, FileText, CreditCard, Bell, BarChart3, Zap, Shield, Globe } from "lucide-react";
import { AdminCard } from "@/components/admin/shared/AdminCard";
import { AdminButton } from "@/components/admin/shared/AdminButton";
import { ReactNode } from "react";

interface FeatureToggle {
  id: string;
  name: string;
  description: string;
  icon: ReactNode;
  enabled: boolean;
  category: string;
}

const FEATURES: FeatureToggle[] = [
  { id: "user_register", name: "用户注册", description: "允许新用户注册账号", icon: <Users className="h-4 w-4" />, enabled: true, category: "用户" },
  { id: "user_upgrade", name: "用户升级", description: "允许用户申请升级权限", icon: <Zap className="h-4 w-4" />, enabled: true, category: "用户" },
  { id: "content_publish", name: "内容发布", description: "允许发布资讯和文档", icon: <FileText className="h-4 w-4" />, enabled: true, category: "内容" },
  { id: "finance_recharge", name: "充值功能", description: "开启用户充值通道", icon: <CreditCard className="h-4 w-4" />, enabled: true, category: "财务" },
  { id: "notification_email", name: "邮件通知", description: "发送邮件通知给用户", icon: <Bell className="h-4 w-4" />, enabled: false, category: "通知" },
  { id: "analytics_dashboard", name: "数据仪表板", description: "显示统计数据图表", icon: <BarChart3 className="h-4 w-4" />, enabled: true, category: "系统" },
  { id: "api_public", name: "开放API", description: "允许第三方API访问", icon: <Globe className="h-4 w-4" />, enabled: false, category: "系统" },
  { id: "maintenance", name: "维护模式", description: "仅管理员可访问系统", icon: <Shield className="h-4 w-4" />, enabled: false, category: "系统" },
];

const CATEGORIES = Array.from(new Set(FEATURES.map((f) => f.category)));

export default function FeaturesPage() {
  const [features, setFeatures] = useState(FEATURES);
  const [saving, setSaving] = useState(false);

  const toggleFeature = useCallback((id: string) => {
    setFeatures((prev) => prev.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f)));
  }, []);

  const handleSave = useCallback(() => {
    setSaving(true);
    setTimeout(() => setSaving(false), 1000);
  }, []);

  const enabledCount = features.filter((f) => f.enabled).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ToggleLeft className="h-6 w-6 text-[rgb(var(--admin-primary))]" />
        <h1 className="text-2xl font-bold text-[rgb(var(--admin-text-primary))]">功能开关</h1>
      </div>

      <div className="flex gap-4">
        <AdminCard className="flex-1 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center text-green-600">
            <span className="text-lg font-bold">{enabledCount}</span>
          </div>
          <div>
            <div className="text-sm font-medium text-[rgb(var(--admin-text-primary))]">已启用</div>
            <div className="text-xs text-[rgb(var(--admin-text-secondary))]">{((enabledCount / features.length) * 100).toFixed(0)}% 功能已开启</div>
          </div>
        </AdminCard>
        <AdminCard className="flex-1 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center text-gray-600">
            <span className="text-lg font-bold">{features.length - enabledCount}</span>
          </div>
          <div>
            <div className="text-sm font-medium text-[rgb(var(--admin-text-primary))]">已禁用</div>
            <div className="text-xs text-[rgb(var(--admin-text-secondary))]">{features.length} 个功能模块</div>
          </div>
        </AdminCard>
      </div>

      <div className="space-y-6">
        {CATEGORIES.map((category) => (
          <AdminCard key={category} className="p-6">
            <h2 className="text-sm font-semibold text-[rgb(var(--admin-text-secondary))] uppercase tracking-wider mb-4">{category}</h2>
            <div className="space-y-4">
              {features
                .filter((f) => f.category === category)
                .map((feature) => (
                  <div key={feature.id} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[rgb(var(--admin-bg-secondary))] flex items-center justify-center text-[rgb(var(--admin-primary))]">
                        {feature.icon}
                      </div>
                      <div>
                        <div className="font-medium text-[rgb(var(--admin-text-primary))]">{feature.name}</div>
                        <div className="text-xs text-[rgb(var(--admin-text-secondary))]">{feature.description}</div>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={feature.enabled}
                        onChange={() => toggleFeature(feature.id)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[rgb(var(--admin-primary))]"></div>
                    </label>
                  </div>
                ))}
            </div>
          </AdminCard>
        ))}
      </div>

      <div className="flex justify-end">
        <AdminButton onClick={handleSave} disabled={saving}>
          {saving ? "保存中..." : "保存配置"}
        </AdminButton>
      </div>
    </div>
  );
}
