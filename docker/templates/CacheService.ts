/**
 * Aidean Cache Service
 * 封装Cache-Aside模式 + 延迟双删 + 分布式锁
 * 基于ioredis + Prisma实现
 */

import Redis from 'ioredis';
import { PrismaClient } from '@prisma/client';

export interface CacheOptions {
  ttl?: number;
  prefix?: string;
  enableLock?: boolean;
  lockTTL?: number;
}

export interface LockOptions {
  waitTimeout?: number;
  retryInterval?: number;
}

const DEFAULT_TTL = 3600;
const DEFAULT_LOCK_TTL = 30;

export class CacheService {
  private redis: Redis;
  private prisma: PrismaClient;
  private prefix: string;
  private enableLock: boolean;

  constructor(redis: Redis, prisma: PrismaClient, options: CacheOptions = {}) {
    this.redis = redis;
    this.prisma = prisma;
    this.prefix = options.prefix || 'aidean';
    this.enableLock = options.enableLock ?? true;
  }

  private getKey(module: string, id: string): string {
    return `${this.prefix}:${module}:${id}`;
  }

  async getOrSet<T>(
    module: string,
    id: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const key = this.getKey(module, id);
    const ttl = options.ttl || DEFAULT_TTL;

    const cached = await this.redis.get(key);
    if (cached) {
      return JSON.parse(cached) as T;
    }

    if (this.enableLock && options.enableLock !== false) {
      const lockKey = `lock:${key}`;
      const lockValue = Date.now().toString();
      
      const acquired = await this.redis.set(lockKey, lockValue, 'EX', options.lockTTL || DEFAULT_LOCK_TTL, 'NX');
      
      if (acquired !== 'OK') {
        await new Promise(resolve => setTimeout(resolve, 100));
        return this.getOrSet(module, id, fetcher, options);
      }

      try {
        const cachedAgain = await this.redis.get(key);
        if (cachedAgain) {
          return JSON.parse(cachedAgain) as T;
        }

        const data = await fetcher();
        if (data) {
          await this.redis.setex(key, ttl, JSON.stringify(data));
        }
        return data;
      } finally {
        await this.redis.del(lockKey);
      }
    } else {
      const data = await fetcher();
      if (data) {
        await this.redis.setex(key, ttl, JSON.stringify(data));
      }
      return data;
    }
  }

  async writeAndInvalidate<T>(
    module: string,
    id: string,
    writer: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const key = this.getKey(module, id);
    await this.redis.del(key);
    const result = await writer();
    const delay = options.ttl ? Math.min(options.ttl * 1000, 500) : 500;
    setTimeout(async () => {
      await this.redis.del(key);
    }, delay);
    return result;
  }

  async invalidate(module: string, id: string): Promise<void> {
    const key = this.getKey(module, id);
    await this.redis.del(key);
  }

  async invalidatePattern(pattern: string): Promise<void> {
    const keys = await this.redis.keys(`${this.prefix}:${pattern}`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  async acquireLock(resource: string, options: LockOptions = {}): Promise<string | null> {
    const lockKey = `lock:${this.prefix}:${resource}`;
    const lockValue = Date.now().toString();
    const waitTimeout = (options.waitTimeout || 5) * 1000;
    const retryInterval = options.retryInterval || 100;
    const startTime = Date.now();
    
    while (Date.now() - startTime < waitTimeout) {
      const acquired = await this.redis.set(lockKey, lockValue, 'EX', DEFAULT_LOCK_TTL, 'NX');
      if (acquired === 'OK') {
        return lockValue;
      }
      await new Promise(resolve => setTimeout(resolve, retryInterval));
    }
    return null;
  }

  async releaseLock(resource: string, lockValue: string): Promise<void> {
    const lockKey = `lock:${this.prefix}:${resource}`;
    const currentValue = await this.redis.get(lockKey);
    if (currentValue === lockValue) {
      await this.redis.del(lockKey);
    }
  }

  async incrementCounter(key: string, ttl: number = 2592000): Promise<number> {
    const fullKey = `${this.prefix}:counter:${key}`;
    const result = await this.redis.incr(fullKey);
    if (result === 1) {
      await this.redis.expire(fullKey, ttl);
    }
    return result;
  }

  async bloomCheck(key: string): Promise<boolean> {
    const bloomKey = `bloom:${this.prefix}`;
    const exists = await this.redis.getbit(bloomKey, this.hash(key));
    return exists === 1;
  }

  async bloomAdd(key: string): Promise<void> {
    const bloomKey = `bloom:${this.prefix}`;
    await this.redis.setbit(bloomKey, this.hash(key), 1);
  }

  private hash(key: string): number {
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash) % 1000000;
  }

  async warmUp(
    module: string,
    ids: string[],
    fetcher: (ids: string[]) => Promise<Map<string, any>>,
    options: CacheOptions = {}
  ): Promise<void> {
    const data = await fetcher(ids);
    const ttl = options.ttl || DEFAULT_TTL;
    const pipeline = this.redis.pipeline();
    for (const [id, value] of data) {
      const key = this.getKey(module, id);
      pipeline.setex(key, ttl, JSON.stringify(value));
    }
    await pipeline.exec();
  }
}
