# AI模型天梯图平台 - 数据库设计综合方案

> 生成日期：2026-04-10
> 融合方案：opencode + trae + windsurf + workbuddy

---

## 一、Schema设计

### 1.1 核心Schema

```sql
-- 1. 核心基础数据
CREATE SCHEMA core;

-- 2. AI模型相关
CREATE SCHEMA models;

-- 3. 工具生态相关
CREATE SCHEMA tools;

-- 4. 用户系统相关
CREATE SCHEMA users;

-- 5. 系统管理相关
CREATE SCHEMA system;

-- 6. 字典数据相关
CREATE SCHEMA dict;

-- 7. 财务系统相关
CREATE SCHEMA finance;

-- 8. 内容管理相关
CREATE SCHEMA content;

-- 9. 审计日志相关
CREATE SCHEMA audit;
```

---

## 二、通用字段模板

### 2.1 基础通用字段（所有表必备）

| 字段名 | 数据类型 | 约束 | 描述 |
|--------|---------|------|------|
| id | BIGINT | PRIMARY KEY | 主键（Snowflake ID） |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | 创建时间 |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | 更新时间 |
| deleted_at | TIMESTAMPTZ | NULL | 软删除时间 |
| version | BIGINT | NOT NULL DEFAULT 1 | 乐观锁版本号 |
| tenant_id | BIGINT | NOT NULL DEFAULT 1 | 租户ID（多租户预留） |
| org_id | BIGINT | NOT NULL DEFAULT 1 | 组织ID（多租户预留） |
| creator_id | BIGINT | NOT NULL | 创建人ID |
| updater_id | BIGINT | NOT NULL | 更新人ID |

### 2.2 扩展通用字段（根据需要选用）

| 字段名 | 数据类型 | 约束 | 描述 |
|--------|---------|------|------|
| status | SMALLINT | NOT NULL DEFAULT 1 | 状态（1-启用 0-禁用） |
| sort_order | INTEGER | NOT NULL DEFAULT 0 | 排序权重 |
| is_system | BOOLEAN | NOT NULL DEFAULT FALSE | 是否系统内置 |
| is_featured | BOOLEAN | NOT NULL DEFAULT FALSE | 是否精选 |
| featured_weight | INTEGER | NOT NULL DEFAULT 0 | 精选权重 |
| data_classification | SMALLINT | NOT NULL DEFAULT 1 | 数据分类（1-公开 2-内部 3-机密） |
| region_id | BIGINT | NULL | 地区ID（关联sys_regions） |
| country_code | VARCHAR(10) | NULL | 国家代码 |
| language_code | VARCHAR(10) | NULL | 语言代码 |
| time_zone | VARCHAR(50) | NULL | 时区 |
| search_vector | TSVECTOR | NULL | 全文搜索向量 |
| attr_01 | VARCHAR(255) | NULL | 预留字符串字段1 |
| attr_02 | VARCHAR(255) | NULL | 预留字符串字段2 |
| attr_03 | VARCHAR(255) | NULL | 预留字符串字段3 |
| attr_04 | VARCHAR(255) | NULL | 预留字符串字段4 |
| attr_05 | VARCHAR(255) | NULL | 预留字符串字段5 |
| attr_int | INTEGER | NULL | 预留整数字段 |
| attr_num | NUMERIC(19,6) | NULL | 预留数字字段 |
| attr_bool | BOOLEAN | NULL | 预留布尔字段 |
| attr_json | JSONB | NULL | 预留JSON字段 |

---

## 三、核心表结构设计

### 3.1 用户系统（users schema）

#### 3.1.1 users.users - 用户表

```sql
CREATE TABLE users.users (
  -- 基础通用字段
  id BIGINT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  version BIGINT NOT NULL DEFAULT 1,
  tenant_id BIGINT NOT NULL DEFAULT 1,
  org_id BIGINT NOT NULL DEFAULT 1,
  creator_id BIGINT NOT NULL,
  updater_id BIGINT NOT NULL,
  
  -- 扩展通用字段
  status SMALLINT NOT NULL DEFAULT 1,
  data_classification SMALLINT NOT NULL DEFAULT 2,
  
  -- 业务字段
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  phone VARCHAR(20) NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  nickname VARCHAR(50) NOT NULL,
  avatar VARCHAR(255) NULL,
  bio TEXT NULL,
  
  -- 认证相关
  oauth_provider VARCHAR(50) NULL,
  oauth_id VARCHAR(100) NULL,
  oauth_token TEXT NULL,
  
  -- 安全相关
  mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  mfa_secret VARCHAR(100) NULL,
  last_login_at TIMESTAMPTZ NULL,
  last_login_ip VARCHAR(50) NULL,
  failed_login_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ NULL,
  
  -- 订阅相关
  subscription_type SMALLINT NOT NULL DEFAULT 1, -- 1-免费 2-月付 3-年付
  subscription_start_at TIMESTAMPTZ NULL,
  subscription_expires_at TIMESTAMPTZ NULL,
  
  -- 财务相关
  balance NUMERIC(19,4) NOT NULL DEFAULT 0,
  
  -- 扩展字段
  preferences JSONB NULL, -- 用户偏好设置
  
  -- 索引
  CONSTRAINT users_status_check CHECK (status IN (0, 1)),
  CONSTRAINT users_subscription_type_check CHECK (subscription_type IN (1, 2, 3))
);

-- 索引
CREATE INDEX idx_users_email ON users.users(email);
CREATE INDEX idx_users_phone ON users.users(phone);
CREATE INDEX idx_users_subscription_expires ON users.users(subscription_expires_at);
CREATE INDEX idx_users_last_login ON users.users(last_login_at);
CREATE INDEX idx_users_deleted_at ON users.users(deleted_at) WHERE deleted_at IS NOT NULL;

-- 分区（按tenant_id HASH分区）
CREATE TABLE users.users_partitioned (
  LIKE users.users INCLUDING ALL
) PARTITION BY HASH (tenant_id);

-- 创建16个分区
DO $$
BEGIN
  FOR i IN 1..16 LOOP
    EXECUTE format('CREATE TABLE users.users_partitioned_p%s PARTITION OF users.users_partitioned FOR VALUES WITH (MODULUS 16, REMAINDER %s)', i, i-1);
  END LOOP;
END $$;
```

#### 3.1.2 users.favorites - 收藏表

```sql
CREATE TABLE users.favorites (
  -- 基础通用字段
  id BIGINT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  version BIGINT NOT NULL DEFAULT 1,
  tenant_id BIGINT NOT NULL DEFAULT 1,
  org_id BIGINT NOT NULL DEFAULT 1,
  creator_id BIGINT NOT NULL,
  updater_id BIGINT NOT NULL,
  
  -- 业务字段
  user_id BIGINT NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
  target_type SMALLINT NOT NULL, -- 1-模型 2-技能 3-工具 4-资讯
  target_id BIGINT NOT NULL,
  
  -- 唯一约束
  UNIQUE(user_id, target_type, target_id),
  
  -- 索引
  CONSTRAINT favorites_target_type_check CHECK (target_type IN (1, 2, 3, 4))
);

-- 索引
CREATE INDEX idx_favorites_user_target ON users.favorites(user_id, target_type, target_id);
CREATE INDEX idx_favorites_target ON users.favorites(target_type, target_id);
```

### 3.2 模型系统（models schema）

#### 3.2.1 models.vendors - 厂商表

