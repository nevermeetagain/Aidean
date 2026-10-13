-- ============================================================
-- Aidean AI模型天梯图平台 - 完整数据库初始化脚本
-- 版本：v2.0
-- 生成日期: 2026-04-10 15:47:57
-- 数据库：PostgreSQL 16+
-- 表数量：98张
-- 特点：幂等执行、事务安全、UTF-8编码、错误处理
-- ============================================================

SET client_encoding = 'UTF8';

BEGIN;

-- ============================================================
-- FILE: 01_init_extensions.sql
-- ============================================================

-- ============================================================
-- Aidean AI模型天梯图平台 - 数据库初始化脚本
-- 01_init_extensions.sql
-- 功能：安装所有必需的PostgreSQL扩展
-- 环境：PostgreSQL 16+
-- 时区：Asia/Shanghai (UTC+8)
-- 编码：UTF-8
-- ============================================================

-- 1. UUID生成扩展 (用于UUIDv7主键)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
COMMENT ON EXTENSION "uuid-ossp" IS 'UUID生成函数，用于生成UUIDv7主键';

-- 2. 模糊搜索扩展 (用于LIKE优化和相似度搜索)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
COMMENT ON EXTENSION "pg_trgm" IS '三元组模糊搜索，用于模型名/厂商名模糊匹配';

-- 3. 树结构扩展 (用于组织路径/分类层级)
CREATE EXTENSION IF NOT EXISTS "ltree";
COMMENT ON EXTENSION "ltree" IS '树形结构标签路径，用于分类层级和组织路径';

-- 4. 地理信息扩展 (用于地理位置查询预留)
CREATE EXTENSION IF NOT EXISTS "postgis";
COMMENT ON EXTENSION "postgis" IS '地理信息系统扩展，用于地理位置查询预留';

-- 5. 全文搜索中文分词 (使用pg_jieba或zhparser)
-- 注意：zhparser需要在系统层面安装SCWS，Docker镜像中已预装
-- CREATE EXTENSION IF NOT EXISTS "zhparser";
-- COMMENT ON EXTENSION "zhparser" IS '中文全文搜索分词器';

-- 6. 分区管理扩展 (用于自动分区管理)
-- CREATE EXTENSION IF NOT EXISTS "pg_partman";
-- COMMENT ON EXTENSION "pg_partman" IS '分区表自动管理扩展';

-- 7. 加密函数扩展 (用于敏感数据加密)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
COMMENT ON EXTENSION "pgcrypto" IS '加密函数库，用于敏感数据加密';

-- 8. 数组操作扩展
CREATE EXTENSION IF NOT EXISTS "intarray";
COMMENT ON EXTENSION "intarray" IS '整数数组操作优化';

-- 9. 字典扩展 (用于全文搜索)
CREATE EXTENSION IF NOT EXISTS "unaccent";
COMMENT ON EXTENSION "unaccent" IS '去除重音符号，用于多语言搜索';

-- 验证扩展安装
SELECT extname, extversion FROM pg_extension WHERE extname IN (
    'uuid-ossp', 'pg_trgm', 'ltree', 'postgis', 'pgcrypto', 'intarray', 'unaccent'
) ORDER BY extname;


-- ============================================================
-- FILE: 02_create_schemas.sql
-- ============================================================

-- ============================================================
-- Aidean AI模型天梯图平台 - 数据库Schema创建
-- 02_create_schemas.sql
-- 功能：创建数据库Schema和角色
-- 环境：PostgreSQL 16+
-- ============================================================

-- 创建应用数据库（如果不存在）
-- CREATE DATABASE aidean
--     WITH
--     OWNER = root
--     ENCODING = 'UTF8'
--     LC_COLLATE = 'zh_CN.UTF-8'
--     LC_CTYPE = 'zh_CN.UTF-8'
--     TIMEZONE = 'Asia/Shanghai'
--     TEMPLATE = template0;

-- 设置时区
SET timezone = 'Asia/Shanghai';

-- 创建应用角色
DO $$
BEGIN
    -- 应用只读角色
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'aidean_reader') THEN
        CREATE ROLE aidean_reader WITH LOGIN PASSWORD 'reader_password_2026';
    END IF;

    -- 应用读写角色
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'aidean_writer') THEN
        CREATE ROLE aidean_writer WITH LOGIN PASSWORD 'writer_password_2026';
    END IF;

    -- 管理员角色
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'aidean_admin') THEN
        CREATE ROLE aidean_admin WITH LOGIN PASSWORD 'admin_password_2026';
    END IF;
END
$$;

-- 授予权限
GRANT CONNECT ON DATABASE aidean TO aidean_reader, aidean_writer, aidean_admin;
GRANT USAGE ON SCHEMA public TO aidean_reader, aidean_writer, aidean_admin;

-- 只读角色权限
GRANT SELECT ON ALL TABLES IN SCHEMA public TO aidean_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO aidean_reader;

-- 读写角色权限
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO aidean_writer;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO aidean_writer;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO aidean_writer;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO aidean_writer;

-- 管理员角色权限
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO aidean_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO aidean_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO aidean_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO aidean_admin;

-- 创建Schema注释
COMMENT ON SCHEMA public IS 'Aidean AI模型天梯图平台 - 主Schema';


-- ============================================================
-- FILE: 03_create_tables.sql
-- ============================================================

-- ============================================================
-- Aidean AI模型天梯图平台 - 表创建脚本
-- 03_create_tables.sql
-- 功能：创建所有业务表，包含完整注释和约束
-- 环境：PostgreSQL 16+
-- 时区：Asia/Shanghai (UTC+8)
-- ============================================================

-- ============================================================
-- 1. 用户域 (User Domain)
-- ============================================================

-- 1.1 用户表
CREATE TABLE users (
    -- 核心审计
    id BIGINT NOT NULL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by BIGINT,
    updated_by BIGINT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    version INT NOT NULL DEFAULT 1,

    -- 多租户预留
    tenant_id BIGINT NOT NULL DEFAULT 0,
    org_id BIGINT,
    org_path LTREE,

    -- 业务字段
    email VARCHAR(255),
    phone VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    nickname VARCHAR(100),
    avatar_url VARCHAR(500),
    role SMALLINT NOT NULL DEFAULT 0 CHECK (role IN (0, 1, 2, 3, 99)), -- 0:访客 1:用户 2:工具提供者 3:管理员 99:系统
    status SMALLINT NOT NULL DEFAULT 1 CHECK (status IN (0, 1, 2)), -- 0:禁用 1:正常 2:待验证
    balance NUMERIC(19,4) NOT NULL DEFAULT 0.0000 CHECK (balance >= 0),
    total_recharge NUMERIC(19,4) NOT NULL DEFAULT 0.0000,
    total_consumption NUMERIC(19,4) NOT NULL DEFAULT 0.0000,
    last_login_at TIMESTAMPTZ,
    login_count INT NOT NULL DEFAULT 0,

    -- 扩展预留
    ext_json JSONB DEFAULT '{}',
    ext_jsonb_index JSONB DEFAULT '{}',
    tags TEXT[],
    attr_01 VARCHAR(255), attr_02 VARCHAR(255), attr_03 VARCHAR(255), attr_04 VARCHAR(255), attr_05 VARCHAR(255),
    attr_int_01 INT, attr_int_02 INT,
    attr_num_01 NUMERIC(19,4), attr_num_02 NUMERIC(19,4),
    attr_bool_01 BOOLEAN, attr_bool_02 BOOLEAN,
    attr_json_01 JSONB, attr_json_02 JSONB,

    -- 搜索预留
    search_vector TSVECTOR,
    search_text TEXT,

    -- 安全预留
    is_encrypted BOOLEAN DEFAULT FALSE,
    encryption_version INT DEFAULT 0,
    checksum VARCHAR(64),
    data_classification SMALLINT DEFAULT 1,

    -- 生命周期
    archive_status SMALLINT DEFAULT 0,
    archive_date TIMESTAMPTZ,
    retention_until TIMESTAMPTZ,
    access_count INT DEFAULT 0,
    last_accessed_at TIMESTAMPTZ,
    popularity_score NUMERIC(10,4) DEFAULT 0
);

COMMENT ON TABLE users IS '用户表：存储平台所有用户信息';
COMMENT ON COLUMN users.role IS '角色：0-访客 1-普通用户 2-工具提供者 3-管理员 99-系统';
COMMENT ON COLUMN users.status IS '状态：0-禁用 1-正常 2-待验证';
COMMENT ON COLUMN users.balance IS '余额：单位元，必须>=0';

-- 1.2 订阅表
CREATE TABLE subscriptions (
    id BIGINT NOT NULL PRIMARY KEY,
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
    plan_type SMALLINT NOT NULL CHECK (plan_type IN (1, 2, 3)), -- 1:月度 2:季度 3:年度
    start_at TIMESTAMPTZ NOT NULL,
    expire_at TIMESTAMPTZ NOT NULL,
    auto_renew BOOLEAN NOT NULL DEFAULT FALSE,
    status SMALLINT NOT NULL DEFAULT 1 CHECK (status IN (0, 1, 2)), -- 0:已取消 1:生效中 2:已过期
    order_id BIGINT,

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
    popularity_score NUMERIC(10,4) DEFAULT 0
);

COMMENT ON TABLE subscriptions IS '订阅表：用户会员订阅记录';
COMMENT ON COLUMN subscriptions.plan_type IS '套餐类型：1-月度 2-季度 3-年度';

-- ============================================================
-- 2. 模型域 (Model Domain)
-- ============================================================

-- 2.1 模型商表
CREATE TABLE providers (
    id BIGINT NOT NULL PRIMARY KEY,
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

    name VARCHAR(100) NOT NULL,
    name_en VARCHAR(100),
    name_zh VARCHAR(100),
    slug VARCHAR(100) NOT NULL,
    logo_url VARCHAR(500),
    website VARCHAR(500),
    description TEXT,
    country VARCHAR(50),
    sort_order INT NOT NULL DEFAULT 0,
    status SMALLINT NOT NULL DEFAULT 1 CHECK (status IN (0, 1)),

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
    popularity_score NUMERIC(10,4) DEFAULT 0
);

COMMENT ON TABLE providers IS '模型商表：OpenAI/Anthropic/智谱等厂商信息';
COMMENT ON COLUMN providers.slug IS 'URL友好标识符，唯一';

-- 2.2 模型表
CREATE TABLE models (
    id BIGINT NOT NULL PRIMARY KEY,
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

    name VARCHAR(100) NOT NULL,
    name_en VARCHAR(100),
    name_zh VARCHAR(100),
    slug VARCHAR(100) NOT NULL,
    provider_id BIGINT NOT NULL,
    type SMALLINT NOT NULL CHECK (type IN (0, 1, 2, 3, 4, 5, 6, 7, 8)), -- 0:全部 1:对话 2:生图 3:嵌入 4:重排序 5:语音 6:视频 7:系统 8:多模态
    category SMALLINT NOT NULL DEFAULT 1 CHECK (category IN (1, 2)), -- 1:专业版 2:应用版
    params VARCHAR(50), -- 参数量，如 591B
    context_length INT, -- 上下文长度，如 192000
    is_open_source BOOLEAN NOT NULL DEFAULT FALSE,
    protocol SMALLINT CHECK (protocol IN (0, 1, 2)), -- 0:其他 1:OpenAI 2:Anthropic
    release_date DATE,
    status SMALLINT NOT NULL DEFAULT 1 CHECK (status IN (0, 1, 2)), -- 0:下架 1:正常 2:测试中
    geo_location GEOGRAPHY(POINT, 4326), -- 厂商地理位置预留

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
    popularity_score NUMERIC(10,4) DEFAULT 0
);

COMMENT ON TABLE models IS '模型表：大模型基本信息';
COMMENT ON COLUMN models.type IS '模型类型：0-全部 1-对话 2-生图 3-嵌入 4-重排序 5-语音 6-视频 7-系统 8-多模态';
COMMENT ON COLUMN models.category IS '分类：1-专业版 2-应用版';
COMMENT ON COLUMN models.protocol IS '协议：0-其他 1-OpenAI 2-Anthropic';

-- 2.3 模型价格表
CREATE TABLE model_prices (
    id BIGINT NOT NULL PRIMARY KEY,
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

    model_id BIGINT NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'CNY',
    input_price NUMERIC(19,4) NOT NULL DEFAULT 0,
    output_price NUMERIC(19,4) NOT NULL DEFAULT 0,
    cache_hit_price NUMERIC(19,4) NOT NULL DEFAULT 0,
    unit VARCHAR(50) NOT NULL DEFAULT '/M Tokens',
    effective_date TIMESTAMPTZ NOT NULL,
    expiry_date TIMESTAMPTZ,
    source VARCHAR(100),

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
    popularity_score NUMERIC(10,4) DEFAULT 0
);

COMMENT ON TABLE model_prices IS '模型价格表：记录各模型在不同时间/来源的价格';
COMMENT ON COLUMN model_prices.unit IS '计价单位，默认 /M Tokens';

-- 2.4 模型评分表
CREATE TABLE model_scores (
    id BIGINT NOT NULL PRIMARY KEY,
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

    model_id BIGINT NOT NULL,
    official_score NUMERIC(10,4) DEFAULT 0,
    practical_score NUMERIC(10,4) DEFAULT 0,
    reputation_score NUMERIC(10,4) DEFAULT 0,
    self_test_score NUMERIC(10,4) DEFAULT 0,
    total_score NUMERIC(10,4) DEFAULT 0,
    weight_config JSONB,
    calculated_at TIMESTAMPTZ,

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
    popularity_score NUMERIC(10,4) DEFAULT 0
);

COMMENT ON TABLE model_scores IS '模型评分表：四维评分及综合得分';

-- 2.5 基准测试表
CREATE TABLE benchmarks (
    id BIGINT NOT NULL PRIMARY KEY,
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

    model_id BIGINT NOT NULL,
    benchmark_name VARCHAR(100) NOT NULL,
    score NUMERIC(10,4) NOT NULL,
    max_score NUMERIC(10,4),
    source VARCHAR(100),
    source_url VARCHAR(500),
    recorded_at TIMESTAMPTZ,
    raw_data JSONB,

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
    popularity_score NUMERIC(10,4) DEFAULT 0
);

COMMENT ON TABLE benchmarks IS '基准测试表：各模型在不同基准测试中的得分';

-- 2.6 天梯排名表
CREATE TABLE ladder_rankings (
    id BIGINT NOT NULL PRIMARY KEY,
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

    model_id BIGINT NOT NULL,
    ladder_type SMALLINT NOT NULL CHECK (ladder_type IN (1, 2, 3, 4)), -- 1:性能 2:性价比 3:开源 4:手机端
    rank INT NOT NULL,
    score NUMERIC(10,4) NOT NULL,
    snapshot_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'hidden', 'deprecated')), -- 排名记录状态

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
    popularity_score NUMERIC(10,4) DEFAULT 0
);

COMMENT ON TABLE ladder_rankings IS '天梯排名表：各榜单的排名数据快照，支持历史版本';
COMMENT ON COLUMN ladder_rankings.ladder_type IS '榜单类型：1-性能 2-性价比 3-开源 4-手机端';
COMMENT ON COLUMN ladder_rankings.status IS '排名记录状态：active-正常显示 hidden-隐藏 deprecated-已弃用';

-- 2.7 天梯配置表
CREATE TABLE ladder_configs (
    id BIGINT NOT NULL PRIMARY KEY,
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

    config_key VARCHAR(100) NOT NULL,
    config_value JSONB NOT NULL,
    description TEXT,
    updated_by BIGINT,

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
    popularity_score NUMERIC(10,4) DEFAULT 0
);

COMMENT ON TABLE ladder_configs IS '天梯配置表：权重/算法配置';

-- ============================================================
-- 3. 测评域 (Evaluation Domain)
-- ============================================================

-- 3.1 测评任务表
CREATE TABLE evaluations (
    id BIGINT NOT NULL PRIMARY KEY,
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

    -- 基本信息
    title VARCHAR(255),                         -- 评测标题
    description TEXT,                           -- 评测描述
    prompt TEXT NOT NULL,                       -- 评测提示词

    -- 评测类型配置
    eval_type VARCHAR(20) DEFAULT 'single' CHECK (eval_type IN ('single', 'comparison', 'batch')), -- 单模型/对比/批量
    comparison_mode VARCHAR(20),                -- parallel | sequential | ab_test

    -- 评测参数
    config JSONB DEFAULT '{}',                  -- 温度、max_tokens等参数
    criteria JSONB DEFAULT '{}',                -- 评分标准定义
    metadata JSONB DEFAULT '{}',                -- 环境信息(设备/网络/时间等)

    -- 结果汇总
    results JSONB DEFAULT '{}',                 -- 汇总统计结果
    winner_model_id BIGINT,                     -- 胜出模型ID

    -- 执行状态
    status SMALLINT NOT NULL DEFAULT 0 CHECK (status IN (0, 1, 2, 3)), -- 0:待执行 1:执行中 2:已完成 3:失败
    progress INT DEFAULT 0 CHECK (progress >= 0 AND progress <= 100), -- 进度0-100
    is_paid BOOLEAN NOT NULL DEFAULT FALSE,
    cost NUMERIC(19,4) NOT NULL DEFAULT 0,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
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
    popularity_score NUMERIC(10,4) DEFAULT 0
);

COMMENT ON TABLE evaluations IS '测评任务表：用户发起的模型评测任务，支持单模型/对比/批量评测';
COMMENT ON COLUMN evaluations.title IS '评测任务标题';
COMMENT ON COLUMN evaluations.description IS '评测任务描述';
COMMENT ON COLUMN evaluations.eval_type IS '评测类型：single-单模型 comparison-对比 batch-批量';
COMMENT ON COLUMN evaluations.comparison_mode IS '对比模式：parallel-并行 sequential-顺序 ab_test-AB测试';
COMMENT ON COLUMN evaluations.config IS '评测参数（温度、max_tokens等）';
COMMENT ON COLUMN evaluations.criteria IS '评分标准定义';
COMMENT ON COLUMN evaluations.metadata IS '评测环境元数据（设备/网络/时间等）';
COMMENT ON COLUMN evaluations.results IS '评测汇总结果';
COMMENT ON COLUMN evaluations.winner_model_id IS '胜出模型ID（对比评测时）';
COMMENT ON COLUMN evaluations.progress IS '执行进度 0-100';

-- 3.2 测评结果表
CREATE TABLE evaluation_results (
    id BIGINT NOT NULL PRIMARY KEY,
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

    evaluation_id BIGINT NOT NULL,
    model_id BIGINT NOT NULL,
    output_text TEXT,
    tokens_input INT,
    tokens_output INT,
    latency_ms INT,
    cost NUMERIC(19,4) DEFAULT 0,
    status SMALLINT NOT NULL DEFAULT 0 CHECK (status IN (0, 1, 2)), -- 0:待执行 1:成功 2:失败

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
    popularity_score NUMERIC(10,4) DEFAULT 0
);

COMMENT ON TABLE evaluation_results IS '测评结果表：单个模型在测评中的结果';

-- 3.3 测评模型关联表
CREATE TABLE evaluation_models (
    id BIGINT NOT NULL PRIMARY KEY,
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

    evaluation_id BIGINT NOT NULL,
    model_id BIGINT NOT NULL,

    -- 评测输出内容（支持思考过程）
    response TEXT,                              -- 最终输出
    thinking TEXT,                              -- 思考过程（reasoning模型思维链）
    reasoning_content TEXT,                     -- 详细推理内容

    -- Token用量详细记录
    tokens_input INT DEFAULT 0,                 -- 输入tokens
    tokens_output INT DEFAULT 0,                -- 输出tokens
    tokens_thinking INT DEFAULT 0,                -- 思考tokens
    tokens_total INT DEFAULT 0,                 -- 总计tokens

    -- 性能指标
    latency_ms INT,                             -- 响应时间(ms)
    ttft_ms INT,                                -- 首字延迟(ms)

    -- 多维度评分
    score NUMERIC(5,2),                         -- 总分
    accuracy_score NUMERIC(5,2),                -- 准确性
    relevance_score NUMERIC(5,2),               -- 相关性
    coherence_score NUMERIC(5,2),               -- 连贯性
    creativity_score NUMERIC(5,2),              -- 创造力

    -- 原始响应与状态
    raw_response JSONB DEFAULT '{}',            -- 完整API响应
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    error_message TEXT,                         -- 错误信息

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
    popularity_score NUMERIC(10,4) DEFAULT 0
);

