/**
 * registry.spec.ts — 采集源单一事实来源防漂移守卫
 *
 * 守护目标：
 *  1) registry.ts（UI 选项 + 调度标签真源）与 adapters.ts（服务端适配器工厂）
 *     的 key 集合必须完全一致——历史上 UI(9) 落后 registry(11) 的缺陷不得复发。
 *  2) SyncManager 下拉由 SYNC_SOURCES 派生，故「registry 覆盖」即「UI 覆盖」。
 */

import { describe, it, expect } from 'vitest';
import { SYNC_SOURCES } from './registry';
import { ADAPTER_REGISTRY, buildAdapter, buildCrossAdapters } from './adapters';

describe('sync source registry (single source of truth)', () => {
  it('SYNC_SOURCES keys exactly match ADAPTER_REGISTRY keys', () => {
    const registryKeys = new Set(SYNC_SOURCES.map((s) => s.key));
    const factoryKeys = new Set(Object.keys(ADAPTER_REGISTRY));
    expect(registryKeys).toEqual(factoryKeys);
  });

  it('每个采集源都有非空 label 且 key 唯一', () => {
    const seen = new Set<string>();
    for (const s of SYNC_SOURCES) {
      expect(s.key).toBeTruthy();
      expect(s.label).toBeTruthy();
      expect(seen.has(s.key)).toBe(false);
      seen.add(s.key);
    }
  });

  it('需求三源（quanzil / arena-ai / openrouter）均在注册表中', () => {
    const keys = SYNC_SOURCES.map((s) => s.key);
    expect(keys).toContain('quanzil');
    expect(keys).toContain('arena-ai');
    expect(keys).toContain('openrouter');
  });

  it('buildAdapter 命中返回实例、未命中返回 undefined', () => {
    expect(buildAdapter('openrouter')).toBeDefined();
    expect(buildAdapter('__nope__')).toBeUndefined();
  });

  it('buildCrossAdapters 排除主源后返回其余全部', () => {
    const total = Object.keys(ADAPTER_REGISTRY).length;
    const cross = buildCrossAdapters(['openrouter']);
    expect(cross).toHaveLength(total - 1);
    expect(cross.some((a) => a.name === 'openrouter')).toBe(false);
  });
});
