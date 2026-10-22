"use client";

/**
 * 首页文案编辑器（/admin/configs，S4「站点可见即可改」）：
 * - 数据键：home.hero（首屏 Hero）、home.valuePoints（价值点卡片）、home.modelEntries（模型入口卡片），均 JSON；
 * - 加载：parseHomeHero / parseHomeCards 兜底（缺行/非法回默认，永不空白）；
 * - 保存：HomeHeroSchema / HomeCardsSchema 前端即时校验 → PUT（服务端同规则兜底 + home 组
 *   revalidateTag('site-home')/revalidatePath('/')），改文案刷新首页即时可见；
 * - 图标以受限枚举名存储，前台 HomeIcon 映射为 lucide 组件（未知名回退 Sparkles）。
 */
import React, { useEffect, useState } from "react";
import {
  HOME_ICON_NAMES,
  HomeHeroSchema,
  HomeCardsSchema,
  parseHomeHero,
  parseHomeCards,
  HOME_HERO_DEFAULT,
  HOME_VALUE_POINTS_DEFAULT,
  HOME_MODEL_ENTRIES_DEFAULT,
  type HomeHero,
  type HomeCard,
  type HomeIconName,
} from "@aidean/shared";
import { adminFetch } from "./adminFetch";
import { Input, Label, Select, Textarea } from "@aidean/ui";

const inputClass = "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900";

async function fetchConfigs() {
  const res = await adminFetch<{ configs: { configKey: string; configValue: string }[] }>("/api/v1/admin/configs");
  return res;
}
function raw(res: { data: { configs: { configKey: string; configValue: string }[] } | null }, key: string) {
  return res.data?.configs.find((r) => r.configKey === key)?.configValue;
}

/** 图标下拉（受限枚举名） */
function IconSelect({ value, onChange, disabled }: { value: HomeIconName; onChange: (v: HomeIconName) => void; disabled: boolean }) {
  return (
    <Select className={inputClass} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value as HomeIconName)}>
      {HOME_ICON_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
    </Select>
  );
}

/** 通用卡片列表编辑（valuePoints 无 href；modelEntries 有 href） */
function CardListEditor({ cards, onChange, withHref, disabled }: { cards: HomeCard[]; onChange: (next: HomeCard[]) => void; withHref: boolean; disabled: boolean }) {
  const patch = (i: number, part: Partial<HomeCard>) => onChange(cards.map((c, idx) => (idx === i ? { ...c, ...part } : c)));
  return (
    <div className="space-y-4">
      {cards.map((c, i) => (
        <div key={i} className="rounded-lg border border-slate-200 p-4">
          <div className="grid gap-3 sm:grid-cols-[160px_minmax(0,1fr)]">
            <Label className="block text-sm text-slate-700">图标<IconSelect value={c.icon} disabled={disabled} onChange={(v) => patch(i, { icon: v })} /></Label>
            <Label className="block text-sm text-slate-700">标题（≤60 字）<Input maxLength={60} disabled={disabled} value={c.title} onChange={(e) => patch(i, { title: e.target.value })} /></Label>
          </div>
          <Label className="mt-3 block text-sm text-slate-700">描述（≤200 字）<Textarea className={inputClass} rows={2} maxLength={200} disabled={disabled} value={c.description} onChange={(e) => patch(i, { description: e.target.value })} /></Label>
          {withHref && <Label className="mt-3 block text-sm text-slate-700">跳转链接（可选，≤200 字，如 /models）<Input maxLength={200} disabled={disabled} value={c.href ?? ""} onChange={(e) => patch(i, { href: e.target.value || undefined })} /></Label>}
          <button type="button" disabled={disabled} onClick={() => onChange(cards.filter((_, idx) => idx !== i))} className="mt-3 rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-40">删除此卡片</button>
        </div>
      ))}
      <button type="button" disabled={disabled || cards.length >= 8} onClick={() => onChange([...cards, { icon: "Sparkles", title: "", description: "", ...(withHref ? { href: "" } : {}) }])} className="rounded-md border border-slate-300 px-4 py-2 text-sm disabled:opacity-60">添加卡片（最多 8 张）</button>
    </div>
  );
}

