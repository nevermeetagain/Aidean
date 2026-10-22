/**
 * SyncOrchestrator 单测（TP-5.2.1）。
 * Mock adapter + prisma + mappers + writers，测试 execute() 全流程。
 *
 * 覆盖：
 * - dryRun 模式（只返回计数，不写入）
 * - 正常执行（fetch → map → write → update batch）
 * - adapter.fetch 抛异常 → status=failed
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

// Hoisted mock state
const prismaState = vi.hoisted(() => ({
  syncBatch: {
    create: vi.fn(),
    update: vi.fn(),
  },
}));

const mapperStub = vi.hoisted(() => ({
  mapModel: vi.fn(),
}));

const writerStub = vi.hoisted(() => ({
  writeBatch: vi.fn(),
}));

vi.mock("../../db/prisma", () => ({ prisma: prismaState }));
vi.mock("../mappers/model-mappers", () => mapperStub);
vi.mock("../writers/model-writers", () => writerStub);

// Import after mocks
const { SyncOrchestrator } = await import("../sync-orchestrator");
const { SyncAdapter } = await import("../adapters/base");
import type { RawModelData, SyncConfig, SyncBatchResult } from "../types/sync";

/** Test adapter that returns configurable data or throws */
class TestAdapter extends SyncAdapter {
  readonly name = "test-adapter";
  readonly source = "test";
  private data: RawModelData[];
  private shouldThrow: boolean;

  constructor(data: RawModelData[], shouldThrow = false) {
    super();
    this.data = data;
    this.shouldThrow = shouldThrow;
  }

  async fetch(_config: SyncConfig): Promise<RawModelData[]> {
    if (this.shouldThrow) throw new Error("fetch failed");
    return this.data;
  }

  async testConnection(): Promise<boolean> {
    return !this.shouldThrow;
  }
}

const BASE_CONFIG: SyncConfig = {
  source: "official_api",
  sourceUrl: "https://example.com/api",
  dryRun: false,
};

const RAW_DATA: RawModelData[] = [
  {
    modelCode: "gpt-4o",
    contextLength: 128000,
    inputPrice: 0.01,
    outputPrice: 0.03,
    currency: "USD",
    unit: "per_1k_tokens",
  },
  {
    modelCode: "claude-3.5-sonnet",
    contextLength: 200000,
  },
];

const MOCK_NORMALIZED = [
  {
    modelCode: "gpt-4o",
    contextLength: 128000,
    checksum: "abc123",
    prices: [],
    benchmarks: [],
  },
  {
    modelCode: "claude-3.5-sonnet",
    contextLength: 200000,
    checksum: "def456",
    prices: [],
    benchmarks: [],
  },
];

const MOCK_WRITE_RESULT: SyncBatchResult = {
  batchId: "batch-001",
  totalRecords: 2,
  successRecords: 2,
  failedRecords: 0,
  skippedRecords: 0,
  status: "completed",
  errors: [],
};

