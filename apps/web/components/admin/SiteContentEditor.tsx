"use client";

import React, { useEffect, useState } from "react";
import { PARTNER_CONFIG_KEYS, PARTNER_DEFAULTS, PartnerContentSchema, parsePartnerContent, type PartnerContent } from "@aidean/shared";
import { adminFetch } from "./adminFetch";
import { SafeImage } from "../common/SafeImage";
import { Input } from "@aidean/ui";

const inputClass = "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900";

const fields = [
  ["title", "产品标题（必填，≤120 字）", 120],
  ["subtitle", "小标题（≤200 字）", 200],
  ["description", "产品描述（≤2000 字）", 2000],
  ["coverUrl", "封面图片 URL（16:9 显示，≤500 字；留空显示默认封面图）", 500],
  ["notes", "补充说明 / 使用注意事项（≤1000 字）", 1000],
  ["videoUrl", "介绍视频 URL（MP4/WebM，16:9 显示，≤500 字）", 500],
] as const;

export function SiteContentEditor() {
  const [products, setProducts] = useState<PartnerContent[]>(PARTNER_DEFAULTS);
  const [imageTexts, setImageTexts] = useState<string[]>(["", "", ""]);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function load() {
    setReady(false);
    const res = await adminFetch<{ configs: { configKey: string; configValue: string }[] }>("/api/v1/admin/configs");
    if (!res.ok || !res.data) { setMessage(res.message ?? "内容加载失败，请重试"); return; }
    const values = PARTNER_CONFIG_KEYS.map((key, i) => parsePartnerContent(res.data!.configs.find((r) => r.configKey === key)?.configValue, i));
    setProducts(values); setImageTexts(values.map((p) => p.images.join("\n"))); setReady(true);
  }
  useEffect(() => { void load(); }, []);
  async function save(index: number) {
    const parsed = PartnerContentSchema.safeParse({ ...products[index], images: imageTexts[index]!.split("\n").map((s) => s.trim()).filter(Boolean) });
    if (!parsed.success) { setMessage(parsed.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("；")); return; }
    setBusy(true);
    const res = await adminFetch("/api/v1/admin/configs", { method: "PUT", body: JSON.stringify({ configKey: PARTNER_CONFIG_KEYS[index], configValue: JSON.stringify(parsed.data) }) });
    setBusy(false); setMessage(res.ok ? `${parsed.data.title}已保存，刷新 /partners 可见` : res.message ?? "保存失败");
  }
  return <section className="space-y-5">
    <header><h2 className="text-lg font-semibold text-slate-900">合作产品内容</h2><p className="mt-2 text-sm text-slate-600">固定三个产品位；只发布已确认的信息，不填写未经核实的成绩、奖项或服务承诺。媒体仅支持 http(s) 或 /images/、/media/ 安全路径；图片 PNG/JPEG/WebP/GIF/AVIF，视频 MP4/WebM。不上传或代理文件。</p></header>
    {message && <p role="status" className="break-words rounded-lg bg-slate-100 p-3 text-sm">{message}</p>}
    {!ready && <button type="button" className="text-sm underline" onClick={() => void load()}>重新加载内容</button>}
    {products.map((p, index) => <fieldset key={PARTNER_CONFIG_KEYS[index]} disabled={!ready || busy} className="rounded-xl border border-slate-200 bg-white p-5 disabled:opacity-60">
      <legend className="px-2 font-semibold">{PARTNER_DEFAULTS[index]!.title}</legend>
      <label className="text-sm"><input type="checkbox" checked={p.enabled} onChange={(e) => setProducts(products.map((v, i) => i === index ? { ...v, enabled: e.target.checked } : v))} /> 在合作页展示（关闭后不恢复默认内容）</label>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{fields.map(([field, label, maxLength]) => <label key={field} className="block text-sm text-slate-700">{label}<textarea className={inputClass} rows={field === "description" || field === "notes" ? 4 : 2} maxLength={maxLength} value={p[field]} onChange={(e) => setProducts(products.map((v, i) => i === index ? { ...v, [field]: e.target.value } : v))} /></label>)}
      <label className="block text-sm text-slate-700 sm:col-span-2">多张展示图片（每行一个 URL，最多6张，每条≤500字，4:3 显示）<textarea className={inputClass} rows={4} maxLength={3005} value={imageTexts[index]} onChange={(e) => setImageTexts(imageTexts.map((v, i) => i === index ? e.target.value : v))} /></label></div>
      <button type="button" onClick={() => void save(index)} className="mt-4 rounded-md bg-primary px-4 py-2 text-sm text-white">保存{PARTNER_DEFAULTS[index]!.title}</button>
    </fieldset>)}
  </section>;
}

