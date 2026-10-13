/**
 * /api/v1/admin/redemption-codes 管理域列表路由契约（v1.15 低风险收口）。
 *
 * 覆盖：status 查询白名单（非法 → 40000，不触库）；合法枚举/批次号放行走 listPage 分支；
 * 分页上限 pageSize≤50 仍生效。mock 策略同 admin-routes.spec（session/repo/prisma 全 stub）。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const guardStub = vi.hoisted(() => ({ requireAdminApi: vi.fn() }));
const repoStub = vi.hoisted(() => ({
  listPage: vi.fn(),
  listBatches: vi.fn(),
}));
const prismaState = vi.hoisted(() => ({
  package: { findMany: vi.fn() },
}));

vi.mock("../session", () => guardStub);
vi.mock("../../../features/package/redemption/repository", () => ({ redemptionRepository: repoStub }));
vi.mock("../../../db/prisma", () => ({ prisma: prismaState }));

import { ApiError, ERROR_CODES } from "../../../../app/api/v1/_lib/errors";
const codesRoute = await import("../../../../app/api/v1/admin/redemption-codes/route");

const SESSION_OK = { userId: "u-admin", tier: "PRO" };
const FORBID = () => new ApiError(ERROR_CODES.FORBIDDEN, "需要管理员权限");

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: "r-1",
    code: "ABCDEFGHIJKL",
    targetType: "BALANCE",
    balanceMinor: 5000n,
    packageId: null,
    name: null,
    batchNo: "B20260901ABC123",
    status: "ENABLED",
    expiresAt: null,
    redeemedAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  prismaState.package.findMany.mockResolvedValue([]);
  repoStub.listBatches.mockResolvedValue([]);
});

describe("GET /api/v1/admin/redemption-codes 列表契约", () => {
  it("① 放行 + status 合法枚举 → 200；筛选原样透传 repository", async () => {
    guardStub.requireAdminApi.mockResolvedValueOnce(SESSION_OK);
    repoStub.listPage.mockResolvedValueOnce({ rows: [row()], total: 1 });
    const res = await codesRoute.GET(
      new Request("http://localhost/api/v1/admin/redemption-codes?status=DISABLED&batchNo=B20260901ABC123")
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(body.data.codes).toHaveLength(1);
    expect(body.data.total).toBe(1);
    expect(repoStub.listPage.mock.calls[0][0]).toEqual({
      batchNo: "B20260901ABC123",
      status: "DISABLED",
      page: 1,
      pageSize: 20,
    });
  });

  it("② status 非法枚举 → 400 code=40000，不触 repository", async () => {
    guardStub.requireAdminApi.mockResolvedValueOnce(SESSION_OK);
    const res = await codesRoute.GET(
      new Request("http://localhost/api/v1/admin/redemption-codes?status=BOGUS")
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe(40000);
    expect(body.data).toBeNull();
    expect(repoStub.listPage).not.toHaveBeenCalled();
  });

  it("③ pageSize 超 50 → 400 code=40000", async () => {
    guardStub.requireAdminApi.mockResolvedValueOnce(SESSION_OK);
    const res = await codesRoute.GET(
      new Request("http://localhost/api/v1/admin/redemption-codes?pageSize=100")
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe(40000);
  });

  it("④ 非管理员 → 403 code=10008", async () => {
    guardStub.requireAdminApi.mockRejectedValueOnce(FORBID());
    const res = await codesRoute.GET(new Request("http://localhost/api/v1/admin/redemption-codes"));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe(10008);
    expect(repoStub.listPage).not.toHaveBeenCalled();
  });
});
