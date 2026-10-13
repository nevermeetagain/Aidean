/**
 * 前台 /news 与 /news/[slug] 的 SSR 契约单测（news-admin-cms D5）：
 * 置顶恒排首位、?cat= 白名单过滤（非法值回退全部）、markdown→HTML 详情渲染、
 * DRAFT/未知 slug → 404、DB 失败返回空/null（S7 纯 DB 真源，不再回落静态草稿）。prisma mock 注入；Link/notFound 以最小替身隔离 Next 运行时。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ newsItem: { findMany: vi.fn(), findUnique: vi.fn() } }));

vi.mock("../../../db/prisma", () => ({ prisma: db }));
vi.mock("next/navigation", () => ({
  notFound: vi.fn((): never => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));
vi.mock("next/link", async () => {
  const React = await import("react");
  return {
    default: (props: { href: string; className?: string; children?: React.ReactNode }) =>
      React.createElement("a", { href: props.href, className: props.className }, props.children),
  };
});

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { useSearchParams } from "next/navigation";

import { getPublishedNews, listPublishedNews } from "../repository";

import NewsDetailPage, { generateMetadata } from "../../../../app/(site)/news/[slug]/page";
import { NewsList } from "../../../../components/news/NewsList";

const article = (over: Record<string, unknown> = {}) => ({
  id: "n1",
  slug: "t1",
  title: "测试文章",
  summary: "摘要文本",
  category: "AI",
  contentMarkdown: "## Markdown 小节\n\n[a](https://ex.com/a(b)c) 链接兼容测试。",
  pinned: false,
  status: "PUBLISHED",
  publishedAt: new Date("2026-09-05T00:00:00Z"),
  createdAt: new Date("2026-09-05T00:00:00Z"),
  updatedAt: new Date("2026-09-05T00:00:00Z"),
  ...over,
});

beforeEach(() => {
  vi.resetAllMocks();
  db.newsItem.findMany.mockResolvedValue([]);
  db.newsItem.findUnique.mockResolvedValue(null);
});

describe("/news 列表数据（listPublishedNews）", () => {
  it("DB 故障时返回空列表（S7 纯 DB 真源，不再回落静态草稿）", async () => {
    db.newsItem.findMany.mockRejectedValue(new Error("offline"));
    const items = await listPublishedNews();
    expect(items).toEqual([]);
  });
  it("DB 行按置顶排序映射，未知分类兜底为平台动态", async () => {
    db.newsItem.findMany.mockResolvedValue([
      article({ slug: "a", title: "AI 观察", pinned: true }),
      article({ slug: "b", title: "外星来客", category: "外星生物" }),
    ]);
    const items = await listPublishedNews();
    expect(items.map((i) => i.title)).toEqual(["AI 观察", "外星来客"]);
    expect(items.find((i) => i.slug === "b")!.category).toBe("平台动态");
  });
});

describe("/news ?cat= 客户端过滤（NewsList）", () => {
  const feed = [
    { slug: "a", title: "热门头版", summary: "s", category: "热门" as const, date: "2026-09-05", pinned: false },
    { slug: "b", title: "AI 观察", summary: "s", category: "AI" as const, date: "2026-09-05", pinned: false },
  ];
  it("白名单分类只保留匹配项；非法分类回退全部", () => {
    const setCat = (q: string) =>
      vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams(q) as unknown as ReturnType<typeof useSearchParams>);
    setCat("cat=AI");
    const filtered = renderToStaticMarkup(React.createElement(NewsList, { items: feed }));
    expect(filtered).toContain("AI 观察");
    expect(filtered).not.toContain("热门头版");

    setCat("cat=外星生物");
    const fallback = renderToStaticMarkup(React.createElement(NewsList, { items: feed }));
    expect(fallback).toContain("热门头版");
    expect(fallback).toContain("AI 观察");
  });
});

describe("/news/[slug] 详情", () => {
  it("已发布条目：markdown 渲染为 news-content，()链接合法、script 被移除", async () => {
    db.newsItem.findUnique.mockResolvedValue(
      article({ contentMarkdown: "## 小标\n\n[a](https://ex.com/a(b)c) 测试\n\n<script>alert(1)</script>" }),
    );
    const html = renderToStaticMarkup(await NewsDetailPage({ params: Promise.resolve({ slug: "t1" }) }));
    expect(html).toMatch(/class="[^"]*news-content[^"]*"/);
    expect(html).toContain("<h2");
    expect(html).toContain('href="https://ex.com/a(b)c"');
    expect(html).not.toContain("<script");
    expect(html).not.toContain("alert");
  });
  it("DRAFT 条目对外不可见（读层返回 null → 页面走 notFound 抛错路径）", async () => {
    db.newsItem.findUnique.mockResolvedValue(article({ status: "DRAFT" }));
    await expect(getPublishedNews("t1")).resolves.toBeNull();
    // vitest 环境 next/navigation 的 react-server 桩与页面解析到的实例不同，不断言 digest，只断言页面抛出异常不渲染。
    await expect(NewsDetailPage({ params: Promise.resolve({ slug: "t1" }) })).rejects.toThrow();
    // metadata 阶段同样拦截：未知/草稿不产出标题（流式骨架屏下保住 404 语义的前置守卫）。
    await expect(generateMetadata({ params: Promise.resolve({ slug: "t1" }) })).rejects.toThrow();
  });
  it("DB 失败返回 null → 页面走 404；未知 slug 亦 404（S7 不再回落静态草稿）", async () => {
    db.newsItem.findUnique.mockRejectedValue(new Error("offline"));
    await expect(getPublishedNews("docs-center-online")).resolves.toBeNull();
    await expect(NewsDetailPage({ params: Promise.resolve({ slug: "docs-center-online" }) })).rejects.toThrow();
    await expect(getPublishedNews("ghost")).resolves.toBeNull();
    await expect(NewsDetailPage({ params: Promise.resolve({ slug: "ghost" }) })).rejects.toThrow();
  });
});
