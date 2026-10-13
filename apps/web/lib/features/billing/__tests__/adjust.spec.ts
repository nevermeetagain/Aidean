/**
 * 管理端余额调账单测（rebuild-admin-console-and-harden-auth SubTask 3.6.1）。
 *
 * 覆盖 checklist 3-6（入账对账恒等式、FROZEN 拒绝、幂等重放）：
 * - +10.00 元入账：ADJUST CREDIT 分录 + 聚合列同步 + 幂等键 admin-adjust:{walletId}:{key}；
 * - 负调账：余额充足 DEBIT 扣减 / 不足 → 40001；
 * - FROZEN/CLOSED 钱包拒绝；幂等重放（同键已存在分录）不重复入账；
 * - adjust 后 verifyWalletIntegrity 对账恒等式成立。
 *
 * 策略：与 billing.spec.ts 同 stub 模式（db/prisma 顶层与事务共享一组 fn）。
 */
import { Prisma } from "@prisma/client";

import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

const txStub = vi.hoisted(() => {
  const mk = () => vi.fn();
  return {
    wallet: { findUnique: mk(), updateMany: mk() },
    ledgerEntry: { create: mk(), findUnique: mk(), groupBy: mk() },
    balanceHold: { aggregate: mk() },
    rechargeOrder: { findUnique: mk() },
  };
});
const txFn = vi.hoisted(() => vi.fn());

vi.mock("../../../db/prisma", () => ({
  prisma: { ...txStub, $transaction: txFn },
}));

import { ApiError } from "../../../../app/api/v1/_lib/errors";
import { billingService } from "../service";

const walletFindUnique = txStub.wallet.findUnique as Mock;
const walletUpdateMany = txStub.wallet.updateMany as Mock;
const entryCreate = txStub.ledgerEntry.create as Mock;
const entryGroupBy = txStub.ledgerEntry.groupBy as Mock;
const holdAggregate = txStub.balanceHold.aggregate as Mock;

function walletRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "w-1",
    userId: "u-1",
    currency: "CNY",
    balanceMinor: 10000n,
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

beforeEach(() => {
  vi.resetAllMocks(); // resetAllMocks 清空 mockResolvedValueOnce 队列（clearAllMocks 不清，防用例间串扰）
  txFn.mockImplementation(async (fn: (tx: typeof txStub) => Promise<unknown>) => fn(txStub));
  walletUpdateMany.mockResolvedValue({ count: 1 });
  entryCreate.mockResolvedValue({ id: "e-adj" });
});