COMMENT ON TABLE evaluation_models IS '测评模型关联表：测评任务与参与模型的多对多关系，支持思考过程记录';
COMMENT ON COLUMN evaluation_models.response IS '模型最终输出内容';
COMMENT ON COLUMN evaluation_models.thinking IS '思考过程（reasoning模型的思维链）';
COMMENT ON COLUMN evaluation_models.reasoning_content IS '详细推理内容';
COMMENT ON COLUMN evaluation_models.tokens_input IS '输入token数量';
COMMENT ON COLUMN evaluation_models.tokens_output IS '输出token数量';
COMMENT ON COLUMN evaluation_models.tokens_thinking IS '思考过程token数量';
COMMENT ON COLUMN evaluation_models.tokens_total IS '总token数量';
COMMENT ON COLUMN evaluation_models.latency_ms IS '响应延迟（毫秒）';
COMMENT ON COLUMN evaluation_models.ttft_ms IS '首字延迟（毫秒）';
COMMENT ON COLUMN evaluation_models.score IS '综合评分';
COMMENT ON COLUMN evaluation_models.accuracy_score IS '准确性评分';
COMMENT ON COLUMN evaluation_models.relevance_score IS '相关性评分';
COMMENT ON COLUMN evaluation_models.coherence_score IS '连贯性评分';
COMMENT ON COLUMN evaluation_models.creativity_score IS '创造力评分';
COMMENT ON COLUMN evaluation_models.raw_response IS '完整原始API响应（JSON）';
COMMENT ON COLUMN evaluation_models.status IS '状态：pending-待执行 running-执行中 completed-已完成 failed-失败';
COMMENT ON COLUMN evaluation_models.error_message IS '错误信息';

-- ============================================================
-- 4. 财务域 (Finance Domain)
-- ============================================================

-- 4.1 交易记录表
CREATE TABLE transactions (
    id BIGINT NOT NULL PRIMARY KEY,
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
    type SMALLINT NOT NULL CHECK (type IN (1, 2, 3, 4)), -- 1:充值 2:消费 3:退款 4:系统调整
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
    popularity_score NUMERIC(10,4) DEFAULT 0
);

COMMENT ON TABLE transactions IS '交易记录表：用户余额变动流水';
COMMENT ON COLUMN transactions.type IS '交易类型：1-充值 2-消费 3-退款 4-系统调整';

-- 4.2 充值订单表
CREATE TABLE recharge_orders (
    id BIGINT NOT NULL PRIMARY KEY,
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
    order_no VARCHAR(64) NOT NULL,
    amount NUMERIC(19,4) NOT NULL,
    bonus_amount NUMERIC(19,4) DEFAULT 0,
    pay_method SMALLINT CHECK (pay_method IN (1, 2)), -- 1:微信 2:支付宝
    status SMALLINT NOT NULL DEFAULT 0 CHECK (status IN (0, 1, 2, 3)), -- 0:待支付 1:已支付 2:已取消 3:已退款
    paid_at TIMESTAMPTZ,
    expire_at TIMESTAMPTZ,
    transaction_id BIGINT,

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
    popularity_score NUMERIC(10,4) DEFAULT 0
);

COMMENT ON TABLE recharge_orders IS '充值订单表：用户充值订单记录';

-- ============================================================
-- 5. 收藏域 (Favorite Domain)
-- ============================================================

-- 5.1 收藏表
CREATE TABLE favorites (
    id BIGINT NOT NULL PRIMARY KEY,
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
    target_id BIGINT NOT NULL,
    target_type SMALLINT NOT NULL CHECK (target_type IN (1, 2, 3, 4, 5)), -- 1:模型 2:Skill 3:MCP 4:Agent 5:API站
    note TEXT,

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
    popularity_score NUMERIC(10,4) DEFAULT 0
);

COMMENT ON TABLE favorites IS '收藏表：用户收藏的模型/工具等';
COMMENT ON COLUMN favorites.target_type IS '收藏类型：1-模型 2-Skill 3-MCP 4-Agent 5-API站';

-- ============================================================
-- 6. 扩展天图表 (Extension Ladder Domain)
-- ============================================================

-- 6.1 Skill技能表
CREATE TABLE skills (
    id BIGINT NOT NULL PRIMARY KEY,
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

    name VARCHAR(100) NOT NULL,
    protocol VARCHAR(50),
    description TEXT,
    install_count INT NOT NULL DEFAULT 0,
    rating NUMERIC(3,2) DEFAULT 0,
    tags TEXT[],
    source_url VARCHAR(500),
    status SMALLINT NOT NULL DEFAULT 1 CHECK (status IN (0, 1)),

    ext_json JSONB DEFAULT '{}',
    ext_jsonb_index JSONB DEFAULT '{}',
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
    popularity_score NUMERIC(10,4) DEFAULT 0
);

COMMENT ON TABLE skills IS 'Skill技能表：Skill技能信息';

-- 6.2 MCP服务器表
CREATE TABLE mcp_servers (
    id BIGINT NOT NULL PRIMARY KEY,
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

    name VARCHAR(100) NOT NULL,
    command VARCHAR(500),
    description TEXT,
    tool_count INT NOT NULL DEFAULT 0,
    stability_score NUMERIC(5,2) DEFAULT 0,
    usage_count INT NOT NULL DEFAULT 0,
    config_template JSONB,
    status SMALLINT NOT NULL DEFAULT 1 CHECK (status IN (0, 1)),

    ext_json JSONB DEFAULT '{}',
    ext_jsonb_index JSONB DEFAULT '{}',
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
    popularity_score NUMERIC(10,4) DEFAULT 0
);

COMMENT ON TABLE mcp_servers IS 'MCP服务器表：MCP服务信息';

-- 6.3 Agent智能体表
CREATE TABLE agents (
    id BIGINT NOT NULL PRIMARY KEY,
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

    name VARCHAR(100) NOT NULL,
    framework VARCHAR(50),
    description TEXT,
    capabilities JSONB,
    activity_score NUMERIC(5,2) DEFAULT 0,
    completion_rate NUMERIC(5,2) DEFAULT 0,
    status SMALLINT NOT NULL DEFAULT 1 CHECK (status IN (0, 1)),

    ext_json JSONB DEFAULT '{}',
    ext_jsonb_index JSONB DEFAULT '{}',
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
    popularity_score NUMERIC(10,4) DEFAULT 0
);

COMMENT ON TABLE agents IS 'Agent智能体表：Agent智能体信息';

-- 6.4 API中转站表
CREATE TABLE api_stations (
    id BIGINT NOT NULL PRIMARY KEY,
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

    name VARCHAR(100) NOT NULL,
    name_en VARCHAR(100),
    website VARCHAR(500),
    base_url VARCHAR(500) NOT NULL,
    description TEXT,
    stability_score NUMERIC(5,2) DEFAULT 0,
    status SMALLINT NOT NULL DEFAULT 1 CHECK (status IN (0, 1)),

    ext_json JSONB DEFAULT '{}',
    ext_jsonb_index JSONB DEFAULT '{}',
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
    popularity_score NUMERIC(10,4) DEFAULT 0
);

COMMENT ON TABLE api_stations IS 'API中转站表：API中转站信息';

-- 6.5 API站模型关联表
CREATE TABLE api_station_models (
    id BIGINT NOT NULL PRIMARY KEY,
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

    station_id BIGINT NOT NULL,
    model_id BIGINT NOT NULL,
    external_model_id VARCHAR(100),
    input_price NUMERIC(19,4),
    output_price NUMERIC(19,4),
    rate_limit VARCHAR(50),
    status SMALLINT NOT NULL DEFAULT 1 CHECK (status IN (0, 1)),

    ext_json JSONB DEFAULT '{}',
    ext_jsonb_index JSONB DEFAULT '{}',
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
    popularity_score NUMERIC(10,4) DEFAULT 0
);

COMMENT ON TABLE api_station_models IS 'API站模型关联表：中转站支持的模型及价格';

-- ============================================================
-- 7. 系统管理域 (System Domain)
-- ============================================================

-- 7.1 功能开关表
CREATE TABLE feature_flags (
    id BIGINT NOT NULL PRIMARY KEY,
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

    key VARCHAR(100) NOT NULL,
    name VARCHAR(100) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    config JSONB,

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
    popularity_score NUMERIC(10,4) DEFAULT 0
);

COMMENT ON TABLE feature_flags IS '功能开关表：模块启用/禁用控制';

-- 7.2 定时脚本表
CREATE TABLE scheduled_scripts (
    id BIGINT NOT NULL PRIMARY KEY,
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

    name VARCHAR(100) NOT NULL,
    script_path VARCHAR(500) NOT NULL,
    params JSONB,
    cron_expression VARCHAR(50),
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,

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
    popularity_score NUMERIC(10,4) DEFAULT 0
);

COMMENT ON TABLE scheduled_scripts IS '定时脚本表：数据采集脚本配置';

-- 7.3 脚本执行记录表
CREATE TABLE script_executions (
    id BIGINT NOT NULL PRIMARY KEY,
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
    status SMALLINT NOT NULL DEFAULT 0 CHECK (status IN (0, 1, 2)), -- 0:执行中 1:成功 2:失败
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
    popularity_score NUMERIC(10,4) DEFAULT 0
);

COMMENT ON TABLE script_executions IS '脚本执行记录表：定时脚本执行历史';

-- 7.4 审计日志表
CREATE TABLE audit_logs (
    id BIGINT NOT NULL PRIMARY KEY,
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
    action SMALLINT NOT NULL CHECK (action IN (1, 2, 3)), -- 1:INSERT 2:UPDATE 3:DELETE
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
    popularity_score NUMERIC(10,4) DEFAULT 0
);

COMMENT ON TABLE audit_logs IS '审计日志表：数据变更记录';
COMMENT ON COLUMN audit_logs.action IS '操作类型：1-INSERT 2-UPDATE 3-DELETE';

-- 7.5 字典表
CREATE TABLE dict_items (
    id BIGINT NOT NULL PRIMARY KEY,
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

    category VARCHAR(50) NOT NULL,
    code VARCHAR(50) NOT NULL,
    label VARCHAR(100) NOT NULL,
    label_en VARCHAR(100),
    sort_order INT NOT NULL DEFAULT 0,

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
    popularity_score NUMERIC(10,4) DEFAULT 0
);

COMMENT ON TABLE dict_items IS '字典表：枚举值字典';

-- 7.6 系统配置表
CREATE TABLE system_configs (
    id BIGINT NOT NULL PRIMARY KEY,
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

    config_key VARCHAR(100) NOT NULL,
    config_value TEXT NOT NULL,
    description TEXT,
    is_secret BOOLEAN NOT NULL DEFAULT FALSE,

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
    popularity_score NUMERIC(10,4) DEFAULT 0
);

COMMENT ON TABLE system_configs IS '系统配置表：全局配置参数';

-- 7.7 资讯表
CREATE TABLE news (
    id BIGINT NOT NULL PRIMARY KEY,
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

    title VARCHAR(255) NOT NULL,
    title_en VARCHAR(255),
    summary TEXT,
    content TEXT,
    source VARCHAR(100),
    source_url VARCHAR(500),
    published_at TIMESTAMPTZ,
    status SMALLINT NOT NULL DEFAULT 0 CHECK (status IN (0, 1, 2)), -- 0:草稿 1:已发布 2:已下架

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
    popularity_score NUMERIC(10,4) DEFAULT 0
);

COMMENT ON TABLE news IS '资讯表：AI行业资讯';

-- ============================================================
-- 8. 数据审计与回滚域 (Audit & Rollback Domain)
-- ============================================================

-- 8.1 同步批次表
CREATE TABLE sync_batches (
    id BIGINT NOT NULL PRIMARY KEY,
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

    -- 批次信息
    batch_code VARCHAR(100) NOT NULL UNIQUE,
    source VARCHAR(50), -- official_api | crawler | manual
    source_url VARCHAR(500),

    -- 统计
    total_records INT NOT NULL DEFAULT 0,
    success_records INT NOT NULL DEFAULT 0,
    failed_records INT NOT NULL DEFAULT 0,

    -- 状态: running | completed | failed | partial
    status VARCHAR(20) NOT NULL DEFAULT 'running',

    -- 校验结果
    validation_summary JSONB DEFAULT '{}',
    error_samples JSONB DEFAULT '{}',

    -- 操作人
    operator_id BIGINT,
    operator_notes TEXT,

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
    popularity_score NUMERIC(10,4) DEFAULT 0
);

COMMENT ON TABLE sync_batches IS '同步批次表：追踪模型数据同步批次，支持批量回滚';
COMMENT ON COLUMN sync_batches.batch_code IS '批次唯一编号';
COMMENT ON COLUMN sync_batches.status IS '状态：running-执行中 completed-完成 failed-失败 partial-部分失败';

-- 8.2 模型变更历史表
CREATE TABLE model_change_logs (
    id BIGINT NOT NULL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by BIGINT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    tenant_id BIGINT NOT NULL DEFAULT 0,

    -- 关联模型
    model_id BIGINT NOT NULL,
    sync_batch_id BIGINT,

    -- 变更类型: CREATE | UPDATE | DELETE | SYNC
    change_type VARCHAR(20) NOT NULL,

    -- 数据快照
    before_data JSONB, -- 变更前
    after_data JSONB, -- 变更后
    changed_fields TEXT[], -- 变更字段列表

    -- 变更来源
    source VARCHAR(50), -- sync_script | admin_manual | api
    source_ip VARCHAR(50),
    operator_id BIGINT,

    -- 回滚状态
    is_reverted BOOLEAN NOT NULL DEFAULT FALSE,
    reverted_at TIMESTAMPTZ,
    revert_reason TEXT,

    -- 校验状态: pending | valid | invalid
    validation_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    checksum VARCHAR(64),

    ext_json JSONB DEFAULT '{}',
    tags TEXT[]
);

COMMENT ON TABLE model_change_logs IS '模型变更历史表：支持字段级变更追踪和精准回滚';
COMMENT ON COLUMN model_change_logs.change_type IS '变更类型：CREATE-创建 UPDATE-更新 DELETE-删除 SYNC-同步';
COMMENT ON COLUMN model_change_logs.before_data IS '变更前完整数据快照';
COMMENT ON COLUMN model_change_logs.after_data IS '变更后完整数据快照';
COMMENT ON COLUMN model_change_logs.changed_fields IS '变更字段名列表，用于快速定位';
COMMENT ON COLUMN model_change_logs.is_reverted IS '是否已回滚';
COMMENT ON COLUMN model_change_logs.validation_status IS '校验状态：pending-待校验 valid-有效 invalid-无效';

-- 8.3 自定义评分指标表
CREATE TABLE custom_metrics (
    id BIGINT NOT NULL PRIMARY KEY,
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

    -- 唯一编码
    metric_code VARCHAR(100) NOT NULL UNIQUE,

    -- 基础信息
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- 计算公式
    formula_expression VARCHAR(500), -- 如：reasoning_score / (price_input * 100)
    formula_json JSONB DEFAULT '{}', -- 结构化存储

    -- 数据源配置
    source_tables TEXT[],
    source_fields TEXT[],

    -- 计算配置
    calc_frequency VARCHAR(20) NOT NULL DEFAULT 'on_demand', -- on_demand | realtime | hourly | daily
    last_calculated_at TIMESTAMPTZ,
    cache_duration INT NOT NULL DEFAULT 300, -- 缓存秒数

    -- 状态: active | disabled | archived
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    is_public BOOLEAN NOT NULL DEFAULT FALSE,

    -- 创建者
    user_id BIGINT,

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
    popularity_score NUMERIC(10,4) DEFAULT 0
);

COMMENT ON TABLE custom_metrics IS '自定义评分指标表：用户可配置自定义评分公式';
COMMENT ON COLUMN custom_metrics.metric_code IS '指标唯一编码';
COMMENT ON COLUMN custom_metrics.formula_expression IS '公式表达式，如：reasoning_score / (price_input * 100)';
COMMENT ON COLUMN custom_metrics.formula_json IS '公式结构化JSON存储';
COMMENT ON COLUMN custom_metrics.calc_frequency IS '计算频率：on_demand-按需 realtime-实时 hourly-每小时 daily-每天';
COMMENT ON COLUMN custom_metrics.cache_duration IS '缓存时长（秒），默认300秒';
COMMENT ON COLUMN custom_metrics.is_public IS '是否公开给所有用户';

-- 8.4 自定义指标值表
CREATE TABLE custom_metric_values (
    id BIGINT NOT NULL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    tenant_id BIGINT NOT NULL DEFAULT 0,

    -- 关联
    metric_id BIGINT NOT NULL,
    model_id BIGINT NOT NULL,

    -- 计算值
    raw_value NUMERIC(19,6), -- 原始计算结果
    normalized_value NUMERIC(5,2), -- 归一化后（0-100）
    rank_position INT, -- 在该指标下的排名

    -- 计算详情
    calc_details JSONB DEFAULT '{}', -- { numerator_value, denominator_value, calc_at }

    -- 缓存控制
    calc_version INT NOT NULL DEFAULT 1,
    expires_at TIMESTAMPTZ, -- 缓存过期时间

    -- 状态: active | stale | error
    status VARCHAR(20) NOT NULL DEFAULT 'active',

    ext_json JSONB DEFAULT '{}',
    tags TEXT[],

    -- 唯一约束
    CONSTRAINT uk_metric_model_version UNIQUE (metric_id, model_id, calc_version)
);

COMMENT ON TABLE custom_metric_values IS '自定义指标值表：预计算结果，支持快速查询和缓存';
COMMENT ON COLUMN custom_metric_values.raw_value IS '原始计算结果';
COMMENT ON COLUMN custom_metric_values.normalized_value IS '归一化值（0-100），用于排名显示';
COMMENT ON COLUMN custom_metric_values.rank_position IS '在该指标下的排名';
COMMENT ON COLUMN custom_metric_values.calc_details IS '计算详情JSON，包含分子/分母/计算时间等';
COMMENT ON COLUMN custom_metric_values.calc_version IS '计算版本（公式变更时递增）';
COMMENT ON COLUMN custom_metric_values.expires_at IS '缓存过期时间';

-- ============================================================
-- 9. 资源管理扩展域 (Resource Management Extensions)
-- ============================================================

-- 9.1 厂商关系表
CREATE TABLE vendor_relations (
    id BIGINT NOT NULL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    tenant_id BIGINT NOT NULL DEFAULT 0,

    parent_vendor_id BIGINT NOT NULL,
    child_vendor_id BIGINT NOT NULL,
    relation_type VARCHAR(20) NOT NULL, -- merge | acquire | partner | subsidiary
    relation_start DATE,
    relation_end DATE,
    is_current BOOLEAN DEFAULT TRUE,
    description TEXT,

    CONSTRAINT uk_vendor_relation UNIQUE (parent_vendor_id, child_vendor_id, relation_type),
    CONSTRAINT chk_relation_type CHECK (relation_type IN ('merge', 'acquire', 'partner', 'subsidiary'))
);

COMMENT ON TABLE vendor_relations IS '厂商关系表：支持厂商合并、收购等关系追踪';
COMMENT ON COLUMN vendor_relations.relation_type IS '关系类型：merge-合并 acquire-收购 partner-合作 subsidiary-子公司';
COMMENT ON COLUMN vendor_relations.is_current IS '是否为当前有效关系';

-- 9.2 模型版本链表
CREATE TABLE model_versions (
    id BIGINT NOT NULL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    tenant_id BIGINT NOT NULL DEFAULT 0,

    model_id BIGINT NOT NULL,
    parent_model_id BIGINT UNIQUE, -- 每个模型只能有一个父版本
    version_name VARCHAR(100), -- v1, v2, v2.5
    version_sequence INT NOT NULL DEFAULT 1,
    change_summary TEXT,
    inherited_fields TEXT[],
    breaking_changes BOOLEAN DEFAULT FALSE,

    CONSTRAINT uk_model_version UNIQUE (model_id, version_sequence)
);

COMMENT ON TABLE model_versions IS '模型版本链表：追踪模型版本演进';
COMMENT ON COLUMN model_versions.version_name IS '版本名称，如v1、v2、v2.5';
COMMENT ON COLUMN model_versions.version_sequence IS '版本序号';
COMMENT ON COLUMN model_versions.change_summary IS '版本变更摘要';
COMMENT ON COLUMN model_versions.inherited_fields IS '从父版本继承的字段列表';
COMMENT ON COLUMN model_versions.breaking_changes IS '是否有破坏性变更';

-- 9.3 用户收藏表
CREATE TABLE user_collections (
    id BIGINT NOT NULL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    tenant_id BIGINT NOT NULL DEFAULT 0,

    user_id BIGINT NOT NULL,
    collection_type VARCHAR(20) NOT NULL, -- model | skill | mcp | chart | document
    resource_id BIGINT NOT NULL,
    resource_type VARCHAR(50) NOT NULL, -- ai_models | skills | mcp_servers | ladder_charts | documents
    collection_name VARCHAR(255),
    description TEXT,
    tags TEXT[],
    is_public BOOLEAN DEFAULT FALSE,
    sort_order INT DEFAULT 0,

    CONSTRAINT uk_user_collection UNIQUE (user_id, collection_type, resource_id),
    CONSTRAINT chk_collection_type CHECK (collection_type IN ('model', 'skill', 'mcp', 'chart', 'document'))
);

