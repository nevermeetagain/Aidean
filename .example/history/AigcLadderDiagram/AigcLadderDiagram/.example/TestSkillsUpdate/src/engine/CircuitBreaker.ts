/**
 * Skill 同步脚本 - 断路器 v2.0
 * 参考：Skills同步方案_优化版_v2.md 场景M2
 * 
 * 解决问题：外部API连续失败时，避免无意义重试，快速降级。
 */

export enum CircuitState {
  CLOSED = 'CLOSED',         // 正常状态：允许所有请求
  OPEN = 'OPEN',             // 熔断状态：拒绝所有请求
  HALF_OPEN = 'HALF_OPEN',   // 半开状态：允许少量测试请求
}

export interface CircuitBreakerConfig {
  /** 连续失败次数阈值，超过则熔断 */
  failureThreshold: number;
  /** 熔断后等待多久进入半开状态（ms） */
  resetTimeout: number;
  /** 半开状态下最大测试请求数 */
  halfOpenMaxCalls: number;
  /** 成功多少次后恢复关闭状态 */
  successThreshold: number;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeout: 60000,       // 1分钟
  halfOpenMaxCalls: 3,
  successThreshold: 2,
};

/**
 * 断路器
 * 
 * 状态流转：
 * CLOSED --[连续失败>=阈值]--> OPEN
 * OPEN   --[等待超时]-------> HALF_OPEN
 * HALF_OPEN --[测试成功>=阈值]--> CLOSED
 * HALF_OPEN --[测试失败]-------> OPEN
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime: number = 0;
  private halfOpenCalls = 0;
  private readonly config: CircuitBreakerConfig;
  private readonly name: string;

  constructor(name: string, config: Partial<CircuitBreakerConfig> = {}) {
    this.name = name;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 执行受保护的调用
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // OPEN状态：检查是否可以进入HALF_OPEN
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime > this.config.resetTimeout) {
        this.state = CircuitState.HALF_OPEN;
        this.halfOpenCalls = 0;
        this.successCount = 0;
        console.log(`[${this.name}] 断路器进入半开状态，测试恢复`);
      } else {
        throw new Error(`[${this.name}] 断路器处于熔断状态，${Math.ceil((this.config.resetTimeout - (Date.now() - this.lastFailureTime)) / 1000)}秒后重试`);
      }
    }

    // HALF_OPEN状态：限制测试请求数
    if (this.state === CircuitState.HALF_OPEN) {
      if (this.halfOpenCalls >= this.config.halfOpenMaxCalls) {
        throw new Error(`[${this.name}] 半开状态测试配额已满，等待下一轮`);
      }
      this.halfOpenCalls++;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * 获取当前状态
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * 获取失败计数
   */
  getFailureCount(): number {
    return this.failureCount;
  }

  /**
   * 手动重置
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.halfOpenCalls = 0;
    console.log(`[${this.name}] 断路器手动重置`);
  }

  private onSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
        this.successCount = 0;
        console.log(`[${this.name}] 断路器恢复关闭状态`);
      }
    } else if (this.state === CircuitState.CLOSED) {
      this.failureCount = 0;
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      // 半开状态下失败，立即回到OPEN
      this.state = CircuitState.OPEN;
      console.error(`[${this.name}] 断路器半开测试失败，重新熔断`);
    } else if (this.state === CircuitState.CLOSED) {
      if (this.failureCount >= this.config.failureThreshold) {
        this.state = CircuitState.OPEN;
        console.error(`[${this.name}] 断路器熔断！连续失败 ${this.failureCount} 次`);
      }
    }
  }
}
