/**
 * lib/db/redis — 统一 ioredis 连接懒单例（Task L.3.1）。
 *
 * 策略：
 * - 未配置 REDIS_URL 时 getRedis() 返回 null，调用方（如 ladder 服务）走 DB 直查降级分支；
 * - lazyConnect：实例创建阶段不发起连接，首条命令触发连接；
 * - maxRetriesPerRequest:1 让连接故障快速失败，不在请求上长挂；
 * - error 事件静默（缓存属可失组件，错误不得污染应用日志主链路）；
 * - 任一命令失败即判「连接坏」：实例 disconnect 并整体降级为 fallback 返回；
 * - 坏态设冷却窗口（BREAK_COOLDOWN_MS）：窗口内恒走 fallback（零日志风暴）；
 *   窗口过后自动重建连接重试一次——共享 Redis 场景下短暂网络抖动可自愈，
 *   不会像旧版那样「一次失败即永久瘫痪至进程重启」。
 */

import Redis from "ioredis";

/** 最小命令面：ladder 读穿缓存 + M-SSO 限流/OAuth code 存储所需的命令子集 */
export type RedisLike = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode: "EX", ttl: number): Promise<unknown>;
  scan(
    cursor: number | string,
    matchToken: "MATCH",
    pattern: string,
    countToken: "COUNT",
    count: number
  ): Promise<[cursor: string, keys: string[]]>;
  unlink(key: string): Promise<unknown>;
  /** 限流固定窗口计数（M-SSO P0.5） */
  incr(key: string): Promise<number>;
  /** 窗口 TTL（首个计数时设置） */
  expire(key: string, seconds: number): Promise<unknown>;
  /** OAuth code 一次性消费（M-SSO P1.4）：原子取值并删除 */
  getdel(key: string): Promise<string | null>;
  /** 调度互斥锁获取（#69）：SET key value EX ttl NX；"OK"=获得 / null=已被占用；连接坏态 fail-open 返 "OK" */
  setNxEx(key: string, value: string, ttlSeconds: number): Promise<"OK" | null>;
  /** 原子「值相等才删」（Lua compare-and-delete，#69）：1=已删 / 0=未删或键不存在；连接坏态返 0（绝不误删他人锁） */
  compareDelete(key: string, value: string): Promise<0 | 1>;
};

interface RedisHandle {
  port: RedisLike;
  broken: boolean;
  brokenAt: number;
  client: Redis | undefined;
  url: string;
}

/** 坏态冷却窗口：一次命令失败后 30s 内不再尝试，过后自动重连重试一次 */
const BREAK_COOLDOWN_MS = 30_000;

/** 新建一个静默错误、懒连接的真实客户端 */
function newClient(url: string): Redis {
  const client = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 1 });
  client.on("error", () => {});
  return client;
}

/** 创建带降级+冷却重连包装的句柄：命令失败 → 标记坏并拆连，冷却过后自愈 */
function createHandle(url: string): RedisHandle {
  const handle: RedisHandle = {
    port: undefined as never,
    broken: false,
    brokenAt: 0,
    client: newClient(url),
    url,
  };

  /** 统一执行器：坏态走冷却判定；向 op 传入当前活跃客户端（重连后自动切换） */
  async function call<T>(op: (client: Redis) => Promise<T>, fallback: T): Promise<T> {
    if (handle.broken) {
      if (Date.now() - handle.brokenAt <= BREAK_COOLDOWN_MS) return fallback;
      // 冷却期已过：重建连接，重新允许一次尝试（自愈共享 Redis 短暂抖动）
      handle.client = newClient(handle.url);
      handle.broken = false;
    }
    const client = handle.client;
    if (!client) return fallback;
    try {
      return await op(client);
    } catch {
      handle.broken = true;
      handle.brokenAt = Date.now();
      try {
        client.disconnect();
      } catch {
        /* 断连清理失败同样静默 */
      }
      handle.client = undefined;
      return fallback;
    }
  }

  handle.port = {
    get: (key) => call((c) => c.get(key), null),
    set: (key, value, mode, ttl) => call((c) => c.set(key, value, mode, ttl), "OK" as unknown),
    scan: (cursor, matchToken, pattern, countToken, count) =>
      call<[string, string[]]>((c) => c.scan(cursor, matchToken, pattern, countToken, count), ["0", []]),
    unlink: (key) => call((c) => c.unlink(key), "OK" as unknown),
    incr: (key) => call((c) => c.incr(key), 0),
    expire: (key, seconds) => call((c) => c.expire(key, seconds), "OK" as unknown),
    getdel: (key) => call((c) => c.getdel(key), null),
    setNxEx: (key, value, ttl) =>
      call<"OK" | null>(
        (c) => c.set(key, value, "EX", ttl, "NX") as Promise<"OK" | null>,
        "OK" as unknown as "OK" | null
      ),
    compareDelete: (key, value) =>
      call<0 | 1>(
        (c) =>
          c.eval(
            "if redis.call('get',KEYS[1])==ARGV[1] then return redis.call('del',KEYS[1]) else return 0 end",
            1,
            key,
            value
          ) as Promise<0 | 1>,
        0
      ),
  };

  return handle;
}

const globalForRedis = globalThis as unknown as { __aideanRedis?: RedisHandle };

/**
 * 懒单例入口：二次调用返回同一 RedisLike 包装实例；
 * 无 REDIS_URL 恒返 null（调用方据此走直查分支）。
 */
export function getRedis(): RedisLike | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  if (!globalForRedis.__aideanRedis) {
    globalForRedis.__aideanRedis = createHandle(url);
  }
  return globalForRedis.__aideanRedis.port;
}
