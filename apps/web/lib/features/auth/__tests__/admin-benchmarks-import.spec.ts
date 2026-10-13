
/**
 * benchmarks/import route 单测（R-33 provenance 验证）。
 * 验证 CSV 导入创建 SyncBatch 记录 + syncBatchId 写入 Benchmark.rawData。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import { ApiError, ERROR_CODES } from "../../../../app/api/v1/_lib/errors";

const guardStub = vi.hoisted(() => ({ requireAdminApi: vi.fn() }));
const auditStub = vi.hoisted(() => ({ writeAudit: vi.fn() }));
const prismaState = vi.hoisted(() => ({
  aiModel: { findMany: vi.fn() },
  benchmark: { create: vi.fn() },
  syncBatch: { create: vi.fn(), update: vi.fn() },
}));

vi.mock("../session", () => guardStub);
vi.mock("../../../db/prisma", () => ({ prisma: prismaState }));
vi.mock("../../../../app/api/v1/_lib/audit", () => auditStub);

const importRoute = await import("../../../../app/api/v1/admin/benchmarks/import/route");

const ADMIN_CTX = { userId: "admin-1", role: "ADMIN" };
const FORBID_ERR = () => new ApiError(ERROR_CODES.FORBIDDEN, "需要管理员权限");

function csvReq(csv: string) {
  return new Request("http://localhost/api/v1/admin/benchmarks/import", {
    method: "POST",
    body: csv,
    headers: { "Content-Type": "text/csv" },
  }) as never;
}

const SAMPLE_CSV = `modelCode,benchmarkType,totalScore,testDate,sourceName
gpt-4o,mmlu,88.5,2026-01-15,openai
claude-3.5,mmlu,85.2,2026-01-15,anthropic`;

describe("POST /api/v1/admin/benchmarks/import", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    guardStub.requireAdminApi.mockResolvedValue(ADMIN_CTX);
    prismaState.aiModel.findMany.mockResolvedValue([
      { id: "model-1", modelCode: "gpt-4o" },
      { id: "model-2", modelCode: "claude-3.5" },
    ]);
    prismaState.benchmark.create.mockResolvedValue({});
    prismaState.syncBatch.create.mockResolvedValue({
      id: "sync-batch-001",
      batchCode: "CSV-IMPORT-test",
    });
    prismaState.syncBatch.update.mockResolvedValue({});
  });

  it("403 当非管理员", async () => {
    guardStub.requireAdminApi.mockRejectedValueOnce(FORBID_ERR());
    const res = await importRoute.POST(csvReq(SAMPLE_CSV));
    expect(res.status).toBe(403);
    expect(prismaState.syncBatch.create).not.toHaveBeenCalled();
  });

  it("200 + 创建 SyncBatch provenance 记录", async () => {
    const res = await importRoute.POST(csvReq(SAMPLE_CSV));
    expect(res.status).toBe(200);
    expect(prismaState.syncBatch.create).toHaveBeenCalled();
    const createArgs = prismaState.syncBatch.create.mock.calls[0][0];
    expect(createArgs.data.source).toBe("manual");
  });

  it("200 + syncBatchId 写入 Benchmark.rawData", async () => {
    const res = await importRoute.POST(csvReq(SAMPLE_CSV));
    expect(res.status).toBe(200);
    expect(prismaState.benchmark.create).toHaveBeenCalledTimes(2);
    const firstCall = prismaState.benchmark.create.mock.calls[0][0];
    expect(firstCall.data.rawData.syncBatchId).toBe("sync-batch-001");
  });

  it("200 + 响应包含 syncBatchId", async () => {
    const res = await importRoute.POST(csvReq(SAMPLE_CSV));
    const json = await res.json();
    expect(json.data.syncBatchId).toBe("sync-batch-001");
    expect(json.data.imported).toBe(2);
  });

  it("400 当 CSV 为空", async () => {
    const res = await importRoute.POST(csvReq(""));
    expect(res.status).toBe(400);
  });

  it("200 + modelCode 不存在则跳过 + SyncBatch 状态更新", async () => {
    prismaState.aiModel.findMany.mockResolvedValue([
      { id: "model-1", modelCode: "gpt-4o" },
    ]);
    const res = await importRoute.POST(csvReq(SAMPLE_CSV));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.imported).toBe(1);
    expect(json.data.skipped).toBe(1);
    expect(prismaState.syncBatch.update).toHaveBeenCalled();
    const updateArgs = prismaState.syncBatch.update.mock.calls[0][0];
    expect(updateArgs.data.status).toBe("completed");
  });
});
