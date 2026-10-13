-- ============================================================
-- Aidean AI模型天梯图平台 - 分区设置脚本
-- 07_partition_setup.sql
-- 功能：为时序大表设置分区策略
-- 环境：PostgreSQL 16+
-- 注意：需要先安装 pg_partman 扩展
-- ============================================================

-- ============================================================
-- 1. 交易记录表 - 按月RANGE分区
-- ============================================================

-- 创建分区主表 (如果03_create_tables.sql已创建普通表，需先删除重建)
-- DROP TABLE IF EXISTS transactions CASCADE;

CREATE TABLE transactions (
    id BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by BIGINT,
    updated_by BIGINT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    version INT NOT NULL DEFAULT 1,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    org_id BIGINT,
    org_path LTREE,
    user_id BIGINT NOT NULL,
    type SMALLINT NOT NULL CHECK (type IN (1, 2, 3, 4)),
    amount NUMERIC(19,4) NOT NULL,
    balance_before NUMERIC(19,4) NOT NULL,
    balance_after NUMERIC(19,4) NOT NULL,
    ref_type VARCHAR(50),
    ref_id BIGINT,
    remark TEXT,
    ext_json JSONB DEFAULT '{}',
    ext_jsonb_index JSONB DEFAULT '{}',
    tags TEXT[],
    attr_01 VARCHAR(255), attr_02 VARCHAR(255), attr_03 VARCHAR(255), attr_04 VARCHAR(255), attr_05 VARCHAR(255),
    attr_int_01 INT, attr_int_02 INT,
    attr_num_01 NUMERIC(19,4), attr_num_02 NUMERIC(19,4),
    attr_bool_01 BOOLEAN, attr_bool_02 BOOLEAN,
    attr_json_01 JSONB, attr_json_02 JSONB,
    search_vector TSVECTOR,
    search_text TEXT,
    is_encrypted BOOLEAN DEFAULT FALSE,
    encryption_version INT DEFAULT 0,
    checksum VARCHAR(64),
    data_classification SMALLINT DEFAULT 1,
    archive_status SMALLINT DEFAULT 0,
    archive_date TIMESTAMPTZ,
    retention_until TIMESTAMPTZ,
    access_count INT DEFAULT 0,
    last_accessed_at TIMESTAMPTZ,
    popularity_score NUMERIC(10,4) DEFAULT 0,
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

COMMENT ON TABLE transactions IS '交易记录表（按月分区）：用户余额变动流水';

-- 创建初始分区 (2026年)
CREATE TABLE transactions_y2026m01 PARTITION OF transactions
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE transactions_y2026m02 PARTITION OF transactions
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE transactions_y2026m03 PARTITION OF transactions
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE transactions_y2026m04 PARTITION OF transactions
    FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE transactions_y2026m05 PARTITION OF transactions
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE transactions_y2026m06 PARTITION OF transactions
    FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE transactions_y2026m07 PARTITION OF transactions
    FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE transactions_y2026m08 PARTITION OF transactions
    FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE transactions_y2026m09 PARTITION OF transactions
    FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE transactions_y2026m10 PARTITION OF transactions
    FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
CREATE TABLE transactions_y2026m11 PARTITION OF transactions
    FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');
CREATE TABLE transactions_y2026m12 PARTITION OF transactions
    FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');

-- 创建默认分区 (捕获超出范围的数据)
CREATE TABLE transactions_default PARTITION OF transactions DEFAULT;

-- 为分区表创建索引
CREATE INDEX idx_transactions_user_created ON transactions(user_id, created_at DESC) WHERE is_active = true;
CREATE INDEX idx_transactions_type ON transactions(type) WHERE is_active = true;
CREATE INDEX idx_transactions_ref ON transactions(ref_type, ref_id) WHERE is_active = true AND ref_type IS NOT NULL;

-- ============================================================
-- 2. 审计日志表 - 按月RANGE分区
-- ============================================================

-- DROP TABLE IF EXISTS audit_logs CASCADE;

CREATE TABLE audit_logs (
    id BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by BIGINT,
    updated_by BIGINT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    version INT NOT NULL DEFAULT 1,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    org_id BIGINT,
    org_path LTREE,
    table_name VARCHAR(100) NOT NULL,
    record_id BIGINT NOT NULL,
    action SMALLINT NOT NULL CHECK (action IN (1, 2, 3)),
    old_data JSONB,
    new_data JSONB,
    changed_fields TEXT[],
    actor_id BIGINT,
    actor_ip VARCHAR(45),
    ext_json JSONB DEFAULT '{}',
    ext_jsonb_index JSONB DEFAULT '{}',
    tags TEXT[],
    attr_01 VARCHAR(255), attr_02 VARCHAR(255), attr_03 VARCHAR(255), attr_04 VARCHAR(255), attr_05 VARCHAR(255),
    attr_int_01 INT, attr_int_02 INT,
    attr_num_01 NUMERIC(19,4), attr_num_02 NUMERIC(19,4),
    attr_bool_01 BOOLEAN, attr_bool_02 BOOLEAN,
    attr_json_01 JSONB, attr_json_02 JSONB,
    search_vector TSVECTOR,
    search_text TEXT,
    is_encrypted BOOLEAN DEFAULT FALSE,
    encryption_version INT DEFAULT 0,
    checksum VARCHAR(64),
    data_classification SMALLINT DEFAULT 1,
    archive_status SMALLINT DEFAULT 0,
    archive_date TIMESTAMPTZ,
    retention_until TIMESTAMPTZ,
    access_count INT DEFAULT 0,
    last_accessed_at TIMESTAMPTZ,
    popularity_score NUMERIC(10,4) DEFAULT 0,
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

COMMENT ON TABLE audit_logs IS '审计日志表（按月分区）：数据变更记录';

-- 创建初始分区
CREATE TABLE audit_logs_y2026m01 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE audit_logs_y2026m02 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE audit_logs_y2026m03 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE audit_logs_y2026m04 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE audit_logs_y2026m05 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE audit_logs_y2026m06 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE audit_logs_y2026m07 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE audit_logs_y2026m08 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE audit_logs_y2026m09 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE audit_logs_y2026m10 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
CREATE TABLE audit_logs_y2026m11 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');
CREATE TABLE audit_logs_y2026m12 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');

CREATE TABLE audit_logs_default PARTITION OF audit_logs DEFAULT;

-- 为分区表创建索引
CREATE INDEX idx_audit_logs_table_record ON audit_logs(table_name, record_id) WHERE is_active = true;
CREATE INDEX idx_audit_logs_action ON audit_logs(action) WHERE is_active = true;
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id) WHERE is_active = true AND actor_id IS NOT NULL;

-- ============================================================
-- 3. 脚本执行记录表 - 按季度RANGE分区
-- ============================================================

-- DROP TABLE IF EXISTS script_executions CASCADE;

CREATE TABLE script_executions (
    id BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by BIGINT,
    updated_by BIGINT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    version INT NOT NULL DEFAULT 1,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    org_id BIGINT,
    org_path LTREE,
    script_id BIGINT NOT NULL,
    status SMALLINT NOT NULL DEFAULT 0 CHECK (status IN (0, 1, 2)),
    started_at TIMESTAMPTZ NOT NULL,
    finished_at TIMESTAMPTZ,
    duration_ms INT,
    output TEXT,
    error_msg TEXT,
    ext_json JSONB DEFAULT '{}',
    ext_jsonb_index JSONB DEFAULT '{}',
    tags TEXT[],
    attr_01 VARCHAR(255), attr_02 VARCHAR(255), attr_03 VARCHAR(255), attr_04 VARCHAR(255), attr_05 VARCHAR(255),
    attr_int_01 INT, attr_int_02 INT,
    attr_num_01 NUMERIC(19,4), attr_num_02 NUMERIC(19,4),
    attr_bool_01 BOOLEAN, attr_bool_02 BOOLEAN,
    attr_json_01 JSONB, attr_json_02 JSONB,
    search_vector TSVECTOR,
    search_text TEXT,
    is_encrypted BOOLEAN DEFAULT FALSE,
    encryption_version INT DEFAULT 0,
    checksum VARCHAR(64),
    data_classification SMALLINT DEFAULT 1,
    archive_status SMALLINT DEFAULT 0,
    archive_date TIMESTAMPTZ,
    retention_until TIMESTAMPTZ,
    access_count INT DEFAULT 0,
    last_accessed_at TIMESTAMPTZ,
    popularity_score NUMERIC(10,4) DEFAULT 0,
    PRIMARY KEY (id, started_at)
) PARTITION BY RANGE (started_at);

COMMENT ON TABLE script_executions IS '脚本执行记录表（按季度分区）：定时脚本执行历史';

-- 创建季度分区
CREATE TABLE script_executions_y2026q1 PARTITION OF script_executions
    FOR VALUES FROM ('2026-01-01') TO ('2026-04-01');
CREATE TABLE script_executions_y2026q2 PARTITION OF script_executions
    FOR VALUES FROM ('2026-04-01') TO ('2026-07-01');
CREATE TABLE script_executions_y2026q3 PARTITION OF script_executions
    FOR VALUES FROM ('2026-07-01') TO ('2026-10-01');
CREATE TABLE script_executions_y2026q4 PARTITION OF script_executions
    FOR VALUES FROM ('2026-10-01') TO ('2027-01-01');

CREATE TABLE script_executions_default PARTITION OF script_executions DEFAULT;

-- 为分区表创建索引
CREATE INDEX idx_executions_script ON script_executions(script_id, started_at DESC) WHERE is_active = true;
CREATE INDEX idx_executions_status ON script_executions(status) WHERE is_active = true;

-- ============================================================
-- 4. 分区管理函数 (替代pg_partman)
-- ============================================================

-- 自动创建下月分区函数
CREATE OR REPLACE FUNCTION fn_create_next_month_partitions()
RETURNS void AS $$
DECLARE
    next_month_start DATE;
    next_month_end DATE;
    partition_name TEXT;
    tbl TEXT;
    tables TEXT[] := ARRAY['transactions', 'audit_logs'];
BEGIN
    -- 计算下个月的起止日期
    next_month_start := DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month')::DATE;
    next_month_end := DATE_TRUNC('month', CURRENT_DATE + INTERVAL '2 month')::DATE;

    FOREACH tbl IN ARRAY tables
    LOOP
        partition_name := tbl || '_y' || TO_CHAR(next_month_start, 'YYYY') || 'm' || TO_CHAR(next_month_start, 'MM');

        -- 检查分区是否已存在
        IF NOT EXISTS (
            SELECT 1 FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE c.relname = partition_name AND n.nspname = 'public'
        ) THEN
            EXECUTE format(
                'CREATE TABLE %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
                partition_name, tbl, next_month_start, next_month_end
            );
            RAISE NOTICE 'Created partition: %', partition_name;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_create_next_month_partitions IS '自动创建下月分区函数';

-- 自动创建下季度分区函数
CREATE OR REPLACE FUNCTION fn_create_next_quarter_partitions()
RETURNS void AS $$
DECLARE
    next_quarter_start DATE;
    next_quarter_end DATE;
    partition_name TEXT;
    quarter INT;
BEGIN
    -- 计算下个季度
    quarter := EXTRACT(QUARTER FROM CURRENT_DATE) + 1;
    IF quarter > 4 THEN
        quarter := 1;
    END IF;

    next_quarter_start := MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::INT, (quarter - 1) * 3 + 1, 1);
    next_quarter_end := MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::INT, quarter * 3 + 1, 1);

    partition_name := 'script_executions_y' || TO_CHAR(next_quarter_start, 'YYYY') || 'q' || quarter;

    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = partition_name AND n.nspname = 'public'
    ) THEN
        EXECUTE format(
            'CREATE TABLE %I PARTITION OF script_executions FOR VALUES FROM (%L) TO (%L)',
            partition_name, next_quarter_start, next_quarter_end
        );
        RAISE NOTICE 'Created partition: %', partition_name;
    END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_create_next_quarter_partitions IS '自动创建下季度分区函数';

