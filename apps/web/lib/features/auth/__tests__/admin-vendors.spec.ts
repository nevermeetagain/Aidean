/**
 * /api/v1/admin/vendors 管理域单测（rebuild-admin-console-and-harden-auth SubTask 2.3.1）。
 *
 * 覆盖 checklist 2-1（守卫矩阵）/2-5（audit）与 spec「提供商管理」CRUD 全链：
 * - GET：放行后列表按 priority 升序；旧 PUT {priorities} 口径兼容；
 * - POST：新建成功 + AuditLog(action=1)；code 重复（P2002）→ 400；code 格式非法 → 400；
 * - PATCH [id]：编辑白名单（code 不可改）；DELETE [id]：软删（deletedAt+isActive=false）。
 */
import { Prisma } from "@prisma/client";

import { beforeEach, describe, expect, it, vi } from "vitest";

const guardStub = vi.hoisted(() => ({ requireAdminApi: vi.fn() }));
const prismaState = vi.hoisted(() => ({
  vendor: { findMany: vi.fn(), create: vi.fn(), update: vi.fn(), findUnique: vi.fn() },
  $transaction: vi.fn(),
}));
const auditStub = vi.hoisted(() => ({ writeAudit: vi.fn() }));

vi.mock("../session", () => guardStub);
vi.mock("../../../db/prisma", () => ({ prisma: prismaState }));
vi.mock("../../../../app/api/v1/_lib/audit", () => auditStub);

import { ApiError, ERROR_CODES } from "../../../../app/api/v1/_lib/errors";
const vendorsRoute = await import("../../../../app/api/v1/admin/vendors/route");
const vendorDetailRoute = await import("../../../../app/api/v1/admin/vendors/[id]/route");

const SESSION_OK = { userId: "u-admin", tier: "PRO" };
const FORBID = () => new ApiError(ERROR_CODES.FORBIDDEN, "需要管理员权限");

function vendorRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "v-1",
    code: "openai",
    name: "OpenAI",
    nameCn: "OpenAI",
    country: "USA",
    priority: 1,
    isActive: true,
    modelCount: 3,
    ...overrides,
  };
}

/** P2002 唯一约束冲突（真实 Prisma 错误类型，instanceof 可命中 route 的 catch 分支） */
function p2002(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "5.22.0",
  });
}

beforeEach(() => {
  vi.resetAllMocks(); // resetAllMocks 清空 mockResolvedValueOnce 队列（clearAllMocks 不清，防用例间串扰）
});

describe("GET /api/v1/admin/vendors 列表与旧 PUT 兼容", () => {
  it("① 放行 → 200；按 priority 升序 + name 兜底（不含软删行）", async () => {
    guardStub.requireAdminApi.mockResolvedValueOnce(SESSION_OK);
    prismaState.vendor.findMany.mockResolvedValueOnce([vendorRow(), vendorRow({ id: "v-2", priority: 2 })]);
    const res = await vendorsRoute.GET(new Request("http://localhost/api/v1/admin/vendors"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(body.data.vendors).toHaveLength(2);
    expect(prismaState.vendor.findMany.mock.calls[0][0].where).toEqual({ deletedAt: null });
    expect(prismaState.vendor.findMany.mock.calls[0][0].orderBy).toEqual([
      { priority: "asc" },
      { name: "asc" },
    ]);
  });

  it("② 非管理员 → 403，不触库", async () => {
    guardStub.requireAdminApi.mockRejectedValueOnce(FORBID());
    const res = await vendorsRoute.GET(new Request("http://localhost/api/v1/admin/vendors"));
    expect(res.status).toBe(403);
    expect(prismaState.vendor.findMany).not.toHaveBeenCalled();
  });

  it("③ 旧 PUT {priorities} 口径兼容：多组事务批量更新 + 逐行 AuditLog(action=2)", async () => {
    guardStub.requireAdminApi.mockResolvedValueOnce(SESSION_OK);
    prismaState.vendor.findMany.mockResolvedValueOnce([
      { id: "v-1", priority: 1 },
      { id: "v-2", priority: 2 },
    ]);
    prismaState.$transaction.mockResolvedValueOnce([{ id: "v-1" }, { id: "v-2" }]);
    const res = await vendorsRoute.PUT(
      new Request("http://localhost/api/v1/admin/vendors", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ priorities: [{ id: "v-1", priority: 2 }, { id: "v-2", priority: 1 }] }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.saved).toBe(2);
    // $transaction 数组元素是 update 调用（Promise），参数断言走 vendor.update 调用记录
    expect(prismaState.vendor.update).toHaveBeenCalledTimes(2);
    const updateCalls = prismaState.vendor.update.mock.calls;
    expect(updateCalls[0][0].data.priority).toBe(2);
    expect(updateCalls[1][0].data.priority).toBe(1);
    // 审计补全：批量优先级写亦逐行落 audit_logs(action=2, tableName=vendors)
    expect(auditStub.writeAudit).toHaveBeenCalledTimes(2);
    const audits = auditStub.writeAudit.mock.calls.map((c) => c[0]);
    expect(audits.every((a: { action: number; tableName: string }) => a.action === 2 && a.tableName === "vendors")).toBe(true);
    expect(audits[0].oldData).toEqual({ priority: 1 });
    expect(audits[0].newData).toEqual({ priority: 2 });
  });
});

describe("POST /api/v1/admin/vendors 新建", () => {
  it("④ 新建成功 → 200 + AuditLog(action=1, tableName=vendors)", async () => {
    guardStub.requireAdminApi.mockResolvedValueOnce(SESSION_OK);
    prismaState.vendor.create.mockResolvedValueOnce({ id: "v-new", code: "anthropic", name: "Anthropic" });
    const res = await vendorsRoute.POST(
      new Request("http://localhost/api/v1/admin/vendors", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: "anthropic", name: "Anthropic", priority: 5 }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(body.data.vendor.code).toBe("anthropic");
    expect(auditStub.writeAudit).toHaveBeenCalledOnce();
    expect(auditStub.writeAudit.mock.calls[0][0].action).toBe(1);
    expect(auditStub.writeAudit.mock.calls[0][0].tableName).toBe("vendors");
  });

  it("⑤ code 重复（P2002）→ 400「厂商 code 已存在」，不写审计", async () => {
    guardStub.requireAdminApi.mockResolvedValueOnce(SESSION_OK);
    prismaState.vendor.create.mockRejectedValueOnce(p2002());
    const res = await vendorsRoute.POST(
      new Request("http://localhost/api/v1/admin/vendors", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: "openai", name: "OpenAI Duplicate" }),
      })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe(40000);
    expect(body.message).toContain("code 已存在");
    expect(auditStub.writeAudit).not.toHaveBeenCalled();
  });

  it("⑥ code 格式非法（大写/空格）→ 400", async () => {
    guardStub.requireAdminApi.mockResolvedValueOnce(SESSION_OK);
    const res = await vendorsRoute.POST(
      new Request("http://localhost/api/v1/admin/vendors", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: "Bad Code", name: "X" }),
      })
    );
    expect(res.status).toBe(400);
    expect(prismaState.vendor.create).not.toHaveBeenCalled();
  });
});

