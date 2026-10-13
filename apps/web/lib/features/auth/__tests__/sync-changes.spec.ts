/**
 * sync changes 路由单测（R-23 修复）：守卫矩阵 + 过滤 + 分页。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import { ApiError, ERROR_CODES } from "../../../../app/api/v1/_lib/errors";

const guardStub = vi.hoisted(() => ({ requireAdminApi: vi.fn() }));
const prismaState = vi.hoisted(() => ({
  modelChangeLog: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
}));

vi.mock("../session", () => guardStub);
vi.mock("../../../db/prisma", () => ({ prisma: prismaState }));

const { GET } = await import("../../../../app/api/v1/admin/sync/changes/route");

function mockReq(params: Record<string, string> = {}) {
  const url = new URL("http://localhost/api/v1/admin/sync/changes");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new Request(url) as never;
}

const MOCK_LOG = {
  id: "log-1",
  modelId: "model-1",
  syncBatchId: "batch-1",
  changeType: "SYNC",
  changedFields: ["contextLength"],
  source: "sync_script",
  operatorId: null,
  isReverted: false,
  revertedAt: null,
  revertReason: null,
  checksum: "abc",
  validationStatus: null,
  createdAt: new Date("2025-01-01T00:00:00Z"),
  model: { id: "model-1", modelCode: "gpt-4o", nameDisplay: "GPT-4o" },
};

describe("GET /api/v1/admin/sync/changes 守卫矩阵", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    guardStub.requireAdminApi.mockResolvedValue({ userId: "admin-1", role: "ADMIN" });
    prismaState.modelChangeLog.findMany.mockResolvedValue([]);
    prismaState.modelChangeLog.count.mockResolvedValue(0);
  });

  it("403 当非管理员", async () => {
    guardStub.requireAdminApi.mockRejectedValueOnce(new ApiError(ERROR_CODES.FORBIDDEN, "需要管理员权限"));
    const res = await GET(mockReq());
    expect(res.status).toBe(403);
    expect(prismaState.modelChangeLog.findMany).not.toHaveBeenCalled();
  });

  it("200 + 返回变更列表当管理员", async () => {
    prismaState.modelChangeLog.findMany.mockResolvedValueOnce([MOCK_LOG]);
    prismaState.modelChangeLog.count.mockResolvedValueOnce(1);

    const res = await GET(mockReq({ page: "1", pageSize: "20" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.items).toHaveLength(1);
    expect(json.data.items[0].modelCode).toBe("gpt-4o");
    expect(json.data.total).toBe(1);
  });

  it("正确传递 changeType 过滤", async () => {
    await GET(mockReq({ changeType: "CREATE" }));
    const findManyCall = prismaState.modelChangeLog.findMany.mock.calls[0][0];
    expect(findManyCall.where.changeType).toBe("CREATE");
  });

  it("正确传递 isReverted 过滤", async () => {
    await GET(mockReq({ isReverted: "true" }));
    const findManyCall = prismaState.modelChangeLog.findMany.mock.calls[0][0];
    expect(findManyCall.where.isReverted).toBe(true);
  });
});
