/**
 * Aidean Snowflake ID Generator
 * 分布式ID生成器
 * 64位: 1位符号 + 41位时间戳 + 5位数据中心 + 5位机器ID + 12位序列号
 */

export class SnowflakeIdGenerator {
  private workerId: number;
  private datacenterId: number;
  private sequence: number = 0;
  private lastTimestamp: number = 0;

  // 初始时间戳 (2024-01-01 00:00:00 UTC)
  private static readonly EPOCH = 1704067200000;

  // 位移
  private static readonly WORKER_ID_BITS = 5;
  private static readonly DATACENTER_ID_BITS = 5;
  private static readonly SEQUENCE_BITS = 12;

  // 最大值
  private static readonly MAX_WORKER_ID = ~(-1 << SnowflakeIdGenerator.WORKER_ID_BITS);
  private static readonly MAX_DATACENTER_ID = ~(-1 << SnowflakeIdGenerator.DATACENTER_ID_BITS);

  // 掩码
  private static readonly SEQUENCE_MASK = ~(-1 << SnowflakeIdGenerator.SEQUENCE_BITS);

  constructor(workerId: number, datacenterId: number) {
    if (workerId > SnowflakeIdGenerator.MAX_WORKER_ID || workerId < 0) {
      throw new Error(`Worker ID must be between 0 and ${SnowflakeIdGenerator.MAX_WORKER_ID}`);
    }
    if (datacenterId > SnowflakeIdGenerator.MAX_DATACENTER_ID || datacenterId < 0) {
      throw new Error(`Datacenter ID must be between 0 and ${SnowflakeIdGenerator.MAX_DATACENTER_ID}`);
    }

    this.workerId = workerId;
    this.datacenterId = datacenterId;
  }

  /**
   * 生成下一个ID
   */
  nextId(): number {
    let timestamp = this.currentTimestamp();

    // 时钟回拨处理
    if (timestamp < this.lastTimestamp) {
      throw new Error(
        `Clock moved backwards. Refusing to generate ID for ${this.lastTimestamp - timestamp} milliseconds`
      );
    }

    // 同一毫秒内，序列号递增
    if (timestamp === this.lastTimestamp) {
      this.sequence = (this.sequence + 1) & SnowflakeIdGenerator.SEQUENCE_MASK;
      // 序列号溢出，等待下一毫秒
      if (this.sequence === 0) {
        timestamp = this.waitNextMillis(this.lastTimestamp);
      }
    } else {
      // 不同毫秒，序列号重置
      this.sequence = 0;
    }

    this.lastTimestamp = timestamp;

    // 组合ID
    return this.generateId(timestamp);
  }

  /**
   * 生成ID (BigInt)
   */
  nextIdBigInt(): bigint {
    return BigInt(this.nextId());
  }

  /**
   * 生成ID字符串
   */
  nextIdString(): string {
    return this.nextId().toString();
  }

  /**
   * 批量生成ID
   */
  nextIdBatch(count: number): number[] {
    const ids: number[] = [];
    for (let i = 0; i < count; i++) {
      ids.push(this.nextId());
    }
    return ids;
  }

  /**
   * 获取当前时间戳
   */
  private currentTimestamp(): number {
    return Date.now();
  }

  /**
   * 等待下一毫秒
   */
  private waitNextMillis(lastTimestamp: number): number {
    let timestamp = this.currentTimestamp();
    while (timestamp <= lastTimestamp) {
      timestamp = this.currentTimestamp();
    }
    return timestamp;
  }

  /**
   * 组合ID各部分
   */
  private generateId(timestamp: number): number {
    const timePart = (timestamp - SnowflakeIdGenerator.EPOCH) << 
      (SnowflakeIdGenerator.WORKER_ID_BITS + 
       SnowflakeIdGenerator.DATACENTER_ID_BITS + 
       SnowflakeIdGenerator.SEQUENCE_BITS);

    const datacenterPart = this.datacenterId << 
      (SnowflakeIdGenerator.WORKER_ID_BITS + SnowflakeIdGenerator.SEQUENCE_BITS);

    const workerPart = this.workerId << SnowflakeIdGenerator.SEQUENCE_BITS;

    const sequencePart = this.sequence;

    return timePart | datacenterPart | workerPart | sequencePart;
  }

  /**
   * 从ID解析时间戳
   */
  static getTimestamp(id: number): Date {
    const timestamp = ((id >> 
      (SnowflakeIdGenerator.WORKER_ID_BITS + 
       SnowflakeIdGenerator.DATACENTER_ID_BITS + 
       SnowflakeIdGenerator.SEQUENCE_BITS)) 
      + SnowflakeIdGenerator.EPOCH);
    return new Date(timestamp);
  }

  /**
   * 从ID解析工作节点ID
   */
  static getWorkerId(id: number): number {
    return (id >> (SnowflakeIdGenerator.WORKER_ID_BITS + SnowflakeIdGenerator.SEQUENCE_BITS)) & 
      SnowflakeIdGenerator.MAX_WORKER_ID;
  }

  /**
   * 从ID解析数据中心ID
   */
  static getDatacenterId(id: number): number {
    return (id >> SnowflakeIdGenerator.SEQUENCE_BITS) & 
      SnowflakeIdGenerator.MAX_DATACENTER_ID;
  }

  /**
   * 从ID解析序列号
   */
  static getSequence(id: number): number {
    return id & SnowflakeIdGenerator.SEQUENCE_MASK;
  }

  /**
   * 解析ID为对象
   */
  static parse(id: number): {
    timestamp: Date;
    workerId: number;
    datacenterId: number;
    sequence: number;
  } {
    return {
      timestamp: SnowflakeIdGenerator.getTimestamp(id),
      workerId: SnowflakeIdGenerator.getWorkerId(id),
      datacenterId: SnowflakeIdGenerator.getDatacenterId(id),
      sequence: SnowflakeIdGenerator.getSequence(id),
    };
  }
}

/**
 * 单例实例
 */
let globalGenerator: SnowflakeIdGenerator | null = null;

/**
 * 初始化全局ID生成器
 */
export function initSnowflake(workerId: number, datacenterId: number): SnowflakeIdGenerator {
  globalGenerator = new SnowflakeIdGenerator(workerId, datacenterId);
  return globalGenerator;
}

/**
 * 获取全局ID生成器
 */
export function getSnowflake(): SnowflakeIdGenerator {
  if (!globalGenerator) {
    throw new Error('Snowflake not initialized. Call initSnowflake() first.');
  }
  return globalGenerator;
}

/**
 * 生成ID的便捷函数
 */
export function generateId(): number {
  return getSnowflake().nextId();
}

/**
 * 生成ID字符串的便捷函数
 */
export function generateIdString(): string {
  return getSnowflake().nextIdString();
}

/**
 * 生成BigInt ID的便捷函数
 */
export function generateIdBigInt(): bigint {
  return getSnowflake().nextIdBigInt();
}

/**
 * 批量生成ID
 */
export function generateIdBatch(count: number): number[] {
  return getSnowflake().nextIdBatch(count);
}