export function HomeContentEditor() {
  const [hero, setHero] = useState<HomeHero>(HOME_HERO_DEFAULT);
  const [valuePoints, setValuePoints] = useState<HomeCard[]>(HOME_VALUE_POINTS_DEFAULT);
  const [modelEntries, setModelEntries] = useState<HomeCard[]>(HOME_MODEL_ENTRIES_DEFAULT);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    setReady(false);
    const res = await fetchConfigs();
    if (!res.ok || !res.data) { setMessage(res.message ?? "首页文案加载失败，请重试"); return; }
    setHero(parseHomeHero(raw(res, "home.hero")));
    setValuePoints(parseHomeCards(raw(res, "home.valuePoints"), HOME_VALUE_POINTS_DEFAULT));
    setModelEntries(parseHomeCards(raw(res, "home.modelEntries"), HOME_MODEL_ENTRIES_DEFAULT));
    setReady(true);
  }
  useEffect(() => { void load(); }, []);

  function patchHero(part: Partial<HomeHero>) { setHero((h) => ({ ...h, ...part })); }
  function patchCta(which: "primaryCta" | "secondaryCta", part: Partial<HomeHero["primaryCta"]>) {
    setHero((h) => ({ ...h, [which]: { ...h[which], ...part } }));
  }
  function patchStat(i: number, part: Partial<HomeHero["stats"][number]>) {
    setHero((h) => ({ ...h, stats: h.stats.map((s, idx) => (idx === i ? { ...s, ...part } : s)) }));
  }

  async function put(key: string, value: string): Promise<string | null> {
    const r = await adminFetch("/api/v1/admin/configs", { method: "PUT", body: JSON.stringify({ configKey: key, configValue: value }) });
    return r.ok ? null : (r.message ?? "保存失败");
  }

  async function saveHero() {
    const parsed = HomeHeroSchema.safeParse(hero);
    if (!parsed.success) { setMessage(parsed.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("；")); return; }
    setBusy(true); setMessage((await put("home.hero", JSON.stringify(parsed.data))) ?? "首屏文案已保存，刷新首页可见"); setBusy(false);
  }
  async function saveCards(key: "home.valuePoints" | "home.modelEntries", cards: HomeCard[]) {
    const parsed = HomeCardsSchema.safeParse(cards);
    if (!parsed.success) { setMessage(parsed.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("；")); return; }
    setBusy(true); setMessage((await put(key, JSON.stringify(parsed.data))) ?? "卡片已保存，刷新首页可见"); setBusy(false);
  }

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-lg font-semibold text-slate-900">首页文案</h2>
        <p className="mt-2 text-sm text-slate-600">首屏 Hero、平台价值点与模型入口卡片。留空字段会按校验提示拒绝保存；保存后刷新首页即时生效。</p>
      </header>
      {message && <p role="status" className="break-words rounded-lg bg-slate-100 p-3 text-sm">{message}</p>}
      {!ready && <button type="button" className="text-sm underline" onClick={() => void load()}>重新加载内容</button>}

      <fieldset disabled={!ready || busy} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 disabled:opacity-60">
        <legend className="px-2 font-semibold text-slate-800">首屏 Hero</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Label className="block text-sm text-slate-700">角标（可空，≤120 字）<Input maxLength={120} value={hero.badge} onChange={(e) => patchHero({ badge: e.target.value })} /></Label>
          <Label className="block text-sm text-slate-700">主标题（必填，≤120 字）<Input maxLength={120} value={hero.title} onChange={(e) => patchHero({ title: e.target.value })} /></Label>
        </div>
        <Label className="block text-sm text-slate-700">副标题（≤300 字）<Textarea className={inputClass} rows={2} maxLength={300} value={hero.subtitle} onChange={(e) => patchHero({ subtitle: e.target.value })} /></Label>
        <div className="grid gap-4 sm:grid-cols-2">
          {(["primaryCta", "secondaryCta"] as const).map((which) => (
            <div key={which} className="rounded-lg border border-slate-100 p-3">
              <p className="text-xs font-medium text-slate-500">{which === "primaryCta" ? "主按钮" : "次按钮"}</p>
              <Label className="mt-2 block text-sm text-slate-700">文案（≤40 字）<Input maxLength={40} value={hero[which].label} onChange={(e) => patchCta(which, { label: e.target.value })} /></Label>
              <Label className="mt-2 block text-sm text-slate-700">链接（≤200 字）<Input maxLength={200} value={hero[which].href} onChange={(e) => patchCta(which, { href: e.target.value })} /></Label>
            </div>
          ))}
        </div>
        <div>
          <p className="text-sm font-medium text-slate-700">统计条（至少 1、最多 6 条）</p>
          <div className="mt-2 space-y-2">
            {hero.stats.map((s, i) => (
              <div key={i} className="flex flex-wrap items-end gap-2">
                <Label className="flex-1 text-sm text-slate-700">数值文案（≤40 字）<Input maxLength={40} value={s.value} onChange={(e) => patchStat(i, { value: e.target.value })} /></Label>
                <Label className="flex-1 text-sm text-slate-700">标签（≤40 字）<Input maxLength={40} value={s.label} onChange={(e) => patchStat(i, { label: e.target.value })} /></Label>
                <button type="button" onClick={() => patchHero({ stats: hero.stats.filter((_, idx) => idx !== i) })} className="rounded-md border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50">删除</button>
              </div>
            ))}
          </div>
          <button type="button" disabled={hero.stats.length >= 6} onClick={() => patchHero({ stats: [...hero.stats, { value: "", label: "" }] })} className="mt-2 rounded-md border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-60">添加统计项</button>
        </div>
        <button type="button" onClick={() => void saveHero()} className="rounded-md bg-primary px-4 py-2 text-sm text-white">保存首屏文案</button>
      </fieldset>

      <fieldset disabled={!ready || busy} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 disabled:opacity-60">
        <legend className="px-2 font-semibold text-slate-800">平台价值点（home.valuePoints）</legend>
        <CardListEditor cards={valuePoints} disabled={!ready || busy} onChange={setValuePoints} withHref={false} />
        <button type="button" onClick={() => void saveCards("home.valuePoints", valuePoints)} className="rounded-md bg-primary px-4 py-2 text-sm text-white">保存价值点卡片</button>
      </fieldset>

      <fieldset disabled={!ready || busy} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 disabled:opacity-60">
        <legend className="px-2 font-semibold text-slate-800">模型入口卡片（home.modelEntries）</legend>
        <CardListEditor cards={modelEntries} disabled={!ready || busy} onChange={setModelEntries} withHref />
        <button type="button" onClick={() => void saveCards("home.modelEntries", modelEntries)} className="rounded-md bg-primary px-4 py-2 text-sm text-white">保存入口卡片</button>
      </fieldset>
    </section>
  );
}
