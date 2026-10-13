/**
 * Aidean Sharding Strategy
 * 分片路由策略 - 为未来扩展预留
 */

export type ShardKey = string | number;

export interface ShardInfo {
  shardId: number;
  shardKey: ShardKey;
  nodes: {
    postgres: string;
    redis: string;
  };
}

export interface ShardingConfig {
  totalShards: number;
  shards: ShardInfo[];
}

/**
 * 分片策略基类
 */
export abstract class ShardingStrategy {
  protected config: ShardingConfig;

  constructor(config: ShardingConfig) {
    this.config = config;
  }

  /**
   * 根据分片键计算分片ID
   */
  abstract getShardId(key: ShardKey): number;

  /**
   * 获取分片信息
   */
  getShard(key: ShardKey): ShardInfo {
    const shardId = this.getShardId(key);
    return this.config.shards[shardId];
  }

  /**
   * 获取PostgreSQL连接字符串
   */
  getPostgresConnection(key: ShardKey): string {
    const shard = this.getShard(key);
    return shard.nodes.postgres;
  }

  /**
   * 获取Redis连接字符串
   */
  getRedisConnection(key: ShardKey): string {
    const shard = this.getShard(key);
    return shard.nodes.redis;
  }
}

/**
 * 哈希分片策略
 * 使用一致性哈希环
 */
export class HashShardingStrategy extends ShardingStrategy {
  private virtualNodes: number = 150;
  private hashRing: Map<number, number> = new Map();
  private sortedKeys: number[] = [];

  constructor(config: ShardingConfig) {
    super(config);
    this.buildHashRing();
  }

  private buildHashRing(): void {
    for (let shardId = 0; shardId < this.config.totalShards; shardId++) {
      for (let v = 0; v < this.virtualNodes; v++) {
        const key = this.hash(`${shardId}:${v}`);
        this.hashRing.set(key, shardId);
        this.sortedKeys.push(key);
      }
    }
    this.sortedKeys.sort((a, b) => a - b);
  }

  getShardId(key: ShardKey): number {
    const hash = this.hash(String(key));
    
    // 找到第一个大于等于hash的虚拟节点
    let low = 0;
    let high = this.sortedKeys.length - 1;
    
    if (hash > this.sortedKeys[high]) {
      return this.hashRing.get(this.sortedKeys[0])!;
    }
    
    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      if (this.sortedKeys[mid] < hash) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }
    
    return this.hashRing.get(this.sortedKeys[low])!;
  }

  private hash(key: string): number {
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}

/**
 * 范围分片策略
 * 按ID范围划分
 */
export class RangeShardingStrategy extends ShardingStrategy {
  private ranges: Array<{ min: number; max: number; shardId: number }> = [];

  constructor(config: ShardingConfig) {
    super(config);
    this.initRanges();
  }

  private initRanges(): void {
    const shardSize = Math.floor(Number.MAX_SAFE_INTEGER / this.config.totalShards);
    for (let i = 0; i < this.config.totalShards; i++) {
      this.ranges.push({
        min: i * shardSize,
        max: (i + 1) * shardSize - 1,
        shardId: i,
      });
    }
  }

  getShardId(key: ShardKey): number {
    const numKey = typeof key === 'number' ? key : parseInt(String(key), 10);
    
    for (const range of this.ranges) {
      if (numKey >= range.min && numKey <= range.max) {
        return range.shardId;
      }
    }
    
    // 超出范围的使用最后一个分片
    return this.config.totalShards - 1;
  }
}

/**
 * 模运算分片策略
 * 简单的hash % n
 */
export class ModShardingStrategy extends ShardingStrategy {
  getShardId(key: ShardKey): number {
    const strKey = String(key);
    let hash = 0;
    for (let i = 0; i < strKey.length; i++) {
      const char = strKey.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash) % this.config.totalShards;
  }
}

/**
 * 租户分片策略
 * 按tenant_id分片
 */
export class TenantShardingStrategy extends ShardingStrategy {
  getShardId(key: ShardKey): number {
    const tenantId = typeof key === 'number' ? key : parseInt(String(key), 10);
    return tenantId % this.config.totalShards;
  }
}

/**
 * 复合分片策略
 * 支持多字段组合分片
 */
export class CompositeShardingStrategy extends ShardingStrategy {
  private fields: Array<{ name: string; weight: number }>;

  constructor(config: ShardingConfig, fields: Array<{ name: string; weight: number }>) {
    super(config);
    this.fields = fields;
  }

  getShardId(key: ShardKey): number {
    const keyObj = typeof key === 'object' ? key as Record<string, any> : { id: key };
    
    let hash = 0;
    for (const field of this.fields) {
      const value = keyObj[field.name] || 0;
      hash += Number(value) * field.weight;
    }
    
    return Math.abs(hash) % this.config.totalShards;
  }
}

/**
 * 分片路由管理器
 */
export class ShardRouter {
  private strategy: ShardingStrategy;
  private shards: Map<number, {
    postgres: any; // PrismaClient
    redis: any;    // Redis client
  }> = new Map();

  constructor(strategy: ShardingStrategy) {
    this.strategy = strategy;
  }

  /**
   * 注册分片节点
   */
  registerShard(shardId: number, postgres: any, redis: any): void {
    this.shards.set(shardId, { postgres, redis });
  }

  /**
   * 获取指定键的PostgreSQL客户端
   */
  getPostgres(key: ShardKey): any {
    const shardId = this.strategy.getShardId(key);
    const shard = this.shards.get(shardId);
    if (!shard) {
      throw new Error(`Shard ${shardId} not found`);
    }
    return shard.postgres;
  }

  /**
   * 获取指定键的Redis客户端
   */
  getRedis(key: ShardKey): any {
    const shardId = this.strategy.getShardId(key);
    const shard = this.shards.get(shardId);
    if (!shard) {
      throw new Error(`Shard ${shardId} not found`);
    }
    return shard.redis;
  }

  /**
   * 获取所有分片
   */
  getAllShards(): Map<number, { postgres: any; redis: any }> {
    return this.shards;
  }
}

/**
 * 默认分片配置
 */
export const DEFAULT_SHARDING_CONFIG: ShardingConfig = {
  totalShards: 16,
  shards: Array.from({ length: 16 }, (_, i) => ({
    shardId: i,
    shardKey: i,
    nodes: {
      postgres: `postgres://root:password@shard${i}:5432/aidean`,
      redis: `redis://shard${i}:6379`,
    },
  })),
};

/**
 * 创建默认分片路由器
 */
export function createDefaultShardRouter(): ShardRouter {
  const strategy = new ModShardingStrategy(DEFAULT_SHARDING_CONFIG);
  return new ShardRouter(strategy);
}
