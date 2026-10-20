/**
 * TASK-033 · 全局搜索 service + route 单测。
 * prisma / rate-limit 全 mock；覆盖三路并发、可见性口径、命中映射、limit 透传、
 * 参数校验 400、限流 429、空结果形状、tookMs 计时。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  aiModel: { findMany: vi.fn() },
  product: { findMany: vi.fn() },
  newsItem: { findMany: vi.fn() },
}));
const rl = vi.hoisted(() => ({ checkFixedWindow: vi.fn(), clientIpFrom: vi.fn() }));

vi.mock("../../../db/prisma", () => ({ prisma: db }));
vi.mock("../../../rate-limit", () => rl);

import { searchAll } from "../service";
import { GET } from "../../../../app/api/v1/search/route";

function modelRow(over: Record<string, unknown> = {}) {
  return {
    id: "m-1", slug: "deepseek-v3", nameDisplay: "DeepSeek-V3", nameCn: "深度求索 V3", nameEn: null, modelCode: "deepseek-v3",
    ...over,
  };
}
function productRow(over: Record<string, unknown> = {}) {
  return { id: "p-1", slug: "chat-pro", name: "Chat Pro", displayName: "对话专业版", tagline: "更快更稳", ...over };
}
function newsRow(over: Record<string, unknown> = {}) {
  return { id: "n-1", slug: "hello", title: "平台上线", summary: "新版发布", ...over };
}

const req = (url: string) => new Request(`http://localhost${url}`);

beforeEach(() => {
  vi.resetAllMocks();
  db.aiModel.findMany.mockResolvedValue([]);
  db.product.findMany.mockResolvedValue([]);
  db.newsItem.findMany.mockResolvedValue([]);
  rl.checkFixedWindow.mockResolvedValue({ allowed: true, count: 1 });
  rl.clientIpFrom.mockReturnValue("1.2.3.4");
});

describe("[TASK-033] service.searchAll", () => {
  it("1. 默认 types：三路查询并发发起，各 take=limit", async () => {
    await searchAll(db as never, { q: "deep", types: ["model", "product", "news"], limit: 5 });
    expect(db.aiModel.findMany).toHaveBeenCalledTimes(1);
    expect(db.product.findMany).toHaveBeenCalledTimes(1);
    expect(db.newsItem.findMany).toHaveBeenCalledTimes(1);
    expect(db.aiModel.findMany.mock.calls[0][0].take).toBe(5);
    expect(db.product.findMany.mock.calls[0][0].take).toBe(5);
    expect(db.newsItem.findMany.mock.calls[0][0].take).toBe(5);
  });

  it("2. types=model：只查模型，不查产品/资讯", async () => {
    await searchAll(db as never, { q: "deep", types: ["model"], limit: 5 });
    expect(db.aiModel.findMany).toHaveBeenCalledTimes(1);
    expect(db.product.findMany).not.toHaveBeenCalled();
    expect(db.newsItem.findMany).not.toHaveBeenCalled();
  });

  it("3. 模型可见性口径：未软删 + isActive + status=ACTIVE", async () => {
    await searchAll(db as never, { q: "x", types: ["model"], limit: 5 });
    const where = db.aiModel.findMany.mock.calls[0][0].where;
    expect(where.deletedAt).toBeNull();
    expect(where.isActive).toBe(true);
    expect(where.status).toBe("ACTIVE");
  });

  it("4. contains + mode insensitive 应用于模型四字段", async () => {
    await searchAll(db as never, { q: "gpt", types: ["model"], limit: 5 });
    const or = db.aiModel.findMany.mock.calls[0][0].where.OR;
    expect(or).toHaveLength(4);
    for (const cond of or) {
      const field = Object.values(cond)[0] as Record<string, unknown>;
      expect(field).toEqual({ contains: "gpt", mode: "insensitive" });
    }
  });

  it("5. 资讯可见性口径：仅 PUBLISHED", async () => {
    await searchAll(db as never, { q: "x", types: ["news"], limit: 5 });
    expect(db.newsItem.findMany.mock.calls[0][0].where.status).toBe("PUBLISHED");
  });

  it("6. 命中映射：href 站内绝对路径、subtitle 回退与空值归 null", async () => {
    db.aiModel.findMany.mockResolvedValue([modelRow({ nameCn: null, nameEn: null })]);
    db.product.findMany.mockResolvedValue([productRow({ tagline: null })]);
    db.newsItem.findMany.mockResolvedValue([newsRow({ summary: "" })]);
    const hits = await searchAll(db as never, { q: "x", types: ["model", "product", "news"], limit: 5 });
    expect(hits).toEqual([
      { type: "model", id: "m-1", title: "DeepSeek-V3", subtitle: "deepseek-v3", href: "/models/deepseek-v3" },
      { type: "product", id: "p-1", title: "对话专业版", subtitle: null, href: "/products/chat-pro" },
      { type: "news", id: "n-1", title: "平台上线", subtitle: null, href: "/news/hello" },
    ]);
  });

  it("7. limit 透传：各类型 take 使用请求值", async () => {
    await searchAll(db as never, { q: "x", types: ["model", "news"], limit: 10 });
    expect(db.aiModel.findMany.mock.calls[0][0].take).toBe(10);
    expect(db.newsItem.findMany.mock.calls[0][0].take).toBe(10);
  });
});

describe("[TASK-033] GET /api/v1/search", () => {
  it("8. 合法请求：信封 code=0，data 形状 {q,hits,tookMs}，tookMs 非负整数", async () => {
    db.aiModel.findMany.mockResolvedValue([modelRow()]);
    const res = await GET(req("/api/v1/search?q=deep"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(body.data.q).toBe("deep");
    expect(body.data.hits).toHaveLength(1);
    expect(body.data.hits[0].href).toBe("/models/deepseek-v3");
    expect(Number.isInteger(body.data.tookMs)).toBe(true);
    expect(body.data.tookMs).toBeGreaterThanOrEqual(0);
    expect(res.headers.get("x-request-id")).toBeTruthy();
  });

  it("9. 参数非法（q 空白 / limit 越界）：40000，data=null", async () => {
    for (const url of ["/api/v1/search?q=%20%20", "/api/v1/search?q=x&limit=99", "/api/v1/search?q=x&types=model,bogus"]) {
      const res = await GET(req(url));
      const body = await res.json();
      expect(body.code).toBe(40000);
      expect(body.data).toBeNull();
    }
  });

  it("10. 限流：allowed=false → 10006/HTTP 429", async () => {
    rl.checkFixedWindow.mockResolvedValue({ allowed: false, count: 31 });
    const res = await GET(req("/api/v1/search?q=x"));
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.code).toBe(10006);
    expect(body.data).toBeNull();
  });

  it("11. 限流键为 IP 级且在业务查询之前", async () => {
    rl.checkFixedWindow.mockResolvedValue({ allowed: false, count: 31 });
    await GET(req("/api/v1/search?q=x"));
    expect(rl.checkFixedWindow).toHaveBeenCalledWith("rl:search:1.2.3.4", 30, 60);
    expect(db.aiModel.findMany).not.toHaveBeenCalled();
  });

  it("12. 空结果：hits=[]，q 透传 trim 后原值", async () => {
    const res = await GET(req("/api/v1/search?q=%20gpt%20&types=model"));
    const body = await res.json();
    expect(body.data.q).toBe("gpt");
    expect(body.data.hits).toEqual([]);
  });
});
