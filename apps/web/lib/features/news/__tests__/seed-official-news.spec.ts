/**
 * 官方资讯迁库脚本单测（S7 · finalize-admin-ia-and-ops-gaps B3）：
 * mock client 覆盖幂等 upsert——全新建档、已归集不重复、异类别归集不覆盖正文、publishedAt 归一到 UTC。
 * 纯 client 注入，无需数据库。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { STATIC_NEWS_ARTICLES } from "../static-articles";
import { seedOfficialNewsItems } from "../../../../prisma/seed-official-news";

const findUnique = vi.fn();
const create = vi.fn();
const update = vi.fn();
const client = { newsItem: { findUnique, create, update } } as never;

const TOTAL = STATIC_NEWS_ARTICLES.length;
const slugs = STATIC_NEWS_ARTICLES.map((a) => a.slug);
const first = STATIC_NEWS_ARTICLES[0]!;

beforeEach(() => {
  vi.clearAllMocks();
  create.mockResolvedValue({ id: "x" });
  update.mockResolvedValue({ id: "x" });
});

describe("seedOfficialNewsItems 幂等 upsert", () => {
  it("全新库：每篇建档为「官方公告」/PUBLISHED，返回处理条数", async () => {
    findUnique.mockResolvedValue(null);
    const n = await seedOfficialNewsItems(client);
    expect(n).toBe(TOTAL);
    expect(create).toHaveBeenCalledTimes(TOTAL);
    expect(update).not.toHaveBeenCalled();
    for (const call of create.mock.calls) {
      const data = (call[0] as { data: Record<string, unknown> }).data;
      expect(data.category).toBe("官方公告");
      expect(data.status).toBe("PUBLISHED");
      expect(data.publishedAt).toBeInstanceOf(Date);
    }
    expect(create.mock.calls.map((c) => (c[0] as { data: { slug: string } }).data.slug).sort()).toEqual(
      [...slugs].sort(),
    );
  });

  it("已归集重跑：不新建、不更新（幂等，不产生重复）", async () => {
    findUnique.mockResolvedValue({ id: "x", category: "官方公告" });
    const n = await seedOfficialNewsItems(client);
    expect(n).toBe(TOTAL);
    expect(create).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("已存在但异类别：仅归集 category，不覆盖正文", async () => {
    findUnique.mockResolvedValue({ id: "y", category: "热门" });
    const n = await seedOfficialNewsItems(client);
    expect(n).toBe(TOTAL);
    expect(create).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledTimes(TOTAL);
    for (const call of update.mock.calls) {
      expect((call[0] as { data: Record<string, unknown> }).data).toEqual({ category: "官方公告" });
    }
  });

  it("publishedAt 取原文日归一到 UTC 零点，正文原样建档", async () => {
    findUnique.mockResolvedValue(null);
    await seedOfficialNewsItems(client);
    const target = create.mock.calls.find((c) => (c[0] as { data: { slug: string } }).data.slug === first.slug);
    const data = (target![0] as { data: { publishedAt: Date; title: string; contentMarkdown: string } }).data;
    expect(data.publishedAt.toISOString()).toBe(`${first.publishedAt}T00:00:00.000Z`);
    expect(data.title).toBe(first.title);
    expect(data.contentMarkdown).toBe(first.contentMarkdown);
  });
});
