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
import { BaseSkillAdapter } from '../adapters/BaseAdapter.js';
import { SyncResult, FetchParams, DataSourceConfig } from '../types/skill.js';
/**
 * 同步引擎配置
 */
export interface SyncEngineConfig {
    batchSize?: number;
    enableConflictResolution?: boolean;
    dryRun?: boolean;
    /** v2.0: 是否启用断路器 */
    enableCircuitBreaker?: boolean;
    /** v2.0: 是否启用质量评分过滤 */
    enableQualityFilter?: boolean;
    /** v2.0: 是否启用字段级增量 */
    enableFieldLevelIncremental?: boolean;
    /** v2.0: 是否使用批量UPSERT（大数据量时开启） */
    enableBulkUpsert?: boolean;
    /** v2.0: 批量UPSERT的缓冲区大小 */
    bulkBufferSize?: number;
    /** v2.0: 是否使用事务（确保数据一致性） */
    enableTransaction?: boolean;
}
/**
 * Skill 同步引擎 v2.0
 */
export declare class SkillSyncEngine {
    private adapter;
    private skillRepository;
    private taskRepository;
    private conflictResolver;
    private circuitBreaker;
    private config;
    private dataSourceConfig;
    constructor(adapter: BaseSkillAdapter, dataSourceConfig: DataSourceConfig, config?: SyncEngineConfig);
    /**
     * 执行同步
     * v2.0: 增加断路器保护、事务管理
     */
    sync(params?: FetchParams): Promise<SyncResult>;
    /**
     * 内部同步流程
     */
    private executeSyncInternal;
    /**
     * 执行 ETL 流程
     * v2.0: 增加字段级增量检测、质量评分、批量UPSERT
     */
    private executeETL;
    /**
     * v2.0: 检测变更类型
     */
    private detectChange;
    /**
     * v2.0: 字段级变更检测
     */
    private detectFieldChanges;
    /**
     * v2.0: 简化版质量评分（MVP）
     */
    private calculateSimpleQualityScore;
    /**
     * 解析字段级哈希
     */
    private parseFieldHashes;
    /**
     * 获取数据源 ID
     */
    private getDataSourceId;
}
//# sourceMappingURL=SyncEngine.d.ts.map