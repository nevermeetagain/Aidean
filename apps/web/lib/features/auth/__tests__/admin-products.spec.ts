/**
 * /api/v1/admin/products 管理域单测（rebuild-admin-console-and-harden-auth SubTask 2.4.2）。
 *
 * 覆盖 checklist 2-1（守卫矩阵）/2-5（audit）与 spec「产品管理」：
 * - GET：放行后全量（含 DISABLED）按 sortOrder；benefits Json 还原数组；
 * - POST：新建 + AuditLog(action=1)；slug 重复（P2002）→ 400；
 * - PATCH [id]：白名单 + revalidatePath 三目标（"/"、"/products"、"/products/<slug>"）；DELETE [id]：软删 + revalidate。
 * #73 补 displayName/category 两键的白名单命中、置 null 清空与非法 category 拒脏。
 */
import { Prisma } from "@prisma/client";

import { beforeEach, describe, expect, it, vi } from "vitest";

const guardStub = vi.hoisted(() => ({ requireAdminApi: vi.fn() }));
const prismaState = vi.hoisted(() => ({
  product: { findMany: vi.fn(), create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
}));
const auditStub = vi.hoisted(() => ({ writeAudit: vi.fn() }));
const cacheStub = vi.hoisted(() => ({ revalidatePath: vi.fn() }));

vi.mock("../session", () => guardStub);
vi.mock("../../../db/prisma", () => ({ prisma: prismaState }));
vi.mock("../../../../app/api/v1/_lib/audit", () => auditStub);
vi.mock("next/cache", () => cacheStub);

import { ApiError, ERROR_CODES } from "../../../../app/api/v1/_lib/errors";
const productsRoute = await import("../../../../app/api/v1/admin/products/route");
const productDetailRoute = await import("../../../../app/api/v1/admin/products/[id]/route");

const SESSION_OK = { userId: "u-admin", tier: "PRO" };
const FORBID = () => new ApiError(ERROR_CODES.FORBIDDEN, "需要管理员权限");

function productRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "p-1",
    slug: "aideanwiki",
    name: "AideanWiki",
    displayName: "独立知识百科",
    category: "PARTNER",
    tagline: "知识库",
    description: "desc",
    badge: "已上线",
    benefits: ["个人版免费可用", "多源检索"],
    status: "ACTIVE",
    sortOrder: 10,
    ...overrides,
  };
}

function p2002(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "5.22.0",
  });
}

beforeEach(() => {
  vi.resetAllMocks(); // resetAllMocks 清空 mockResolvedValueOnce 队列（clearAllMocks 不清，防用例间串扰）
});

describe("GET/POST /api/v1/admin/products", () => {
  it("① 放行 → 200；benefits Json 还原数组；DISABLED 亦返回（管理面全量）", async () => {
    guardStub.requireAdminApi.mockResolvedValueOnce(SESSION_OK);
    prismaState.product.findMany.mockResolvedValueOnce([
      productRow(),
      productRow({ id: "p-2", slug: "wechatrag", status: "DISABLED", sortOrder: 20 }),
    ]);
    const res = await productsRoute.GET(new Request("http://localhost/api/v1/admin/products"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(body.data.products).toHaveLength(2);
    expect(body.data.products[0].benefits).toEqual(["个人版免费可用", "多源检索"]);
    expect(prismaState.product.findMany.mock.calls[0][0].orderBy).toEqual([
      { sortOrder: "asc" },
      { createdAt: "desc" },
    ]);
  });

  it("② 非管理员 → 403", async () => {
    guardStub.requireAdminApi.mockRejectedValueOnce(FORBID());
    const res = await productsRoute.GET(new Request("http://localhost/api/v1/admin/products"));
    expect(res.status).toBe(403);
  });

  it("③ POST 新建 → 200 + AuditLog(action=1, tableName=products)", async () => {
    guardStub.requireAdminApi.mockResolvedValueOnce(SESSION_OK);
    prismaState.product.create.mockResolvedValueOnce({ id: "p-new", slug: "ragflow", name: "RagFlow" });
    const res = await productsRoute.POST(
      new Request("http://localhost/api/v1/admin/products", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug: "ragflow", name: "RagFlow", benefits: ["a"], sortOrder: 40 }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.product.slug).toBe("ragflow");
    expect(auditStub.writeAudit).toHaveBeenCalledOnce();
    expect(auditStub.writeAudit.mock.calls[0][0].action).toBe(1);
  });

  it("④ slug 重复（P2002）→ 400「产品 slug 已存在」", async () => {
    guardStub.requireAdminApi.mockResolvedValueOnce(SESSION_OK);
    prismaState.product.create.mockRejectedValueOnce(p2002());
    const res = await productsRoute.POST(
      new Request("http://localhost/api/v1/admin/products", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug: "aideanwiki", name: "Dup" }),
      })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain("slug 已存在");
    expect(auditStub.writeAudit).not.toHaveBeenCalled();
  });

  it("⑤ slug 格式非法（大写）→ 400，不触 create", async () => {
    guardStub.requireAdminApi.mockResolvedValueOnce(SESSION_OK);
    const res = await productsRoute.POST(
      new Request("http://localhost/api/v1/admin/products", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug: "BadSlug", name: "X" }),
      })
    );
    expect(res.status).toBe(400);
    expect(prismaState.product.create).not.toHaveBeenCalled();
  });
});

