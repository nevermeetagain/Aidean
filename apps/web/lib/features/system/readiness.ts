/**
 * lib/features/system/readiness — DB / Redis 就绪探活（API-001 / REQ-NF-002 / TASK-003）。
 *
 * 设计约束（真实码位驱动，非臆造）：
 * - DB 探活：不得使用裸 SQL 直连原语（check-docs-facts 业务层直连查询计数门禁须为 0）→ 改用
 *   `prisma.user.count({ take: 1 })` 等价轻查询触发一次真实往返。
 * - Redis 探活：**不复用 getRedis()**。lib/db/redis.ts 的 RedisLike 是 fail-open 包装
 *   （命令失败静默返 fallback），无法区分「键不存在」与「连接不可用」，用它探活会把
 *   「Redis 宕机」误判成 ok（假绿）。就绪探针必须独立反映真实可达性，故此处对 ioredis
 *   直连 PING 并即刻 disconnect（短连，不占用应用连接池）。
 * - 两项各 1s 超时（withTimeout），超时/异常一律判该依赖不可用。
 * - 可运维性（REQ-NF-002）：判 false 前输出一行**结构化**根因日志（tag/dep/reason/name/code），
 *   仅记错误类别与原语 code，**绝不落 error.message**（Prisma 连接错误 message 可能含连接串）
 *   与 URL/口令，避免线上 503 时无从区分「连接被拒/认证失败/超时/未配置」。
 *
 * 交接注记（m-2）：`/ready` 语义 = **DB+Redis 强依赖**（任一不可达即 503），与 lib/db/redis.ts
 *   应用侧「Redis 可缺失、fail-open」定位不同。接入容器 healthcheck/readinessProbe 前须确认
 *   Redis 为强制组件；否则应改用不带依赖拨测的 `/system/health`。
 */
import Redis from "ioredis";

import { prisma } from "../../db/prisma";

const PROBE_TIMEOUT_MS = 1000;

/**
 * 给 promise 加时间上界：超时以 reject 结束。
 * 关键点：同时给原 promise 挂 onRejected，令「超时先 settle、原 promise 稍后才 reject」
 * 不致产生 unhandledRejection（否则 vitest/进程可能崩溃）。
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("probe-timeout")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

/** 依错误对象归因：区分「超时」与「真实错误」，供结构化日志（不含 message 原文）。 */
function reasonOf(err: unknown): "timeout" | "error" {
  return err instanceof Error && err.message === "probe-timeout" ? "timeout" : "error";
}

/**
 * 结构化探活失败日志。安全边界：只输出 name/code（如 Prisma `P1001`、ioredis `ETIMEDOUT`），
 * 绝不输出 err.message（连接类错误 message 可能内嵌含口令的连接串）。
 */
function logProbeFailure(dep: "db" | "redis", extra: Record<string, unknown>): void {
  console.error(JSON.stringify({ tag: "ready-probe", dep, ...extra }));
}

/** DB 可达？轻查询成功=true；异常/超时=false。 */
export async function checkDb(): Promise<boolean> {
  try {
    await withTimeout(prisma.user.count({ take: 1 }), PROBE_TIMEOUT_MS);
    return true;
  } catch (err) {
    logProbeFailure("db", {
      reason: reasonOf(err),
      name: (err as { name?: string })?.name ?? "Unknown",
      code: (err as { code?: string })?.code,
    });
    return false;
  }
}

/** Redis 可达？PING 返回 PONG=true；无 REDIS_URL / 异常 / 超时=false。 */
export async function checkRedis(): Promise<boolean> {
  const url = process.env.REDIS_URL;
  if (!url) {
    logProbeFailure("redis", { reason: "no-url" });
    return false;
  }
  let client: Redis | undefined;
  try {
    client = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 1 });
    // 与 lib/db/redis.ts 同口径静默 error 事件：连接失败期 ioredis 会持续 emit error，
    // 无监听者时 ioredis 内部 console.error 整段栈（日志风暴）。可达性判定仍由 ping 结果决定。
    client.on("error", () => {});
    const pong = await withTimeout(client.ping(), PROBE_TIMEOUT_MS);
    if (pong !== "PONG") {
      logProbeFailure("redis", { reason: "bad-pong", pong: String(pong) });
      return false;
    }
    return true;
  } catch (err) {
    logProbeFailure("redis", {
      reason: reasonOf(err),
      name: (err as { name?: string })?.name ?? "Unknown",
      code: (err as { code?: string })?.code,
    });
    return false;
  } finally {
    try {
      client?.disconnect();
    } catch {
      /* 清理失败忽略：就绪探测不应因断连噪声改变结论 */
    }
  }
}

export type ReadinessResult =
  | { ready: true }
  | { ready: false; failed: "db" | "redis" };

/**
 * 顺序短路聚合：先 DB 后 Redis，返回首个不可用依赖（决定错误文案 `依赖不可用: db|redis`）。
 * 二者均可达 → ready:true。
 */
export async function getReadiness(): Promise<ReadinessResult> {
  if (!(await checkDb())) return { ready: false, failed: "db" };
  if (!(await checkRedis())) return { ready: false, failed: "redis" };
  return { ready: true };
}
