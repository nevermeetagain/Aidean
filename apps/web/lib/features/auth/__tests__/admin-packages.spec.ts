/**
 * /api/v1/admin/packages 管理域单测（rebuild-admin-console-and-harden-auth SubTask 3.2.1）。
 *
 * 覆盖 checklist 2-1（守卫矩阵）/2-5（audit）与 spec「套餐管理」：
 * - GET：套餐全量（含 DISABLED）+ 已兑换订单计数 + PackageOrder 只读列表 + priceMinor 元分；
 * - POST：新建（BigInt 分往返）；PATCH [id]：白名单；DELETE：有码引用仅 DISABLED / 无引用软删。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const guardStub = vi.hoisted(() => ({ requireAdminApi: vi.fn() }));
const prismaState = vi.hoisted(() => ({
  package: { findMany: vi.fn(), create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  packageOrder: { findMany: vi.fn() },
  $transaction: vi.fn(),
}));
const auditStub = vi.hoisted(() => ({ writeAudit: vi.fn() }));

vi.mock("../session", () => guardStub);
vi.mock("../../../db/prisma", () => ({ prisma: prismaState }));
vi.mock("../../../../app/api/v1/_lib/audit", () => auditStub);

import { ApiError, ERROR_CODES } from "../../../../app/api/v1/_lib/errors";
const packagesRoute = await import("../../../../app/api/v1/admin/packages/route");
const packageDetailRoute = await import("../../../../app/api/v1/admin/packages/[id]/route");

const SESSION_OK = { userId: "u-admin", tier: "PRO" };
const FORBID = () => new ApiError(ERROR_CODES.FORBIDDEN, "需要管理员权限");

function pkgRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "pkg-1",
    title: "Pro 月卡",
    description: null,
    priceMinor: 29900n,
    durationHours: 720,
    benefits: ["高速通道"],
    status: "ACTIVE",
    sortOrder: 1,
    _count: { orders: 3 },
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks(); // resetAllMocks 清空 mockResolvedValueOnce 队列（clearAllMocks 不清，防用例间串扰）
});

describe("GET /api/v1/admin/packages", () => {
  it("① 放行 → 200；priceMinor 转字符串 + 已兑换计数 + 订单列表含用户邮箱", async () => {
    guardStub.requireAdminApi.mockResolvedValueOnce(SESSION_OK);
    prismaState.$transaction.mockResolvedValueOnce([
      [pkgRow()],
      [
        {
          id: "po-1",
          status: "ACTIVE",
          redeemedAt: new Date("2026-09-02T00:00:00Z"),
          expiresAt: null,
          user: { email: "alice@aidean.com" },
          package: { title: "Pro 月卡" },
        },
      ],
    ]);
    const res = await packagesRoute.GET(new Request("http://localhost/api/v1/admin/packages"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(body.data.packages[0].priceMinor).toBe("29900"); // BigInt 安全序列化
    expect(body.data.packages[0].redeemedCount).toBe(3);
    expect(body.data.orders[0].userEmail).toBe("alice@aidean.com");
    expect(body.data.orders[0].packageTitle).toBe("Pro 月卡");
  });

  it("② 非管理员 → 403", async () => {
    guardStub.requireAdminApi.mockRejectedValueOnce(FORBID());
    const res = await packagesRoute.GET(new Request("http://localhost/api/v1/admin/packages"));
    expect(res.status).toBe(403);
  });
});

describe("POST /api/v1/admin/packages 元分往返", () => {
  it("③ 新建 → 200；priceMinor 分 BigInt 落库 + AuditLog(action=1)", async () => {
    guardStub.requireAdminApi.mockResolvedValueOnce(SESSION_OK);
    prismaState.package.create.mockResolvedValueOnce({ id: "pkg-new", title: "Max 年卡" });
    const res = await packagesRoute.POST(
      new Request("http://localhost/api/v1/admin/packages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "Max 年卡", priceMinor: "199900", durationHours: 8760, status: "ACTIVE" }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBe(0);
    // BigInt 分落库（字符串 → BigInt 转换成功）
    const created = prismaState.package.create.mock.calls[0][0].data;
    expect(created.priceMinor).toBe(199900n);
    expect(auditStub.writeAudit).toHaveBeenCalledOnce();
    expect(auditStub.writeAudit.mock.calls[0][0].action).toBe(1);
  });

  it("④ priceMinor 为负 → 400（min(0n) 拦截）", async () => {
    guardStub.requireAdminApi.mockResolvedValueOnce(SESSION_OK);
    const res = await packagesRoute.POST(
      new Request("http://localhost/api/v1/admin/packages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "X", priceMinor: "-100" }),
      })
    );
    expect(res.status).toBe(400);
    expect(prismaState.package.create).not.toHaveBeenCalled();
  });
});

describe("PATCH/DELETE /api/v1/admin/packages/[id]", () => {
  it("⑤ PATCH 编辑 → 200 + AuditLog(action=2)；priceMinor 元分往返", async () => {
    guardStub.requireAdminApi.mockResolvedValueOnce(SESSION_OK);
    prismaState.package.findUnique.mockResolvedValueOnce(pkgRow());
    prismaState.package.update.mockResolvedValueOnce({ id: "pkg-1", title: "Pro 月卡", status: "ACTIVE" });
    const res = await packageDetailRoute.PATCH(
      new Request("http://localhost/api/v1/admin/packages/pkg-1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ priceMinor: "39900", status: "DISABLED" }),
      }),
      { params: Promise.resolve({ id: "pkg-1" }) }
    );
    expect(res.status).toBe(200);
    const update = prismaState.package.update.mock.calls[0][0];
    expect(update.data.priceMinor).toBe(39900n);
    expect(update.data.status).toBe("DISABLED");
    expect(auditStub.writeAudit.mock.calls[0][0].action).toBe(2);
  });

  it("⑥ DELETE 有码引用（redemptions>0）→ 仅置 DISABLED 不软删", async () => {
    guardStub.requireAdminApi.mockResolvedValueOnce(SESSION_OK);
    prismaState.package.findUnique.mockResolvedValueOnce({
      ...pkgRow(),
      _count: { redemptions: 5 },
    });
    prismaState.package.update.mockResolvedValueOnce({ id: "pkg-1", title: "Pro 月卡", status: "DISABLED", deletedAt: null });
    const res = await packageDetailRoute.DELETE(
      new Request("http://localhost/api/v1/admin/packages/pkg-1", { method: "DELETE" }),
      { params: Promise.resolve({ id: "pkg-1" }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.deleted).toBe(false);
    expect(body.data.disabled).toBe(true);
    const update = prismaState.package.update.mock.calls[0][0];
    expect(update.data.status).toBe("DISABLED");
    expect(update.data.deletedAt).toBeUndefined(); // 有引用不物理软删
  });

  it("⑦ DELETE 无引用 → 软删（deletedAt + DISABLED）", async () => {
    guardStub.requireAdminApi.mockResolvedValueOnce(SESSION_OK);
    prismaState.package.findUnique.mockResolvedValueOnce({ ...pkgRow(), _count: { redemptions: 0 } });
    prismaState.package.update.mockResolvedValueOnce({ id: "pkg-1", title: "Pro 月卡", status: "DISABLED", deletedAt: new Date() });
    const res = await packageDetailRoute.DELETE(
      new Request("http://localhost/api/v1/admin/packages/pkg-1", { method: "DELETE" }),
      { params: Promise.resolve({ id: "pkg-1" }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.deleted).toBe(true);
    const update = prismaState.package.update.mock.calls[0][0];
    expect(update.data.deletedAt).toBeInstanceOf(Date);
  });
});

