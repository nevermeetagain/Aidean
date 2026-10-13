// /news/[slug] —— 资讯详情：正文 Markdown 存储，此处渲染为经服务端 sanitize 的 HTML（news-admin-cms D5）。
// 缓存策略（2026-10-09 性能改造）：原 force-dynamic 每次进入都完整 SSR 且无法被 Link 预取。
// 改 ISR revalidate=300：页面缓存 5 分钟，后台保存时 revalidatePath("/news") 即时失效。
// 未知 slug / 草稿 → notFound()，404 同样被缓存（文章后续发布时 revalidatePath 清缓存）。
import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pin } from "lucide-react";

import { getPublishedNews, listPublishedNews } from "../../../../lib/features/news/repository";

export const revalidate = 300;

interface NewsDetailProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: NewsDetailProps): Promise<Metadata> {
  const { slug } = await params;
  const item = await getPublishedNews(slug);
  // 骨架屏流式输出前抛 404：(site)/loading.tsx 的 Suspense 壳会把页面级 notFound 的响应码锁成 200，
  // 在 metadata 阶段抛出则状态码保持 404（news-admin-cms D5「未知/草稿 → 404」）。
  if (!item) notFound();
  return { title: `${item.title} · Aidean`, description: item.summary };
}

export default async function NewsDetailPage({ params }: NewsDetailProps) {
  const { slug } = await params;
  const item = await getPublishedNews(slug);
  if (!item) notFound();

  const all = await listPublishedNews();
  const others = all.filter((n) => n.slug !== item.slug);
  const related = [...others.filter((n) => n.category === item.category), ...others.filter((n) => n.category !== item.category)].slice(0, 3);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <Link href="/news" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary">
        <ArrowLeft size={15} /> 返回资讯
      </Link>
      <article className="mt-6">
        <p className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">{item.category}</span>
          {item.pinned ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
              <Pin size={11} /> 置顶
            </span>
          ) : null}
          <time dateTime={item.date}>{item.date}</time>
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">{item.title}</h1>
        {item.summary ? (
          <p className="mt-5 border-l-2 border-primary/40 pl-4 text-sm leading-7 text-muted-foreground">{item.summary}</p>
        ) : null}
        {/* 服务端 markdown → sanitize-html 白名单净化的 HTML（链接 scheme/图片域名双重把关），此处只接受净化结果。 */}
        <div className="news-content mt-8" dangerouslySetInnerHTML={{ __html: item.html }} />
      </article>
      {related.length > 0 ? (
        <section className="mt-14 border-t border-border pt-8">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">延伸阅读</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {related.map((rel) => (
              <Link key={rel.slug} href={`/news/${rel.slug}`} className="group rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40">
                <p className="text-xs text-muted-foreground">
                  <time dateTime={rel.date}>{rel.date}</time>
                </p>
                <p className="mt-2 text-sm font-medium leading-snug group-hover:text-primary">{rel.title}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
