"use client";

// /news 分类过滤客户端组件（导航性能修复）。
// 背景：原 page 直接 await searchParams（?cat=）→ 请求态 → force-dynamic → <Link> 无法预取
// → 生产点击「资讯」实测 ~379ms（纯客户端等待，服务端仅 ~6ms）。
// 现页面本体改为静态 ISR（revalidate=300，可预取），过滤逻辑迁到本客户端组件：
// items 由服务端一次性传入（含在预取的 RSC 载荷内），useSearchParams 仅决定前端展示，
// 不再触发任何服务端往返。分类 Chip 仍为 <Link href="/news?cat=X">，切换走客户端过滤。
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Pin } from "lucide-react";
import { NEWS_CATEGORIES, isNewsCategory } from "@aidean/shared";

import type { NewsCard } from "../../lib/features/news/repository";

function Chip({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={
        active
          ? "rounded-full bg-primary px-3.5 py-1.5 text-sm font-medium text-[var(--primary-foreground)]"
          : "rounded-full border border-border bg-card px-3.5 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
      }
    >
      {label}
    </Link>
  );
}

function LeadCard({ item }: { item: NewsCard }) {
  return (
    <Link
      href={`/news/${item.slug}`}
      className="group mb-8 block overflow-hidden rounded-2xl border border-border bg-card p-7 transition-colors hover:border-primary/40 sm:p-9"
    >
      <p className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">{item.category}</span>
        {item.pinned ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
            <Pin size={11} /> 置顶
          </span>
        ) : null}
        <time dateTime={item.date}>{item.date}</time>
      </p>
      <h2 className="mt-4 text-2xl font-semibold tracking-tight group-hover:text-primary">{item.title}</h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">{item.summary}</p>
      <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
        阅读全文 <ArrowRight size={15} />
      </span>
    </Link>
  );
}

function GridCard({ item }: { item: NewsCard }) {
  return (
    <Link
      href={`/news/${item.slug}`}
      className="group flex flex-col rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/40"
    >
      <p className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground/70">{item.category}</span>
        {item.pinned ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
            <Pin size={10} /> 置顶
          </span>
        ) : null}
        <time dateTime={item.date}>{item.date}</time>
      </p>
      <h2 className="mt-4 text-lg font-semibold leading-snug group-hover:text-primary">{item.title}</h2>
      <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">{item.summary}</p>
    </Link>
  );
}

export function NewsList({ items }: { items: NewsCard[] }) {
  const catParam = useSearchParams().get("cat") ?? undefined;
  const activeCat = catParam && isNewsCategory(catParam) ? catParam : undefined;
  return <NewsListView items={items} activeCat={activeCat} />;
}

/**
 * 纯展示（不读 useSearchParams）：供 /news 的 Suspense fallback 服务端直出「全部」列表，
 * 水合后与 NewsList 结构一致，消除 fallback→列表替换造成的布局位移（UX-29 CLS）。
 */
export function NewsListView({ items, activeCat }: { items: NewsCard[]; activeCat?: string }) {
  const filtered = activeCat ? items.filter((n) => n.category === activeCat) : items;
  const [lead, ...rest] = filtered;

  return (
    <>
      <nav aria-label="资讯分类" className="mb-8 flex flex-wrap gap-2">
        <Chip href="/news" label="全部" active={!activeCat} />
        {NEWS_CATEGORIES.map((c) => (
          <Chip key={c} href={`/news?cat=${encodeURIComponent(c)}`} label={c} active={activeCat === c} />
        ))}
      </nav>

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
          该分类下暂无资讯，试试切换其他分类。
        </p>
      ) : (
        <>
          {lead ? <LeadCard item={lead} /> : null}
          {rest.length > 0 ? (
            <div className="grid gap-5 md:grid-cols-3">{rest.map((item) => <GridCard key={item.slug} item={item} />)}</div>
          ) : null}
        </>
      )}
    </>
  );
}
