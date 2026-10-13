/**
 * Skill 同步引擎 v2.0
 * 参考：Skills同步方案_优化版_v2.md
 *
 * 核心改进：
 * 1. 字段级增量检测
 * 2. 断路器保护（集成到fetch流程）
 * 3. 数据质量评分
 * 4. 场景化冲突解决
 * 5. 批量UPSERT支持
 * 6. 连接池事务管理
 */
import { SkillRepository, SyncTaskRepository } from '../database/repository.js';
import { SkillConflictResolver } from './ConflictResolver.js';
import { CircuitBreaker } from './CircuitBreaker.js';
import { FieldChangeLevel, FIELD_LEVEL_MAP, CHANGE_LEVEL_CONFIG, QUALITY_THRESHOLD, SyncErrorCode, SyncError, } from '../types/skill.js';
/**
 * Skill 同步引擎 v2.0
 */
export class SkillSyncEngine {
    adapter;
    skillRepository;
    taskRepository;
    conflictResolver;
    circuitBreaker;
    config;
    dataSourceConfig;
    constructor(adapter, dataSourceConfig, config = {}) {
        this.adapter = adapter;
        this.dataSourceConfig = dataSourceConfig;
        this.skillRepository = new SkillRepository();
        this.taskRepository = new SyncTaskRepository();
        this.conflictResolver = new SkillConflictResolver();
        this.circuitBreaker = new CircuitBreaker(dataSourceConfig.sourceCode, { failureThreshold: 5, resetTimeout: 60000 });
        this.config = {
            batchSize: 100,
            enableConflictResolution: true,
            dryRun: false,
            enableCircuitBreaker: true,
            enableQualityFilter: true,
            enableFieldLevelIncremental: true,
            enableBulkUpsert: false,
            bulkBufferSize: 500,
            enableTransaction: false,
            ...config,
        };
    }
    /**
     * 执行同步
     * v2.0: 增加断路器保护、事务管理
     */
    async sync(params = {}) {
        const startTime = Date.now();
        let taskId;
        const fieldChanges = [];
        // v2.0: 断路器检查 — 如果数据源熔断，直接跳过
        if (this.config.enableCircuitBreaker) {
            try {
                // 使用断路器包装整个同步流程
                return await this.circuitBreaker.execute(() => this.executeSyncInternal(params, startTime, fieldChanges));
            }
            catch (error) {
                // 断路器熔断时，抛出带错误码的异常
                if (error.message?.includes('熔断状态')) {
                    throw new SyncError(`数据源 ${this.dataSourceConfig.sourceCode} 当前不可用: ${error.message}`, SyncErrorCode.CIRCUIT_BREAKER_OPEN);
                }
                throw error;
            }
        }
        return this.executeSyncInternal(params, startTime, fieldChanges);
    }
    /**
     * 内部同步流程
     */
    async executeSyncInternal(params, startTime, fieldChanges) {
        let taskId;
        try {
            // 连接数据库
            await this.skillRepository.connect();
            await this.taskRepository.connect();
            // v2.0: 事务管理（可选）
            if (this.config.enableTransaction) {
                await this.skillRepository.beginTransaction();
            }
            // 创建同步任务
            const dataSourceId = await this.getDataSourceId();
            taskId = await this.taskRepository.create({
                dataSourceId,
                taskType: 'skill_sync',
                triggeredBy: params._triggeredBy || 'scheduler',
                params,
            });
            console.log(`[SyncEngine] Task ${taskId} created, starting sync from ${this.dataSourceConfig.sourceCode}...`);
            // 标记任务为运行中
            await this.taskRepository.markAsRunning(taskId);
            // 执行 ETL 流程
            const result = await this.executeETL(taskId, params, fieldChanges);
            // v2.0: 提交事务
            if (this.config.enableTransaction) {
                await this.skillRepository.commitTransaction();
            }
            // 完成任务
            await this.taskRepository.complete(taskId, result);
            const duration = Date.now() - startTime;
            console.log(`[SyncEngine] Sync completed in ${duration}ms`, result);
            return result;
        }
        catch (error) {
            console.error('[SyncEngine] Sync failed:', error);
            // v2.0: 回滚事务
            if (this.config.enableTransaction) {
                try {
                    await this.skillRepository.rollbackTransaction();
                }
                catch (rollbackError) {
                    console.error('[SyncEngine] Transaction rollback failed:', rollbackError);
                }
            }
            if (taskId) {
                try {
                    await this.taskRepository.complete(taskId, {
                        taskId,
                        status: 'failed',
                        totalRecords: 0,
                        processedRecords: 0,
                        failedRecords: 0,
                        skippedRecords: 0,
                        errorMessage: error.message,
                    });
                }
                catch (completeError) {
                    console.error('[SyncEngine] Failed to mark task as failed:', completeError);
                }
            }
            throw error;
        }
        finally {
            await this.skillRepository.disconnect();
            await this.taskRepository.disconnect();
        }
    }
    /**
     * 执行 ETL 流程
     * v2.0: 增加字段级增量检测、质量评分、批量UPSERT
     */
    async executeETL(taskId, params, fieldChanges) {
        let totalRecords = 0;
        let processedRecords = 0;
        let failedRecords = 0;
        let skippedRecords = 0;
        // v2.0: 批量缓冲区
        const bulkBuffer = [];
        const flushBulk = async () => {
            if (bulkBuffer.length === 0)
                return;
            try {
                await this.skillRepository.bulkUpsert(bulkBuffer);
                processedRecords += bulkBuffer.length;
            }
            catch (error) {
                failedRecords += bulkBuffer.length;
                console.error(`[SyncEngine] Bulk upsert failed for ${bulkBuffer.length} records:`, error);
            }
            bulkBuffer.length = 0;
        };
        for await (const rawSkill of this.adapter.fetchSkills(params)) {
            totalRecords++;
            try {
                // Transform: 数据标准化
                const normalized = this.adapter.normalize(rawSkill);
                // v2.0: 计算质量评分
                const qualityScore = this.calculateSimpleQualityScore(normalized);
                normalized.qualityScore = qualityScore.overall;
                // v2.0: 设置数据分层
                normalized.dataLayer = this.dataSourceConfig.dataLayer;
                // v2.0: 质量过滤（低于阈值的数据标记，但不跳过）
                if (this.config.enableQualityFilter && qualityScore.overall < QUALITY_THRESHOLD) {
                    console.warn(`[SyncEngine] [${totalRecords}] Quality below threshold (${qualityScore.overall}): ${normalized.skillKey}`);
                }
                // v2.0: 批量模式 — 直接加入缓冲区
                if (this.config.enableBulkUpsert) {
                    bulkBuffer.push(normalized);
                    if (bulkBuffer.length >= (this.config.bulkBufferSize || 500)) {
                        await flushBulk();
                    }
                    continue;
                }
                // 逐条处理模式（支持字段级增量检测）
                const existing = await this.skillRepository.findBySkillKey(normalized.skillKey);
                const changeType = this.detectChange(existing, normalized);
                // v2.0: 字段级变更检测
                if (changeType === 'update' && this.config.enableFieldLevelIncremental && existing) {
                    const changes = this.detectFieldChanges(existing, normalized);
                    fieldChanges.push(...changes);
                    // 过滤掉METRIC级别变更（不触发更新，只记录）
                    const significantChanges = changes.filter(c => CHANGE_LEVEL_CONFIG[c.changeLevel].level >= CHANGE_LEVEL_CONFIG[FieldChangeLevel.CONTENT].level);
                    if (significantChanges.length === 0) {
                        // 只有METRIC级别变化，更新统计但不触发完整更新
                        await this.skillRepository.updateMetrics(existing.id, {
                            stars: normalized.stars,
                            downloadCount: normalized.downloadCount,
                            rawHash: normalized.rawHash,
                        });
                        skippedRecords++;
                        continue;
                    }
                }
                if (changeType === 'no_change') {
                    skippedRecords++;
                    continue;
                }
                if (this.config.dryRun) {
                    console.log(`[SyncEngine] [${totalRecords}] Dry run ${changeType}: ${normalized.skillKey}`);
                    processedRecords++;
                    continue;
                }
                // Load: 数据加载
                if (changeType === 'create') {
                    await this.skillRepository.create(normalized);
                    console.log(`[SyncEngine] [${totalRecords}] Created: ${normalized.skillKey} (quality: ${qualityScore.overall})`);
                }
                else if (changeType === 'update') {
                    if (this.config.enableConflictResolution && existing) {
                        const resolution = await this.conflictResolver.resolve(existing, normalized);
                        // v2.0: 处理人工审核情况
                        if (resolution.action === 'review' && resolution.requiresReview) {
                            console.warn(`[SyncEngine] [${totalRecords}] Identity change requires review: ${normalized.skillKey} fields: ${resolution.requiresReview.join(', ')}`);
                        }
                        if (resolution.action === 'skip') {
                            skippedRecords++;
                            continue;
                        }
                        await this.skillRepository.update(existing.id, resolution.mergedData);
                        console.log(`[SyncEngine] [${totalRecords}] Updated with merge: ${normalized.skillKey}`);
                    }
                    else {
                        await this.skillRepository.update(existing.id, normalized);
                        console.log(`[SyncEngine] [${totalRecords}] Updated: ${normalized.skillKey}`);
                    }
                }
                processedRecords++;
                // 每处理 batchSize 条记录，更新任务进度
                if (processedRecords % this.config.batchSize === 0) {
                    await this.taskRepository.updateProgress(taskId, {
                        processedRecords,
                        failedRecords,
                        skippedRecords,
                    });
                }
            }
            catch (error) {
                failedRecords++;
                console.error(`[SyncEngine] [${totalRecords}] Failed to process skill:`, error);
            }
        }
        // v2.0: 刷新批量缓冲区
        if (this.config.enableBulkUpsert) {
            await flushBulk();
        }
        await this.taskRepository.updateProgress(taskId, {
            processedRecords,
            failedRecords,
            skippedRecords,
        });
        return {
            taskId,
            status: failedRecords > 0 ? 'failed' : 'success',
            totalRecords,
            processedRecords,
            failedRecords,
            skippedRecords,
            fieldChanges: fieldChanges.length > 0 ? fieldChanges : undefined,
        };
    }
    /**
     * v2.0: 检测变更类型
     */
    detectChange(existing, incoming) {
        if (!existing) {
            return 'create';
        }
        // 先比较整记录哈希
        if (existing.rawHash === incoming.rawHash) {
            return 'no_change';
        }
        return 'update';
    }
    /**
     * v2.0: 字段级变更检测
     */
    detectFieldChanges(existing, incoming) {
        const changes = [];
        const existingFieldHashes = this.parseFieldHashes(existing.fieldHashes);
        for (const [field, changeLevel] of Object.entries(FIELD_LEVEL_MAP)) {
            const incomingHash = incoming.fieldHashes[field];
            const existingHash = existingFieldHashes[field];
            if (incomingHash && existingHash && incomingHash !== existingHash) {
                changes.push({
                    field,
                    changeLevel,
                    oldValue: existing[field],
                    newValue: incoming[field],
                    detectedAt: new Date(),
                });
            }
        }
        return changes;
    }
    /**
     * v2.0: 简化版质量评分（MVP）
     */
    calculateSimpleQualityScore(skill) {
        const requiredFields = ['name', 'description', 'author', 'sourceUrl', 'version'];
        const optionalFields = ['stars', 'downloadCount', 'category', 'tags', 'installCommand'];
        const filledRequired = requiredFields.filter(f => skill[f] != null && skill[f] !== '' && skill[f] !== 0).length;
        const filledOptional = optionalFields.filter(f => skill[f] != null && skill[f] !== '' && skill[f] !== 0).length;
        const completeness = (filledRequired / requiredFields.length) * 70 + (filledOptional / optionalFields.length) * 30;
        const hoursSinceUpdate = skill.lastUpdated
            ? (Date.now() - skill.lastUpdated.getTime()) / (1000 * 60 * 60)
            : 999;
        const freshness = Math.max(0, 100 - hoursSinceUpdate * 0.5);
        const authority = this.dataSourceConfig.trustScore;
        const consistency = 50; // MVP默认值
        const overall = Math.round(completeness * 0.3 + freshness * 0.3 + authority * 0.25 + consistency * 0.15);
        return { completeness: Math.round(completeness), freshness: Math.round(freshness), authority, consistency, overall };
    }
    /**
     * 解析字段级哈希
     */
    parseFieldHashes(value) {
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
     * 获取数据源 ID
     */
    async getDataSourceId() {
        return 1;
    }
}
//# sourceMappingURL=SyncEngine.js.map