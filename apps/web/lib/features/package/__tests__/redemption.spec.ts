/**
 * redemption 兑换码子域单测（rebuild-admin-console-and-harden-auth SubTask 3.1.1）。
 *
 * 覆盖 checklist 3-1（并发双花恰一单、幂等、过期拒绝、GRANT 账本恰一条）：
 * - 余额码核销：CAS USED + GRANT 幂等键 redemption:{id} 同事务；
 * - 并发双花：二次 CAS count=0 → 拒绝且不重复入账（恰一单）；
 * - 已用/禁用/过期三态拒绝；套餐码核销建 PackageOrder；
 * - 批次生成（含撞码自动补码）、单码禁用、卡商出库 ISSUED。
 *
 * 策略：真实 redemptionService/repository 逻辑 + vi.mock db/prisma（事务注入同组 stub）
 * + vi.mock billing/service（仅 stub creditInTx，断言入账参数与调用次数）。
 */
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

const prismaStub = vi.hoisted(() => {
  const mk = () => vi.fn();
  return {
    redemption: { findUnique: mk(), updateMany: mk(), createMany: mk(), findMany: mk() },
    package: { findUnique: mk() },
    packageOrder: { create: mk() },
    $transaction: mk(),
  };
});
const billingStub = vi.hoisted(() => ({ billingService: { creditInTx: vi.fn() } }));

vi.mock("../../../db/prisma", () => ({ prisma: prismaStub }));
vi.mock("../../billing/service", () => billingStub);

import { ApiError } from "../../../../app/api/v1/_lib/errors";
import { redemptionService } from "../redemption/service";

const txStub = prismaStub as unknown as typeof prismaStub & {
  redemption: typeof prismaStub.redemption;
  package: typeof prismaStub.package;
  packageOrder: typeof prismaStub.packageOrder;
};

function redemptionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "r-1",
    code: "ABCD1234EFGH",
    targetType: "BALANCE",
    balanceMinor: 5000n,
    packageId: null,
    name: null,
    batchNo: "B20260901ABC123",
    status: "ENABLED",
    expiresAt: null,
    redeemedBy: null,
    redeemedAt: null,
    createdAt: new Date("2026-09-01T00:00:00Z"),
    ...overrides,
  };
}

async function expectApiError(promise: Promise<unknown>, code: number, msgContains?: string) {
  try {
    await promise;
    expect.unreachable("should have thrown ApiError");
  } catch (err) {
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).code).toBe(code);
    if (msgContains) expect((err as ApiError).message).toContain(msgContains);
  }
}

beforeEach(() => {
  vi.resetAllMocks(); // resetAllMocks 清空 mockResolvedValueOnce 队列（clearAllMocks 不清，防用例间串扰）
  prismaStub.$transaction.mockImplementation(
    async (fn: (tx: unknown) => Promise<unknown>) => fn(txStub)
  );
  prismaStub.redemption.updateMany.mockResolvedValue({ count: 1 });
  billingStub.billingService.creditInTx.mockResolvedValue({ idempotent: false });
});