COMMENT ON TABLE user_collections IS '用户收藏表：支持模型/技能/MCP/天梯图/文档收藏';
COMMENT ON COLUMN user_collections.collection_type IS '收藏类型：model-模型 skill-技能 mcp-MCP chart-天梯图 document-文档';
COMMENT ON COLUMN user_collections.resource_type IS '资源类型表名';
COMMENT ON COLUMN user_collections.is_public IS '是否公开分享';

-- 9.4 价格提醒表
CREATE TABLE price_alerts (
    id BIGINT NOT NULL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    tenant_id BIGINT NOT NULL DEFAULT 0,

    user_id BIGINT NOT NULL,
    model_id BIGINT NOT NULL,
    alert_type VARCHAR(20) NOT NULL, -- price_drop | price_increase | below_threshold | above_threshold
    threshold_value NUMERIC(19,6),

    is_triggered BOOLEAN DEFAULT FALSE,
    triggered_at TIMESTAMPTZ,
    notification_sent BOOLEAN DEFAULT FALSE,

    CONSTRAINT chk_alert_type CHECK (alert_type IN ('price_drop', 'price_increase', 'below_threshold', 'above_threshold'))
);

COMMENT ON TABLE price_alerts IS '价格提醒表：用户订阅价格变动提醒';
COMMENT ON COLUMN price_alerts.alert_type IS '提醒类型：price_drop-降价 price_increase-涨价 below_threshold-低于阈值 above_threshold-高于阈值';
COMMENT ON COLUMN price_alerts.threshold_value IS '触发阈值';
COMMENT ON COLUMN price_alerts.is_triggered IS '是否已触发';
COMMENT ON COLUMN price_alerts.notification_sent IS '是否已发送通知';

-- 9.5 API使用统计表
CREATE TABLE model_api_usage (
    id BIGINT NOT NULL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    tenant_id BIGINT NOT NULL DEFAULT 0,

    model_id BIGINT NOT NULL,
    user_id BIGINT,
    api_endpoint VARCHAR(255),
    request_count INT NOT NULL DEFAULT 0,
    token_input INT NOT NULL DEFAULT 0,
    token_output INT NOT NULL DEFAULT 0,

    latency_avg NUMERIC(10,2),
    latency_p95 NUMERIC(10,2),
    latency_p99 NUMERIC(10,2),
    error_rate NUMERIC(5,4),

    usage_date DATE NOT NULL,
    hour_of_day INT,

    CONSTRAINT uk_model_usage UNIQUE (model_id, user_id, usage_date, hour_of_day),
    CONSTRAINT chk_hour CHECK (hour_of_day IS NULL OR (hour_of_day >= 0 AND hour_of_day <= 23))
);

COMMENT ON TABLE model_api_usage IS 'API使用统计表：追踪模型API调用情况';
COMMENT ON COLUMN model_api_usage.request_count IS '请求次数';
COMMENT ON COLUMN model_api_usage.token_input IS '输入token数';
COMMENT ON COLUMN model_api_usage.token_output IS '输出token数';
COMMENT ON COLUMN model_api_usage.latency_avg IS '平均延迟(ms)';
COMMENT ON COLUMN model_api_usage.latency_p95 IS 'P95延迟(ms)';
COMMENT ON COLUMN model_api_usage.latency_p99 IS 'P99延迟(ms)';
COMMENT ON COLUMN model_api_usage.error_rate IS '错误率(0-1)';
COMMENT ON COLUMN model_api_usage.usage_date IS '使用日期';
COMMENT ON COLUMN model_api_usage.hour_of_day IS '小时(0-23)';

-- 9.6 资源访问日志表
CREATE TABLE resource_access_logs (
    id BIGINT NOT NULL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    tenant_id BIGINT NOT NULL DEFAULT 0,

    user_id BIGINT,
    resource_type VARCHAR(50) NOT NULL, -- model | skill | mcp | document | chart
    resource_id BIGINT NOT NULL,
    action VARCHAR(50) NOT NULL, -- view | download | favorite | share | compare

    ip_address VARCHAR(50),
    user_agent TEXT,
    referrer TEXT,
    session_id VARCHAR(100),
    metadata JSONB DEFAULT '{}',

    CONSTRAINT chk_resource_type CHECK (resource_type IN ('model', 'skill', 'mcp', 'document', 'chart')),
    CONSTRAINT chk_action CHECK (action IN ('view', 'download', 'favorite', 'share', 'compare'))
);

COMMENT ON TABLE resource_access_logs IS '资源访问日志表：追踪用户对资源的访问行为';
COMMENT ON COLUMN resource_access_logs.resource_type IS '资源类型：model-模型 skill-技能 mcp-MCP document-文档 chart-天梯图';
COMMENT ON COLUMN resource_access_logs.action IS '行为：view-查看 download-下载 favorite-收藏 share-分享 compare-对比';
COMMENT ON COLUMN resource_access_logs.session_id IS '会话ID，用于关联同一用户的连续操作';
COMMENT ON COLUMN resource_access_logs.metadata IS '额外上下文信息JSON';

-- 9.7 标签表
CREATE TABLE tags (
    id BIGINT NOT NULL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    tenant_id BIGINT NOT NULL DEFAULT 0,

    name VARCHAR(100) NOT NULL UNIQUE,
    name_cn VARCHAR(100),
    description TEXT,
    category VARCHAR(50) NOT NULL DEFAULT 'other', -- capability | use_case | industry | feature | other
    weight INT DEFAULT 0,
    usage_count INT DEFAULT 0,

    CONSTRAINT chk_tag_category CHECK (category IN ('capability', 'use_case', 'industry', 'feature', 'other'))
);

COMMENT ON TABLE tags IS '标签表：统一标签管理，支持权重和分类';
COMMENT ON COLUMN tags.name IS '标签唯一名称';
COMMENT ON COLUMN tags.category IS '分类：capability-能力 use_case-应用场景 industry-行业 feature-特性 other-其他';
COMMENT ON COLUMN tags.weight IS '标签权重（用于排序）';
COMMENT ON COLUMN tags.usage_count IS '使用次数统计';

-- 9.8 资源标签关联表
CREATE TABLE resource_tags (
    id BIGINT NOT NULL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    tenant_id BIGINT NOT NULL DEFAULT 0,

    tag_id BIGINT NOT NULL,
    resource_type VARCHAR(50) NOT NULL, -- model | skill | mcp | vendor
    resource_id BIGINT NOT NULL,
    resource_weight INT DEFAULT 0,

    CONSTRAINT uk_resource_tag UNIQUE (tag_id, resource_type, resource_id),
    CONSTRAINT chk_res_tag_type CHECK (resource_type IN ('model', 'skill', 'mcp', 'vendor'))
);

COMMENT ON TABLE resource_tags IS '资源标签关联表：多对多关系，支持资源打标签';
COMMENT ON COLUMN resource_tags.resource_type IS '资源类型：model-模型 skill-技能 mcp-MCP vendor-厂商';
COMMENT ON COLUMN resource_tags.resource_weight IS '该标签在此资源上的权重';


-- ============================================================
-- FILE: 04_create_indexes.sql
-- ============================================================

-- ============================================================
-- Aidean AI模型天梯图平台 - 索引创建脚本
-- 04_create_indexes.sql
-- 功能：为所有表创建完整索引，覆盖所有查询场景
-- 环境：PostgreSQL 16+
-- ============================================================

-- ============================================================
-- 1. 用户表索引
-- ============================================================

-- 主键索引 (自动创建)
-- 邮箱唯一索引 (软删除条件)
CREATE UNIQUE INDEX idx_users_email_unique ON users(email) WHERE deleted_at IS NULL AND email IS NOT NULL;
COMMENT ON INDEX idx_users_email_unique IS '用户邮箱唯一索引';

-- 租户+状态复合索引
CREATE INDEX idx_users_tenant_status ON users(tenant_id, status) WHERE is_active = true;
COMMENT ON INDEX idx_users_tenant_status IS '租户+状态复合索引';

-- 登录时间索引
CREATE INDEX idx_users_last_login ON users(last_login_at) WHERE last_login_at IS NOT NULL;
COMMENT ON INDEX idx_users_last_login IS '最后登录时间索引';

-- 全文搜索索引
CREATE INDEX idx_users_search ON users USING GIN(search_vector);
COMMENT ON INDEX idx_users_search IS '用户全文搜索GIN索引';

-- 覆盖索引 (常用查询字段)
CREATE INDEX idx_users_covering ON users(tenant_id, status, role) INCLUDE (nickname, email, balance) WHERE is_active = true;
COMMENT ON INDEX idx_users_covering IS '用户覆盖索引';

-- ============================================================
-- 2. 模型商表索引
-- ============================================================

-- Slug唯一索引
CREATE UNIQUE INDEX idx_providers_slug_unique ON providers(slug) WHERE deleted_at IS NULL;
COMMENT ON INDEX idx_providers_slug_unique IS '模型商slug唯一索引';

-- 排序+状态索引
CREATE INDEX idx_providers_sort ON providers(sort_order, status) WHERE is_active = true;
COMMENT ON INDEX idx_providers_sort IS '模型商排序+状态索引';

-- 名称模糊搜索索引
CREATE INDEX idx_providers_name_trgm ON providers USING GIN(name gin_trgm_ops);
COMMENT ON INDEX idx_providers_name_trgm IS '模型商名称模糊搜索索引';

-- 全文搜索索引
CREATE INDEX idx_providers_search ON providers USING GIN(search_vector);
COMMENT ON INDEX idx_providers_search IS '模型商全文搜索GIN索引';

-- ============================================================
-- 3. 模型表索引
-- ============================================================

-- Slug唯一索引
CREATE UNIQUE INDEX idx_models_slug_unique ON models(slug) WHERE deleted_at IS NULL;
COMMENT ON INDEX idx_models_slug_unique IS '模型slug唯一索引';

-- 厂商+状态索引
CREATE INDEX idx_models_provider_status ON models(provider_id, status) WHERE is_active = true;
COMMENT ON INDEX idx_models_provider_status IS '模型厂商+状态复合索引';

-- 类型+分类复合索引
CREATE INDEX idx_models_type_category ON models(type, category) WHERE is_active = true AND deleted_at IS NULL;
COMMENT ON INDEX idx_models_type_category IS '模型类型+分类复合索引';

-- 开源+状态索引
CREATE INDEX idx_models_open_source ON models(is_open_source, status) WHERE is_active = true;
COMMENT ON INDEX idx_models_open_source IS '模型开源+状态索引';

-- 协议索引
CREATE INDEX idx_models_protocol ON models(protocol) WHERE is_active = true AND protocol IS NOT NULL;
COMMENT ON INDEX idx_models_protocol IS '模型协议索引';

-- 上下文长度BRIN索引 (大范围查询优化)
CREATE INDEX idx_models_context_brin ON models USING BRIN(context_length);
COMMENT ON INDEX idx_models_context_brin IS '模型上下文长度BRIN索引';

-- 名称模糊搜索索引
CREATE INDEX idx_models_name_trgm ON models USING GIN(name gin_trgm_ops);
COMMENT ON INDEX idx_models_name_trgm IS '模型名称模糊搜索索引';

-- 标签数组GIN索引
CREATE INDEX idx_models_tags_gin ON models USING GIN(tags);
COMMENT ON INDEX idx_models_tags_gin IS '模型标签数组GIN索引';

-- 全文搜索索引
CREATE INDEX idx_models_search ON models USING GIN(search_vector);
COMMENT ON INDEX idx_models_search IS '模型全文搜索GIN索引';

-- 热度排序索引
CREATE INDEX idx_models_popularity ON models(popularity_score DESC) WHERE is_active = true AND status = 1;
COMMENT ON INDEX idx_models_popularity IS '模型热度排序索引';

-- ============================================================
-- 4. 模型价格表索引
-- ============================================================

-- 模型+生效时间索引
CREATE INDEX idx_model_prices_model_effective ON model_prices(model_id, effective_date DESC) WHERE is_active = true;
COMMENT ON INDEX idx_model_prices_model_effective IS '模型价格模型+生效时间索引';

-- 有效期范围索引
CREATE INDEX idx_model_prices_date_range ON model_prices(effective_date, expiry_date) WHERE is_active = true AND expiry_date IS NOT NULL;
COMMENT ON INDEX idx_model_prices_date_range IS '模型价格有效期范围索引';

-- 来源索引
CREATE INDEX idx_model_prices_source ON model_prices(source) WHERE is_active = true AND source IS NOT NULL;
COMMENT ON INDEX idx_model_prices_source IS '模型价格来源索引';

-- ============================================================
-- 5. 模型评分表索引
-- ============================================================

-- 模型唯一索引 (最新评分)
CREATE UNIQUE INDEX idx_model_scores_model_unique ON model_scores(model_id) WHERE is_active = true AND deleted_at IS NULL;
COMMENT ON INDEX idx_model_scores_model_unique IS '模型评分模型唯一索引';

-- 总分排序索引
CREATE INDEX idx_model_scores_total ON model_scores(total_score DESC) WHERE is_active = true;
COMMENT ON INDEX idx_model_scores_total IS '模型评分总分排序索引';

-- 计算时间索引
CREATE INDEX idx_model_scores_calculated ON model_scores(calculated_at DESC);
COMMENT ON INDEX idx_model_scores_calculated IS '模型评分计算时间索引';

-- ============================================================
-- 6. 基准测试表索引
-- ============================================================

-- 模型+测试名称复合索引
CREATE INDEX idx_benchmarks_model_name ON benchmarks(model_id, benchmark_name) WHERE is_active = true;
COMMENT ON INDEX idx_benchmarks_model_name IS '基准测试模型+名称复合索引';

-- 测试名称索引
CREATE INDEX idx_benchmarks_name ON benchmarks(benchmark_name) WHERE is_active = true;
COMMENT ON INDEX idx_benchmarks_name IS '基准测试名称索引';

-- 来源索引
CREATE INDEX idx_benchmarks_source ON benchmarks(source) WHERE is_active = true AND source IS NOT NULL;
COMMENT ON INDEX idx_benchmarks_source IS '基准测试来源索引';

-- 记录时间BRIN索引
CREATE INDEX idx_benchmarks_recorded_brin ON benchmarks USING BRIN(recorded_at);
COMMENT ON INDEX idx_benchmarks_recorded_brin IS '基准测试记录时间BRIN索引';

-- JSONB GIN索引
CREATE INDEX idx_benchmarks_raw_data_gin ON benchmarks USING GIN(raw_data jsonb_path_ops);
COMMENT ON INDEX idx_benchmarks_raw_data_gin IS '基准测试原始数据JSONB GIN索引';

-- ============================================================
-- 7. 天梯排名表索引
-- ============================================================

-- 榜单类型+排名复合索引
CREATE INDEX idx_ladder_type_rank ON ladder_rankings(ladder_type, rank) WHERE is_active = true;
COMMENT ON INDEX idx_ladder_type_rank IS '天梯排名榜单类型+排名复合索引';

-- 模型+榜单类型索引
CREATE INDEX idx_ladder_model_type ON ladder_rankings(model_id, ladder_type) WHERE is_active = true;
COMMENT ON INDEX idx_ladder_model_type IS '天梯排名模型+榜单类型索引';

-- 快照日期索引
CREATE INDEX idx_ladder_snapshot ON ladder_rankings(snapshot_date DESC);
COMMENT ON INDEX idx_ladder_snapshot IS '天梯排名快照日期索引';

-- 最新快照+榜单类型覆盖索引
CREATE INDEX idx_ladder_latest ON ladder_rankings(ladder_type, snapshot_date DESC) INCLUDE (model_id, rank, score) WHERE is_active = true;
COMMENT ON INDEX idx_ladder_latest IS '天梯排名最新快照覆盖索引';

-- 状态索引
CREATE INDEX idx_ladder_status ON ladder_rankings(status) WHERE is_active = true;
COMMENT ON INDEX idx_ladder_status IS '天梯排名状态索引';

-- ============================================================
-- 8. 天梯配置表索引
-- ============================================================

-- 配置键唯一索引
CREATE UNIQUE INDEX idx_ladder_configs_key_unique ON ladder_configs(config_key) WHERE deleted_at IS NULL;
COMMENT ON INDEX idx_ladder_configs_key_unique IS '天梯配置键唯一索引';

-- ============================================================
-- 9. 测评任务表索引
-- ============================================================

-- 用户+状态复合索引
CREATE INDEX idx_evaluations_user_status ON evaluations(user_id, status) WHERE is_active = true;
COMMENT ON INDEX idx_evaluations_user_status IS '测评任务用户+状态复合索引';

-- 创建时间BRIN索引
CREATE INDEX idx_evaluations_created_brin ON evaluations USING BRIN(created_at);
COMMENT ON INDEX idx_evaluations_created_brin IS '测评任务创建时间BRIN索引';

-- 付费状态索引
CREATE INDEX idx_evaluations_paid ON evaluations(is_paid, status) WHERE is_active = true;
COMMENT ON INDEX idx_evaluations_paid IS '测评任务付费状态索引';

-- 全文搜索索引 (prompt)
CREATE INDEX idx_evaluations_search ON evaluations USING GIN(search_vector);
COMMENT ON INDEX idx_evaluations_search IS '测评任务全文搜索GIN索引';

-- 评测类型索引
CREATE INDEX idx_evaluations_type ON evaluations(eval_type) WHERE is_active = true;
COMMENT ON INDEX idx_evaluations_type IS '评测类型索引';

-- 进度索引
CREATE INDEX idx_evaluations_progress ON evaluations(progress) WHERE status = 1; -- status=1 执行中
COMMENT ON INDEX idx_evaluations_progress IS '评测进度索引（查询进行中的任务）';

-- 胜出模型索引
CREATE INDEX idx_evaluations_winner ON evaluations(winner_model_id) WHERE winner_model_id IS NOT NULL;
COMMENT ON INDEX idx_evaluations_winner IS '评测胜出模型索引';

-- ============================================================
-- 10. 测评结果表索引
-- ============================================================

-- 测评任务+模型复合索引
CREATE INDEX idx_eval_results_eval_model ON evaluation_results(evaluation_id, model_id) WHERE is_active = true;
COMMENT ON INDEX idx_eval_results_eval_model IS '测评结果测评任务+模型复合索引';

-- 状态索引
CREATE INDEX idx_eval_results_status ON evaluation_results(status) WHERE is_active = true;
COMMENT ON INDEX idx_eval_results_status IS '测评结果状态索引';

-- ============================================================
-- 11. 测评模型关联表索引
-- ============================================================

-- 测评任务索引
CREATE INDEX idx_eval_models_eval ON evaluation_models(evaluation_id) WHERE is_active = true;
COMMENT ON INDEX idx_eval_models_eval IS '测评模型关联测评任务索引';

-- 模型索引
CREATE INDEX idx_eval_models_model ON evaluation_models(model_id) WHERE is_active = true;
COMMENT ON INDEX idx_eval_models_model IS '测评模型关联模型索引';

-- 唯一约束
CREATE UNIQUE INDEX idx_eval_models_unique ON evaluation_models(evaluation_id, model_id) WHERE deleted_at IS NULL;
COMMENT ON INDEX idx_eval_models_unique IS '测评模型关联唯一索引';

-- 状态索引
CREATE INDEX idx_eval_models_status ON evaluation_models(status);
COMMENT ON INDEX idx_eval_models_status IS '测评模型结果状态索引';

-- 评分索引
CREATE INDEX idx_eval_models_score ON evaluation_models(score DESC) WHERE score IS NOT NULL;
COMMENT ON INDEX idx_eval_models_score IS '测评模型评分排序索引';

-- 延迟索引
CREATE INDEX idx_eval_models_latency ON evaluation_models(latency_ms) WHERE latency_ms IS NOT NULL;
COMMENT ON INDEX idx_eval_models_latency IS '测评模型响应延迟索引';

-- 多维度评分复合索引
CREATE INDEX idx_eval_model_scores ON evaluation_models(score, accuracy_score, relevance_score) WHERE score IS NOT NULL;
COMMENT ON INDEX idx_eval_model_scores IS '测评模型多维度评分复合索引';

-- ============================================================
-- 12. 交易记录表索引
-- ============================================================

-- 用户+创建时间复合索引 (分页查询)
CREATE INDEX idx_transactions_user_created ON transactions(user_id, created_at DESC) WHERE is_active = true;
COMMENT ON INDEX idx_transactions_user_created IS '交易记录用户+创建时间复合索引';

-- 交易类型索引
CREATE INDEX idx_transactions_type ON transactions(type) WHERE is_active = true;
COMMENT ON INDEX idx_transactions_type IS '交易记录类型索引';

-- 引用类型+引用ID复合索引
CREATE INDEX idx_transactions_ref ON transactions(ref_type, ref_id) WHERE is_active = true AND ref_type IS NOT NULL;
COMMENT ON INDEX idx_transactions_ref IS '交易记录引用复合索引';

