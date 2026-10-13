"use client";

// S4「可见即可改」：/docs 文档中心渲染体（客户端，接收 articles 配置数据）。
// 原「use client 硬编码 ARTICLES」拆为「RSC 读配置 + 本组件渲染」，搜索/哈希导航逻辑不变。
import Link from "next/link";
import { useEffect, useState } from "react";
import { BookOpen, Search, ArrowUpRight, ChevronRight } from "lucide-react";
import { docsGroupsOf, type DocsArticle } from "@aidean/shared";

export function DocsReader({ articles }: { articles: DocsArticle[] }) {
  const [active, setActive] = useState(articles[0]?.id ?? "start");
  const [query, setQuery] = useState("");
  useEffect(() => {
    const sync = () => { const id = window.location.hash.slice(1); setActive(articles.some((a) => a.id === id) ? id : (articles[0]?.id ?? "start")); };
    sync(); window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [articles]);
  const article = articles.find((item) => item.id === active) ?? articles[0];
  const term = query.trim().toLocaleLowerCase();
  const filtered = articles.filter((item) => [item.title, item.summary, ...item.sections.flatMap((s) => [s.title, s.text])].join(" ").toLocaleLowerCase().includes(term));
  if (!article) {
    return <main className="mx-auto max-w-6xl px-4 py-12 text-center text-sm text-muted-foreground">暂无文档内容。</main>;
  }
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-12">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-5 border-b border-border pb-7">
        <div><p className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-primary"><BookOpen size={16} /> AIDEAN / GUIDE</p><h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">文档中心</h1><p className="mt-3 text-sm text-muted-foreground">从第一次探索，到每一次可靠调用。</p></div>
        <Link href="/user/console" className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm transition-colors hover:bg-muted">进入控制台 <ArrowUpRight size={15} /></Link>
      </header>
      <div className="grid gap-6 md:grid-cols-[240px_minmax(0,1fr)] md:gap-10">
        <aside className="self-start rounded-2xl border border-border bg-card p-4 md:sticky md:top-24">
          <label className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5"><Search size={16} className="shrink-0 text-muted-foreground" /><input aria-label="搜索文档" placeholder="搜索文档内容…" type="search" value={query} onChange={(e) => setQuery(e.target.value)} className="min-w-0 w-full bg-transparent text-sm outline-none" /></label>
          <nav aria-label="文档目录" className="mt-5 space-y-4">
            {docsGroupsOf(articles).map((group) => {
              const items = filtered.filter((item) => item.group === group);
              return items.length > 0 ? <div key={group}><p className="mb-2 px-2 text-[11px] font-medium tracking-wider text-muted-foreground">{group}</p><div className="space-y-1">{items.map((item) => <a key={item.id} href={`#${item.id}`} aria-current={active === item.id ? "page" : undefined} onClick={() => setActive(item.id)} className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors ${active === item.id ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>{item.title}<ChevronRight size={14} /></a>)}</div></div> : null;
            })}
            {filtered.length === 0 && <p role="status" className="px-2 text-sm leading-6 text-muted-foreground">没有找到相关文档，请换一个关键词。</p>}
          </nav>
          <p className="mt-6 border-t border-border pt-4 text-xs leading-5 text-muted-foreground">搜索覆盖标题与正文。账号状态、价格与额度以页面实时显示为准。</p>
        </aside>
        <article aria-label={article.title} className="min-w-0 rounded-2xl border border-border bg-card p-6 md:p-10">
          <div className="mb-8 border-b border-border pb-7"><p className="mb-4 text-xs text-muted-foreground">文档中心 / {article.group}</p><h2 className="text-2xl font-semibold tracking-tight md:text-3xl">{article.title}</h2><p className="mt-4 text-sm leading-7 text-muted-foreground">{article.summary}</p></div>
          <div className="space-y-9">{article.sections.map((section) => <section key={section.title}><h3 className="mb-3 text-base font-semibold">{section.title}</h3><p className="max-w-prose text-sm leading-8 text-muted-foreground">{section.text}</p></section>)}</div>
          <footer className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6"><p className="text-xs text-muted-foreground">Aidean 使用指南 · 以实际功能为准</p><Link href={article.link} className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">{article.linkLabel}<ArrowUpRight size={15} /></Link></footer>
        </article>
      </div>
    </main>
  );
}
