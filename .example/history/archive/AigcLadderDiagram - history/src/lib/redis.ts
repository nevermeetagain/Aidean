/**
 * Aidean Redis Client
 * Redis缓存层实现 - 基于ioredis
 * 
 * 功能：
 * 1. 连接管理（单例模式）
 * 2. 缓存操作封装（get/set/del/exists/expire）
 * 3. 分布式锁实现
 * 4. 计数器实现
 * 5. 布隆过滤器支持
 * 6. 缓存Key规范管理
 */

import Redis from 'ioredis';
import { createHash, randomBytes } from 'crypto';

// ============================================
// 类型定义
// ============================================

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  maxRetriesPerRequest?: number;
  enableReadyCheck?: boolean;
  lazyConnect?: boolean;
}

export interface CacheOptions {
  ttl?: number; // 秒
  nx?: boolean; // 仅当key不存在时设置
  xx?: boolean; // 仅当key存在时设置
}

export interface LockOptions {
  ttl?: number; // 锁过期时间（秒），默认30
  waitTimeout?: number; // 等待超时（秒），默认5
  retryInterval?: number; // 重试间隔（毫秒），默认100
}

export interface CounterOptions {
  ttl?: number; // 计数器过期时间（秒）
}

// ============================================
// Redis Key 命名规范
// ============================================

export const RedisKeys = {
  // 用户域
  user: {
    profile: (userId: string | number) => `aidean:user:profile:${userId}`,
    session: (token: string) => `aidean:user:session:${token}`,
    refreshToken: (userId: string | number) => `aidean:user:refresh:${userId}`,
    apiKey: (apiKey: string) => `aidean:user:apikey:${apiKey}`,
    loginAttempts: (email: string) => `aidean:user:login_attempts:${email}`,
  },
  
  // 模型域
  model: {
    detail: (modelId: string | number) => `aidean:model:detail:${modelId}`,
    slug: (slug: string) => `aidean:model:slug:${slug}`,
    list: (filterHash: string) => `aidean:model:list:${filterHash}`,
    providers: () => 'aidean:provider:list',
  },
  
  // 天梯图域
  ladder: {
    list: (type: string, page: number) => `aidean:ladder:list:${type}:${page}`,
    top100: (type: string) => `aidean:ladder:top100:${type}`,
    ranking: (chartId: string | number, date: string) => `aidean:ladder:ranking:${chartId}:${date}`,
  },
  
  // 测评域
  evaluation: {
    history: (userId: string | number) => `aidean:evaluation:history:${userId}`,
    detail: (evalId: string | number) => `aidean:evaluation:detail:${evalId}`,
    queue: () => 'aidean:evaluation:queue',
  },
  
  // 收藏域
  favorite: {
    list: (userId: string | number, type: string) => `aidean:favorite:list:${userId}:${type}`,
  },
  
  // 财务域
  transaction: {
    count: (userId: string | number, date: string) => `aidean:transaction:count:${userId}:${date}`,
    balance: (userId: string | number) => `aidean:transaction:balance:${userId}`,
  },
  
  // 系统域
  system: {
    features: () => 'aidean:feature:all',
    dict: (category: string) => `aidean:dict:${category}`,
    rateLimit: (identifier: string) => `aidean:rate_limit:${identifier}`,
  },
  
  // 分布式锁
  lock: {
    cacheRefresh: (table: string, id: string | number) => `aidean:lock:cache_refresh:${table}:${id}`,
    evaluation: (evalId: string | number) => `aidean:lock:evaluation:${evalId}`,
    ranking: (ladderType: string) => `aidean:lock:ranking:recalculate:${ladderType}`,
  },
  
  // 计数器
  counter: {
    login: (userId: string | number, date: string) => `aidean:counter:login:${userId}:${date}`,
    modelView: (modelId: string | number, date: string) => `aidean:counter:model:view:${modelId}:${date}`,
    apiRequest: (userId: string | number, date: string) => `aidean:counter:api:${userId}:${date}`,
  },
  
  // 布隆过滤器
  bloom: {
    modelIds: () => 'aidean:bloom:model:ids',
    userIds: () => 'aidean:bloom:user:ids',
  },
} as const;

// ============================================
// TTL 配置（秒）
// ============================================

