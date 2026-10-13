"use client";

/**
 * 帮助文档编辑器（/admin/configs，S4「站点可见即可改」）：
 * - 数据键：docs.articles（/docs 文档中心文章，JSON 数组）；
 * - 加载：parseDocsArticles 兜底（缺行/非法回默认 6 篇）；
 * - 结构：文章 {id 标识,group 分组,title 标题,summary 摘要,sections[{title,text}],link 底部链接,linkLabel 链接文案}，≤24 篇、每篇 ≤12 小节；
 * - 保存：DocsArticlesSchema 前端即时校验 → PUT（服务端同规则兜底 + docs 组 revalidateTag('site-docs')/revalidatePath('/docs')）。
 *   左侧目录按 group 首次出现顺序归组；id 为文章锚点，须唯一且非空。
 */
import React, { useEffect, useState } from "react";
import { DocsArticlesSchema, parseDocsArticles, DOCS_ARTICLES_DEFAULT, type DocsArticle } from "@aidean/shared";
import { adminFetch } from "./adminFetch";
import { Input } from "@aidean/ui";

const inputClass = "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900";

export function DocsEditor() {
  const [articles, setArticles] = useState<DocsArticle[]>(DOCS_ARTICLES_DEFAULT);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    setReady(false);
    const res = await adminFetch<{ configs: { configKey: string; configValue: string }[] }>("/api/v1/admin/configs");
    if (!res.ok || !res.data) { setMessage(res.message ?? "文档加载失败，请重试"); return; }
    setArticles(parseDocsArticles(res.data.configs.find((r) => r.configKey === "docs.articles")?.configValue));
    setReady(true);
  }
  useEffect(() => { void load(); }, []);

  const patchArticle = (i: number, part: Partial<DocsArticle>) => setArticles(articles.map((a, idx) => (idx === i ? { ...a, ...part } : a)));
  const patchSection = (i: number, j: number, part: Partial<DocsArticle["sections"][number]>) =>
    patchArticle(i, { sections: articles[i]!.sections.map((s, sj) => (sj === j ? { ...s, ...part } : s)) });

  async function save() {
    const ids = articles.map((a) => a.id.trim());
    if (new Set(ids).size !== ids.length) { setMessage("文章标识（id）不能重复"); return; }
    const parsed = DocsArticlesSchema.safeParse(articles);
    if (!parsed.success) { setMessage(parsed.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("；")); return; }
    setBusy(true);
    const r = await adminFetch("/api/v1/admin/configs", { method: "PUT", body: JSON.stringify({ configKey: "docs.articles", configValue: JSON.stringify(parsed.data) }) });
    setBusy(false);
    setMessage(r.ok ? "帮助文档已保存，刷新 /docs 可见" : (r.message ?? "保存失败"));
  }

  return (
    <section className="space-y-5">
      <header>
        <h2 className="text-lg font-semibold text-slate-900">帮助文档</h2>
        <p className="mt-2 text-sm text-slate-600">/docs 文档中心的文章内容。分组相同会合并到左侧同一目录；「文章标识」为锚点，须唯一、非空、只用字母数字短横线。最多 24 篇，每篇最多 12 小节。</p>
      </header>
      {message && <p role="status" className="break-words rounded-lg bg-slate-100 p-3 text-sm">{message}</p>}
      {!ready && <button type="button" className="text-sm underline" onClick={() => void load()}>重新加载内容</button>}

      <div className="space-y-5">
        {articles.map((a, i) => (
          <fieldset key={i} disabled={!ready || busy} className="rounded-xl border border-slate-200 bg-white p-5 disabled:opacity-60">
            <legend className="px-2 font-semibold text-slate-800">第 {i + 1} 篇</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm text-slate-700">文章标识 id（必填，≤40 字）<Input maxLength={40} value={a.id} onChange={(e) => patchArticle(i, { id: e.target.value })} placeholder="如 start" /></label>
              <label className="block text-sm text-slate-700">分组（必填，≤40 字，如「开始使用」）<Input maxLength={40} value={a.group} onChange={(e) => patchArticle(i, { group: e.target.value })} /></label>
              <label className="block text-sm text-slate-700 sm:col-span-2">标题（必填，≤80 字）<Input maxLength={80} value={a.title} onChange={(e) => patchArticle(i, { title: e.target.value })} /></label>
              <label className="block text-sm text-slate-700 sm:col-span-2">摘要（≤200 字）<Input maxLength={200} value={a.summary} onChange={(e) => patchArticle(i, { summary: e.target.value })} /></label>
              <label className="block text-sm text-slate-700">底部链接（必填，≤200 字）<Input maxLength={200} value={a.link} onChange={(e) => patchArticle(i, { link: e.target.value })} placeholder="/user/console" /></label>
              <label className="block text-sm text-slate-700">链接文案（必填，≤40 字）<Input maxLength={40} value={a.linkLabel} onChange={(e) => patchArticle(i, { linkLabel: e.target.value })} /></label>
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-sm font-medium text-slate-700">小节（每篇至少 1 个、最多 12 个）</p>
              {a.sections.map((s, j) => (
                <div key={j} className="rounded-lg border border-slate-100 p-3">
                  <div className="flex items-end gap-2">
                    <label className="flex-1 text-sm text-slate-700">小节标题（≤80 字）<Input maxLength={80} value={s.title} onChange={(e) => patchSection(i, j, { title: e.target.value })} /></label>
                    <button type="button" onClick={() => patchArticle(i, { sections: a.sections.filter((_, sj) => sj !== j) })} className="rounded-md border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50">删除小节</button>
                  </div>
                  <label className="mt-2 block text-sm text-slate-700">小节正文（≤1000 字）<textarea className={inputClass} rows={3} maxLength={1000} value={s.text} onChange={(e) => patchSection(i, j, { text: e.target.value })} /></label>
                </div>
              ))}
              <button type="button" disabled={a.sections.length >= 12} onClick={() => patchArticle(i, { sections: [...a.sections, { title: "", text: "" }] })} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-60">添加小节</button>
            </div>

            <button type="button" onClick={() => setArticles(articles.filter((_, idx) => idx !== i))} className="mt-4 rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50">删除此文章</button>
          </fieldset>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={!ready || busy || articles.length >= 24}
          onClick={() => setArticles([...articles, { id: "", group: articles[0]?.group ?? "开始使用", title: "", summary: "", sections: [{ title: "", text: "" }], link: "/", linkLabel: "了解更多" }])}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm disabled:opacity-60"
        >
          添加文章
        </button>
        <button type="button" disabled={!ready || busy} onClick={() => void save()} className="rounded-md bg-primary px-4 py-2 text-sm text-white disabled:opacity-60">保存帮助文档</button>
      </div>
    </section>
  );
}
