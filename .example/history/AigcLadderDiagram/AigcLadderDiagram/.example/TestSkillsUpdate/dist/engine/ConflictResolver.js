/**
 * Skill 同步脚本 - 冲突解决器 v2.0
 * 参考：Skills同步方案_优化版_v2.md 维度6 场景化冲突解决
 */
import { FieldChangeLevel, FIELD_LEVEL_MAP, CHANGE_LEVEL_CONFIG, } from '../types/skill.js';
/**
 * v2.0 场景化合并规则
 * 根据字段特性选择最合适的解决策略
 */
export const defaultMergeRules = [
    // IDENTITY级别：优先级胜出+人工审核
    { field: 'name', strategy: 'priority_wins' },
    { field: 'displayName', strategy: 'priority_wins' },
    { field: 'author', strategy: 'priority_wins' },
    { field: 'sourceUrl', strategy: 'authority_wins' }, // v2.0: 权威源优先
    // METRIC级别：取最大值
    { field: 'stars', strategy: 'max_wins' }, // v2.0: 各平台统计口径不同
    { field: 'downloadCount', strategy: 'max_wins' }, // v2.0: 取最大覆盖
    // CONTENT级别：优先级胜出或取最长
    { field: 'description', strategy: 'priority_wins' },
    { field: 'category', strategy: 'priority_wins' },
    { field: 'tags', strategy: 'merge' }, // 数组合并去重
    // RELEASE级别：更新优先
    { field: 'version', strategy: 'newer_wins' },
    { field: 'lastUpdated', strategy: 'newer_wins' },
    { field: 'installCommand', strategy: 'priority_wins' },
    { field: 'npmPackage', strategy: 'priority_wins' },
];
/**
 * 数据源优先级（数值越小优先级越高）
 * v2.0: 改为从数据库配置读取，此处作为默认值
 */
const DEFAULT_SOURCE_PRIORITY = {
    'skillsmp': 1, // P1 - 最高
    'smithery': 2, // P2
    'skills_sh': 3, // P3
    'npm': 4, // P4 - 原始源
    'github': 5, // P5 - 补充源
};
/**
 * 数据源可信度（数值越高越可信）
 * 用于authority_wins策略
 */
const SOURCE_AUTHORITY = {
    'github': 100, // GitHub数据最权威（stars/forks）
    'npm': 90, // npm下载量权威
    'skillsmp': 70, // 社区平台
    'smithery': 60, // 社区平台
    'skills_sh': 50, // 社区平台
};
/**
 * Skill 冲突解决器 v2.0
 *
 * 核心改进：
 * 1. 场景化策略（max_wins, authority_wins）
 * 2. 字段变更级别追踪
 * 3. 人工审核队列（IDENTITY级别变更）
 */