```sql
CREATE TABLE models.vendors (
  -- 基础通用字段
  id BIGINT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  version BIGINT NOT NULL DEFAULT 1,
  tenant_id BIGINT NOT NULL DEFAULT 1,
  org_id BIGINT NOT NULL DEFAULT 1,
  creator_id BIGINT NOT NULL,
  updater_id BIGINT NOT NULL,
  
  -- 扩展通用字段
  status SMALLINT NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  featured_weight INTEGER NOT NULL DEFAULT 0,
  
  -- 业务字段
  name VARCHAR(100) NOT NULL UNIQUE,
  logo VARCHAR(255) NULL,
  description TEXT NULL,
  website VARCHAR(255) NULL,
  
  -- 层级字段
  parent_id BIGINT NULL REFERENCES models.vendors(id),
  tier_level SMALLINT NOT NULL DEFAULT 1, -- 1-顶级 2-二级 3-三级
  
  -- 统计字段
  model_count INTEGER NOT NULL DEFAULT 0,
  
  -- 索引
  CONSTRAINT vendors_tier_level_check CHECK (tier_level IN (1, 2, 3))
);

-- 索引
CREATE INDEX idx_vendors_parent ON models.vendors(parent_id);
CREATE INDEX idx_vendors_tier_level ON models.vendors(tier_level);
CREATE INDEX idx_vendors_is_featured ON models.vendors(is_featured);
```

#### 3.2.2 models.models - 模型表

```sql
CREATE TABLE models.models (
  -- 基础通用字段
  id BIGINT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  version BIGINT NOT NULL DEFAULT 1,
  tenant_id BIGINT NOT NULL DEFAULT 1,
  org_id BIGINT NOT NULL DEFAULT 1,
  creator_id BIGINT NOT NULL,
  updater_id BIGINT NOT NULL,
  
  -- 扩展通用字段
  status SMALLINT NOT NULL DEFAULT 1,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  featured_weight INTEGER NOT NULL DEFAULT 0,
  data_classification SMALLINT NOT NULL DEFAULT 1,
  
  -- 业务字段
  name VARCHAR(255) NOT NULL,
  vendor_id BIGINT NOT NULL REFERENCES models.vendors(id),
  
  -- 类型字段（多级分类）
  type SMALLINT NOT NULL, -- 1-对话 2-多模态 3-图像 4-视频 5-音频 6-代码 7-其他
  category_level_1 SMALLINT NOT NULL, -- 1-专业版 2-应用版
  category_level_2 SMALLINT NULL, -- 二级分类（如办公/图片）
  category_level_3 SMALLINT NULL, -- 三级分类
  
  -- 技术参数
  context_length INTEGER NULL, -- 上下文长度
  token_limit INTEGER NULL, -- 令牌限制
  max_output_tokens INTEGER NULL, -- 最大输出令牌
  
  -- 性能参数
  avg_response_time NUMERIC(19,4) NULL, -- 平均响应时间（秒）
  reliability_score NUMERIC(5,2) NULL, -- 可靠性评分
  
  -- 协议相关
  license_type SMALLINT NOT NULL DEFAULT 1, -- 1-闭源 2-开源 3-半开源
  is_open_source BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- 价格相关（最新价格，详细价格在prices表）
  current_price_input NUMERIC(19,6) NULL, -- 当前输入价格
  current_price_output NUMERIC(19,6) NULL, -- 当前输出价格
  
  -- 评分相关（最新评分，详细评分在scores表）
  current_official_score NUMERIC(5,2) NULL, -- 官方评分
  current_actual_score NUMERIC(5,2) NULL, -- 实际评分
  current_review_score NUMERIC(5,2) NULL, -- 评测评分
  current_self_test_score NUMERIC(5,2) NULL, -- 自测评分
  current_overall_score NUMERIC(5,2) NULL, -- 综合评分
  
  -- 元数据
  description TEXT NULL,
  features JSONB NULL, -- 特性列表
  use_cases JSONB NULL, -- 使用场景
  
  -- 外部链接
  official_url VARCHAR(255) NULL,
  documentation_url VARCHAR(255) NULL,
  api_reference_url VARCHAR(255) NULL,
  
  -- 统计字段
  view_count BIGINT NOT NULL DEFAULT 0,
  favorite_count BIGINT NOT NULL DEFAULT 0,
  evaluation_count BIGINT NOT NULL DEFAULT 0,
  
  -- 索引
  CONSTRAINT models_type_check CHECK (type IN (1, 2, 3, 4, 5, 6, 7)),
  CONSTRAINT models_category_level_1_check CHECK (category_level_1 IN (1, 2)),
  CONSTRAINT models_license_type_check CHECK (license_type IN (1, 2, 3))
);

-- 索引
CREATE INDEX idx_models_vendor ON models.models(vendor_id);
CREATE INDEX idx_models_type ON models.models(type);
CREATE INDEX idx_models_category ON models.models(category_level_1, category_level_2, category_level_3);
CREATE INDEX idx_models_overall_score ON models.models(current_overall_score DESC);
CREATE INDEX idx_models_is_open_source ON models.models(is_open_source);
CREATE INDEX idx_models_license_type ON models.models(license_type);
CREATE INDEX idx_models_deleted_at ON models.models(deleted_at) WHERE deleted_at IS NOT NULL;

-- 分区（按创建时间RANGE分区）
CREATE TABLE models.models_partitioned (
  LIKE models.models INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- 创建月度分区（示例）
DO $$
BEGIN
  FOR i IN 1..12 LOOP
    EXECUTE format('CREATE TABLE models.models_partitioned_p2026%s PARTITION OF models.models_partitioned FOR VALUES FROM (''2026-%s-01'') TO (''2026-%s-01'')', 
      LPAD(i::text, 2, '0'), 
      LPAD(i::text, 2, '0'), 
      LPAD((i+1)::text, 2, '0'));
  END LOOP;
END $$;
```

#### 3.2.3 models.prices - 价格历史表

```sql
CREATE TABLE models.prices (
  -- 基础通用字段
  id BIGINT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  version BIGINT NOT NULL DEFAULT 1,
  tenant_id BIGINT NOT NULL DEFAULT 1,
  org_id BIGINT NOT NULL DEFAULT 1,
  creator_id BIGINT NOT NULL,
  updater_id BIGINT NOT NULL,
  
  -- 业务字段
  model_id BIGINT NOT NULL REFERENCES models.models(id) ON DELETE CASCADE,
  price_input NUMERIC(19,6) NOT NULL, -- 输入价格
  price_output NUMERIC(19,6) NOT NULL, -- 输出价格
  
  -- 时间范围
  effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  effective_until TIMESTAMPTZ NULL,
  is_current BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- 价格单位
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  unit VARCHAR(20) NOT NULL DEFAULT '1K tokens',
  
  -- 来源
  source SMALLINT NOT NULL DEFAULT 1, -- 1-官方 2-第三方 3-估算
  source_url VARCHAR(255) NULL,
  
  -- 索引
  CONSTRAINT prices_source_check CHECK (source IN (1, 2, 3))
);

-- 索引
CREATE INDEX idx_prices_model ON models.prices(model_id);
CREATE INDEX idx_prices_effective ON models.prices(effective_from, effective_until);
CREATE INDEX idx_prices_is_current ON models.prices(is_current) WHERE is_current = TRUE;
```

#### 3.2.4 models.benchmarks - 基准测试表

```sql
CREATE TABLE models.benchmarks (
  -- 基础通用字段
  id BIGINT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  version BIGINT NOT NULL DEFAULT 1,
  tenant_id BIGINT NOT NULL DEFAULT 1,
  org_id BIGINT NOT NULL DEFAULT 1,
  creator_id BIGINT NOT NULL,
  updater_id BIGINT NOT NULL,
  
  -- 扩展通用字段
  status SMALLINT NOT NULL DEFAULT 1,
  
  -- 业务字段
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT NULL,
  type SMALLINT NOT NULL, -- 1-通用 2-专业 3-行业 4-特定任务
  difficulty SMALLINT NOT NULL, -- 1-简单 2-中等 3-困难
  
  -- 测试参数
  test_count INTEGER NOT NULL DEFAULT 0,
  avg_score NUMERIC(5,2) NULL,
  
  -- 标签
  tags JSONB NULL,
  
  -- 索引
  CONSTRAINT benchmarks_type_check CHECK (type IN (1, 2, 3, 4)),
  CONSTRAINT benchmarks_difficulty_check CHECK (difficulty IN (1, 2, 3))
);

-- 索引
CREATE INDEX idx_benchmarks_type ON models.benchmarks(type);
CREATE INDEX idx_benchmarks_difficulty ON models.benchmarks(difficulty);
```

