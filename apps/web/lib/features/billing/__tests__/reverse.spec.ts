/**
 * billingService.reverseRechargeOrder 单测（S6.2 财务处置·REVERSAL 冲正）。
 *
 * 覆盖：
 *  - PAID 全额冲正：CAS PAID→REFUNDED + TOPUP/bonus 各写一条 REVERSAL DEBIT 反向分录（原分录保留），
 *    reversedMinor = amount + bonus；幂等键前缀 recharge-reverse:{id}（bonus 追加 :bonus）。
 *  - 非 PAID（PENDING）→ 40000，零副作用。
 *  - 已 REFUNDED → 幂等（reversedMinor 0n，不重复 CAS/分录）。
 *  - 余额不足（反向 DEBIT 扣成负）→ 40001，不写入反向分录。
 *
 * 策略：与 adjust.spec 同 stub 模式（顶层与事务共享一组 fn；rechargeOrder 补 updateMany）。
 */
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

const txStub = vi.hoisted(() => {
  const mk = () => vi.fn();
  return {
    wallet: { findUnique: mk(), updateMany: mk() },
    ledgerEntry: { create: mk(), findUnique: mk(), groupBy: mk() },
    balanceHold: { aggregate: mk() },
    rechargeOrder: { findUnique: mk(), updateMany: mk() },
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
const orderFindUnique = txStub.rechargeOrder.findUnique as Mock;
const orderUpdateMany = txStub.rechargeOrder.updateMany as Mock;

function walletRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "w-1",
    userId: "u-1",
    currency: "CNY",
    balanceMinor: 50000n,
    heldMinor: 0n,
    postedDebitsMinor: 0n,
    postedCreditsMinor: 0n,
    status: "ACTIVE",
    lockVersion: 1,
    ...overrides,
  };
}

function orderRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "ro-1",
    userId: "u-1",
    amountMinor: 10000n,
    bonusAmountMinor: 2000n,
    totalAmountMinor: 12000n,
    status: "PAID",
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
  vi.resetAllMocks();
  txFn.mockImplementation(async (fn: (tx: typeof txStub) => Promise<unknown>) => fn(txStub));
  walletFindUnique.mockResolvedValue(walletRow());
  walletUpdateMany.mockResolvedValue({ count: 1 });
  entryCreate.mockResolvedValue({ id: "e-rev" });
  orderUpdateMany.mockResolvedValue({ count: 1 });
});

describe("billingService.reverseRechargeOrder", () => {
  it("① PAID 全额冲正 → CAS REFUNDED + 两条 REVERSAL DEBIT（本金+赠送）", async () => {
    orderFindUnique.mockResolvedValueOnce(orderRow());
    const res = await billingService.reverseRechargeOrder("ro-1", {
      idempotencyKey: "recharge-reverse:ro-1:op1",
    });
    expect(res.idempotent).toBe(false);
    expect(res.reversedMinor).toBe(12000n); // 10000 本金 + 2000 赠送

    // 状态机 CAS：仅 PAID→REFUNDED
    const upd = orderUpdateMany.mock.calls[0][0] as { where: Record<string, unknown>; data: Record<string, unknown> };
    expect(upd.where).toEqual({ id: "ro-1", status: "PAID" });
    expect(upd.data.status).toBe("REFUNDED");

    // 反向分录：DEBIT + REVERSAL，金额恒正，幂等键绑定订单
    const e1 = entryCreate.mock.calls[0][0].data;
    expect(e1.direction).toBe("DEBIT");
    expect(e1.entryType).toBe("REVERSAL");
    expect(e1.amountMinor).toBe(10000n);
    expect(e1.sourceId).toBe("ro-1");
    expect(e1.idempotencyKey).toBe("recharge-reverse:ro-1:op1");

    const e2 = entryCreate.mock.calls[1][0].data;
    expect(e2.amountMinor).toBe(2000n);
    expect(e2.idempotencyKey).toBe("recharge-reverse:ro-1:op1:bonus");
  });

  it("② 无赠送（bonus=0）→ 仅一条反向分录", async () => {
    orderFindUnique.mockResolvedValueOnce(orderRow({ bonusAmountMinor: 0n }));
    const res = await billingService.reverseRechargeOrder("ro-1", {
      idempotencyKey: "recharge-reverse:ro-1:op2",
    });
    expect(res.reversedMinor).toBe(10000n);
    expect(entryCreate).toHaveBeenCalledTimes(1);
  });

  it("③ 非 PAID（PENDING）→ 40000，零副作用", async () => {
    orderFindUnique.mockResolvedValueOnce(orderRow({ status: "PENDING" }));
    await expectApiError(
      billingService.reverseRechargeOrder("ro-1", { idempotencyKey: "recharge-reverse:ro-1:op3" }),
      40000
    );
    expect(orderUpdateMany).not.toHaveBeenCalled();
    expect(entryCreate).not.toHaveBeenCalled();
  });

  it("④ 已 REFUNDED → 幂等（reversed 0，不重复 CAS/分录）", async () => {
    orderFindUnique.mockResolvedValueOnce(orderRow({ status: "REFUNDED" }));
    const res = await billingService.reverseRechargeOrder("ro-1", {
      idempotencyKey: "recharge-reverse:ro-1:op4",
    });
    expect(res).toEqual({ reversedMinor: 0n, idempotent: true });
    expect(orderUpdateMany).not.toHaveBeenCalled();
    expect(entryCreate).not.toHaveBeenCalled();
  });

  it("⑤ 余额不足（反向 DEBIT 扣成负）→ 40001，不写反向分录", async () => {
    orderFindUnique.mockResolvedValueOnce(orderRow({ amountMinor: 10000n, bonusAmountMinor: 0n }));
    walletFindUnique.mockResolvedValue(walletRow({ balanceMinor: 5000n }));
    await expectApiError(
      billingService.reverseRechargeOrder("ro-1", { idempotencyKey: "recharge-reverse:ro-1:op5" }),
      40001
    );
    expect(entryCreate).not.toHaveBeenCalled();
  });
});
