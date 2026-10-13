/**
 * Rate Limiting Middleware
 * 基于Redis的滑动窗口限流
 * 参考: https://stripe.com/docs/rate-limits
 */

import { NextRequest, NextResponse } from 'next/server';
import redis from '@/lib/redis';
import { RateLimitError } from '@/lib/api/errors';

// ============================================
// 限流配置
// ============================================

interface RateLimitConfig {
  windowMs: number;      // 时间窗口(毫秒)
  maxRequests: number;   // 窗口内最大请求数
  keyPrefix: string;     // Redis Key前缀
}

// 默认限流配置
const defaultConfig: RateLimitConfig = {
  windowMs: 60 * 1000,  // 1分钟
  maxRequests: 100,      // 100请求/分钟
  keyPrefix: 'aidean:ratelimit',
};

// 特定端点限流配置
const endpointConfigs: Record<string, RateLimitConfig> = {
  // 认证端点 - 更严格
  'POST:/api/v1/auth/login': {
    windowMs: 15 * 60 * 1000,  // 15分钟
    maxRequests: 5,            // 5次/15分钟
    keyPrefix: 'aidean:ratelimit:login',
  },
  'POST:/api/v1/auth/register': {
    windowMs: 60 * 60 * 1000,  // 1小时
    maxRequests: 3,            // 3次/小时
    keyPrefix: 'aidean:ratelimit:register',
  },
  // 财务端点
  'POST:/api/v1/finance/recharge': {
    windowMs: 24 * 60 * 60 * 1000,  // 24小时
    maxRequests: 10,               // 10次/天
    keyPrefix: 'aidean:ratelimit:recharge',
  },
};

// ============================================
// 限流Key生成
// ============================================

function generateRateLimitKey(
  request: NextRequest,
  config: RateLimitConfig,
  identifier?: string
): string {
  const ip = request.ip || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  // 如果有用户标识，优先使用用户ID
  const keySuffix = identifier || `${ip}:${userAgent.slice(0, 20)}`;
  
  return `${config.keyPrefix}:${keySuffix}`;
}

// ============================================
// 滑动窗口限流算法
// ============================================

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  totalLimit: number;
  retryAfter?: number;
}

export async function checkRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = now - config.windowMs;
  
  try {
    // 使用Redis Sorted Set实现滑动窗口
    // Redis已作为单例导出，直接使用
    
    // 移除窗口外的旧记录
    await redis.zremrangebyscore(key, 0, windowStart);
    
    // 获取当前窗口内的请求数
    const currentRequests = await redis.zcard(key);
    
    // 检查是否超过限制
    if (currentRequests >= config.maxRequests) {
      // 获取最早的请求时间，计算重置时间
      const oldestRequest = await (redis as any).getClient().zrange(key, 0, 0, 'WITHSCORES');
      const oldestTime = Array.isArray(oldestRequest) && oldestRequest.length > 1 
        ? parseInt(oldestRequest[1]) 
        : windowStart;
      const resetTime = oldestTime + config.windowMs;
      const retryAfter = Math.ceil((resetTime - now) / 1000);
      
      return {
        allowed: false,
        remaining: 0,
        resetTime,
        totalLimit: config.maxRequests,
        retryAfter,
      };
    }
    
    // 记录本次请求
    await redis.zadd(key, now, `${now}-${Math.random()}`);
    // 设置Key过期时间
    await redis.pexpire(key, config.windowMs);
    
    return {
      allowed: true,
      remaining: config.maxRequests - currentRequests - 1,
      resetTime: now + config.windowMs,
      totalLimit: config.maxRequests,
    };
  } catch (error) {
    // Redis失败时，允许请求通过（降级策略）
    console.error('Rate limit check failed:', error);
    return {
      allowed: true,
      remaining: 1,
      resetTime: now + config.windowMs,
      totalLimit: config.maxRequests,
    };
  }
}

// ============================================
// 中间件函数
// ============================================

export async function rateLimitMiddleware(
  request: NextRequest,
  userId?: string
): Promise<{ allowed: true } | { allowed: false; response: NextResponse }> {
  // 获取请求方法和路径
  const method = request.method;
  const pathname = new URL(request.url).pathname;
  
  // 查找特定端点配置
  const endpointKey = `${method}:${pathname}`;
  const config = endpointConfigs[endpointKey] || defaultConfig;
  
  // 生成限流Key
  const key = generateRateLimitKey(request, config, userId);
  
  // 检查限流
  const result = await checkRateLimit(key, config);
  
  if (!result.allowed) {
    const error = new RateLimitError(result.retryAfter || 60);
    
    return {
      allowed: false,
      response: NextResponse.json(
        { success: false, error: error.toJSON().error },
        {
          status: 429,
          headers: {
            'Retry-After': String(result.retryAfter || 60),
            'X-RateLimit-Limit': String(result.totalLimit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(result.resetTime / 1000)),
          },
        }
      ),
    };
  }
  
  // 在响应头中添加限流信息
  return { allowed: true };
}

// ============================================
// 获取限流状态
// ============================================

export async function getRateLimitStatus(
  request: NextRequest,
  userId?: string
): Promise<RateLimitResult> {
  const method = request.method;
  const pathname = new URL(request.url).pathname;
  
  const endpointKey = `${method}:${pathname}`;
  const config = endpointConfigs[endpointKey] || defaultConfig;
  const key = generateRateLimitKey(request, config, userId);
  
  return checkRateLimit(key, config);
}

// ============================================
// 导出
// ============================================

export default {
  checkRateLimit,
  rateLimitMiddleware,
  getRateLimitStatus,
};
