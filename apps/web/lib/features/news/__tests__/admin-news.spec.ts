/**
 * /api/v1/admin/news 路由单测（news-admin-cms T3）：prisma/session/audit/revalidate 全 mock，
 * 覆盖 GET 原样回传 Markdown、POST 发布补 publishedAt、PATCH 局部更新与首次发布、硬删审计、slug 冲突与校验失败。
 */
import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  newsItem: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
}));
const auth = vi.hoisted(() => ({ requireAdminApi: vi.fn() }));
const audit = vi.hoisted(() => ({ writeAudit: vi.fn() }));
const cache = vi.hoisted(() => ({ revalidatePath: vi.fn() }));

vi.mock("../../../db/prisma", () => ({ prisma: db }));
vi.mock("../../auth/session", () => auth);
vi.mock("../../../../app/api/v1/_lib/audit", () => audit);
vi.mock("next/cache", () => cache);

import { DELETE, PATCH } from "../../../../app/api/v1/admin/news/[id]/route";
import { GET, POST } from "../../../../app/api/v1/admin/news/route";

function row(over: Record<string, unknown> = {}) {
  return {
    id: "n1",
    slug: "test-news",
    title: "测试资讯",
    summary: "摘要",
    category: "AI",
    contentMarkdown: "[a](x(y) 原文不回显",
    pinned: false,
    status: "PUBLISHED",
    publishedAt: new Date("2026-09-10T00:00:00Z"),
    createdAt: new Date("2026-09-10T00:00:00Z"),
    updatedAt: new Date("2026-09-10T00:00:00Z"),
    ...over,
  };
}

const req = (method: string, url: string, body?: unknown) =>
  new Request(`http://localhost${url}`, { method, body: body === undefined ? undefined : JSON.stringify(body) });

beforeEach(() => {
  vi.resetAllMocks();
  auth.requireAdminApi.mockResolvedValue({ userId: "admin-1", tier: "ADMIN" });
  audit.writeAudit.mockResolvedValue(undefined);
});

describe("GET /api/v1/admin/news", () => {
  it("contents: includes draft and returns raw Markdown for re-editing", async () => {
    db.newsItem.findMany.mockResolvedValue([row({ status: "DRAFT", pinned: true })]);
    const res = await GET(req("GET", "/api/v1/admin/news"));
    const json = (await res.json()) as { data: { items: Record<string, unknown>[] } };
    expect(res.status).toBe(200);
    expect(json.data.items[0]).toMatchObject({
      slug: "test-news",
      status: "DRAFT",
      pinned: true,
      contentMarkdown: "[a](x(y) 原文不回显",
    });
    expect(cache.revalidatePath).not.toHaveBeenCalled();
  });
});

describe("POST /api/v1/admin/news", () => {
  const valid = {
    slug: "new-news",
    title: "新建",
    summary: "",
    category: "AI",
    contentMarkdown: "正文 Markdown",
    pinned: true,
    status: "PUBLISHED",
  };
  it("first publish writes publishedAt; audit and revalidate on /news", async () => {
    db.newsItem.create.mockResolvedValue({ id: "n9", slug: "new-news", title: "新建", status: "PUBLISHED", pinned: true });
    const res = await POST(req("POST", "/api/v1/admin/news", valid));
    expect(res.status).toBe(200);
    expect(db.newsItem.create.mock.calls[0]![0].data.publishedAt).toBeInstanceOf(Date);
    expect(db.newsItem.create.mock.calls[0]![0].data.pinned).toBe(true);
    expect(cache.revalidatePath).toHaveBeenCalledWith("/news");
    expect(audit.writeAudit).toHaveBeenCalledWith(expect.objectContaining({ tableName: "news_items", action: 1 }));
  });
  it("draft does not get publishedAt", async () => {
    db.newsItem.create.mockResolvedValue({ id: "n8", slug: "new-news", title: "新建", status: "DRAFT", pinned: false });
    await POST(req("POST", "/api/v1/admin/news", { ...valid, status: "DRAFT", pinned: false }));
    expect(db.newsItem.create.mock.calls[0]![0].data.publishedAt).toBeNull();
  });
  it("missing title → 400 without touching DB", async () => {
    const res = await POST(req("POST", "/api/v1/admin/news", { slug: "x", category: "AI", contentMarkdown: "a" }));
    expect(res.status).toBe(400);
    expect(db.newsItem.create).not.toHaveBeenCalled();
  });
  it("duplicate slug (P2002) → 400 with slug hint", async () => {
    db.newsItem.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError("dup", { code: "P2002", clientVersion: "5.22.0" }));
    const res = await POST(req("POST", "/api/v1/admin/news", valid));
    expect(res.status).toBe(400);
    expect(((await res.json()) as { message: string }).message).toContain("slug");
  });
});

describe("PATCH /api/v1/admin/news/[id]", () => {
  const ctx = { params: Promise.resolve({ id: "n1" }) };
  it("partial update (only pinned) updates that field; keeps existing publishedAt", async () => {
    db.newsItem.findUnique.mockResolvedValue(row());
    db.newsItem.update.mockResolvedValue({ id: "n1", slug: "test-news", title: "测试资讯", status: "PUBLISHED", pinned: true, publishedAt: new Date() });
    const res = await PATCH(req("PATCH", "/api/v1/admin/news/n1", { pinned: true }), ctx);
    expect(res.status).toBe(200);
    expect(db.newsItem.update.mock.calls[0]![0].data).toEqual({ pinned: true });
    expect(cache.revalidatePath).toHaveBeenCalledWith("/news");
    expect(audit.writeAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 2 }));
  });
  it("first DRAFT→PUBLISHED sets publishedAt", async () => {
    db.newsItem.findUnique.mockResolvedValue(row({ status: "DRAFT", publishedAt: null }));
    db.newsItem.update.mockResolvedValue({ id: "n1", slug: "test-news", title: "测试资讯", status: "PUBLISHED", pinned: false, publishedAt: new Date() });
    await PATCH(req("PATCH", "/api/v1/admin/news/n1", { status: "PUBLISHED" }), ctx);
    expect(db.newsItem.update.mock.calls[0]![0].data.publishedAt).toBeInstanceOf(Date);
  });
  it("unknown id → 400", async () => {
    db.newsItem.findUnique.mockResolvedValue(null);
    const res = await PATCH(req("PATCH", "/api/v1/admin/news/nx", { pinned: false }), ctx);
    expect(res.status).toBe(400);
    expect(db.newsItem.update).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/v1/admin/news/[id]", () => {
  const ctx = { params: Promise.resolve({ id: "n1" }) };
  it("hard delete with oldData audit", async () => {
    db.newsItem.findUnique.mockResolvedValue(row());
    const res = await DELETE(req("DELETE", "/api/v1/admin/news/n1"), ctx);
    expect(res.status).toBe(200);
    expect(db.newsItem.delete).toHaveBeenCalledWith({ where: { id: "n1" } });
    expect(cache.revalidatePath).toHaveBeenCalledWith("/news");
    expect(audit.writeAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 3 }));
  });
  it("unknown id → 400", async () => {
    db.newsItem.findUnique.mockResolvedValue(null);
    expect((await DELETE(req("DELETE", "/api/v1/admin/news/nx"), ctx)).status).toBe(400);
  });
});
