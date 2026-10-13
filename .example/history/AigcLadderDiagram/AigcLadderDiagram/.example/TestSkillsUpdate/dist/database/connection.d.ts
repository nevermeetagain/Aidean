/**
 * Skill 同步脚本 - 数据库连接 v2.0
 * 核心改进：pg.Pool 连接池替代单 Client
 * 解决场景：M7（数据库连接中断）、S4（10万+数据量并发写入）
 */
import { Pool } from 'pg';
/**
 * 获取连接池实例
 */
export declare function getPool(): Pool;
/**
 * 测试数据库连接
 */
export declare function testConnection(): Promise<boolean>;
/**
 * 初始化数据库 Schema
 * v2.0: 增加data_layer/trust_score/quality_score等字段
 */
export declare function initSchema(): Promise<void>;
/**
 * 插入或更新数据源配置
 * v2.0: 增加dataLayer/trustScore字段
 */
export declare function upsertDataSource(config: {
    sourceCode: string;
    sourceName: string;
    baseUrl: string;
    sourceType?: string;
    apiKey?: string;
    dataLayer?: number;
    trustScore?: number;
    rateLimitRequests?: number;
    rateLimitWindow?: number;
    syncPriority?: number;
    syncCron?: string;
}): Promise<number>;
/**
 * 关闭连接池
 */
export declare function closePool(): Promise<void>;
//# sourceMappingURL=connection.d.ts.map