describe("PATCH/DELETE /api/v1/admin/products/[id]", () => {
  it("⑥ PATCH 编辑 → 200 + revalidatePath('/products') + AuditLog(action=2)", async () => {
    guardStub.requireAdminApi.mockResolvedValueOnce(SESSION_OK);
    prismaState.product.findUnique.mockResolvedValueOnce(productRow());
    prismaState.product.update.mockResolvedValueOnce({ id: "p-1", slug: "aideanwiki", name: "AideanWiki Pro", status: "ACTIVE" });
    const res = await productDetailRoute.PATCH(
      new Request("http://localhost/api/v1/admin/products/p-1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "AideanWiki Pro", badge: "已上线" }),
      }),
      { params: Promise.resolve({ id: "p-1" }) }
    );
    expect(res.status).toBe(200);
    const update = prismaState.product.update.mock.calls[0][0];
    expect(update.data).toEqual({ name: "AideanWiki Pro", badge: "已上线" });
    expect(cacheStub.revalidatePath).toHaveBeenCalledWith("/products");
    expect(cacheStub.revalidatePath).toHaveBeenCalledWith("/");
    expect(cacheStub.revalidatePath).toHaveBeenCalledWith("/products/aideanwiki");
    expect(auditStub.writeAudit.mock.calls[0][0].action).toBe(2);
  });

  it("⑦ DELETE 软删 → deletedAt 置位 + status=DISABLED + revalidatePath", async () => {
    guardStub.requireAdminApi.mockResolvedValueOnce(SESSION_OK);
    prismaState.product.findUnique.mockResolvedValueOnce(productRow());
    prismaState.product.update.mockResolvedValueOnce({ id: "p-1", slug: "aideanwiki", deletedAt: new Date() });
    const res = await productDetailRoute.DELETE(
      new Request("http://localhost/api/v1/admin/products/p-1", { method: "DELETE" }),
      { params: Promise.resolve({ id: "p-1" }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.deleted).toBe(true);
    const update = prismaState.product.update.mock.calls[0][0];
    expect(update.data.status).toBe("DISABLED");
    expect(update.data.deletedAt).toBeInstanceOf(Date);
    expect(cacheStub.revalidatePath).toHaveBeenCalledWith("/products");
    expect(cacheStub.revalidatePath).toHaveBeenCalledWith("/");
    expect(auditStub.writeAudit.mock.calls[0][0].action).toBe(3);
  });

  it("⑧ 产品不存在 → 400", async () => {
    guardStub.requireAdminApi.mockResolvedValueOnce(SESSION_OK);
    prismaState.product.findUnique.mockResolvedValueOnce(null);
    const res = await productDetailRoute.DELETE(
      new Request("http://localhost/api/v1/admin/products/p-ghost", { method: "DELETE" }),
      { params: Promise.resolve({ id: "p-ghost" }) }
    );
    expect(res.status).toBe(400);
  });

  // add-subplatform-showcase-pages SubTask 1.2.1：intro 透传与拒脏
  it("⑨ PATCH 携带合法 intro → 校验通过落库 + revalidatePath 含详情页路径", async () => {
    guardStub.requireAdminApi.mockResolvedValueOnce(SESSION_OK);
    prismaState.product.findUnique.mockResolvedValueOnce(productRow());
    prismaState.product.update.mockResolvedValueOnce({ id: "p-1", slug: "aideanwiki", name: "AideanWiki", status: "ACTIVE" });
    const intro = { version: 1, links: [{ label: "仓库", url: "https://github.com/aideanew/Aidean", kind: "repo" }], facts: [{ group: "技术栈", items: [{ label: "后端", value: "Next.js 15" }] }] };
    const res = await productDetailRoute.PATCH(
      new Request("http://localhost/api/v1/admin/products/p-1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ intro }),
      }),
      { params: Promise.resolve({ id: "p-1" }) }
    );
    expect(res.status).toBe(200);
    const update = prismaState.product.update.mock.calls[0][0];
    expect(update.data.intro.links[0].url).toBe("https://github.com/aideanew/Aidean");
    expect(update.data.intro.facts).toHaveLength(1);
    expect(cacheStub.revalidatePath).toHaveBeenCalledWith("/products/aideanwiki");
  });

  it("⑩ PATCH 携带 javascript: 链接 → 400，不触 update/audit", async () => {
    guardStub.requireAdminApi.mockResolvedValueOnce(SESSION_OK);
    prismaState.product.findUnique.mockResolvedValueOnce(productRow());
    const res = await productDetailRoute.PATCH(
      new Request("http://localhost/api/v1/admin/products/p-1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ intro: { links: [{ label: "毒", url: "javascript:alert(1)" }] } }),
      }),
      { params: Promise.resolve({ id: "p-1" }) }
    );
    expect(res.status).toBe(400);
    expect(prismaState.product.update).not.toHaveBeenCalled();
    expect(auditStub.writeAudit).not.toHaveBeenCalled();
  });

  it("⑪ intro 置 null → Prisma.DbNull 显式清空", async () => {
    guardStub.requireAdminApi.mockResolvedValueOnce(SESSION_OK);
    prismaState.product.findUnique.mockResolvedValueOnce(productRow());
    prismaState.product.update.mockResolvedValueOnce({ id: "p-1", slug: "aideanwiki", name: "AideanWiki", status: "ACTIVE" });
    const res = await productDetailRoute.PATCH(
      new Request("http://localhost/api/v1/admin/products/p-1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ intro: null }),
      }),
      { params: Promise.resolve({ id: "p-1" }) }
    );
    expect(res.status).toBe(200);
    expect(prismaState.product.update.mock.calls[0][0].data.intro).toBe(Prisma.DbNull);
  });

  // #73 displayName / category 两键白名单（#71 新增字段此前零覆盖）
  it("⑫ PATCH displayName+category → 命中白名单并原值透传落库", async () => {
    guardStub.requireAdminApi.mockResolvedValueOnce(SESSION_OK);
    prismaState.product.findUnique.mockResolvedValueOnce(productRow());
    prismaState.product.update.mockResolvedValueOnce({ id: "p-1", slug: "aideanwiki", name: "AideanWiki", displayName: "独立知识百科", category: "OFFERING", status: "ACTIVE" });
    const res = await productDetailRoute.PATCH(
      new Request("http://localhost/api/v1/admin/products/p-1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName: "独立知识百科", category: "OFFERING" }),
      }),
      { params: Promise.resolve({ id: "p-1" }) }
    );
    expect(res.status).toBe(200);
    expect(prismaState.product.update.mock.calls[0][0].data).toEqual({ displayName: "独立知识百科", category: "OFFERING" });
    expect(auditStub.writeAudit.mock.calls[0][0].action).toBe(2);
  });

  it("⑬ displayName/category 置 null → 显式清空（不落成 undefined）", async () => {
    guardStub.requireAdminApi.mockResolvedValueOnce(SESSION_OK);
    prismaState.product.findUnique.mockResolvedValueOnce(productRow());
    prismaState.product.update.mockResolvedValueOnce({ id: "p-1", slug: "aideanwiki", name: "AideanWiki", displayName: null, category: null, status: "ACTIVE" });
    const res = await productDetailRoute.PATCH(
      new Request("http://localhost/api/v1/admin/products/p-1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName: null, category: null }),
      }),
      { params: Promise.resolve({ id: "p-1" }) }
    );
    expect(res.status).toBe(200);
    const data = prismaState.product.update.mock.calls[0][0].data;
    expect(data.displayName).toBe(null);
    expect(data.category).toBe(null);
  });

  it("⑭ PATCH 非法 category → 400，不触 update/audit", async () => {
    guardStub.requireAdminApi.mockResolvedValueOnce(SESSION_OK);
    prismaState.product.findUnique.mockResolvedValueOnce(productRow());
    const res = await productDetailRoute.PATCH(
      new Request("http://localhost/api/v1/admin/products/p-1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ category: "ENTERPRISE" }),
      }),
      { params: Promise.resolve({ id: "p-1" }) }
    );
    expect(res.status).toBe(400);
    expect(prismaState.product.update).not.toHaveBeenCalled();
    expect(auditStub.writeAudit).not.toHaveBeenCalled();
  });
});

