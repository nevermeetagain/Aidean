/**
 * sync/batches POST 路由单测（R-26 修复验证）。
 * 验证 POST 接通 SyncOrchestrator，不再只创建空壳 batch 记录。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import { ApiError, ERROR_CODES } from "../../../../app/api/v1/_lib/errors";

const guardStub = vi.hoisted(() => ({ requireAdminApi: vi.fn() }));
const auditStub = vi.hoisted(() => ({ writeAudit: vi.fn() }));
const prismaState = vi.hoisted(() => ({
  syncBatch: { create: vi.fn(), update: vi.fn(), findMany: vi.fn(), count: vi.fn(), findUnique: vi.fn().mockResolvedValue({ validationSummary: null }) },
}));

// Mock SyncOrchestrator
const orchestratorStub = vi.hoisted(() => ({
  execute: vi.fn(),
}));

vi.mock("../session", () => guardStub);
vi.mock("../../../db/prisma", () => ({ prisma: prismaState }));
vi.mock("../../../../app/api/v1/_lib/audit", () => auditStub);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("../../../sync/sync-orchestrator", () => ({
  SyncOrchestrator: vi.fn().mockImplementation(() => orchestratorStub),
}));
vi.mock("../../../sync/adapters/openrouter", () => ({
  OpenRouterAdapter: vi.fn().mockImplementation(() => ({ name: "openrouter" })),
}));

const syncBatchesRoute = await import("../../../../app/api/v1/admin/sync/batches/route");

function postReq(body: unknown) {
  return new Request("http://localhost/api/v1/admin/sync/batches", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  }) as never;
}

const ADMIN_CTX = { userId: "admin-1", role: "ADMIN" };

describe("POST /api/v1/admin/sync/batches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    guardStub.requireAdminApi.mockResolvedValue(ADMIN_CTX);
    prismaState.syncBatch.update.mockResolvedValue({});
    orchestratorStub.execute.mockResolvedValue({
      batchId: "batch-123",
      status: "completed",
      totalRecords: 100,
      successRecords: 95,
      failedRecords: 3,
      skippedRecords: 2,
      errors: [],
    });
  });

  it("201 + 调用 orchestrator.execute()", async () => {
    const res = await syncBatchesRoute.POST(postReq({
      source: "official_api",
      dryRun: false,
    }));
    expect(res.status).toBe(200);
    expect(orchestratorStub.execute).toHaveBeenCalled();
    const json = await res.json();
    expect(json.data.batchId).toBe("batch-123");
    expect(json.data.status).toBe("completed");
    expect(json.data.totalRecords).toBe(100);
  });

  it("201 + dry-run 模式", async () => {
    const res = await syncBatchesRoute.POST(postReq({
      source: "official_api",
      dryRun: true,
    }));
    expect(res.status).toBe(200);
    const config = orchestratorStub.execute.mock.calls[0][0];
    expect(config.dryRun).toBe(true);
  });

  it("400 当缺少 source", async () => {
    const res = await syncBatchesRoute.POST(postReq({
      dryRun: true,
    }));
    expect(res.status).toBe(400);
    expect(orchestratorStub.execute).not.toHaveBeenCalled();
  });

  it("403 当非管理员", async () => {
    guardStub.requireAdminApi.mockRejectedValueOnce(new ApiError(ERROR_CODES.FORBIDDEN, "需要管理员权限"));
    const res = await syncBatchesRoute.POST(postReq({
      source: "official_api",
    }));
    expect(res.status).toBe(403);
    expect(orchestratorStub.execute).not.toHaveBeenCalled();
  });

  it("201 + orchestrator 失败时返回 failed 状态", async () => {
    orchestratorStub.execute.mockResolvedValueOnce({
      batchId: "batch-456",
      status: "failed",
      totalRecords: 0,
      successRecords: 0,
      failedRecords: 1,
      skippedRecords: 0,
      errors: [{ modelCode: "N/A", error: "connection refused" }],
    });
    const res = await syncBatchesRoute.POST(postReq({
      source: "official_api",
    }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.status).toBe("failed");
    expect(json.data.errors).toHaveLength(1);
  });
});
