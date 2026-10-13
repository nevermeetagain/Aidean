/**
 * billing 账本核心单测（B.2.2；spec 六 Requirement 的服务层取证）。
 *
 * 策略：vi.mock '../../../db/prisma'（顶层与事务共享同一 stub 组，fn 引用一致）；
 * 乐观锁 updateMany 恒返回 1（冲突路径单独用例覆盖）。
 */
import { createHmac } from "node:crypto";

import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

const { txStub, txFn } = vi.hoisted(() => {
  const mk = () => vi.fn();
  const txStub = {
    wallet: { findUnique: mk(), updateMany: mk() },
    ledgerEntry: { create: mk(), findUnique: mk(), groupBy: mk() },
    balanceHold: {
      create: mk(),
      findUnique: mk(),
      update: mk(),
      findMany: mk(),
      aggregate: mk(),
    },
    rechargeOrder: { create: mk(), findUnique: mk(), updateMany: mk(), findMany: mk() },
  };
  const txFn = mk();
  return { txStub, txFn };
});

vi.mock("../../../db/prisma", () => ({
  prisma: { ...txStub, $transaction: txFn },
}));

import { ApiError } from "../../../../app/api/v1/_lib/errors";
import { devMockChannel } from "../service";
import { billingService, fmtLocalDate, groupLedgerByDate } from "../service";

const walletFindUnique = txStub.wallet.findUnique as Mock;
const walletUpdateMany = txStub.wallet.updateMany as Mock;
const entryCreate = txStub.ledgerEntry.create as Mock;
const entryFindUnique = txStub.ledgerEntry.findUnique as Mock;
const holdCreate = txStub.balanceHold.create as Mock;
const holdFindUnique = txStub.balanceHold.findUnique as Mock;
const holdUpdate = txStub.balanceHold.update as Mock;
const holdFindMany = txStub.balanceHold.findMany as Mock;
const orderCreate = txStub.rechargeOrder.create as Mock;
const orderFindUnique = txStub.rechargeOrder.findUnique as Mock;
const orderUpdateMany = txStub.rechargeOrder.updateMany as Mock;

function walletRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "w-1",
    userId: "u-1",
    currency: "CNY",
    balanceMinor: 1000n,
    heldMinor: 0n,
    postedDebitsMinor: 0n,
    postedCreditsMinor: 0n,
    status: "ACTIVE",
    lockVersion: 1,
    ...overrides,
  };
}

async function expectApiError(promise: Promise<unknown>, code: number) {
  try {
    await promise;
    expect.unreachable("should have thrown ApiError");
  } catch (err) {
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).code).toBe(code);
  }
}

/** 与 devMockChannel 相同算法构造合法签名 */
function signOf(orderId: string): string {
  return createHmac("sha256", "aidean-dev-notify-secret").update(orderId).digest("hex");
}

beforeEach(() => {
  vi.clearAllMocks();
  txFn.mockImplementation(
    async (fn: (tx: typeof txStub) => Promise<unknown>) => fn(txStub)
  );
  walletUpdateMany.mockResolvedValue({ count: 1 });
  holdFindMany.mockResolvedValue([]); // 默认无过期 holds
});

