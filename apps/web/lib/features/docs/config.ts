import { unstable_cache } from "next/cache";
import type { PrismaClient } from "@prisma/client";
import { parseDocsArticles, DOCS_ARTICLES_DEFAULT, type DocsArticle } from "@aidean/shared";
import { prisma } from "../../db/prisma";

/**
 * S4 帮助文档读服务（docs.articles 配置键）。
 * - 缺行/非法/DB 不可用一律回退 shared DEFAULT（与重构前 /docs 硬编码逐字一致，页面不崩）；
 * - `unstable_cache` tag `site-docs`，后台 PUT docs 键时 revalidateTag + revalidatePath("/docs") 即时生效。
 */
export async function loadDocsArticles(client: PrismaClient = prisma): Promise<DocsArticle[]> {
  try {
    const row = await client.systemConfig.findUnique({
      where: { configKey: "docs.articles" },
      select: { configValue: true },
    });
    return parseDocsArticles(row?.configValue);
  } catch {
    return DOCS_ARTICLES_DEFAULT.map((a) => ({ ...a, sections: a.sections.map((s) => ({ ...s })) }));
  }
}

export const getDocsArticles = unstable_cache(loadDocsArticles, ["docs-articles"], {
  tags: ["site-docs"],
  revalidate: 600,
});
