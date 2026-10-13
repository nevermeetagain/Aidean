"use client";

/**
 * 站点品牌与 SEO 编辑器（/admin/configs，S4「站点可见即可改」）：
 * - 数据键：site.name / site.title / site.description / site.seo.keywords / site.logoUrl / site.faviconUrl（均 STRING）；
 * - 真源：GET /api/v1/admin/configs 已按注册表缺行兜底默认，此处直接铺值；
 * - 保存：逐键 PUT（服务端 trim/长度/非空校验 + general 组 revalidateTag('site-branding')/revalidatePath('/')），
 *   前台根 generateMetadata 消费 site.*，改站名即时反映到 <title>/meta/favicon/OG。
 */
import React, { useEffect, useState } from "react";
import { adminFetch } from "./adminFetch";
import { Input } from "@aidean/ui";

const KEY_META = [
  { key: "site.name", label: "站点名称（必填，≤200 字）", maxLength: 200, placeholder: "Aidean" },
  { key: "site.title", label: "浏览器标题（留空＝「站点名称 · 站点描述」）", maxLength: 200, placeholder: "留空则自动生成" },
  { key: "site.description", label: "站点描述（用于 SEO 与默认标题，必填，≤200 字）", maxLength: 200, placeholder: "AI模型天梯图平台" },
  { key: "site.seo.keywords", label: "SEO 关键词（逗号分隔，可空，≤300 字）", maxLength: 300, placeholder: "模型评测,天梯图,大模型,统一计费" },
  { key: "site.logoUrl", label: "站点 Logo URL（必填，≤200 字）", maxLength: 200, placeholder: "/images/icons/logo.svg" },
  { key: "site.faviconUrl", label: "站点 Favicon URL（必填，≤200 字）", maxLength: 200, placeholder: "/images/icons/logo.svg" },
] as const;

type Values = Record<string, string>;
const EMPTY: Values = Object.fromEntries(KEY_META.map((m) => [m.key, ""]));

export function SiteBrandingEditor() {
  const [values, setValues] = useState<Values>(EMPTY);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    setReady(false);
    const res = await adminFetch<{ configs: { configKey: string; configValue: string }[] }>("/api/v1/admin/configs");
    if (!res.ok || !res.data) { setMessage(res.message ?? "品牌信息加载失败，请重试"); return; }
    const get = (key: string) => res.data!.configs.find((r) => r.configKey === key)?.configValue ?? "";
    setValues(Object.fromEntries(KEY_META.map((m) => [m.key, get(m.key)])));
    setReady(true);
  }
  useEffect(() => { void load(); }, []);

  async function save() {
    setBusy(true);
    const problems: string[] = [];
    for (const m of KEY_META) {
      const r = await adminFetch("/api/v1/admin/configs", { method: "PUT", body: JSON.stringify({ configKey: m.key, configValue: values[m.key] ?? "" }) });
      if (!r.ok) problems.push(`${m.label.split("（")[0]}：${r.message ?? "保存失败"}`);
    }
    setBusy(false);
    setMessage(problems.length ? problems.join("；") : "品牌与 SEO 已保存，刷新前台即时生效");
  }

  return (
    <section className="space-y-5">
      <header>
        <h2 className="text-lg font-semibold text-slate-900">站点品牌与 SEO</h2>
        <p className="mt-2 text-sm text-slate-600">
          站名、浏览器标题、描述、SEO 关键词与 Logo/Favicon。标题留空时自动用「站点名称 · 站点描述」。保存后前台网页标题、meta 与站点图标即时更新。
        </p>
      </header>
      {message && <p role="status" className="break-words rounded-lg bg-slate-100 p-3 text-sm">{message}</p>}
      {!ready && <button type="button" className="text-sm underline" onClick={() => void load()}>重新加载内容</button>}
      <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
        {KEY_META.map((m) => (
          <label key={m.key} className="block text-sm text-slate-700">
            {m.label}
            <Input
              className="mt-1"
              maxLength={m.maxLength}
              value={values[m.key] ?? ""}
              placeholder={m.placeholder}
              disabled={!ready || busy}
              onChange={(e) => setValues((prev) => ({ ...prev, [m.key]: e.target.value }))}
            />
          </label>
        ))}
      </div>
      <button type="button" disabled={!ready || busy} onClick={() => void save()} className="rounded-md bg-primary px-4 py-2 text-sm text-white disabled:opacity-60">
        保存品牌与 SEO
      </button>
    </section>
  );
}