describe("billingService.adjust 入账路径", () => {
  it("① +10.00 元（+1000n）→ ADJUST CREDIT 分录 + 余额/入账聚合列推进 + 幂等键前缀", async () => {
    walletFindUnique.mockResolvedValue(walletRow());
    const res = await billingService.adjust({
      walletId: "w-1",
      amountMinor: 1000n,
      idempotencyKey: "admin-adjust:w-1:op-1",
    });
    expect(res.idempotent).toBe(false);
    expect(res.balanceMinor).toBe(10000n); // mock 内重读钱包返回原值

    // 分录：direction 视正负（正 → CREDIT）、amountMinor 恒正、entryType=ADJUST、sourceType=admin
    const entry = entryCreate.mock.calls[0][0].data;
    expect(entry.direction).toBe("CREDIT");
    expect(entry.amountMinor).toBe(1000n);
    expect(entry.entryType).toBe("ADJUST");
    expect(entry.sourceType).toBe("admin");
    expect(entry.idempotencyKey).toBe("admin-adjust:w-1:op-1");

    // 聚合列：余额与累计入账同步 + 乐观锁推进
    const adj = walletUpdateMany.mock.calls[0][0];
    expect(adj.where).toEqual({ id: "w-1", lockVersion: 1 });
    expect(adj.data.balanceMinor).toEqual({ increment: 1000n });
    expect(adj.data.postedCreditsMinor).toEqual({ increment: 1000n });
    expect(adj.data.lockVersion).toEqual({ increment: 1 });
  });

  it("② 负调账 -5.00 元（余额充足）→ ADJUST DEBIT 恒正扣减", async () => {
    walletFindUnique.mockResolvedValue(walletRow({ balanceMinor: 10000n }));
    await billingService.adjust({ walletId: "w-1", amountMinor: -500n, idempotencyKey: "admin-adjust:w-1:op-2" });
    const entry = entryCreate.mock.calls[0][0].data;
    expect(entry.direction).toBe("DEBIT");
    expect(entry.amountMinor).toBe(500n); // 恒正
    const adj = walletUpdateMany.mock.calls[0][0];
    expect(adj.data.balanceMinor).toEqual({ increment: -500n });
    expect(adj.data.postedDebitsMinor).toEqual({ increment: 500n });
  });

  it("③ 负调账余额不足（扣减后为负）→ 40001，零副作用", async () => {
    walletFindUnique.mockResolvedValue(walletRow({ balanceMinor: 300n }));
    await expectApiError(
      billingService.adjust({ walletId: "w-1", amountMinor: -500n, idempotencyKey: "admin-adjust:w-1:op-3" }),
      40001
    );
    expect(entryCreate).not.toHaveBeenCalled();
    expect(walletUpdateMany).not.toHaveBeenCalled();
  });

  it("④ FROZEN 钱包 → 40000 钱包不可用（CLOSED 同拒）", async () => {
    walletFindUnique.mockResolvedValue(walletRow({ status: "FROZEN" }));
    await expectApiError(
      billingService.adjust({ walletId: "w-1", amountMinor: 100n, idempotencyKey: "admin-adjust:w-1:op-4" }),
      40000
    );
    expect(entryCreate).not.toHaveBeenCalled();

    walletFindUnique.mockResolvedValue(walletRow({ status: "CLOSED" }));
    await expectApiError(
      billingService.adjust({ walletId: "w-1", amountMinor: 100n, idempotencyKey: "admin-adjust:w-1:op-5" }),
      40000
    );
  });

  it("⑤ 幂等重放：同键分录已存在（create 抛 P2002 → 返回 null）→ idempotent=true 不重复入账", async () => {
    walletFindUnique.mockResolvedValue(walletRow());
    // 真实 createEntryIfAbsent 捕获 P2002 返回 null 视为幂等命中
    entryCreate.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "5.22.0",
      })
    );
    const res = await billingService.adjust({
      walletId: "w-1",
      amountMinor: 1000n,
      idempotencyKey: "admin-adjust:w-1:op-dup",
    });
    expect(res.idempotent).toBe(true);
    expect(walletUpdateMany).not.toHaveBeenCalled(); // 聚合列不重复更新
  });

  it("⑥ 钱包不存在 → 40000", async () => {
    walletFindUnique.mockResolvedValue(null);
    await expectApiError(
      billingService.adjust({ walletId: "w-ghost", amountMinor: 100n, idempotencyKey: "admin-adjust:w-ghost:op-6" }),
      40000
    );
  });
});

describe("调账后对账恒等式", () => {
  it("⑦ adjust 入账后 verifyWalletIntegrity 自洽（posted = Σ ledger）", async () => {
    // adjust 内部 findWalletById 共 3 次：postEntryInTx 守卫 + postEntryInTx 入账 + 返回前 fresh 重读
    walletFindUnique.mockResolvedValueOnce(walletRow());
    walletFindUnique.mockResolvedValueOnce(
      walletRow({ balanceMinor: 11000n, postedCreditsMinor: 1000n, lockVersion: 2 })
    );
    walletFindUnique.mockResolvedValueOnce(
      walletRow({ balanceMinor: 11000n, postedCreditsMinor: 1000n, lockVersion: 2 })
    );
    const adjustRes = await billingService.adjust({
      walletId: "w-1",
      amountMinor: 1000n,
      idempotencyKey: "admin-adjust:w-1:op-7",
    });
    expect(adjustRes.balanceMinor).toBe(11000n); // fresh 重读值

    // 对账阶段：钱包聚合已含入账，账本 Σ 匹配
    walletFindUnique.mockResolvedValueOnce(
      walletRow({ balanceMinor: 11000n, postedCreditsMinor: 1000n, lockVersion: 2 })
    );
    entryGroupBy.mockResolvedValue([
      { direction: "CREDIT", _sum: { amountMinor: 1000n } },
      { direction: "DEBIT", _sum: { amountMinor: 0n } },
    ]);
    holdAggregate.mockResolvedValue({ _sum: { amountMinor: 0n } });

    const res = await billingService.verifyWalletIntegrity("u-1");
    expect(res).toEqual({ ok: true, ledgerDiff: 0n, heldDiff: 0n });
  });
});

