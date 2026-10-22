/**
 * TASK-012 · persistPrices 修正单测（REQ-F-019 / REQ-F-14；ADR-P003）
 *
 * 覆盖 R-01 修复后写价语义：
 * ① 多价格数组 → 仅 effectiveAt 最新的一条 isCurrent=true，其余为历史（isCurrent=false）；
 *    （旧实现每条都写 isCurrent=true，配合部分唯一索引会在同批多价时撞 23505）
 * ② updateMany（降级现有当前价）+ create 全部包在 $transaction 内（原子性）；
 * ③ 单价格 → 该条即当前价。
 *
 * 经公共入口 upsertModel 的 CREATE 分支驱动真实 persistPrices（不额外导出私有函数）。
 * prisma 以 mock 注入，$transaction 回传同一 mock 使断言可直接命中 prismaState.modelPrice.*。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaState = vi.hoisted(() => ({
  aiModel: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
  vendor: { findFirst: vi.fn(), create: vi.fn() },
  modelChangeLog: { findFirst: vi.fn(), create: vi.fn() },
  modelPrice: { updateMany: vi.fn(), create: vi.fn() },
  benchmark: { findFirst: vi.fn(), create: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock("../dedup", () => ({ shouldSkip: vi.fn(async () => false) }));
vi.mock("../../../db/prisma", () => ({ prisma: prismaState }));

const { upsertModel } = await import("../model-writers");
import type { NormalizedModelData } from "../../types/sync";

const NEWER = new Date("2026-06-01T00:00:00Z");
const OLDER = new Date("2026-01-01T00:00:00Z");

describe("persistPrices 修正（TASK-012）", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaState.$transaction.mockImplementation(async (cb: (tx: typeof prismaState) => Promise<unknown>) => cb(prismaState));
    prismaState.modelChangeLog.findFirst.mockResolvedValue(null);
    prismaState.vendor.findFirst.mockResolvedValue({ id: "vendor-x" });
    // CREATE 分支：模型不存在 → 建模型并写价
    prismaState.aiModel.findFirst.mockResolvedValue(null);
    prismaState.aiModel.create.mockResolvedValue({ id: "model-x" });
    prismaState.modelPrice.create.mockResolvedValue({ id: "price-x" });
    prismaState.modelPrice.updateMany.mockResolvedValue({ count: 0 });
  });

  it("多价格：仅 effectiveAt 最新一条 isCurrent=true，其余为历史，且整体走 $transaction", async () => {
    const data: NormalizedModelData = {
      modelCode: "m-multi",
      vendorName: "v",
      contextLength: 8000,
      checksum: "sum-1",
      prices: [
        { inputPrice: 1, outputPrice: 2, currency: "CNY", unit: "per_1k_tokens", effectiveAt: OLDER },
        { inputPrice: 3, outputPrice: 4, currency: "CNY", unit: "per_1k_tokens", effectiveAt: NEWER },
      ],
    };

    await upsertModel(data, "batch-0001");

    // ② 事务包裹
    expect(prismaState.$transaction).toHaveBeenCalledTimes(1);
    // ① 现有当前价降级一次
    expect(prismaState.modelPrice.updateMany).toHaveBeenCalledTimes(1);
    expect(prismaState.modelPrice.updateMany).toHaveBeenCalledWith({
      where: { modelId: "model-x", isCurrent: true },
      data: { isCurrent: false, effectiveUntil: expect.any(Date) },
    });
    // 两条都写入
    expect(prismaState.modelPrice.create).toHaveBeenCalledTimes(2);

    const calls = prismaState.modelPrice.create.mock.calls.map((c) => c[0].data);
    const currentRows = calls.filter((d) => d.isCurrent === true);
    const historyRows = calls.filter((d) => d.isCurrent === false);

    // 恰一条当前价
    expect(currentRows.length).toBe(1);
    // 该当前价即 effectiveAt 最新的一条
    expect(currentRows[0].effectiveFrom).toEqual(NEWER);
    // 较早的一条落为历史
    expect(historyRows.length).toBe(1);
    expect(historyRows[0].effectiveFrom).toEqual(OLDER);
  });

  it("单价格：该条即当前价（isCurrent=true）", async () => {
    const data: NormalizedModelData = {
      modelCode: "m-one",
      vendorName: "v",
      contextLength: 8000,
      checksum: "sum-2",
      prices: [{ inputPrice: 5, outputPrice: 6, currency: "USD", unit: "per_M_tokens", effectiveAt: NEWER }],
    };

    await upsertModel(data, "batch-0002");

    expect(prismaState.modelPrice.create).toHaveBeenCalledTimes(1);
    const created = prismaState.modelPrice.create.mock.calls[0][0].data;
    expect(created.isCurrent).toBe(true);
    expect(created.billingUnit).toBe("per_M_tokens");
    expect(created.effectiveFrom).toEqual(NEWER);
  });
});
