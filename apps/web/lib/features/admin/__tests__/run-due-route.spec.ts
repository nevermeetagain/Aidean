/**
 * run-due scripts route 单元测试（R-70）
 *
 * 验证 POST /api/v1/admin/scripts/run-due：
 * 1. requireAdminApi 通过时调用 runDueScripts
 * 2. 返回 triggered + results 结构
 * 3. 无到期脚本时返回 triggered=0
 *
 * 注意：vi.mock 路径相对于测试文件解析，不是相对于 route.ts。
 * 测试文件在 lib/features/admin/__tests__/，需要计算到目标模块的相对路径。
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

const { mockRequireAdmin, mockRunDue } = vi.hoisted(() => ({
  mockRequireAdmin: vi.fn(),
  mockRunDue: vi.fn(),
}));

// 从 lib/features/admin/__tests__/ 到 lib/features/auth/session = ../../auth/session
vi.mock("../../auth/session", () => ({
  requireAdminApi: mockRequireAdmin,
}));

// 从 lib/features/admin/__tests__/ 到 lib/features/admin/script-executor = ../script-executor
vi.mock("../script-executor", () => ({
  runDueScripts: mockRunDue,
}));

// 从 lib/features/admin/__tests__/ 到 app/api/v1/_lib/handler = ../../../../app/api/v1/_lib/handler
vi.mock("../../../../app/api/v1/_lib/handler", () => ({
  withApi: (fn: (req: Request) => Promise<unknown>) => async (req: Request) => {
    try {
      const data = await fn(req);
      return { status: 200, json: async () => ({ code: 0, message: "ok", data }) };
    } catch (err) {
      return {
        status: 400,
        json: async () => ({
          code: 40000,
          message: err instanceof Error ? err.message : "error",
          data: null,
        }),
      };
    }
  },
}));

describe("POST /api/v1/admin/scripts/run-due", () => {
  beforeEach(() => {
    mockRequireAdmin.mockReset();
    mockRunDue.mockReset();
    mockRequireAdmin.mockResolvedValue({ userId: "admin-1", role: "ADMIN" });
  });

  it("有到期脚本时返回执行结果", async () => {
    mockRunDue.mockResolvedValue([
      {
        executionId: "exec-1",
        status: 1,
        output: "done",
        errorMsg: null,
        durationMs: 1500,
      },
    ]);

    const { POST } = await import("../../../../app/api/v1/admin/scripts/run-due/route");
    const res = await POST(new Request("http://localhost", { method: "POST" }));
    const body = await res.json();

    expect(body.code).toBe(0);
    expect(body.data.triggered).toBe(1);
    expect(body.data.results[0].status).toBe("success");
    expect(body.data.results[0].durationMs).toBe(1500);
  });

  it("无到期脚本时返回 triggered=0", async () => {
    mockRunDue.mockResolvedValue([]);

    const { POST } = await import("../../../../app/api/v1/admin/scripts/run-due/route");
    const res = await POST(new Request("http://localhost", { method: "POST" }));
    const body = await res.json();

    expect(body.code).toBe(0);
    expect(body.data.triggered).toBe(0);
    expect(body.data.results).toEqual([]);
  });

  it("失败脚本状态映射为 failed", async () => {
    mockRunDue.mockResolvedValue([
      {
        executionId: "exec-2",
        status: 2,
        output: "",
        errorMsg: "Exit code 1",
        durationMs: 500,
      },
    ]);

    const { POST } = await import("../../../../app/api/v1/admin/scripts/run-due/route");
    const res = await POST(new Request("http://localhost", { method: "POST" }));
    const body = await res.json();

    expect(body.data.results[0].status).toBe("failed");
    expect(body.data.results[0].errorMsg).toBe("Exit code 1");
  });
});

// —— #69 调度防重入锁 ——

const { mockGetRedis, mockSetNxEx, mockCompareDelete } = vi.hoisted(() => ({
  mockGetRedis: vi.fn(),
  mockSetNxEx: vi.fn(),
  mockCompareDelete: vi.fn(),
}));

// 从 lib/features/admin/__tests__/ 到 lib/db/redis = ../../../db/redis
vi.mock("../../../db/redis", () => ({
  getRedis: mockGetRedis,
}));

describe("POST run-due #69 防重入锁", () => {
  beforeEach(() => {
    mockRequireAdmin.mockReset();
    mockRunDue.mockReset();
    mockGetRedis.mockReset();
    mockSetNxEx.mockReset();
    mockCompareDelete.mockReset();
    mockRequireAdmin.mockResolvedValue({ userId: "admin-1", role: "ADMIN" });
    mockGetRedis.mockReturnValue({ setNxEx: mockSetNxEx, compareDelete: mockCompareDelete });
    mockRunDue.mockResolvedValue([]);
  });

  it("获得锁时执行并在完成后释放", async () => {
    mockSetNxEx.mockResolvedValue("OK");
    mockCompareDelete.mockResolvedValue(1);

    const { POST } = await import("../../../../app/api/v1/admin/scripts/run-due/route");
    const res = await POST(new Request("http://localhost", { method: "POST" }));
    const body = await res.json();

    expect(body.code).toBe(0);
    expect(body.data.triggered).toBe(0);
    expect(mockSetNxEx).toHaveBeenCalledWith("lock:scheduler:run-due", expect.any(String), 300);
    expect(mockCompareDelete).toHaveBeenCalledWith("lock:scheduler:run-due", expect.any(String));
  });

  it("锁被占用时幂等跳过且不执行脚本", async () => {
    mockSetNxEx.mockResolvedValue(null);

    const { POST } = await import("../../../../app/api/v1/admin/scripts/run-due/route");
    const res = await POST(new Request("http://localhost", { method: "POST" }));
    const body = await res.json();

    expect(body.code).toBe(0);
    expect(body.data.triggered).toBe(0);
    expect(body.data.skipped).toBe("locked");
    expect(mockRunDue).not.toHaveBeenCalled();
    expect(mockCompareDelete).not.toHaveBeenCalled();
  });

  it("Redis 缺失时退化为无锁直跑（fail-open）", async () => {
    mockGetRedis.mockReturnValue(null);

    const { POST } = await import("../../../../app/api/v1/admin/scripts/run-due/route");
    const res = await POST(new Request("http://localhost", { method: "POST" }));
    const body = await res.json();

    expect(body.code).toBe(0);
    expect(mockRunDue).toHaveBeenCalledTimes(1);
  });

  it("内部令牌恒时比较：Bearer 匹配跳过会话鉴权，不匹配落入会话通道", async () => {
    vi.stubEnv("ADMIN_API_TOKEN", "sidecar-token-123");
    mockSetNxEx.mockResolvedValue("OK");
    mockCompareDelete.mockResolvedValue(1);

    const { POST } = await import("../../../../app/api/v1/admin/scripts/run-due/route");

    // 匹配：不调用 requireAdminApi
    await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { authorization: "Bearer sidecar-token-123" },
      })
    );
    expect(mockRequireAdmin).not.toHaveBeenCalled();

    // 等长错值：落入会话通道
    await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { authorization: "Bearer sidecar-token-124" },
      })
    );
    expect(mockRequireAdmin).toHaveBeenCalledTimes(1);

    vi.unstubAllEnvs();
  });
});
