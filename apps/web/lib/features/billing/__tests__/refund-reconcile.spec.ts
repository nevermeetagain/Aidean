/**
 * 释放（release/void）与对账（reconcile）域单测（资金路径补充取证）。
 *
 * 覆盖口径：release 路径对称性（held 回退、balance 与流水零扰动）、
 * hold→void 往返净变动为零、对账聚合空方向回退 0n、
 * verifyWalletIntegrity 的 ledger 失衡 / 钱包缺失分支。
 * （ok 与 held 失衡分支已在 billing.spec.ts 覆盖，此处不重复。）
 */
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

import { billingRepository } from "../repository";
import { billingService } from "../service";

const walletFindUnique = txStub.wallet.findUnique as Mock;
const walletUpdateMany = txStub.wallet.updateMany as Mock;
const entryCreate = txStub.ledgerEntry.create as Mock;
const holdCreate = txStub.balanceHold.create as Mock;
const holdFindUnique = txStub.balanceHold.findUnique as Mock;
const holdUpdate = txStub.balanceHold.update as Mock;
const holdFindMany = txStub.balanceHold.findMany as Mock;
const entryGroupBy = txStub.ledgerEntry.groupBy as Mock;
const holdAggregate = txStub.balanceHold.aggregate as Mock;

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

function holdRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "h-1",
    requestId: "req-1",
    walletId: "w-1",
    amountMinor: 200n,
    capturedMinor: 0n,
    status: "AUTHORIZED",
    expiresAt: new Date(Date.now() + 60_000),
    createdAt: new Date(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  txFn.mockImplementation(async (fn: (tx: typeof txStub) => Promise<unknown>) => fn(txStub));
  walletUpdateMany.mockResolvedValue({ count: 1 });
  holdFindMany.mockResolvedValue([]); // 默认无过期 holds
});

describe("release 对称性", () => {
  it("voidHold：仅 heldDelta=−amount，balance 与流水零扰动，hold 置 VOIDED", async () => {
    holdFindUnique.mockResolvedValue(holdRow());
    walletFindUnique.mockResolvedValue(walletRow({ balanceMinor: 1000n, heldMinor: 200n, lockVersion: 2 }));

    const res = await billingService.voidHold("req-1");
    expect(res).toEqual({ idempotent: false });

    expect(walletUpdateMany).toHaveBeenCalledTimes(1);
    const adj = walletUpdateMany.mock.calls[0][0].data;
    expect(adj.heldMinor).toEqual({ increment: -200n });
    expect(adj.balanceMinor).toBeUndefined(); // 释放不动余额
    expect(adj.postedDebitsMinor).toBeUndefined();
    expect(adj.postedCreditsMinor).toBeUndefined();
    expect(entryCreate).not.toHaveBeenCalled(); // 释放无流水
    expect(holdUpdate).toHaveBeenCalledWith({
      where: { id: "h-1" },
      data: { status: "VOIDED" },
    });
  });

  it("hold→void 往返：钱包聚合列净变动为零（冻结↔解冻互逆）", async () => {
    // persistent 兜底：void 阶段的 hold 行与钱包；Once 供 hold 阶段
    holdFindUnique.mockResolvedValue(holdRow());
    holdFindUnique.mockResolvedValueOnce(null); // hold 幂等检查
    walletFindUnique.mockResolvedValue(walletRow({ balanceMinor: 1000n, heldMinor: 200n, lockVersion: 2 }));
    walletFindUnique.mockResolvedValueOnce(walletRow({ balanceMinor: 1000n, heldMinor: 0n, lockVersion: 1 }));
    holdCreate.mockResolvedValue({ id: "h-1" });

    await billingService.hold("u-1", "req-1", 200n);
    await billingService.voidHold("req-1");

    const allAdj = walletUpdateMany.mock.calls.map((c) => c[0].data);
    expect(allAdj).toHaveLength(2);
    const netHeld = (allAdj[0].heldMinor?.increment ?? 0n) + (allAdj[1].heldMinor?.increment ?? 0n);
    expect(netHeld).toBe(0n); // +200 ↔ −200
    for (const adj of allAdj) {
      expect(adj.balanceMinor).toBeUndefined(); // 全程不动余额
      expect(adj.postedDebitsMinor).toBeUndefined();
      expect(adj.postedCreditsMinor).toBeUndefined();
    }
    expect(entryCreate).not.toHaveBeenCalled(); // 全程无流水
    expect(holdUpdate).toHaveBeenLastCalledWith({
      where: { id: "h-1" },
      data: { status: "VOIDED" },
    });
  });

  it("懒清理竞态：void 前本 hold 已过期 → 重读 EXPIRED 幂等返回，不得二次解冻", async () => {
    const expired = holdRow({ expiresAt: new Date(Date.now() - 60_000) });
    holdFindUnique
      .mockResolvedValueOnce(expired) // 首读：内存态 AUTHORIZED
      .mockResolvedValueOnce({ ...expired, status: "EXPIRED" }); // 懒清理后重读
    holdFindMany.mockResolvedValue([{ id: "h-1", amountMinor: 200n }]); // 本 hold 被懒清理消化
    walletFindUnique.mockResolvedValue(
      walletRow({ balanceMinor: 1000n, heldMinor: 200n, lockVersion: 2 })
    );

    const res = await billingService.voidHold("req-1");
    expect(res).toEqual({ idempotent: true });
    // 仅过期解冻一次；不得再执行 heldDelta:-200 二次解冻（历史缺陷：held 变负、状态覆盖 VOIDED）
    expect(walletUpdateMany).toHaveBeenCalledTimes(1);
    expect(walletUpdateMany.mock.calls[0][0].data.heldMinor).toEqual({ increment: -200n });
    expect(holdUpdate).toHaveBeenCalledTimes(1);
    expect(holdUpdate).toHaveBeenCalledWith({ where: { id: "h-1" }, data: { status: "EXPIRED" } });
  });

  it("懒清理后重读为 CAPTURED → 40004，不解冻本 hold、不覆盖状态", async () => {
    holdFindUnique.mockReset(); // 自包含：清除相邻用例可能残留的 once 队列
    const hold = holdRow();
    holdFindUnique
      .mockResolvedValueOnce(hold) // 首读：AUTHORIZED
      .mockResolvedValueOnce({ ...hold, status: "CAPTURED", capturedMinor: 150n }); // 重读：已被捕获
    holdFindMany.mockResolvedValue([{ id: "h-old", amountMinor: 100n }]); // 仅其他过期 hold 被清理
    walletFindUnique.mockResolvedValue(
      walletRow({ balanceMinor: 1000n, heldMinor: 300n, lockVersion: 2 })
    );

    await expect(billingService.voidHold("req-1")).rejects.toMatchObject({ code: 40004 });
    // 本 hold 未被解冻（仅过期 hold 的 -100n）
    const heldCalls = walletUpdateMany.mock.calls.filter(
      (c) => c[0].data.heldMinor?.increment === -200n
    );
    expect(heldCalls).toHaveLength(0);
    expect(holdUpdate).not.toHaveBeenCalledWith({
      where: { id: "h-1" },
      data: { status: "VOIDED" },
    });
  });
});

