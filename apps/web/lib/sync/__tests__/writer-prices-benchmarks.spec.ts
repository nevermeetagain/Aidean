/**
 * Sync writer prices/benchmarks 持久化单测（L3-2）。
 *
 * 验证 upsertModel() 在 CREATE 和 UPDATE 两个分支中：
 * ① data.prices 非空时 → prisma.modelPrice.updateMany（旧价格置 isCurrent=false）
 *    + prisma.modelPrice.create（新价格行，sourceType=CRAWLER）
 * ② data.benchmarks 非空时 → prisma.benchmark.findFirst（D4 查重）+ prisma.benchmark.create（sourceType=THIRD_PARTY, verifiedStatus=0）
 * ③ data.prices/benchmarks 均为空时 → 不调用 modelPrice/benchmark 的任何方法
 *
 * D1 修复后 CREATE 分支调用 resolveVendor()，需 mock prisma.vendor。
 * D4 修复后 persistBenchmarks 先 findFirst 查重，需 mock prisma.benchmark.findFirst。
 * D5 修复后 persistPrices 持久化 billingUnit 字段。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaState = vi.hoisted(() => ({
  aiModel: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  vendor: {
    findFirst: vi.fn(), // D1: resolveVendor 依赖
    create: vi.fn(),
  },
  modelChangeLog: {
    findFirst: vi.fn(), // dedup.shouldSkip 查询最近一条 SYNC 日志
    create: vi.fn(),
  },
  modelPrice: {
    updateMany: vi.fn(),
    create: vi.fn(),
  },
  benchmark: {
    findFirst: vi.fn(), // D4: 查重依赖
    create: vi.fn(),
  },
  // TASK-012：persistPrices 现包在 $transaction 内。回调式事务将 tx 传回同一 mock，
  // 使 tx.modelPrice.* 仍命中 prismaState.modelPrice.*，既有断言无需改动。
  $transaction: vi.fn(),
}));

// Mock dedup to always return false (never skip) — but still needs modelChangeLog.findFirst
vi.mock("../dedup", () => ({
  shouldSkip: vi.fn(async () => false),
}));

vi.mock("../../db/prisma", () => ({ prisma: prismaState }));

const { upsertModel } = await import("../writers/model-writers");
import type { NormalizedModelData } from "../types/sync";

const BASE_DATA: NormalizedModelData = {
  modelCode: "test-model-001",
  vendorName: "test-vendor",
  contextLength: 128000,
  checksum: "abc123",
};

const DATA_WITH_PRICES: NormalizedModelData = {
  ...BASE_DATA,
  prices: [
    {
      inputPrice: 0.5,
      outputPrice: 1.5,
      currency: "CNY",
      unit: "per_M_tokens",
      effectiveAt: new Date("2026-09-23T00:00:00Z"),
    },
  ],
};

const DATA_WITH_BENCHMARKS: NormalizedModelData = {
  ...BASE_DATA,
  benchmarks: [
    {
      benchmarkType: "MMLU",
      totalScore: 85.5,
      testDate: new Date("2026-09-01"),
      sourceName: "OpenRouter",
      scores: { overall: 85.5, stem: 82.1, humanities: 88.9 },
    },
  ],
};

describe("upsertModel prices/benchmarks 持久化（L3-2）", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // TASK-012: 回调式 $transaction —— 将 prismaState 作为 tx 回传，令 tx.modelPrice.* == prismaState.modelPrice.*
    prismaState.$transaction.mockImplementation(async (cb: (tx: typeof prismaState) => Promise<unknown>) => cb(prismaState));
    // Default: modelChangeLog.findFirst returns null (no prior sync log → shouldSkip=false)
    prismaState.modelChangeLog.findFirst.mockResolvedValue(null);
    // D1: resolveVendor 默认返回已有 vendor
    prismaState.vendor.findFirst.mockResolvedValue({ id: "vendor-test-001" });
    // D4: benchmark 查重默认返回 null（无重复）
    prismaState.benchmark.findFirst.mockResolvedValue(null);
  });

  describe("CREATE 分支（模型不存在）", () => {
    beforeEach(() => {
      prismaState.aiModel.findFirst.mockResolvedValue(null);
      prismaState.aiModel.create.mockResolvedValue({
        id: "model-new-001",
        modelCode: "test-model-001",
      });
    });

    it("data.prices 非空 → 创建 ModelPrice 行（sourceType=CRAWLER, isCurrent=true, billingUnit 持久化）", async () => {
      await upsertModel(DATA_WITH_PRICES, "batch-001");

      // 旧价格标记为非当前（新模型无旧价格，updateMany 仍调用但影响 0 行）
      expect(prismaState.modelPrice.updateMany).toHaveBeenCalledWith({
        where: { modelId: "model-new-001", isCurrent: true },
        data: { isCurrent: false, effectiveUntil: expect.any(Date) },
      });

      // 新价格行创建
      expect(prismaState.modelPrice.create).toHaveBeenCalledTimes(1);
      const createCall = prismaState.modelPrice.create.mock.calls[0][0];
      expect(createCall.data.modelId).toBe("model-new-001");
      expect(createCall.data.priceInput).toBe(0.5);
      expect(createCall.data.priceOutput).toBe(1.5);
      expect(createCall.data.billingCurrency).toBe("CNY");
      // D5 修复：billingUnit 持久化
      expect(createCall.data.billingUnit).toBe("per_M_tokens");
      expect(createCall.data.sourceType).toBe("CRAWLER");
      expect(createCall.data.isCurrent).toBe(true);
    });

    it("data.benchmarks 非空 → 创建 Benchmark 行（sourceType=THIRD_PARTY, verifiedStatus=0）", async () => {
      await upsertModel(DATA_WITH_BENCHMARKS, "batch-001");

      expect(prismaState.benchmark.create).toHaveBeenCalledTimes(1);
      const createCall = prismaState.benchmark.create.mock.calls[0][0];
      expect(createCall.data.modelId).toBe("model-new-001");
      expect(createCall.data.benchmarkType).toBe("MMLU");
      expect(Number(createCall.data.totalScore)).toBe(85.5);
      expect(createCall.data.sourceType).toBe("THIRD_PARTY");
      expect(createCall.data.verifiedStatus).toBe(0);
      expect(createCall.data.rawData.syncBatchId).toBe("batch-001");
    });

    it("prices 和 benchmarks 均为空 → 不触碰 modelPrice/benchmark 表", async () => {
      await upsertModel(BASE_DATA, "batch-001");

      expect(prismaState.modelPrice.updateMany).not.toHaveBeenCalled();
      expect(prismaState.modelPrice.create).not.toHaveBeenCalled();
      expect(prismaState.benchmark.create).not.toHaveBeenCalled();
    });
  });

  describe("UPDATE 分支（模型已存在）", () => {
    beforeEach(() => {
      prismaState.aiModel.findFirst.mockResolvedValue({
        id: "model-existing-001",
        contextLength: 64000,
        parameterCount: "7B",
      });
      prismaState.aiModel.update.mockResolvedValue({
        id: "model-existing-001",
        modelCode: "test-model-001",
      });
    });

    it("data.prices 非空 → 旧价格 updateMany 置 isCurrent=false + 新价格 create", async () => {
      await upsertModel(DATA_WITH_PRICES, "batch-002");

      expect(prismaState.modelPrice.updateMany).toHaveBeenCalledWith({
        where: { modelId: "model-existing-001", isCurrent: true },
        data: { isCurrent: false, effectiveUntil: expect.any(Date) },
      });

      expect(prismaState.modelPrice.create).toHaveBeenCalledTimes(1);
      const createCall = prismaState.modelPrice.create.mock.calls[0][0];
      expect(createCall.data.modelId).toBe("model-existing-001");
      expect(createCall.data.sourceType).toBe("CRAWLER");
      expect(createCall.data.isCurrent).toBe(true);
    });

    it("data.benchmarks 非空 → 创建 Benchmark 行（append-only，不更新已有）", async () => {
      await upsertModel(DATA_WITH_BENCHMARKS, "batch-002");

      expect(prismaState.benchmark.create).toHaveBeenCalledTimes(1);
      const createCall = prismaState.benchmark.create.mock.calls[0][0];
      expect(createCall.data.modelId).toBe("model-existing-001");
      expect(createCall.data.sourceType).toBe("THIRD_PARTY");
      expect(createCall.data.verifiedStatus).toBe(0);
    });

    it("prices 和 benchmarks 均为空 → 不触碰 modelPrice/benchmark 表", async () => {
      await upsertModel(BASE_DATA, "batch-002");

      expect(prismaState.modelPrice.updateMany).not.toHaveBeenCalled();
      expect(prismaState.modelPrice.create).not.toHaveBeenCalled();
      expect(prismaState.benchmark.create).not.toHaveBeenCalled();
    });
  });

  describe("返回值", () => {
    it("成功创建 → action='created'", async () => {
      prismaState.aiModel.findFirst.mockResolvedValue(null);
      prismaState.aiModel.create.mockResolvedValue({ id: "x", modelCode: "test-model-001" });
      const result = await upsertModel(DATA_WITH_PRICES, "batch-003");
      expect(result.action).toBe("created");
    });

    it("成功更新 → action='updated'", async () => {
      prismaState.aiModel.findFirst.mockResolvedValue({ id: "x", contextLength: 1, parameterCount: "1B" });
      prismaState.aiModel.update.mockResolvedValue({ id: "x", modelCode: "test-model-001" });
      const result = await upsertModel(DATA_WITH_PRICES, "batch-003");
      expect(result.action).toBe("updated");
    });
  });
});