describe("余额码核销（CAS + GRANT 幂等入账）", () => {
  it("① 成功：ENABLED→USED，GRANT 恰一条（idempotencyKey=redemption:{id}，amountMinor=面额）", async () => {
    prismaStub.redemption.findUnique.mockResolvedValueOnce(redemptionRow());
    const res = await redemptionService.redeem("ABCD1234EFGH", "u-1");
    expect(res).toEqual({ kind: "balance", balanceMinor: 5000n });

    const cas = prismaStub.redemption.updateMany.mock.calls[0][0];
    expect(cas.where).toEqual({ id: "r-1", status: { in: ["ENABLED", "ISSUED"] } });
    expect(cas.data.status).toBe("USED");
    expect(cas.data.redeemedBy).toBe("u-1");

    expect(billingStub.billingService.creditInTx).toHaveBeenCalledOnce();
    const grant = billingStub.billingService.creditInTx.mock.calls[0][1];
    expect(grant.entryType).toBe("GRANT");
    expect(grant.amountMinor).toBe(5000n);
    expect(grant.idempotencyKey).toBe("redemption:r-1");
    expect(grant.sourceId).toBe("r-1");
  });

  it("② 并发双花：两请求先后 CAS，第二单 count=0 → 拒绝且不重复入账（恰一单入账）", async () => {
    prismaStub.redemption.findUnique.mockResolvedValueOnce(redemptionRow());
    await redemptionService.redeem("ABCD1234EFGH", "u-1"); // 第一单成功

    // 第二单：CAS 落败（并发下另一事务已置 USED）
    prismaStub.redemption.findUnique.mockResolvedValueOnce(redemptionRow());
    prismaStub.redemption.updateMany.mockResolvedValueOnce({ count: 0 });
    await expectApiError(redemptionService.redeem("ABCD1234EFGH", "u-2"), 40000, "已被使用");

    expect(billingStub.billingService.creditInTx).toHaveBeenCalledTimes(1); // 恰一单入账
  });

  it("③ 幂等/已用：status=USED 直接拒绝（不二次入账）", async () => {
    prismaStub.redemption.findUnique.mockResolvedValueOnce(redemptionRow({ status: "USED" }));
    await expectApiError(redemptionService.redeem("ABCD1234EFGH", "u-1"), 40000, "已被使用");
    expect(prismaStub.redemption.updateMany).not.toHaveBeenCalled();
    expect(billingStub.billingService.creditInTx).not.toHaveBeenCalled();
  });

  it("④ 禁用：status=DISABLED 拒绝", async () => {
    prismaStub.redemption.findUnique.mockResolvedValueOnce(redemptionRow({ status: "DISABLED" }));
    await expectApiError(redemptionService.redeem("ABCD1234EFGH", "u-1"), 40000, "已禁用");
  });

  it("⑤ 过期：expiresAt<now 懒置 EXPIRED 并拒绝", async () => {
    prismaStub.redemption.findUnique.mockResolvedValueOnce(
      redemptionRow({ expiresAt: new Date("2020-01-01T00:00:00Z") })
    );
    await expectApiError(
      redemptionService.redeem("ABCD1234EFGH", "u-1", new Date("2026-09-08T00:00:00Z")),
      40000,
      "已过期"
    );
    // 懒过期写库：ENABLED→EXPIRED
    const expire = prismaStub.redemption.updateMany.mock.calls[0][0];
    expect(expire.data.status).toBe("EXPIRED");
  });

  it("⑥ 码不存在 → 40000 兑换码无效", async () => {
    prismaStub.redemption.findUnique.mockResolvedValueOnce(null);
    await expectApiError(redemptionService.redeem("NOPE12345678", "u-1"), 40000, "无效");
  });
});

describe("套餐码核销", () => {
  it("⑦ 成功：PackageOrder ACTIVE + expiresAt=durationHours 推演 + 返回 kind=package", async () => {
    prismaStub.redemption.findUnique.mockResolvedValueOnce(
      redemptionRow({ targetType: "PACKAGE", balanceMinor: null, packageId: "pkg-1" })
    );
    prismaStub.package.findUnique.mockResolvedValueOnce({
      id: "pkg-1",
      title: "Pro 月卡",
      status: "ACTIVE",
      deletedAt: null,
      durationHours: 720,
    });
    prismaStub.packageOrder.create.mockResolvedValueOnce({ id: "po-1" });

    const res = await redemptionService.redeem("PKG1234EFGH", "u-1", new Date("2026-09-08T00:00:00Z"));
    expect(res).toEqual({ kind: "package", packageTitle: "Pro 月卡" });
    expect(billingStub.billingService.creditInTx).not.toHaveBeenCalled(); // 套餐码不走余额入账

    const order = prismaStub.packageOrder.create.mock.calls[0][0].data;
    expect(order.userId).toBe("u-1");
    expect(order.packageId).toBe("pkg-1");
    expect(order.status).toBe("ACTIVE");
    expect(order.expiresAt).toEqual(new Date("2026-10-08T00:00:00Z")); // +720h = +30 天
  });

  it("⑧ 绑定套餐已停用 → 40000 不可兑换", async () => {
    prismaStub.redemption.findUnique.mockResolvedValueOnce(
      redemptionRow({ targetType: "PACKAGE", balanceMinor: null, packageId: "pkg-1" })
    );
    prismaStub.package.findUnique.mockResolvedValueOnce({
      id: "pkg-1",
      title: "Pro 月卡",
      status: "DISABLED",
      deletedAt: null,
      durationHours: 720,
    });
    await expectApiError(redemptionService.redeem("PKG1234EFGH", "u-1"), 40000, "已停用");
    expect(prismaStub.packageOrder.create).not.toHaveBeenCalled();
  });
});

