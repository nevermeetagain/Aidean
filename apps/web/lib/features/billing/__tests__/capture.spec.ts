/**
 * capture 捕获域单测（资金路径补充取证；与 billing.spec.ts 互补不重复）。
 *
 * 覆盖口径：capture ≤ hold 上限、实扣/全额解冻/postedDebits 三增量与
 * CONSUME 流水的对账对称、重复 requestId 幂等（异额重放返回首次捕获额）、
 * 懒清理竞态下 fresh 重读、非正金额守卫。
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

import { ApiError } from "../../../../app/api/v1/_lib/errors";
import { billingService } from "../service";

const walletFindUnique = txStub.wallet.findUnique as Mock;
const walletUpdateMany = txStub.wallet.updateMany as Mock;
const entryCreate = txStub.ledgerEntry.create as Mock;
const holdFindUnique = txStub.balanceHold.findUnique as Mock;
const holdUpdate = txStub.balanceHold.update as Mock;
const holdFindMany = txStub.balanceHold.findMany as Mock;

function walletRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "w-1",
    userId: "u-1",
    currency: "CNY",
    balanceMinor: 1000n,
    heldMinor: 200n,
    postedDebitsMinor: 0n,
    postedCreditsMinor: 0n,
    status: "ACTIVE",
    lockVersion: 2,
    ...overrides,
  };
}

function authorizedHold(overrides: Record<string, unknown> = {}) {
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
  entryCreate.mockResolvedValue({ id: "e-1" });
});

describe("capture 上限与守卫", () => {
  it("capture > hold 预扣额 → 40000 且零副作用", async () => {
    holdFindUnique.mockResolvedValue(authorizedHold({ amountMinor: 200n }));
    await expectApiError(billingService.captureHold("req-1", 201n), 40000);
    expect(walletUpdateMany).not.toHaveBeenCalled();
    expect(entryCreate).not.toHaveBeenCalled();
    expect(holdUpdate).not.toHaveBeenCalled();
  });

  it("capture 非正金额 → 40000，不进事务", async () => {
    await expectApiError(billingService.captureHold("req-1", 0n), 40000);
    await expectApiError(billingService.captureHold("req-1", -5n), 40000);
    expect(holdFindUnique).not.toHaveBeenCalled();
  });

  it("懒清理竞态：capture 前本 hold 已过期 → fresh 重读 EXPIRED → 40004，不产生 CONSUME", async () => {
    const expired = authorizedHold({ expiresAt: new Date(Date.now() - 60_000) });
    holdFindUnique
      .mockResolvedValueOnce(expired) // 首读：AUTHORIZED（内存判据）
      .mockResolvedValueOnce({ ...expired, status: "EXPIRED" }); // 懒清理后重读
    holdFindMany.mockResolvedValue([{ id: "h-1", amountMinor: 200n }]); // 被懒清理消化
    walletFindUnique.mockResolvedValue(walletRow());

    await expectApiError(billingService.captureHold("req-1", 150n), 40004);
    // 仅发生过期解冻一次，无捕获扣款
    expect(walletUpdateMany).toHaveBeenCalledTimes(1);
    expect(walletUpdateMany.mock.calls[0][0].data.heldMinor).toEqual({ increment: -200n });
    expect(entryCreate).not.toHaveBeenCalled();
    expect(holdUpdate).toHaveBeenCalledTimes(1);
    expect(holdUpdate).toHaveBeenCalledWith({ where: { id: "h-1" }, data: { status: "EXPIRED" } });
  });

  it("防御守卫：钱包 held 不足以覆盖本 hold（状态不一致）→ 40004，不扣款不解冻不写流水", async () => {
    // 异常态：hold 冻结 200，但钱包 held 仅 50（如曾因缺陷虚减）→ 捕获将致 held 为负
    holdFindUnique.mockResolvedValue(authorizedHold({ amountMinor: 200n }));
    walletFindUnique.mockResolvedValue(walletRow({ balanceMinor: 1000n, heldMinor: 50n }));

    await expectApiError(billingService.captureHold("req-1", 150n), 40004);
    expect(walletUpdateMany).not.toHaveBeenCalled();
    expect(entryCreate).not.toHaveBeenCalled();
    expect(holdUpdate).not.toHaveBeenCalled();
  });
});

describe("capture 记账语义", () => {
  it("差额捕获：balance −actual、held 全额解冻 −hold、postedDebits +actual；CONSUME 键 hold:req:capture", async () => {
    holdFindUnique.mockResolvedValue(authorizedHold());
    holdFindUnique.mockResolvedValueOnce(authorizedHold()); // 首读 + fresh 重读均 AUTHORIZED
    walletFindUnique.mockResolvedValue(walletRow());

    const res = await billingService.captureHold("req-1", 150n);
    expect(res).toEqual({ capturedMinor: 150n, idempotent: false });

    const adj = walletUpdateMany.mock.calls.at(-1)![0].data;
    expect(adj.balanceMinor).toEqual({ increment: -150n });
    expect(adj.heldMinor).toEqual({ increment: -200n });
    expect(adj.postedDebitsMinor).toEqual({ increment: 150n });

    const entry = entryCreate.mock.calls.at(-1)![0].data;
    expect(entry.direction).toBe("DEBIT");
    expect(entry.entryType).toBe("CONSUME");
    expect(entry.amountMinor).toBe(150n);
    expect(entry.idempotencyKey).toBe("hold:req-1:capture");
    expect(entry.sourceType).toBe("balance_hold");
    expect(entry.sourceId).toBe("h-1");
    expect(holdUpdate).toHaveBeenLastCalledWith({
      where: { id: "h-1" },
      data: { status: "CAPTURED", capturedMinor: 150n },
    });
  });

  it("全额捕获 actual == hold：balance/held 同减 200，流水 200", async () => {
    holdFindUnique.mockResolvedValue(authorizedHold());
    walletFindUnique.mockResolvedValue(walletRow());

    const res = await billingService.captureHold("req-1", 200n);
    expect(res).toEqual({ capturedMinor: 200n, idempotent: false });
    const adj = walletUpdateMany.mock.calls.at(-1)![0].data;
    expect(adj.balanceMinor).toEqual({ increment: -200n });
    expect(adj.heldMinor).toEqual({ increment: -200n });
    expect(adj.postedDebitsMinor).toEqual({ increment: 200n });
    expect(entryCreate.mock.calls.at(-1)![0].data.amountMinor).toBe(200n);
  });
});

describe("capture 幂等", () => {
  it("已 CAPTURED 重放（异额 999）→ 返回首次捕获额 150，不重复扣款、不写流水", async () => {
    holdFindUnique.mockResolvedValue(
      authorizedHold({ status: "CAPTURED", capturedMinor: 150n })
    );
    const res = await billingService.captureHold("req-1", 999n);
    expect(res).toEqual({ capturedMinor: 150n, idempotent: true });
    expect(walletUpdateMany).not.toHaveBeenCalled();
    expect(entryCreate).not.toHaveBeenCalled();
    expect(holdUpdate).not.toHaveBeenCalled();
  });
});

describe("capture 资金闭环对称", () => {
  it("hold→capture 链路：held 净变动 0；balance 减量 == postedDebits 增量 == DEBIT 流水合计", async () => {
    // 1) 预扣 200；persistent 兜底 = AUTHORIZED（供 capture 首读 + fresh 重读）
    holdFindUnique.mockResolvedValue(authorizedHold());
    holdFindUnique.mockResolvedValueOnce(null); // hold 幂等检查
    holdFindUnique.mockResolvedValueOnce(authorizedHold()); // capture 首读
    walletFindUnique.mockResolvedValueOnce(walletRow({ balanceMinor: 1000n, heldMinor: 0n, lockVersion: 1 }));
    walletFindUnique.mockResolvedValue(walletRow()); // capture 读钱包（lockVersion 2 / held 200）
    holdUpdate.mockClear();

    // 补齐 hold 的 create 返回（重用 stub）
    txStub.balanceHold.create.mockResolvedValue({ id: "h-1" });
    await billingService.hold("u-1", "req-1", 200n);
    await billingService.captureHold("req-1", 150n);

    const allAdj = walletUpdateMany.mock.calls.map((c) => c[0].data);
    // 预扣一轮 + 捕获一轮
    expect(allAdj).toHaveLength(2);
    const heldDelta =
      (allAdj[0].heldMinor?.increment ?? 0n) + (allAdj[1].heldMinor?.increment ?? 0n);
    expect(heldDelta).toBe(0n); // 冻结↔解冻对称
    const balanceDelta =
      (allAdj[0].balanceMinor?.increment ?? 0n) + (allAdj[1].balanceMinor?.increment ?? 0n);
    expect(balanceDelta).toBe(-150n); // 净扣款
    const postedDelta =
      (allAdj[0].postedDebitsMinor?.increment ?? 0n) +
      (allAdj[1].postedDebitsMinor?.increment ?? 0n);
    expect(postedDelta).toBe(150n);

    // 流水对称：唯一 DEBIT 分录 == 净扣款 == postedDebits 增量
    expect(entryCreate).toHaveBeenCalledOnce();
    const entry = entryCreate.mock.calls[0][0].data;
    expect(entry.direction).toBe("DEBIT");
    expect(entry.amountMinor).toBe(150n);
    expect(entry.amountMinor).toBe(-balanceDelta);
    expect(entry.amountMinor).toBe(postedDelta);
  });
});
