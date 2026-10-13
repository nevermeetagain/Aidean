"use client";

/**
 * 路线图编辑器（/admin/configs，2026-09-28）：
 * - 数据键：roadmap.milestones（首页与 /roadmap 共用，保存后服务端 revalidatePath 双失效）；
 * - 交互：逐条编辑（版本号/标题/说明/是否已完成）+ 新增/删除/上移/下移，最多 24 条；
 * - 校验：前端 RoadmapMilestonesSchema 即时反馈，服务端 normalizeConfigValue("milestones") 兜底；
 * - 文案口径：面向公众展示，提示运营用通俗语言、避免技术术语。
 */
import React, { useEffect, useState } from "react";
import { RoadmapMilestonesSchema, parseRoadmapMilestones, ROADMAP_MILESTONES_DEFAULT, type RoadmapMilestone } from "@aidean/shared";
import { adminFetch } from "./adminFetch";
import { Input } from "@aidean/ui";

const inputClass = "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900";

export function RoadmapEditor() {
  const [milestones, setMilestones] = useState<RoadmapMilestone[]>(ROADMAP_MILESTONES_DEFAULT);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    setReady(false);
    const res = await adminFetch<{ configs: { configKey: string; configValue: string }[] }>("/api/v1/admin/configs");
    if (!res.ok || !res.data) { setMessage(res.message ?? "路线图加载失败，请重试"); return; }
    const raw = res.data.configs.find((r) => r.configKey === "roadmap.milestones")?.configValue;
    setMilestones(parseRoadmapMilestones(raw));
    setReady(true);
  }
  useEffect(() => { void load(); }, []);

  function patch(index: number, part: Partial<RoadmapMilestone>) {
    setMilestones(milestones.map((m, i) => (i === index ? { ...m, ...part } : m)));
  }
  function move(index: number, delta: -1 | 1) {
    const next = [...milestones];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    setMilestones(next);
  }

  async function save() {
    const parsed = RoadmapMilestonesSchema.safeParse(milestones);
    if (!parsed.success) {
      setMessage(parsed.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("；"));
      return;
    }
    setBusy(true);
    const res = await adminFetch("/api/v1/admin/configs", { method: "PUT", body: JSON.stringify({ configKey: "roadmap.milestones", configValue: JSON.stringify(parsed.data) }) });
    setBusy(false);
    setMessage(res.ok ? "路线图已保存，刷新首页与 /roadmap 可见" : res.message ?? "保存失败");
  }

  return (
    <section className="space-y-5">
      <header>
        <h2 className="text-lg font-semibold text-slate-900">产品路线图</h2>
        <p className="mt-2 text-sm text-slate-600">
          首页路线图区块与 /roadmap 页面共用这份内容。请面向公众描述功能点：用通俗的话说明「用户能得到什么」，
          避免出现内部技术词汇；从上到下按时间先后排列，最多 24 条。
        </p>
      </header>
      {message && <p role="status" className="break-words rounded-lg bg-slate-100 p-3 text-sm">{message}</p>}
      {!ready && <button type="button" className="text-sm underline" onClick={() => void load()}>重新加载内容</button>}
      <div className="space-y-4">
        {milestones.map((m, index) => (
          <fieldset key={index} disabled={!ready || busy} className="rounded-xl border border-slate-200 bg-white p-5 disabled:opacity-60">
            <legend className="px-2 font-semibold">第 {index + 1} 条</legend>
            <div className="grid gap-4 sm:grid-cols-[120px_minmax(0,1fr)_auto]">
              <label className="block text-sm text-slate-700">版本号（≤20 字）<Input maxLength={20} value={m.version} onChange={(e) => patch(index, { version: e.target.value })} placeholder="如 v1.0" /></label>
              <label className="block text-sm text-slate-700">标题（≤60 字，不写内部技术词）<Input maxLength={60} value={m.title} onChange={(e) => patch(index, { title: e.target.value })} placeholder="如：一个钱包用遍多家模型" /></label>
              <label className="flex items-center gap-2 self-end pb-1 text-sm text-slate-700">
                <input type="checkbox" checked={m.done} onChange={(e) => patch(index, { done: e.target.checked })} /> 已完成
              </label>
            </div>
            <label className="mt-3 block text-sm text-slate-700">说明（≤300 字，说清「用户能得到什么」）<textarea className={inputClass} rows={2} maxLength={300} value={m.description} onChange={(e) => patch(index, { description: e.target.value })} /></label>
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              <button type="button" onClick={() => move(index, -1)} disabled={index === 0} className="rounded-md border border-slate-300 px-3 py-1.5 disabled:opacity-40">上移</button>
              <button type="button" onClick={() => move(index, 1)} disabled={index === milestones.length - 1} className="rounded-md border border-slate-300 px-3 py-1.5 disabled:opacity-40">下移</button>
              <button type="button" onClick={() => setMilestones(milestones.filter((_, i) => i !== index))} className="rounded-md border border-red-200 px-3 py-1.5 text-red-600 hover:bg-red-50">删除此条</button>
            </div>
          </fieldset>
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={!ready || busy || milestones.length >= 24}
          onClick={() => setMilestones([...milestones, { version: "", title: "", description: "", done: false }])}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm disabled:opacity-60"
        >
          添加一条里程碑
        </button>
        <button type="button" disabled={!ready || busy} onClick={() => void save()} className="rounded-md bg-primary px-4 py-2 text-sm text-white disabled:opacity-60">保存路线图</button>
      </div>
    </section>
  );
}