export class SkillConflictResolver {
    rules;
    sourcePriority;
    constructor(rules = defaultMergeRules, sourcePriority) {
        this.rules = rules;
        this.sourcePriority = sourcePriority || DEFAULT_SOURCE_PRIORITY;
    }
    /**
     * 解决冲突
     */
    async resolve(existing, incoming) {
        const merged = {};
        const conflicts = [];
        const requiresReview = [];
        // 判断数据源优先级
        const existingPriority = this.sourcePriority[existing.source] || 999;
        const incomingPriority = this.sourcePriority[incoming.source] || 999;
        const incomingHasPriority = incomingPriority <= existingPriority;
        for (const rule of this.rules) {
            const rawExistingValue = existing[rule.field];
            const rawIncomingValue = incoming[rule.field];
            // 特殊处理 tags 字段：从 JSON 字符串解析为数组
            let existingValue = rawExistingValue;
            let incomingValue = rawIncomingValue;
            if (rule.field === 'tags') {
                existingValue = this.parseTags(rawExistingValue);
                incomingValue = this.parseTags(rawIncomingValue);
            }
            if (rule.field === 'fieldHashes') {
                existingValue = this.parseJson(rawExistingValue);
                incomingValue = rawIncomingValue;
            }
            const resolution = this.resolveField(rule, existingValue, incomingValue, incomingHasPriority, incoming.source);
            // 获取变更级别
            const changeLevel = FIELD_LEVEL_MAP[rule.field] || FieldChangeLevel.CONTENT;
            const levelConfig = CHANGE_LEVEL_CONFIG[changeLevel];
            if (resolution.conflict) {
                conflicts.push({
                    field: rule.field,
                    existing: existingValue,
                    incoming: incomingValue,
                    chosen: resolution.value,
                    reason: resolution.reason,
                    changeLevel,
                });
                // IDENTITY级别变更需要人工审核
                if (levelConfig.requireReview && changeLevel === FieldChangeLevel.IDENTITY) {
                    requiresReview.push(rule.field);
                }
            }
            merged[rule.field] = resolution.value;
        }
        // 确定action
        let action = 'update';
        if (requiresReview.length > 0) {
            action = 'review';
        }
        else if (conflicts.length > 0) {
            action = 'merge';
        }
        return {
            action,
            mergedData: { ...existing, ...merged },
            conflicts,
            requiresReview: requiresReview.length > 0 ? requiresReview : undefined,
        };
    }
    /**
     * 解析 tags 字段
     */
    parseTags(value) {
        if (Array.isArray(value)) {
            return value;
        }
        if (typeof value === 'string') {
            try {
                const parsed = JSON.parse(value);
                return Array.isArray(parsed) ? parsed : [];
            }
            catch {
                return value ? [value] : [];
            }
        }
        return [];
    }
    /**
     * 解析 JSON 字符串
     */
    parseJson(value) {
        if (typeof value === 'string') {
            try {
                return JSON.parse(value);
            }
            catch {
                return {};
            }
        }
        return value || {};
    }
    /**
     * 解决单个字段冲突
     * v2.0: 增加 max_wins, authority_wins 策略
     */
    resolveField(rule, existing, incoming, incomingHasPriority, incomingSource) {
        // 如果 incoming 为空，保留 existing
        if (incoming === null || incoming === undefined || incoming === '') {
            return { value: existing, conflict: false, reason: 'incoming_empty_keep_existing' };
        }
        // 如果 existing 为空，使用 incoming
        if (existing === null || existing === undefined || existing === '') {
            return { value: incoming, conflict: false, reason: 'existing_empty_use_incoming' };
        }
        // 如果值相同，无冲突
        if (JSON.stringify(existing) === JSON.stringify(incoming)) {
            return { value: existing, conflict: false, reason: 'values_identical' };
        }
        // 优先级胜出策略
        if (rule.strategy === 'priority_wins') {
            if (incomingHasPriority) {
                return { value: incoming, conflict: true, reason: 'incoming_has_priority' };
            }
            return { value: existing, conflict: true, reason: 'existing_has_priority' };
        }
        // 时间戳较新者胜
        if (rule.strategy === 'newer_wins') {
            const existingDate = existing instanceof Date ? existing : new Date(existing);
            const incomingDate = incoming instanceof Date ? incoming : new Date(incoming);
            // 处理数字类型（如 stars, downloadCount）
            if (typeof existing === 'number' && typeof incoming === 'number') {
                if (incoming > existing) {
                    return { value: incoming, conflict: true, reason: 'incoming_is_larger' };
                }
                return { value: existing, conflict: true, reason: 'existing_is_larger_or_equal' };
            }
            // 处理日期类型
            if (incomingDate > existingDate) {
                return { value: incoming, conflict: true, reason: 'incoming_is_newer' };
            }
            return { value: existing, conflict: true, reason: 'existing_is_newer_or_equal' };
        }
        // v2.0: 取最大值策略（用于stars/downloadCount等指标型字段）
        if (rule.strategy === 'max_wins') {
            if (typeof existing === 'number' && typeof incoming === 'number') {
                return {
                    value: Math.max(existing, incoming),
                    conflict: true,
                    reason: existing >= incoming ? 'existing_is_max' : 'incoming_is_max'
                };
            }
            // 非数字类型降级为优先级策略
            if (incomingHasPriority) {
                return { value: incoming, conflict: true, reason: 'incoming_has_priority_fallback' };
            }
            return { value: existing, conflict: true, reason: 'existing_has_priority_fallback' };
        }
        // v2.0: 权威源优先策略（如sourceUrl以GitHub为准）
        if (rule.strategy === 'authority_wins') {
            const existingAuthority = SOURCE_AUTHORITY[existing.source] || 50;
            const incomingAuthority = SOURCE_AUTHORITY[incomingSource] || 50;
            if (incomingAuthority > existingAuthority) {
                return { value: incoming, conflict: true, reason: 'incoming_source_more_authoritative' };
            }
            if (existingAuthority > incomingAuthority) {
                return { value: existing, conflict: true, reason: 'existing_source_more_authoritative' };
            }
            // 同等权威度，用优先级
            if (incomingHasPriority) {
                return { value: incoming, conflict: true, reason: 'equal_authority_incoming_priority' };
            }
            return { value: existing, conflict: true, reason: 'equal_authority_existing_priority' };
        }
        // 合并数组（如 tags）
        if (rule.strategy === 'merge') {
            if (Array.isArray(existing) && Array.isArray(incoming)) {
                const mergedArr = [...new Set([...existing, ...incoming])];
                return {
                    value: mergedArr,
                    conflict: mergedArr.length !== existing.length,
                    reason: 'merged_arrays',
                };
            }
            // 非数组，使用优先级策略
            if (incomingHasPriority) {
                return { value: incoming, conflict: true, reason: 'incoming_has_priority' };
            }
            return { value: existing, conflict: true, reason: 'existing_has_priority' };
        }
        // 自定义策略
        if (rule.strategy === 'custom' && rule.customResolver) {
            const value = rule.customResolver(existing, incoming);
            return {
                value,
                conflict: JSON.stringify(value) !== JSON.stringify(existing),
                reason: 'custom_resolver',
            };
        }
        // 默认：使用 incoming
        return { value: incoming, conflict: true, reason: 'default_strategy' };
    }
}
//# sourceMappingURL=ConflictResolver.js.map