/**
 * admin benchmarks 路由单测（R-23 修复）：守卫矩阵 + GET 过滤 + POST 白名单。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import { ApiError, ERROR_CODES } from "../../../../app/api/v1/_lib/errors";

const guardStub = vi.hoisted(() => ({ requireAdminApi: vi.fn() }));
const prismaState = vi.hoisted(() => ({
  benchmark: {
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
  },
  aiModel: { findFirst: vi.fn() },
  auditLog: { create: vi.fn() },
}));

vi.mock("../session", () => guardStub);
vi.mock("../../../db/prisma", () => ({ prisma: prismaState }));

const { GET, POST } = await import("../../../../app/api/v1/admin/benchmarks/route");

function mockReq(path: string, params: Record<string, string> = {}) {
  const url = new URL(`http://localhost${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new Request(url) as never;
}

const MOCK_BENCH = {
  id: "bench-1",
  modelId: "model-1",
  benchmarkType: "MMLU",
  score: 88.5,
  verifiedStatus: "VERIFIED",
  source: "manual",
  createdAt: new Date("2025-01-01T00:00:00Z"),
  model: { id: "model-1", modelCode: "gpt-4o", nameDisplay: "GPT-4o" },
};

describe("GET /api/v1/admin/benchmarks 守卫矩阵", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    guardStub.requireAdminApi.mockResolvedValue({ userId: "admin-1", role: "ADMIN" });
    prismaState.benchmark.findMany.mockResolvedValue([]);
    prismaState.benchmark.count.mockResolvedValue(0);
  });

  it("403 当非管理员", async () => {
    guardStub.requireAdminApi.mockRejectedValueOnce(new ApiError(ERROR_CODES.FORBIDDEN, "需要管理员权限"));
    const res = await GET(mockReq("/api/v1/admin/benchmarks"));
    expect(res.status).toBe(403);
    expect(prismaState.benchmark.findMany).not.toHaveBeenCalled();
  });

  it("200 + 返回 benchmark 列表", async () => {
    prismaState.benchmark.findMany.mockResolvedValueOnce([MOCK_BENCH]);
    prismaState.benchmark.count.mockResolvedValueOnce(1);

    const res = await GET(mockReq("/api/v1/admin/benchmarks", { page: "1", pageSize: "20" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.items).toHaveLength(1);
    expect(json.data.items[0].benchmarkType).toBe("MMLU");
    expect(json.data.total).toBe(1);
  });

  it("正确传递 modelCode 过滤", async () => {
    await GET(mockReq("/api/v1/admin/benchmarks", { modelCode: "gpt" }));
    const findManyCall = prismaState.benchmark.findMany.mock.calls[0][0];
    expect(findManyCall.where.model).toBeDefined();
    expect(findManyCall.where.model.modelCode.contains).toBe("gpt");
  });

  it("正确传递 benchmarkType 过滤", async () => {
    await GET(mockReq("/api/v1/admin/benchmarks", { benchmarkType: "MMLU" }));
    const findManyCall = prismaState.benchmark.findMany.mock.calls[0][0];
    expect(findManyCall.where.benchmarkType.contains).toBe("MMLU");
  });
});

describe("POST /api/v1/admin/benchmarks 手动录入", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    guardStub.requireAdminApi.mockResolvedValue({ userId: "admin-1", role: "ADMIN" });
    prismaState.benchmark.create.mockResolvedValue(MOCK_BENCH);
    prismaState.aiModel.findFirst.mockResolvedValue({ id: "model-1", modelCode: "gpt-4o" });
  });

  it("400 当缺少必填字段", async () => {
    const res = await POST(
      new Request("http://localhost/api/v1/admin/benchmarks", {
        method: "POST",
        body: JSON.stringify({ modelId: "model-1" }),
        headers: { "Content-Type": "application/json" },
      }) as never
    );
    expect(res.status).toBe(400);
    expect(prismaState.benchmark.create).not.toHaveBeenCalled();
  });

  it("200 + 创建成功当字段完整", async () => {
    const res = await POST(
      new Request("http://localhost/api/v1/admin/benchmarks", {
        method: "POST",
        body: JSON.stringify({
          modelId: "model-1",
          benchmarkType: "MMLU",
          totalScore: 88.5,
          source: "manual",
        }),
        headers: { "Content-Type": "application/json" },
      }) as never
    );
    expect(res.status).toBe(200);
    expect(prismaState.benchmark.create).toHaveBeenCalled();
  });
});
