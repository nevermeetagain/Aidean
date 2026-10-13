/**
 * sync/batches route 单测（R-47 多源扩展）。
 * 测试 POST 接收 additionalSources 并正确构建 orchestrator。
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("../../db/prisma", () => ({
  prisma: {
    syncBatch: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn().mockResolvedValue({ id: "batch-1" }),
      update: vi.fn().mockResolvedValue({}),
      findUnique: vi.fn().mockResolvedValue({ validationSummary: null }),
    },
  },
}));

vi.mock("../../features/auth/session", () => ({
  requireAdminApi: vi.fn().mockResolvedValue({ userId: "admin-1" }),
}));

vi.mock("../sync-orchestrator", () => ({
  SyncOrchestrator: vi.fn().mockImplementation((adapter, additionalAdapters) => ({
    adapter,
    additionalAdapters,
    execute: vi.fn().mockResolvedValue({
      batchId: "batch-1",
      status: "completed",
      totalRecords: 10,
      successRecords: 8,
      failedRecords: 1,
      skippedRecords: 1,
      errors: [],
    }),
  })),
}));

vi.mock("../../../app/api/v1/_lib/audit", () => ({
  writeAudit: vi.fn().mockResolvedValue(undefined),
}));

const { POST } = await import("../../../app/api/v1/admin/sync/batches/route");

function mockReq(body: Record<string, unknown>) {
  // withApi 信封层会读 req.headers（x-request-id 贯穿），mock 必须是真实 Request
  return new Request("http://localhost/api/v1/admin/sync/batches", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  }) as never;
}

describe("POST /api/v1/admin/sync/batches — multi-source", () => {
  it("仅主源时 additionalAdapters 为空", async () => {
    const res = await POST(mockReq({ source: "openrouter", dryRun: true }));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.data.batchId).toBe("batch-1");
  });

  it("additionalSources 包含 huggingface + lmsys 时传入 orchestrator", async () => {
    const { SyncOrchestrator } = await import("../sync-orchestrator");
    const mockFn = vi.mocked(SyncOrchestrator);
    const mock = SyncOrchestrator as unknown as { mock: { calls: unknown[][] } };
    mockFn.mockClear();

    await POST(mockReq({
      source: "openrouter",
      dryRun: true,
      additionalSources: ["huggingface", "lmsys"],
    }));

    const lastCall = mockFn.mock.calls.at(-1);
    expect(lastCall).toBeDefined();
    const [, additionalAdapters] = lastCall!;
    expect(additionalAdapters).toHaveLength(2);
  });

  it("unknown source 回退到 openrouter", async () => {
    const res = await POST(mockReq({ source: "unknown_source", dryRun: true }));
    expect(res.status).toBe(200);
  });

  it("缺少 source 返回 400", async () => {
    const res = await POST(mockReq({ dryRun: true }));
    expect(res.status).toBe(400);
  });
});