describe("充值订单闭环", () => {
  it("创建订单：档位有效 → PENDING 订单 + mock 支付参数", async () => {
    orderCreate.mockResolvedValue({
      id: "o-1",
      userId: "u-1",
      amountMinor: 5500n,
      bonusAmountMinor: 0n,
      totalAmountMinor: 5500n,
      payMethod: "WECHAT",
      status: "PENDING",
      createdAt: new Date("2026-08-28T10:00:00Z"),
      paidAt: null,
    });
    const res = await billingService.createRechargeOrder("u-1", "basic", "WECHAT");
    expect(res.order.status).toBe("PENDING");
    expect(res.order.totalYuan).toBe("55.00");
    expect(res.payment.payUrl).toContain("mockOrderId=o-1");
    expect(orderCreate).toHaveBeenCalledOnce();
  });

  it("创建订单：档位不存在 → 40000", async () => {
    await expectApiError(billingService.createRechargeOrder("u-1", "ghost", "WECHAT"), 40000);
    expect(orderCreate).not.toHaveBeenCalled();
  });

  it("回调入账：验签通过 → PAID + TOPUP 入账 + 乐观锁同步", async () => {
    orderFindUnique.mockResolvedValue({
      id: "o-1",
      userId: "u-1",
      amountMinor: 5500n,
      bonusAmountMinor: 0n,
      totalAmountMinor: 5500n,
      payMethod: "WECHAT",
      status: "PENDING",
      createdAt: new Date(),
      paidAt: null,
    });
    walletFindUnique.mockResolvedValue(walletRow());
    orderUpdateMany.mockResolvedValue({ count: 1 });
    entryCreate.mockResolvedValue({ id: "e-1" });

    const res = await billingService.handleChannelNotify("o-1", {
      payMethod: "WECHAT",
      sign: signOf("o-1"),
    });
    expect(res).toEqual({ status: "PAID", idempotent: false });
    expect(walletUpdateMany).toHaveBeenCalledOnce();
    const adj = walletUpdateMany.mock.calls[0][0].data;
    expect(adj.balanceMinor).toEqual({ increment: 5500n });
    expect(adj.postedCreditsMinor).toEqual({ increment: 5500n });
    const entry = entryCreate.mock.calls[0][0].data;
    expect(entry.entryType).toBe("TOPUP");
    expect(entry.direction).toBe("CREDIT");
    expect(entry.idempotencyKey).toBe("recharge:o-1");
    expect(holdUpdate).not.toHaveBeenCalled();
  });

  it("回调入账：错误签名 → 40005 且不进事务", async () => {
    await expectApiError(
      billingService.handleChannelNotify("o-1", { payMethod: "WECHAT", sign: "bad" }),
      40005
    );
    expect(orderFindUnique).not.toHaveBeenCalled();
  });

  it("回调入账：非 PENDING 订单重放 → 幂等返回当前状态，不再入账", async () => {
    orderFindUnique.mockResolvedValue({
      id: "o-1",
      userId: "u-1",
      amountMinor: 5500n,
      bonusAmountMinor: 0n,
      totalAmountMinor: 5500n,
      payMethod: "WECHAT",
      status: "PAID",
      createdAt: new Date(),
      paidAt: new Date(),
    });
    const res = await billingService.handleChannelNotify("o-1", {
      payMethod: "WECHAT",
      sign: signOf("o-1"),
    });
    expect(res).toEqual({ status: "PAID", idempotent: true });
    expect(orderUpdateMany).not.toHaveBeenCalled();
    expect(entryCreate).not.toHaveBeenCalled();
  });

  it("回调入账：订单不存在 → 40002", async () => {
    orderFindUnique.mockResolvedValue(null);
    await expectApiError(
      billingService.handleChannelNotify("o-x", { payMethod: "ALIPAY", sign: signOf("o-x") }),
      40002
    );
  });
});