describe("批次生成与卡商出库", () => {
  it("⑨ 生成 3 码：createMany 返回 3 → 返回 3 枚 12 位码 + batchNo", async () => {
    prismaStub.redemption.createMany.mockResolvedValue({ count: 3 });
    const { batchNo, codes } = await redemptionService.generateBatch({
      targetType: "BALANCE",
      balanceMinor: 1000n,
      count: 3,
      prefix: "PRE",
    });
    expect(codes).toHaveLength(3);
    expect(batchNo).toMatch(/^B\d{8}[A-F0-9]{6}$/);
    for (const c of codes) expect(c).toMatch(/^PRE[A-Z0-9]{12}$/);
    // 面额正确落库
    const created = prismaStub.redemption.createMany.mock.calls[0][0];
    expect(created.data).toHaveLength(3);
    expect(created.data[0].balanceMinor).toBe(1000n);
    expect(created.data[0].status).toBe("ENABLED");
  });

  it("⑩ 撞码自动补码：首轮插 2、次轮补 1 → 总数 3", async () => {
    prismaStub.redemption.createMany
      .mockResolvedValueOnce({ count: 2 })
      .mockResolvedValueOnce({ count: 1 });
    const { codes } = await redemptionService.generateBatch({
      targetType: "BALANCE",
      balanceMinor: 1000n,
      count: 3,
    });
    expect(codes).toHaveLength(3);
    expect(prismaStub.redemption.createMany).toHaveBeenCalledTimes(2);
  });

  it("⑪ 套餐码绑定已停用套餐 → 40000 不可生成", async () => {
    prismaStub.package.findUnique.mockResolvedValueOnce({ id: "pkg-1", status: "DISABLED", deletedAt: null });
    await expectApiError(
      redemptionService.generateBatch({ targetType: "PACKAGE", packageId: "pkg-1", count: 1 }),
      40000,
      "不可生成"
    );
  });

  it("⑫ 单码禁用：ENABLED → true；已用/已禁（count=0）→ false", async () => {
    prismaStub.redemption.updateMany.mockResolvedValueOnce({ count: 1 });
    expect(await redemptionService.disableCode("r-1")).toBe(true);

    prismaStub.redemption.updateMany.mockResolvedValueOnce({ count: 0 });
    expect(await redemptionService.disableCode("r-1")).toBe(false);
  });

  it("⑬ 卡商出库：挑 count 枚 ENABLED → ISSUED 并返回明文；库存不足 → 40000 不出部分货", async () => {
    prismaStub.redemption.findMany.mockResolvedValueOnce([
      redemptionRow({ id: "r-1", code: "AAAA1111BBBB" }),
      redemptionRow({ id: "r-2", code: "CCCC2222DDDD" }),
    ]);
    prismaStub.redemption.updateMany.mockResolvedValue({ count: 2 });
    const res = await redemptionService.issueToPartner({
      targetType: "BALANCE",
      balanceMinor: 5000n,
      count: 2,
    });
    expect(res.codes).toEqual(["AAAA1111BBBB", "CCCC2222DDDD"]);
    // ISSUED 出库断言
    const mark = prismaStub.redemption.updateMany.mock.calls[0][0];
    expect(mark.where).toEqual({ id: { in: ["r-1", "r-2"] }, status: "ENABLED" });
    expect(mark.data.status).toBe("ISSUED");

    // 库存不足
    prismaStub.redemption.findMany.mockResolvedValueOnce([redemptionRow()]);
    await expectApiError(
      redemptionService.issueToPartner({ targetType: "BALANCE", balanceMinor: 5000n, count: 5 }),
      40000,
      "库存不足"
    );
  });
});

