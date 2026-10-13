/**
 * Skill 同步脚本 - 数据访问层 v2.0
 * 核心改进：
 * 1. 连接池替代单Client（解决M7场景）
 * 2. 批量UPSERT（解决S4场景）
 * 3. 字段级更新和质量评分
 */
import { Skill, SkillSyncRecord, SyncTask, SyncResult } from '../types/skill.js';
/**
 * Skill 仓库类 v2.0
 * 使用连接池管理数据库连接
 */
export declare class SkillRepository {
    private client;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    private getClient;
    /**
     * 根据 skillKey 查找 Skill
     */
    findBySkillKey(skillKey: string): Promise<Skill | null>;
    /**
     * 根据 source 和 sourceId 查找 Skill
     */
    findBySourceAndId(source: string, sourceId: string): Promise<Skill | null>;
    /**
     * 创建 Skill
     * v2.0: 增加quality_score/data_layer/field_hashes等字段
     */
    create(data: SkillSyncRecord): Promise<number>;
    /**
     * 更新 Skill
     */
    update(id: number, data: Partial<SkillSyncRecord>): Promise<void>;
    /**
     * v2.0: 轻量级指标更新
     * 仅更新METRIC级别字段（stars/downloadCount/rawHash），不触发完整更新流程
     */
    updateMetrics(id: number, data: {
        stars?: number;
        downloadCount?: number;
        rawHash?: string;
    }): Promise<void>;
    /**
     * v2.0: 批量UPSERT（解决S4场景：10万+数据量）
     * 使用临时表+JOIN实现高效批量写入
     */
    bulkUpsert(skills: SkillSyncRecord[]): Promise<{
        inserted: number;
        updated: number;
    }>;
    /**
     * 获取所有 Skills
     */
    findAll(options?: {
        source?: string;
        limit?: number;
        offset?: number;
    }): Promise<Skill[]>;
    /**
     * 统计 Skills 数量
     */
    count(options?: {
        source?: string;
    }): Promise<number>;
    /**
     * v2.0: 事务支持
     */
    beginTransaction(): Promise<void>;
    commitTransaction(): Promise<void>;
    rollbackTransaction(): Promise<void>;
}
/**
 * 同步任务仓库类 v2.0
 */
export declare class SyncTaskRepository {
    private client;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    private getClient;
    /**
     * 创建同步任务
     */
    create(data: {
        dataSourceId: number;
        taskType?: string;
        triggeredBy?: string;
        params?: any;
    }): Promise<number>;
    /**
     * 更新任务状态为运行中
     */
    markAsRunning(id: number): Promise<void>;
    /**
     * 更新任务进度
     */
    updateProgress(id: number, data: {
        processedRecords?: number;
        failedRecords?: number;
        skippedRecords?: number;
    }): Promise<void>;
    /**
     * 完成任务
     */
    complete(id: number, result: SyncResult): Promise<void>;
    /**
     * 获取任务详情
     */
    findById(id: number): Promise<SyncTask | null>;
}
//# sourceMappingURL=repository.d.ts.map