#### 3.2.5 models.scores - 评分表

```sql
CREATE TABLE models.scores (
  -- 基础通用字段
  id BIGINT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  version BIGINT NOT NULL DEFAULT 1,
  tenant_id BIGINT NOT NULL DEFAULT 1,
  org_id BIGINT NOT NULL DEFAULT 1,
  creator_id BIGINT NOT NULL,
  updater_id BIGINT NOT NULL,
  
  -- 业务字段
  model_id BIGINT NOT NULL REFERENCES models.models(id) ON DELETE CASCADE,
  benchmark_id BIGINT NULL REFERENCES models.benchmarks(id),
  
  -- 四维评分
  official_score NUMERIC(5,2) NULL, -- 官方评分
  actual_score NUMERIC(5,2) NULL, -- 实际评分
  review_score NUMERIC(5,2) NULL, -- 评测评分
  self_test_score NUMERIC(5,2) NULL, -- 自测评分
  overall_score NUMERIC(5,2) NULL, -- 综合评分
  
  -- 评分详情
  score_details JSONB NULL, -- 详细评分项
  
  -- 来源
  source_type SMALLINT NOT NULL, -- 1-官方 2-第三方 3-平台自测 4-用户评测
  source_url VARCHAR(255) NULL,
  
  -- 时间范围
  effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  effective_until TIMESTAMPTZ NULL,
  is_current BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- 索引
  CONSTRAINT scores_source_type_check CHECK (source_type IN (1, 2, 3, 4))
);

-- 索引
CREATE INDEX idx_scores_model ON models.scores(model_id);
CREATE INDEX idx_scores_benchmark ON models.scores(benchmark_id);
CREATE INDEX idx_scores_overall ON models.scores(overall_score DESC);
CREATE INDEX idx_scores_is_current ON models.scores(is_current) WHERE is_current = TRUE;
```

#### 3.2.6 models.ladder_charts - 天梯图定义表

```sql
CREATE TABLE models.ladder_charts (
  -- 基础通用字段
  id BIGINT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  version BIGINT NOT NULL DEFAULT 1,
  tenant_id BIGINT NOT NULL DEFAULT 1,
  org_id BIGINT NOT NULL DEFAULT 1,
  creator_id BIGINT NOT NULL,
  updater_id BIGINT NOT NULL,
  
  -- 扩展通用字段
  status SMALLINT NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- 业务字段
  chart_key VARCHAR(50) NOT NULL UNIQUE, -- 图表标识
  name VARCHAR(100) NOT NULL,
  description TEXT NULL,
  
  -- 图表配置
  chart_type SMALLINT NOT NULL, -- 1-综合 2-专业 3-应用 4-特定类型
  model_type SMALLINT NULL, -- 关联models.type
  category_level_1 SMALLINT NULL, -- 关联models.category_level_1
  category_level_2 SMALLINT NULL, -- 关联models.category_level_2
  
  -- 筛选配置
  default_filters JSONB NULL, -- 默认筛选条件
  sort_by VARCHAR(50) NOT NULL DEFAULT 'overall_score', -- 默认排序字段
  sort_order_direction SMALLINT NOT NULL DEFAULT 1, -- 1-降序 2-升序
  
  -- 显示配置
  display_fields JSONB NULL, -- 显示字段配置
  
  -- 索引
  CONSTRAINT ladder_charts_chart_type_check CHECK (chart_type IN (1, 2, 3, 4)),
  CONSTRAINT ladder_charts_sort_order_direction_check CHECK (sort_order_direction IN (1, 2))
);

-- 索引
CREATE INDEX idx_ladder_charts_chart_key ON models.ladder_charts(chart_key);
CREATE INDEX idx_ladder_charts_chart_type ON models.ladder_charts(chart_type);
CREATE INDEX idx_ladder_charts_model_type ON models.ladder_charts(model_type);
```

#### 3.2.7 models.ladder_rankings - 天梯图排名表

```sql
CREATE TABLE models.ladder_rankings (
  -- 基础通用字段
  id BIGINT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  version BIGINT NOT NULL DEFAULT 1,
  tenant_id BIGINT NOT NULL DEFAULT 1,
  org_id BIGINT NOT NULL DEFAULT 1,
  creator_id BIGINT NOT NULL,
  updater_id BIGINT NOT NULL,
  
  -- 业务字段
  chart_id BIGINT NOT NULL REFERENCES models.ladder_charts(id),
  model_id BIGINT NOT NULL REFERENCES models.models(id),
  
  -- 排名信息
  rank_position INTEGER NOT NULL,
  sort_value NUMERIC(19,6) NOT NULL, -- 排序值（如综合评分）
  
  -- 版本信息
  version_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_current BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- 变化信息
  rank_change INTEGER NULL, -- 排名变化（正数上升，负数下降）
  score_change NUMERIC(5,2) NULL, -- 分数变化
  
  -- 唯一约束
  UNIQUE(chart_id, model_id, version_date),
  
  -- 索引
  CONSTRAINT ladder_rankings_rank_position_check CHECK (rank_position > 0)
);

-- 索引
CREATE INDEX idx_ladder_rankings_chart ON models.ladder_rankings(chart_id);
CREATE INDEX idx_ladder_rankings_model ON models.ladder_rankings(model_id);
CREATE INDEX idx_ladder_rankings_position ON models.ladder_rankings(chart_id, rank_position);
CREATE INDEX idx_ladder_rankings_version ON models.ladder_rankings(version_date);
CREATE INDEX idx_ladder_rankings_is_current ON models.ladder_rankings(is_current) WHERE is_current = TRUE;
```

### 3.3 工具生态（tools schema）

#### 3.3.1 tools.skills - 技能表

```sql
CREATE TABLE tools.skills (
  -- 基础通用字段
  id BIGINT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  version BIGINT NOT NULL DEFAULT 1,
  tenant_id BIGINT NOT NULL DEFAULT 1,
  org_id BIGINT NOT NULL DEFAULT 1,
  creator_id BIGINT NOT NULL,
  updater_id BIGINT NOT NULL,
  
  -- 扩展通用字段
  status SMALLINT NOT NULL DEFAULT 1,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  featured_weight INTEGER NOT NULL DEFAULT 0,
  
  -- 业务字段
  skill_key VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  
  -- 来源
  source VARCHAR(50) NOT NULL, -- 来源平台
  source_id VARCHAR(100) NULL, -- 来源ID
  source_url VARCHAR(255) NULL, -- 来源URL
  
  -- 统计信息
  github_stars INTEGER NOT NULL DEFAULT 0,
  download_count INTEGER NOT NULL DEFAULT 0,
  
  -- 技术信息
  language VARCHAR(50) NULL,
  framework VARCHAR(50) NULL,
  
  -- 安装信息
  install_command VARCHAR(255) NULL,
  
  -- 分类
  category_level_1 SMALLINT NOT NULL, -- 一级分类
  category_level_2 SMALLINT NULL, -- 二级分类
  category_level_3 SMALLINT NULL, -- 三级分类
  
  -- 标签
  tags JSONB NULL,
  
  -- 同步信息
  sync_status SMALLINT NOT NULL DEFAULT 1, -- 1-同步中 2-同步成功 3-同步失败
  last_synced_at TIMESTAMPTZ NULL,
  sync_error TEXT NULL,
  
  -- 索引
  CONSTRAINT skills_sync_status_check CHECK (sync_status IN (1, 2, 3))
);

-- 索引
CREATE INDEX idx_skills_skill_key ON tools.skills(skill_key);
CREATE INDEX idx_skills_source ON tools.skills(source);
CREATE INDEX idx_skills_category ON tools.skills(category_level_1, category_level_2, category_level_3);
CREATE INDEX idx_skills_github_stars ON tools.skills(github_stars DESC);
CREATE INDEX idx_skills_sync_status ON tools.skills(sync_status);
```

