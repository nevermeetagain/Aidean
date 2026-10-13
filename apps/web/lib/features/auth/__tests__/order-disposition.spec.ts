/**
 * /api/v1/admin/package-orders + 订单处置（S6 财务全链）。
 * 覆盖：
 *  GET package-orders —— priceMinor BigInt→string + fenToYuan；pageSize>50 → 400 不查库；守卫 403。
 *  PATCH package-orders/[id] —— CLOSE/FLAG→CANCELLED（CAS）；终态拒绝；REVERSE 不适用 → 400。
 *  PATCH recharge-orders/[id] —— CLOSE→EXPIRED / FLAG→FAILED（仅 PENDING）；REVERSE 经 billingService
 *    写 REFUNDED + 记审计（金额元口径）；非 PENDING 的 CLOSE/FLAG → 400。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const guardStub = vi.hoisted(() => ({ requireAdminApi: vi.fn() }));
const billingStub = vi.hoisted(() => ({ reverseRechargeOrder: vi.fn() }));
const prismaState = vi.hoisted(() => ({
  packageOrder: { findMany: vi.fn(), count: vi.fn(), findUnique: vi.fn(), updateMany: vi.fn() },
  rechargeOrder: { findUnique: vi.fn(), updateMany: vi.fn() },
  auditLog: { create: vi.fn() },
}));

vi.mock("../session", () => guardStub);
vi.mock("../../../db/prisma", () => ({ prisma: prismaState }));
vi.mock("../../billing/service", () => ({ billingService: billingStub }));

import { ApiError, ERROR_CODES } from "../../../../app/api/v1/_lib/errors";

const FORBID = () => new ApiError(ERROR_CODES.FORBIDDEN, "需要管理员权限");

const packageListRoute = await import("../../../../app/api/v1/admin/package-orders/route");
const packageItemRoute = await import("../../../../app/api/v1/admin/package-orders/[id]/route");
const rechargeItemRoute = await import("../../../../app/api/v1/admin/recharge-orders/[id]/route");

const SESSION_OK = { userId: "u-admin" };

function patchReq(body: unknown) {
  return new Request("http://localhost/api/v1/admin/orders/x", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  vi.resetAllMocks();
  guardStub.requireAdminApi.mockResolvedValue(SESSION_OK);
});

describe("GET /api/v1/admin/package-orders", () => {
  it("priceMinor BigInt → string + fenToYuan 元口径", async () => {
    prismaState.packageOrder.findMany.mockResolvedValueOnce([
      {
        id: "po1",
        user: { email: "u@a.com" },
        package: { title: "天卡", priceMinor: BigInt(9900) },
        status: "ACTIVE",
        redeemedAt: new Date("2026-10-01T00:00:00Z"),
        expiresAt: null,
        createdAt: new Date("2026-10-01T00:00:00Z"),
      },
    ]);
    prismaState.packageOrder.count.mockResolvedValueOnce(1);
    const res = await packageListRoute.GET(
      new Request("http://localhost/api/v1/admin/package-orders?page=1&pageSize=20")
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(body.data.items[0]).toMatchObject({ priceMinor: "9900", priceYuan: "99.00", status: "ACTIVE" });
  });

  it("pageSize 越界（>50）→ 400，且不查库", async () => {
    const res = await packageListRoute.GET(
      new Request("http://localhost/api/v1/admin/package-orders?pageSize=100")
    );
    expect(res.status).toBe(400);
    expect(prismaState.packageOrder.findMany).not.toHaveBeenCalled();
  });

  it("守卫拒绝 → 403", async () => {
    guardStub.requireAdminApi.mockRejectedValue(FORBID());
    const res = await packageListRoute.GET(new Request("http://localhost/api/v1/admin/package-orders"));
    expect(res.status).toBe(403);
  });
});

describe("PATCH /api/v1/admin/package-orders/[id]", () => {
  it("CLOSE：PENDING/ACTIVE → CANCELLED（CAS where 旧状态）", async () => {
    prismaState.packageOrder.findUnique.mockResolvedValueOnce({ id: "po1", status: "ACTIVE" });
    prismaState.packageOrder.updateMany.mockResolvedValueOnce({ count: 1 });
    const res = await packageItemRoute.PATCH(patchReq({ action: "CLOSE" }), ctx("po1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toMatchObject({ id: "po1", status: "CANCELLED", action: "CLOSE" });
    const arg = prismaState.packageOrder.updateMany.mock.calls[0][0] as {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
    };
    expect(arg.where).toEqual({ id: "po1", status: "ACTIVE" });
    expect(arg.data.status).toBe("CANCELLED");
    expect(prismaState.auditLog.create).toHaveBeenCalledTimes(1);
  });

  it("REVERSE 不适用于套餐订单 → 400，不写库", async () => {
    prismaState.packageOrder.findUnique.mockResolvedValueOnce({ id: "po1", status: "ACTIVE" });
    const res = await packageItemRoute.PATCH(patchReq({ action: "REVERSE" }), ctx("po1"));
    expect(res.status).toBe(400);
    expect(prismaState.packageOrder.updateMany).not.toHaveBeenCalled();
  });

  it("终态（CANCELLED）不可再处置 → 400", async () => {
    prismaState.packageOrder.findUnique.mockResolvedValueOnce({ id: "po1", status: "CANCELLED" });
    const res = await packageItemRoute.PATCH(patchReq({ action: "CLOSE" }), ctx("po1"));
    expect(res.status).toBe(400);
  });

  it("守卫拒绝 → 403", async () => {
    guardStub.requireAdminApi.mockRejectedValue(FORBID());
    const res = await packageItemRoute.PATCH(patchReq({ action: "CLOSE" }), ctx("po1"));
    expect(res.status).toBe(403);
  });
});

describe("PATCH /api/v1/admin/recharge-orders/[id]", () => {
  it("CLOSE：PENDING → EXPIRED", async () => {
    prismaState.rechargeOrder.findUnique.mockResolvedValueOnce({ id: "ro1", status: "PENDING" });
    prismaState.rechargeOrder.updateMany.mockResolvedValueOnce({ count: 1 });
    const res = await rechargeItemRoute.PATCH(patchReq({ action: "CLOSE" }), ctx("ro1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toMatchObject({ status: "EXPIRED", action: "CLOSE" });
    const arg = prismaState.rechargeOrder.updateMany.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(arg.data.status).toBe("EXPIRED");
  });

  it("FLAG：PENDING → FAILED", async () => {
    prismaState.rechargeOrder.findUnique.mockResolvedValueOnce({ id: "ro1", status: "PENDING" });
    prismaState.rechargeOrder.updateMany.mockResolvedValueOnce({ count: 1 });
    const res = await rechargeItemRoute.PATCH(patchReq({ action: "FLAG", reason: "风控标记" }), ctx("ro1"));
    const body = await res.json();
    expect(body.data).toMatchObject({ status: "FAILED", action: "FLAG" });
  });

  it("REVERSE：经 billingService 冲正 → REFUNDED + 元口径 + 记审计", async () => {
    prismaState.rechargeOrder.findUnique.mockResolvedValueOnce({ id: "ro1", status: "PAID" });
    billingStub.reverseRechargeOrder.mockResolvedValueOnce({ reversedMinor: BigInt(10000), idempotent: false });
    const res = await rechargeItemRoute.PATCH(patchReq({ action: "REVERSE", reason: "重复支付" }), ctx("ro1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toMatchObject({ status: "REFUNDED", reversedYuan: "100.00", action: "REVERSE" });
    expect(billingStub.reverseRechargeOrder).toHaveBeenCalledTimes(1);
    expect(prismaState.auditLog.create).toHaveBeenCalledTimes(1);
  });

  it("REVERSE 幂等命中（idempotent=true）不重复记审计", async () => {
    prismaState.rechargeOrder.findUnique.mockResolvedValueOnce({ id: "ro1", status: "PAID" });
    billingStub.reverseRechargeOrder.mockResolvedValueOnce({ reversedMinor: BigInt(0), idempotent: true });
    const res = await rechargeItemRoute.PATCH(patchReq({ action: "REVERSE" }), ctx("ro1"));
    expect(res.status).toBe(200);
    expect(prismaState.auditLog.create).not.toHaveBeenCalled();
  });

  it("PAID 订单不可 CLOSE → 400（应走冲正）", async () => {
    prismaState.rechargeOrder.findUnique.mockResolvedValueOnce({ id: "ro1", status: "PAID" });
    const res = await rechargeItemRoute.PATCH(patchReq({ action: "CLOSE" }), ctx("ro1"));
    expect(res.status).toBe(400);
    expect(prismaState.rechargeOrder.updateMany).not.toHaveBeenCalled();
  });
});