export const RedisTTL = {
  // 用户域
  USER_PROFILE: 1800, // 30分钟
  USER_SESSION: 7200, // 2小时
  REFRESH_TOKEN: 604800, // 7天
  API_KEY: 0, // 永久，需手动失效
  LOGIN_ATTEMPTS: 3600, // 1小时
  
  // 模型域
  MODEL_DETAIL: 3600, // 1小时
  MODEL_LIST: 3600, // 1小时
  PROVIDERS: 86400, // 24小时
  
  // 天梯图域
  LADDER_LIST: 300, // 5分钟
  LADDER_TOP100: 60, // 1分钟
  RANKING: 3600, // 1小时
  
  // 测评域
  EVAL_HISTORY: 1800, // 30分钟
  EVAL_DETAIL: 3600, // 1小时
  
  // 收藏域
  FAVORITES: 3600, // 1小时
  
  // 财务域
  TRANSACTION_COUNT: 2592000, // 30天
  BALANCE: 300, // 5分钟
  
  // 系统域
  FEATURES: 0, // 永久
  DICT: 0, // 永久
  RATE_LIMIT: 60, // 1分钟
  
  // 锁
  LOCK_DEFAULT: 30, // 30秒
  LOCK_EVALUATION: 300, // 5分钟
  LOCK_RANKING: 600, // 10分钟
  
  // 计数器
  COUNTER: 2592000, // 30天
} as const;

// ============================================
// Redis Client 单例类
// ============================================

class RedisClient {
  private static instance: RedisClient;
  private client: Redis;
  private isConnected: boolean = false;

