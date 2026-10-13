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
