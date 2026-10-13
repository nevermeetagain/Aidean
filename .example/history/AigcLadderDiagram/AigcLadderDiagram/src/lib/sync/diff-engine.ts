/**
 * 模型比对引擎
 * 比较远程数据与本地数据，计算差异
 */

import type { ModelDiff, ModelDiffType } from './types/sync';

/**
 * 比对配置
 */
export interface DiffConfig {
  // 要比较的字段
  compareFields?: string[];
  // 忽略的字段
  ignoreFields?: string[];
  // 价格变化阈值（百分比）
  priceChangeThreshold?: number;
}

/**
 * 计算模型差异
 */
export function computeDiff(
  remoteModels: Record<string, any>[],
  localModels: Record<string, any>[],
  config: DiffConfig = {}
): ModelDiff[] {
  const { 
    compareFields = ['nameDisplay', 'contextLength', 'priceInput', 'priceOutput', 'modelType'],
    ignoreFields = ['id', 'createdAt', 'updatedAt', 'rawData'],
    priceChangeThreshold = 0.01  // 1%
  } = config;
  
  const diffs: ModelDiff[] = [];
  const localMap = new Map(localModels.map(m => [m.modelCode, m]));
  const processedCodes = new Set<string>();
  
  // 检查远程模型
  for (const remote of remoteModels) {
    const modelCode = remote.modelCode;
    
    if (!modelCode) {
      console.warn('[DiffEngine] Remote model without modelCode, skipping');
      continue;
    }
    
    processedCodes.add(modelCode);
    const local = localMap.get(modelCode);
    
    if (!local) {
      // 本地不存在，新增
      diffs.push({
        type: 'NEW',
        modelCode,
        before: undefined,
        after: remote,
        changedFields: Object.keys(remote).filter(k => !ignoreFields.includes(k)),
      });
    } else {
      // 本地存在，比较差异
      const changedFields = compareModelFields(remote, local, compareFields, priceChangeThreshold);
      
      if (changedFields.length > 0) {
        diffs.push({
          type: 'UPDATED',
          modelCode,
          before: local,
          after: remote,
          changedFields,
        });
      } else {
        diffs.push({
          type: 'UNCHANGED',
          modelCode,
          before: local,
          after: remote,
          changedFields: [],
        });
      }
    }
  }
  
  // 检查本地模型（标记为已废弃的）
  for (const local of localModels) {
    const modelCode = local.modelCode;
    
    if (!processedCodes.has(modelCode)) {
      // 远程不存在，本地存在，标记为废弃
      diffs.push({
        type: 'DEPRECATED',
        modelCode,
        before: local,
        after: undefined,
        changedFields: ['isActive'],
      });
    }
  }
  
  return diffs;
}

/**
 * 比较两个模型的字段差异
 */
function compareModelFields(
  remote: Record<string, any>,
  local: Record<string, any>,
  compareFields: string[],
  priceChangeThreshold: number
): string[] {
  const changedFields: string[] = [];
  
  for (const field of compareFields) {
    const remoteValue = remote[field];
    const localValue = local[field];
    
    // 处理价格字段的特殊逻辑
    if (field.includes('price') && typeof remoteValue === 'number' && typeof localValue === 'number') {
      const change = Math.abs(remoteValue - localValue) / (localValue || 1);
      if (change > priceChangeThreshold) {
        changedFields.push(field);
      }
      continue;
    }
    
    // 一般字段比较
    if (JSON.stringify(remoteValue) !== JSON.stringify(localValue)) {
      changedFields.push(field);
    }
  }
  
  return changedFields;
}

/**
 * 统计差异类型
 */
export function countDiffsByType(diffs: ModelDiff[]): Record<ModelDiffType, number> {
  return {
    NEW: diffs.filter(d => d.type === 'NEW').length,
    UPDATED: diffs.filter(d => d.type === 'UPDATED').length,
    UNCHANGED: diffs.filter(d => d.type === 'UNCHANGED').length,
    DEPRECATED: diffs.filter(d => d.type === 'DEPRECATED').length,
  };
}

/**
 * 过滤指定类型的差异
 */
export function filterDiffsByType(
  diffs: ModelDiff[], 
  types: ModelDiffType[]
): ModelDiff[] {
  return diffs.filter(d => types.includes(d.type));
}

/**
 * 获取需要写入数据库的差异（排除 UNCHANGED）
 */
export function getWritableDiffs(diffs: ModelDiff[]): ModelDiff[] {
  return diffs.filter(d => d.type !== 'UNCHANGED');
}
