/**
 * Skill 同步脚本 - 数据库连接 v2.0
 * 核心改进：pg.Pool 连接池替代单 Client
 * 解决场景：M7（数据库连接中断）、S4（10万+数据量并发写入）
 */
import { Pool } from 'pg';
// 数据库配置
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'NewPassword123!',
    database: process.env.DB_NAME || 'skills_db',
    // v2.0: 连接池配置
    max: 20, // 最大连接数
    min: 2, // 最小空闲连接数
    idleTimeoutMillis: 30000, // 空闲连接超时 30s
    connectionTimeoutMillis: 5000, // 连接超时 5s
    maxUses: 7500, // 单个连接最大使用次数（防止内存泄漏）
    // v2.0: 连接验证
    allowExitOnIdle: false,
};
/**
 * v2.0: 全局连接池单例
 * 使用连接池管理数据库连接，支持并发查询和自动重连
 */
let pool = null;
/**
 * 获取连接池实例
 */
export function getPool() {
    if (!pool) {
        pool = new Pool(dbConfig);
        // 连接池错误处理（防止进程崩溃）
        pool.on('error', (err) => {
            console.error('[Pool] Unexpected error on idle client:', err.message);
        });
        pool.on('connect', (client) => {
            console.log('[Pool] New client connected');
        });
        pool.on('remove', (client) => {
            console.log('[Pool] Client removed from pool');
        });
    }
    return pool;
}
/**
 * 测试数据库连接
 */
export async function testConnection() {
    const pool = getPool();
    try {
        const client = await pool.connect();
        try {
            const result = await client.query('SELECT NOW()');
            console.log('Database connected:', result.rows[0]);
            return true;
        }
        finally {
            client.release();
        }
    }
    catch (error) {
        console.error('Database connection failed:', error);
        return false;
    }
}
/**
 * 初始化数据库 Schema
 * v2.0: 增加data_layer/trust_score/quality_score等字段
 */
