/**
 * hold 预扣域单测（资金路径补充取证；与 billing.spec.ts 互补不重复）。
 *
 * 覆盖口径：可用额（balance−held）守卫、requestId 幂等、TTL 到期时间、
 * 主动过期释放（releaseExpiredHolds）、乐观锁冲突后重试成功路径。
 * 策略：vi.mock '../../../db/prisma'（与 billing.spec.ts 同一 stub 模式）。
 */
import { HOLD_TTL_MINUTES } from "@aidean/shared";

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
import { billingService } from "../service";

const walletFindUnique = txStub.wallet.findUnique as Mock;
const walletUpdateMany = txStub.wallet.updateMany as Mock;
const entryCreate = txStub.ledgerEntry.create as Mock;
const holdCreate = txStub.balanceHold.create as Mock;
const holdFindUnique = txStub.balanceHold.findUnique as Mock;
const holdUpdate = txStub.balanceHold.update as Mock;
const holdFindMany = txStub.balanceHold.findMany as Mock;

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

beforeEach(() => {
  vi.clearAllMocks();
  txFn.mockImplementation(async (fn: (tx: typeof txStub) => Promise<unknown>) => fn(txStub));
  walletUpdateMany.mockResolvedValue({ count: 1 });
  holdFindMany.mockResolvedValue([]); // 默认无过期 holds
});

describe("hold 可用额守卫", () => {
  it("余额不足拒付：balance 充足但 balance−held 不足 → 40001 且零副作用", async () => {
    holdFindUnique.mockResolvedValue(null);
    // 余额 1000、已冻结 900 → 可用仅 100，预扣 200 应被拒
    walletFindUnique.mockResolvedValue(walletRow({ balanceMinor: 1000n, heldMinor: 900n }));
    await expectApiError(billingService.hold("u-1", "req-1", 200n), 40001);
    expect(holdCreate).not.toHaveBeenCalled();
    expect(walletUpdateMany).not.toHaveBeenCalled();
    expect(entryCreate).not.toHaveBeenCalled();
  });

  it("非正金额 → 40000，不进事务", async () => {
    await expectApiError(billingService.hold("u-1", "req-0", 0n), 40000);
    await expectApiError(billingService.hold("u-1", "req-0", -1n), 40000);
    expect(holdFindUnique).not.toHaveBeenCalled();
  });

  it("FROZEN 钱包 → 40000 且不冻结资金", async () => {
    holdFindUnique.mockResolvedValue(null);
    walletFindUnique.mockResolvedValue(walletRow({ status: "FROZEN", balanceMinor: 5000n }));
    await expectApiError(billingService.hold("u-1", "req-1", 100n), 40000);
    expect(walletUpdateMany).not.toHaveBeenCalled();
    expect(holdCreate).not.toHaveBeenCalled();
  });

  it("懒清理释放过期冻结后按新 held 判可用额：可足额预扣不误拒 40001", async () => {
    holdFindUnique.mockResolvedValue(null);
    // 余额 200、账面冻结 300（其中 200 已过期）→ 清理后真实可用 100，预扣 100 应成功
    walletFindUnique.mockResolvedValue(walletRow({ balanceMinor: 200n, heldMinor: 300n }));
    holdFindMany.mockResolvedValue([{ id: "h-old", amountMinor: 200n }]);
    holdCreate.mockResolvedValue({ id: "h-new" });

    const res = await billingService.hold("u-1", "req-lazy", 100n);
    expect(res).toEqual({ holdId: "h-new", idempotent: false });
    const calls = walletUpdateMany.mock.calls;
    expect(calls).toHaveLength(2);
    expect(calls[0][0].data.heldMinor).toEqual({ increment: -200n }); // 过期解冻
    expect(calls[1][0].data.heldMinor).toEqual({ increment: 100n }); // 新冻结
    expect(calls[1][0].where.lockVersion).toBe(2); // 事务内版本推进
  });
});

describe("hold 幂等与 TTL", () => {
  it("同 requestId 重复预扣 → 幂等返回既有 hold，不重复冻结、不再读钱包", async () => {
    holdFindUnique.mockResolvedValue({
      id: "h-exist",
      requestId: "req-1",
      walletId: "w-1",
      amountMinor: 200n,
      capturedMinor: 0n,
      status: "AUTHORIZED",
      expiresAt: new Date(Date.now() + 60_000),
      createdAt: new Date(),
    });
    const res = await billingService.hold("u-1", "req-1", 200n);
    expect(res).toEqual({ holdId: "h-exist", idempotent: true });
    expect(holdCreate).not.toHaveBeenCalled();
    expect(walletUpdateMany).not.toHaveBeenCalled();
    expect(walletFindUnique).not.toHaveBeenCalled(); // 命中幂等后无需读钱包
  });

  it("预扣成功：heldDelta=+amount，expiresAt = now + HOLD_TTL_MINUTES（30 分钟）", async () => {
    holdFindUnique.mockResolvedValue(null);
    walletFindUnique.mockResolvedValue(walletRow({ balanceMinor: 1000n }));
    holdCreate.mockResolvedValue({ id: "h-1" });

    const now = new Date("2026-09-07T08:00:00Z");
    const res = await billingService.hold("u-1", "req-1", 200n, now);
    expect(res).toEqual({ holdId: "h-1", idempotent: false });

    const adj = walletUpdateMany.mock.calls[0][0].data;
    expect(adj.heldMinor).toEqual({ increment: 200n });
    expect(adj.balanceMinor).toBeUndefined(); // 预扣不动余额
    const created = holdCreate.mock.calls[0][0].data;
    expect(created.requestId).toBe("req-1");
    expect(created.amountMinor).toBe(200n);
    expect(created.expiresAt.getTime() - now.getTime()).toBe(HOLD_TTL_MINUTES * 60_000);
  });
});

