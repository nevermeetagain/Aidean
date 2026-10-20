/**
 * TASK-033 · S5 全局搜索服务（GET /api/v1/search 的查询层）。
 *
 * 口径（卡面 + 契约 API-012）：
 * - 三路独立查询 Promise.all 并发，互不阻塞；各类型 take=limit（每类上限）；
 * - 模糊匹配 contains + mode:"insensitive"，不建扩展、不加索引（无基线禁止优化）；
 * - 可见性口径与现行列表 API 一致：
 *     AiModel   未软删且 isActive + status=ACTIVE（同 lib/features/ladder/repository.ts listModels）；
 *     Product   status=ACTIVE 且未软删；
 *     NewsItem  status=PUBLISHED（草稿不出现在公开搜索）。
 * - 命中映射 SearchHit（契约 SearchHitSchema）：href 均为站内绝对路径。
 */
import type { PrismaClient } from "@prisma/client";

import type { SearchHit, SearchQuery } from "@aidean/shared";

export type SearchableType = SearchQuery["types"][number];

/** 模型名/码模糊命中（大小写不敏感） */
function modelWhere(q: string) {
  const contains = { contains: q, mode: "insensitive" as const };
  return {
    isActive: true,
    status: "ACTIVE" as const,
    deletedAt: null as null,
    OR: [
      { nameDisplay: contains },
      { nameCn: contains },
      { nameEn: contains },
      { modelCode: contains },
    ],
  };
}

function productWhere(q: string) {
  const contains = { contains: q, mode: "insensitive" as const };
  return {
    status: "ACTIVE" as const,
    deletedAt: null as null,
    OR: [{ name: contains }, { displayName: contains }],
  };
}

function newsWhere(q: string) {
  const contains = { contains: q, mode: "insensitive" as const };
  return { status: "PUBLISHED" as const, OR: [{ title: contains }, { summary: contains }] };
}

async function searchModels(client: PrismaClient, q: string, take: number): Promise<SearchHit[]> {
  const rows = await client.aiModel.findMany({
    where: modelWhere(q),
    take,
    orderBy: [{ popularityScore: "desc" }, { id: "asc" }],
    select: { id: true, slug: true, nameDisplay: true, nameCn: true, nameEn: true, modelCode: true },
  });
  return rows.map((m) => ({
    type: "model" as const,
    id: m.id,
    title: m.nameDisplay,
    subtitle: m.nameCn ?? m.nameEn ?? m.modelCode,
    href: `/models/${m.slug}`,
  }));
}

async function searchProducts(client: PrismaClient, q: string, take: number): Promise<SearchHit[]> {
  const rows = await client.product.findMany({
    where: productWhere(q),
    take,
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    select: { id: true, slug: true, name: true, displayName: true, tagline: true },
  });
  return rows.map((p) => ({
    type: "product" as const,
    id: p.id,
    title: p.displayName || p.name,
    subtitle: p.tagline ?? null,
    href: `/products/${p.slug}`,
  }));
}

async function searchNews(client: PrismaClient, q: string, take: number): Promise<SearchHit[]> {
  const rows = await client.newsItem.findMany({
    where: newsWhere(q),
    take,
    orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }, { id: "asc" }],
    select: { id: true, slug: true, title: true, summary: true },
  });
  return rows.map((n) => ({
    type: "news" as const,
    id: n.id,
    title: n.title,
    subtitle: n.summary || null,
    href: `/news/${n.slug}`,
  }));
}

/**
 * 全局搜索：按请求 types 只发起需要的查询，三路 Promise.all 并发。
 * 返回分组命中（顺序与请求 types 一致，未请求的类型不出现）。
 */
export async function searchAll(client: PrismaClient, query: SearchQuery): Promise<SearchHit[]> {
  const { q, types, limit } = query;
  const runners: Array<(client: PrismaClient, q: string, take: number) => Promise<SearchHit[]>> = [];
  for (const t of types) {
    if (t === "model") runners.push(searchModels);
    else if (t === "product") runners.push(searchProducts);
    else runners.push(searchNews);
  }
  const groups = await Promise.all(runners.map((run) => run(client, q, limit)));
  return groups.flat();
}
