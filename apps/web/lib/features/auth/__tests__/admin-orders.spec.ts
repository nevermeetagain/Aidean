/**
 * /api/v1/admin/orders 只读查询契约（P0，蓝图 §8.5）。
 * 覆盖：type 缺省 RECHARGE；LEDGER 经 wallet.is.userId 过滤透传；金额 BigInt→string + fenToYuan；
 * type 非法 / pageSize>50 → 40000；守卫 403。mock 策略同 admin-routes.spec。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const guardStub = vi.hoisted(() => ({ requireAdminApi: vi.fn() }));
const prismaState = vi.hoisted(() => ({
  rechargeOrder: { findMany: vi.fn(), count: vi.fn() },
  packageOrder: { findMany: vi.fn(), count: vi.fn() },
  ledgerEntry: { findMany: vi.fn(), count: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock("../session", () => guardStub);
vi.mock("../../../db/prisma", () => ({ prisma: prismaState }));

import { ApiError, ERROR_CODES } from "../../../../app/api/v1/_lib/errors";
const ordersRoute = await import("../../../../app/api/v1/admin/orders/route");

const SESSION_OK = { userId: "u-admin", tier: "PRO" };
const FORBID = () => new ApiError(ERROR_CODES.FORBIDDEN, "需要管理员权限");

const now = new Date("2026-09-09T00:00:00.000Z");

function rechargeRow() {
  return {
    id: "rc-1",
    userId: "u-1",
    amountMinor: 1000n,
    bonusAmountMinor: 0n,
    totalAmountMinor: 1000n,
    payMethod: "WECHAT",
    status: "PAID",
    externalTradeNo: "T-1",
    paidAt: now,
    createdAt: now,
    user: { email: "buyer@aidean.dev" },
  };
}

function ledgerRow() {
  return {
    id: "le-1",
    walletId: "w-1",
    direction: "CREDIT",
    amountMinor: 5000n,
    entryType: "GRANT",
    status: "SETTLED",
    sourceType: "redemption",
    sourceId: "r-1",
    effectiveAt: now,
    createdAt: now,
    wallet: { userId: "u-1", user: { email: "buyer@aidean.dev" } },
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  prismaState.$transaction.mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops));
});

describe("GET /api/v1/admin/orders", () => {
  it("① RECHARGE（type 缺省）→ 200；金额 BigInt→string + fenToYuan 口径", async () => {
    guardStub.requireAdminApi.mockResolvedValueOnce(SESSION_OK);
    prismaState.rechargeOrder.findMany.mockResolvedValueOnce([rechargeRow()]);
    prismaState.rechargeOrder.count.mockResolvedValueOnce(1);
    const res = await ordersRoute.GET(new Request("http://localhost/api/v1/admin/orders"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(body.data.type).toBe("RECHARGE");
    expect(body.data.orders[0]).toMatchObject({
      userEmail: "buyer@aidean.dev",
      amountMinor: "1000",
      amountYuan: "10.00",
      totalYuan: "10.00",
      status: "PAID",
    });
    expect(body.data.total).toBe(1);
    expect(prismaState.rechargeOrder.findMany.mock.calls[0][0]).toMatchObject({
      where: {},
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  });

  it("② LEDGER + userId → where 经 wallet.is.userId 透传，返回 entries", async () => {
    guardStub.requireAdminApi.mockResolvedValueOnce(SESSION_OK);
    prismaState.ledgerEntry.findMany.mockResolvedValueOnce([ledgerRow()]);
    prismaState.ledgerEntry.count.mockResolvedValueOnce(1);
    const res = await ordersRoute.GET(
      new Request("http://localhost/api/v1/admin/orders?type=LEDGER&userId=u-1")
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.type).toBe("LEDGER");
    expect(body.data.entries[0]).toMatchObject({
      direction: "CREDIT",
      amountMinor: "5000",
      amountYuan: "50.00",
      entryType: "GRANT",
    });
    const where = prismaState.ledgerEntry.findMany.mock.calls[0][0].where;
    expect(where).toEqual({ wallet: { is: { userId: "u-1" } } });
  });

  it("③ type 非法 → 400 code=40000，不触库", async () => {
    guardStub.requireAdminApi.mockResolvedValueOnce(SESSION_OK);
    const res = await ordersRoute.GET(new Request("http://localhost/api/v1/admin/orders?type=INVOICE"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe(40000);
    expect(prismaState.rechargeOrder.findMany).not.toHaveBeenCalled();
  });

  it("④ pageSize=51 → 400 code=40000", async () => {
    guardStub.requireAdminApi.mockResolvedValueOnce(SESSION_OK);
    const res = await ordersRoute.GET(new Request("http://localhost/api/v1/admin/orders?pageSize=51"));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe(40000);
  });

  it("⑤ 非管理员 → 403 code=10008", async () => {
    guardStub.requireAdminApi.mockRejectedValueOnce(FORBID());
    const res = await ordersRoute.GET(new Request("http://localhost/api/v1/admin/orders"));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe(10008);
    expect(prismaState.rechargeOrder.findMany).not.toHaveBeenCalled();
  });
});