export async function initSchema() {
    const pool = getPool();
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        // 创建 schema
        await client.query(`CREATE SCHEMA IF NOT EXISTS sync;`);
        // 1. 数据源配置表（v2.0增强版）
        await client.query(`
      CREATE TABLE IF NOT EXISTS sync.data_sources (
        id SERIAL PRIMARY KEY,
        source_code VARCHAR(50) NOT NULL UNIQUE,
        source_name VARCHAR(100) NOT NULL,
        source_type VARCHAR(20) NOT NULL DEFAULT 'api',
        base_url VARCHAR(500),
        api_key VARCHAR(500),
        
        -- v2.0: 数据分层
        data_layer SMALLINT NOT NULL DEFAULT 0,
        trust_score SMALLINT NOT NULL DEFAULT 50,
        
        -- 频率控制
        rate_limit_requests INTEGER DEFAULT 100,
        rate_limit_window INTEGER DEFAULT 60,
        sync_cron VARCHAR(100) DEFAULT '0 2 * * *',
        sync_priority INTEGER DEFAULT 5,
        
        -- 状态控制
        is_active BOOLEAN DEFAULT TRUE,
        last_sync_at TIMESTAMPTZ,
        last_sync_status VARCHAR(20),
        last_error TEXT,
        consecutive_failures INTEGER DEFAULT 0,
        
        -- 统计
        total_sync_count INTEGER DEFAULT 0,
        success_count INTEGER DEFAULT 0,
        fail_count INTEGER DEFAULT 0,
        
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
        // 2. 同步任务表（v2.0增强版）
        await client.query(`
      CREATE TABLE IF NOT EXISTS sync.sync_tasks (
        id SERIAL PRIMARY KEY,
        data_source_id INTEGER NOT NULL REFERENCES sync.data_sources(id),
        task_type VARCHAR(30) DEFAULT 'skill_sync',
        status VARCHAR(20) DEFAULT 'pending',
        
        -- 执行参数
        params JSONB DEFAULT '{}',
        
        -- 进度
        total_records INTEGER DEFAULT 0,
        processed_records INTEGER DEFAULT 0,
        failed_records INTEGER DEFAULT 0,
        skipped_records INTEGER DEFAULT 0,
        
        -- 时间
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        duration_ms INTEGER,
        
        -- 错误
        error_message TEXT,
        
        -- v2.0: 触发方式
        triggered_by VARCHAR(50) DEFAULT 'scheduler',
        
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
        // 3. Skills 主表（v2.0增强版）
        await client.query(`
      CREATE TABLE IF NOT EXISTS sync.skills (
        id SERIAL PRIMARY KEY,
        skill_key VARCHAR(200) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        display_name VARCHAR(100),
        description TEXT,
        author VARCHAR(100),
        source VARCHAR(50) NOT NULL,
        source_id VARCHAR(200) NOT NULL,
        source_url VARCHAR(500),
        stars INTEGER DEFAULT 0,
        download_count INTEGER DEFAULT 0,
        category VARCHAR(50),
        tags TEXT,
        version VARCHAR(50),
        last_updated TIMESTAMPTZ,
        install_command VARCHAR(500),
        npm_package VARCHAR(100),
        raw_hash VARCHAR(64),
        
        -- v2.0: 新增字段
        quality_score SMALLINT DEFAULT 0,
        data_layer SMALLINT DEFAULT 0,
        field_hashes JSONB,
        multi_source_count INTEGER DEFAULT 1,
        last_field_change_level VARCHAR(20),
        
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
        // 4. v2.0: Skill多源关联表
        await client.query(`
      CREATE TABLE IF NOT EXISTS sync.skill_sources (
        id SERIAL PRIMARY KEY,
        skill_id BIGINT NOT NULL,
        source_id BIGINT NOT NULL REFERENCES sync.data_sources(id),
        source_skill_id VARCHAR(255) NOT NULL,
        source_url VARCHAR(500),
        raw_data JSONB,
        raw_hash VARCHAR(64) NOT NULL,
        field_hashes JSONB,
        last_change_level VARCHAR(20),
        quality_score SMALLINT DEFAULT 0,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        processed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(skill_id, source_id)
      );
    `);
        // 5. v2.0: 字段变更日志表
        await client.query(`
      CREATE TABLE IF NOT EXISTS sync.field_change_logs (
        id SERIAL PRIMARY KEY,
        job_id BIGINT REFERENCES sync.sync_tasks(id),
        skill_id BIGINT NOT NULL,
        source_id BIGINT REFERENCES sync.data_sources(id),
        field_name VARCHAR(100) NOT NULL,
        change_level VARCHAR(20) NOT NULL,
        old_value JSONB,
        new_value JSONB,
        confidence DECIMAL(3,2) DEFAULT 1.0,
        resolution_strategy VARCHAR(50),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
        // 6. 创建索引
        await client.query(`
      CREATE INDEX IF NOT EXISTS idx_skills_source ON sync.skills(source);
      CREATE INDEX IF NOT EXISTS idx_skills_category ON sync.skills(category);
      CREATE INDEX IF NOT EXISTS idx_skills_stars ON sync.skills(stars DESC);
      CREATE INDEX IF NOT EXISTS idx_skills_quality ON sync.skills(quality_score);
      CREATE INDEX IF NOT EXISTS idx_skills_data_layer ON sync.skills(data_layer);
      CREATE INDEX IF NOT EXISTS idx_sync_tasks_status ON sync.sync_tasks(status);
      CREATE INDEX IF NOT EXISTS idx_sync_tasks_data_source ON sync.sync_tasks(data_source_id);
      CREATE INDEX IF NOT EXISTS idx_skill_sources_skill ON sync.skill_sources(skill_id);
      CREATE INDEX IF NOT EXISTS idx_skill_sources_source ON sync.skill_sources(source_id);
      CREATE INDEX IF NOT EXISTS idx_field_change_logs_skill ON sync.field_change_logs(skill_id);
      CREATE INDEX IF NOT EXISTS idx_field_change_logs_level ON sync.field_change_logs(change_level);
      CREATE INDEX IF NOT EXISTS idx_field_change_logs_created ON sync.field_change_logs(created_at DESC);
    `);
        await client.query('COMMIT');
        console.log('Database schema v2.0 initialized successfully');
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Schema initialization failed:', error);
        throw error;
    }
    finally {
        client.release();
    }
}
/**
 * 插入或更新数据源配置
 * v2.0: 增加dataLayer/trustScore字段
 */
export async function upsertDataSource(config) {
    const pool = getPool();
    const client = await pool.connect();
    try {
        const result = await client.query(`
      INSERT INTO sync.data_sources 
        (source_code, source_name, source_type, base_url, api_key, 
         data_layer, trust_score,
         rate_limit_requests, rate_limit_window, sync_priority, sync_cron)
      VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (source_code) 
      DO UPDATE SET
        source_name = EXCLUDED.source_name,
        source_type = EXCLUDED.source_type,
        base_url = EXCLUDED.base_url,
        api_key = EXCLUDED.api_key,
        data_layer = EXCLUDED.data_layer,
        trust_score = EXCLUDED.trust_score,
        rate_limit_requests = EXCLUDED.rate_limit_requests,
        rate_limit_window = EXCLUDED.rate_limit_window,
        sync_priority = EXCLUDED.sync_priority,
        sync_cron = EXCLUDED.sync_cron,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id;
    `, [
            config.sourceCode,
            config.sourceName,
            config.sourceType || 'api',
            config.baseUrl,
            config.apiKey,
            config.dataLayer ?? 1,
            config.trustScore ?? 50,
            config.rateLimitRequests || 100,
            config.rateLimitWindow || 60,
            config.syncPriority || 5,
            config.syncCron || '0 2 * * *',
        ]);
        return result.rows[0].id;
    }
    finally {
        client.release();
    }
}
/**
 * 关闭连接池
 */
export async function closePool() {
    if (pool) {
        await pool.end();
        pool = null;
        console.log('[Pool] Connection pool closed');
    }
}
//# sourceMappingURL=connection.js.map