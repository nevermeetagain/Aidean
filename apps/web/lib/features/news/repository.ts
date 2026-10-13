/**
 * 资讯读模型（news-admin-cms D5 + S7 迁库 B3/Q2）：DB 为唯一真源，不再回落静态草稿。
 * 排序统一为 pinned desc → publishedAt desc → createdAt desc（置顶恒在前）。
 * 官方文章已由 prisma/seed-official-news.ts 迁入并归入「官方公告」类别；static-articles 仅供迁库底稿。
 * 仅服务端引用（prisma/sanitize-html 均 node-only）。
 */
import { isNewsCategory, type NewsCategory } from "@aidean/shared";

import { renderNewsMarkdown } from "./markdown";

export interface NewsCard {
  slug: string;
  title: string;
  summary: string;
  category: NewsCategory;
  date: string;
  pinned: boolean;
}

export interface NewsDetail extends NewsCard {
  html: string;
}

function dateOf(publishedAt: Date | null): string {
  return (publishedAt ?? new Date()).toISOString().slice(0, 10);
}

const ORDER_BY = [{ pinned: "desc" as const }, { publishedAt: "desc" as const }, { createdAt: "desc" as const }];

/** 已发布列表（前台）；DB 为唯一真源，故障时返回空列表（不再回落静态草稿）。 */
export async function listPublishedNews(): Promise<NewsCard[]> {
  try {
    const { prisma } = await import("../../db/prisma");
    const rows = await prisma.newsItem.findMany({
      where: { status: "PUBLISHED" },
      orderBy: ORDER_BY,
    });
    return rows.map((r) => ({
      slug: r.slug,
      title: r.title,
      summary: r.summary,
      category: isNewsCategory(r.category) ? r.category : "平台动态",
      date: dateOf(r.publishedAt),
      pinned: r.pinned,
    }));
  } catch {
    // 迁库后资讯以 DB 为唯一真源：读库失败返回空列表，前台显示空态，不再回落静态草稿。
    return [];
  }
}

/** 已发布详情（markdown → HTML）；未知 slug / DRAFT / 库中无 → null（调用方 notFound）；DB 故障亦返回 null。 */
export async function getPublishedNews(slug: string): Promise<NewsDetail | null> {
  try {
    const { prisma } = await import("../../db/prisma");
    const row = await prisma.newsItem.findUnique({ where: { slug } });
    if (!row || row.status !== "PUBLISHED") return null;
    return {
      slug: row.slug,
      title: row.title,
      summary: row.summary,
      category: isNewsCategory(row.category) ? row.category : "平台动态",
      date: dateOf(row.publishedAt),
      pinned: row.pinned,
      html: renderNewsMarkdown(row.contentMarkdown),
    };
  } catch {
    // 迁库后以 DB 为唯一真源：读库失败返回 null（调用方走 404），不再回落静态草稿。
    return null;
  }
}
