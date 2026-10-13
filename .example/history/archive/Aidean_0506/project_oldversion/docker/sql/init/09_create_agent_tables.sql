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