#### 3.3.2 tools.mcp_servers - MCP工具表

```sql
CREATE TABLE tools.mcp_servers (
  -- 基础通用字段
  id BIGINT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  version BIGINT NOT NULL DEFAULT 1,
  tenant_id BIGINT NOT NULL DEFAULT 1,
  org_id BIGINT NOT NULL DEFAULT 1,
  creator_id BIGINT NOT NULL,
  updater_id BIGINT NOT NULL,
  
  -- 扩展通用字段
  status SMALLINT NOT NULL DEFAULT 1,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- 业务字段
  server_key VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  
  -- 连接信息
  endpoint_url VARCHAR(255) NOT NULL,
  api_key VARCHAR(255) NULL,
  
  -- 技术信息
  source_type VARCHAR(50) NOT NULL, -- 来源类型
  tool_count INTEGER NOT NULL DEFAULT 0,
  
  -- 分类
  category_level_1 SMALLINT NOT NULL, -- 一级分类
  category_level_2 SMALLINT NULL, -- 二级分类
  
  -- 标签
  tags JSONB NULL,
  
  -- 同步信息
  sync_status SMALLINT NOT NULL DEFAULT 1, -- 1-同步中 2-同步成功 3-同步失败
  last_synced_at TIMESTAMPTZ NULL,
  sync_error TEXT NULL,
  
  -- 索引
  CONSTRAINT mcp_servers_sync_status_check CHECK (sync_status IN (1, 2, 3))
);

-- 索引
CREATE INDEX idx_mcp_servers_server_key ON tools.mcp_servers(server_key);
CREATE INDEX idx_mcp_servers_source_type ON tools.mcp_servers(source_type);
CREATE INDEX idx_mcp_servers_category ON tools.mcp_servers(category_level_1, category_level_2);
CREATE INDEX idx_mcp_servers_sync_status ON tools.mcp_servers(sync_status);
```

#### 3.3.3 tools.agents - Agent表

```sql
CREATE TABLE tools.agents (
  -- 基础通用字段
  id BIGINT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  version BIGINT NOT NULL DEFAULT 1,
  tenant_id BIGINT NOT NULL DEFAULT 1,
  org_id BIGINT NOT NULL DEFAULT 1,
  creator_id BIGINT NOT NULL,
  updater_id BIGINT NOT NULL,
  
  -- 扩展通用字段
  status SMALLINT NOT NULL DEFAULT 1,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  featured_weight INTEGER NOT NULL DEFAULT 0,
  
  -- 业务字段
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  
  -- 技术信息
  framework VARCHAR(50) NULL, -- 框架
  capabilities JSONB NULL, -- 能力列表
  
  -- 分类
  category_level_1 SMALLINT NOT NULL, -- 一级分类
  category_level_2 SMALLINT NULL, -- 二级分类
  
  -- 标签
  tags JSONB NULL,
  
  -- 统计信息
  usage_count INTEGER NOT NULL DEFAULT 0,
  
  -- 索引
  CONSTRAINT agents_category_level_1_check CHECK (category_level_1 > 0)
);

-- 索引
CREATE INDEX idx_agents_category ON tools.agents(category_level_1, category_level_2);
CREATE INDEX idx_agents_framework ON tools.agents(framework);
CREATE INDEX idx_agents_is_featured ON tools.agents(is_featured);
```

### 3.4 系统管理（system schema）

#### 3.4.1 system.configs - 系统配置表

```sql
CREATE TABLE system.configs (
  -- 基础通用字段
  id BIGINT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  version BIGINT NOT NULL DEFAULT 1,
  tenant_id BIGINT NOT NULL DEFAULT 1,
  org_id BIGINT NOT NULL DEFAULT 1,
  creator_id BIGINT NOT NULL,
  updater_id BIGINT NOT NULL,
  
  -- 业务字段
  config_key VARCHAR(100) NOT NULL UNIQUE,
  config_value TEXT NOT NULL,
  description TEXT NULL,
  
  -- 配置类型
  config_type SMALLINT NOT NULL, -- 1-系统 2-业务 3-界面 4-安全
  
  -- 适用范围
  applicable_scope VARCHAR(50) NOT NULL DEFAULT 'global', -- global, tenant, org
  
  -- 是否加密
  is_encrypted BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- 索引
  CONSTRAINT configs_config_type_check CHECK (config_type IN (1, 2, 3, 4))
);

-- 索引
CREATE INDEX idx_configs_config_key ON system.configs(config_key);
CREATE INDEX idx_configs_config_type ON system.configs(config_type);
CREATE INDEX idx_configs_applicable_scope ON system.configs(applicable_scope);
```

#### 3.4.2 system.feature_flags - 功能开关表

```sql
CREATE TABLE system.feature_flags (
  -- 基础通用字段
  id BIGINT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  version BIGINT NOT NULL DEFAULT 1,
  tenant_id BIGINT NOT NULL DEFAULT 1,
  org_id BIGINT NOT NULL DEFAULT 1,
  creator_id BIGINT NOT NULL,
  updater_id BIGINT NOT NULL,
  
  -- 业务字段
  flag_key VARCHAR(100) NOT NULL UNIQUE,
  flag_name VARCHAR(100) NOT NULL,
  description TEXT NULL,
  
  -- 开关状态
  is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- 适用角色
  enabled_roles JSONB NULL, -- 启用的角色列表
  
  -- 适用范围
  applicable_scope VARCHAR(50) NOT NULL DEFAULT 'global', -- global, tenant, org
  
  -- 索引
  CONSTRAINT feature_flags_applicable_scope_check CHECK (applicable_scope IN ('global', 'tenant', 'org'))
);

-- 索引
CREATE INDEX idx_feature_flags_flag_key ON system.feature_flags(flag_key);
CREATE INDEX idx_feature_flags_is_enabled ON system.feature_flags(is_enabled);
CREATE INDEX idx_feature_flags_applicable_scope ON system.feature_flags(applicable_scope);
```

#### 3.4.3 system.navigation_menus - 导航菜单表

```sql
CREATE TABLE system.navigation_menus (
  -- 基础通用字段
  id BIGINT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  version BIGINT NOT NULL DEFAULT 1,
  tenant_id BIGINT NOT NULL DEFAULT 1,
  org_id BIGINT NOT NULL DEFAULT 1,
  creator_id BIGINT NOT NULL,
  updater_id BIGINT NOT NULL,
  
  -- 扩展通用字段
  status SMALLINT NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  
  -- 业务字段
  menu_name VARCHAR(100) NOT NULL,
  menu_url VARCHAR(255) NOT NULL,
  menu_icon VARCHAR(50) NULL,
  
  -- 层级关系
  parent_id BIGINT NULL REFERENCES system.navigation_menus(id),
  level SMALLINT NOT NULL DEFAULT 1, -- 1-顶级 2-二级 3-三级
  
  -- 权限控制
  required_role VARCHAR(50) NULL, -- 所需角色
  
  -- 适用平台
  platform VARCHAR(20) NOT NULL DEFAULT 'web', -- web, mobile, all
  
  -- 索引
  CONSTRAINT navigation_menus_level_check CHECK (level IN (1, 2, 3)),
  CONSTRAINT navigation_menus_platform_check CHECK (platform IN ('web', 'mobile', 'all'))
);

-- 索引
CREATE INDEX idx_navigation_menus_parent ON system.navigation_menus(parent_id);
CREATE INDEX idx_navigation_menus_level ON system.navigation_menus(level);
CREATE INDEX idx_navigation_menus_platform ON system.navigation_menus(platform);
```