describe("hold 预扣生命周期", () => {
  it("余额不足 → 40001 且零副作用（无冻结、无 hold 行）", async () => {
    holdFindUnique.mockResolvedValue(null);
    walletFindUnique.mockResolvedValue(walletRow({ balanceMinor: 100n }));
    await expectApiError(billingService.hold("u-1", "req-1", 200n), 40001);
    expect(holdCreate).not.toHaveBeenCalled();
    expect(walletUpdateMany).not.toHaveBeenCalled();
  });

  it("预扣 → 捕获差额释放：10.00 冻结 2.00 捕获 1.50 → 余额 8.50、流水 CONSUME 1.50", async () => {
    // 1) 预扣
    holdFindUnique.mockResolvedValueOnce(null);
    walletFindUnique.mockResolvedValueOnce(walletRow({ balanceMinor: 1000n }));
    holdCreate.mockResolvedValueOnce({ id: "h-1" });
    const created = await billingService.hold("u-1", "req-1", 200n);
    expect(created).toEqual({ holdId: "h-1", idempotent: false });
    expect(walletUpdateMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { id: "w-1", lockVersion: 1 },
        data: expect.objectContaining({ heldMinor: { increment: 200n } }),
      })
    );

    // 2) 捕获 150n（差额 50n 解冻退还）
    holdFindUnique.mockResolvedValue({
      id: "h-1",
      requestId: "req-1",
      walletId: "w-1",
      amountMinor: 200n,
      capturedMinor: 0n,
      status: "AUTHORIZED",
      expiresAt: new Date(Date.now() + 60_000),
      createdAt: new Date(),
    });
    walletFindUnique.mockResolvedValue(
      walletRow({ balanceMinor: 1000n, heldMinor: 200n, lockVersion: 2 })
    );
    entryCreate.mockResolvedValue({ id: "e-2" });
    const captured = await billingService.captureHold("req-1", 150n);
    expect(captured).toEqual({ capturedMinor: 150n, idempotent: false });

    const adj = walletUpdateMany.mock.calls.at(-1)![0].data;
    expect(adj.balanceMinor).toEqual({ increment: -150n }); // 扣减=负增量
    expect(adj.heldMinor).toEqual({ increment: -200n }); // 全额解冻
    expect(adj.postedDebitsMinor).toEqual({ increment: 150n });
    const entry = entryCreate.mock.calls.at(-1)![0].data;
    expect(entry.entryType).toBe("CONSUME");
    expect(entry.amountMinor).toBe(150n);
    expect(entry.idempotencyKey).toBe("hold:req-1:capture");
    expect(holdUpdate).toHaveBeenLastCalledWith({
      where: { id: "h-1" },
      data: { status: "CAPTURED", capturedMinor: 150n },
    });

    // 3) 钱包视图：8.50 / 0.00 / 8.50
    walletFindUnique.mockResolvedValue(
      walletRow({ balanceMinor: 850n, heldMinor: 0n, postedDebitsMinor: 150n })
    );
    const view = await billingService.getWalletView("u-1");
    expect(view.balanceYuan).toBe("8.50");
    expect(view.heldYuan).toBe("0.00");
    expect(view.availableYuan).toBe("8.50");
  });

  it("捕获幂等：已 CAPTURED 重放 → 返回首次捕获额，不再改账", async () => {
    holdFindUnique.mockResolvedValue({
      id: "h-1",
      requestId: "req-1",
      walletId: "w-1",
      amountMinor: 200n,
      capturedMinor: 150n,
      status: "CAPTURED",
      expiresAt: new Date(),
      createdAt: new Date(),
    });
    const res = await billingService.captureHold("req-1", 150n);
    expect(res).toEqual({ capturedMinor: 150n, idempotent: true });
    expect(walletUpdateMany).not.toHaveBeenCalled();
    expect(entryCreate).not.toHaveBeenCalled();
  });

  it("捕获超额 → 40000；预扣不存在/已作废 → 40004", async () => {
    holdFindUnique.mockResolvedValueOnce({
      id: "h-1",
      requestId: "req-1",
      walletId: "w-1",
      amountMinor: 200n,
      capturedMinor: 0n,
      status: "AUTHORIZED",
      expiresAt: new Date(),
      createdAt: new Date(),
    });
    await expectApiError(billingService.captureHold("req-1", 300n), 40000);

    holdFindUnique.mockResolvedValueOnce(null);
    await expectApiError(billingService.captureHold("req-ghost", 100n), 40004);
    holdFindUnique.mockResolvedValueOnce({
      id: "h-2",
      requestId: "req-2",
      walletId: "w-1",
      amountMinor: 100n,
      capturedMinor: 0n,
      status: "VOIDED",
      expiresAt: new Date(),
      createdAt: new Date(),
    });
    await expectApiError(billingService.captureHold("req-2", 100n), 40004);
  });

  it("作废预扣：全额解冻无流水；已 VOIDED 幂等", async () => {
    holdFindUnique.mockResolvedValueOnce({
      id: "h-1",
      requestId: "req-1",
      walletId: "w-1",
      amountMinor: 200n,
      capturedMinor: 0n,
      status: "AUTHORIZED",
      expiresAt: new Date(),
      createdAt: new Date(),
    });
    walletFindUnique.mockResolvedValueOnce(
      walletRow({ balanceMinor: 1000n, heldMinor: 200n, lockVersion: 2 })
    );
    const res = await billingService.voidHold("req-1");
    expect(res).toEqual({ idempotent: false });
    const adj = walletUpdateMany.mock.calls.at(-1)![0].data;
    expect(adj.heldMinor).toEqual({ increment: -200n });
    expect(adj.balanceMinor).toBeUndefined();
    expect(entryCreate).not.toHaveBeenCalled();

    holdFindUnique.mockResolvedValueOnce({
      id: "h-1",
      requestId: "req-1",
      walletId: "w-1",
      amountMinor: 200n,
      capturedMinor: 0n,
      status: "VOIDED",
      expiresAt: new Date(),
      createdAt: new Date(),
    });
    const again = await billingService.voidHold("req-1");
    expect(again).toEqual({ idempotent: true });
  });

  it("写路径懒清理：过期 AUTHORIZED hold 先解冻置 EXPIRED，后续操作继续", async () => {
    holdFindUnique.mockResolvedValueOnce(null); // hold 幂等检查
    holdFindMany.mockResolvedValue([{ id: "h-old", amountMinor: 100n }]);
    walletFindUnique.mockResolvedValue(walletRow({ balanceMinor: 500n, heldMinor: 100n }));
    holdCreate.mockResolvedValue({ id: "h-new" });

    await billingService.hold("u-1", "req-2", 100n);
    expect(holdUpdate).toHaveBeenCalledWith({
      where: { id: "h-old" },
      data: { status: "EXPIRED" },
    });
    // 两次 adjust：先解冻过期 hold，再冻结新 hold
    const calls = walletUpdateMany.mock.calls;
    expect(calls).toHaveLength(2);
    expect(calls[0][0].data.heldMinor).toEqual({ increment: -100n });
    expect(calls[1][0].data.heldMinor).toEqual({ increment: 100n });
    expect(calls[1][0].where.lockVersion).toBe(2); // 版本已推进
  });

  it("乐观锁冲突：updateMany count=0 → 内联重试 3 次耗尽 → 50000", async () => {
    holdFindUnique.mockResolvedValue(null);
    // 恒充足（否则 40001 提前抛出，走不到乐观锁分支）
    walletFindUnique.mockResolvedValue(walletRow({ balanceMinor: 1000n }));
    walletUpdateMany.mockResolvedValue({ count: 0 });
    await expectApiError(billingService.hold("u-1", "req-3", 200n), 50000);
    expect(walletUpdateMany).toHaveBeenCalledTimes(3);
  });
});