describe("PATCH/DELETE /api/v1/admin/vendors/[id]", () => {
  it("⑦ PATCH 编辑 → 200；白名单内字段更新 + AuditLog(action=2)", async () => {
    guardStub.requireAdminApi.mockResolvedValueOnce(SESSION_OK);
    prismaState.vendor.findUnique.mockResolvedValueOnce(vendorRow());
    prismaState.vendor.update.mockResolvedValueOnce({ id: "v-1", code: "openai", name: "OpenAI Inc", priority: 3, isActive: true });
    const res = await vendorDetailRoute.PATCH(
      new Request("http://localhost/api/v1/admin/vendors/v-1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "OpenAI Inc", priority: 3 }),
      }),
      { params: Promise.resolve({ id: "v-1" }) }
    );
    expect(res.status).toBe(200);
    const update = prismaState.vendor.update.mock.calls[0][0];
    expect(update.data).toEqual({ name: "OpenAI Inc", priority: 3 });
    expect(auditStub.writeAudit.mock.calls[0][0].action).toBe(2);
  });

  it("⑧ PATCH 尝试改 code → 被 zod strip，update 不含 code", async () => {
    guardStub.requireAdminApi.mockResolvedValueOnce(SESSION_OK);
    prismaState.vendor.findUnique.mockResolvedValueOnce(vendorRow());
    prismaState.vendor.update.mockResolvedValueOnce({ id: "v-1", code: "openai", name: "OpenAI", priority: 1, isActive: true });
    const res = await vendorDetailRoute.PATCH(
      new Request("http://localhost/api/v1/admin/vendors/v-1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: "hacked" }),
      }),
      { params: Promise.resolve({ id: "v-1" }) }
    );
    expect(res.status).toBe(400); // 无可变更字段（code 被 strip 后 refine 拦截）
    expect(prismaState.vendor.update).not.toHaveBeenCalled();
  });

  it("⑨ DELETE 软删 → deletedAt 置位 + isActive=false + AuditLog(action=3)", async () => {
    guardStub.requireAdminApi.mockResolvedValueOnce(SESSION_OK);
    prismaState.vendor.findUnique.mockResolvedValueOnce(vendorRow());
    prismaState.vendor.update.mockResolvedValueOnce({ id: "v-1", code: "openai", deletedAt: new Date() });
    const res = await vendorDetailRoute.DELETE(
      new Request("http://localhost/api/v1/admin/vendors/v-1", { method: "DELETE" }),
      { params: Promise.resolve({ id: "v-1" }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.deleted).toBe(true);
    const update = prismaState.vendor.update.mock.calls[0][0];
    expect(update.data.isActive).toBe(false);
    expect(update.data.deletedAt).toBeInstanceOf(Date);
    expect(auditStub.writeAudit.mock.calls[0][0].action).toBe(3);
  });

  it("⑩ DELETE 已软删厂商 → 400「厂商不存在」（findUnique 返回 deletedAt 行）", async () => {
    guardStub.requireAdminApi.mockResolvedValueOnce(SESSION_OK);
    prismaState.vendor.findUnique.mockResolvedValueOnce({ ...vendorRow(), deletedAt: new Date() });
    const res = await vendorDetailRoute.DELETE(
      new Request("http://localhost/api/v1/admin/vendors/v-1", { method: "DELETE" }),
      { params: Promise.resolve({ id: "v-1" }) }
    );
    expect(res.status).toBe(400);
    expect(prismaState.vendor.update).not.toHaveBeenCalled();
  });
});