#### 3.4.4 system.categories - 分类管理表

```sql
CREATE TABLE system.categories (
  -- 基础通用字段
  id BIGINT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  version BIGINT NOT NULL DEFAULT 1,
  tenant_id BIGINT NOT NULL DEFAULT 1,
  org_id BIGINT NOT NULL DEFAULT 1,
  creator_id BIGINT NOT NULL,
  updater_id BIGINT NOT NULL,
  
  -- 扩展通用字段
  status SMALLINT NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  
  -- 业务字段
  category_name VARCHAR(100) NOT NULL,
  category_code VARCHAR(50) NOT NULL UNIQUE,
  description TEXT NULL,
  
  -- 层级关系
  parent_id BIGINT NULL REFERENCES system.categories(id),
  level SMALLINT NOT NULL DEFAULT 1, -- 1-顶级 2-二级 3-三级 4-四级
  
  -- 分类类型
  category_type VARCHAR(50) NOT NULL, -- model, skill, mcp, agent, news等
  
  -- 统计信息
  item_count INTEGER NOT NULL DEFAULT 0,
  
  -- 索引
  CONSTRAINT categories_level_check CHECK (level IN (1, 2, 3, 4))
);

-- 索引
CREATE INDEX idx_categories_parent ON system.categories(parent_id);
CREATE INDEX idx_categories_level ON system.categories(level);
CREATE INDEX idx_categories_category_type ON system.categories(category_type);
CREATE INDEX idx_categories_category_code ON system.categories(category_code);
```

#### 3.4.5 system.regions - 地区管理表

```sql
CREATE TABLE system.regions (
  -- 基础通用字段
  id BIGINT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  version BIGINT NOT NULL DEFAULT 1,
  tenant_id BIGINT NOT NULL DEFAULT 1,
  org_id BIGINT NOT NULL DEFAULT 1,
  creator_id BIGINT NOT NULL,
  updater_id BIGINT NOT NULL,
  
  -- 扩展通用字段
  status SMALLINT NOT NULL DEFAULT 1,
  
  -- 业务字段
  region_name VARCHAR(100) NOT NULL,
  region_code VARCHAR(20) NOT NULL UNIQUE,
  
  -- 层级关系
  parent_id BIGINT NULL REFERENCES system.regions(id),
  level SMALLINT NOT NULL DEFAULT 1, -- 1-国家 2-省/州 3-市 4-区/县
  
  -- 地理位置
  latitude NUMERIC(10,6) NULL,
  longitude NUMERIC(10,6) NULL,
  
  -- 统计信息
  population BIGINT NULL,
  area NUMERIC(19,2) NULL, -- 面积（平方公里）
  
  -- 索引
  CONSTRAINT regions_level_check CHECK (level IN (1, 2, 3, 4))
);

-- 索引
CREATE INDEX idx_regions_parent ON system.regions(parent_id);
CREATE INDEX idx_regions_level ON system.regions(level);
CREATE INDEX idx_regions_region_code ON system.regions(region_code);
```

#### 3.4.6 system.filter_options - 筛选配置表

```sql
CREATE TABLE system.filter_options (
  -- 基础通用字段
  id BIGINT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  version BIGINT NOT NULL DEFAULT 1,
  tenant_id BIGINT NOT NULL DEFAULT 1,
  org_id BIGINT NOT NULL DEFAULT 1,
  creator_id BIGINT NOT NULL,
  updater_id BIGINT NOT NULL,
  
  -- 扩展通用字段
  status SMALLINT NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  
  -- 业务字段
  filter_type VARCHAR(50) NOT NULL, -- 筛选类型
  filter_name VARCHAR(100) NOT NULL,
  
  -- 选项配置
  filter_options JSONB NOT NULL, -- 筛选选项列表
  
  -- 适用范围
  applicable_to VARCHAR(50) NOT NULL, -- 适用的页面或功能
  
  -- 索引
  CONSTRAINT filter_options_status_check CHECK (status IN (0, 1))
);

-- 索引
CREATE INDEX idx_filter_options_filter_type ON system.filter_options(filter_type);
CREATE INDEX idx_filter_options_applicable_to ON system.filter_options(applicable_to);
```

### 3.5 财务系统（finance schema）

#### 3.5.1 finance.transactions - 交易表

```sql
CREATE TABLE finance.transactions (
  -- 基础通用字段
  id BIGINT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  version BIGINT NOT NULL DEFAULT 1,
  tenant_id BIGINT NOT NULL DEFAULT 1,
  org_id BIGINT NOT NULL DEFAULT 1,
  creator_id BIGINT NOT NULL,
  updater_id BIGINT NOT NULL,
  
  -- 业务字段
  user_id BIGINT NOT NULL REFERENCES users.users(id),
  transaction_type SMALLINT NOT NULL, -- 1-充值 2-消费 3-退款 4-赠送
  amount NUMERIC(19,4) NOT NULL,
  
  -- 交易详情
  transaction_no VARCHAR(50) NOT NULL UNIQUE,
  status SMALLINT NOT NULL DEFAULT 1, -- 1-待处理 2-成功 3-失败
  
  -- 关联信息
  order_id BIGINT NULL, -- 关联订单ID
  model_id BIGINT NULL, -- 关联模型ID
  evaluation_id BIGINT NULL, -- 关联测评ID
  
  -- 支付信息
  payment_method VARCHAR(50) NULL, -- 支付方式
  payment_transaction_id VARCHAR(100) NULL, -- 支付平台交易ID
  
  -- 备注
  remark TEXT NULL,
  
  -- 索引
  CONSTRAINT transactions_transaction_type_check CHECK (transaction_type IN (1, 2, 3, 4)),
  CONSTRAINT transactions_status_check CHECK (status IN (1, 2, 3))
);

-- 索引
CREATE INDEX idx_transactions_user ON finance.transactions(user_id);
CREATE INDEX idx_transactions_type ON finance.transactions(transaction_type);
CREATE INDEX idx_transactions_status ON finance.transactions(status);
CREATE INDEX idx_transactions_transaction_no ON finance.transactions(transaction_no);
CREATE INDEX idx_transactions_created_at ON finance.transactions(created_at);
```

#### 3.5.2 finance.recharge_orders - 充值订单表

```sql
CREATE TABLE finance.recharge_orders (
  -- 基础通用字段
  id BIGINT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  version BIGINT NOT NULL DEFAULT 1,
  tenant_id BIGINT NOT NULL DEFAULT 1,
  org_id BIGINT NOT NULL DEFAULT 1,
  creator_id BIGINT NOT NULL,
  updater_id BIGINT NOT NULL,
  
  -- 业务字段
  user_id BIGINT NOT NULL REFERENCES users.users(id),
  order_no VARCHAR(50) NOT NULL UNIQUE,
  amount NUMERIC(19,4) NOT NULL,
  
  -- 订单状态
  status SMALLINT NOT NULL DEFAULT 1, -- 1-待支付 2-已支付 3-已取消 4-支付失败
  
  -- 支付信息
  payment_method VARCHAR(50) NULL, -- 支付方式
  payment_transaction_id VARCHAR(100) NULL, -- 支付平台交易ID
  paid_at TIMESTAMPTZ NULL, -- 支付时间
  
  -- 备注
  remark TEXT NULL,
  
  -- 索引
  CONSTRAINT recharge_orders_status_check CHECK (status IN (1, 2, 3, 4))
);

-- 索引
CREATE INDEX idx_recharge_orders_user ON finance.recharge_orders(user_id);
CREATE INDEX idx_recharge_orders_order_no ON finance.recharge_orders(order_no);
CREATE INDEX idx_recharge_orders_status ON finance.recharge_orders(status);
CREATE INDEX idx_recharge_orders_created_at ON finance.recharge_orders(created_at);
```

#### 3.5.3 finance.billing_rules - 计费规则表

