/**
 * sync orchestrator 单测（R-23 修复）：dedup 跳过 + 更新 + 创建三条路径。
 * D1 修复后 CREATE 分支调用 resolveVendor()，需 mock prisma.vendor。
 */
import { describe, expect, it, vi } from "vitest";

const prismaState = vi.hoisted(() => ({
  aiModel: { findFirst: vi.fn(), update: vi.fn(), create: vi.fn() },
  vendor: { findFirst: vi.fn(), create: vi.fn() }, // D1: resolveVendor 依赖
  modelChangeLog: { findFirst: vi.fn(), create: vi.fn() },
  modelPrice: { updateMany: vi.fn(), create: vi.fn() },
  benchmark: { findFirst: vi.fn(), create: vi.fn() },
  syncBatch: { update: vi.fn() },
}));

vi.mock("../../../db/prisma", () => ({ prisma: prismaState }));

const { upsertModel } = await import("../../../sync/writers/model-writers");

const BASE_DATA = {
  modelCode: "gpt-4o",
  nameDisplay: "GPT-4o",
  vendorName: "openai",
  isActive: true,
  visibility: "PUBLIC",
  contextLength: 128000,
  parameterCount: null,
  isOpenSource: false,
  isMultiModal: true,
  isReasoning: false,
  isCodingOptimized: false,
  officialUrl: "https://openai.com",
  docsUrl: null,
  apiUrl: null,
  githubUrl: null,
  paperUrl: null,
  publishedAt: null,
  status: "ACTIVE",
  checksum: "test_checksum",
};

describe("upsertModel dedup integration", () => {
  it("跳过 UPDATE 当 checksum 匹配", async () => {
    prismaState.aiModel.findFirst.mockResolvedValue({ id: "model-1", contextLength: 128000, parameterCount: null });
    prismaState.modelChangeLog.findFirst.mockResolvedValue({
      checksum: "test_checksum",
      afterData: null,
    });

    const result = await upsertModel(BASE_DATA as never, "batch-test");

    expect(result.action).toBe("skipped");
    expect(prismaState.aiModel.update).not.toHaveBeenCalled();
    expect(prismaState.modelChangeLog.create).not.toHaveBeenCalled();
  });

  it("执行 UPDATE 当 checksum 不匹配", async () => {
    prismaState.aiModel.findFirst.mockResolvedValue({ id: "model-1", contextLength: 64000, parameterCount: null });
    prismaState.modelChangeLog.findFirst.mockResolvedValue({
      checksum: "old_checksum",
      afterData: null,
    });
    prismaState.aiModel.update.mockResolvedValue({ id: "model-1" });
    prismaState.benchmark.findFirst.mockResolvedValue(null);

    const result = await upsertModel({ ...BASE_DATA, checksum: "new_checksum" } as never, "batch-test");

    expect(result.action).toBe("updated");
    expect(prismaState.aiModel.update).toHaveBeenCalled();
    expect(prismaState.modelChangeLog.create).toHaveBeenCalled();
  });

  it("执行 CREATE 当无历史记录（首次同步）", async () => {
    prismaState.aiModel.findFirst.mockResolvedValue(null);
    // D1: resolveVendor 先查 vendor
    prismaState.vendor.findFirst.mockResolvedValue({ id: "vendor-openai" });
    prismaState.aiModel.create.mockResolvedValue({ id: "model-new" });

    const result = await upsertModel({ ...BASE_DATA, modelCode: "claude-3.5", checksum: "first_checksum" } as never, "batch-test");

    expect(result.action).toBe("created");
    expect(prismaState.aiModel.create).toHaveBeenCalled();
    expect(prismaState.modelChangeLog.create).toHaveBeenCalled();
  });
});