-- 创建时间BRIN索引
CREATE INDEX idx_transactions_created_brin ON transactions USING BRIN(created_at);
COMMENT ON INDEX idx_transactions_created_brin IS '交易记录创建时间BRIN索引';

-- ============================================================
-- 13. 充值订单表索引
-- ============================================================

-- 用户+状态复合索引
CREATE INDEX idx_recharge_user_status ON recharge_orders(user_id, status) WHERE is_active = true;
COMMENT ON INDEX idx_recharge_user_status IS '充值订单用户+状态复合索引';

-- 订单号唯一索引
CREATE UNIQUE INDEX idx_recharge_order_no_unique ON recharge_orders(order_no) WHERE deleted_at IS NULL;
COMMENT ON INDEX idx_recharge_order_no_unique IS '充值订单号唯一索引';

-- 支付状态索引
CREATE INDEX idx_recharge_paid ON recharge_orders(status) WHERE is_active = true AND status = 1;
COMMENT ON INDEX idx_recharge_paid IS '充值订单已支付状态索引';

-- 过期时间索引
CREATE INDEX idx_recharge_expire ON recharge_orders(expire_at) WHERE is_active = true AND status = 0;
COMMENT ON INDEX idx_recharge_expire IS '充值订单过期时间索引';

-- ============================================================
-- 14. 收藏表索引
-- ============================================================

-- 用户+类型复合索引
CREATE INDEX idx_favorites_user_type ON favorites(user_id, target_type) WHERE is_active = true;
COMMENT ON INDEX idx_favorites_user_type IS '收藏用户+类型复合索引';

-- 目标类型+目标ID复合索引
CREATE INDEX idx_favorites_target ON favorites(target_type, target_id) WHERE is_active = true;
COMMENT ON INDEX idx_favorites_target IS '收藏目标复合索引';

-- 用户+目标唯一索引
CREATE UNIQUE INDEX idx_favorites_user_target_unique ON favorites(user_id, target_type, target_id) WHERE deleted_at IS NULL;
COMMENT ON INDEX idx_favorites_user_target_unique IS '收藏用户+目标唯一索引';

-- 创建时间索引
CREATE INDEX idx_favorites_created ON favorites(created_at DESC) WHERE is_active = true;
COMMENT ON INDEX idx_favorites_created IS '收藏创建时间索引';

-- ============================================================
-- 15. Skill/MCP/Agent/API站索引
-- ============================================================

-- Skills
CREATE INDEX idx_skills_status ON skills(status) WHERE is_active = true;
CREATE INDEX idx_skills_install_count ON skills(install_count DESC) WHERE is_active = true;
CREATE INDEX idx_skills_name_trgm ON skills USING GIN(name gin_trgm_ops);
CREATE INDEX idx_skills_search ON skills USING GIN(search_vector);
CREATE INDEX idx_skills_tags_gin ON skills USING GIN(tags);

-- MCP Servers
CREATE INDEX idx_mcp_status ON mcp_servers(status) WHERE is_active = true;
CREATE INDEX idx_mcp_stability ON mcp_servers(stability_score DESC) WHERE is_active = true;
CREATE INDEX idx_mcp_name_trgm ON mcp_servers USING GIN(name gin_trgm_ops);
CREATE INDEX idx_mcp_search ON mcp_servers USING GIN(search_vector);

-- Agents
CREATE INDEX idx_agents_status ON agents(status) WHERE is_active = true;
CREATE INDEX idx_agents_activity ON agents(activity_score DESC) WHERE is_active = true;
CREATE INDEX idx_agents_name_trgm ON agents USING GIN(name gin_trgm_ops);
CREATE INDEX idx_agents_search ON agents USING GIN(search_vector);
CREATE INDEX idx_agents_capabilities_gin ON agents USING GIN(capabilities jsonb_path_ops);

-- API Stations
CREATE INDEX idx_api_stations_status ON api_stations(status) WHERE is_active = true;
CREATE INDEX idx_api_stations_name_trgm ON api_stations USING GIN(name gin_trgm_ops);
CREATE INDEX idx_api_stations_search ON api_stations USING GIN(search_vector);

-- API Station Models
CREATE INDEX idx_api_station_models_station ON api_station_models(station_id) WHERE is_active = true;
CREATE INDEX idx_api_station_models_model ON api_station_models(model_id) WHERE is_active = true;
CREATE UNIQUE INDEX idx_api_station_models_unique ON api_station_models(station_id, model_id) WHERE deleted_at IS NULL;

-- ============================================================
-- 16. 系统管理表索引
-- ============================================================

-- Feature Flags
CREATE UNIQUE INDEX idx_feature_flags_key_unique ON feature_flags(key) WHERE deleted_at IS NULL;
CREATE INDEX idx_feature_flags_enabled ON feature_flags(enabled) WHERE is_active = true;

-- Scheduled Scripts
CREATE INDEX idx_scripts_active ON scheduled_scripts(is_active) WHERE is_active = true;
CREATE INDEX idx_scripts_next_run ON scheduled_scripts(next_run_at) WHERE is_active = true AND next_run_at IS NOT NULL;

-- Script Executions
CREATE INDEX idx_executions_script ON script_executions(script_id, started_at DESC) WHERE is_active = true;
CREATE INDEX idx_executions_status ON script_executions(status) WHERE is_active = true;
CREATE INDEX idx_executions_started_brin ON script_executions USING BRIN(started_at);

-- Audit Logs (大表，使用BRIN)
CREATE INDEX idx_audit_logs_table_record ON audit_logs(table_name, record_id) WHERE is_active = true;
CREATE INDEX idx_audit_logs_action ON audit_logs(action) WHERE is_active = true;
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id) WHERE is_active = true AND actor_id IS NOT NULL;
CREATE INDEX idx_audit_logs_created_brin ON audit_logs USING BRIN(created_at);

-- Dict Items
CREATE INDEX idx_dict_category_code ON dict_items(category, code) WHERE is_active = true;
CREATE INDEX idx_dict_category_sort ON dict_items(category, sort_order) WHERE is_active = true;

-- System Configs
CREATE UNIQUE INDEX idx_system_configs_key_unique ON system_configs(config_key) WHERE deleted_at IS NULL;

-- News
CREATE INDEX idx_news_status_published ON news(status, published_at DESC) WHERE is_active = true AND status = 1;
CREATE INDEX idx_news_title_trgm ON news USING GIN(title gin_trgm_ops);
CREATE INDEX idx_news_search ON news USING GIN(search_vector);
CREATE INDEX idx_news_tags_gin ON news USING GIN(tags);

-- ============================================================
-- Audit & Rollback Domain
-- ============================================================

-- Sync Batches
CREATE UNIQUE INDEX idx_sync_batches_code ON sync_batches(batch_code);
CREATE INDEX idx_sync_batches_status ON sync_batches(status, created_at DESC);
CREATE INDEX idx_sync_batches_operator ON sync_batches(operator_id) WHERE operator_id IS NOT NULL;

-- Model Change Logs
CREATE INDEX idx_change_logs_model ON model_change_logs(model_id, created_at DESC);
CREATE INDEX idx_change_logs_batch ON model_change_logs(sync_batch_id) WHERE sync_batch_id IS NOT NULL;
CREATE INDEX idx_change_logs_type ON model_change_logs(change_type, created_at);
CREATE INDEX idx_change_logs_reverted ON model_change_logs(is_reverted) WHERE is_reverted = TRUE;
CREATE INDEX idx_change_logs_validation ON model_change_logs(validation_status);