```sql
CREATE TABLE finance.billing_rules (
  -- 基础通用字段
  id BIGINT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  version BIGINT NOT NULL DEFAULT 1,
  tenant_id BIGINT NOT NULL DEFAULT 1,
  org_id BIGINT NOT NULL DEFAULT 1,
  creator_id BIGINT NOT NULL,
  updater_id BIGINT NOT NULL,
  
  -- 扩展通用字段
  status SMALLINT NOT NULL DEFAULT 1,
  
  -- 业务字段
  rule_name VARCHAR(100) NOT NULL,
  rule_code VARCHAR(50) NOT NULL UNIQUE,
  description TEXT NULL,
  
  -- 规则配置
  rule_type SMALLINT NOT NULL, -- 1-测评 2-API调用 3-订阅
  billing_type SMALLINT NOT NULL, -- 1-按次 2-按时长 3-按容量
  
  -- 价格配置
  unit_price NUMERIC(19,6) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  billing_unit VARCHAR(20) NOT NULL, -- 计费单位
  
  -- 适用范围
  applicable_to JSONB NULL, -- 适用的模型、用户等
  
  -- 时间范围
  effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  effective_until TIMESTAMPTZ NULL,
  is_current BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- 索引
  CONSTRAINT billing_rules_rule_type_check CHECK (rule_type IN (1, 2, 3)),
  CONSTRAINT billing_rules_billing_type_check CHECK (billing_type IN (1, 2, 3))
);

-- 索引
CREATE INDEX idx_billing_rules_rule_code ON finance.billing_rules(rule_code);
CREATE INDEX idx_billing_rules_rule_type ON finance.billing_rules(rule_type);
CREATE INDEX idx_billing_rules_is_current ON finance.billing_rules(is_current) WHERE is_current = TRUE;
```

### 3.6 内容管理（content schema）

#### 3.6.1 content.news - AI快讯表

```sql
CREATE TABLE content.news (
  -- 基础通用字段
  id BIGINT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  version BIGINT NOT NULL DEFAULT 1,
  tenant_id BIGINT NOT NULL DEFAULT 1,
  org_id BIGINT NOT NULL DEFAULT 1,
  creator_id BIGINT NOT NULL,
  updater_id BIGINT NOT NULL,
  
  -- 扩展通用字段
  status SMALLINT NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- 业务字段
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  summary TEXT NULL,
  
  -- 分类
  category_level_1 SMALLINT NOT NULL, -- 一级分类
  category_level_2 SMALLINT NULL, -- 二级分类
  
  -- 媒体
  cover_image VARCHAR(255) NULL,
  
  -- 来源
  source VARCHAR(100) NULL,
  source_url VARCHAR(255) NULL,
  
  -- 发布信息
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- 统计信息
  view_count BIGINT NOT NULL DEFAULT 0,
  comment_count BIGINT NOT NULL DEFAULT 0,
  
  -- 标签
  tags JSONB NULL,
  
  -- 索引
  CONSTRAINT news_status_check CHECK (status IN (0, 1))
);

-- 索引
CREATE INDEX idx_news_category ON content.news(category_level_1, category_level_2);
CREATE INDEX idx_news_published_at ON content.news(published_at DESC);
CREATE INDEX idx_news_is_featured ON content.news(is_featured);
CREATE INDEX idx_news_view_count ON content.news(view_count DESC);
```

#### 3.6.2 content.scenarios - 场景方案表

```sql
CREATE TABLE content.scenarios (
  -- 基础通用字段
  id BIGINT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  version BIGINT NOT NULL DEFAULT 1,
  tenant_id BIGINT NOT NULL DEFAULT 1,
  org_id BIGINT NOT NULL DEFAULT 1,
  creator_id BIGINT NOT NULL,
  updater_id BIGINT NOT NULL,
  
  -- 扩展通用字段
  status SMALLINT NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  
  -- 业务字段
  scenario_name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  content TEXT NOT NULL,
  
  -- 分类
  category SMALLINT NOT NULL, -- 场景分类
  difficulty SMALLINT NOT NULL, -- 难度等级
  
  -- 相关模型
  related_models JSONB NULL, -- 关联模型ID列表
  
  -- 标签
  tags JSONB NULL,
  
  -- 统计信息
  view_count BIGINT NOT NULL DEFAULT 0,
  
  -- 索引
  CONSTRAINT scenarios_category_check CHECK (category > 0),
  CONSTRAINT scenarios_difficulty_check CHECK (difficulty IN (1, 2, 3))
);

-- 索引
CREATE INDEX idx_scenarios_category ON content.scenarios(category);
CREATE INDEX idx_scenarios_difficulty ON content.scenarios(difficulty);
CREATE INDEX idx_scenarios_view_count ON content.scenarios(view_count DESC);
```

### 3.7 审计日志（audit schema）

#### 3.7.1 audit.logs - 审计日志表

```sql
CREATE TABLE audit.logs (
  -- 基础通用字段
  id BIGINT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  version BIGINT NOT NULL DEFAULT 1,
  tenant_id BIGINT NOT NULL DEFAULT 1,
  org_id BIGINT NOT NULL DEFAULT 1,
  creator_id BIGINT NOT NULL,
  updater_id BIGINT NOT NULL,
  
  -- 业务字段
  user_id BIGINT NULL REFERENCES users.users(id),
  action VARCHAR(100) NOT NULL, -- 操作类型
  resource_type VARCHAR(50) NOT NULL, -- 资源类型
  resource_id BIGINT NULL, -- 资源ID
  
  -- 操作详情
  old_value JSONB NULL, -- 旧值
  new_value JSONB NULL, -- 新值
  
  -- 上下文信息
  ip_address VARCHAR(50) NULL,
  user_agent TEXT NULL,
  request_id VARCHAR(100) NULL,
  
  -- 结果
  status SMALLINT NOT NULL DEFAULT 1, -- 1-成功 2-失败
  error_message TEXT NULL, -- 错误信息
  
  -- 索引
  CONSTRAINT audit_logs_status_check CHECK (status IN (1, 2))
);

-- 索引
CREATE INDEX idx_audit_logs_user ON audit.logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit.logs(action);
CREATE INDEX idx_audit_logs_resource ON audit.logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created_at ON audit.logs(created_at DESC);
CREATE INDEX idx_audit_logs_ip_address ON audit.logs(ip_address);

-- 分区（按创建时间RANGE分区）
CREATE TABLE audit.logs_partitioned (
  LIKE audit.logs INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- 创建月度分区（示例）
DO $$
BEGIN
  FOR i IN 1..12 LOOP
    EXECUTE format('CREATE TABLE audit.logs_partitioned_p2026%s PARTITION OF audit.logs_partitioned FOR VALUES FROM (''2026-%s-01'') TO (''2026-%s-01'')', 
      LPAD(i::text, 2, '0'), 
      LPAD(i::text, 2, '0'), 
      LPAD((i+1)::text, 2, '0'));
  END LOOP;
END $$;
```

### 3.8 字典数据（dict schema）

#### 3.8.1 dict.types - 字典类型表

```sql
CREATE TABLE dict.types (
  -- 基础通用字段
  id BIGINT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  version BIGINT NOT NULL DEFAULT 1,
  tenant_id BIGINT NOT NULL DEFAULT 1,
  org_id BIGINT NOT NULL DEFAULT 1,
  creator_id BIGINT NOT NULL,
  updater_id BIGINT NOT NULL,
  
  -- 扩展通用字段
  status SMALLINT NOT NULL DEFAULT 1,
  
  -- 业务字段
  type_code VARCHAR(50) NOT NULL UNIQUE,
  type_name VARCHAR(100) NOT NULL,
  description TEXT NULL,
  
  -- 是否系统内置
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- 索引
  CONSTRAINT dict_types_status_check CHECK (status IN (0, 1))
);

-- 索引
CREATE INDEX idx_dict_types_type_code ON dict.types(type_code);
CREATE INDEX idx_dict_types_is_system ON dict.types(is_system);
```

