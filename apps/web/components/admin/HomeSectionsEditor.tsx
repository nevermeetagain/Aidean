"use client";

/**
 * 首页「合作跑马灯」与「关于正文」编辑器（/admin/configs，S8 CMS 化 B4）：
 * - partners.marquee：合作方名称列表，逐条文本编辑 + 增删（≤40 个）；保存 JSON.stringify(names)；
 * - about.body：纯文本正文（段落换行分隔，≤5000 字）；保存原文（服务端 normalizeConfigValue 存 trim 后原文）；
 * - 两键 configGroup=home，保存后服务端 revalidateTag('site-home')+revalidatePath('/')，刷新首页即时生效；
 * - 加载 parseMarqueeNames/parseAboutBody 兜底（缺行/非法/DB 不可用回默认，编辑器不空白）。
 */
import React, { useEffect, useState } from "react";
import { parseMarqueeNames, parseAboutBody, MARQUEE_NAMES_DEFAULT, ABOUT_BODY_DEFAULT, ABOUT_BODY_MAX } from "@aidean/shared";
import { adminFetch } from "./adminFetch";
import { Input } from "@aidean/ui";

const textareaClass = "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900";

async function fetchConfigs() {
  return adminFetch<{ configs: { configKey: string; configValue: string }[] }>("/api/v1/admin/configs");
}
function raw(res: { data: { configs: { configKey: string; configValue: string }[] } | null }, key: string) {
  return res.data?.configs.find((r) => r.configKey === key)?.configValue;
}

/** 合作企业跑马灯名单编辑器（partners.marquee） */
export function PartnerMarqueeEditor() {
  const [names, setNames] = useState<string[]>(MARQUEE_NAMES_DEFAULT);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    setReady(false);
    const res = await fetchConfigs();
    if (!res.ok || !res.data) { setMessage(res.message ?? "跑马灯名单加载失败，请重试"); return; }
    setNames(parseMarqueeNames(raw(res, "partners.marquee")));
    setReady(true);
  }
  useEffect(() => { void load(); }, []);

  const patch = (i: number, v: string) => setNames(names.map((n, idx) => (idx === i ? v : n)));

  async function save() {
    const cleaned = names.map((n) => n.trim()).filter(Boolean);
    if (cleaned.length === 0) { setMessage("名单不能为空，至少保留一个合作方名称"); return; }
    if (cleaned.length !== names.length) { setMessage("已忽略空白条目：请确保每个名称非空"); }
    setBusy(true);
    const res = await adminFetch("/api/v1/admin/configs", { method: "PUT", body: JSON.stringify({ configKey: "partners.marquee", configValue: JSON.stringify(cleaned) }) });
    setBusy(false);
    setMessage(res.ok ? "跑马灯名单已保存，刷新首页可见" : res.message ?? "保存失败");
  }

  return (
    <section className="space-y-5">
      <header>
        <h2 className="text-lg font-semibold text-slate-900">合作企业跑马灯</h2>
        <p className="mt-2 text-sm text-slate-600">首页「合作生态」区块滚动展示的企业合作方名称（两行反向循环，最多 40 个，每个 ≤40 字）。前台仅展示文字名，替换后刷新首页即时生效。</p>
      </header>
      {message && <p role="status" className="break-words rounded-lg bg-slate-100 p-3 text-sm">{message}</p>}
      {!ready && <button type="button" className="text-sm underline" onClick={() => void load()}>重新加载名单</button>}
      <fieldset disabled={!ready || busy} className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 disabled:opacity-60">
        <div className="space-y-2">
          {names.map((n, i) => (
            <div key={i} className="flex items-end gap-2">
              <label className="flex-1 text-sm text-slate-700">第 {i + 1} 个名称<Input maxLength={40} value={n} onChange={(e) => patch(i, e.target.value)} /></label>
              <button type="button" onClick={() => setNames(names.filter((_, idx) => idx !== i))} className="rounded-md border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50">删除</button>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" disabled={names.length >= 40} onClick={() => setNames([...names, ""])} className="rounded-md border border-slate-300 px-4 py-2 text-sm disabled:opacity-60">添加名称</button>
          <button type="button" onClick={() => void save()} className="rounded-md bg-primary px-4 py-2 text-sm text-white disabled:opacity-60">保存名单</button>
        </div>
      </fieldset>
    </section>
  );
}

/** 首页「关于我们」正文编辑器（about.body） */
export function AboutBodyEditor() {
  const [body, setBody] = useState(ABOUT_BODY_DEFAULT);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    setReady(false);
    const res = await fetchConfigs();
    if (!res.ok || !res.data) { setMessage(res.message ?? "关于正文加载失败，请重试"); return; }
    setBody(parseAboutBody(raw(res, "about.body")));
    setReady(true);
  }
  useEffect(() => { void load(); }, []);

  async function save() {
    const trimmed = body.trim();
    if (!trimmed) { setMessage("关于正文不能为空"); return; }
    if (trimmed.length > ABOUT_BODY_MAX) { setMessage(`关于正文超出 ${ABOUT_BODY_MAX} 字上限`); return; }
    setBusy(true);
    const res = await adminFetch("/api/v1/admin/configs", { method: "PUT", body: JSON.stringify({ configKey: "about.body", configValue: trimmed }) });
    setBusy(false);
    setMessage(res.ok ? "关于正文已保存，刷新首页可见" : res.message ?? "保存失败");
  }

  return (
    <section className="space-y-5">
      <header>
        <h2 className="text-lg font-semibold text-slate-900">首页关于正文</h2>
        <p className="mt-2 text-sm text-slate-600">首页「关于我们」区块的自我介绍（纯文本，空行分段，≤{ABOUT_BODY_MAX} 字）。前台按段落渲染，不解析 HTML。</p>
      </header>
      {message && <p role="status" className="break-words rounded-lg bg-slate-100 p-3 text-sm">{message}</p>}
      {!ready && <button type="button" className="text-sm underline" onClick={() => void load()}>重新加载正文</button>}
      <fieldset disabled={!ready || busy} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 disabled:opacity-60">
        <label className="block text-sm text-slate-700">
          关于正文（每个空行视为一段）
          <textarea className={textareaClass} rows={8} maxLength={ABOUT_BODY_MAX} value={body} onChange={(e) => setBody(e.target.value)} />
        </label>
        <p className="text-xs text-slate-400">当前 {body.trim().length} 字 / 上限 {ABOUT_BODY_MAX} 字</p>
        <button type="button" onClick={() => void save()} className="rounded-md bg-primary px-4 py-2 text-sm text-white disabled:opacity-60">保存关于正文</button>
      </fieldset>
    </section>
  );
}