describe("releaseExpiredHolds 主动过期释放", () => {
  it("逐条解冻置 EXPIRED 并返回条数；lockVersion 随条目推进", async () => {
    walletFindUnique.mockResolvedValue(walletRow({ balanceMinor: 500n, heldMinor: 300n }));
    holdFindMany.mockResolvedValue([
      { id: "h-old-1", amountMinor: 100n },
      { id: "h-old-2", amountMinor: 200n },
    ]);

    const released = await billingService.releaseExpiredHolds("u-1");
    expect(released).toBe(2);
    expect(holdUpdate).toHaveBeenCalledWith({ where: { id: "h-old-1" }, data: { status: "EXPIRED" } });
    expect(holdUpdate).toHaveBeenCalledWith({ where: { id: "h-old-2" }, data: { status: "EXPIRED" } });
    const calls = walletUpdateMany.mock.calls;
    expect(calls).toHaveLength(2);
    expect(calls[0][0].data.heldMinor).toEqual({ increment: -100n });
    expect(calls[1][0].data.heldMinor).toEqual({ increment: -200n });
    expect(calls[0][0].where.lockVersion).toBe(1);
    expect(calls[1][0].where.lockVersion).toBe(2); // 事务内版本推进
    expect(entryCreate).not.toHaveBeenCalled(); // 过期释放不产生流水
  });

  it("钱包不存在 → 返回 0", async () => {
    walletFindUnique.mockResolvedValue(null);
    expect(await billingService.releaseExpiredHolds("u-ghost")).toBe(0);
    expect(walletUpdateMany).not.toHaveBeenCalled();
  });
});

describe("hold 乐观锁重试", () => {
  it("首次冲突 count=0、重试成功 → 最终成功且写两轮", async () => {
    holdFindUnique.mockResolvedValue(null);
    walletFindUnique.mockResolvedValue(walletRow({ balanceMinor: 1000n }));
    holdCreate.mockResolvedValue({ id: "h-1" });
    walletUpdateMany
      .mockResolvedValueOnce({ count: 0 }) // 第一轮：版本漂移
      .mockResolvedValueOnce({ count: 1 }); // 第二轮：以新版本成功

    const res = await billingService.hold("u-1", "req-1", 200n);
    expect(res).toEqual({ holdId: "h-1", idempotent: false });
    expect(walletUpdateMany).toHaveBeenCalledTimes(2);
    expect(holdCreate).toHaveBeenCalledOnce();
  });
});

describe("capture 超预扣守卫（账实一致性）", () => {
  it("实扣额 > 预扣冻结额 → 40000，零副作用（不解冻、不记账、hold 不推进）", async () => {
    // 预扣 200 已 AUTHORIZED；实扣 500 试图超额捕获（首读与守卫前均为同一 hold）
    const authorizedHold = {
      id: "h-1",
      requestId: "req-cap",
      walletId: "w-1",
      amountMinor: 200n,
      capturedMinor: 0n,
      status: "AUTHORIZED",
      expiresAt: new Date(Date.now() + 60_000),
      createdAt: new Date(),
    };
    holdFindUnique.mockResolvedValue(authorizedHold);

    // 契约口径（billing/service.ts captureHold 文档行）：actual > 预扣额 → 40000 BAD_REQUEST
    await expectApiError(billingService.captureHold("req-cap", 500n), 40000);
    // 守卫先于任何记账/状态写：无 DEBIT 入账、无解冻、hold 未被推进
    expect(entryCreate).not.toHaveBeenCalled();
    expect(holdUpdate).not.toHaveBeenCalled();
    expect(walletUpdateMany).not.toHaveBeenCalled();
  });

  it("hold 不存在/非 AUTHORIZED → 40004（40004 语义=预扣失效，非超扣）", async () => {
    holdFindUnique.mockResolvedValue(null);
    await expectApiError(billingService.captureHold("req-miss", 100n), 40004);
    expect(entryCreate).not.toHaveBeenCalled();
    expect(holdUpdate).not.toHaveBeenCalled();
    expect(walletUpdateMany).not.toHaveBeenCalled();
  });
});
