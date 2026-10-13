/**
 * /api/v1/admin/logs/* 只读聚合契约（S5 日志中心）。
 * 覆盖：
 *  usage —— quotaMinor BigInt→string + fenToYuan 元口径；pageSize>100 越界 → 400；onlyErrors 落 where.error。
 *  security —— kind=TOKEN 派生态（撤销>轮换>过期>有效）；CONSENT 直读。
 *  scripts —— status 标签映射。
 * 守卫 —— requireAdminApi 拒绝 → 403。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const guardStub = vi.hoisted(() => ({ requireAdminApi: vi.fn() }));
const prismaState = vi.hoisted(() => ({
  usageLog: { findMany: vi.fn(), count: vi.fn() },
  refreshToken: { findMany: vi.fn() },
  oidcUserConsent: { findMany: vi.fn(), count: vi.fn() },
  scriptExecution: { findMany: vi.fn(), count: vi.fn() },
}));

vi.mock("../session", () => guardStub);
vi.mock("../../../db/prisma", () => ({ prisma: prismaState }));

import { ApiError, ERROR_CODES } from "../../../../app/api/v1/_lib/errors";

const FORBID = () => new ApiError(ERROR_CODES.FORBIDDEN, "需要管理员权限");

const usageRoute = await import("../../../../app/api/v1/admin/logs/usage/route");
const securityRoute = await import("../../../../app/api/v1/admin/logs/security/route");
const scriptsRoute = await import("../../../../app/api/v1/admin/logs/scripts/route");

const SESSION_OK = { userId: "u-admin" };

beforeEach(() => {
  vi.resetAllMocks();
});

describe("GET /api/v1/admin/logs/usage", () => {
  it("quotaMinor BigInt → string + fenToYuan 元口径", async () => {
    guardStub.requireAdminApi.mockResolvedValue(SESSION_OK);
    prismaState.usageLog.findMany.mockResolvedValueOnce([
      {
        id: "l1",
        requestId: "req-1",
        model: "gpt-x",
        provider: null,
        stationId: null,
        billingPath: "PLATFORM",
        promptTokens: 10,
        completionTokens: 20,
        cachedTokens: 0,
        reasoningTokens: 0,
        quotaMinor: BigInt(150),
        latencyMs: 42,
        statusCode: 200,
        isStream: false,
        error: null,
        createdAt: new Date("2026-10-12T00:00:00Z"),
        user: { email: "u@a.com" },
      },
    ]);
    prismaState.usageLog.count.mockResolvedValueOnce(1);
    const res = await usageRoute.GET(new Request("http://localhost/api/v1/admin/logs/usage?page=1&pageSize=20"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(body.data.items[0]).toMatchObject({ quotaMinor: "150", quotaYuan: "1.50", hasError: false });
  });

  it("pageSize 越界（>100）→ 400，且不查库", async () => {
    guardStub.requireAdminApi.mockResolvedValue(SESSION_OK);
    const res = await usageRoute.GET(new Request("http://localhost/api/v1/admin/logs/usage?pageSize=200"));
    expect(res.status).toBe(400);
    expect(prismaState.usageLog.findMany).not.toHaveBeenCalled();
  });

  it("onlyErrors=true 落 where.error（仅错误筛选）", async () => {
    guardStub.requireAdminApi.mockResolvedValue(SESSION_OK);
    prismaState.usageLog.findMany.mockResolvedValueOnce([]);
    prismaState.usageLog.count.mockResolvedValueOnce(0);
    await usageRoute.GET(new Request("http://localhost/api/v1/admin/logs/usage?onlyErrors=true"));
    const arg = prismaState.usageLog.findMany.mock.calls[0][0] as { where: Record<string, unknown> };
    expect(arg.where.error).toEqual({ not: null });
  });

  it("守卫拒绝 → 403", async () => {
    guardStub.requireAdminApi.mockRejectedValue(FORBID());
    const res = await usageRoute.GET(new Request("http://localhost/api/v1/admin/logs/usage"));
    expect(res.status).toBe(403);
  });
});

describe("GET /api/v1/admin/logs/security", () => {
  it("TOKEN 派生态：撤销 > 轮换 > 过期 > 有效", async () => {
    guardStub.requireAdminApi.mockResolvedValue(SESSION_OK);
    const past = new Date("2020-01-01T00:00:00Z");
    const future = new Date("2999-01-01T00:00:00Z");
    prismaState.refreshToken.findMany.mockResolvedValueOnce([
      { id: "t1", jti: "j1", chainId: "c1", clientId: null, rotatedAt: null, revokedAt: future, expiresAt: future, createdAt: past, userAgent: null, ip: null, user: { email: "a@a.com" } },
      { id: "t2", jti: "j2", chainId: "c2", clientId: null, rotatedAt: past, revokedAt: null, expiresAt: future, createdAt: past, userAgent: null, ip: null, user: { email: "b@b.com" } },
      { id: "t3", jti: "j3", chainId: "c3", clientId: null, rotatedAt: null, revokedAt: null, expiresAt: past, createdAt: past, userAgent: null, ip: null, user: { email: "c@c.com" } },
      { id: "t4", jti: "j4", chainId: "c4", clientId: "client-x", rotatedAt: null, revokedAt: null, expiresAt: future, createdAt: past, userAgent: null, ip: null, user: { email: "d@d.com" } },
    ]);
    const res = await securityRoute.GET(new Request("http://localhost/api/v1/admin/logs/security?kind=TOKEN&pageSize=20"));
    expect(res.status).toBe(200);
    const body = await res.json();
    const byId = Object.fromEntries(body.data.items.map((t: { id: string; status: string }) => [t.id, t.status]));
    expect(byId).toMatchObject({ t1: "REVOKED", t2: "ROTATED", t3: "EXPIRED", t4: "ACTIVE" });
  });

  it("status=ACTIVE 仅保留有效令牌", async () => {
    guardStub.requireAdminApi.mockResolvedValue(SESSION_OK);
    const past = new Date("2020-01-01T00:00:00Z");
    const future = new Date("2999-01-01T00:00:00Z");
    prismaState.refreshToken.findMany.mockResolvedValueOnce([
      { id: "t1", jti: "j1", chainId: "c1", clientId: null, rotatedAt: null, revokedAt: future, expiresAt: future, createdAt: past, userAgent: null, ip: null, user: { email: "a@a.com" } },
      { id: "t4", jti: "j4", chainId: "c4", clientId: null, rotatedAt: null, revokedAt: null, expiresAt: future, createdAt: past, userAgent: null, ip: null, user: { email: "d@d.com" } },
    ]);
    const res = await securityRoute.GET(new Request("http://localhost/api/v1/admin/logs/security?kind=TOKEN&status=ACTIVE&pageSize=20"));
    const body = await res.json();
    expect(body.data.total).toBe(1);
    expect(body.data.items[0].id).toBe("t4");
  });

  it("CONSENT 直读授权同意", async () => {
    guardStub.requireAdminApi.mockResolvedValue(SESSION_OK);
    prismaState.oidcUserConsent.findMany.mockResolvedValueOnce([
      { id: "k1", clientId: "cid", scopes: ["openid", "profile"], createdAt: new Date("2026-10-01T00:00:00Z"), user: { email: "e@e.com" }, client: { name: "Client E" } },
    ]);
    prismaState.oidcUserConsent.count.mockResolvedValueOnce(1);
    const res = await securityRoute.GET(new Request("http://localhost/api/v1/admin/logs/security?kind=CONSENT"));
    const body = await res.json();
    expect(body.data.items[0]).toMatchObject({ clientId: "cid", clientName: "Client E", scopes: ["openid", "profile"] });
  });
});

describe("GET /api/v1/admin/logs/scripts", () => {
  it("status 标签映射（失败=2）", async () => {
    guardStub.requireAdminApi.mockResolvedValue(SESSION_OK);
    prismaState.scriptExecution.findMany.mockResolvedValueOnce([
      { id: "e1", scriptId: "s1", status: 2, startedAt: new Date("2026-10-02T00:00:00Z"), finishedAt: null, durationMs: 100, errorMsg: "boom", createdAt: new Date("2026-10-02T00:00:00Z"), script: { name: "crawl" } },
    ]);
    prismaState.scriptExecution.count.mockResolvedValueOnce(1);
    const res = await scriptsRoute.GET(new Request("http://localhost/api/v1/admin/logs/scripts?status=2"));
    const body = await res.json();
    expect(body.data.items[0]).toMatchObject({ status: 2, statusLabel: "失败", scriptName: "crawl" });
  });
});