-- Custom Metrics
CREATE UNIQUE INDEX idx_custom_metrics_code ON custom_metrics(metric_code);
CREATE INDEX idx_custom_metrics_user ON custom_metrics(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_custom_metrics_active ON custom_metrics(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_custom_metrics_status ON custom_metrics(status);
CREATE INDEX idx_custom_metrics_frequency ON custom_metrics(calc_frequency);

-- Custom Metric Values
CREATE INDEX idx_metric_values_metric ON custom_metric_values(metric_id, rank_position) WHERE rank_position IS NOT NULL;
CREATE INDEX idx_metric_values_model ON custom_metric_values(model_id);
CREATE INDEX idx_metric_values_expires ON custom_metric_values(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_metric_values_status ON custom_metric_values(status);

-- ============================================================
-- Resource Management Extensions
-- ============================================================

-- Vendor Relations
CREATE INDEX idx_vendor_relations_parent ON vendor_relations(parent_vendor_id);
CREATE INDEX idx_vendor_relations_child ON vendor_relations(child_vendor_id);
CREATE INDEX idx_vendor_relations_current ON vendor_relations(is_current) WHERE is_current = TRUE;

-- Model Versions
CREATE INDEX idx_model_versions_model ON model_versions(model_id);
CREATE INDEX idx_model_versions_parent ON model_versions(parent_model_id);

-- User Collections
CREATE INDEX idx_collections_user ON user_collections(user_id);
CREATE INDEX idx_collections_type ON user_collections(collection_type);
CREATE INDEX idx_collections_public ON user_collections(is_public) WHERE is_public = TRUE;

-- Price Alerts
CREATE INDEX idx_price_alerts_user ON price_alerts(user_id);
CREATE INDEX idx_price_alerts_model ON price_alerts(model_id);
CREATE INDEX idx_price_alerts_triggered ON price_alerts(is_triggered) WHERE is_triggered = FALSE;

-- Model API Usage
CREATE INDEX idx_api_usage_model ON model_api_usage(model_id);
CREATE INDEX idx_api_usage_user ON model_api_usage(user_id);
CREATE INDEX idx_api_usage_date ON model_api_usage(usage_date);

-- Resource Access Logs
CREATE INDEX idx_access_logs_user ON resource_access_logs(user_id);
CREATE INDEX idx_access_logs_resource ON resource_access_logs(resource_type, resource_id);
CREATE INDEX idx_access_logs_action ON resource_access_logs(action);
CREATE INDEX idx_access_logs_created ON resource_access_logs(created_at);

-- Tags
CREATE INDEX idx_tags_category ON tags(category);
CREATE INDEX idx_tags_active ON tags(is_active) WHERE is_active = TRUE;

-- Resource Tags
CREATE INDEX idx_resource_tags_tag ON resource_tags(tag_id);
CREATE INDEX idx_resource_tags_resource ON resource_tags(resource_type, resource_id);


-- ============================================================
-- FILE: 05_create_constraints.sql
-- ============================================================

-- ============================================================
-- Aidean AI模型天梯图平台 - 约束创建脚本
-- 05_create_constraints.sql
-- 功能：创建所有外键约束和检查约束
-- 环境：PostgreSQL 16+
-- ============================================================

-- ============================================================
-- 1. 用户域外键
-- ============================================================

-- 订阅表外键
ALTER TABLE subscriptions ADD CONSTRAINT fk_subscriptions_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE subscriptions ADD CONSTRAINT fk_subscriptions_order
    FOREIGN KEY (order_id) REFERENCES recharge_orders(id) ON DELETE SET NULL;

-- ============================================================
-- 2. 模型域外键
-- ============================================================

-- 模型表外键
ALTER TABLE models ADD CONSTRAINT fk_models_provider
    FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE RESTRICT;

-- 模型价格表外键
ALTER TABLE model_prices ADD CONSTRAINT fk_model_prices_model
    FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE CASCADE;

-- 模型评分表外键
ALTER TABLE model_scores ADD CONSTRAINT fk_model_scores_model
    FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE CASCADE;

-- 基准测试表外键
ALTER TABLE benchmarks ADD CONSTRAINT fk_benchmarks_model
    FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE CASCADE;

-- 天梯排名表外键
ALTER TABLE ladder_rankings ADD CONSTRAINT fk_ladder_rankings_model
    FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE CASCADE;

-- ============================================================
-- 3. 测评域外键
-- ============================================================

-- 测评任务表外键
ALTER TABLE evaluations ADD CONSTRAINT fk_evaluations_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 测评结果表外键
ALTER TABLE evaluation_results ADD CONSTRAINT fk_eval_results_evaluation
    FOREIGN KEY (evaluation_id) REFERENCES evaluations(id) ON DELETE CASCADE;

ALTER TABLE evaluation_results ADD CONSTRAINT fk_eval_results_model
    FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE RESTRICT;

-- 测评模型关联表外键
ALTER TABLE evaluation_models ADD CONSTRAINT fk_eval_models_evaluation
    FOREIGN KEY (evaluation_id) REFERENCES evaluations(id) ON DELETE CASCADE;

ALTER TABLE evaluation_models ADD CONSTRAINT fk_eval_models_model
    FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE RESTRICT;

-- ============================================================
-- 4. 财务域外键
-- ============================================================

-- 交易记录表外键
ALTER TABLE transactions ADD CONSTRAINT fk_transactions_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 充值订单表外键
ALTER TABLE recharge_orders ADD CONSTRAINT fk_recharge_orders_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE recharge_orders ADD CONSTRAINT fk_recharge_orders_transaction
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE SET NULL;

-- ============================================================
-- 5. 收藏域外键
-- ============================================================

-- 收藏表外键
ALTER TABLE favorites ADD CONSTRAINT fk_favorites_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- ============================================================
-- 6. 扩展天图表外键
-- ============================================================

-- API站模型关联表外键
ALTER TABLE api_station_models ADD CONSTRAINT fk_api_station_models_station
    FOREIGN KEY (station_id) REFERENCES api_stations(id) ON DELETE CASCADE;

ALTER TABLE api_station_models ADD CONSTRAINT fk_api_station_models_model
    FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE RESTRICT;

-- ============================================================
-- 7. 系统管理域外键
-- ============================================================

-- 脚本执行记录表外键
ALTER TABLE script_executions ADD CONSTRAINT fk_executions_script
    FOREIGN KEY (script_id) REFERENCES scheduled_scripts(id) ON DELETE CASCADE;

-- ============================================================
-- 8. 余额检查约束
-- ============================================================

-- 确保用户余额不为负
ALTER TABLE users ADD CONSTRAINT chk_users_balance_non_negative
    CHECK (balance >= 0);

-- 交易金额不能为0
ALTER TABLE transactions ADD CONSTRAINT chk_transactions_amount_non_zero
    CHECK (amount != 0);

-- 交易前后余额必须匹配
ALTER TABLE transactions ADD CONSTRAINT chk_transactions_balance_match
    CHECK (balance_after = balance_before + amount);

-- 充值金额必须为正
ALTER TABLE recharge_orders ADD CONSTRAINT chk_recharge_amount_positive
    CHECK (amount > 0);

-- 订阅结束时间必须晚于开始时间
ALTER TABLE subscriptions ADD CONSTRAINT chk_subscriptions_date_order
    CHECK (expire_at > start_at);

-- 价格必须非负
ALTER TABLE model_prices ADD CONSTRAINT chk_model_prices_non_negative
    CHECK (input_price >= 0 AND output_price >= 0 AND cache_hit_price >= 0);

-- 评分必须在0-100之间
ALTER TABLE model_scores ADD CONSTRAINT chk_model_scores_range
    CHECK (
        (official_score IS NULL OR (official_score >= 0 AND official_score <= 100)) AND
        (practical_score IS NULL OR (practical_score >= 0 AND practical_score <= 100)) AND
        (reputation_score IS NULL OR (reputation_score >= 0 AND reputation_score <= 100)) AND
        (self_test_score IS NULL OR (self_test_score >= 0 AND self_test_score <= 100)) AND
        (total_score IS NULL OR (total_score >= 0 AND total_score <= 100))
    );

-- 基准测试分数必须非负
ALTER TABLE benchmarks ADD CONSTRAINT chk_benchmarks_score_non_negative
    CHECK (score >= 0);

-- 排名必须为正
ALTER TABLE ladder_rankings ADD CONSTRAINT chk_ladder_rank_positive
    CHECK (rank > 0);

-- ============================================================
-- 6. 数据审计域外键约束
-- ============================================================

-- 变更日志关联模型
ALTER TABLE model_change_logs ADD CONSTRAINT fk_change_logs_model
    FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE CASCADE;

-- 变更日志关联同步批次
ALTER TABLE model_change_logs ADD CONSTRAINT fk_change_logs_batch
    FOREIGN KEY (sync_batch_id) REFERENCES sync_batches(id) ON DELETE SET NULL;

-- 自定义指标值关联指标
ALTER TABLE custom_metric_values ADD CONSTRAINT fk_metric_values_metric
    FOREIGN KEY (metric_id) REFERENCES custom_metrics(id) ON DELETE CASCADE;

-- 自定义指标值关联模型
ALTER TABLE custom_metric_values ADD CONSTRAINT fk_metric_values_model
    FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE CASCADE;

-- 同步批次操作人
ALTER TABLE sync_batches ADD CONSTRAINT fk_sync_batches_operator
    FOREIGN KEY (operator_id) REFERENCES users(id) ON DELETE SET NULL;

-- 变更日志操作人
ALTER TABLE model_change_logs ADD CONSTRAINT fk_change_logs_operator
    FOREIGN KEY (operator_id) REFERENCES users(id) ON DELETE SET NULL;

-- 自定义指标创建者
ALTER TABLE custom_metrics ADD CONSTRAINT fk_custom_metrics_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================================
-- 7. 资源管理扩展域外键约束
-- ============================================================

-- 厂商关系
ALTER TABLE vendor_relations ADD CONSTRAINT fk_vendor_rel_parent
    FOREIGN KEY (parent_vendor_id) REFERENCES vendors(id) ON DELETE CASCADE;
ALTER TABLE vendor_relations ADD CONSTRAINT fk_vendor_rel_child
    FOREIGN KEY (child_vendor_id) REFERENCES vendors(id) ON DELETE CASCADE;

-- 模型版本
ALTER TABLE model_versions ADD CONSTRAINT fk_model_versions_model
    FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE CASCADE;
ALTER TABLE model_versions ADD CONSTRAINT fk_model_versions_parent
    FOREIGN KEY (parent_model_id) REFERENCES models(id) ON DELETE SET NULL;

-- 用户收藏
ALTER TABLE user_collections ADD CONSTRAINT fk_collections_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 价格提醒
ALTER TABLE price_alerts ADD CONSTRAINT fk_price_alerts_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE price_alerts ADD CONSTRAINT fk_price_alerts_model
    FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE CASCADE;

-- API使用统计
ALTER TABLE model_api_usage ADD CONSTRAINT fk_api_usage_model
    FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE CASCADE;
ALTER TABLE model_api_usage ADD CONSTRAINT fk_api_usage_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- 资源访问日志
ALTER TABLE resource_access_logs ADD CONSTRAINT fk_access_logs_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- 资源标签关联
ALTER TABLE resource_tags ADD CONSTRAINT fk_resource_tags_tag
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE;


-- ============================================================
-- FILE: 06_create_triggers.sql
-- ============================================================

-- ============================================================
-- Aidean AI模型天梯图平台 - 触发器创建脚本
-- 06_create_triggers.sql
-- 功能：创建自动更新、审计、全文搜索触发器
-- 环境：PostgreSQL 16+
-- ============================================================

-- ============================================================
-- 1. 自动更新 updated_at 和 version 触发器
-- ============================================================

-- 创建触发器函数
CREATE OR REPLACE FUNCTION fn_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_update_timestamp IS '自动更新updated_at和version字段';

-- 为所有表创建触发器
DO $$
DECLARE
    tbl TEXT;
    tables TEXT[] := ARRAY[
        'users', 'subscriptions', 'providers', 'models', 'model_prices',
        'model_scores', 'benchmarks', 'ladder_rankings', 'ladder_configs',
        'evaluations', 'evaluation_results', 'evaluation_models',
        'transactions', 'recharge_orders', 'favorites',
        'skills', 'mcp_servers', 'agents', 'api_stations', 'api_station_models',
        'feature_flags', 'scheduled_scripts', 'script_executions',
        'audit_logs', 'dict_items', 'system_configs', 'news',
        'sync_batches', 'custom_metrics', 'custom_metric_values',
        'vendor_relations', 'model_versions', 'user_collections', 'price_alerts',
        'model_api_usage', 'resource_access_logs', 'tags', 'resource_tags',
        'roles', 'permissions', 'user_roles', 'role_permissions',
        'departments', 'teams', 'team_members',
        'subscription_plans', 'user_quotas'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables
    LOOP
        EXECUTE format('
            CREATE TRIGGER trg_update_timestamp_%I
            BEFORE UPDATE ON %I
            FOR EACH ROW
            WHEN (OLD.* IS DISTINCT FROM NEW.*)
            EXECUTE FUNCTION fn_update_timestamp()
        ', tbl, tbl);
    END LOOP;
END
$$;

-- ============================================================
-- 2. 审计日志触发器
-- ============================================================

-- 创建审计日志函数
CREATE OR REPLACE FUNCTION fn_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    old_data JSONB;
    new_data JSONB;
    changed_fields TEXT[];
    key TEXT;
BEGIN
    -- 获取旧数据和新数据
    IF TG_OP = 'DELETE' THEN
        old_data = to_jsonb(OLD);
        new_data = NULL;
    ELSIF TG_OP = 'UPDATE' THEN
        old_data = to_jsonb(OLD);
        new_data = to_jsonb(NEW);
    ELSIF TG_OP = 'INSERT' THEN
        old_data = NULL;
        new_data = to_jsonb(NEW);
    END IF;

    -- 计算变更字段
    IF TG_OP = 'UPDATE' AND old_data IS NOT NULL AND new_data IS NOT NULL THEN
        changed_fields := ARRAY[]::TEXT[];
        FOR key IN SELECT jsonb_object_keys(new_data)
        LOOP
            IF old_data->key IS DISTINCT FROM new_data->key THEN
                changed_fields := array_append(changed_fields, key);
            END IF;
        END LOOP;
    END IF;

    -- 插入审计日志
    INSERT INTO audit_logs (
        id,
        table_name,
        record_id,
        action,
        old_data,
        new_data,
        changed_fields,
        actor_id,
        actor_ip,
        created_at,
        updated_at,
        is_active,
        version,
        tenant_id
    ) VALUES (
        -- 使用Snowflake ID (这里用序列模拟，实际由应用生成)
        EXTRACT(EPOCH FROM NOW())::BIGINT * 1000 + (RANDOM() * 1000)::BIGINT,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        CASE TG_OP
            WHEN 'INSERT' THEN 1
            WHEN 'UPDATE' THEN 2
            WHEN 'DELETE' THEN 3
        END,
        old_data,
        new_data,
        changed_fields,
        NULL, -- actor_id 由应用设置
        NULL, -- actor_ip 由应用设置
        NOW(),
        NOW(),
        TRUE,
        1,
        COALESCE(NEW.tenant_id, OLD.tenant_id, 0)
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_audit_log IS '审计日志触发器函数，记录所有数据变更';

-- 为关键业务表创建审计触发器
DO $$
DECLARE
    tbl TEXT;
    audit_tables TEXT[] := ARRAY[
        'users', 'providers', 'models', 'model_prices', 'model_scores',
        'benchmarks', 'ladder_rankings', 'ladder_configs',
        'evaluations', 'evaluation_results',
        'transactions', 'recharge_orders', 'subscriptions',
        'favorites', 'skills', 'mcp_servers', 'agents',
        'api_stations', 'api_station_models',
        'feature_flags', 'scheduled_scripts', 'system_configs', 'news'
    ];
BEGIN
    FOREACH tbl IN ARRAY audit_tables
    LOOP
        EXECUTE format('
            CREATE TRIGGER trg_audit_%I
            AFTER INSERT OR UPDATE OR DELETE ON %I
            FOR EACH ROW
            EXECUTE FUNCTION fn_audit_log()
        ', tbl, tbl);
    END LOOP;
END
$$;

-- ============================================================
-- 3. 全文搜索向量更新触发器
-- ============================================================

-- 创建全文搜索更新函数
CREATE OR REPLACE FUNCTION fn_update_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    -- 根据表名组合搜索字段
    CASE TG_TABLE_NAME
        WHEN 'users' THEN
            NEW.search_vector := setweight(to_tsvector('simple', COALESCE(NEW.nickname, '')), 'A') ||
                                 setweight(to_tsvector('simple', COALESCE(NEW.email, '')), 'B') ||
                                 setweight(to_tsvector('simple', COALESCE(NEW.search_text, '')), 'C');
        WHEN 'providers' THEN
            NEW.search_vector := setweight(to_tsvector('simple', COALESCE(NEW.name, '')), 'A') ||
                                 setweight(to_tsvector('simple', COALESCE(NEW.name_en, '')), 'A') ||
                                 setweight(to_tsvector('simple', COALESCE(NEW.name_zh, '')), 'A') ||
                                 setweight(to_tsvector('simple', COALESCE(NEW.description, '')), 'B') ||
                                 setweight(to_tsvector('simple', COALESCE(NEW.search_text, '')), 'C');
        WHEN 'models' THEN
            NEW.search_vector := setweight(to_tsvector('simple', COALESCE(NEW.name, '')), 'A') ||
                                 setweight(to_tsvector('simple', COALESCE(NEW.name_en, '')), 'A') ||
                                 setweight(to_tsvector('simple', COALESCE(NEW.name_zh, '')), 'A') ||
                                 setweight(to_tsvector('simple', COALESCE(NEW.params, '')), 'B') ||
                                 setweight(to_tsvector('simple', COALESCE(NEW.search_text, '')), 'C');
        WHEN 'skills' THEN
            NEW.search_vector := setweight(to_tsvector('simple', COALESCE(NEW.name, '')), 'A') ||
                                 setweight(to_tsvector('simple', COALESCE(NEW.description, '')), 'B') ||
                                 setweight(to_tsvector('simple', COALESCE(NEW.search_text, '')), 'C');
        WHEN 'mcp_servers' THEN
            NEW.search_vector := setweight(to_tsvector('simple', COALESCE(NEW.name, '')), 'A') ||
                                 setweight(to_tsvector('simple', COALESCE(NEW.description, '')), 'B') ||
                                 setweight(to_tsvector('simple', COALESCE(NEW.search_text, '')), 'C');
        WHEN 'agents' THEN
            NEW.search_vector := setweight(to_tsvector('simple', COALESCE(NEW.name, '')), 'A') ||
                                 setweight(to_tsvector('simple', COALESCE(NEW.description, '')), 'B') ||
                                 setweight(to_tsvector('simple', COALESCE(NEW.search_text, '')), 'C');
        WHEN 'api_stations' THEN
            NEW.search_vector := setweight(to_tsvector('simple', COALESCE(NEW.name, '')), 'A') ||
                                 setweight(to_tsvector('simple', COALESCE(NEW.name_en, '')), 'A') ||
                                 setweight(to_tsvector('simple', COALESCE(NEW.description, '')), 'B') ||
                                 setweight(to_tsvector('simple', COALESCE(NEW.search_text, '')), 'C');
        WHEN 'news' THEN
            NEW.search_vector := setweight(to_tsvector('simple', COALESCE(NEW.title, '')), 'A') ||
                                 setweight(to_tsvector('simple', COALESCE(NEW.title_en, '')), 'A') ||
                                 setweight(to_tsvector('simple', COALESCE(NEW.summary, '')), 'B') ||
                                 setweight(to_tsvector('simple', COALESCE(NEW.content, '')), 'C') ||
                                 setweight(to_tsvector('simple', COALESCE(NEW.search_text, '')), 'D');
        ELSE
            -- 默认处理
            NEW.search_vector := setweight(to_tsvector('simple', COALESCE(NEW.search_text, '')), 'C');
    END CASE;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_update_search_vector IS '全文搜索向量自动更新函数';

-- 为有search_vector的表创建触发器
DO $$
DECLARE
    tbl TEXT;
    search_tables TEXT[] := ARRAY[
        'users', 'providers', 'models', 'skills', 'mcp_servers',
        'agents', 'api_stations', 'news'
    ];
BEGIN
    FOREACH tbl IN ARRAY search_tables
    LOOP
        EXECUTE format('
            CREATE TRIGGER trg_search_vector_%I
            BEFORE INSERT OR UPDATE ON %I
            FOR EACH ROW
            EXECUTE FUNCTION fn_update_search_vector()
        ', tbl, tbl);
    END LOOP;
END
$$;

-- ============================================================
-- 4. 软删除触发器 (级联标记)
-- ============================================================

-- 创建软删除函数
CREATE OR REPLACE FUNCTION fn_soft_delete_cascade()
RETURNS TRIGGER AS $$
BEGIN
    -- 根据表名执行级联软删除
    CASE TG_TABLE_NAME
        WHEN 'providers' THEN
            UPDATE models SET deleted_at = NEW.deleted_at, updated_at = NOW()
            WHERE provider_id = OLD.id AND deleted_at IS NULL;
        WHEN 'models' THEN
            UPDATE model_prices SET deleted_at = NEW.deleted_at, updated_at = NOW()
            WHERE model_id = OLD.id AND deleted_at IS NULL;
            UPDATE model_scores SET deleted_at = NEW.deleted_at, updated_at = NOW()
            WHERE model_id = OLD.id AND deleted_at IS NULL;
            UPDATE benchmarks SET deleted_at = NEW.deleted_at, updated_at = NOW()
            WHERE model_id = OLD.id AND deleted_at IS NULL;
            UPDATE ladder_rankings SET deleted_at = NEW.deleted_at, updated_at = NOW()
            WHERE model_id = OLD.id AND deleted_at IS NULL;
        WHEN 'evaluations' THEN
            UPDATE evaluation_results SET deleted_at = NEW.deleted_at, updated_at = NOW()
            WHERE evaluation_id = OLD.id AND deleted_at IS NULL;
            UPDATE evaluation_models SET deleted_at = NEW.deleted_at, updated_at = NOW()
            WHERE evaluation_id = OLD.id AND deleted_at IS NULL;
        WHEN 'api_stations' THEN
            UPDATE api_station_models SET deleted_at = NEW.deleted_at, updated_at = NOW()
            WHERE station_id = OLD.id AND deleted_at IS NULL;
        WHEN 'scheduled_scripts' THEN
            UPDATE script_executions SET deleted_at = NEW.deleted_at, updated_at = NOW()
            WHERE script_id = OLD.id AND deleted_at IS NULL;
    END CASE;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_soft_delete_cascade IS '软删除级联触发器函数';

-- 为关键表创建软删除触发器
DO $$
DECLARE
    tbl TEXT;
    cascade_tables TEXT[] := ARRAY[
        'providers', 'models', 'evaluations', 'api_stations', 'scheduled_scripts'
    ];
BEGIN
    FOREACH tbl IN ARRAY cascade_tables
    LOOP
        EXECUTE format('
            CREATE TRIGGER trg_soft_delete_%I
            AFTER UPDATE ON %I
            FOR EACH ROW
            WHEN (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL)
            EXECUTE FUNCTION fn_soft_delete_cascade()
        ', tbl, tbl);
    END LOOP;
END
$$;

-- ============================================================
-- 5. 访问计数自动更新触发器
-- ============================================================

CREATE OR REPLACE FUNCTION fn_increment_access_count()
RETURNS TRIGGER AS $$
BEGIN
    -- 根据目标类型更新对应表的访问计数
    CASE NEW.target_type
        WHEN 1 THEN -- 模型
            UPDATE models SET access_count = access_count + 1, last_accessed_at = NOW(),
                              popularity_score = popularity_score + 0.1
            WHERE id = NEW.target_id AND is_active = true;
        WHEN 2 THEN -- Skill
            UPDATE skills SET access_count = access_count + 1, last_accessed_at = NOW(),
                              popularity_score = popularity_score + 0.1
            WHERE id = NEW.target_id AND is_active = true;
        WHEN 3 THEN -- MCP
            UPDATE mcp_servers SET access_count = access_count + 1, last_accessed_at = NOW(),
                                   popularity_score = popularity_score + 0.1
            WHERE id = NEW.target_id AND is_active = true;
        WHEN 4 THEN -- Agent
            UPDATE agents SET access_count = access_count + 1, last_accessed_at = NOW(),
                              popularity_score = popularity_score + 0.1
            WHERE id = NEW.target_id AND is_active = true;
        WHEN 5 THEN -- API站
            UPDATE api_stations SET access_count = access_count + 1, last_accessed_at = NOW(),
                                    popularity_score = popularity_score + 0.1
            WHERE id = NEW.target_id AND is_active = true;
    END CASE;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_increment_access_count IS '收藏时自动增加目标访问计数';

CREATE TRIGGER trg_favorite_access_count
    AFTER INSERT ON favorites
    FOR EACH ROW
    EXECUTE FUNCTION fn_increment_access_count();


-- ============================================================
-- FILE: 08_seed_data.sql
-- ============================================================

-- ============================================================
-- Aidean AI模型天梯图平台 - 种子数据脚本
-- 08_seed_data.sql
-- 功能：插入字典数据、初始功能开关、系统配置、示例数据
-- 环境：PostgreSQL 16+
-- ============================================================

-- ============================================================
-- 1. 字典数据
-- ============================================================

-- 用户角色字典
INSERT INTO dict_items (id, category, code, label, label_en, sort_order, created_at, updated_at, is_active, version, tenant_id) VALUES
(1, 'user_role', '0', '访客', 'Guest', 0, NOW(), NOW(), true, 1, 0),
(2, 'user_role', '1', '普通用户', 'User', 1, NOW(), NOW(), true, 1, 0),
(3, 'user_role', '2', '工具提供者', 'Provider', 2, NOW(), NOW(), true, 1, 0),
(4, 'user_role', '3', '管理员', 'Admin', 3, NOW(), NOW(), true, 1, 0),
(5, 'user_role', '99', '系统', 'System', 99, NOW(), NOW(), true, 1, 0);

-- 用户状态字典
INSERT INTO dict_items (id, category, code, label, label_en, sort_order, created_at, updated_at, is_active, version, tenant_id) VALUES
(6, 'user_status', '0', '禁用', 'Disabled', 0, NOW(), NOW(), true, 1, 0),
(7, 'user_status', '1', '正常', 'Active', 1, NOW(), NOW(), true, 1, 0),
(8, 'user_status', '2', '待验证', 'Pending', 2, NOW(), NOW(), true, 1, 0);

-- 模型类型字典
INSERT INTO dict_items (id, category, code, label, label_en, sort_order, created_at, updated_at, is_active, version, tenant_id) VALUES
(9, 'model_type', '0', '全部', 'All', 0, NOW(), NOW(), true, 1, 0),
(10, 'model_type', '1', '对话', 'Chat', 1, NOW(), NOW(), true, 1, 0),
(11, 'model_type', '2', '生图', 'Image Generation', 2, NOW(), NOW(), true, 1, 0),
(12, 'model_type', '3', '嵌入', 'Embedding', 3, NOW(), NOW(), true, 1, 0),
(13, 'model_type', '4', '重排序', 'Rerank', 4, NOW(), NOW(), true, 1, 0),
(14, 'model_type', '5', '语音', 'Audio', 5, NOW(), NOW(), true, 1, 0),
(15, 'model_type', '6', '视频', 'Video', 6, NOW(), NOW(), true, 1, 0),
(16, 'model_type', '7', '系统', 'System', 7, NOW(), NOW(), true, 1, 0),
(17, 'model_type', '8', '多模态', 'Multimodal', 8, NOW(), NOW(), true, 1, 0);

-- 模型分类字典
INSERT INTO dict_items (id, category, code, label, label_en, sort_order, created_at, updated_at, is_active, version, tenant_id) VALUES
(18, 'model_category', '1', '专业版', 'Professional', 1, NOW(), NOW(), true, 1, 0),
(19, 'model_category', '2', '应用版', 'Application', 2, NOW(), NOW(), true, 1, 0);

-- 模型协议字典
INSERT INTO dict_items (id, category, code, label, label_en, sort_order, created_at, updated_at, is_active, version, tenant_id) VALUES
(20, 'model_protocol', '0', '其他', 'Other', 0, NOW(), NOW(), true, 1, 0),
(21, 'model_protocol', '1', 'OpenAI', 'OpenAI', 1, NOW(), NOW(), true, 1, 0),
(22, 'model_protocol', '2', 'Anthropic', 'Anthropic', 2, NOW(), NOW(), true, 1, 0);

-- 模型状态字典
INSERT INTO dict_items (id, category, code, label, label_en, sort_order, created_at, updated_at, is_active, version, tenant_id) VALUES
(23, 'model_status', '0', '下架', 'Offline', 0, NOW(), NOW(), true, 1, 0),
(24, 'model_status', '1', '正常', 'Active', 1, NOW(), NOW(), true, 1, 0),
(25, 'model_status', '2', '测试中', 'Testing', 2, NOW(), NOW(), true, 1, 0);

-- 榜单类型字典
INSERT INTO dict_items (id, category, code, label, label_en, sort_order, created_at, updated_at, is_active, version, tenant_id) VALUES
(26, 'ladder_type', '1', '性能天梯图', 'Performance Ladder', 1, NOW(), NOW(), true, 1, 0),
(27, 'ladder_type', '2', '性价比排行', 'Cost-Performance Ranking', 2, NOW(), NOW(), true, 1, 0),
(28, 'ladder_type', '3', '开源模型榜', 'Open Source Ranking', 3, NOW(), NOW(), true, 1, 0),
(29, 'ladder_type', '4', '手机端模型榜', 'Mobile Model Ranking', 4, NOW(), NOW(), true, 1, 0);

-- 交易类型字典
INSERT INTO dict_items (id, category, code, label, label_en, sort_order, created_at, updated_at, is_active, version, tenant_id) VALUES
(30, 'transaction_type', '1', '充值', 'Recharge', 1, NOW(), NOW(), true, 1, 0),
(31, 'transaction_type', '2', '消费', 'Consumption', 2, NOW(), NOW(), true, 1, 0),
(32, 'transaction_type', '3', '退款', 'Refund', 3, NOW(), NOW(), true, 1, 0),
(33, 'transaction_type', '4', '系统调整', 'System Adjustment', 4, NOW(), NOW(), true, 1, 0);

-- 支付方式字典
INSERT INTO dict_items (id, category, code, label, label_en, sort_order, created_at, updated_at, is_active, version, tenant_id) VALUES
(34, 'pay_method', '1', '微信支付', 'WeChat Pay', 1, NOW(), NOW(), true, 1, 0),
(35, 'pay_method', '2', '支付宝', 'Alipay', 2, NOW(), NOW(), true, 1, 0);

-- 订单状态字典
INSERT INTO dict_items (id, category, code, label, label_en, sort_order, created_at, updated_at, is_active, version, tenant_id) VALUES
(36, 'order_status', '0', '待支付', 'Pending', 0, NOW(), NOW(), true, 1, 0),
(37, 'order_status', '1', '已支付', 'Paid', 1, NOW(), NOW(), true, 1, 0),
(38, 'order_status', '2', '已取消', 'Cancelled', 2, NOW(), NOW(), true, 1, 0),
(39, 'order_status', '3', '已退款', 'Refunded', 3, NOW(), NOW(), true, 1, 0);

-- 收藏类型字典
INSERT INTO dict_items (id, category, code, label, label_en, sort_order, created_at, updated_at, is_active, version, tenant_id) VALUES
(40, 'favorite_type', '1', '模型', 'Model', 1, NOW(), NOW(), true, 1, 0),
(41, 'favorite_type', '2', 'Skill', 'Skill', 2, NOW(), NOW(), true, 1, 0),
(42, 'favorite_type', '3', 'MCP', 'MCP', 3, NOW(), NOW(), true, 1, 0),
(43, 'favorite_type', '4', 'Agent', 'Agent', 4, NOW(), NOW(), true, 1, 0),
(44, 'favorite_type', '5', 'API站', 'API Station', 5, NOW(), NOW(), true, 1, 0);

-- 测评状态字典
INSERT INTO dict_items (id, category, code, label, label_en, sort_order, created_at, updated_at, is_active, version, tenant_id) VALUES
(45, 'evaluation_status', '0', '待执行', 'Pending', 0, NOW(), NOW(), true, 1, 0),
(46, 'evaluation_status', '1', '执行中', 'Running', 1, NOW(), NOW(), true, 1, 0),
(47, 'evaluation_status', '2', '已完成', 'Completed', 2, NOW(), NOW(), true, 1, 0),
(48, 'evaluation_status', '3', '失败', 'Failed', 3, NOW(), NOW(), true, 1, 0);

-- 订阅类型字典
INSERT INTO dict_items (id, category, code, label, label_en, sort_order, created_at, updated_at, is_active, version, tenant_id) VALUES
(49, 'subscription_plan', '1', '月度会员', 'Monthly', 1, NOW(), NOW(), true, 1, 0),
(50, 'subscription_plan', '2', '季度会员', 'Quarterly', 2, NOW(), NOW(), true, 1, 0),
(51, 'subscription_plan', '3', '年度会员', 'Yearly', 3, NOW(), NOW(), true, 1, 0);

-- ============================================================
-- 2. 功能开关
-- ============================================================

INSERT INTO feature_flags (id, key, name, enabled, config, created_at, updated_at, is_active, version, tenant_id) VALUES
(1001, 'ladder_performance', '性能天梯图', true, '{"description": "大模型性能天梯图"}', NOW(), NOW(), true, 1, 0),
(1002, 'ladder_cost_performance', '性价比排行', true, '{"description": "大模型性价比天梯图"}', NOW(), NOW(), true, 1, 0),
(1003, 'ladder_open_source', '开源模型榜', true, '{"description": "大模型开源天梯图"}', NOW(), NOW(), true, 1, 0),
(1004, 'ladder_mobile', '手机端模型榜', true, '{"description": "手机端大模型天梯图"}', NOW(), NOW(), true, 1, 0),
(1005, 'evaluation_free', '免费测评', true, '{"description": "免费查看历史测评数据"}', NOW(), NOW(), true, 1, 0),
(1006, 'evaluation_paid', '付费测评', true, '{"description": "付费自定义提示词实时对比", "price_per_model": 2.00}', NOW(), NOW(), true, 1, 0),
(1007, 'ladder_skills', 'Skills天梯图', false, '{"description": "Skill技能天梯图"}', NOW(), NOW(), true, 1, 0),
(1008, 'ladder_mcp', 'MCP天梯图', false, '{"description": "MCP服务器天梯图"}', NOW(), NOW(), true, 1, 0),
(1009, 'ladder_agent', 'Agent天梯图', false, '{"description": "Agent智能体天梯图"}', NOW(), NOW(), true, 1, 0),
(1010, 'ladder_api_station', 'API站天梯图', false, '{"description": "API中转站天梯图"}', NOW(), NOW(), true, 1, 0),
(1011, 'favorite_system', '收藏系统', true, '{"description": "用户收藏功能"}', NOW(), NOW(), true, 1, 0),
(1012, 'recharge_system', '充值系统', true, '{"description": "用户余额充值"}', NOW(), NOW(), true, 1, 0),
(1013, 'news_module', '资讯模块', true, '{"description": "AI行业资讯"}', NOW(), NOW(), true, 1, 0);

-- ============================================================
-- 3. 系统配置
-- ============================================================

INSERT INTO system_configs (id, config_key, config_value, description, is_secret, created_at, updated_at, is_active, version, tenant_id) VALUES
(2001, 'ladder_weight_official', '0.25', '官方评测基准权重', false, NOW(), NOW(), true, 1, 0),
(2002, 'ladder_weight_practical', '0.25', '实际评测权重', false, NOW(), NOW(), true, 1, 0),
(2003, 'ladder_weight_reputation', '0.25', '风评权重', false, NOW(), NOW(), true, 1, 0),
(2004, 'ladder_weight_self_test', '0.25', '自测权重', false, NOW(), NOW(), true, 1, 0),
(2005, 'evaluation_price_per_model', '2.00', '单次测评每模型价格(元)', false, NOW(), NOW(), true, 1, 0),
(2006, 'min_recharge_amount', '10.00', '最低充值金额(元)', false, NOW(), NOW(), true, 1, 0),
(2007, 'exchange_rate_usd_cny', '5.00', '美元兑人民币汇率(用于价格换算)', false, NOW(), NOW(), true, 1, 0),
(2008, 'default_page_size', '50', '默认每页显示数量', false, NOW(), NOW(), true, 1, 0),
(2009, 'max_page_size', '200', '最大每页显示数量', false, NOW(), NOW(), true, 1, 0),
(2010, 'cache_ttl_model_detail', '3600', '模型详情缓存时间(秒)', false, NOW(), NOW(), true, 1, 0),
(2011, 'cache_ttl_ladder_list', '300', '天梯列表缓存时间(秒)', false, NOW(), NOW(), true, 1, 0),
(2012, 'cache_ttl_user_profile', '1800', '用户资料缓存时间(秒)', false, NOW(), NOW(), true, 1, 0),
(2013, 'redis_key_prefix', 'aidean', 'Redis Key前缀', false, NOW(), NOW(), true, 1, 0),
(2014, 'snowflake_worker_id', '1', 'Snowflake算法Worker ID', false, NOW(), NOW(), true, 1, 0),
(2015, 'snowflake_datacenter_id', '1', 'Snowflake算法Datacenter ID', false, NOW(), NOW(), true, 1, 0);

-- ============================================================
-- 4. 示例模型商数据
-- ============================================================

INSERT INTO providers (id, name, name_en, name_zh, slug, logo_url, website, description, country, sort_order, status, created_at, updated_at, is_active, version, tenant_id) VALUES
(10001, 'OpenAI', 'OpenAI', 'OpenAI', 'openai', '/logos/openai.svg', 'https://openai.com', 'ChatGPT背后的公司，GPT系列模型开发者', 'US', 1, 1, NOW(), NOW(), true, 1, 0),
(10002, 'Anthropic', 'Anthropic', 'Anthropic', 'anthropic', '/logos/anthropic.svg', 'https://anthropic.com', 'Claude系列模型开发者', 'US', 2, 1, NOW(), NOW(), true, 1, 0),
(10003, 'Google', 'Google', '谷歌', 'google', '/logos/google.svg', 'https://deepmind.google', 'Gemini系列模型开发者', 'US', 3, 1, NOW(), NOW(), true, 1, 0),
(10004, '通义千问', 'Qwen', '通义千问', 'qwen', '/logos/qwen.svg', 'https://tongyi.aliyun.com', '阿里巴巴旗下大模型', 'CN', 4, 1, NOW(), NOW(), true, 1, 0),
(10005, '智谱AI', 'Zhipu AI', '智谱AI', 'zhipu', '/logos/zhipu.svg', 'https://zhipuai.cn', 'GLM系列模型开发者', 'CN', 5, 1, NOW(), NOW(), true, 1, 0),
(10006, 'DeepSeek', 'DeepSeek', '深度求索', 'deepseek', '/logos/deepseek.svg', 'https://deepseek.com', 'DeepSeek系列模型开发者', 'CN', 6, 1, NOW(), NOW(), true, 1, 0),
(10007, '月之暗面', 'Moonshot AI', '月之暗面', 'kimi', '/logos/kimi.svg', 'https://kimi.ai', 'Kimi智能助手开发者', 'CN', 7, 1, NOW(), NOW(), true, 1, 0),
(10008, 'MiniMax', 'MiniMax', 'MiniMax', 'minimax', '/logos/minimax.svg', 'https://minimax.chat', 'MiniMax系列模型开发者', 'CN', 8, 1, NOW(), NOW(), true, 1, 0),
(10009, '百度', 'Baidu', '百度', 'baidu', '/logos/baidu.svg', 'https://yiyan.baidu.com', '文心一言开发者', 'CN', 9, 1, NOW(), NOW(), true, 1, 0),
(10010, '零一万物', '01.AI', '零一万物', '01ai', '/logos/01ai.svg', 'https://01.ai', 'Yi系列模型开发者', 'CN', 10, 1, NOW(), NOW(), true, 1, 0);

-- ============================================================
-- 5. 示例模型数据
-- ============================================================

INSERT INTO models (id, name, name_en, name_zh, slug, provider_id, type, category, params, context_length, is_open_source, protocol, release_date, status, created_at, updated_at, is_active, version, tenant_id) VALUES
(20001, 'GPT-4o', 'GPT-4o', 'GPT-4o', 'gpt-4o', 10001, 1, 1, '混合', 128000, false, 1, '2024-05-13', 1, NOW(), NOW(), true, 1, 0),
(20002, 'GPT-4o-mini', 'GPT-4o-mini', 'GPT-4o-mini', 'gpt-4o-mini', 10001, 1, 1, '混合', 128000, false, 1, '2024-07-18', 1, NOW(), NOW(), true, 1, 0),
(20003, 'Claude 3.5 Sonnet', 'Claude 3.5 Sonnet', 'Claude 3.5 Sonnet', 'claude-3-5-sonnet', 10002, 1, 1, '混合', 200000, false, 2, '2024-10-22', 1, NOW(), NOW(), true, 1, 0),
(20004, 'Claude 3.5 Haiku', 'Claude 3.5 Haiku', 'Claude 3.5 Haiku', 'claude-3-5-haiku', 10002, 1, 1, '混合', 200000, false, 2, '2024-10-22', 1, NOW(), NOW(), true, 1, 0),
(20005, 'Gemini 2.0 Flash', 'Gemini 2.0 Flash', 'Gemini 2.0 Flash', 'gemini-2-flash', 10003, 1, 1, '混合', 1000000, false, 0, '2024-12-01', 1, NOW(), NOW(), true, 1, 0),
(20006, 'Qwen 2.5 72B', 'Qwen 2.5 72B', '通义千问2.5 72B', 'qwen-2.5-72b', 10004, 1, 1, '72B', 131072, true, 0, '2024-09-19', 1, NOW(), NOW(), true, 1, 0),
(20007, 'GLM-4', 'GLM-4', 'GLM-4', 'glm-4', 10005, 1, 1, '混合', 128000, false, 0, '2024-06-05', 1, NOW(), NOW(), true, 1, 0),
(20008, 'DeepSeek V3', 'DeepSeek V3', 'DeepSeek V3', 'deepseek-v3', 10006, 1, 1, '671B', 128000, true, 0, '2024-12-26', 1, NOW(), NOW(), true, 1, 0),
(20009, 'Kimi k1.5', 'Kimi k1.5', 'Kimi k1.5', 'kimi-k1-5', 10007, 1, 1, '混合', 128000, false, 0, '2025-01-01', 1, NOW(), NOW(), true, 1, 0),
(20010, 'MiniMax M1', 'MiniMax M1', 'MiniMax M1', 'minimax-m1', 10008, 1, 1, '混合', 128000, false, 0, '2025-01-15', 1, NOW(), NOW(), true, 1, 0);

-- ============================================================
-- 6. 示例模型评分数据
-- ============================================================

INSERT INTO model_scores (id, model_id, official_score, practical_score, reputation_score, self_test_score, total_score, weight_config, calculated_at, created_at, updated_at, is_active, version, tenant_id) VALUES
(30001, 20001, 92.5, 88.3, 95.0, 90.1, 91.48, '{"official": 0.25, "practical": 0.25, "reputation": 0.25, "self_test": 0.25}', NOW(), NOW(), NOW(), true, 1, 0),
(30002, 20002, 85.0, 82.1, 88.0, 84.5, 84.90, '{"official": 0.25, "practical": 0.25, "reputation": 0.25, "self_test": 0.25}', NOW(), NOW(), NOW(), true, 1, 0),
(30003, 20003, 94.2, 91.5, 93.8, 92.0, 92.88, '{"official": 0.25, "practical": 0.25, "reputation": 0.25, "self_test": 0.25}', NOW(), NOW(), NOW(), true, 1, 0),
(30004, 20004, 82.0, 79.5, 85.0, 80.2, 81.68, '{"official": 0.25, "practical": 0.25, "reputation": 0.25, "self_test": 0.25}', NOW(), NOW(), NOW(), true, 1, 0),
(30005, 20005, 90.0, 87.2, 89.5, 88.0, 88.68, '{"official": 0.25, "practical": 0.25, "reputation": 0.25, "self_test": 0.25}', NOW(), NOW(), NOW(), true, 1, 0),
(30006, 20006, 88.5, 85.0, 87.2, 86.5, 86.80, '{"official": 0.25, "practical": 0.25, "reputation": 0.25, "self_test": 0.25}', NOW(), NOW(), NOW(), true, 1, 0),
(30007, 20007, 86.0, 83.5, 85.0, 84.0, 84.63, '{"official": 0.25, "practical": 0.25, "reputation": 0.25, "self_test": 0.25}', NOW(), NOW(), NOW(), true, 1, 0),
(30008, 20008, 91.0, 89.2, 90.5, 88.8, 89.88, '{"official": 0.25, "practical": 0.25, "reputation": 0.25, "self_test": 0.25}', NOW(), NOW(), NOW(), true, 1, 0),
(30009, 20009, 87.5, 84.0, 86.5, 85.2, 85.80, '{"official": 0.25, "practical": 0.25, "reputation": 0.25, "self_test": 0.25}', NOW(), NOW(), NOW(), true, 1, 0),
(30010, 20010, 84.0, 81.5, 83.0, 82.5, 82.75, '{"official": 0.25, "practical": 0.25, "reputation": 0.25, "self_test": 0.25}', NOW(), NOW(), NOW(), true, 1, 0);

-- ============================================================
-- 7. 示例天梯排名数据
-- ============================================================

INSERT INTO ladder_rankings (id, model_id, ladder_type, rank, score, snapshot_date, created_at, updated_at, is_active, version, tenant_id) VALUES
(40001, 20003, 1, 1, 92.88, CURRENT_DATE, NOW(), NOW(), true, 1, 0),
(40002, 20001, 1, 2, 91.48, CURRENT_DATE, NOW(), NOW(), true, 1, 0),
(40003, 20008, 1, 3, 89.88, CURRENT_DATE, NOW(), NOW(), true, 1, 0),
(40004, 20005, 1, 4, 88.68, CURRENT_DATE, NOW(), NOW(), true, 1, 0),
(40005, 20006, 1, 5, 86.80, CURRENT_DATE, NOW(), NOW(), true, 1, 0),
(40006, 20009, 1, 6, 85.80, CURRENT_DATE, NOW(), NOW(), true, 1, 0),
(40007, 20007, 1, 7, 84.63, CURRENT_DATE, NOW(), NOW(), true, 1, 0),
(40008, 20002, 1, 8, 84.90, CURRENT_DATE, NOW(), NOW(), true, 1, 0),
(40009, 20010, 1, 9, 82.75, CURRENT_DATE, NOW(), NOW(), true, 1, 0),
(40010, 20004, 1, 10, 81.68, CURRENT_DATE, NOW(), NOW(), true, 1, 0);

-- ============================================================
-- 8. 示例基准测试数据
-- ============================================================

INSERT INTO benchmarks (id, model_id, benchmark_name, score, max_score, source, source_url, recorded_at, created_at, updated_at, is_active, version, tenant_id) VALUES
(50001, 20001, 'MMLU', 88.7, 100, 'OpenAI', 'https://openai.com', '2024-05-13', NOW(), NOW(), true, 1, 0),
(50002, 20001, 'HumanEval', 90.2, 100, 'OpenAI', 'https://openai.com', '2024-05-13', NOW(), NOW(), true, 1, 0),
(50003, 20003, 'MMLU', 91.5, 100, 'Anthropic', 'https://anthropic.com', '2024-10-22', NOW(), NOW(), true, 1, 0),
(50004, 20003, 'HumanEval', 92.8, 100, 'Anthropic', 'https://anthropic.com', '2024-10-22', NOW(), NOW(), true, 1, 0),
(50005, 20008, 'MMLU', 90.1, 100, 'DeepSeek', 'https://deepseek.com', '2024-12-26', NOW(), NOW(), true, 1, 0),
(50006, 20008, 'HumanEval', 89.5, 100, 'DeepSeek', 'https://deepseek.com', '2024-12-26', NOW(), NOW(), true, 1, 0);

-- ============================================================
-- 9. 示例管理员用户 (密码: admin123, 需要应用层加密)
-- ============================================================

-- 注意：实际密码应由应用层使用bcrypt加密后存储
-- 这里仅作为示例，密码哈希为 "admin123" 的bcrypt哈希 (需要替换为真实哈希)
INSERT INTO users (id, email, password_hash, nickname, role, status, balance, created_at, updated_at, is_active, version, tenant_id) VALUES
(1, 'admin@aidean.com', '$2b$10$dummy_hash_please_replace_in_production', '系统管理员', 3, 1, 0, NOW(), NOW(), true, 1, 0);

-- ============================================================
-- 10. 更新序列值 (如果使用序列生成ID)
-- ============================================================

-- 设置各表序列起始值 (如果使用序列)
-- SELECT setval('dict_items_id_seq', 51);
-- SELECT setval('feature_flags_id_seq', 1013);
-- SELECT setval('system_configs_id_seq', 2015);
-- SELECT setval('providers_id_seq', 10010);
-- SELECT setval('models_id_seq', 20010);
-- SELECT setval('model_scores_id_seq', 30010);
-- SELECT setval('ladder_rankings_id_seq', 40010);
-- SELECT setval('benchmarks_id_seq', 50006);
-- SELECT setval('users_id_seq', 1);


-- ============================================================
-- FILE: 09_create_agent_tables.sql
-- ============================================================

-- ============================================================
-- Aidean IDE/CLI Agent系统 - 表创建脚本
-- 09_create_agent_tables.sql
-- 功能：创建分身系统、任务执行、远程控制等表
-- 依赖：03_create_tables.sql (users表)
-- ============================================================

-- ============================================================
-- 1. 分身与学习系统
-- ============================================================

-- 1.1 用户分身表
CREATE TABLE personas (
    id VARCHAR(26) PRIMARY KEY,
    user_id VARCHAR(26) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    avatar VARCHAR(500),
    config JSONB NOT NULL DEFAULT '{}',
    preferences JSONB NOT NULL DEFAULT '{}',
    snapshots JSONB[] DEFAULT ARRAY[]::JSONB[],
    corrections JSONB[] DEFAULT ARRAY[]::JSONB[],
    learn_count INT DEFAULT 0,
    last_learned_at TIMESTAMPTZ,
    auto_execute_threshold NUMERIC(3,2) DEFAULT 0.99,
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

COMMENT ON TABLE personas IS '用户分身表：存储思维习惯、责任感、审美、接受程度等配置';

-- 1.2 学习数据源表
CREATE TABLE learning_sources (
    id VARCHAR(26) PRIMARY KEY,
    user_id VARCHAR(26) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    persona_id VARCHAR(26) REFERENCES personas(id) ON DELETE SET NULL,
    source_type VARCHAR(20) NOT NULL CHECK (source_type IN ('CONVERSATION', 'FILE_UPLOAD', 'USER_CORRECTION', 'MANUAL_INPUT', 'BEHAVIOR_LOG')),
    source_ref VARCHAR(255),
    summary TEXT NOT NULL,
    extracted_patterns JSONB NOT NULL DEFAULT '[]',
    applied BOOLEAN DEFAULT FALSE,
    applied_at TIMESTAMPTZ,
    applied_version INT,
    confidence NUMERIC(3,2) DEFAULT 0.50,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED', 'REJECTED')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

COMMENT ON TABLE learning_sources IS '学习数据源表：对话、文件、纠正等学习来源';

-- 1.3 对话记录表
CREATE TABLE conversations (
    id VARCHAR(26) PRIMARY KEY,
    user_id VARCHAR(26) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255),
    message_count INT DEFAULT 0,
    persona_id VARCHAR(26),
    vector_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
    insights JSONB,
    type VARCHAR(20) DEFAULT 'NORMAL' CHECK (type IN ('NORMAL', 'AUTO_EXECUTE', 'MULTI_AGENT', 'DEBUG', 'WORKFLOW')),
    is_learned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

COMMENT ON TABLE conversations IS '对话记录表：会话元数据、向量引用、洞察总结';

-- ============================================================
-- 2. 文档与知识系统
-- ============================================================

-- 2.1 文档管理表
CREATE TABLE documents (
    id VARCHAR(26) PRIMARY KEY,
    user_id VARCHAR(26) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    file_type VARCHAR(20) NOT NULL CHECK (file_type IN ('TXT', 'MARKDOWN', 'WORD', 'EXCEL', 'PDF', 'IMAGE', 'CODE', 'OTHER')),
    file_size INT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    summary TEXT,
    vector_id VARCHAR(100),
    ocr_result JSONB,
    entities TEXT[] DEFAULT ARRAY[]::TEXT[],
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED')),
    is_learned BOOLEAN DEFAULT FALSE,
    learned_at TIMESTAMPTZ,
    version INT DEFAULT 1,
    parent_id VARCHAR(26),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

COMMENT ON TABLE documents IS '文档管理表：文件上传、OCR、向量索引';

-- 2.2 文档模板表
CREATE TABLE doc_templates (
    id VARCHAR(26) PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    type VARCHAR(20) NOT NULL CHECK (type IN ('PAPER', 'REPORT', 'ARTICLE', 'RESUME', 'CONTRACT', 'OTHER')),
    institution VARCHAR(100),
    format_rules JSONB NOT NULL DEFAULT '{}',
    structure JSONB NOT NULL DEFAULT '[]',
    style_config JSONB,
    template_file VARCHAR(500),
    preview_image VARCHAR(500),
    use_count INT DEFAULT 0,
    is_default BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

COMMENT ON TABLE doc_templates IS '文档模板表：论文格式、学校模板配置';

-- 2.3 用户模板收藏表
CREATE TABLE user_templates (
    id VARCHAR(26) PRIMARY KEY,
    user_id VARCHAR(26) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_id VARCHAR(26) NOT NULL REFERENCES doc_templates(id) ON DELETE CASCADE,
    custom_config JSONB,
    is_favorite BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, template_id)
);

COMMENT ON TABLE user_templates IS '用户模板收藏表：自定义配置、收藏管理';

-- ============================================================
-- 3. 任务执行系统
-- ============================================================

-- 3.1 任务表
CREATE TABLE tasks (
    id VARCHAR(26) PRIMARY KEY,
    user_id VARCHAR(26) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    persona_id VARCHAR(26) REFERENCES personas(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    plan JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'ROLLBACKING', 'ROLLBACKED', 'PAUSED', 'CANCELLED')),
    auto_execute BOOLEAN DEFAULT FALSE,
    confidence NUMERIC(3,2),
    progress NUMERIC(5,2) DEFAULT 0,
    current_step VARCHAR(26),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    estimated_duration INT,
    source VARCHAR(20) DEFAULT 'MANUAL' CHECK (source IN ('MANUAL', 'REMOTE', 'SCHEDULED', 'WEBHOOK')),
    source_ref VARCHAR(255)
);

COMMENT ON TABLE tasks IS '任务表：执行计划JSON DAG、自动执行、置信度检测';

-- 3.2 任务步骤表
CREATE TABLE task_steps (
    id VARCHAR(26) PRIMARY KEY,
    task_id VARCHAR(26) NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    step_order INT NOT NULL,
    step_id VARCHAR(50) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('SKILL', 'MCP', 'AGENT', 'CODE', 'DOC', 'SHELL', 'HTTP', 'LLM')),
    tool VARCHAR(100) NOT NULL,
    input JSONB NOT NULL DEFAULT '{}',
    output JSONB,
    error TEXT,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'SKIPPED', 'ROLLED_BACK')),
    duration INT,
    checkpoint JSONB,
    retry_count INT DEFAULT 0,
    max_retries INT DEFAULT 3,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

COMMENT ON TABLE task_steps IS '任务步骤表：Skill/MCP/Agent执行记录、检查点';

-- 3.3 任务回滚记录表
CREATE TABLE task_rollbacks (
    id VARCHAR(26) PRIMARY KEY,
    task_id VARCHAR(26) NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    step_id VARCHAR(26) NOT NULL,
    snapshot JSONB NOT NULL,
    reason VARCHAR(20) NOT NULL CHECK (reason IN ('USER_REQUEST', 'ERROR', 'TIMEOUT', 'SAFETY_CHECK', 'MANUAL')),
    reason_detail TEXT,
    scope VARCHAR(10) DEFAULT 'FULL' CHECK (scope IN ('FULL', 'PARTIAL')),
    files_restored INT DEFAULT 0,
    steps_rolled_back INT DEFAULT 0,
    rolled_back_at TIMESTAMPTZ DEFAULT NOW(),
    rolled_back_by VARCHAR(26) NOT NULL
);

COMMENT ON TABLE task_rollbacks IS '任务回滚表：快照恢复、回滚原因、影响统计';

-- ============================================================
-- 4. 工具注册系统
-- ============================================================

-- 4.1 工具注册表
CREATE TABLE tool_registries (
    id VARCHAR(26) PRIMARY KEY,
    user_id VARCHAR(26) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('SKILL', 'MCP', 'AGENT', 'KERNEL')),
    name VARCHAR(100) NOT NULL,
    display_name VARCHAR(100),
    version VARCHAR(20) DEFAULT '1.0.0',
    description TEXT,
    config JSONB NOT NULL DEFAULT '{}',
    permissions JSONB,
    scope VARCHAR(10) DEFAULT 'SELECTED' CHECK (scope IN ('GLOBAL', 'SELECTED', 'NONE')),
    selected_paths TEXT[] DEFAULT ARRAY[]::TEXT[],
    output_rule VARCHAR(10) DEFAULT 'STREAM' CHECK (output_rule IN ('STREAM', 'BUFFER', 'NONE')),
    call_rule VARCHAR(10) CHECK (call_rule IN ('SEQUENTIAL', 'PARALLEL', 'NONE')),
    call_scenario TEXT,
    use_count INT DEFAULT 0,
    avg_latency NUMERIC(10,2),
    last_used_at TIMESTAMPTZ,
    is_enabled BOOLEAN DEFAULT TRUE,
    is_public BOOLEAN DEFAULT FALSE,
    public_config JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

COMMENT ON TABLE tool_registries IS '工具注册表：Skill/MCP/Agent/Kernel配置、权限、操作范围';

-- 4.2 工具执行日志表
CREATE TABLE tool_executions (
    id VARCHAR(26) PRIMARY KEY,
    tool_id VARCHAR(26) NOT NULL REFERENCES tool_registries(id) ON DELETE CASCADE,
    task_id VARCHAR(26),
    context JSONB,
    input JSONB NOT NULL DEFAULT '{}',
    output JSONB,
    error TEXT,
    latency INT NOT NULL,
    tokens_used INT,
    status VARCHAR(20) NOT NULL CHECK (status IN ('SUCCESS', 'FAILED', 'TIMEOUT', 'CANCELLED')),
    files_accessed TEXT[] DEFAULT ARRAY[]::TEXT[],
    commands_executed TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

COMMENT ON TABLE tool_executions IS '工具执行日志表：输入输出、性能指标、安全审计';

-- ============================================================
-- 5. 远程控制系统 (ACP)
-- ============================================================

-- 5.1 远程控制通道表
CREATE TABLE remote_channels (
    id VARCHAR(26) PRIMARY KEY,
    user_id VARCHAR(26) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('WEBHOOK', 'WECHAT', 'WECHAT_WORK', 'DINGTALK', 'FEISHU', 'QQ', 'APP')),
    name VARCHAR(100) NOT NULL,
    config JSONB NOT NULL DEFAULT '{}',
    features JSONB NOT NULL DEFAULT '{}',
    voice_config JSONB,
    templates JSONB,
    is_enabled BOOLEAN DEFAULT FALSE,
    last_ping_at TIMESTAMPTZ,
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

COMMENT ON TABLE remote_channels IS '远程控制通道表：Webhook/微信/钉钉/飞书配置、语音设置';

-- 5.2 远程命令表
CREATE TABLE remote_commands (
    id VARCHAR(26) PRIMARY KEY,
    channel_id VARCHAR(26) NOT NULL REFERENCES remote_channels(id) ON DELETE CASCADE,
    raw_command TEXT NOT NULL,
    command_type VARCHAR(10) NOT NULL CHECK (command_type IN ('TEXT', 'VOICE', 'IMAGE', 'FILE')),
    media_url VARCHAR(500),
    media_data JSONB,
    intent VARCHAR(50) NOT NULL,
    parameters JSONB NOT NULL DEFAULT '{}',
    confidence NUMERIC(3,2) DEFAULT 0,
    task_id VARCHAR(26),
    result JSONB,
    status VARCHAR(20) DEFAULT 'RECEIVED' CHECK (status IN ('RECEIVED', 'PARSING', 'CONFIRMING', 'EXECUTING', 'COMPLETED', 'FAILED', 'CANCELLED')),
    need_confirm BOOLEAN DEFAULT FALSE,
    confirmed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    parsed_at TIMESTAMPTZ,
    executed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

COMMENT ON TABLE remote_commands IS '远程命令表：指令解析、意图识别、执行状态';


-- ============================================================
-- FILE: 10_create_agent_indexes.sql
-- ============================================================

-- ============================================================
-- Aidean IDE/CLI Agent系统 - 索引创建脚本
-- 10_create_agent_indexes.sql
-- 功能：为新表创建性能优化索引
-- ============================================================

-- ============================================================
-- 1. 分身与学习系统索引
-- ============================================================

-- Personas表索引
CREATE INDEX idx_personas_user_id ON personas(user_id);
CREATE INDEX idx_personas_is_default ON personas(is_default) WHERE is_default = TRUE;
CREATE INDEX idx_personas_is_active ON personas(is_active);
CREATE INDEX idx_personas_created_at ON personas(created_at);

-- LearningSources表索引
CREATE INDEX idx_learning_sources_user_id ON learning_sources(user_id);
CREATE INDEX idx_learning_sources_persona_id ON learning_sources(persona_id);
CREATE INDEX idx_learning_sources_source_type ON learning_sources(source_type);
CREATE INDEX idx_learning_sources_status ON learning_sources(status);
CREATE INDEX idx_learning_sources_applied ON learning_sources(applied);
CREATE INDEX idx_learning_sources_created_at ON learning_sources(created_at);

-- Conversations表索引
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_persona_id ON conversations(persona_id);
CREATE INDEX idx_conversations_type ON conversations(type);
CREATE INDEX idx_conversations_is_learned ON conversations(is_learned);
CREATE INDEX idx_conversations_created_at ON conversations(created_at);

-- ============================================================
-- 2. 文档与知识系统索引
-- ============================================================

-- Documents表索引
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_file_type ON documents(file_type);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_is_learned ON documents(is_learned);
CREATE INDEX idx_documents_vector_id ON documents(vector_id);
CREATE INDEX idx_documents_created_at ON documents(created_at);
CREATE INDEX idx_documents_entities ON documents USING GIN(entities);
CREATE INDEX idx_documents_tags ON documents USING GIN(tags);

-- DocTemplates表索引
CREATE INDEX idx_doc_templates_type ON doc_templates(type);
CREATE INDEX idx_doc_templates_institution ON doc_templates(institution);
CREATE INDEX idx_doc_templates_is_default ON doc_templates(is_default) WHERE is_default = TRUE;
CREATE INDEX idx_doc_templates_is_active ON doc_templates(is_active);

-- UserTemplates表索引
CREATE INDEX idx_user_templates_user_id ON user_templates(user_id);
CREATE INDEX idx_user_templates_template_id ON user_templates(template_id);

-- ============================================================
-- 3. 任务执行系统索引
-- ============================================================

-- Tasks表索引
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_persona_id ON tasks(persona_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_auto_execute ON tasks(auto_execute);
CREATE INDEX idx_tasks_source ON tasks(source);
CREATE INDEX idx_tasks_created_at ON tasks(created_at);

-- TaskSteps表索引
CREATE INDEX idx_task_steps_task_id ON task_steps(task_id);
CREATE INDEX idx_task_steps_status ON task_steps(status);
CREATE INDEX idx_task_steps_step_order ON task_steps(task_id, step_order);
CREATE INDEX idx_task_steps_created_at ON task_steps(created_at);

-- TaskRollbacks表索引
CREATE INDEX idx_task_rollbacks_task_id ON task_rollbacks(task_id);
CREATE INDEX idx_task_rollbacks_step_id ON task_rollbacks(step_id);
CREATE INDEX idx_task_rollbacks_rolled_back_at ON task_rollbacks(rolled_back_at);

-- ============================================================
-- 4. 工具注册系统索引
-- ============================================================

-- ToolRegistries表索引
CREATE INDEX idx_tool_registries_user_id ON tool_registries(user_id);
CREATE INDEX idx_tool_registries_type ON tool_registries(type);
CREATE INDEX idx_tool_registries_name ON tool_registries(name);
CREATE INDEX idx_tool_registries_is_enabled ON tool_registries(is_enabled);
CREATE INDEX idx_tool_registries_is_public ON tool_registries(is_public);
CREATE INDEX idx_tool_registries_created_at ON tool_registries(created_at);

-- ToolExecutions表索引
CREATE INDEX idx_tool_executions_tool_id ON tool_executions(tool_id);
CREATE INDEX idx_tool_executions_task_id ON tool_executions(task_id);
CREATE INDEX idx_tool_executions_status ON tool_executions(status);
CREATE INDEX idx_tool_executions_created_at ON tool_executions(created_at);

-- ============================================================
-- 5. 远程控制系统索引
-- ============================================================

-- RemoteChannels表索引
CREATE INDEX idx_remote_channels_user_id ON remote_channels(user_id);
CREATE INDEX idx_remote_channels_type ON remote_channels(type);
CREATE INDEX idx_remote_channels_is_enabled ON remote_channels(is_enabled);
CREATE INDEX idx_remote_channels_created_at ON remote_channels(created_at);

-- RemoteCommands表索引
CREATE INDEX idx_remote_commands_channel_id ON remote_commands(channel_id);
CREATE INDEX idx_remote_commands_status ON remote_commands(status);
CREATE INDEX idx_remote_commands_intent ON remote_commands(intent);
CREATE INDEX idx_remote_commands_task_id ON remote_commands(task_id);
CREATE INDEX idx_remote_commands_created_at ON remote_commands(created_at);


-- ============================================================
-- FILE: 11_create_agent_constraints.sql
-- ============================================================

-- ============================================================
-- Aidean IDE/CLI Agent系统 - 约束创建脚本
-- 11_create_agent_constraints.sql
-- 功能：为新表添加外键约束和检查约束
-- ============================================================

-- ============================================================
-- 1. 分身与学习系统外键约束
-- ============================================================

-- Personas表外键已在创建时定义
-- LearningSources表外键已在创建时定义
-- Conversations表外键
ALTER TABLE conversations ADD CONSTRAINT fk_conversations_persona 
    FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE SET NULL;

-- ============================================================
-- 2. 文档与知识系统外键约束
-- ============================================================

-- Documents表外键已在创建时定义
-- DocTemplates表无外键
-- UserTemplates表外键已在创建时定义

-- Documents表自引用外键（版本管理）
ALTER TABLE documents ADD CONSTRAINT fk_documents_parent 
    FOREIGN KEY (parent_id) REFERENCES documents(id) ON DELETE SET NULL;

-- ============================================================
-- 3. 任务执行系统外键约束
-- ============================================================

-- Tasks表外键已在创建时定义
-- TaskSteps表外键已在创建时定义
-- TaskRollbacks表外键
ALTER TABLE task_rollbacks ADD CONSTRAINT fk_task_rollbacks_task 
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;

ALTER TABLE task_rollbacks ADD CONSTRAINT fk_task_rollbacks_step 
    FOREIGN KEY (step_id) REFERENCES task_steps(id) ON DELETE CASCADE;

-- Tasks表自引用外键（当前步骤）
ALTER TABLE tasks ADD CONSTRAINT fk_tasks_current_step 
    FOREIGN KEY (current_step) REFERENCES task_steps(id) ON DELETE SET NULL;

-- ============================================================
-- 4. 工具注册系统外键约束
-- ============================================================

-- ToolRegistries表外键已在创建时定义
-- ToolExecutions表外键
ALTER TABLE tool_executions ADD CONSTRAINT fk_tool_executions_task 
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL;

-- ============================================================
-- 5. 远程控制系统外键约束
-- ============================================================

-- RemoteChannels表外键已在创建时定义
-- RemoteCommands表外键
ALTER TABLE remote_commands ADD CONSTRAINT fk_remote_commands_task 
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL;

-- ============================================================
-- 6. 添加额外的检查约束
-- ============================================================

-- 置信度范围检查
ALTER TABLE personas ADD CONSTRAINT chk_personas_threshold 
    CHECK (auto_execute_threshold >= 0 AND auto_execute_threshold <= 1);

ALTER TABLE learning_sources ADD CONSTRAINT chk_learning_sources_confidence 
    CHECK (confidence >= 0 AND confidence <= 1);

ALTER TABLE tasks ADD CONSTRAINT chk_tasks_confidence 
    CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1));

ALTER TABLE tasks ADD CONSTRAINT chk_tasks_progress 
    CHECK (progress >= 0 AND progress <= 100);

ALTER TABLE remote_commands ADD CONSTRAINT chk_remote_commands_confidence 
    CHECK (confidence >= 0 AND confidence <= 1);

-- 任务步骤执行时间检查
ALTER TABLE task_steps ADD CONSTRAINT chk_task_steps_duration 
    CHECK (duration IS NULL OR duration >= 0);

ALTER TABLE tool_executions ADD CONSTRAINT chk_tool_executions_latency 
    CHECK (latency >= 0);

-- 文件大小检查
ALTER TABLE documents ADD CONSTRAINT chk_documents_file_size 
    CHECK (file_size >= 0);

-- 版本号检查
ALTER TABLE documents ADD CONSTRAINT chk_documents_version 
    CHECK (version >= 1);

ALTER TABLE doc_templates ADD CONSTRAINT chk_doc_templates_use_count 
    CHECK (use_count >= 0);


-- ============================================================
-- FILE: 11_create_rbac_tables.sql
-- ============================================================

-- ============================================================
-- Aidean AI模型天梯图平台 - RBAC权限体系表创建脚本
-- 11_create_rbac_tables.sql
-- 功能：创建角色、权限、组织架构、订阅套餐等核心缺失表
-- 环境：PostgreSQL 16+
-- 命名规范：snake_case, 复数形式, 全部小写
-- ============================================================

-- ============================================================
-- 1. RBAC权限体系表
-- ============================================================

-- 1.1 角色表
CREATE TABLE IF NOT EXISTS roles (
    -- 核心审计字段（所有表必须包含）
    id BIGINT NOT NULL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by BIGINT,
    updated_by BIGINT,
    
    -- 状态字段（所有表必须包含）
    status SMALLINT NOT NULL DEFAULT 1 CHECK (status IN (0, 1, 2)),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- 版本与租户
    version INT NOT NULL DEFAULT 1,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    
    -- 业务字段
    code VARCHAR(50) NOT NULL,  -- admin, editor, user, guest
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT FALSE,  -- 系统内置角色不可删除
    sort_order INT DEFAULT 0,
    
    -- 扩展字段
    ext_json JSONB DEFAULT '{}',
    ext_jsonb_index JSONB DEFAULT '{}',
    
    -- 约束
    CONSTRAINT uk_roles_code_tenant UNIQUE (tenant_id, code)
);

COMMENT ON TABLE roles IS '角色表：RBAC角色定义，支持多租户';
COMMENT ON COLUMN roles.status IS '状态：0-禁用 1-正常 2-弃用';
COMMENT ON COLUMN roles.code IS '角色编码：admin, editor, user, guest';
COMMENT ON COLUMN roles.is_system IS '是否系统内置：true-不可删除 false-可删除';

-- 1.2 权限表
CREATE TABLE IF NOT EXISTS permissions (
    -- 核心审计字段
    id BIGINT NOT NULL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    
    -- 状态字段
    status SMALLINT NOT NULL DEFAULT 1 CHECK (status IN (0, 1, 2)),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    
    version INT NOT NULL DEFAULT 1,
    
    -- 业务字段
    code VARCHAR(100) NOT NULL UNIQUE,  -- model:create, model:update
    name VARCHAR(100) NOT NULL,
    resource VARCHAR(50) NOT NULL,  -- model, skill, user, system
    action VARCHAR(50) NOT NULL,    -- create, read, update, delete, execute
    description TEXT,
    
    -- 扩展字段
    ext_json JSONB DEFAULT '{}',
    ext_jsonb_index JSONB DEFAULT '{}'
);

COMMENT ON TABLE permissions IS '权限表：资源-操作权限定义';
COMMENT ON COLUMN permissions.status IS '状态：0-禁用 1-正常 2-弃用';
COMMENT ON COLUMN permissions.resource IS '资源类型：model, skill, user, system等';
COMMENT ON COLUMN permissions.action IS '操作类型：create, read, update, delete, execute';

-- 1.3 用户角色关联表
CREATE TABLE IF NOT EXISTS user_roles (
    -- 核心审计字段
    id BIGINT NOT NULL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- 状态字段
    status SMALLINT NOT NULL DEFAULT 1 CHECK (status IN (0, 1, 2)),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    
    version INT NOT NULL DEFAULT 1,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    
    -- 业务字段
    user_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    granted_by BIGINT,  -- 授权人
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,  -- 角色有效期（可选）
    
    -- 扩展字段
    ext_json JSONB DEFAULT '{}',
    ext_jsonb_index JSONB DEFAULT '{}',
    
    -- 约束
    CONSTRAINT uk_user_roles UNIQUE (user_id, role_id, tenant_id),
    CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

COMMENT ON TABLE user_roles IS '用户角色关联表：多租户环境下用户角色分配';
COMMENT ON COLUMN user_roles.status IS '状态：0-禁用 1-正常 2-弃用';
COMMENT ON COLUMN user_roles.granted_by IS '授权人ID：记录谁授予的角色';
COMMENT ON COLUMN user_roles.expires_at IS '过期时间：NULL表示永久有效';

-- 1.4 角色权限关联表
CREATE TABLE IF NOT EXISTS role_permissions (
    -- 核心审计字段
    id BIGINT NOT NULL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- 状态字段
    status SMALLINT NOT NULL DEFAULT 1 CHECK (status IN (0, 1, 2)),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    
    version INT NOT NULL DEFAULT 1,
    
    -- 业务字段
    role_id BIGINT NOT NULL,
    permission_id BIGINT NOT NULL,
    conditions JSONB DEFAULT NULL,  -- 权限条件：{"own_data_only": true}
    
    -- 扩展字段
    ext_json JSONB DEFAULT '{}',
    ext_jsonb_index JSONB DEFAULT '{}',
    
    -- 约束
    CONSTRAINT uk_role_permissions UNIQUE (role_id, permission_id),
    CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

COMMENT ON TABLE role_permissions IS '角色权限关联表：角色拥有的权限';
COMMENT ON COLUMN role_permissions.status IS '状态：0-禁用 1-正常 2-弃用';
COMMENT ON COLUMN role_permissions.conditions IS '权限条件JSON：如仅允许操作自己的数据';

-- ============================================================
-- 2. 组织架构表
-- ============================================================

-- 2.1 部门表
CREATE TABLE IF NOT EXISTS departments (
    -- 核心审计字段
    id BIGINT NOT NULL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by BIGINT,
    updated_by BIGINT,
    
    -- 状态字段
    status SMALLINT NOT NULL DEFAULT 1 CHECK (status IN (0, 1, 2)),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- 版本与租户
    version INT NOT NULL DEFAULT 1,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    
    -- 层级字段
    parent_id BIGINT,
    org_path LTREE,
    level INT DEFAULT 1,
    
    -- 业务字段
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    manager_id BIGINT,
    
    -- 扩展字段
    ext_json JSONB DEFAULT '{}',
    ext_jsonb_index JSONB DEFAULT '{}',
    
    -- 约束
    CONSTRAINT uk_departments_code_tenant UNIQUE (tenant_id, code),
    CONSTRAINT fk_departments_parent FOREIGN KEY (parent_id) REFERENCES departments(id) ON DELETE SET NULL
);

COMMENT ON TABLE departments IS '部门表：组织架构部门管理，支持层级结构';
COMMENT ON COLUMN departments.status IS '状态：0-禁用 1-正常 2-弃用';
COMMENT ON COLUMN departments.org_path IS '层级路径：LTREE类型，支持层级查询';
COMMENT ON COLUMN departments.level IS '层级深度：根部门为1';
COMMENT ON COLUMN departments.manager_id IS '部门负责人ID';

-- 2.2 团队表
CREATE TABLE IF NOT EXISTS teams (
    -- 核心审计字段
    id BIGINT NOT NULL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by BIGINT,
    updated_by BIGINT,
    
    -- 状态字段
    status SMALLINT NOT NULL DEFAULT 1 CHECK (status IN (0, 1, 2)),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- 版本与租户
    version INT NOT NULL DEFAULT 1,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    
    -- 业务字段
    department_id BIGINT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    leader_id BIGINT,
    max_members INT DEFAULT 10,
    
    -- 扩展字段
    ext_json JSONB DEFAULT '{}',
    ext_jsonb_index JSONB DEFAULT '{}',
    
    -- 约束
    CONSTRAINT fk_teams_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
);

COMMENT ON TABLE teams IS '团队表：项目/业务团队管理';
COMMENT ON COLUMN teams.status IS '状态：0-禁用 1-正常 2-弃用';
COMMENT ON COLUMN teams.max_members IS '最大成员数：默认10人';

-- 2.3 团队成员表
CREATE TABLE IF NOT EXISTS team_members (
    -- 核心审计字段
    id BIGINT NOT NULL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- 状态字段
    status SMALLINT NOT NULL DEFAULT 1 CHECK (status IN (0, 1, 2)),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    
    version INT NOT NULL DEFAULT 1,
    
    -- 业务字段
    team_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    role_in_team VARCHAR(50) DEFAULT 'member',  -- leader, member, guest
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- 扩展字段
    ext_json JSONB DEFAULT '{}',
    ext_jsonb_index JSONB DEFAULT '{}',
    
    -- 约束
    CONSTRAINT uk_team_members UNIQUE (team_id, user_id),
    CONSTRAINT fk_team_members_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    CONSTRAINT fk_team_members_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

COMMENT ON TABLE team_members IS '团队成员表：团队-用户关联';
COMMENT ON COLUMN team_members.status IS '状态：0-禁用 1-正常 2-弃用';
COMMENT ON COLUMN team_members.role_in_team IS '团队内角色：leader-负责人 member-成员 guest-访客';

-- ============================================================
-- 3. 付费订阅套餐表
-- ============================================================

-- 3.1 订阅套餐表
CREATE TABLE IF NOT EXISTS subscription_plans (
    -- 核心审计字段
    id BIGINT NOT NULL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by BIGINT,
    updated_by BIGINT,
    
    -- 状态字段
    status SMALLINT NOT NULL DEFAULT 1 CHECK (status IN (0, 1, 2)),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- 版本
    version INT NOT NULL DEFAULT 1,
    
    -- 业务字段
    code VARCHAR(50) NOT NULL UNIQUE,  -- free, pro, enterprise
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price_monthly NUMERIC(10,2),
    price_yearly NUMERIC(10,2),
    currency VARCHAR(3) DEFAULT 'CNY',
    
    -- 配额配置
    quotas JSONB NOT NULL DEFAULT '{
        "api_calls_per_day": 100,
        "models_max": 5,
        "storage_mb": 100,
        "team_members_max": 1,
        "skills_max": 10,
        "agents_max": 3
    }',
    
    features JSONB DEFAULT '[]',  -- 功能开关列表
    sort_order INT DEFAULT 0,
    
    -- 扩展字段
    ext_json JSONB DEFAULT '{}',
    ext_jsonb_index JSONB DEFAULT '{}'
);

COMMENT ON TABLE subscription_plans IS '订阅套餐表：定义各等级套餐的配额和价格';
COMMENT ON COLUMN subscription_plans.status IS '状态：0-禁用 1-正常 2-弃用';
COMMENT ON COLUMN subscription_plans.code IS '套餐编码：free, pro, enterprise';
COMMENT ON COLUMN subscription_plans.quotas IS '配额配置JSON：API调用次数、模型数、存储空间等';
COMMENT ON COLUMN subscription_plans.features IS '功能列表JSON：该套餐可使用的功能';

-- 3.2 用户配额表
CREATE TABLE IF NOT EXISTS user_quotas (
    -- 核心审计字段
    id BIGINT NOT NULL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    
    -- 状态字段
    status SMALLINT NOT NULL DEFAULT 1 CHECK (status IN (0, 1, 2)),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- 版本
    version INT NOT NULL DEFAULT 1,
    
    -- 业务字段
    user_id BIGINT NOT NULL,
    plan_id BIGINT,
    
    -- API调用配额
    api_calls_limit INT,
    api_calls_used INT DEFAULT 0,
    api_calls_reset_at TIMESTAMPTZ,
    
    -- 存储配额
    storage_limit_mb INT,
    storage_used_mb INT DEFAULT 0,
    
    -- 模型配额
    models_limit INT,
    models_created INT DEFAULT 0,
    
    -- 团队配额
    team_members_limit INT,
    team_members_count INT DEFAULT 0,
    
    -- Skill配额
    skills_limit INT,
    skills_created INT DEFAULT 0,
    
    -- Agent配额
    agents_limit INT,
    agents_created INT DEFAULT 0,
    
    -- 额外购买的配额包
    extra_quotas JSONB DEFAULT '{}',
    
    -- 扩展字段
    ext_json JSONB DEFAULT '{}',
    ext_jsonb_index JSONB DEFAULT '{}',
    
    -- 约束
    CONSTRAINT uk_user_quotas_user UNIQUE (user_id),
    CONSTRAINT fk_user_quotas_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_quotas_plan FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE SET NULL
);

COMMENT ON TABLE user_quotas IS '用户配额表：记录用户实际配额使用情况';
COMMENT ON COLUMN user_quotas.status IS '状态：0-禁用 1-正常 2-弃用';
COMMENT ON COLUMN user_quotas.api_calls_reset_at IS 'API调用次数重置时间：通常每日重置';
COMMENT ON COLUMN user_quotas.extra_quotas IS '额外购买的配额包JSON';



-- ============================================================
-- FILE: 12_create_agent_triggers.sql
-- ============================================================

-- ============================================================
-- Aidean IDE/CLI Agent系统 - 触发器创建脚本
-- 12_create_agent_triggers.sql
-- 功能：自动更新 updated_at 字段
-- ============================================================

-- 创建触发器函数（如果不存在）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 1. 分身与学习系统触发器
-- ============================================================

CREATE TRIGGER trigger_personas_updated_at
    BEFORE UPDATE ON personas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_conversations_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 2. 文档与知识系统触发器
-- ============================================================

CREATE TRIGGER trigger_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_doc_templates_updated_at
    BEFORE UPDATE ON doc_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 3. 任务执行系统触发器
-- ============================================================

CREATE TRIGGER trigger_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- TaskSteps不更新，保持原始记录

-- ============================================================
-- 4. 工具注册系统触发器
-- ============================================================

CREATE TRIGGER trigger_tool_registries_updated_at
    BEFORE UPDATE ON tool_registries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ToolExecutions不更新，保持原始记录

-- ============================================================
-- 5. 远程控制系统触发器
-- ============================================================

CREATE TRIGGER trigger_remote_channels_updated_at
    BEFORE UPDATE ON remote_channels
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RemoteCommands不更新，保持原始记录

-- ============================================================
-- 6. 审计日志触发器
-- ============================================================

-- 创建任务状态变更审计触发器
CREATE OR REPLACE FUNCTION audit_task_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        -- 可以在这里插入到审计日志表
        -- 或者发布通知
        PERFORM pg_notify('task_status_change', json_build_object(
            'task_id', NEW.id,
            'old_status', OLD.status,
            'new_status', NEW.status,
            'changed_at', NOW()
        )::text);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_tasks_status_audit
    AFTER UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION audit_task_status_change();

-- 创建学习应用触发器
CREATE OR REPLACE FUNCTION notify_learning_applied()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.applied = FALSE AND NEW.applied = TRUE THEN
        PERFORM pg_notify('learning_applied', json_build_object(
            'source_id', NEW.id,
            'persona_id', NEW.persona_id,
            'applied_at', NEW.applied_at
        )::text);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_learning_sources_applied
    AFTER UPDATE ON learning_sources
    FOR EACH ROW
    EXECUTE FUNCTION notify_learning_applied();


-- ============================================================
-- FILE: 12_create_rbac_indexes.sql
-- ============================================================

-- ============================================================
-- Aidean AI模型天梯图平台 - RBAC权限体系索引创建脚本
-- 12_create_rbac_indexes.sql
-- 功能：为RBAC相关表创建索引
-- ============================================================

-- ============================================================
-- 1. 角色表索引
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_roles_tenant ON roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_roles_status ON roles(status);
CREATE INDEX IF NOT EXISTS idx_roles_is_active ON roles(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_roles_is_system ON roles(is_system);
CREATE INDEX IF NOT EXISTS idx_roles_sort ON roles(sort_order);

-- ============================================================
-- 2. 权限表索引
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_permissions_status ON permissions(status);
CREATE INDEX IF NOT EXISTS idx_permissions_resource ON permissions(resource);
CREATE INDEX IF NOT EXISTS idx_permissions_action ON permissions(action);
CREATE INDEX IF NOT EXISTS idx_permissions_resource_action ON permissions(resource, action);

-- ============================================================
-- 3. 用户角色关联表索引
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_tenant ON user_roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_status ON user_roles(status);
CREATE INDEX IF NOT EXISTS idx_user_roles_granted_at ON user_roles(granted_at);
CREATE INDEX IF NOT EXISTS idx_user_roles_expires ON user_roles(expires_at) WHERE expires_at IS NOT NULL;

-- ============================================================
-- 4. 角色权限关联表索引
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_status ON role_permissions(status);

-- ============================================================
-- 5. 部门表索引
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_departments_tenant ON departments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_departments_status ON departments(status);
CREATE INDEX IF NOT EXISTS idx_departments_parent ON departments(parent_id);
CREATE INDEX IF NOT EXISTS idx_departments_org_path ON departments USING GIST (org_path);
CREATE INDEX IF NOT EXISTS idx_departments_manager ON departments(manager_id);

-- ============================================================
-- 6. 团队表索引
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_teams_tenant ON teams(tenant_id);
CREATE INDEX IF NOT EXISTS idx_teams_status ON teams(status);
CREATE INDEX IF NOT EXISTS idx_teams_department ON teams(department_id);
CREATE INDEX IF NOT EXISTS idx_teams_leader ON teams(leader_id);

-- ============================================================
-- 7. 团队成员表索引
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_status ON team_members(status);
CREATE INDEX IF NOT EXISTS idx_team_members_role ON team_members(role_in_team);

-- ============================================================
-- 8. 订阅套餐表索引
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_subscription_plans_status ON subscription_plans(status);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_is_active ON subscription_plans(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_subscription_plans_sort ON subscription_plans(sort_order);

-- ============================================================
-- 9. 用户配额表索引
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_user_quotas_user ON user_quotas(user_id);
CREATE INDEX IF NOT EXISTS idx_user_quotas_plan ON user_quotas(plan_id);
CREATE INDEX IF NOT EXISTS idx_user_quotas_status ON user_quotas(status);
CREATE INDEX IF NOT EXISTS idx_user_quotas_reset ON user_quotas(api_calls_reset_at);



-- ============================================================
-- FILE: 13_seed_agent_data.sql
-- ============================================================

-- ============================================================
-- Aidean IDE/CLI Agent系统 - 种子数据脚本
-- 13_seed_agent_data.sql
-- 功能：添加初始文档模板和配置
-- ============================================================

-- ============================================================
-- 1. 文档模板种子数据
-- ============================================================

-- 通用论文模板
INSERT INTO doc_templates (id, code, name, description, type, format_rules, structure, is_default, is_public, is_active)
VALUES (
    'temp_' || gen_random_uuid()::text,
    'paper_generic',
    '通用学术论文模板',
    '适用于大多数学术期刊和会议的论文格式',
    'PAPER',
    '{
        "pageSize": "A4",
        "margins": {"top": 2.54, "bottom": 2.54, "left": 3.17, "right": 3.17},
        "font": {"body": "Times New Roman 12pt", "heading": "黑体 14pt"},
        "lineSpacing": 1.5,
        "headingNumbering": "1.1.1",
        "citationStyle": "GB/T 7714-2015"
    }'::jsonb,
    '[
        {"section": "abstract", "title": "摘要", "required": true, "wordCount": [300, 500]},
        {"section": "keywords", "title": "关键词", "required": true},
        {"section": "introduction", "title": "引言", "required": true},
        {"section": "methodology", "title": "研究方法", "required": true},
        {"section": "results", "title": "实验结果", "required": true},
        {"section": "discussion", "title": "讨论", "required": true},
        {"section": "conclusion", "title": "结论", "required": true},
        {"section": "references", "title": "参考文献", "required": true},
        {"section": "acknowledgments", "title": "致谢", "required": false}
    ]'::jsonb,
    TRUE, TRUE, TRUE
);

-- 本科毕业论文模板
INSERT INTO doc_templates (id, code, name, description, type, institution, format_rules, structure, is_public, is_active)
VALUES (
    'temp_' || gen_random_uuid()::text,
    'paper_bachelor',
    '本科毕业论文模板',
    '符合国家标准GB/T 7713.1-2006的本科毕业论文格式',
    'PAPER',
    '通用高校',
    '{
        "pageSize": "A4",
        "margins": {"top": 2.54, "bottom": 2.54, "left": 3.17, "right": 3.17},
        "font": {"body": "宋体 小四", "heading": "黑体 三号"},
        "lineSpacing": 1.5,
        "headingNumbering": "第一章、1.1、1.1.1",
        "citationStyle": "GB/T 7714-2015",
        "coverPage": {
            "title": "本科毕业论文",
            "fields": ["学校名称", "论文题目", "学院", "专业", "学生姓名", "学号", "指导教师", "完成日期"]
        }
    }'::jsonb,
    '[
        {"section": "cover", "title": "封面", "required": true},
        {"section": "declaration", "title": "原创性声明", "required": true},
        {"section": "abstract_cn", "title": "中文摘要", "required": true, "wordCount": [300, 500]},
        {"section": "abstract_en", "title": "英文摘要", "required": true, "wordCount": [250, 400]},
        {"section": "toc", "title": "目录", "required": true},
        {"section": "introduction", "title": "绪论", "required": true},
        {"section": "chapters", "title": "正文章节", "required": true},
        {"section": "conclusion", "title": "结论", "required": true},
        {"section": "references", "title": "参考文献", "required": true},
        {"section": "acknowledgments", "title": "致谢", "required": true},
        {"section": "appendix", "title": "附录", "required": false}
    ]'::jsonb,
    TRUE, TRUE
);

-- 硕士毕业论文模板
INSERT INTO doc_templates (id, code, name, description, type, institution, format_rules, structure, is_public, is_active)
VALUES (
    'temp_' || gen_random_uuid()::text,
    'paper_master',
    '硕士毕业论文模板',
    '符合国家标准GB/T 7713.1-2006的硕士学位论文格式',
    'PAPER',
    '通用高校',
    '{
        "pageSize": "A4",
        "margins": {"top": 2.54, "bottom": 2.54, "left": 3.17, "right": 3.17},
        "font": {"body": "宋体 小四", "heading": "黑体 三号"},
        "lineSpacing": 1.5,
        "headingNumbering": "第一章、1.1、1.1.1",
        "citationStyle": "GB/T 7714-2015",
        "coverPage": {
            "title": "硕士学位论文",
            "fields": ["学校名称", "论文题目", "学院", "专业", "研究生姓名", "学号", "指导教师", "完成日期"]
        }
    }'::jsonb,
    '[
        {"section": "cover", "title": "封面", "required": true},
        {"section": "declaration", "title": "原创性声明和使用授权说明", "required": true},
        {"section": "abstract_cn", "title": "中文摘要", "required": true, "wordCount": [500, 1000]},
        {"section": "abstract_en", "title": "英文摘要", "required": true, "wordCount": [400, 800]},
        {"section": "toc", "title": "目录", "required": true},
        {"section": "table_list", "title": "图表清单", "required": true},
        {"section": "introduction", "title": "绪论", "required": true},
        {"section": "literature_review", "title": "文献综述", "required": true},
        {"section": "methodology", "title": "研究方法", "required": true},
        {"section": "results", "title": "研究结果与分析", "required": true},
        {"section": "conclusion", "title": "结论与展望", "required": true},
        {"section": "references", "title": "参考文献", "required": true},
        {"section": "achievements", "title": "攻读学位期间取得的成果", "required": false},
        {"section": "acknowledgments", "title": "致谢", "required": true}
    ]'::jsonb,
    TRUE, TRUE
);

-- 技术报告模板
INSERT INTO doc_templates (id, code, name, description, type, format_rules, structure, is_public, is_active)
VALUES (
    'temp_' || gen_random_uuid()::text,
    'report_technical',
    '技术报告模板',
    '适用于技术方案、架构设计、代码评审等技术文档',
    'REPORT',
    '{
        "pageSize": "A4",
        "margins": {"top": 2.54, "bottom": 2.54, "left": 2.54, "right": 2.54},
        "font": {"body": "Arial 11pt", "heading": "Arial Bold 14pt"},
        "lineSpacing": 1.15,
        "codeBlock": {"font": "Consolas 10pt", "background": "#f5f5f5"}
    }'::jsonb,
    '[
        {"section": "metadata", "title": "文档信息", "required": true},
        {"section": "summary", "title": "执行摘要", "required": true},
        {"section": "background", "title": "背景与问题", "required": true},
        {"section": "solution", "title": "解决方案", "required": true},
        {"section": "implementation", "title": "实现细节", "required": true},
        {"section": "testing", "title": "测试验证", "required": false},
        {"section": "deployment", "title": "部署计划", "required": false},
        {"section": "risks", "title": "风险评估", "required": true},
        {"section": "timeline", "title": "时间线", "required": true},
        {"section": "conclusion", "title": "总结", "required": true}
    ]'::jsonb,
    TRUE, TRUE
);

-- 深度研究报告模板
INSERT INTO doc_templates (id, code, name, description, type, format_rules, structure, is_public, is_active)
VALUES (
    'temp_' || gen_random_uuid()::text,
    'report_research',
    '深度研究报告模板',
    '基于本地和网络文献的深度研究报告格式',
    'REPORT',
    '{
        "pageSize": "A4",
        "margins": {"top": 2.54, "bottom": 2.54, "left": 3.17, "right": 3.17},
        "font": {"body": "Times New Roman 12pt", "heading": "黑体 14pt"},
        "lineSpacing": 1.5,
        "citationStyle": "GB/T 7714-2015"
    }'::jsonb,
    '[
        {"section": "title", "title": "标题页", "required": true},
        {"section": "abstract", "title": "摘要", "required": true, "wordCount": [500, 800]},
        {"section": "keywords", "title": "关键词", "required": true},
        {"section": "introduction", "title": "研究背景与意义", "required": true},
        {"section": "literature", "title": "文献综述", "required": true},
        {"section": "methodology", "title": "研究方法与数据来源", "required": true},
        {"section": "analysis", "title": "分析与讨论", "required": true},
        {"section": "findings", "title": "研究发现", "required": true},
        {"section": "conclusion", "title": "结论与建议", "required": true},
        {"section": "references", "title": "参考文献", "required": true},
        {"section": "appendix", "title": "附录", "required": false}
    ]'::jsonb,
    TRUE, TRUE
);

-- ============================================================
-- 2. 文档模板注释
-- ============================================================

COMMENT ON TABLE doc_templates IS '文档模板表：论文格式、学校模板、样式配置';
COMMENT ON TABLE user_templates IS '用户模板收藏表：自定义配置、收藏管理';

-- ============================================================
-- 3. 更新统计
-- ============================================================

SELECT '文档模板种子数据插入完成' AS status, COUNT(*) AS template_count FROM doc_templates;


COMMIT;

SELECT 'Database initialization completed successfully' as status;
