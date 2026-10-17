/**
 * TASK-003 · readiness 分支单测（REQ-NF-002 / API-001）。
 *
 * 覆盖聚合三分支：DB+Redis 均可达 → ready；DB 挂 → failed:"db"（短路不再探 Redis）；Redis 挂 → failed:"redis"。
 * 追加边界（R-1 审查 m-5）：DB 探活超时 / Redis 非 PONG 应答 / 无 REDIS_URL 各自判 false。
 * 反泄（R-1 审查 M-2）：结构化根因日志只含 tag/dep/reason/name/code，**绝不泄漏 error.message / URL / 口令**。
 * 手法：mock ioredis（default 构造返回可编排 on/ping/disconnect）+ mock ../../db/prisma（user.count）。
 * 不触达真实网络：所有 promise 即时 resolve/reject；唯「超时」用例用假定时器推进 1s。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// —— ioredis：默认导出为「构造函数」，new 后返回带 on/ping/disconnect 的对象 ——
const redisMock = vi.hoisted(() => ({
  on: vi.fn(),
  ping: vi.fn(),
  disconnect: vi.fn(),
}));
vi.mock("ioredis", () => ({
  default: vi.fn(() => ({
    on: redisMock.on,
    ping: redisMock.ping,
    disconnect: redisMock.disconnect,
  })),
}));

// —— prisma：仅 readiness 用到的 user.count ——
const prismaMock = vi.hoisted(() => ({
  user: { count: vi.fn() },
}));
vi.mock("../../../db/prisma", () => ({ prisma: prismaMock }));

import { checkDb, checkRedis, getReadiness } from "../readiness";

let errSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  process.env.REDIS_URL = "redis://127.0.0.1:6379";
  // 默认可达基线；各用例按需覆盖
  prismaMock.user.count.mockResolvedValue(1);
  redisMock.ping.mockResolvedValue("PONG");
  redisMock.disconnect.mockReturnValue(undefined);
  redisMock.on.mockReturnValue(undefined);
});

afterEach(() => {
  errSpy.mockRestore();
});

/** 取出指定 dep 的结构化日志行（tag=ready-probe）。 */
function probeLine(dep: "db" | "redis"): string {
  const line = errSpy.mock.calls
    .map((c) => String(c[0]))
    .find((s) => s.includes('"tag":"ready-probe"') && s.includes(`"dep":"${dep}"`));
  expect(line).toBeTruthy();
  return line as string;
}

describe("readiness · 聚合三分支", () => {
  it("DB 与 Redis 均可达 → ready:true", async () => {
    const result = await getReadiness();
    expect(result).toEqual({ ready: true });
    expect(prismaMock.user.count).toHaveBeenCalledWith({ take: 1 });
    expect(redisMock.ping).toHaveBeenCalledTimes(1);
    expect(redisMock.disconnect).toHaveBeenCalledTimes(1); // 短连即时释放
  });

  it("DB 不可达 → failed:db，且短路不再探 Redis", async () => {
    prismaMock.user.count.mockRejectedValue(new Error("SECRET-CONN-STRING leaked in message"));
    const result = await getReadiness();
    expect(result).toEqual({ ready: false, failed: "db" });
    expect(redisMock.ping).not.toHaveBeenCalled();
    // 反泄：日志只记类别，绝不含 message 原文
    const line = probeLine("db");
    expect(line).toContain('"reason":"error"');
    expect(line).not.toContain("SECRET-CONN-STRING");
  });

  it("DB 可达但 Redis PING 失败 → failed:redis", async () => {
    redisMock.ping.mockRejectedValue(new Error("redis down"));
    const result = await getReadiness();
    expect(result).toEqual({ ready: false, failed: "redis" });
    expect(prismaMock.user.count).toHaveBeenCalledTimes(1);
    expect(redisMock.disconnect).toHaveBeenCalledTimes(1); // 失败路径仍清理连接
    expect(probeLine("redis")).toContain('"reason":"error"');
  });
});

describe("readiness · 边界分支（m-5）", () => {
  it("DB 探活超过 1s → checkDb=false，日志 reason=timeout", async () => {
    vi.useFakeTimers();
    try {
      prismaMock.user.count.mockReturnValue(new Promise(() => {})); // 永不 settle
      const p = checkDb();
      await vi.advanceTimersByTimeAsync(1000);
      expect(await p).toBe(false);
      expect(probeLine("db")).toContain('"reason":"timeout"');
    } finally {
      vi.useRealTimers();
    }
  });

  it("Redis PING 返回非 PONG → checkRedis=false，日志 reason=bad-pong", async () => {
    redisMock.ping.mockResolvedValue("PING");
    expect(await checkRedis()).toBe(false);
    expect(probeLine("redis")).toContain('"reason":"bad-pong"');
    expect(redisMock.disconnect).toHaveBeenCalledTimes(1);
  });

  it("无 REDIS_URL → checkRedis=false（不建连），日志 reason=no-url", async () => {
    delete process.env.REDIS_URL;
    expect(await checkRedis()).toBe(false);
    expect(redisMock.ping).not.toHaveBeenCalled();
    expect(probeLine("redis")).toContain('"reason":"no-url"');
  });
});
