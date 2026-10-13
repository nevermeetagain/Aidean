/**
 * Skill 同步脚本 - 断路器 v2.0
 * 参考：Skills同步方案_优化版_v2.md 场景M2
 *
 * 解决问题：外部API连续失败时，避免无意义重试，快速降级。
 */
export declare enum CircuitState {
    CLOSED = "CLOSED",// 正常状态：允许所有请求
    OPEN = "OPEN",// 熔断状态：拒绝所有请求
    HALF_OPEN = "HALF_OPEN"
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
/**
 * 断路器
 *
 * 状态流转：
 * CLOSED --[连续失败>=阈值]--> OPEN
 * OPEN   --[等待超时]-------> HALF_OPEN
 * HALF_OPEN --[测试成功>=阈值]--> CLOSED
 * HALF_OPEN --[测试失败]-------> OPEN
 */
export declare class CircuitBreaker {
    private state;
    private failureCount;
    private successCount;
    private lastFailureTime;
    private halfOpenCalls;
    private readonly config;
    private readonly name;
    constructor(name: string, config?: Partial<CircuitBreakerConfig>);
    /**
     * 执行受保护的调用
     */
    execute<T>(fn: () => Promise<T>): Promise<T>;
    /**
     * 获取当前状态
     */
    getState(): CircuitState;
    /**
     * 获取失败计数
     */
    getFailureCount(): number;
    /**
     * 手动重置
     */
    reset(): void;
    private onSuccess;
    private onFailure;
}
//# sourceMappingURL=CircuitBreaker.d.ts.map