/**
 * /api/v1/admin/holds 契约（S5 / M6 / G3 · 在途冻结款只读分页）。
 * 覆盖：
 *  金额 amountMinor/capturedMinor BigInt→string + fenToYuan 元口径；userId/currency 经 Wallet 关联回填。
 *  status + userId 过滤 → where.wallet.is；from/to → createdAt 范围（date-only 视当日末含）。
 *  pageSize 越界（>100）/非法 status → 400 不查库；空态 items 空数组；守卫拒绝 403。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const guardStub = vi.hoisted(() => ({ requireAdminApi: vi.fn() }));
const prismaState = vi.hoisted(() => ({
  balanceHold: { findMany: vi.fn(), count: vi.fn() },
}));

vi.mock("../session", () => guardStub);
vi.mock("../../../db/prisma", () => ({ prisma: prismaState }));

import { ApiError, ERROR_CODES } from "../../../../app/api/v1/_lib/errors";

const FORBID = () => new ApiError(ERROR_CODES.FORBIDDEN, "需要管理员权限");
const SESSION_OK = { userId: "u-admin" };

const holdsRoute = await import("../../../../app/api/v1/admin/holds/route");

const get = (qs = "") =>
  holdsRoute.GET(new Request(`http://localhost/api/v1/admin/holds${qs ? `?${qs}` : ""}`));

/** 取 findMany 实际入参（首参），便于断言 where/orderBy/include 形状。 */
const firstFindManyArg = () =>
  prismaState.balanceHold.findMany.mock.calls[0][0] as Record<string, unknown>;

beforeEach(() => {
  vi.resetAllMocks();
  guardStub.requireAdminApi.mockResolvedValue(SESSION_OK);
});

describe("GET /api/v1/admin/holds", () => {
  it("金额 BigInt→string + fenToYuan；userId/currency 经 wallet 关联回填", async () => {
    prismaState.balanceHold.findMany.mockResolvedValueOnce([
      {
        id: "h1",
        amountMinor: BigInt(12345),
        capturedMinor: BigInt(0),
        status: "AUTHORIZED",
        createdAt: new Date("2026-10-01T08:00:00Z"),
        expiresAt: new Date("2026-10-01T09:00:00Z"),
        wallet: { userId: "u-owner", currency: "CNY" },
      },
    ]);
    prismaState.balanceHold.count.mockResolvedValueOnce(1);

    const res = await get("page=1&pageSize=20");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(body.data.items[0]).toMatchObject({
      id: "h1",
      userId: "u-owner",
      currency: "CNY",
      amountMinor: "12345",
      amountYuan: "123.45",
      capturedMinor: "0",
      status: "AUTHORIZED",
      createdAt: "2026-10-01T08:00:00.000Z",
      expiresAt: "2026-10-01T09:00:00.000Z",
    });
    expect(body.data).toMatchObject({ total: 1, page: 1, pageSize: 20 });
    // userId/currency 来自关联 Wallet 的 select 投影
    expect(firstFindManyArg()).toMatchObject({
      orderBy: { createdAt: "desc" },
      include: { wallet: { select: { userId: true, currency: true } } },
    });
  });

  it("status + userId 过滤：userId 经 wallet 关联（where.wallet.is）", async () => {
    prismaState.balanceHold.findMany.mockResolvedValueOnce([]);
    prismaState.balanceHold.count.mockResolvedValueOnce(0);
    const res = await get("status=AUTHORIZED&userId=u9");
    expect(res.status).toBe(200);
    expect(firstFindManyArg().where).toEqual({
      status: "AUTHORIZED",
      wallet: { is: { userId: "u9" } },
    });
  });

  it("from/to → createdAt 范围；date-only 的 to 视为当日末（含）", async () => {
    prismaState.balanceHold.findMany.mockResolvedValueOnce([]);
    prismaState.balanceHold.count.mockResolvedValueOnce(0);
    const res = await get("from=2026-10-01&to=2026-10-05");
    expect(res.status).toBe(200);
    const where = firstFindManyArg().where as {
      createdAt: { gte: Date; lte: Date };
    };
    expect(where.createdAt.gte).toEqual(new Date("2026-10-01"));
    expect(where.createdAt.lte).toEqual(new Date("2026-10-05T23:59:59.999Z"));
  });

  it("pageSize 越界（>100）→ 400，且不查库", async () => {
    const res = await get("pageSize=200");
    expect(res.status).toBe(400);
    expect(prismaState.balanceHold.findMany).not.toHaveBeenCalled();
  });

  it("非法 status 枚举 → 400，且不查库", async () => {
    const res = await get("status=BOGUS");
    expect(res.status).toBe(400);
    expect(prismaState.balanceHold.findMany).not.toHaveBeenCalled();
  });

  it("非法日期格式 → 400，且不查库", async () => {
    const res = await get("from=not-a-date");
    expect(res.status).toBe(400);
    expect(prismaState.balanceHold.findMany).not.toHaveBeenCalled();
  });

  it("空态 → items 空数组 + total 0", async () => {
    prismaState.balanceHold.findMany.mockResolvedValueOnce([]);
    prismaState.balanceHold.count.mockResolvedValueOnce(0);
    const res = await get();
    const body = await res.json();
    expect(body.data).toEqual({ items: [], total: 0, page: 1, pageSize: 20 });
  });

  it("守卫拒绝 → 403", async () => {
    guardStub.requireAdminApi.mockRejectedValue(FORBID());
    const res = await get();
    expect(res.status).toBe(403);
  });
});