/** 联系方式编辑（/about 页）：邮箱必填；二维码 URL 留空=前台显示「二维码待上传」占位。 */
export function AboutContactEditor() {
  const [email, setEmail] = useState("");
  const [qrUrl, setQrUrl] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function load() {
    setReady(false);
    const res = await adminFetch<{ configs: { configKey: string; configValue: string }[] }>("/api/v1/admin/configs");
    if (!res.ok || !res.data) { setMessage(res.message ?? "联系方式加载失败，请重试"); return; }
    const get = (key: string) => res.data!.configs.find((r) => r.configKey === key)?.configValue ?? "";
    setEmail(get("about.contactEmail")); setQrUrl(get("about.wechatQrUrl")); setReady(true);
  }
  useEffect(() => { void load(); }, []);
  async function save() {
    setBusy(true);
    const emailRes = await adminFetch("/api/v1/admin/configs", { method: "PUT", body: JSON.stringify({ configKey: "about.contactEmail", configValue: email }) });
    const qrRes = await adminFetch("/api/v1/admin/configs", { method: "PUT", body: JSON.stringify({ configKey: "about.wechatQrUrl", configValue: qrUrl }) });
    setBusy(false);
    const problems = [emailRes, qrRes].filter((r) => !r.ok).map((r) => r.message ?? "保存失败");
    setMessage(problems.length ? problems.join("；") : "联系方式已保存，刷新 /about 可见");
  }
  return <section className="space-y-5">
    <header><h2 className="text-lg font-semibold text-slate-900">联系方式（关于页）</h2><p className="mt-2 text-sm text-slate-600">邮箱必填（≤200 字，须为合法邮箱格式）。二维码图片 URL 留空时，前台显示「二维码待上传」占位；填写后按 http(s) 或 /images/、/media/ 安全路径校验，仅支持 PNG/JPEG/WebP/GIF/AVIF。前台展示尺寸固定为 200px 方形，不随上传素材大小变化。</p></header>
    {message && <p role="status" className="break-words rounded-lg bg-slate-100 p-3 text-sm">{message}</p>}
    <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-[minmax(0,1fr)_auto]">
      <div className="space-y-4">
        <label className="block text-sm text-slate-700">联系邮箱（必填）<Input type="email" maxLength={200} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" /></label>
        <label className="block text-sm text-slate-700">微信二维码图片 URL（留空=显示待上传占位）<Input maxLength={500} value={qrUrl} onChange={(e) => setQrUrl(e.target.value)} placeholder="/images/wechat-qr.png" /></label>
        <button type="button" disabled={!ready || busy} onClick={() => void save()} className="rounded-md bg-primary px-4 py-2 text-sm text-white disabled:opacity-60">保存联系方式</button>
      </div>
      <div>
        <p className="text-sm text-slate-700">前台效果预览（200px 方形）</p>
        <div className="mt-1"><SafeImage src={qrUrl || undefined} alt="二维码预览" ratio="square" fit="contain" placeholder="二维码待上传" /></div>
      </div>
    </div>
  </section>;
}