describe("SyncOrchestrator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaState.syncBatch.create.mockResolvedValue({
      id: "batch-001",
      batchCode: "SYNC-123",
      status: "running",
    });
    prismaState.syncBatch.update.mockResolvedValue({});
    mapperStub.mapModel.mockImplementation((raw: RawModelData) => ({
      modelCode: raw.modelCode,
      contextLength: raw.contextLength,
      checksum: "test-checksum",
      prices: [],
      benchmarks: [],
    }));
    writerStub.writeBatch.mockImplementation(async (data: unknown[]) => ({
      batchId: "batch-001",
      totalRecords: Array.isArray(data) ? data.length : 0,
      successRecords: Array.isArray(data) ? data.length : 0,
      failedRecords: 0,
      skippedRecords: 0,
      status: "completed" as const,
      errors: [],
    }));
  });

  it("dryRun=true: 返回计数但不调用 writeBatch", async () => {
    const adapter = new TestAdapter(RAW_DATA);
    const orchestrator = new SyncOrchestrator(adapter);

    const result = await orchestrator.execute({ ...BASE_CONFIG, dryRun: true });

    expect(result.status).toBe("completed");
    expect(result.totalRecords).toBe(2);
    expect(result.skippedRecords).toBe(2);
    expect(result.successRecords).toBe(0);
    expect(writerStub.writeBatch).not.toHaveBeenCalled();
  });

  it("dryRun=false: 调用 fetch → mapModel → writeBatch 完整流程", async () => {
    const adapter = new TestAdapter(RAW_DATA);
    const orchestrator = new SyncOrchestrator(adapter);

    const result = await orchestrator.execute(BASE_CONFIG);

    expect(result.status).toBe("completed");
    expect(result.totalRecords).toBe(2);
    expect(result.successRecords).toBe(2);
    expect(mapperStub.mapModel).toHaveBeenCalledTimes(2);
    expect(writerStub.writeBatch).toHaveBeenCalledTimes(1);
    expect(writerStub.writeBatch.mock.calls[0][1]).toBe("batch-001");
  });

  it("成功时更新 SyncBatch 记录为 completed", async () => {
    const adapter = new TestAdapter(RAW_DATA);
    const orchestrator = new SyncOrchestrator(adapter);

    await orchestrator.execute(BASE_CONFIG);

    expect(prismaState.syncBatch.update).toHaveBeenCalled();
    const updateArgs = prismaState.syncBatch.update.mock.calls[0][0];
    expect(updateArgs.where.id).toBe("batch-001");
    expect(updateArgs.data.status).toBe("completed");
    expect(updateArgs.data.totalRecords).toBe(2);
  });

  it("adapter.fetch 抛异常时返回 status=failed", async () => {
    const adapter = new TestAdapter([], true);
    const orchestrator = new SyncOrchestrator(adapter);

    const result = await orchestrator.execute(BASE_CONFIG);

    expect(result.status).toBe("failed");
    expect(result.failedRecords).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].error).toBe("fetch failed");
    expect(writerStub.writeBatch).not.toHaveBeenCalled();
  });

  it("fetch 异常时更新 SyncBatch 记录为 failed", async () => {
    const adapter = new TestAdapter([], true);
    const orchestrator = new SyncOrchestrator(adapter);

    await orchestrator.execute(BASE_CONFIG);

    expect(prismaState.syncBatch.update).toHaveBeenCalled();
    const updateArgs = prismaState.syncBatch.update.mock.calls[0][0];
    expect(updateArgs.data.status).toBe("failed");
  });

  it("空数据集: 正常完成，0 records", async () => {
    const adapter = new TestAdapter([]);
    const orchestrator = new SyncOrchestrator(adapter);

    const result = await orchestrator.execute(BASE_CONFIG);

    expect(result.status).toBe("completed");
    expect(result.totalRecords).toBe(0);
    expect(mapperStub.mapModel).not.toHaveBeenCalled();
  });

  // R-43: CrossValidator 接线测试
  describe("R-43: CrossValidator 接线", () => {
    it("无 additionalAdapters 时不触发交叉验证", async () => {
      const adapter = new TestAdapter(RAW_DATA);
      const orchestrator = new SyncOrchestrator(adapter);

      const result = await orchestrator.execute(BASE_CONFIG);

      expect(result.status).toBe("completed");
      // validationSummary should not contain crossValidation
      const updateArgs = prismaState.syncBatch.update.mock.calls[0][0];
      const vs = updateArgs.data.validationSummary;
      expect(vs.crossValidation).toBeUndefined();
    });

    it("有 additionalAdapters 时触发交叉验证并写入 conflictReport", async () => {
      const adapter = new TestAdapter(RAW_DATA);
      const extraAdapter = new TestAdapter(RAW_DATA); // same data
      const orchestrator = new SyncOrchestrator(adapter, [extraAdapter]);

      const result = await orchestrator.execute(BASE_CONFIG);

      expect(result.status).toBe("completed");
      const updateArgs = prismaState.syncBatch.update.mock.calls[0][0];
      const vs = updateArgs.data.validationSummary;
      expect(vs.crossValidation).toBeDefined();
      expect(vs.crossValidation.totalModels).toBe(2);
      expect(vs.crossValidation.modelsWithConflicts).toBe(0);
    });

    it("额外 adapter fetch 失败时不阻塞主流程", async () => {
      const adapter = new TestAdapter(RAW_DATA);
      const failingExtra = new TestAdapter([], true);
      const orchestrator = new SyncOrchestrator(adapter, [failingExtra]);

      const result = await orchestrator.execute(BASE_CONFIG);

      expect(result.status).toBe("completed");
      // crossValidation still present but only with primary source
      const updateArgs = prismaState.syncBatch.update.mock.calls[0][0];
      const vs = updateArgs.data.validationSummary;
      // With only 1 successful source, no conflicts possible
      expect(vs.crossValidation.totalConflicts).toBe(0);
    });
  });
});