describe("对账与视图", () => {
  it("verifyWalletIntegrity 自洽：diff 全 0 → ok", async () => {
    walletFindUnique.mockResolvedValue(
      walletRow({ postedCreditsMinor: 1000n, postedDebitsMinor: 150n, heldMinor: 200n })
    );
    txStub.ledgerEntry.groupBy.mockResolvedValue([
      { direction: "DEBIT", _sum: { amountMinor: 150n } },
      { direction: "CREDIT", _sum: { amountMinor: 1000n } },
    ]);
    txStub.balanceHold.aggregate.mockResolvedValue({ _sum: { amountMinor: 200n } });
    const res = await billingService.verifyWalletIntegrity("u-1");
    expect(res).toEqual({ ok: true, ledgerDiff: 0n, heldDiff: 0n });
  });

  it("verifyWalletIntegrity 不一致：held 与活跃 holds 失衡 → ok=false 且差异明细", async () => {
    walletFindUnique.mockResolvedValue(
      walletRow({ postedCreditsMinor: 1000n, postedDebitsMinor: 150n, heldMinor: 200n })
    );
    txStub.ledgerEntry.groupBy.mockResolvedValue([
      { direction: "DEBIT", _sum: { amountMinor: 150n } },
      { direction: "CREDIT", _sum: { amountMinor: 1000n } },
    ]);
    txStub.balanceHold.aggregate.mockResolvedValue({ _sum: { amountMinor: 100n } });
    const res = await billingService.verifyWalletIntegrity("u-1");
    expect(res.ok).toBe(false);
    expect(res.ledgerDiff).toBe(0n);
    expect(res.heldDiff).toBe(100n);
  });

  it("groupLedgerByDate：跨日倒序分为两组、同日合并", () => {
    const groups = groupLedgerByDate([
      { id: "1", txnId: "t1", direction: "CREDIT", entryType: "TOPUP", status: "SETTLED", amountMinor: 5500n, sourceType: null, sourceId: null, effectiveAt: new Date("2026-08-28T09:00:00+08:00") },
      { id: "2", txnId: "t2", direction: "DEBIT", entryType: "CONSUME", status: "SETTLED", amountMinor: 150n, sourceType: null, sourceId: null, effectiveAt: new Date("2026-08-28T08:00:00+08:00") },
      { id: "3", txnId: "t3", direction: "CREDIT", entryType: "TOPUP", status: "SETTLED", amountMinor: 1000n, sourceType: null, sourceId: null, effectiveAt: new Date("2026-08-27T09:00:00+08:00") },
    ]);
    expect(groups.map((g) => g.date)).toEqual(["2026-08-28", "2026-08-27"]);
    expect(groups[0].entries).toHaveLength(2);
    expect(groups[0].entries[0].amountYuan).toBe("55.00");
    expect(fmtLocalDate(new Date("2026-08-28T23:30:00+08:00"))).toBe("2026-08-28");
  });
});
