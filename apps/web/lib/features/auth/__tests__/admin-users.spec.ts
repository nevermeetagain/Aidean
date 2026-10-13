/**
 * /api/v1/admin/users 管理域单测（rebuild-admin-console-and-harden-auth SubTask 2.1.1）。
 *
 * 覆盖 checklist 2-1（守卫矩阵 401/403/放行/白名单剔除）、2-2（封禁后 ver++）、
 * 2-5（写操作 audit_logs 落库）：
 * - GET：未登录 401 / 非管理员 403 / 放行 200 + 分页搜索 + fenToYuan 转换；
 * - PATCH：封禁 → tokenVersion increment + AuditLog；解封 → ver 不回退；
 *         越权字段（role/nickname）被 zod strip 剔除，update 只收白名单字段；
 *         非法枚举/空 body → 400；用户不存在 → 10001。
 *
 * 策略：vi.mock '../session'（stub requireAdminApi）+ vi.mock '../../../db/prisma'
 * （user.findMany/count/findUnique/update + $transaction）+ vi.mock '../../../app/api/v1/_lib/audit'
 * （writeAudit 断言落库）。内存 Request 直调 withApi 包装后的 handler。
 */
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

const guardStub = vi.hoisted(() => ({ requireAdminApi: vi.fn() }));
const prismaState = vi.hoisted(() => ({
  user: { findMany: vi.fn(), count: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  $transaction: vi.fn(),
}));
const auditStub = vi.hoisted(() => ({ writeAudit: vi.fn() }));

vi.mock("../session", () => guardStub);
vi.mock("../../../db/prisma", () => ({ prisma: prismaState }));
vi.mock("../../../../app/api/v1/_lib/audit", () => auditStub);

import { ApiError, ERROR_CODES } from "../../../../app/api/v1/_lib/errors";
const usersRoute = await import("../../../../app/api/v1/admin/users/route");
const userDetailRoute = await import("../../../../app/api/v1/admin/users/[id]/route");

const SESSION_OK = { userId: "u-admin", tier: "PRO" };
const UNAUTH = () => new ApiError(ERROR_CODES.UNAUTHENTICATED, "请先登录");
const FORBID = () => new ApiError(ERROR_CODES.FORBIDDEN, "需要管理员权限");

function walletRow(overrides: Record<string, unknown> = {}) {
  return { id: "w-1", balanceMinor: 100000n, ...overrides };
}

beforeEach(() => {
  vi.resetAllMocks(); // resetAllMocks 清空 mockResolvedValueOnce 队列（clearAllMocks 不清，防用例间串扰）
});

describe("GET /api/v1/admin/users 守卫矩阵", () => {
  it("① 未登录（10004）→ HTTP 401 信封，不触库", async () => {
    guardStub.requireAdminApi.mockRejectedValueOnce(UNAUTH());
    const res = await usersRoute.GET(new Request("http://localhost/api/v1/admin/users"));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.code).toBe(10004);
    expect(prismaState.user.findMany).not.toHaveBeenCalled();
  });

  it("② 普通用户（10008）→ HTTP 403 信封，不触库", async () => {
    guardStub.requireAdminApi.mockRejectedValueOnce(FORBID());
    const res = await usersRoute.GET(new Request("http://localhost/api/v1/admin/users"));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe(10008);
    expect(prismaState.user.findMany).not.toHaveBeenCalled();
  });

  it("③ 管理员放行 → 200；email 搜索 + 分页参数透传 + 余额元转换", async () => {
    guardStub.requireAdminApi.mockResolvedValueOnce(SESSION_OK);
    prismaState.$transaction.mockResolvedValueOnce([
      [
        {
          id: "u-1",
          email: "alice@aidean.com",
          nickname: "Alice",
          tier: "PRO",
          status: "ACTIVE",
          role: "USER",
          createdAt: new Date("2026-09-01T00:00:00Z"),
          lastLoginAt: null,
          wallet: walletRow(),
        },
      ],
      1,
    ]);
    const res = await usersRoute.GET(
      new Request("http://localhost/api/v1/admin/users?page=2&pageSize=10&q=alice")
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(body.data.total).toBe(1);
    expect(body.data.users[0].balanceYuan).toBe("1000.00");
    expect(body.data.users[0].walletId).toBe("w-1");

    // 分页参数正确传参（take=pageSize, skip=(page-1)*pageSize）
    const findCall = prismaState.user.findMany.mock.calls[0][0];
    expect(findCall.skip).toBe(10);
    expect(findCall.take).toBe(10);
    expect(findCall.where.email).toEqual({ contains: "alice", mode: "insensitive" });
  });

  it("④ 分页参数非法（pageSize>50）→ HTTP 400 code=40000", async () => {
    guardStub.requireAdminApi.mockResolvedValueOnce(SESSION_OK);
    const res = await usersRoute.GET(
      new Request("http://localhost/api/v1/admin/users?pageSize=999")
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe(40000);
    expect(prismaState.$transaction).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/v1/admin/users/[id] 封禁与白名单", () => {
  it("⑤ 封禁（status→SUSPENDED）→ tokenVersion increment + AuditLog(users, action=2)", async () => {
    guardStub.requireAdminApi.mockResolvedValueOnce(SESSION_OK);
    prismaState.user.findUnique.mockResolvedValueOnce({
      id: "u-1",
      tier: "NORMAL",
      status: "ACTIVE",
      tokenVersion: 0,
      deletedAt: null,
    });
    prismaState.user.update.mockResolvedValueOnce({
      id: "u-1",
      tier: "NORMAL",
      status: "SUSPENDED",
      tokenVersion: 1,
    });

    const res = await userDetailRoute.PATCH(
      new Request("http://localhost/api/v1/admin/users/u-1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "SUSPENDED" }),
      }),
      { params: Promise.resolve({ id: "u-1" }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBe(0);

    // 封禁必须 tokenVersion++
    const update = prismaState.user.update.mock.calls[0][0];
    expect(update.data.tokenVersion).toEqual({ increment: 1 });
    expect(update.data.status).toBe("SUSPENDED");

    // 审计落库断言
    expect(auditStub.writeAudit).toHaveBeenCalledOnce();
    const audit = auditStub.writeAudit.mock.calls[0][0];
    expect(audit.tableName).toBe("users");
    expect(audit.action).toBe(2);
    expect(audit.changedFields).toContain("status");
    expect(audit.changedFields).toContain("tokenVersion");
    expect(audit.actorId).toBe("u-admin");
  });

  it("⑥ 解封（status→ACTIVE）→ ver 不回退（旧令牌保持失效，须重登）", async () => {
    guardStub.requireAdminApi.mockResolvedValueOnce(SESSION_OK);
    prismaState.user.findUnique.mockResolvedValueOnce({
      id: "u-1",
      tier: "NORMAL",
      status: "SUSPENDED",
      tokenVersion: 3,
      deletedAt: null,
    });
    prismaState.user.update.mockResolvedValueOnce({
      id: "u-1",
      tier: "NORMAL",
      status: "ACTIVE",
      tokenVersion: 3,
    });

    const res = await userDetailRoute.PATCH(
      new Request("http://localhost/api/v1/admin/users/u-1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "ACTIVE" }),
      }),
      { params: Promise.resolve({ id: "u-1" }) }
    );
    expect(res.status).toBe(200);
    const update = prismaState.user.update.mock.calls[0][0];
    expect(update.data.tokenVersion).toBeUndefined(); // 解封不推进 ver
    expect(update.data.status).toBe("ACTIVE");
    // 审计不应包含 tokenVersion
    const audit = auditStub.writeAudit.mock.calls[0][0];
    expect(audit.changedFields).toEqual(["status"]);
  });

  it("⑦ 越权字段剔除：body 带 role/nickname 被 zod strip，update 仅收白名单字段", async () => {
    guardStub.requireAdminApi.mockResolvedValueOnce(SESSION_OK);
    prismaState.user.findUnique.mockResolvedValueOnce({
      id: "u-1",
      tier: "NORMAL",
      status: "ACTIVE",
      tokenVersion: 0,
      deletedAt: null,
    });
    prismaState.user.update.mockResolvedValueOnce({
      id: "u-1",
      tier: "PRO",
      status: "ACTIVE",
      tokenVersion: 0,
    });

    const res = await userDetailRoute.PATCH(
      new Request("http://localhost/api/v1/admin/users/u-1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tier: "PRO", role: "SUPER_ADMIN", nickname: "hacker" }),
      }),
      { params: Promise.resolve({ id: "u-1" }) }
    );
    expect(res.status).toBe(200);
    const update = prismaState.user.update.mock.calls[0][0];
    expect(update.data).toEqual({ tier: "PRO" }); // role/nickname 被剔除
    expect(update.data.role).toBeUndefined();
    expect(update.data.nickname).toBeUndefined();
  });

  it("⑧ 非法枚举（tier: GOD）→ 400 code=40000，不触 update", async () => {
    guardStub.requireAdminApi.mockResolvedValueOnce(SESSION_OK);
    prismaState.user.findUnique.mockResolvedValueOnce({
      id: "u-1",
      tier: "NORMAL",
      status: "ACTIVE",
      tokenVersion: 0,
      deletedAt: null,
    });
    const res = await userDetailRoute.PATCH(
      new Request("http://localhost/api/v1/admin/users/u-1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tier: "GOD" }),
      }),
      { params: Promise.resolve({ id: "u-1" }) }
    );
    expect(res.status).toBe(400);
    expect(prismaState.user.update).not.toHaveBeenCalled();
  });

  it("⑨ 空 body（无可变更字段）→ 400", async () => {
    guardStub.requireAdminApi.mockResolvedValueOnce(SESSION_OK);
    prismaState.user.findUnique.mockResolvedValueOnce({
      id: "u-1",
      tier: "NORMAL",
      status: "ACTIVE",
      tokenVersion: 0,
      deletedAt: null,
    });
    const res = await userDetailRoute.PATCH(
      new Request("http://localhost/api/v1/admin/users/u-1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: "u-1" }) }
    );
    expect(res.status).toBe(400);
  });

  it("⑩ 用户不存在/已软删 → 10001 用户不存在", async () => {
    guardStub.requireAdminApi.mockResolvedValueOnce(SESSION_OK);
    prismaState.user.findUnique.mockResolvedValueOnce(null);
    const res = await userDetailRoute.PATCH(
      new Request("http://localhost/api/v1/admin/users/u-ghost", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "SUSPENDED" }),
      }),
      { params: Promise.resolve({ id: "u-ghost" }) }
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe(10001);
  });
});