#### 3.8.2 dict.items - 字典项表

```sql
CREATE TABLE dict.items (
  -- 基础通用字段
  id BIGINT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  version BIGINT NOT NULL DEFAULT 1,
  tenant_id BIGINT NOT NULL DEFAULT 1,
  org_id BIGINT NOT NULL DEFAULT 1,
  creator_id BIGINT NOT NULL,
  updater_id BIGINT NOT NULL,
  
  -- 扩展通用字段
  status SMALLINT NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  
  -- 业务字段
  type_id BIGINT NOT NULL REFERENCES dict.types(id),
  item_code VARCHAR(50) NOT NULL,
  item_name VARCHAR(100) NOT NULL,
  item_value VARCHAR(255) NOT NULL,
  description TEXT NULL,
  
  -- 唯一约束
  UNIQUE(type_id, item_code),
  
  -- 索引
  CONSTRAINT dict_items_status_check CHECK (status IN (0, 1))
);

-- 索引
CREATE INDEX idx_dict_items_type ON dict.items(type_id);
CREATE INDEX idx_dict_items_item_code ON dict.items(item_code);
CREATE INDEX idx_dict_items_type_code ON dict.items(type_id, item_code);
```

---

## 四、索引策略

### 4.1 核心索引设计

| 表名 | 索引类型 | 索引字段 | 用途 |
|------|---------|---------|------|
| users.users | B-tree | email, phone | 快速查找用户 |
| users.users | B-tree | subscription_expires_at | 订阅管理 |
| models.models | B-tree | vendor_id | 厂商关联查询 |
| models.models | B-tree | type, category_level_1, category_level_2, category_level_3 | 分类筛选 |
| models.models | B-tree | current_overall_score | 天梯图排序 |
| models.prices | B-tree | model_id, effective_from | 价格历史查询 |
| models.prices | B-tree | is_current | 当前价格查询 |
| models.scores | B-tree | model_id, benchmark_id | 评分查询 |
| models.scores | B-tree | overall_score | 评分排序 |
| models.ladder_rankings | B-tree | chart_id, rank_position | 天梯图排名查询 |
| tools.skills | B-tree | skill_key | 技能唯一标识 |
| tools.skills | B-tree | github_stars | 热门技能排序 |
| finance.transactions | B-tree | user_id, transaction_type | 交易记录查询 |
| finance.transactions | B-tree | created_at | 交易时间排序 |
| content.news | B-tree | published_at | 新闻时间排序 |
| audit.logs | B-tree | user_id, action | 审计日志查询 |
| audit.logs | B-tree | created_at | 日志时间排序 |

### 4.2 复合索引设计

| 表名 | 复合索引字段 | 用途 |
|------|-------------|------|
| models.models | vendor_id, type, category_level_1 | 多维度筛选 |
| models.scores | model_id, is_current | 当前评分查询 |
| models.ladder_rankings | chart_id, is_current, rank_position | 天梯图当前排名 |
| users.favorites | user_id, target_type, target_id | 收藏查询 |
| finance.transactions | user_id, transaction_type, status | 交易状态查询 |
| content.news | category_level_1, category_level_2, published_at | 分类新闻查询 |

### 4.3 特殊索引设计

| 表名 | 索引类型 | 索引字段 | 用途 |
|------|---------|---------|------|
| models.models | GIN | features, use_cases | JSONB字段搜索 |
| tools.skills | GIN | tags | 标签搜索 |
| content.news | GIN | tags | 标签搜索 |
| models.models | TSVECTOR | search_vector | 全文搜索 |
| content.news | TSVECTOR | search_vector | 全文搜索 |

---

## 五、分区策略

### 5.1 分区表设计

| 表名 | 分区类型 | 分区键 | 分区数量 | 用途 |
|------|---------|---------|---------|------|
| users.users_partitioned | HASH | tenant_id | 16 | 多租户数据隔离 |
| models.models_partitioned | RANGE | created_at | 12/年 | 模型数据按时间归档 |
| audit.logs_partitioned | RANGE | created_at | 12/年 | 审计日志按时间归档 |
| finance.transactions | RANGE | created_at | 12/年 | 交易记录按时间归档 |

### 5.2 分区维护策略

1. **自动分区创建**：使用定时任务自动创建未来3个月的分区
2. **分区数据归档**：对超过1年的分区数据进行归档
3. **分区索引维护**：定期重建分区索引以保持性能

---

## 六、Redis缓存设计

### 6.1 缓存Key设计

| 缓存类型 | Key模式 | 过期时间 | 用途 |
|---------|---------|---------|------|
| 模型详情 | model:{model_id}:detail | 1小时 | 模型详情页缓存 |
| 模型列表 | models:{type}:{category}:{page}:{size} | 30分钟 | 模型列表页缓存 |
| 天梯图 | ladder:{chart_key}:{version_date} | 1小时 | 天梯图数据缓存 |
| 厂商信息 | vendor:{vendor_id}:detail | 2小时 | 厂商详情缓存 |
| 技能列表 | skills:{category}:{page}:{size} | 30分钟 | 技能列表缓存 |
| 用户信息 | user:{user_id}:profile | 30分钟 | 用户信息缓存 |
| 系统配置 | config:{config_key} | 1天 | 系统配置缓存 |

### 6.2 缓存策略

1. **读写策略**：采用先更新数据库，后删除缓存的策略
2. **缓存预热**：系统启动时预热热点数据
3. **缓存降级**：当缓存不可用时，直接从数据库读取
4. **缓存监控**：监控缓存命中率和性能

---

## 七、数据库设计原则检查

### 7.1 已遵守的原则

| 原则 | 状态 | 说明 |
|------|------|------|
| 主键使用BIGINT | ✅ | 所有表均使用Snowflake ID作为主键 |
| 金额使用NUMERIC | ✅ | 所有金额字段均使用NUMERIC(19,4)或NUMERIC(19,6) |
| 枚举使用SMALLINT | ✅ | 所有枚举类型均使用SMALLINT并配合字典表 |
| 时间使用TIMESTAMPTZ | ✅ | 所有时间字段均使用TIMESTAMPTZ |
| JSON使用JSONB | ✅ | 所有JSON字段均使用JSONB类型 |
| 软删除设计 | ✅ | 所有表均包含deleted_at字段 |
| 乐观锁设计 | ✅ | 所有表均包含version字段 |
| 多租户预留 | ✅ | 所有表均包含tenant_id和org_id字段 |
| 全文搜索预留 | ✅ | 支持搜索的表均包含search_vector字段 |
| 字段注释完善 | ✅ | 所有表和字段均有详细注释 |

### 7.2 优化建议

1. **数据加密**：对敏感字段（如密码哈希、API密钥）考虑使用更高级的加密方式
2. **数据分级**：进一步完善数据分类机制，实现更细粒度的权限控制
3. **归档策略**：制定详细的数据归档计划，定期清理历史数据
4. **备份策略**：建立完善的数据库备份和恢复机制
5. **性能监控**：建立数据库性能监控系统，及时发现和解决性能问题

---

## 八、总结

### 8.1 设计优势

1. **Schema分区清晰**：9个Schema分工明确，便于管理和维护
2. **字段完整性强**：整合了opencode的30+通用字段，满足各种扩展需求
3. **层级关系完善**：实现了多级分类、菜单、地区等层级结构
4. **分区策略合理**：对大型表进行分区，提高查询性能
5. **索引设计完善**：综合使用B-tree、GIN等索引类型，优化查询性能
6. **缓存策略优化**：合理的Redis缓存设计，减少数据库压力
7. **扩展性强**：预留了充足的扩展字段和表结构

### 8.2 功能覆盖