describe("对账聚合口径", () => {
  it("sumSettledByDirection：缺失方向回退 0n、_sum 空值回退 0n", async () => {
    // 仅 CREDIT：DEBIT 侧回退 0n
    entryGroupBy.mockResolvedValueOnce([{ direction: "CREDIT", _sum: { amountMinor: 800n } }]);
    expect(await billingRepository.sumSettledByDirection(billingRepository.client, "w-1")).toEqual({
      debit: 0n,
      credit: 800n,
    });

    // 仅 DEBIT 且 _sum 为 null：两侧均回退 0n
    entryGroupBy.mockResolvedValueOnce([{ direction: "DEBIT", _sum: { amountMinor: null } }]);
    expect(await billingRepository.sumSettledByDirection(billingRepository.client, "w-1")).toEqual({
      debit: 0n,
      credit: 0n,
    });

    // 空分组
    entryGroupBy.mockResolvedValueOnce([]);
    expect(await billingRepository.sumSettledByDirection(billingRepository.client, "w-1")).toEqual({
      debit: 0n,
      credit: 0n,
    });
  });

  it("verifyWalletIntegrity：ledger 失衡（ΣCREDIT−ΣDEBIT ≠ postedCredits−postedDebits）→ ok=false 且给出带符号差额", async () => {
    walletFindUnique.mockResolvedValue(
      walletRow({ postedCreditsMinor: 1000n, postedDebitsMinor: 150n, heldMinor: 0n })
    );
    // 账本少记 200：ΣCREDIT=800 vs postedCredits=1000 → ledgerDiff=+200
    entryGroupBy.mockResolvedValue([
      { direction: "DEBIT", _sum: { amountMinor: 150n } },
      { direction: "CREDIT", _sum: { amountMinor: 800n } },
    ]);
    holdAggregate.mockResolvedValue({ _sum: { amountMinor: null } }); // 无活跃 holds → 0n

    const res = await billingService.verifyWalletIntegrity("u-1");
    expect(res.ok).toBe(false);
    expect(res.ledgerDiff).toBe(200n);
    expect(res.heldDiff).toBe(0n);
  });

  it("verifyWalletIntegrity：钱包不存在 → 50000", async () => {
    walletFindUnique.mockResolvedValue(null);
    await expect(billingService.verifyWalletIntegrity("u-ghost")).rejects.toMatchObject({
      code: 50000,
    });
  });

  it("sumActiveHolds 口径回归：仅聚合 AUTHORIZED（CAPTURED 已全额解冻，不得计入）", async () => {
    // capture 后场景：held 已清零、无 AUTHORIZED holds → 对账必须自洽
    walletFindUnique.mockResolvedValue(
      walletRow({ postedCreditsMinor: 1000n, postedDebitsMinor: 150n, heldMinor: 0n })
    );
    entryGroupBy.mockResolvedValue([
      { direction: "DEBIT", _sum: { amountMinor: 150n } },
      { direction: "CREDIT", _sum: { amountMinor: 1000n } },
    ]);
    holdAggregate.mockResolvedValue({ _sum: { amountMinor: null } }); // 无活跃 holds

    const res = await billingService.verifyWalletIntegrity("u-1");
    expect(res).toEqual({ ok: true, ledgerDiff: 0n, heldDiff: 0n });
    // 口径断言：where 必须仅 AUTHORIZED（历史缺陷：in [AUTHORIZED, CAPTURED] 致 capture 后恒报失衡）
    expect(holdAggregate).toHaveBeenCalledWith({
      where: { walletId: "w-1", status: "AUTHORIZED" },
      _sum: { amountMinor: true },
    });
  });
});
