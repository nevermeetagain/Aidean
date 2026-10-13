/**
 * 官方资讯迁库种子（S7 · finalize-admin-ia-and-ops-gaps B3 已裁决＝迁入 DB）。
 *
 * 目的：把 lib/features/news/static-articles.ts 的 5 篇官方静态草稿迁入 NewsItem，
 * 并归集到统一类别「官方公告」，使后台 NewsManager 可按该类别一键筛选编辑；前台改读 DB（不再兜底静态）。
 *
 * 幂等策略：按 slug upsert——不存在则建档（category=官方公告、status=PUBLISHED、publishedAt 取原文日），
 * 已存在则仅归集类别（把 category 置为官方公告），绝不覆盖运营在后台编辑过的正文/标题/置顶/发布时间。可反复执行。
 *
 * 零 schema 迁移：复用既有 NewsItem.category 字段（"官方公告" 为 S7 新增白名单值）。
 *
 * 单独执行（只动 news_items，不触碰其他表）：
 *   pnpm --filter web exec tsx prisma/seed-official-news.ts
 * 全量 prisma/seed.ts 亦调用 seedOfficialNewsItems（其先清空 news_items，故 5 篇全建并归集）。
 */
import { PrismaClient } from "@prisma/client";

import { STATIC_NEWS_ARTICLES } from "../lib/features/news/static-articles";

/** S7 归集类别：官方静态文章统一入此类，便于后台按类别筛选。 */
const OFFICIAL_NEWS_CATEGORY = "官方公告";

type NewsWriter = Pick<PrismaClient, "newsItem">;

/** 幂等 upsert 官方资讯：返回本次新建或归集的条数（可重跑，不产生重复）。 */
export async function seedOfficialNewsItems(client: NewsWriter): Promise<number> {
  let handled = 0;
  for (const a of STATIC_NEWS_ARTICLES) {
    const existing = await client.newsItem.findUnique({ where: { slug: a.slug }, select: { id: true, category: true } });
    if (existing) {
      // 已存在：仅归集到「官方公告」（保护运营已编辑的正文/标题/置顶/发布时间）
      if (existing.category !== OFFICIAL_NEWS_CATEGORY) {
        await client.newsItem.update({ where: { id: existing.id }, data: { category: OFFICIAL_NEWS_CATEGORY } });
      }
      handled += 1;
      continue;
    }
    await client.newsItem.create({
      data: {
        slug: a.slug,
        title: a.title,
        summary: a.summary,
        category: OFFICIAL_NEWS_CATEGORY,
        contentMarkdown: a.contentMarkdown,
        pinned: a.pinned,
        status: "PUBLISHED",
        publishedAt: new Date(`${a.publishedAt}T00:00:00.000Z`),
      },
    });
    handled += 1;
  }
  return handled;
}

/* 直接执行（tsx prisma/seed-official-news.ts）时建库并断开；被 seed.ts import 时不自动跑。 */
const invokedDirectly = process.argv[1] !== undefined && /seed-official-news\.[cm]?[jt]s$/.test(process.argv[1]);
if (invokedDirectly) {
  const prisma = new PrismaClient();
  seedOfficialNewsItems(prisma)
    .then((n) => console.log(`📰 news_items（官方公告）：新建/归集 ${n} 条（已存在 slug 仅归集类别，不覆盖正文）`))
    .catch((e) => {
      console.error("❌ official news seed error:", e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