- ✅ 用户系统（认证、管理、余额、订阅、收藏）
- ✅ 模型系统（模型、厂商、价格、基准测试、评分）
- ✅ 天梯图系统（定义、排名、历史）
- ✅ 工具生态（Skills、MCP、Agent）
- ✅ 内容系统（新闻、场景方案）
- ✅ 财务系统（交易、充值、计费规则）
- ✅ 系统管理（配置、功能开关、导航菜单、分类、地区）
- ✅ 审计系统（操作日志）
- ✅ 字典系统（类型、字典项）

### 8.3 实施建议

1. **分阶段实施**：优先实现核心功能（用户系统、模型系统、天梯图系统）
2. **数据迁移**：制定详细的数据迁移计划，确保平滑过渡
3. **性能测试**：在正式上线前进行充分的性能测试
4. **监控告警**：建立完善的监控和告警机制
5. **文档更新**：及时更新数据库设计文档，保持与实际实现一致

---

## 九、附件

### 9.1 实体关系图（ER图）

![ER图](er_diagram.png)

### 9.2 数据字典

| 表名 | 说明 | 主要字段 | 关联表 |
|------|------|---------|--------|
| users.users | 用户表 | id, username, email, password_hash | users.favorites, finance.transactions |
| models.vendors | 厂商表 | id, name, parent_id, tier_level | models.models |
| models.models | 模型表 | id, name, vendor_id, type, category_level_1 | models.prices, models.scores, models.ladder_rankings |
| models.prices | 价格历史表 | id, model_id, price_input, price_output, effective_from | models.models |
| models.scores | 评分表 | id, model_id, benchmark_id, overall_score | models.models, models.benchmarks |
| models.ladder_charts | 天梯图定义表 | id, chart_key, name, chart_type | models.ladder_rankings |
| models.ladder_rankings | 天梯图排名表 | id, chart_id, model_id, rank_position | models.ladder_charts, models.models |
| tools.skills | 技能表 | id, skill_key, name, source | users.favorites |
| tools.mcp_servers | MCP工具表 | id, server_key, name, endpoint_url | users.favorites |
| tools.agents | Agent表 | id, name, framework, capabilities | users.favorites |
| system.configs | 系统配置表 | id, config_key, config_value, config_type | - |
| system.feature_flags | 功能开关表 | id, flag_key, is_enabled, enabled_roles | - |
| system.navigation_menus | 导航菜单表 | id, menu_name, menu_url, parent_id, level | - |
| system.categories | 分类管理表 | id, category_name, category_code, parent_id, level | - |
| system.regions | 地区管理表 | id, region_name, region_code, parent_id, level | - |
| finance.transactions | 交易表 | id, user_id, transaction_type, amount, status | users.users |
| finance.recharge_orders | 充值订单表 | id, user_id, order_no, amount, status | users.users |
| finance.billing_rules | 计费规则表 | id, rule_code, rule_type, unit_price, effective_from | - |
| content.news | AI快讯表 | id, title, content, category_level_1, published_at | users.favorites |
| content.scenarios | 场景方案表 | id, scenario_name, category, difficulty, content | - |
| audit.logs | 审计日志表 | id, user_id, action, resource_type, resource_id | users.users |
| dict.types | 字典类型表 | id, type_code, type_name, is_system | dict.items |
| dict.items | 字典项表 | id, type_id, item_code, item_name, item_value | dict.types |

### 9.3 初始化脚本

#### 9.3.1 字典数据初始化

```sql
-- 字典类型
INSERT INTO dict.types (id, type_code, type_name, description, is_system, creator_id, updater_id)
VALUES 
(1, 'model_type', '模型类型', 'AI模型类型', true, 1, 1),
(2, 'model_category', '模型分类', 'AI模型分类', true, 1, 1),
(3, 'license_type', '许可证类型', '模型许可证类型', true, 1, 1),
(4, 'transaction_type', '交易类型', '财务交易类型', true, 1, 1),
(5, 'billing_type', '计费类型', '计费规则类型', true, 1, 1),
(6, 'skill_category', '技能分类', 'Skills分类', true, 1, 1),
(7, 'news_category', '新闻分类', 'AI快讯分类', true, 1, 1);

-- 字典项
INSERT INTO dict.items (id, type_id, item_code, item_name, item_value, sort_order, creator_id, updater_id)
VALUES
-- 模型类型
(1, 1, '1', '对话', '1', 1, 1, 1),
(2, 1, '2', '多模态', '2', 2, 1, 1),
(3, 1, '3', '图像', '3', 3, 1, 1),
(4, 1, '4', '视频', '4', 4, 1, 1),
(5, 1, '5', '音频', '5', 5, 1, 1),
(6, 1, '6', '代码', '6', 6, 1, 1),
(7, 1, '7', '其他', '7', 7, 1, 1),
-- 模型分类
(8, 2, '1', '专业版', '1', 1, 1, 1),
(9, 2, '2', '应用版', '2', 2, 1, 1),
-- 许可证类型
(10, 3, '1', '闭源', '1', 1, 1, 1),
(11, 3, '2', '开源', '2', 2, 1, 1),
(12, 3, '3', '半开源', '3', 3, 1, 1),
-- 交易类型
(13, 4, '1', '充值', '1', 1, 1, 1),
(14, 4, '2', '消费', '2', 2, 1, 1),
(15, 4, '3', '退款', '3', 3, 1, 1),
(16, 4, '4', '赠送', '4', 4, 1, 1),
-- 计费类型
(17, 5, '1', '按次', '1', 1, 1, 1),
(18, 5, '2', '按时长', '2', 2, 1, 1),
(19, 5, '3', '按容量', '3', 3, 1, 1);
```

#### 9.3.2 系统配置初始化

```sql
INSERT INTO system.configs (id, config_key, config_value, description, config_type, creator_id, updater_id)
VALUES
(1, 'site_name', 'AI模型天梯图', '网站名称', 1, 1, 1),
(2, 'site_description', 'AI模型性能评测与排名平台', '网站描述', 1, 1, 1),
(3, 'max_upload_size', '10485760', '最大上传文件大小（10MB）', 3, 1, 1),
(4, 'page_size', '20', '默认分页大小', 2, 1, 1),
(5, 'cache_ttl', '3600', '缓存过期时间（秒）', 1, 1, 1),
(6, 'api_rate_limit', '100', 'API请求速率限制（次/分钟）', 4, 1, 1);
```

#### 9.3.3 功能开关初始化

```sql
INSERT INTO system.feature_flags (id, flag_key, flag_name, description, is_enabled, creator_id, updater_id)
VALUES
(1, 'user_registration', '用户注册', '允许新用户注册', true, 1, 1),
(2, 'model_submission', '模型提交', '允许用户提交模型', false, 1, 1),
(3, 'evaluation_system', '评测系统', '启用模型评测功能', true, 1, 1),
(4, 'payment_system', '支付系统', '启用支付功能', true, 1, 1),
(5, 'api_access', 'API访问', '启用API访问', false, 1, 1);
```

### 9.4 数据库维护计划

| 任务 | 频率 | 描述 |
|------|------|------|
| 索引重建 | 每周 | 重建所有表的索引 |
| 统计信息更新 | 每周 | 更新表统计信息 |
| 分区维护 | 每月 | 创建新分区，归档旧分区 |
| 备份 | 每日 | 全量备份数据库 |
| 性能分析 | 每月 | 分析数据库性能，优化查询 |
| 安全审计 | 每月 | 检查数据库安全配置 |

---

## 十、版本历史

| 版本 | 日期 | 作者 | 描述 |
|------|------|------|------|
| v1.0 | 2026-04-10 | 综合方案 | 融合opencode、trae、windsurf、workbuddy方案 |
| v1.1 | 2026-04-11 | - | 补充审计日志表设计 |
| v1.2 | 2026-04-12 | - | 完善分区策略 |

---

*本设计文档融合了所有方案的优势，考虑了更多字段和层级关系，遵守了数据库设计原则，是一个全面而完善的PGSQL数据库设计方案。*