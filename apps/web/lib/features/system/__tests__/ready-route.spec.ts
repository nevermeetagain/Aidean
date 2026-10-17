/**
 * TASK-003 · ready 路由 HTTP 层证据（API-001 / REQ-NF-002）。
 *
 * 目的：确定性地证明 route 的 GET 依依赖可达性产出契约规定的 HTTP 状态与信封，
 * 等价替代「本地无 DB → curl 503」的集成验收（开发期本机 next dev 因预存在的
 * 依赖装载缺陷 `next/dist/pages/_app` 缺失无法启动，见 EVD-003；本用例在 node 环境
 * 直调真实 handler，不受该环境缺陷影响）。
 *
 * 手法：mock readiness 的两项底座（ioredis / ../../db/prisma），真调 route.GET，
 * 断 withApi 的 200 成功信封 与 503+50010 错误映射（DEFAULT_STATUS_BY_CODE[50010]=503）。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const redisMock = vi.hoisted(() => ({ on: vi.fn(), ping: vi.fn(), disconnect: vi.fn() }));
vi.mock("ioredis", () => ({
  default: vi.fn(() => ({ on: redisMock.on, ping: redisMock.ping, disconnect: redisMock.disconnect })),
}));

const prismaMock = vi.hoisted(() => ({ user: { count: vi.fn() } }));
vi.mock("../../../db/prisma", () => ({ prisma: prismaMock }));

import { GET } from "../../../../app/api/v1/system/ready/route";

const REQ = () => new Request("http://localhost/api/v1/system/ready", { method: "GET" });

beforeEach(() => {
  vi.clearAllMocks();
  process.env.REDIS_URL = "redis://127.0.0.1:6379";
  prismaMock.user.count.mockResolvedValue(1);
  redisMock.ping.mockResolvedValue("PONG");
  redisMock.disconnect.mockReturnValue(undefined);
});

describe("GET /api/v1/system/ready · 路由 HTTP 层", () => {
  it("双依赖可达 → 200 + SystemReady 信封（code=0）", async () => {
    const res = await GET(REQ());
    expect(res.status).toBe(200);
    expect(res.headers.get("x-request-id")).toBeTruthy();
    const body = (await res.json()) as {
      code: number;
      message: string;
      data: { status: string; checks: { db: string; redis: string }; time: string } | null;
    };
    expect(body.code).toBe(0);
    expect(body.message).toBe("ok");
    expect(body.data?.status).toBe("ready");
    expect(body.data?.checks).toEqual({ db: "ok", redis: "ok" });
    expect(typeof body.data?.time).toBe("string");
  });

  it("DB 不可达 → 503 + 信封 code=50010 / message '依赖不可用: db'", async () => {
    prismaMock.user.count.mockRejectedValue(new Error("db down"));
    const res = await GET(REQ());
    expect(res.status).toBe(503);
    const body = (await res.json()) as { code: number; message: string; data: unknown };
    expect(body.code).toBe(50010);
    expect(body.message).toBe("依赖不可用: db");
    expect(body.data).toBeNull();
  });

  it("Redis 不可达（DB 可达）→ 503 + code=50010 / message '依赖不可用: redis'", async () => {
    redisMock.ping.mockRejectedValue(new Error("redis down"));
    const res = await GET(REQ());
    expect(res.status).toBe(503);
    const body = (await res.json()) as { code: number; message: string };
    expect(body.code).toBe(50010);
    expect(body.message).toBe("依赖不可用: redis");
  });
});
