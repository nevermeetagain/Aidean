/**
 * @deprecated S7（finalize-admin-ia-and-ops-gaps B3）起由 prisma/seed-official-news.ts 取代：
 * 官方静态文章统一归入「官方公告」类别，全量 seed.ts 亦改调 seedOfficialNewsItems。本文件保留作历史底稿，不再被引用。
 *
 * 资讯幂等种子（news-admin-cms）：按 slug 补缺创建，绝不覆盖后台已编辑的内容。
 * 内容单一真源：lib/features/news/static-articles.ts（与前台无库时的兜底渲染同源）。
 *
 * 单独执行（只动 news_items，不触碰其他表）：
 *   cd apps/web && pnpm exec tsx prisma/seed-news.ts
 * 全量 prisma/seed.ts 也会调用 seedNewsItems（其先清空全库，故 5 条全建）。
 */
import { PrismaClient } from "@prisma/client";

import { STATIC_NEWS_ARTICLES } from "../lib/features/news/static-articles";

type NewsWriter = Pick<PrismaClient, "newsItem">;

/** 幂等：仅为库中不存在的 slug 建档（PUBLISHED、按草稿日期发布）；返回新建条数。 */
export async function seedNewsItems(client: NewsWriter): Promise<number> {
  let created = 0;
  for (const a of STATIC_NEWS_ARTICLES) {
    const existing = await client.newsItem.findUnique({ where: { slug: a.slug }, select: { id: true } });
    if (existing) continue;
    await client.newsItem.create({
      data: {
        slug: a.slug,
        title: a.title,
        summary: a.summary,
        category: a.category,
        contentMarkdown: a.contentMarkdown,
        pinned: a.pinned,
        status: "PUBLISHED",
        publishedAt: new Date(`${a.publishedAt}T00:00:00.000Z`),
      },
    });
    created += 1;
  }
  return created;
}

/* 直接执行（tsx prisma/seed-news.ts）时建库并断开；被 seed.ts import 时不自动跑。 */
const invokedDirectly = process.argv[1] !== undefined && /seed-news\.[cm]?[jt]s$/.test(process.argv[1]);
if (invokedDirectly) {
  const prisma = new PrismaClient();
  seedNewsItems(prisma)
    .then((n) => console.log(`📰 news_items：新建 ${n} 条（已存在的 slug 不覆盖）`))
    .catch((e) => {
      console.error("❌ news seed error:", e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
