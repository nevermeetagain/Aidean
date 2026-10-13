/**
 * /api/v1/admin/models 管理域单测（rebuild-admin-console-and-harden-auth SubTask 2.2.1）。
 *
 * 覆盖 checklist 2-1（守卫矩阵 + 白名单剔除）、2-5（audit 落库）及
 * spec「模型上下架即时生效」（isActive 变更后 revalidatePath("/models") 断言）：
 * - GET：401/403/放行 + modelCode/nameDisplay 搜索 + vendor 名称投影；
 * - PATCH：白名单字段剔除（modelCode/vendorId 不可改）、isActive 翻转 → revalidatePath("/models")、
 *         同值变更不触发 revalidate、AuditLog 落库、模型不存在 20001。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const guardStub = vi.hoisted(() => ({ requireAdminApi: vi.fn() }));
const prismaState = vi.hoisted(() => ({
  aiModel: { findMany: vi.fn(), count: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  modelChangeLog: { create: vi.fn() },
  $transaction: vi.fn(),
}));
const auditStub = vi.hoisted(() => ({ writeAudit: vi.fn() }));
const cacheStub = vi.hoisted(() => ({ revalidatePath: vi.fn() }));
// RW-3：下架即时生效升级为「两层缓存」——ISR(revalidatePath) + Redis 矩阵缓存(invalidateLadderCache)。
// ladder service 真身会触碰 Redis，单测必须桩隔离。
const ladderStub = vi.hoisted(() => ({ invalidateLadderCache: vi.fn(async () => undefined) }));

vi.mock("../session", () => guardStub);
vi.mock("../../../db/prisma", () => ({ prisma: prismaState }));
vi.mock("../../../../app/api/v1/_lib/audit", () => auditStub);
vi.mock("next/cache", () => cacheStub);
vi.mock("../../../features/ladder/service", () => ({ ladderService: ladderStub }));

import { ApiError, ERROR_CODES } from "../../../../app/api/v1/_lib/errors";
const modelsRoute = await import("../../../../app/api/v1/admin/models/route");
const modelDetailRoute = await import("../../../../app/api/v1/admin/models/[id]/route");

const SESSION_OK = { userId: "u-admin", tier: "PRO" };
const UNAUTH = () => new ApiError(ERROR_CODES.UNAUTHENTICATED, "请先登录");
const FORBID = () => new ApiError(ERROR_CODES.FORBIDDEN, "需要管理员权限");

function modelRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "m-1",
    modelCode: "gpt-4o",
    nameDisplay: "GPT-4o",
    vendor: { name: "OpenAI", nameCn: "OpenAI" },
    visibility: "PUBLIC",
    isActive: true,
    isFeatured: false,
    sortOrder: 1,
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  prismaState.modelChangeLog.create.mockResolvedValue(undefined); // writeModelChangeLog 调用
  // resetAllMocks 清空 mockResolvedValueOnce 队列（clearAllMocks 不清，防用例间串扰）
});

describe("GET /api/v1/admin/models 守卫矩阵", () => {
  it("① 未登录（10004）→ HTTP 401", async () => {
    guardStub.requireAdminApi.mockRejectedValueOnce(UNAUTH());
    const res = await modelsRoute.GET(new Request("http://localhost/api/v1/admin/models"));
    expect(res.status).toBe(401);
    expect(prismaState.aiModel.findMany).not.toHaveBeenCalled();
  });

  it("② 普通用户（10008）→ HTTP 403", async () => {
    guardStub.requireAdminApi.mockRejectedValueOnce(FORBID());
    const res = await modelsRoute.GET(new Request("http://localhost/api/v1/admin/models"));
    expect(res.status).toBe(403);
    expect(prismaState.aiModel.findMany).not.toHaveBeenCalled();
  });

  it("③ 管理员放行 → 200；modelCode/nameDisplay OR 搜索 + vendor 投影", async () => {
    guardStub.requireAdminApi.mockResolvedValueOnce(SESSION_OK);
    prismaState.$transaction.mockResolvedValueOnce([[modelRow()], 1]);
    const res = await modelsRoute.GET(
      new Request("http://localhost/api/v1/admin/models?q=gpt&page=1&pageSize=20")
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(body.data.models[0].vendorName).toBe("OpenAI");
    expect(body.data.models[0].modelCode).toBe("gpt-4o");

    const [findArgs] = prismaState.$transaction.mock.calls[0];
    const where = prismaState.aiModel.findMany.mock.calls[0][0].where;
    expect(where.OR).toHaveLength(2);
    expect(where.OR[0]).toEqual({ modelCode: { contains: "gpt", mode: "insensitive" } });
  });
});

describe("PATCH /api/v1/admin/models/[id] 白名单与 revalidate", () => {
  it("④ 下架（isActive=true→false）→ revalidatePath('/models') + AuditLog", async () => {
    guardStub.requireAdminApi.mockResolvedValueOnce(SESSION_OK);
    prismaState.aiModel.findUnique.mockResolvedValueOnce({
      id: "m-1",
      nameDisplay: "GPT-4o",
      isActive: true,
      visibility: "PUBLIC",
      isFeatured: false,
      sortOrder: 1,
      deletedAt: null,
    });
    prismaState.aiModel.update.mockResolvedValueOnce({
      id: "m-1",
      modelCode: "gpt-4o",
      isActive: false,
      nameDisplay: "GPT-4o",
    });

    const res = await modelDetailRoute.PATCH(
      new Request("http://localhost/api/v1/admin/models/m-1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isActive: false }),
      }),
      { params: Promise.resolve({ id: "m-1" }) }
    );
    expect(res.status).toBe(200);
    // isActive 值变化 → 两层缓存同时失效（RW-3）：ISR 页缓存 + Redis 天梯矩阵缓存
    expect(cacheStub.revalidatePath).toHaveBeenCalledWith("/models");
    expect(cacheStub.revalidatePath).toHaveBeenCalledWith("/ladder");
    expect(ladderStub.invalidateLadderCache).toHaveBeenCalledOnce();
    expect(auditStub.writeAudit).toHaveBeenCalledOnce();
    expect(auditStub.writeAudit.mock.calls[0][0].tableName).toBe("ai_models");
  });

  it("⑤ isActive 同值（true→true）→ 不触发 revalidatePath", async () => {
    guardStub.requireAdminApi.mockResolvedValueOnce(SESSION_OK);
    prismaState.aiModel.findUnique.mockResolvedValueOnce({
      id: "m-1",
      nameDisplay: "GPT-4o",
      isActive: true,
      visibility: "PUBLIC",
      isFeatured: false,
      sortOrder: 1,
      deletedAt: null,
    });
    prismaState.aiModel.update.mockResolvedValueOnce({
      id: "m-1",
      modelCode: "gpt-4o",
      isActive: true,
      nameDisplay: "GPT-4o",
    });

    const res = await modelDetailRoute.PATCH(
      new Request("http://localhost/api/v1/admin/models/m-1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isActive: true }),
      }),
      { params: Promise.resolve({ id: "m-1" }) }
    );
    expect(res.status).toBe(200);
    expect(cacheStub.revalidatePath).not.toHaveBeenCalled();
    expect(ladderStub.invalidateLadderCache).not.toHaveBeenCalled();
  });

  it("⑤b nameDisplay 变更（排行 entries 携带展示名）→ 同样两层失效", async () => {
    guardStub.requireAdminApi.mockResolvedValueOnce(SESSION_OK);
    prismaState.aiModel.findUnique.mockResolvedValueOnce({
      id: "m-1",
      nameDisplay: "GPT-4o",
      isActive: true,
      visibility: "PUBLIC",
      isFeatured: false,
      sortOrder: 1,
      deletedAt: null,
    });
    prismaState.aiModel.update.mockResolvedValueOnce({
      id: "m-1",
      modelCode: "gpt-4o",
      isActive: true,
      nameDisplay: "GPT-4o Turbo",
    });

    const res = await modelDetailRoute.PATCH(
      new Request("http://localhost/api/v1/admin/models/m-1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nameDisplay: "GPT-4o Turbo" }),
      }),
      { params: Promise.resolve({ id: "m-1" }) }
    );
    expect(res.status).toBe(200);
    expect(cacheStub.revalidatePath).toHaveBeenCalledWith("/models");
    expect(ladderStub.invalidateLadderCache).toHaveBeenCalledOnce();
  });

  it("⑥ 越权字段剔除：modelCode/vendorId 被 zod strip，update 仅收白名单字段", async () => {
    guardStub.requireAdminApi.mockResolvedValueOnce(SESSION_OK);
    prismaState.aiModel.findUnique.mockResolvedValueOnce({
      id: "m-1",
      nameDisplay: "GPT-4o",
      isActive: true,
      visibility: "PUBLIC",
      isFeatured: false,
      sortOrder: 1,
      deletedAt: null,
    });
    prismaState.aiModel.update.mockResolvedValueOnce({
      id: "m-1",
      modelCode: "gpt-4o",
      isActive: true,
      nameDisplay: "改名",
    });

    const res = await modelDetailRoute.PATCH(
      new Request("http://localhost/api/v1/admin/models/m-1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nameDisplay: "改名", modelCode: "hacked", vendorId: "v-9" }),
      }),
      { params: Promise.resolve({ id: "m-1" }) }
    );
    expect(res.status).toBe(200);
    const update = prismaState.aiModel.update.mock.calls[0][0];
    expect(update.data).toEqual({ nameDisplay: "改名" });
  });

  it("⑦ 模型不存在/已软删 → 20001", async () => {
    guardStub.requireAdminApi.mockResolvedValueOnce(SESSION_OK);
    prismaState.aiModel.findUnique.mockResolvedValueOnce(null);
    const res = await modelDetailRoute.PATCH(
      new Request("http://localhost/api/v1/admin/models/m-ghost", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nameDisplay: "x" }),
      }),
      { params: Promise.resolve({ id: "m-ghost" }) }
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe(20001);
  });

  it("⑧ 非法枚举 visibility → 400", async () => {
    guardStub.requireAdminApi.mockResolvedValueOnce(SESSION_OK);
    prismaState.aiModel.findUnique.mockResolvedValueOnce({
      id: "m-1",
      nameDisplay: "GPT-4o",
      isActive: true,
      visibility: "PUBLIC",
      isFeatured: false,
      sortOrder: 1,
      deletedAt: null,
    });
    const res = await modelDetailRoute.PATCH(
      new Request("http://localhost/api/v1/admin/models/m-1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ visibility: "INVALID" }),
      }),
      { params: Promise.resolve({ id: "m-1" }) }
    );
    expect(res.status).toBe(400);
    expect(prismaState.aiModel.update).not.toHaveBeenCalled();
  });
});