  private constructor() {
    const config: RedisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB || '0'),
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
    };

    this.client = new Redis(config);
    
    this.client.on('connect', () => {
      console.log('[Redis] Connected successfully');
      this.isConnected = true;
    });

    this.client.on('error', (err) => {
      console.error('[Redis] Error:', err.message);
      this.isConnected = false;
    });

    this.client.on('close', () => {
      console.log('[Redis] Connection closed');
      this.isConnected = false;
    });
  }

  public static getInstance(): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient();
    }
    return RedisClient.instance;
  }

  public async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.client.connect();
    }
  }

  public async disconnect(): Promise<void> {
    await this.client.quit();
    this.isConnected = false;
  }

  public getClient(): Redis {
    return this.client;
  }

  public isReady(): boolean {
    return this.isConnected && this.client.status === 'ready';
  }

  // ============================================
  // 基础缓存操作
  // ============================================

  /**
   * 获取缓存值
   */
  public async get<T>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  }

  /**
   * 设置缓存值
   */
  public async set(key: string, value: unknown, options?: CacheOptions): Promise<void> {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    
    if (options?.ttl) {
      await this.client.set(key, serialized, 'EX', options.ttl);
    } else if (options?.nx) {
      await this.client.set(key, serialized, 'NX');
    } else if (options?.xx) {
      await this.client.set(key, serialized, 'XX');
    } else {
      await this.client.set(key, serialized);
    }
  }

  /**
   * 删除缓存
   */
  public async del(...keys: string[]): Promise<number> {
    return await this.client.del(...keys);
  }

  /**
   * 检查key是否存在
   */
  public async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  /**
   * 设置过期时间
   */
  public async expire(key: string, seconds: number): Promise<boolean> {
    const result = await this.client.expire(key, seconds);
    return result === 1;
  }

  /**
   * 获取剩余过期时间
   */
  public async ttl(key: string): Promise<number> {
    return await this.client.ttl(key);
  }

  // ============================================
  // Hash操作
  // ============================================

  /**
   * 设置Hash字段
   */
  public async hset(key: string, field: string, value: unknown): Promise<number>;
  public async hset(key: string, data: Record<string, unknown>): Promise<number>;
  public async hset(
    key: string,
    fieldOrData: string | Record<string, unknown>,
    value?: unknown
  ): Promise<number> {
    if (typeof fieldOrData === 'string' && value !== undefined) {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      return await this.client.hset(key, fieldOrData, serialized);
    } else if (typeof fieldOrData === 'object') {
      const serializedData: Record<string, string> = {};
      for (const [k, v] of Object.entries(fieldOrData)) {
        serializedData[k] = typeof v === 'string' ? v : JSON.stringify(v);
      }
      return await this.client.hset(key, serializedData);
    }
    return 0;
  }

  /**
   * 获取Hash字段
   */
  public async hget<T>(key: string, field: string): Promise<T | null> {
    const value = await this.client.hget(key, field);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  }

  /**
   * 获取所有Hash字段
   */
  public async hgetall<T extends Record<string, unknown>>(key: string): Promise<T | null> {
    const data = await this.client.hgetall(key);
    if (Object.keys(data).length === 0) return null;
    
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) {
      try {
        result[k] = JSON.parse(v);
      } catch {
        result[k] = v;
      }
    }
    return result as T;
  }

  /**
   * 删除Hash字段
   */
  public async hdel(key: string, ...fields: string[]): Promise<number> {
    return await this.client.hdel(key, ...fields);
  }

  // ============================================
  // 列表操作
  // ============================================

  /**
   * 从列表左侧添加元素
   */
  public async lpush(key: string, ...values: unknown[]): Promise<number> {
    const serialized = values.map(v => typeof v === 'string' ? v : JSON.stringify(v));
    return await this.client.lpush(key, ...serialized);
  }

  /**
   * 从列表右侧添加元素
   */
  public async rpush(key: string, ...values: unknown[]): Promise<number> {
    const serialized = values.map(v => typeof v === 'string' ? v : JSON.stringify(v));
    return await this.client.rpush(key, ...serialized);
  }

  /**
   * 从列表左侧弹出元素
   */
  public async lpop<T>(key: string): Promise<T | null> {
    const value = await this.client.lpop(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  }

  /**
   * 获取列表范围
   */
  public async lrange<T>(key: string, start: number, stop: number): Promise<T[]> {
    const values = await this.client.lrange(key, start, stop);
    return values.map(v => {
      try {
        return JSON.parse(v);
      } catch {
        return v;
      }
    }) as T[];
  }

  // ============================================
  // 集合操作
  // ============================================

  /**
   * 添加集合成员
   */
  public async sadd(key: string, ...members: unknown[]): Promise<number> {
    const serialized = members.map(m => typeof m === 'string' ? m : JSON.stringify(m));
    return await this.client.sadd(key, ...serialized);
  }

  /**
   * 获取集合所有成员
   */
  public async smembers<T>(key: string): Promise<T[]> {
    const members = await this.client.smembers(key);
    return members.map(m => {
      try {
        return JSON.parse(m);
      } catch {
        return m;
      }
    }) as T[];
  }

  /**
   * 判断是否为集合成员
   */
  public async sismember(key: string, member: unknown): Promise<boolean> {
    const serialized = typeof member === 'string' ? member : JSON.stringify(member);
    const result = await this.client.sismember(key, serialized);
    return result === 1;
  }

  // ============================================
  // 有序集合操作
  // ============================================

  /**
   * 添加有序集合成员
   */
  public async zadd(key: string, score: number, member: unknown): Promise<number> {
    const serialized = typeof member === 'string' ? member : JSON.stringify(member);
    return await this.client.zadd(key, score, serialized);
  }

  /**
   * 获取有序集合范围（按分数从低到高）
   */
  public async zrange<T>(key: string, start: number, stop: number): Promise<T[]> {
    const members = await this.client.zrange(key, start, stop);
    return members.map(m => {
      try {
        return JSON.parse(m);
      } catch {
        return m;
      }
    }) as T[];
  }

  /**
   * 获取有序集合范围（按分数从高到低）
   */
  public async zrevrange<T>(key: string, start: number, stop: number): Promise<T[]> {
    const members = await this.client.zrevrange(key, start, stop);
    return members.map(m => {
      try {
        return JSON.parse(m);
      } catch {
        return m;
      }
    }) as T[];
  }

  /**
   * 获取成员排名（从高到低）
   */
  public async zrevrank(key: string, member: unknown): Promise<number | null> {
    const serialized = typeof member === 'string' ? member : JSON.stringify(member);
    const rank = await this.client.zrevrank(key, serialized);
    return rank !== null ? rank + 1 : null; // 转换为1-based排名
  }

  // ============================================
  // 分布式锁实现
  // ============================================

  /**
   * 获取分布式锁
   */
  public async acquireLock(lockKey: string, options?: LockOptions): Promise<boolean> {
    const ttl = options?.ttl || RedisTTL.LOCK_DEFAULT;
    const token = this.generateLockToken();
    
    // 使用 NX 选项确保只有不存在时才设置
    const result = await this.client.set(lockKey, token, 'EX', ttl, 'NX');
    
    if (result === 'OK') {
      return true;
    }

    // 如果获取失败且设置了等待超时，则重试
    if (options?.waitTimeout && options.waitTimeout > 0) {
      const retryInterval = options.retryInterval || 100;
      const maxRetries = (options.waitTimeout * 1000) / retryInterval;
      
      for (let i = 0; i < maxRetries; i++) {
        await this.sleep(retryInterval);
        const retryResult = await this.client.set(lockKey, token, 'EX', ttl, 'NX');
        if (retryResult === 'OK') {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * 释放分布式锁
   */
  public async releaseLock(lockKey: string): Promise<boolean> {
    const result = await this.client.del(lockKey);
    return result === 1;
  }

  /**
   * 执行带锁的操作
   */
  public async withLock<T>(
    lockKey: string,
    operation: () => Promise<T>,
    options?: LockOptions
  ): Promise<T | null> {
    const acquired = await this.acquireLock(lockKey, options);
    if (!acquired) {
      throw new Error(`Failed to acquire lock: ${lockKey}`);
    }

    try {
      return await operation();
    } finally {
      await this.releaseLock(lockKey);
    }
  }

  // ============================================
  // 计数器实现
  // ============================================

  /**
   * 递增计数器
   */
  public async incr(key: string, ttl?: number): Promise<number> {
    const result = await this.client.incr(key);
    if (ttl && result === 1) {
      await this.client.expire(key, ttl);
    }
    return result;
  }

  /**
   * 递减计数器
   */
  public async decr(key: string, ttl?: number): Promise<number> {
    const result = await this.client.decr(key);
    if (ttl && result === -1) {
      await this.client.expire(key, ttl);
    }
    return result;
  }

  /**
   * 增加指定值
   */
  public async incrby(key: string, increment: number, ttl?: number): Promise<number> {
    const result = await this.client.incrby(key, increment);
    if (ttl) {
      await this.client.expire(key, ttl);
    }
    return result;
  }

  // ============================================
  // 布隆过滤器（使用RedisBloom模块或模拟实现）
  // ============================================

  /**
   * 添加元素到布隆过滤器
   * 注意：需要RedisBloom模块支持
   */
  public async bfAdd(key: string, item: string): Promise<boolean> {
    try {
      // 尝试使用RedisBloom命令
      const result = await this.client.call('BF.ADD', key, item);
      return result === 1;
    } catch {
      // 如果不支持RedisBloom，使用Set作为降级方案
      const added = await this.client.sadd(key, item);
      return added === 1;
    }
  }

  /**
   * 检查元素是否可能在布隆过滤器中
   */
  public async bfExists(key: string, item: string): Promise<boolean> {
    try {
      const result = await this.client.call('BF.EXISTS', key, item);
      return result === 1;
    } catch {
      // 降级到Set检查
      const result = await this.client.sismember(key, item);
      return result === 1;
    }
  }

  // ============================================
  // 限流实现
  // ============================================

  /**
   * 滑动窗口限流检查
   */
  public async rateLimit(
    key: string,
    limit: number,
    windowSeconds: number
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;
    
    // 移除窗口外的请求记录
    await this.client.zremrangebyscore(key, 0, windowStart);
    
    // 获取当前窗口内的请求数
    const currentCount = await this.client.zcard(key);
    
    if (currentCount >= limit) {
      // 获取最早记录的过期时间
      const oldest = await this.client.zrange(key, 0, 0, 'WITHSCORES');
      const resetTime = oldest.length > 1 ? Math.ceil(parseInt(oldest[1]) / 1000) + windowSeconds : now / 1000 + windowSeconds;
      
      return {
        allowed: false,
        remaining: 0,
        resetTime: Math.ceil(resetTime),
      };
    }
    
    // 添加当前请求记录
    await this.client.zadd(key, now, `${now}-${randomBytes(4).toString('hex')}`);
    await this.client.expire(key, windowSeconds);
    
    return {
      allowed: true,
      remaining: limit - currentCount - 1,
      resetTime: Math.ceil(now / 1000) + windowSeconds,
    };
  }

  // ============================================
  // 管道操作（批量）
  // ============================================

  /**
   * 执行管道操作
   */
  public pipeline(): ReturnType<Redis['pipeline']> {
    return this.client.pipeline();
  }

  /**
   * 事务操作
   */
  public multi(): ReturnType<Redis['multi']> {
    return this.client.multi();
  }

  // ============================================
  // 缓存模式封装
  // ============================================

  /**
   * Cache-Aside模式：先读缓存，未命中则读数据库并写入缓存
   */
  public async cacheAside<T>(
    key: string,
    fetchFromDB: () => Promise<T | null>,
    ttl?: number
  ): Promise<T | null> {
    // 1. 尝试从缓存获取
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // 2. 缓存未命中，从数据库获取
    const data = await fetchFromDB();
    if (data !== null) {
      // 3. 写入缓存
      await this.set(key, data, { ttl });
    }

    return data;
  }

  /**
   * Read-Through模式：直接返回缓存，后台异步更新
   */
  public async readThrough<T>(
    key: string,
    fetchFromDB: () => Promise<T>,
    ttl?: number,
    staleThreshold?: number
  ): Promise<T | null> {
    const cached = await this.get<T>(key);
    const ttlRemaining = await this.ttl(key);

    // 如果缓存存在且未过期（或未达到陈旧阈值）
    if (cached !== null && (ttlRemaining > (staleThreshold || 0))) {
      return cached;
    }

    // 如果缓存存在但即将过期，先返回缓存值，后台更新
    if (cached !== null && ttlRemaining <= (staleThreshold || 0)) {
      // 异步更新缓存，不阻塞返回
      fetchFromDB().then(data => {
        if (data !== null) {
          this.set(key, data, { ttl });
        }
      }).catch(console.error);
      return cached;
    }

    // 缓存不存在，同步获取并写入
    const data = await fetchFromDB();
    if (data !== null) {
      await this.set(key, data, { ttl });
    }
    return data;
  }

  /**
   * Write-Through模式：写数据库同时写缓存
   */
  public async writeThrough<T>(
    key: string,
    data: T,
    writeToDB: (data: T) => Promise<void>,
    ttl?: number
  ): Promise<void> {
    // 1. 先写数据库
    await writeToDB(data);
    // 2. 再写缓存
    await this.set(key, data, { ttl });
  }

  /**
   * Write-Behind模式：先写缓存，异步写数据库
   */
  public async writeBehind<T>(
    key: string,
    data: T,
    writeToDB: (data: T) => Promise<void>,
    ttl?: number
  ): Promise<void> {
    // 1. 先写缓存
    await this.set(key, data, { ttl });
    // 2. 异步写数据库
    writeToDB(data).catch(console.error);
  }

  // ============================================
  // 辅助方法
  // ============================================

  private generateLockToken(): string {
    return createHash('sha256')
      .update(`${Date.now()}-${randomBytes(16).toString('hex')}`)
      .digest('hex');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 清空所有缓存（谨慎使用）
   */
  public async flushAll(): Promise<void> {
    await this.client.flushall();
  }

  /**
   * 清空当前数据库（谨慎使用）
   */
  public async flushDb(): Promise<void> {
    await this.client.flushdb();
  }

  /**
   * 获取匹配模式的key列表
   */
  public async keys(pattern: string): Promise<string[]> {
    return await this.client.keys(pattern);
  }

  /**
   * 扫描key（推荐用于生产环境）
   */
  public async scan(pattern: string, count?: number): Promise<string[]> {
    const result: string[] = [];
    let cursor = '0';
    
    do {
      const scanResult = await this.client.scan(cursor, 'MATCH', pattern, 'COUNT', count || 100);
      cursor = scanResult[0];
      result.push(...scanResult[1]);
    } while (cursor !== '0');
    
    return result;
  }

  // ============================================
  // Sorted Set 操作（用于限流）
  // ============================================

  /**
   * 移除Sorted Set中指定分数范围的成员
   */
  public async zremrangebyscore(key: string, min: number | string, max: number | string): Promise<number> {
    return await this.client.zremrangebyscore(key, min, max);
  }

  /**
   * 获取Sorted Set的成员数
   */
  public async zcard(key: string): Promise<number> {
    return await this.client.zcard(key);
  }

  /**
   * 设置key的过期时间（毫秒）
   */
  public async pexpire(key: string, milliseconds: number): Promise<number> {
    return await this.client.pexpire(key, milliseconds);
  }
}

// ============================================
// 导出单例实例
// ============================================

export const redis = RedisClient.getInstance();

// 默认导出
export default redis;
