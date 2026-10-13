/**
 * v2.0 场景化测试 - 断路器
 * 覆盖场景：M2（API连续失败，断路器熔断）
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CircuitBreaker, CircuitState } from '../src/engine/CircuitBreaker';

describe('CircuitBreaker v2.0', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = new CircuitBreaker('test-source', {
      failureThreshold: 3,
      resetTimeout: 1000,    // 1秒（测试用短时间）
      halfOpenMaxCalls: 2,
      successThreshold: 2,
    });
  });

  describe('场景M2: API连续失败，断路器熔断', () => {
    it('连续失败达到阈值后应该熔断', async () => {
      const failingFn = vi.fn().mockRejectedValue(new Error('API Error'));

      // 前2次失败，断路器仍然关闭
      await expect(breaker.execute(failingFn)).rejects.toThrow('API Error');
      await expect(breaker.execute(failingFn)).rejects.toThrow('API Error');
      expect(breaker.getState()).toBe(CircuitState.CLOSED);

      // 第3次失败，断路器熔断
      await expect(breaker.execute(failingFn)).rejects.toThrow('API Error');
      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });

    it('熔断后应该拒绝请求', async () => {
      const failingFn = vi.fn().mockRejectedValue(new Error('API Error'));

      // 触发熔断
      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(failingFn)).rejects.toThrow();
      }

      // 熔断后应该直接拒绝
      await expect(breaker.execute(vi.fn())).rejects.toThrow('断路器处于熔断状态');
    });

    it('熔断超时后应该进入半开状态', async () => {
      const failingFn = vi.fn().mockRejectedValue(new Error('API Error'));

      // 触发熔断
      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(failingFn)).rejects.toThrow();
      }

      // 等待超时
      await new Promise(resolve => setTimeout(resolve, 1100));

      // 应该进入半开状态，允许测试请求
      const successFn = vi.fn().mockResolvedValue('ok');
      const result = await breaker.execute(successFn);
      expect(result).toBe('ok');
      expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);
    });

    it('半开状态下连续成功应该恢复', async () => {
      const failingFn = vi.fn().mockRejectedValue(new Error('API Error'));

      // 触发熔断
      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(failingFn)).rejects.toThrow();
      }

      // 等待超时进入半开
      await new Promise(resolve => setTimeout(resolve, 1100));

      // 连续成功
      const successFn = vi.fn().mockResolvedValue('ok');
      await breaker.execute(successFn);
      await breaker.execute(successFn);

      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('半开状态下失败应该重新熔断', async () => {
      const failingFn = vi.fn().mockRejectedValue(new Error('API Error'));

      // 触发熔断
      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(failingFn)).rejects.toThrow();
      }

      // 等待超时进入半开
      await new Promise(resolve => setTimeout(resolve, 1100));

      // 半开状态下失败
      await expect(breaker.execute(failingFn)).rejects.toThrow('API Error');
      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });
  });

  describe('手动重置', () => {
    it('应该能够手动重置断路器', async () => {
      const failingFn = vi.fn().mockRejectedValue(new Error('API Error'));

      // 触发熔断
      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(failingFn)).rejects.toThrow();
      }

      expect(breaker.getState()).toBe(CircuitState.OPEN);

      // 手动重置
      breaker.reset();
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
      expect(breaker.getFailureCount()).toBe(0);
    });
  });

  describe('成功调用', () => {
    it('成功调用应该重置失败计数', async () => {
      const failingFn = vi.fn().mockRejectedValue(new Error('API Error'));
      const successFn = vi.fn().mockResolvedValue('ok');

      // 失败2次
      await expect(breaker.execute(failingFn)).rejects.toThrow();
      await expect(breaker.execute(failingFn)).rejects.toThrow();
      expect(breaker.getFailureCount()).toBe(2);

      // 成功1次，重置计数
      await breaker.execute(successFn);
      expect(breaker.getFailureCount()).toBe(0);
    });
  });
});
