/**
 * CrossValidator 单测 — 多源数据交叉验证框架（R-30）。
 */
import { describe, expect, it } from 'vitest';
import { CrossValidator } from '../cross-validator';
import type { NormalizedModelData } from '../types/sync';

function makeModel(overrides: Partial<NormalizedModelData>): NormalizedModelData {
  return {
    modelCode: 'test-model',
    checksum: 'abc',
    ...overrides,
  };
}

describe('CrossValidator', () => {
  const validator = new CrossValidator();

  it('① 单源数据 → 无冲突', () => {
    const result = validator.validate({
      openrouter: [
        makeModel({ modelCode: 'gpt-4o', contextLength: 128000, isOpenSource: false }),
      ],
    });
    expect(result.totalConflicts).toBe(0);
    expect(result.totalModels).toBe(1);
    expect(result.modelsWithConflicts).toBe(0);
  });

  it('② 双源一致 → 无冲突', () => {
    const result = validator.validate({
      openrouter: [
        makeModel({ modelCode: 'gpt-4o', contextLength: 128000, isOpenSource: false }),
      ],
      lmsys: [
        makeModel({ modelCode: 'gpt-4o', contextLength: 128000, isOpenSource: false }),
      ],
    });
    expect(result.totalConflicts).toBe(0);
  });

  it('③ 双源 contextLength 不一致 → 冲突', () => {
    const result = validator.validate({
      openrouter: [
        makeModel({ modelCode: 'gpt-4o', contextLength: 128000 }),
      ],
      lmsys: [
        makeModel({ modelCode: 'gpt-4o', contextLength: 64000 }),
      ],
    });
    expect(result.totalConflicts).toBe(1);
    expect(result.conflicts[0].field).toBe('contextLength');
    expect(result.conflicts[0].conflictStatus).toBe('unresolved');
  });

  it('④ 价格在容差内（<5%）→ 无冲突', () => {
    const result = validator.validate({
      openrouter: [
        makeModel({
          modelCode: 'gpt-4o',
          prices: [{ inputPrice: 0.005, outputPrice: 0.015, currency: 'USD', unit: 'per_1k_tokens', effectiveAt: new Date() }],
        }),
      ],
      lmsys: [
        makeModel({
          modelCode: 'gpt-4o',
          prices: [{ inputPrice: 0.0051, outputPrice: 0.0149, currency: 'USD', unit: 'per_1k_tokens', effectiveAt: new Date() }],
        }),
      ],
    });
    expect(result.totalConflicts).toBe(0);
  });

  it('⑤ 价格超出容差（>5%）→ 冲突', () => {
    const result = validator.validate({
      openrouter: [
        makeModel({
          modelCode: 'gpt-4o',
          prices: [{ inputPrice: 0.005, outputPrice: 0.015, currency: 'USD', unit: 'per_1k_tokens', effectiveAt: new Date() }],
        }),
      ],
      lmsys: [
        makeModel({
          modelCode: 'gpt-4o',
          prices: [{ inputPrice: 0.01, outputPrice: 0.015, currency: 'USD', unit: 'per_1k_tokens', effectiveAt: new Date() }],
        }),
      ],
    });
    expect(result.totalConflicts).toBe(1);
    expect(result.conflicts[0].field).toBe('inputPrice');
  });

  it('⑥ 某源缺少该字段 → 不报冲突（需至少 2 源有值）', () => {
    const result = validator.validate({
      openrouter: [
        makeModel({ modelCode: 'gpt-4o', contextLength: 128000 }),
      ],
      lmsys: [
        makeModel({ modelCode: 'gpt-4o' }), // 无 contextLength
      ],
    });
    expect(result.totalConflicts).toBe(0);
  });

  it('⑦ 多模型多冲突 → 正确计数', () => {
    const result = validator.validate({
      openrouter: [
        makeModel({ modelCode: 'model-a', contextLength: 128000, isOpenSource: false }),
        makeModel({ modelCode: 'model-b', contextLength: 32000, isOpenSource: true }),
      ],
      lmsys: [
        makeModel({ modelCode: 'model-a', contextLength: 64000, isOpenSource: false }),
        makeModel({ modelCode: 'model-b', contextLength: 32000, isOpenSource: false }),
      ],
    });
    // model-a: contextLength 冲突 (128k vs 64k), isOpenSource 一致
    // model-b: contextLength 一致, isOpenSource 冲突 (true vs false)
    expect(result.totalModels).toBe(2);
    expect(result.modelsWithConflicts).toBe(2);
    expect(result.totalConflicts).toBe(2);
  });
});
