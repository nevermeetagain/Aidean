/**
 * 通用 Redis 固定窗口限流（M-SSO P0.5）。
 *
 * 设计：
 * - INCR + 首次 EXPIRE（O(1)，无滑动窗口依赖）；
 * - Redis 不可用 → 放行（fail-open）：限流是纵深防御层，DB 侧登录锁定
 *   （failedLoginAttempts/lockedUntil）与业务校验兜底，不因缓存故障阻断主流程；
 * - 计数键格式由调用方拼装（如 rl:login:{ip}），本模块只管窗口语义。
 */
import { getRedis } from "./db/redis";

export interface RateLimitResult {
  /** true=放行；false=超限拒绝 */
  allowed: boolean;
  /** 窗口内当前计数（超限时为 limit+1 起） */
  count: number;
}

export async function checkFixedWindow(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const redis = getRedis();
  if (!redis) {
    return { allowed: true, count: 0 };
  }
  try {
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, windowSeconds);
    }
    return { allowed: count <= limit, count };
  } catch {
    // 限流器故障 fail-open（与读穿缓存降级同口径）
    return { allowed: true, count: 0 };
  }
}

/** 从标准代理头解析客户端 IP（nginx → x-real-ip / x-forwarded-for 首段） */
export function clientIpFrom(req: Request): string {
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || "unknown";
  return "unknown";
}