-- 删除过期分区函数 (保留12个月)
CREATE OR REPLACE FUNCTION fn_drop_old_partitions(retention_months INT DEFAULT 12)
RETURNS void AS $$
DECLARE
    cutoff_date DATE;
    partition_name TEXT;
    tbl TEXT;
    tables TEXT[] := ARRAY['transactions', 'audit_logs'];
    r RECORD;
BEGIN
    cutoff_date := DATE_TRUNC('month', CURRENT_DATE - (retention_months || ' months')::INTERVAL)::DATE;

    FOREACH tbl IN ARRAY tables
    LOOP
        FOR r IN
            SELECT c.relname
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE c.relname LIKE tbl || '_y%m%'
              AND n.nspname = 'public'
              AND c.relkind = 'r'
        LOOP
            -- 从分区名提取日期
            partition_name := r.relname;
            -- 简单判断：如果分区名中的年月早于cutoff_date，则删除
            IF SUBSTRING(partition_name FROM 'y(\d{4})m(\d{2})') IS NOT NULL THEN
                -- 这里需要更复杂的逻辑来判断，简化处理
                EXECUTE format('DROP TABLE IF EXISTS %I', partition_name);
                RAISE NOTICE 'Dropped old partition: %', partition_name;
            END IF;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_drop_old_partitions IS '删除过期分区函数';

-- ============================================================
-- 5. 定时任务 (通过pg_cron或外部调度)
-- ============================================================

-- 如果使用pg_cron扩展，可以创建定时任务
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 每月1号创建下月分区
-- SELECT cron.schedule('create-next-month-partitions', '0 0 1 * *', 'SELECT fn_create_next_month_partitions()');

-- 每季度初创建下季度分区
-- SELECT cron.schedule('create-next-quarter-partitions', '0 0 1 */3 *', 'SELECT fn_create_next_quarter_partitions()');

-- 每月15号删除过期分区
-- SELECT cron.schedule('drop-old-partitions', '0 0 15 * *', 'SELECT fn_drop_old_partitions(12)');
