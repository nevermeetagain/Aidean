/**
 * CrossValidator — 多源数据交叉验证框架（R-30）。
 *
 * 当同一 modelCode 有多个数据源（OpenRouter、LMSys、官方文档等）时，
 * 比对关键字段，标记冲突，输出 ConflictReport 供 admin 决策。
 *
 * 设计原则：
 * - source-agnostic：不依赖具体 adapter，接收已标准化的 NormalizedModelData
 * - 字段级比对：只比对有明确口径的字段，模糊字段（description 等）不比
 * - 容差配置：数值字段允许微小差异（如价格因汇率波动 ±5%）
 * - 框架先行：即使只有 1 个源，框架也能正常运行（输出空 conflicts）
 */

import type { NormalizedModelData } from './types/sync';

/** 冲突状态 */
export type ConflictStatus = 'resolved' | 'unresolved' | 'auto_resolved';

/** 单字段冲突报告 */
export interface FieldConflict {
  modelCode: string;
  field: string;
  sources: Array<{ source: string; value: unknown }>;
  resolvedValue?: unknown;
  conflictStatus: ConflictStatus;
}

/** 完整冲突报告 */
export interface ConflictReport {
  totalModels: number;
  modelsWithConflicts: number;
  totalConflicts: number;
  conflicts: FieldConflict[];
}

/** 容差配置：数值字段允许的相对误差 */
const TOLERANCE: Record<string, number> = {
  inputPrice: 0.05,   // 5%
  outputPrice: 0.05,  // 5%
  contextLength: 0,   // 精确匹配
  parameterCount: 0,  // 精确匹配
};

/** 参与比对的关键字段列表 */
const COMPARE_FIELDS = [
  'contextLength',
  'parameterCount',
  'inputPrice',
  'outputPrice',
  'isOpenSource',
  'isMultiModal',
  'isReasoning',
] as const;

/**
 * 交叉验证器。
 *
 * 输入：Record<sourceName, NormalizedModelData[]>
 * 输出：ConflictReport
 */
export class CrossValidator {
  /**
   * 执行交叉验证。
   * @param multiSourceData 各数据源的标准化数据
   * @returns 冲突报告
   */
  validate(multiSourceData: Record<string, NormalizedModelData[]>): ConflictReport {
    // 收集所有 modelCode
    const modelCodes = new Set<string>();
    for (const data of Object.values(multiSourceData)) {
      for (const item of data) {
        modelCodes.add(item.modelCode);
      }
    }

    const conflicts: FieldConflict[] = [];
    let modelsWithConflicts = 0;

    for (const modelCode of modelCodes) {
      let modelHasConflict = false;

      for (const field of COMPARE_FIELDS) {
        const sources: Array<{ source: string; value: unknown }> = [];

        for (const [sourceName, data] of Object.entries(multiSourceData)) {
          const item = data.find(d => d.modelCode === modelCode);
          if (!item) continue;

          const value = this.getFieldValue(item, field);
          if (value === undefined || value === null) continue;

          sources.push({ source: sourceName, value });
        }

        // 需要至少 2 个源才有冲突可能
        if (sources.length < 2) continue;

        if (this.hasConflict(sources, field)) {
          modelHasConflict = true;
          conflicts.push({
            modelCode,
            field,
            sources,
            conflictStatus: 'unresolved',
          });
        }
      }

      if (modelHasConflict) modelsWithConflicts++;
    }

    return {
      totalModels: modelCodes.size,
      modelsWithConflicts,
      totalConflicts: conflicts.length,
      conflicts,
    };
  }

  /**
   * 从 NormalizedModelData 中提取字段值。
   * prices 数组取第一条（当前活跃价格）。
   */
  private getFieldValue(item: NormalizedModelData, field: string): unknown {
    switch (field) {
      case 'contextLength':
        return item.contextLength;
      case 'parameterCount':
        return item.parameterCount;
      case 'inputPrice':
        return item.prices?.[0]?.inputPrice;
      case 'outputPrice':
        return item.prices?.[0]?.outputPrice;
      case 'isOpenSource':
        return item.isOpenSource;
      case 'isMultiModal':
        return item.isMultiModal;
      case 'isReasoning':
        return item.isReasoning;
      default:
        return undefined;
    }
  }

  /**
   * 判断多源值是否存在冲突。
   * 数值字段使用容差，布尔/字符串字段精确比对。
   */
  private hasConflict(sources: Array<{ source: string; value: unknown }>, field: string): boolean {
    const values = sources.map(s => s.value);
    const tolerance = TOLERANCE[field];

    if (tolerance !== undefined && typeof values[0] === 'number') {
      // 数值字段：容差比对
      const refValue = values[0] as number;
      for (let i = 1; i < values.length; i++) {
        const v = values[i] as number;
        if (refValue === 0) {
          if (v !== 0) return true;
        } else {
          const relDiff = Math.abs(v - refValue) / Math.abs(refValue);
          if (relDiff > tolerance) return true;
        }
      }
      return false;
    }

    // 非数值字段：精确比对
    const first = JSON.stringify(values[0]);
    return values.some(v => JSON.stringify(v) !== first);
  }
}

/** 单例 */
export const crossValidator = new CrossValidator();
