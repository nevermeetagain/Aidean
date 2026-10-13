/**
 * Skill 同步脚本 - 冲突解决器 v2.0
 * 参考：Skills同步方案_优化版_v2.md 维度6 场景化冲突解决
 */
import { Skill, SkillSyncRecord, MergeRule, ResolutionResult } from '../types/skill.js';
/**
 * v2.0 场景化合并规则
 * 根据字段特性选择最合适的解决策略
 */
export declare const defaultMergeRules: MergeRule[];
/**
 * Skill 冲突解决器 v2.0
 *
 * 核心改进：
 * 1. 场景化策略（max_wins, authority_wins）
 * 2. 字段变更级别追踪
 * 3. 人工审核队列（IDENTITY级别变更）
 */
export declare class SkillConflictResolver {
    private rules;
    private sourcePriority;
    constructor(rules?: MergeRule[], sourcePriority?: Record<string, number>);
    /**
     * 解决冲突
     */
    resolve(existing: Skill, incoming: SkillSyncRecord): Promise<ResolutionResult>;
    /**
     * 解析 tags 字段
     */
    private parseTags;
    /**
     * 解析 JSON 字符串
     */
    private parseJson;
    /**
     * 解决单个字段冲突
     * v2.0: 增加 max_wins, authority_wins 策略
     */
    private resolveField;
}
//# sourceMappingURL=ConflictResolver.d.ts.map