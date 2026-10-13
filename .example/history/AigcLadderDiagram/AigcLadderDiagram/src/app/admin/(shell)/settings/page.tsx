"use client";

import { useState, useEffect, useCallback } from "react";
import { Settings, Globe, Shield, Image, Type, FileImage, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { AdminCard } from "@/components/admin/shared/AdminCard";
import { AdminButton } from "@/components/admin/shared/AdminButton";
import { api } from "@/lib/api/client";

interface ConfigItem {
  configKey: string;
  configValue: string;
  configGroup: string;
  description: string;
  isPublic?: boolean;
}

const SITE_FIELDS = [
  { key: "site.name", label: "站点名称", desc: "网站显示名称（导航栏与SEO）", icon: <Type className="h-4 w-4" />, placeholder: "Aidean" },
  { key: "site.title", label: "浏览器标题", desc: "浏览器标签页标题（为空则使用站点名称）", icon: <Type className="h-4 w-4" />, placeholder: "留空则默认使用站点名称" },
  { key: "site.description", label: "站点描述", desc: "网站简短描述（SEO meta description）", icon: <Globe className="h-4 w-4" />, placeholder: "AI模型天梯图平台" },
  { key: "site.logoUrl", label: "站点Logo", desc: "网站Logo图片路径", icon: <Image className="h-4 w-4" />, placeholder: "/images/icons/logo.svg" },
  { key: "site.faviconUrl", label: "Favicon", desc: "浏览器标签页图标路径", icon: <FileImage className="h-4 w-4" />, placeholder: "/images/icons/logo.svg" },
];

const SECURITY_FIELDS = [
  { key: "security.maxLoginAttempts", label: "最大登录尝试", desc: "超出次数后锁定账号", placeholder: "5" },
  { key: "security.sessionTimeout", label: "会话超时(分钟)", desc: "用户无操作超时自动退出", placeholder: "720" },
];

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/admin/system/settings") as { configs?: ConfigItem[] };
        const configs: ConfigItem[] = res.configs || [];
        const map: Record<string, string> = {};
        for (const c of configs) {
          map[c.configKey] = c.configValue ?? "";
        }
        setValues(map);
      } catch (e: any) {
        setSaveMsg({ type: "err", text: "加载失败: " + (e.message || e) });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const allFields = [...SITE_FIELDS, ...SECURITY_FIELDS];
      for (const field of allFields) {
        const val = values[field.key];
        if (val === undefined) continue;
        await api.post("/admin/system/settings", {
          type: "config",
          data: {
            configKey: field.key,
            configValue: val,
            configGroup: field.key.split(".")[0] === "site" ? "general" : field.key.split(".")[0],
            description: field.desc,
          },
        });
      }
      setSaveMsg({ type: "ok", text: "保存成功！刷新页面后标题等配置生效。" });
    } catch (e: any) {
      setSaveMsg({ type: "err", text: "保存失败: " + (e.message || e) });
    } finally {
      setSaving(false);
    }
  }, [values]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[rgb(var(--admin-primary))]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="h-6 w-6 text-[rgb(var(--admin-primary))]" />
        <h1 className="text-2xl font-bold text-[rgb(var(--admin-text-primary))]">系统设置</h1>
      </div>

      {saveMsg && (
        <div className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm ${saveMsg.type === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {saveMsg.type === "ok" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {saveMsg.text}
        </div>
      )}

      <AdminCard className="p-6">
        <div className="flex items-center gap-2 mb-4 pb-4 border-b border-[rgb(var(--admin-border))]">
          <div className="text-[rgb(var(--admin-primary))]"><Globe className="h-5 w-5" /></div>
          <h2 className="text-lg font-semibold text-[rgb(var(--admin-text-primary))]">站点信息</h2>
        </div>
        <div className="space-y-5">
          {SITE_FIELDS.map((f) => (
            <div key={f.key} className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-2 min-w-0">
                <span className="mt-2.5 text-[rgb(var(--admin-primary))]">{f.icon}</span>
                <div>
                  <label className="text-sm font-medium text-[rgb(var(--admin-text-primary))]">{f.label}</label>
                  <p className="text-xs text-[rgb(var(--admin-text-secondary))]">{f.desc}</p>
                </div>
              </div>
              <input
                type="text"
                value={values[f.key] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="w-72 px-3 py-2 border rounded-md text-sm border-gray-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-200 outline-none transition-colors"
              />
            </div>
          ))}
        </div>
      </AdminCard>

      <AdminCard className="p-6">
        <div className="flex items-center gap-2 mb-4 pb-4 border-b border-[rgb(var(--admin-border))]">
          <div className="text-[rgb(var(--admin-primary))]"><Shield className="h-5 w-5" /></div>
          <h2 className="text-lg font-semibold text-[rgb(var(--admin-text-primary))]">安全设置</h2>
        </div>
        <div className="space-y-5">
          {SECURITY_FIELDS.map((f) => (
            <div key={f.key} className="flex items-start justify-between gap-4">
              <div>
                <label className="text-sm font-medium text-[rgb(var(--admin-text-primary))]">{f.label}</label>
                <p className="text-xs text-[rgb(var(--admin-text-secondary))]">{f.desc}</p>
              </div>
              <input
                type="text"
                value={values[f.key] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="w-72 px-3 py-2 border rounded-md text-sm border-gray-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-200 outline-none transition-colors"
              />
            </div>
          ))}
        </div>
      </AdminCard>

      <div className="flex justify-end">
        <AdminButton onClick={handleSave} disabled={saving}>
          {saving ? "保存中..." : "保存设置"}
        </AdminButton>
      </div>
    </div>
  );
}
