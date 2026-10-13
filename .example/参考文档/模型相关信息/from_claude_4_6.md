# AI 市场发现与情报引擎 · 可执行任务大纲体系

> **版本：** v1.0 | **范围：** Ubuntu 无人值守长期运行系统 | **约束：** 自动发现优先，禁止静态名单作为边界

---

## 大纲使用说明

| 符号 | 含义 |
|------|------|
| 🔴 | 阻塞性依赖，必须优先完成 |
| 🟡 | 重要但可并行 |
| 🟢 | 可选增强，优先级靠后 |
| `[ATOMIC]` | 最小原子任务，不可再拆 |
| `[BLOCKER→X.X]` | 阻塞后续编号任务 |
| `[DEPENDS→X.X]` | 依赖指定任务完成 |

---

# 第一部分：基础设施与运行环境

## 1. 基础设施层建设

### 1.1 操作系统与运行时环境

#### 1.1.1 系统基线配置
- 1.1.1.1 `[ATOMIC]` 🔴 确认目标 Ubuntu 版本（22.04 LTS / 24.04 LTS），记录 kernel、glibc 版本 `[BLOCKER→1.1.1.2]`
- 1.1.1.2 `[ATOMIC]` 🔴 执行 `apt update && apt upgrade`，锁定系统软件包版本快照
- 1.1.1.3 `[ATOMIC]` 🔴 创建专用系统用户 `aidiscovery`，配置 sudo 白名单，禁止 root 直接运行服务
- 1.1.1.4 `[ATOMIC]` 🟡 配置 UFW 防火墙规则：仅开放 SSH、API 服务端口、内部通信端口
- 1.1.1.5 `[ATOMIC]` 🟡 配置 `/etc/sysctl.conf`：调优 `net.core.somaxconn`、`fs.file-max`、`vm.swappiness`
- 1.1.1.6 `[ATOMIC]` 🟢 配置 fail2ban，防止 SSH 暴力破解

#### 1.1.2 Python 运行时
- 1.1.2.1 `[ATOMIC]` 🔴 安装 Python 3.11+（通过 `deadsnakes` PPA 或源码编译），验证版本 `[BLOCKER→1.1.2.2]`
- 1.1.2.2 `[ATOMIC]` 🔴 安装 `pip`、`venv`、`pipx`，创建项目专用 virtualenv `/opt/aidiscovery/venv`
- 1.1.2.3 `[ATOMIC]` 🔴 冻结 `requirements.txt`（含精确版本 hash），写入 `requirements.lock`
- 1.1.2.4 `[ATOMIC]` 🟡 安装核心依赖包：`httpx`、`playwright`、`pydantic`、`sqlalchemy`、`celery`、`redis`、`psycopg2`、`apscheduler`、`beautifulsoup4`、`feedparser`、`tenacity`、`loguru`、`prometheus-client`
- 1.1.2.5 `[ATOMIC]` 🟡 验证每个核心包的实际 import 成功，输出版本矩阵报告

#### 1.1.3 Node.js 运行时（用于部分 JS 渲染场景）
- 1.1.3.1 `[ATOMIC]` 🟡 安装 Node.js 20 LTS（通过 nvm 管理），验证版本
- 1.1.3.2 `[ATOMIC]` 🟡 安装 Playwright Node.js 版本作为备用无头浏览器驱动
- 1.1.3.3 `[ATOMIC]` 🟢 安装 `pm2` 用于 Node.js 进程守护

### 1.2 容器化环境

#### 1.2.1 Docker 环境
- 1.2.1.1 `[ATOMIC]` 🔴 安装 Docker Engine（官方源），验证 `docker run hello-world`
- 1.2.1.2 `[ATOMIC]` 🔴 安装 Docker Compose v2，验证 `docker compose version`
- 1.2.1.3 `[ATOMIC]` 🔴 将 `aidiscovery` 用户加入 `docker` 组
- 1.2.1.4 `[ATOMIC]` 🟡 配置 Docker daemon：限制日志大小（`max-size: 100m`），配置 `data-root` 到大容量磁盘
- 1.2.1.5 `[ATOMIC]` 🟡 配置 Docker 网络：创建 `aidiscovery-net` bridge 网络，设定固定子网

#### 1.2.2 核心服务 Compose 编排
- 1.2.2.1 `[ATOMIC]` 🔴 编写 `docker-compose.yml`，定义服务：`postgres`、`redis`、`app`、`worker`、`scheduler`、`prometheus`、`grafana` `[BLOCKER→1.2.2.2]`
- 1.2.2.2 `[ATOMIC]` 🔴 为每个服务配置 `healthcheck`、`restart: unless-stopped`、资源限制（`cpus`、`memory`）
- 1.2.2.3 `[ATOMIC]` 🟡 配置 Docker volume：数据卷 `pg_data`、`redis_data`、`raw_snapshots`、`logs`
- 1.2.2.4 `[ATOMIC]` 🟡 配置 Docker secrets 或 `.env` 文件管理：区分 development / production 环境变量
- 1.2.2.5 `[ATOMIC]` 🟢 编写 `Makefile` 封装常用命令：`make up`、`make down`、`make logs`、`make migrate`

### 1.3 数据库层

#### 1.3.1 PostgreSQL 配置
- 1.3.1.1 `[ATOMIC]` 🔴 部署 PostgreSQL 16，配置 `postgresql.conf`：调优 `shared_buffers`（25% RAM）、`work_mem`、`max_connections` `[BLOCKER→1.3.1.2]`
- 1.3.1.2 `[ATOMIC]` 🔴 创建数据库 `aidiscovery`，创建专用角色，设置最小权限
- 1.3.1.3 `[ATOMIC]` 🔴 安装 PostgreSQL 扩展：`pg_trgm`（模糊文本索引）、`uuid-ossp`（UUID生成）、`btree_gin`（复合索引）
- 1.3.1.4 `[ATOMIC]` 🟡 配置 `pg_hba.conf`：限制只允许本机和 Docker 内网连接
- 1.3.1.5 `[ATOMIC]` 🟡 配置 WAL 归档和基础备份策略（每日 `pg_dump` 到本地 + 远端）
- 1.3.1.6 `[ATOMIC]` 🟢 配置 `pg_stat_statements` 扩展，监控慢查询

#### 1.3.2 Redis 配置
- 1.3.2.1 `[ATOMIC]` 🔴 部署 Redis 7，配置 `redis.conf`：`maxmemory`（设定上限）、`maxmemory-policy allkeys-lru`
- 1.3.2.2 `[ATOMIC]` 🔴 配置 Redis 持久化：AOF + RDB 双模式，`appendfsync everysec`
- 1.3.2.3 `[ATOMIC]` 🟡 配置 Redis 密码认证，与 Celery/APScheduler 对接
- 1.3.2.4 `[ATOMIC]` 🟢 规划 Redis Database 分区：DB0=任务队列，DB1=缓存，DB2=锁，DB3=会话

### 1.4 调度与队列系统

#### 1.4.1 Celery Worker 配置
- 1.4.1.1 `[ATOMIC]` 🔴 初始化 Celery app，配置 broker（Redis）、backend（Redis），验证 worker 启动 `[BLOCKER→1.4.1.2]`
- 1.4.1.2 `[ATOMIC]` 🔴 定义队列分层：`critical`（验证任务）、`high`（采集任务）、`default`（处理任务）、`low`（报告任务）
- 1.4.1.3 `[ATOMIC]` 🔴 配置 worker 并发（`--concurrency`）与 prefetch（`--prefetch-multiplier=1` 用于 I/O 密集）
- 1.4.1.4 `[ATOMIC]` 🟡 配置 Celery beat 调度器，定义每日/每小时任务时刻
- 1.4.1.5 `[ATOMIC]` 🟡 配置任务重试策略：`autoretry_for`、`max_retries`、`retry_backoff=True`、`retry_jitter=True`
- 1.4.1.6 `[ATOMIC]` 🟡 配置任务超时：`soft_time_limit` 和 `time_limit` 分别设定
- 1.4.1.7 `[ATOMIC]` 🟢 配置 Celery Flower 监控界面

#### 1.4.2 systemd 服务单元
- 1.4.2.1 `[ATOMIC]` 🟡 编写 `aidiscovery-worker.service` systemd 单元，配置 `Restart=always`、`RestartSec=10`
- 1.4.2.2 `[ATOMIC]` 🟡 编写 `aidiscovery-beat.service` systemd 单元
- 1.4.2.3 `[ATOMIC]` 🟡 编写 `aidiscovery-api.service` systemd 单元
- 1.4.2.4 `[ATOMIC]` 🟢 配置 systemd timer 作为 Celery beat 的备用调度方案

### 1.5 监控与可观测性

#### 1.5.1 指标采集
- 1.5.1.1 `[ATOMIC]` 🟡 部署 Prometheus，配置 scrape interval 60s，设定 15d 数据保留
- 1.5.1.2 `[ATOMIC]` 🟡 在主应用中埋入 `prometheus-client`：暴露 `/metrics` 端点
- 1.5.1.3 `[ATOMIC]` 🟡 定义关键指标：`discovery_runs_total`、`candidates_created_total`、`providers_verified_total`、`source_fetch_duration_seconds`、`source_fetch_errors_total`
- 1.5.1.4 `[ATOMIC]` 🟡 部署 Grafana，导入 Celery、PostgreSQL、Redis 预制 Dashboard
- 1.5.1.5 `[ATOMIC]` 🟢 配置 Grafana Alert：任务失败率超阈值时发送告警（Webhook / Email）

#### 1.5.2 日志系统
- 1.5.2.1 `[ATOMIC]` 🟡 配置 `loguru` 结构化 JSON 日志输出，字段包含：`timestamp`、`level`、`module`、`task_id`、`source_id`、`entity_id`、`duration_ms`
- 1.5.2.2 `[ATOMIC]` 🟡 配置日志轮转：`rotation="100 MB"`、`retention="30 days"`、`compression="gz"`
- 1.5.2.3 `[ATOMIC]` 🟢 部署 Loki + Grafana 实现日志聚合查询
- 1.5.2.4 `[ATOMIC]` 🟢 建立日志告警规则：ERROR 日志聚合超阈值时触发通知

---

# 第二部分：数据模型设计

## 2. 核心数据库 Schema 设计

### 2.1 实体层（Entity Layer）

#### 2.1.1 模型相关实体
- 2.1.1.1 `[ATOMIC]` 🔴 设计表 `models`：字段包含 `model_id(uuid)`、`canonical_model_id`、`canonical_name`、`display_name`、`maker`、`family`、`version`、`status`、`license`、`open_weight(bool)`、`context_window`、`max_output_tokens`、`release_date`、`announcement_date`、`discovered_at`、`verified_at`、`created_at`、`updated_at` `[BLOCKER→2.1.1.2]`
- 2.1.1.2 `[ATOMIC]` 🔴 设计表 `model_aliases`：`alias_id`、`model_id(FK)`、`alias`、`alias_type(enum: id/name/internal/deprecated)`、`source_id`、`effective_at`、`expires_at`
- 2.1.1.3 `[ATOMIC]` 🔴 设计表 `model_versions`：`version_id`、`model_id(FK)`、`version_tag`、`is_latest(bool)`、`is_snapshot(bool)`、`alias_resolves_to`、`announced_at`、`deprecated_at`
- 2.1.1.4 `[ATOMIC]` 🔴 设计表 `model_capabilities`：`capability_id`、`model_id(FK)`、`capability_type(enum)`、`supported(bool/partial/unknown)`、`notes`、`source_id`、`verified_at`
  - capability_type 枚举：`VISION`、`AUDIO`、`VIDEO`、`FILE`、`TOOL_CALLING`、`STRUCTURED_OUTPUT`、`JSON_MODE`、`STREAMING`、`REASONING`、`COMPUTER_USE`、`WEB_SEARCH`、`CODE_EXECUTION`、`MCP`
- 2.1.1.5 `[ATOMIC]` 🟡 设计表 `model_families`：`family_id`、`maker_id(FK)`、`family_name`、`description`、`discovered_at`
- 2.1.1.6 `[ATOMIC]` 🟡 为 `models` 表建立索引：`canonical_model_id(UNIQUE)`、`maker`、`status`、`discovered_at`；建立 `pg_trgm` 索引用于模糊名称搜索

#### 2.1.2 提供商相关实体
- 2.1.2.1 `[ATOMIC]` 🔴 设计枚举类型 `entity_type`：`MODEL_LAB`、`OFFICIAL_API`、`CLOUD_MAAS`、`INFERENCE_PROVIDER`、`MODEL_HOSTING_PROVIDER`、`GATEWAY`、`AGGREGATOR`、`ROUTER`、`RELAY`、`RESELLER`、`BENCHMARK`、`MODEL_REGISTRY`、`DATA_INDEX`、`CODING_TOOL`、`IDE`、`CLI`、`AGENT`、`PROTOCOL`、`SDK` `[BLOCKER→2.1.2.2]`
- 2.1.2.2 `[ATOMIC]` 🔴 设计表 `providers`：`provider_id(uuid)`、`canonical_name`、`display_name`、`legal_name`、`entity_type(enum)`、`entity_type_disputed(bool)`、`domain`、`api_base_url`、`github_org`、`brand_aliases(array)`、`status`、`region`、`discovered_at`、`verified_at`、`last_observed_at`
- 2.1.2.3 `[ATOMIC]` 🔴 设计表 `provider_aliases`：用于实体归一化，字段同 `model_aliases` 结构
- 2.1.2.4 `[ATOMIC]` 🔴 设计表 `provider_relationships`：`rel_id`、`parent_id(FK→providers)`、`child_id(FK→providers)`、`rel_type(enum: UPSTREAM/DOWNSTREAM/RESELLER/PARTNER)`、`evidence_id`

#### 2.1.3 Access Route 实体
- 2.1.3.1 `[ATOMIC]` 🔴 设计表 `access_routes`：`route_id(uuid)`、`model_id(FK)`、`provider_id(FK)`、`gateway_id(FK，可NULL)`、`base_url`、`endpoint_path`、`region`、`status`、`data_policy`、`discovered_at`、`verified_at`、`last_observed_at` `[BLOCKER→2.1.3.2]`
- 2.1.3.2 `[ATOMIC]` 🔴 设计表 `route_protocols`：`route_id(FK)`、`protocol(enum)`、`supported(bool/partial/unknown)`、`notes`、`verified_at`
  - protocol 枚举：`OPENAI_CHAT_COMPLETIONS`、`OPENAI_RESPONSES`、`ANTHROPIC_MESSAGES`、`STREAMING`、`TOOL_CALLING`、`STRUCTURED_OUTPUT`、`JSON_MODE`、`VISION`、`AUDIO`、`FILE`、`REASONING`、`MCP`
- 2.1.3.3 `[ATOMIC]` 🔴 设计表 `route_tool_compatibility`：`route_id(FK)`、`tool_id(FK)`、`compatible(bool/partial/unknown)`、`notes`、`source_type(enum: OFFICIAL/TESTED/INFERRED)`、`verified_at`
- 2.1.3.4 `[ATOMIC]` 🟡 为 `access_routes` 建立复合索引：`(model_id, provider_id)`、`(provider_id, status)`

#### 2.1.4 Coding Tool / Plan 实体
- 2.1.4.1 `[ATOMIC]` 🔴 设计表 `coding_tools`：`tool_id`、`canonical_name`、`display_name`、`provider_id(FK)`、`tool_type(enum: CODING_TOOL/IDE/CLI/AGENT)`、`protocol_requirements(jsonb)`、`discovered_at`
- 2.1.4.2 `[ATOMIC]` 🔴 设计表 `plans`：`plan_id`、`provider_id(FK)`、`plan_name`、`plan_type(enum: CODING/SUBSCRIPTION/TOKEN/CREDIT/HYBRID)`、`billing_cycle(enum)`、`monthly_price`、`yearly_price`、`currency`、`effective_at`、`expires_at`、`discovered_at`、`verified_at`
- 2.1.4.3 `[ATOMIC]` 🔴 设计表 `plan_limits`：`limit_id`、`plan_id(FK)`、`limit_type(enum: TOKEN/CREDIT/REQUEST/MESSAGE/COMPUTE/SESSION/TIME_WINDOW)`、`limit_value`、`time_window(enum: FIVE_HOUR_ROLLING/DAILY/WEEKLY/MONTHLY/FIXED_PERIOD)`、`reset_rule`、`overage_allowed(bool)`、`overage_price`、`concurrency`
- 2.1.4.4 `[ATOMIC]` 🟡 设计表 `plan_included_models`：`plan_id(FK)`、`model_id(FK)`、`model_multiplier`、`notes`

### 2.2 价格层（Pricing Layer）

#### 2.2.1 价格核心表
- 2.2.1.1 `[ATOMIC]` 🔴 设计表 `prices`：`price_id`、`route_id(FK)`、`price_type(enum: INPUT/OUTPUT/CACHE_READ/CACHE_WRITE/IMAGE/AUDIO/VIDEO/BATCH/PRIORITY/FLEX/SEARCH/TOOL/STORAGE/RUNTIME)`、`currency`、`unit(enum: PER_1M_TOKENS/PER_1K_TOKENS/PER_IMAGE/PER_SECOND/PER_REQUEST/PER_MONTH)`、`billing_model`、`region`、`tier_type(enum: FLAT/TIERED/CONTEXT_DEPENDENT)`、`source_type(enum: OFFICIAL/AGGREGATOR/OBSERVED)`、`source_id`、`effective_at`、`expires_at`、`fetched_at`、`verified_at` `[BLOCKER→2.2.1.2]`
- 2.2.1.2 `[ATOMIC]` 🔴 设计表 `price_tiers`：`tier_id`、`price_id(FK)`、`tier_start`、`tier_end`、`unit_price`、`condition_notes`（记录上下文 token 数条件等）
- 2.2.1.3 `[ATOMIC]` 🔴 设计表 `price_history`：与 `prices` 字段完全对应，记录每次价格快照，额外字段：`snapshot_id`、`change_type(enum: NEW/UP/DOWN/REMOVED)`
- 2.2.1.4 `[ATOMIC]` 🟡 设计表 `price_promotions`：`promo_id`、`price_id(FK)`、`promo_description`、`discount_rate`、`promo_start`、`promo_end`、`region_restriction`

#### 2.2.2 缓存策略价格
- 2.2.2.1 `[ATOMIC]` 🔴 设计表 `cache_policies`：`cache_id`、`route_id(FK)`、`cache_type(enum: PROVIDER_PROMPT_CACHE/GATEWAY_RESPONSE_CACHE)`、`cache_supported(bool)`、`ttl_seconds`、`minimum_tokens`、`cache_key_strategy`、`sticky_routing(bool)`、`source_id`、`verified_at`
- 2.2.2.2 `[ATOMIC]` 🔴 设计表 `cache_observations`：`obs_id`、`route_id(FK)`、`observation_date`、`eligible_input_tokens`、`cached_input_tokens`、`cache_write_tokens`、`cache_hit_requests`、`cache_eligible_requests`、`token_cache_hit_rate`、`request_cache_hit_rate`、`observed_latency_ms`、`effective_cost`、`notes`

### 2.3 证据与来源层（Evidence Layer）

#### 2.3.1 数据来源
- 2.3.1.1 `[ATOMIC]` 🔴 设计表 `sources`：`source_id`、`source_type(enum: OFFICIAL_API/OFFICIAL_DOCS/OFFICIAL_PRICING/OFFICIAL_ANNOUNCEMENT/STRUCTURED_REGISTRY/INDEPENDENT_EVAL/COMMUNITY/SEARCH_INFERENCE)`、`source_url`、`source_title`、`domain`、`published_at`、`fetched_at`、`raw_content_hash`、`evidence_level(enum: S0~S6)` `[BLOCKER→2.3.1.2]`
- 2.3.1.2 `[ATOMIC]` 🔴 设计表 `evidence`：`evidence_id`、`entity_type`、`entity_id`、`field_name`、`raw_value`、`normalized_value`、`source_id(FK)`、`effective_at`、`verified_at`、`confidence(enum: HIGH/MEDIUM/LOW/UNKNOWN)`
- 2.3.1.3 `[ATOMIC]` 🟡 设计表 `source_conflicts`：`conflict_id`、`entity_type`、`entity_id`、`field_name`、`source_a_id`、`source_a_value`、`source_b_id`、`source_b_value`、`observed_difference`、`resolution_status`、`resolution_notes`

### 2.4 发现层（Discovery Layer）

#### 2.4.1 Candidate 与发现记录
- 2.4.1.1 `[ATOMIC]` 🔴 设计表 `candidates`：`candidate_id`、`candidate_type(enum: PROVIDER/GATEWAY/MODEL/PLAN/ROUTE)`、`name`、`domain`、`first_discovered_at`、`discovery_source_ids(array)`、`evidence(jsonb)`、`status(enum: NEW/VERIFYING/VERIFIED/REJECTED/MERGED)`、`merged_into_id`、`rejection_reason` `[BLOCKER→2.4.1.2]`
- 2.4.1.2 `[ATOMIC]` 🔴 设计表 `discovery_runs`：`run_id`、`run_type`、`started_at`、`completed_at`、`status`、`sources_attempted`、`sources_succeeded`、`candidates_created`、`entities_updated`、`errors(jsonb)`
- 2.4.1.3 `[ATOMIC]` 🟡 设计表 `discovery_patterns`：`pattern_id`、`pattern_type(enum: SEARCH_KEYWORD/DOMAIN/GITHUB_QUERY/RSS_URL/API_ENDPOINT)`、`pattern_value`、`language`、`priority`、`last_used_at`、`success_rate`、`origin_entity_id`（发现该 pattern 的来源实体）

### 2.5 快照与变化层（Snapshot & Change Layer）

#### 2.5.1 每日快照
- 2.5.1.1 `[ATOMIC]` 🔴 设计表 `snapshots`：`snapshot_id`、`snapshot_date`、`entity_type`、`entity_id`、`snapshot_data(jsonb)`、`created_at`
- 2.5.1.2 `[ATOMIC]` 🔴 设计表 `change_events`：`event_id`、`event_type(enum: NEW_MODEL/MODEL_UPDATED/MODEL_REMOVED/NEW_PROVIDER/PROVIDER_UPDATED/PRICE_UP/PRICE_DOWN/CACHE_POLICY_CHANGED/PLAN_ADDED/PLAN_CHANGED/PROTOCOL_SUPPORT_ADDED/TOOL_SUPPORT_ADDED/RATE_LIMIT_CHANGED/STATUS_CHANGED/...)`、`entity_type`、`entity_id`、`occurred_at`、`detected_at`、`old_value(jsonb)`、`new_value(jsonb)`、`evidence_ids(array)`、`significance(enum: HIGH/MEDIUM/LOW)`

### 2.6 质量与性能层（Quality & Reliability Layer）

#### 2.6.1 Benchmark 与质量记录
- 2.6.1.1 `[ATOMIC]` 🟡 设计表 `benchmarks`：`bench_id`、`benchmark_name`、`benchmark_url`、`task_type(enum: CODING/REASONING/MATH/KNOWLEDGE/CHINESE/ENGLISH/LONG_CONTEXT/VISION/TOOL_USE/STRUCTURED_OUTPUT/WRITING/MULTIMODAL/AGENT)`、`description`
- 2.6.1.2 `[ATOMIC]` 🟡 设计表 `model_benchmark_results`：`result_id`、`model_id(FK)`、`bench_id(FK)`、`score`、`score_type(enum: OFFICIAL_CLAIM/BENCHMARK_RESULT/INDEPENDENT_EVALUATION/OBSERVED_EVALUATION)`、`source_id`、`published_at`、`fetched_at`
- 2.6.1.3 `[ATOMIC]` 🟡 设计表 `reliability_observations`：`obs_id`、`route_id(FK)`、`observed_at`、`latency_ms`、`ttft_ms`、`tokens_per_second`、`error_rate`、`rate_429_rate`、`rate_5xx_rate`、`timeout_rate`、`availability`、`observed_rpm`、`observed_tpm`

### 2.7 数据库迁移与维护

- 2.7.1 `[ATOMIC]` 🔴 初始化 Alembic 迁移框架，配置 `alembic.ini` 和 `env.py` `[DEPENDS→2.1.1.1]`
- 2.7.2 `[ATOMIC]` 🔴 编写初始迁移脚本，包含所有上述表的 DDL
- 2.7.3 `[ATOMIC]` 🔴 执行首次迁移，验证所有表和索引创建成功
- 2.7.4 `[ATOMIC]` 🟡 编写数据库 Schema 版本自动检查任务，启动时校验 migration 状态
- 2.7.5 `[ATOMIC]` 🟢 配置 `pg_partman` 对 `snapshots`、`change_events`、`price_history` 等大表按月分区

---

# 第三部分：Discovery 引擎

## 3. Discovery Source Registry

### 3.1 结构化注册中心适配器（Structured Registry Adapters）

#### 3.1.1 OpenRouter 适配器
- 3.1.1.1 `[ATOMIC]` 🔴 实现 `OpenRouterAdapter.fetch_models()`：调用 `https://openrouter.ai/api/v1/models`，解析全量模型列表 `[BLOCKER→3.1.1.2]`
- 3.1.1.2 `[ATOMIC]` 🔴 实现字段映射：将 OpenRouter 响应字段 → `models` 表标准字段（含 `context_length`、`pricing`、`top_provider`）
- 3.1.1.3 `[ATOMIC]` 🔴 实现 Provider 提取：从 `models[].top_provider` 中提取 Provider 候选实体
- 3.1.1.4 `[ATOMIC]` 🟡 实现增量检测：与上次快照对比，仅处理新增/变更条目
- 3.1.1.5 `[ATOMIC]` 🟡 实现错误处理：超时重试（exponential backoff）、429 处理、Schema 变更检测

#### 3.1.2 Hugging Face Hub 适配器
- 3.1.2.1 `[ATOMIC]` 🔴 实现 `HuggingFaceAdapter.fetch_models()`：调用 HF API，参数 `task=text-generation`，分页获取全量
- 3.1.2.2 `[ATOMIC]` 🔴 实现字段映射：`modelId`、`author`、`tags`、`downloads`、`createdAt`、`lastModified`
- 3.1.2.3 `[ATOMIC]` 🟡 实现 Inference Provider 提取：从 `inference_providers` 字段提取
- 3.1.2.4 `[ATOMIC]` 🟡 实现 `HuggingFaceAdapter.fetch_provider_endpoints()`：拉取 Inference Endpoints 列表

#### 3.1.3 Artificial Analysis 适配器
- 3.1.3.1 `[ATOMIC]` 🟡 实现 `ArtificialAnalysisAdapter`：抓取模型质量/性能对比数据
- 3.1.3.2 `[ATOMIC]` 🟡 实现字段映射：映射到 `model_benchmark_results` 和 `reliability_observations`
- 3.1.3.3 `[ATOMIC]` 🟡 实现 Provider 发现：从其 Provider 列表中提取未知 Provider 候选

#### 3.1.4 Models.dev 适配器
- 3.1.4.1 `[ATOMIC]` 🟡 实现 `ModelsDevAdapter.fetch_models()`：解析其 API 或结构化数据
- 3.1.4.2 `[ATOMIC]` 🟡 实现 Provider 候选提取

#### 3.1.5 LiteLLM 模型列表适配器
- 3.1.5.1 `[ATOMIC]` 🟡 实现 `LiteLLMAdapter`：从 LiteLLM GitHub 或官方文档抓取 Provider / Model 映射表
- 3.1.5.2 `[ATOMIC]` 🟡 提取 base_url 模式和 model_id 格式，用于 Technical Fingerprinting

#### 3.1.6 Replicate / ModelScope 适配器
- 3.1.6.1 `[ATOMIC]` 🟢 实现 `ReplicateAdapter`：抓取 Replicate 模型目录和定价
- 3.1.6.2 `[ATOMIC]` 🟢 实现 `ModelScopeAdapter`：抓取 ModelScope 模型目录

### 3.2 官方来源适配器（Official Source Adapters）

#### 3.2.1 官方 API 端点采集
- 3.2.1.1 `[ATOMIC]` 🔴 实现 `OfficialApiAdapter.fetch_model_list(base_url)`：探测 `/v1/models`、`/v2/models`、`/models`，解析标准格式 `[BLOCKER→3.2.1.2]`
- 3.2.1.2 `[ATOMIC]` 🔴 实现响应格式自动识别：区分 OpenAI 格式（`data[]`）、Anthropic 格式、自定义格式
- 3.2.1.3 `[ATOMIC]` 🔴 实现认证方式自动探测：`Bearer`、`x-api-key`、`api-key`、无认证
- 3.2.1.4 `[ATOMIC]` 🟡 实现 API 状态码处理：200（成功）、401（需要认证，标记 `REQUIRES_ACCOUNT`）、403（访问限制）、404（端点不存在）、429（速率限制）

#### 3.2.2 官方文档页面采集
- 3.2.2.1 `[ATOMIC]` 🔴 实现 `OfficialDocsAdapter`：探测常见文档路径：`/docs`、`/docs/api`、`/api`、`/reference`
- 3.2.2.2 `[ATOMIC]` 🔴 实现价格页面采集：探测 `/pricing`、`/plans`、`/billing`，提取价格数据
- 3.2.2.3 `[ATOMIC]` 🔴 实现 Changelog/Release 采集：探测 `/changelog`、`/releases`、`/blog`、`/news`
- 3.2.2.4 `[ATOMIC]` 🟡 实现价格数据结构化提取：从 HTML 表格/JSON 中解析 Input/Output/Cache 价格
- 3.2.2.5 `[ATOMIC]` 🟡 实现 Plan 数据结构化提取：识别套餐卡片，提取价格、额度、限制字段

### 3.3 搜索发现适配器（Search Discovery Adapters）

#### 3.3.1 搜索引擎 Discovery
- 3.3.1.1 `[ATOMIC]` 🔴 实现 `SearchDiscoveryEngine`：配置多个搜索 API 接入（SerpAPI / Brave Search API / Bing Search API） `[BLOCKER→3.3.1.2]`
- 3.3.1.2 `[ATOMIC]` 🔴 实现英文搜索关键词矩阵执行，关键词包含但不限于：
  - `"OpenAI compatible API"`、`"Anthropic compatible API"`、`"LLM inference API"`、`"AI inference provider"`
  - `"LLM gateway"`、`"AI gateway"`、`"model router"`、`"API relay"`、`"AI API aggregator"`
  - `"coding plan"`、`"token plan"`、`"AI API pricing"`、`"prompt caching API"`
  - `"cache read price"`、`"cache write price"`、`"OpenAI Responses API"`
- 3.3.1.3 `[ATOMIC]` 🔴 实现中文搜索关键词矩阵执行：`"大模型API"`、`"LLM推理服务"`、`"AI接口代理"`、`"大模型中转"`、`"AI编程套餐"`、`"AI API聚合"`、`"OpenAI兼容"`、`"Claude接口"`
- 3.3.1.4 `[ATOMIC]` 🔴 实现搜索结果 URL 提取与去重，创建 Candidate 记录
- 3.3.1.5 `[ATOMIC]` 🟡 实现搜索 Pattern 轮换：每日使用不同关键词组合，避免过度依赖固定词
- 3.3.1.6 `[ATOMIC]` 🟡 实现搜索结果质量过滤：排除新闻聚合、论坛噪音、已知不相关域名

#### 3.3.2 搜索 Pattern 管理
- 3.3.2.1 `[ATOMIC]` 🟡 实现 Pattern 优先级调度：基于历史成功率动态排序
- 3.3.2.2 `[ATOMIC]` 🟡 实现 Pattern 效果记录：每个 pattern 执行后记录发现候选数、验证通过数
- 3.3.2.3 `[ATOMIC]` 🟡 实现 Pattern 自动扩展：从已发现实体反向提取新 pattern（见第 43 节）

### 3.4 GitHub Discovery 适配器

#### 3.4.1 GitHub Search API
- 3.4.1.1 `[ATOMIC]` 🔴 实现 `GitHubDiscoveryAdapter`：配置 GitHub API Token，处理速率限制（`X-RateLimit-*` Header） `[BLOCKER→3.4.1.2]`
- 3.4.1.2 `[ATOMIC]` 🔴 实现 Repository Search：查询关键词矩阵，包含：`OpenAI compatible`、`Anthropic compatible`、`LLM gateway`、`AI gateway`、`API relay`、`OpenAI proxy`、`Anthropic proxy`、`model router`、`LLM provider`、`AI API`、`coding plan`
- 3.4.1.3 `[ATOMIC]` 🔴 实现 Repository 分析：提取 `README.md`、`homepage`、`description`、`topics`、`language`、`stars`、`last_push`
- 3.4.1.4 `[ATOMIC]` 🟡 实现 GitHub Release 监测：对已知 Provider 的 GitHub Org 监听新 Release
- 3.4.1.5 `[ATOMIC]` 🟡 实现 OpenAPI / Swagger 文件发现：在 repo 中搜索 `openapi.yaml`、`swagger.json`

#### 3.4.2 GitHub 内容分析
- 3.4.2.1 `[ATOMIC]` 🟡 实现 README 解析：提取 API base URL、model 列表、pricing 信息
- 3.4.2.2 `[ATOMIC]` 🟡 实现 `package.json`/`requirements.txt` 分析：识别使用的 API SDK，推断兼容协议
- 3.4.2.3 `[ATOMIC]` 🟢 实现 GitHub 活跃度评分：基于 stars、forks、last_commit、open_issues 计算项目健康度

### 3.5 News / RSS / Launch Discovery 适配器

#### 3.5.1 RSS 订阅采集
- 3.5.1.1 `[ATOMIC]` 🟡 实现 `RSSFeedAdapter`：使用 `feedparser` 订阅已知信息源 RSS
- 3.5.1.2 `[ATOMIC]` 🟡 初始化 RSS 订阅列表（动态扩展，非固定）：各主要 AI 厂商官方 Blog RSS、Hacker News RSS、Product Hunt RSS、AI 行业媒体 RSS
- 3.5.1.3 `[ATOMIC]` 🟡 实现 RSS 内容分析：提取新模型发布、新 Provider、价格变化、新功能相关条目
- 3.5.1.4 `[ATOMIC]` 🟢 实现 Product Hunt 抓取：发现 AI 相关新产品 Launch

---

## 4. Candidate 机制与实体解析

### 4.1 Candidate 生命周期管理

#### 4.1.1 Candidate 创建
- 4.1.1.1 `[ATOMIC]` 🔴 实现 `CandidateFactory.create()`：统一入口，防止重复创建（按 domain 去重） `[BLOCKER→4.1.1.2]`
- 4.1.1.2 `[ATOMIC]` 🔴 实现 Candidate 初始化校验：至少要求 domain 或 api_url 之一存在
- 4.1.1.3 `[ATOMIC]` 🔴 实现 Candidate 优先级评分：基于 discovery_source 质量、evidence 数量、域名特征打初始分
- 4.1.1.4 `[ATOMIC]` 🟡 实现 Candidate 队列推送：新 Candidate 自动推入验证队列

#### 4.1.2 实体解析（Entity Resolution）
- 4.1.2.1 `[ATOMIC]` 🔴 实现 `EntityResolver.resolve_provider(candidate)`：检查 canonical_name、domain、github_org、api_base 是否与现有实体重复 `[BLOCKER→4.1.2.2]`
- 4.1.2.2 `[ATOMIC]` 🔴 实现 fuzzy matching：使用 `pg_trgm` 对名称进行相似度比对（阈值 0.85）
- 4.1.2.3 `[ATOMIC]` 🔴 实现 domain 归一化：`openrouter.ai` 和 `openrouter` 和 `OpenRouter API` → 同一实体
- 4.1.2.4 `[ATOMIC]` 🟡 实现合并操作：Candidate 确认为已知实体时，执行 merge，更新 aliases
- 4.1.2.5 `[ATOMIC]` 🟡 实现冲突记录：无法确定归属时，保留双方记录，标记 `status=AMBIGUOUS`

### 4.2 Technical Fingerprinting

#### 4.2.1 API 端点探测
- 4.2.1.1 `[ATOMIC]` 🔴 实现 `TechFingerprinter.probe_endpoints(domain)`：依次探测标准端点路径列表，记录响应状态 `[BLOCKER→4.2.1.2]`
- 4.2.1.2 `[ATOMIC]` 🔴 实现 `/v1/models` 探测：解析响应，提取模型列表，识别响应格式
- 4.2.1.3 `[ATOMIC]` 🔴 实现 `/v1/chat/completions` 探测：发送最小测试请求，检测兼容性（需要真实 API Key 或沙箱账户）
- 4.2.1.4 `[ATOMIC]` 🔴 实现 `/v1/responses` 探测：验证 OpenAI Responses API 兼容性
- 4.2.1.5 `[ATOMIC]` 🔴 实现 `/v1/messages` 探测：验证 Anthropic Messages API 兼容性
- 4.2.1.6 `[ATOMIC]` 🟡 实现认证方式探测：逐一尝试 `Bearer`、`x-api-key`、`api-key` Header，记录支持方式
- 4.2.1.7 `[ATOMIC]` 🟡 实现能力探测：在 Chat Completions 请求中加入 `tools`、`response_format`、图片 URL，验证实际支持情况
- 4.2.1.8 `[ATOMIC]` 🟡 实现探测结果写入：`route_protocols` 和 `candidates.evidence`

#### 4.2.2 探测安全与道德约束
- 4.2.2.1 `[ATOMIC]` 🔴 实现探测频率限制：单域名每次探测间隔 ≥ 5s，单日探测次数限制
- 4.2.2.2 `[ATOMIC]` 🔴 实现 robots.txt 检查：探测前检查是否允许爬取
- 4.2.2.3 `[ATOMIC]` 🟡 实现 User-Agent 配置：使用合理的 User-Agent 标识

---

# 第四部分：数据采集与提取

## 5. 数据提取引擎

### 5.1 价格数据提取

#### 5.1.1 结构化价格提取
- 5.1.1.1 `[ATOMIC]` 🔴 实现 `PricingExtractor.extract_from_json(response)`：解析 JSON 格式价格数据，映射到 `prices` + `price_tiers` 表 `[BLOCKER→5.1.1.2]`
- 5.1.1.2 `[ATOMIC]` 🔴 实现价格字段归一化：统一单位为 per-1M-tokens，记录原始单位和换算过程
- 5.1.1.3 `[ATOMIC]` 🔴 实现价格类型识别：区分 Input/Output/Cache Read/Cache Write，不合并到单一字段
- 5.1.1.4 `[ATOMIC]` 🔴 实现阶梯价格提取：识别 `0-128K tokens: $X, 128K+: $Y` 格式，写入 `price_tiers`
- 5.1.1.5 `[ATOMIC]` 🟡 实现货币识别与汇率记录：标记货币，保留原始货币值，不做自动换算（避免汇率误差）

#### 5.1.2 HTML 价格页面提取
- 5.1.2.1 `[ATOMIC]` 🟡 实现 `HtmlPricingExtractor`：使用 `beautifulsoup4` 解析价格表格
- 5.1.2.2 `[ATOMIC]` 🟡 实现 HTML 表格结构识别：列头对齐模型名 × 价格类型矩阵
- 5.1.2.3 `[ATOMIC]` 🟡 实现 JavaScript 渲染页面处理：当静态 HTML 无法获取数据时，使用 Playwright
- 5.1.2.4 `[ATOMIC]` 🟡 实现提取置信度标记：HTML 提取结果标记 `source_type=AGGREGATOR` 或 `source_type=OFFICIAL_PRICING`

### 5.2 Plan 数据提取

#### 5.2.1 Coding Plan 结构化提取
- 5.2.1.1 `[ATOMIC]` 🔴 实现 `PlanExtractor`：从定价页面提取 Plan 卡片信息 `[BLOCKER→5.2.1.2]`
- 5.2.1.2 `[ATOMIC]` 🔴 实现时间窗口类型识别：严格区分 `5h rolling`、`daily`、`weekly`、`7-day`、`monthly`、`fixed_period`，禁止换算
- 5.2.1.3 `[ATOMIC]` 🔴 实现计量单位识别：区分 TOKEN/CREDIT/REQUEST/MESSAGE/COMPUTE/SESSION/HYBRID
- 5.2.1.4 `[ATOMIC]` 🟡 实现 Plan 与 API 价格分离存储：Plan 记入 `plans`/`plan_limits`，API 价格记入 `prices`
- 5.2.1.5 `[ATOMIC]` 🟡 实现估算有效成本计算（可选字段）：标注 `estimated_effective_cost`，注明这是估算值

### 5.3 Cache 数据提取

#### 5.3.1 Cache 策略提取
- 5.3.1.1 `[ATOMIC]` 🔴 实现 `CacheExtractor`：从文档中提取 Cache 支持、TTL、最小 token 数、策略
- 5.3.1.2 `[ATOMIC]` 🔴 实现 Cache 类型区分：Provider Prompt Cache vs Gateway Response Cache
- 5.3.1.3 `[ATOMIC]` 🔴 实现 Cache Hit Rate 严格处理：价格页只记录 cache_read_price，不推断 hit_rate
- 5.3.1.4 `[ATOMIC]` 🟡 实现 Cache Hit 实测任务：设计专用测试场景（相同 prompt 重复请求），记录响应头中的缓存标记

### 5.4 工具兼容性数据提取

#### 5.4.1 Tool Compatibility 采集
- 5.4.1.1 `[ATOMIC]` 🔴 实现 `ToolCompatibilityExtractor`：初始化工具监测列表（Claude Code、Codex、Cursor、OpenCode、Cline、Roo Code、Kimi CLI、Hermes、VS Code Copilot、LangChain、LlamaIndex、Vercel AI SDK、LiteLLM、OpenAI SDK、Anthropic SDK）
- 5.4.1.2 `[ATOMIC]` 🔴 实现官方文档兼容性提取：搜索 Provider 文档中关于各工具的集成说明
- 5.4.1.3 `[ATOMIC]` 🟡 实现工具官方文档反向采集：从各工具（Cursor、Cline等）的文档中提取支持的 Provider 列表
- 5.4.1.4 `[ATOMIC]` 🟡 实现兼容性证据等级标记：官方文档声明 vs 社区报告 vs 技术推断，不得混淆
- 5.4.1.5 `[ATOMIC]` 🟢 实现 GitHub issue 扫描：检索 `tool + provider + compatible/broken/working` 相关 issue

---

# 第五部分：数据处理与智能化

## 6. 数据规范化与标准化

### 6.1 模型 ID 归一化

#### 6.1.1 Canonical Model ID 生成
- 6.1.1.1 `[ATOMIC]` 🔴 设计 Canonical Model ID 命名规则：格式 `{maker}/{family}/{version}`（例：`anthropic/claude/claude-3-5-sonnet-20241022`）`[BLOCKER→6.1.1.2]`
- 6.1.1.2 `[ATOMIC]` 🔴 实现 `ModelNormalizer.resolve_canonical_id(raw_id, provider_id)`：对跨平台同一模型的不同 ID 进行归一
- 6.1.1.3 `[ATOMIC]` 🔴 实现 alias 管理：将 `claude-3-5-sonnet`、`claude-3-5-sonnet-latest`、`anthropic/claude-3.5-sonnet` 等变体映射到同一 canonical_model_id，写入 `model_aliases`
- 6.1.1.4 `[ATOMIC]` 🔴 实现 alias 解析追踪：记录 `alias_resolves_to`，定期重新验证（alias 所指版本可能变化）
- 6.1.1.5 `[ATOMIC]` 🟡 实现 alias 变化告警：当 `xxx-latest` 指向版本发生变化时，生成 `CHANGE_EVENT`

### 6.2 Provider 归一化

#### 6.2.1 实体类型分类
- 6.2.1.1 `[ATOMIC]` 🔴 实现 `EntityClassifier.classify(candidate)`：基于技术指纹、文档特征、结构特征自动分类 entity_type `[BLOCKER→6.2.1.2]`
- 6.2.1.2 `[ATOMIC]` 🔴 实现分类规则引擎：
  - 有 `/v1/models` + 无上游路由 → `INFERENCE_PROVIDER`
  - 有上游 Provider 路由特征 → `GATEWAY/AGGREGATOR`
  - 仅官方模型 + 无第三方 → `MODEL_LAB + OFFICIAL_API`
  - 云厂商 MaaS 特征 → `CLOUD_MAAS`
- 6.2.1.3 `[ATOMIC]` 🔴 实现 disputed 标记：无法自动确定时，设置 `entity_type_disputed=true`，记录双方证据
- 6.2.1.4 `[ATOMIC]` 🟡 实现人工审核队列：disputed 实体推入人工审核队列，等待确认

### 6.3 价格规范化

- 6.3.1 `[ATOMIC]` 🔴 实现单位统一转换规则：将 per-1K-tokens 换算为 per-1M-tokens（保留原始值）
- 6.3.2 `[ATOMIC]` 🔴 实现来源类型标记：官方价格 vs 第三方聚合价格分别保存，不合并
- 6.3.3 `[ATOMIC]` 🟡 实现价格有效期追踪：记录 `effective_at` 和 `expires_at`，过期价格归档

### 6.4 时间字段规范化

- 6.4.1 `[ATOMIC]` 🔴 实现时间字段严格区分存储：`released_at`、`announced_at`、`published_at`、`listed_at`、`available_at`、`discovered_at`、`verified_at` 绝不混用
- 6.4.2 `[ATOMIC]` 🔴 实现时间来源标记：每个时间字段记录对应的 `source_id`，禁止用系统发现时间替代官方发布时间
- 6.4.3 `[ATOMIC]` 🟡 实现时区处理：所有时间统一存储 UTC，展示时转换

## 7. 快照与变化检测

### 7.1 每日快照机制

#### 7.1.1 快照生成
- 7.1.1.1 `[ATOMIC]` 🔴 实现 `SnapshotManager.take_snapshot(entity_type, entity_id)`：序列化实体当前状态为 JSONB，写入 `snapshots` `[BLOCKER→7.1.1.2]`
- 7.1.1.2 `[ATOMIC]` 🔴 实现全量快照任务：每日 UTC 02:00 对所有 VERIFIED 实体执行快照
- 7.1.1.3 `[ATOMIC]` 🔴 实现快照去重：若实体无变化，不创建冗余快照（基于内容 hash）
- 7.1.1.4 `[ATOMIC]` 🟡 实现快照压缩归档：7天以上快照自动压缩，30天以上仅保留每周一快照

#### 7.1.2 Diff 检测
- 7.1.2.1 `[ATOMIC]` 🔴 实现 `DiffEngine.compare(snapshot_t1, snapshot_t2)`：逐字段对比，生成变化集合 `[BLOCKER→7.1.2.2]`
- 7.1.2.2 `[ATOMIC]` 🔴 实现变化类型自动分类：价格变化 → `PRICE_UP/PRICE_DOWN`，新字段 → 对应 event_type
- 7.1.2.3 `[ATOMIC]` 🔴 实现 `ChangeEvent` 生成：将每个有意义的 diff 写入 `change_events`
- 7.1.2.4 `[ATOMIC]` 🟡 实现变化显著性评估：基于变化幅度和影响面设置 significance 级别
- 7.1.2.5 `[ATOMIC]` 🟡 实现变化去噪：过滤无意义的格式变化、空白变化、大小写变化

### 7.2 Schema 变化检测

- 7.2.1 `[ATOMIC]` 🔴 实现 `SchemaChangeDetector`：每次 API 响应后，与已知 Schema 对比，检测字段增删和类型变化
- 7.2.2 `[ATOMIC]` 🔴 实现 Schema 变化告警：发现 Schema 变化时记录告警，防止采集器静默失效
- 7.2.3 `[ATOMIC]` 🟡 实现 Schema 版本管理：记录每个 Source 的 Schema 版本历史

## 8. 证据验证与冲突解决

### 8.1 证据链管理

- 8.1.1 `[ATOMIC]` 🔴 实现 `EvidenceManager.attach(entity_id, field, value, source)`：所有数据写入时同步写入证据链
- 8.1.2 `[ATOMIC]` 🔴 实现证据等级评估：根据 source_type 自动分配 S0-S6 等级
- 8.1.3 `[ATOMIC]` 🔴 实现 `UNKNOWN/NOT_CONFIRMED/NOT_FOUND` 强制标记：缺失数据不得猜测，统一标记
- 8.1.4 `[ATOMIC]` 🟡 实现证据过期检测：超过 TTL 的证据标记为需要重新验证

### 8.2 冲突解决

- 8.2.1 `[ATOMIC]` 🔴 实现 `ConflictResolver`：当同一字段来自不同源有冲突时，写入 `source_conflicts`
- 8.2.2 `[ATOMIC]` 🔴 实现优先级规则引擎：按 S0>S1>S2>S3>S4>S5>S6 决定写入哪个值为主值，保留所有原始值
- 8.2.3 `[ATOMIC]` 🟡 实现冲突告警：高 significance 冲突推送告警
- 8.2.4 `[ATOMIC]` 🟢 实现冲突自动解决建议：对于价格冲突，建议检查 effective_at 最新的来源

---

# 第六部分：情报生成

## 9. 每日情报报告生成

### 9.1 情报数据聚合

#### 9.1.1 变化汇总
- 9.1.1.1 `[ATOMIC]` 🔴 实现 `IntelligenceAggregator.collect_daily_changes(date)`：查询 `change_events` 按 event_type 分类汇总 `[BLOCKER→9.1.1.2]`
- 9.1.1.2 `[ATOMIC]` 🔴 实现新模型报告段生成：字段包含模型名、厂商、首次发现时间、官方发布时间、主要能力、上下文长度、开源/闭源
- 9.1.1.3 `[ATOMIC]` 🔴 实现新 Provider/Gateway 报告段：字段包含名称、类型、API URL、支持协议、模型数量、价格概况、工具支持
- 9.1.1.4 `[ATOMIC]` 🔴 实现价格变化报告段：展示 Model、Route、Old Price、New Price、变化幅度、生效日期、数据来源
- 9.1.1.5 `[ATOMIC]` 🔴 实现 Coding Plan 变化报告段：展示 Plan 名称、月费、5h/Daily/Weekly/Monthly 额度、Credits、包含模型、Reset 规则、超额规则
- 9.1.1.6 `[ATOMIC]` 🔴 实现 Cache 变化报告段：展示 Provider、Model、Cache 支持、TTL、读写价格、实测命中率（如有）
- 9.1.1.7 `[ATOMIC]` 🟡 实现工具兼容性变化报告段
- 9.1.1.8 `[ATOMIC]` 🟡 实现模型质量变化报告段：按任务维度分别展示

#### 9.1.2 覆盖度声明
- 9.1.2.1 `[ATOMIC]` 🔴 实现报告末尾覆盖度声明：明确列出本次已覆盖的发现源、搜索范围、时间窗口，以及未覆盖区域
- 9.1.2.2 `[ATOMIC]` 🔴 实现免责声明生成：所有数据附注 `as_of` 时间，区分 observed/official/estimated

### 9.2 报告输出格式

- 9.2.1 `[ATOMIC]` 🔴 实现 Markdown 格式输出：带层级标题和表格，适合阅读
- 9.2.2 `[ATOMIC]` 🔴 实现 JSON 格式输出：结构化，供 API 查询使用
- 9.2.3 `[ATOMIC]` 🟡 实现 JSONL 格式输出：每行一个 change_event，适合流式处理
- 9.2.4 `[ATOMIC]` 🟢 实现 HTML 格式输出：带样式，适合邮件发送

---

# 第七部分：查询 API

## 10. 情报查询接口

### 10.1 API 框架建设

- 10.1.1 `[ATOMIC]` 🔴 选型并初始化 FastAPI 框架，配置 CORS、认证、限流中间件 `[BLOCKER→10.1.2]`
- 10.1.2 `[ATOMIC]` 🔴 实现 API Key 认证：Bearer token，支持多 Key 管理
- 10.1.3 `[ATOMIC]` 🟡 实现请求限流：`slowapi` 或 Redis 计数器，防止接口滥用
- 10.1.4 `[ATOMIC]` 🟡 实现 OpenAPI 文档自动生成：`/docs` 和 `/redoc` 端点

### 10.2 核心查询端点

#### 10.2.1 模型发现查询
- 10.2.1.1 `[ATOMIC]` 🔴 实现 `GET /models`：支持按 maker/family/status/discovered_after/capability 过滤，分页
- 10.2.1.2 `[ATOMIC]` 🔴 实现 `GET /models/{model_id}`：返回完整模型信息，含所有 access_routes
- 10.2.1.3 `[ATOMIC]` 🔴 实现 `GET /models/new`：返回过去 N 小时/天新发现的模型
- 10.2.1.4 `[ATOMIC]` 🟡 实现 `GET /models/{model_id}/routes`：该模型所有可用接入路由，含价格/协议/工具兼容

#### 10.2.2 Provider 查询
- 10.2.2.1 `[ATOMIC]` 🔴 实现 `GET /providers`：按 entity_type/status/region 过滤
- 10.2.2.2 `[ATOMIC]` 🔴 实现 `GET /providers/{provider_id}`：完整 Provider 信息，含模型列表、价格、Plan
- 10.2.2.3 `[ATOMIC]` 🟡 实现 `GET /providers/{provider_id}/protocols`：协议兼容矩阵

#### 10.2.3 价格查询
- 10.2.3.1 `[ATOMIC]` 🔴 实现 `GET /prices`：按 model_id/price_type/currency 过滤，返回所有渠道价格对比
- 10.2.3.2 `[ATOMIC]` 🔴 实现 `GET /prices/compare?model_id=X`：同一模型跨渠道价格比较（结构化事实，不做主观排名）

#### 10.2.4 Plan 查询
- 10.2.4.1 `[ATOMIC]` 🔴 实现 `GET /plans`：按 provider/plan_type 过滤，返回完整额度规则
- 10.2.4.2 `[ATOMIC]` 🟡 实现 `GET /plans/compare`：多 Plan 对比，展示各时间窗口额度

#### 10.2.5 变化查询
- 10.2.5.1 `[ATOMIC]` 🔴 实现 `GET /changes`：按 date/event_type/entity_type 过滤 change_events
- 10.2.5.2 `[ATOMIC]` 🔴 实现 `GET /changes/daily/{date}`：指定日期的每日情报报告

#### 10.2.6 工具兼容查询
- 10.2.6.1 `[ATOMIC]` 🟡 实现 `GET /tools/{tool_name}/compatible-routes`：指定工具可用的所有接入路由

---

# 第八部分：Discovery Feedback Loop

## 11. 自动扩展机制

### 11.1 新实体反向 Pattern 提取

- 11.1.1 `[ATOMIC]` 🔴 实现 `PatternExtractor.extract_from_entity(provider)`：从新发现 Provider 中提取：新域名、GitHub Org、API 路径模式、行业关键词、合作伙伴、上游 Provider `[BLOCKER→11.1.2]`
- 11.1.2 `[ATOMIC]` 🔴 实现提取结果写入 `discovery_patterns`：设置 `origin_entity_id`，追踪 pattern 来源
- 11.1.3 `[ATOMIC]` 🔴 实现下一轮发现任务注入：新 pattern 自动加入下日搜索队列
- 11.1.4 `[ATOMIC]` 🟡 实现 Pattern 效果追踪：每个 pattern 的发现成功率定期回算，低效 pattern 降权

### 11.2 Source Adapter 自动创建

- 11.2.1 `[ATOMIC]` 🟡 实现 `AdapterBootstrapper.bootstrap(provider)`：对新验证 Provider，自动生成基础 Source Adapter 配置（base_url、endpoints、auth_type）
- 11.2.2 `[ATOMIC]` 🟡 实现 Adapter 配置持久化：写入数据库 `discovery_sources` 表，下次运行自动加载
- 11.2.3 `[ATOMIC]` 🟢 实现 Adapter 自动测试：新建 Adapter 后自动执行 smoke test，验证基础采集可用

### 11.3 Model Registry 自动扩展

- 11.3.1 `[ATOMIC]` 🟡 实现 `RegistryExpander`：当发现新 Provider 提供的模型中有未知模型时，自动触发该模型的完整发现流程
- 11.3.2 `[ATOMIC]` 🟡 实现跨 Provider 模型关联：同一模型在不同 Provider 下的不同 model_id 自动关联到 canonical_model_id

---

# 第九部分：容错与自愈

## 12. 故障隔离与自愈

### 12.1 Source 级故障隔离

- 12.1.1 `[ATOMIC]` 🔴 实现 `CircuitBreaker`：每个 Source Adapter 独立熔断，失败 N 次后暂停该 Source，不影响其他 Source `[BLOCKER→12.1.2]`
- 12.1.2 `[ATOMIC]` 🔴 实现 Source 状态管理：`ACTIVE`→`DEGRADED`→`SUSPENDED`→`RECOVERED`
- 12.1.3 `[ATOMIC]` 🔴 实现失败原因分类记录：`TIMEOUT`、`429`、`403`、`5XX`、`SCHEMA_CHANGED`、`AUTH_REQUIRED`、`CAPTCHA`、`PARSE_ERROR`
- 12.1.4 `[ATOMIC]` 🟡 实现指数退避重试：`tenacity` 配置 `wait_exponential(min=1, max=60)`、`stop_after_attempt(5)`
- 12.1.5 `[ATOMIC]` 🟡 实现 Source 自动恢复检测：每 1h 对 SUSPENDED Source 进行健康探测，恢复时自动重激活

### 12.2 任务级容错

- 12.2.1 `[ATOMIC]` 🔴 实现任务幂等性：所有 Celery 任务设计为幂等，重复执行不产生副作用
- 12.2.2 `[ATOMIC]` 🔴 实现 Dead Letter Queue：失败任务进入 DLQ，定期人工审查
- 12.2.3 `[ATOMIC]` 🟡 实现任务超时强制终止：`signal.alarm` 或 Celery `time_limit`，防止僵尸任务
- 12.2.4 `[ATOMIC]` 🟡 实现任务执行日志完整性检查：每次 discovery_run 结束后验证关键步骤是否全部完成

### 12.3 数据完整性保护

- 12.3.1 `[ATOMIC]` 🔴 实现数据库事务管理：所有写操作使用 SQLAlchemy 事务，失败自动回滚
- 12.3.2 `[ATOMIC]` 🔴 实现写入前验证：所有实体写入前通过 Pydantic 模型校验，拒绝不合法数据
- 12.3.3 `[ATOMIC]` 🟡 实现数据库每日健康检查：验证核心表记录数、索引状态、关键约束

---

# 第十部分：运维与测试

## 13. 测试体系

### 13.1 单元测试

- 13.1.1 `[ATOMIC]` 🔴 为 `EntityResolver` 编写单元测试：覆盖名称变体归一化、domain 匹配
- 13.1.2 `[ATOMIC]` 🔴 为 `PricingExtractor` 编写单元测试：覆盖阶梯价格、多货币、缺失字段
- 13.1.3 `[ATOMIC]` 🔴 为 `DiffEngine` 编写单元测试：覆盖各类 change_event 生成
- 13.1.4 `[ATOMIC]` 🔴 为 `ModelNormalizer` 编写单元测试：覆盖 alias 解析、canonical_id 生成
- 13.1.5 `[ATOMIC]` 🟡 配置 pytest + coverage，要求核心模块覆盖率 ≥ 80%

### 13.2 集成测试

- 13.2.1 `[ATOMIC]` 🟡 编写 Source Adapter 集成测试：使用真实 API（控制请求量），验证数据格式
- 13.2.2 `[ATOMIC]` 🟡 编写 Discovery Pipeline 端到端测试：模拟新 Provider 发现完整流程
- 13.2.3 `[ATOMIC]` 🟡 编写 Daily Report 生成集成测试：使用测试数据，验证输出格式完整性

### 13.3 回归测试

- 13.3.1 `[ATOMIC]` 🟡 建立已知 Provider 列表作为测试基准：每次系统更新后验证已知 Provider 数据不丢失
- 13.3.2 `[ATOMIC]` 🟢 实现自动化每日回归：将基准 Provider 数据与当日采集对比，监控意外数据丢失

## 14. 部署与发布

### 14.1 CI/CD

- 14.1.1 `[ATOMIC]` 🟡 配置 GitHub Actions（或 GitLab CI）：push 时自动运行 lint + test
- 14.1.2 `[ATOMIC]` 🟡 实现 Docker 镜像自动构建和推送
- 14.1.3 `[ATOMIC]` 🟢 实现蓝绿部署脚本：新版本先在 staging 验证，再切换生产

### 14.2 首次生产部署检查清单

- 14.2.1 `[ATOMIC]` 🔴 验证 PostgreSQL 连接、Alembic 迁移状态
- 14.2.2 `[ATOMIC]` 🔴 验证 Redis 连接和 Celery worker 启动
- 14.2.3 `[ATOMIC]` 🔴 执行首次全量 Discovery Run，验证至少发现 50+ 已知实体
- 14.2.4 `[ATOMIC]` 🔴 验证每日调度器（systemd timer 或 Celery beat）按时触发
- 14.2.5 `[ATOMIC]` 🔴 验证 Prometheus 指标正常上报，Grafana Dashboard 可显示数据
- 14.2.6 `[ATOMIC]` 🟡 验证 Structured Registry 全部适配器（OpenRouter、HuggingFace 等）正常采集
- 14.2.7 `[ATOMIC]` 🟡 验证每日报告生成，检查 Markdown 和 JSON 双格式输出
- 14.2.8 `[ATOMIC]` 🟢 压力测试：模拟 100 个 Candidate 并发验证，验证系统无崩溃

---

# 附录：任务优先级与依赖图

## 关键路径（Critical Path）

```
1.1.1.1 → 1.1.2.1 → 1.2.1.1 → 1.2.2.1
                ↓
         1.3.1.1 → 1.3.2.1 → 1.4.1.1
                ↓
         2.1.1.1 → 2.1.2.1 → 2.1.3.1 → 2.2.1.1 → 2.3.1.1 → 2.4.1.1
                ↓
         2.7.1 → 2.7.2 → 2.7.3
                ↓
         3.1.1.1 → 3.2.1.1 → 3.3.1.1 → 3.4.1.1
                ↓
         4.1.1.1 → 4.1.2.1 → 4.2.1.1
                ↓
         5.1.1.1 → 5.2.1.1 → 5.3.1.1 → 5.4.1.1
                ↓
         6.1.1.1 → 6.2.1.1 → 7.1.1.1 → 7.1.2.1
                ↓
         8.1.1 → 9.1.1.1 → 9.2.1 → 10.1.1 → 11.1.1 → 12.1.1
```

## 分阶段交付目标

| 阶段 | 目标里程碑 | 涉及章节 |
|------|-----------|---------|
| **Phase 0** | 基础设施就绪，数据库可访问，Celery 正常运行 | §1 |
| **Phase 1** | Schema 建立，Structured Registry 适配器正常采集已知数据 | §2, §3.1 |
| **Phase 2** | Search + GitHub Discovery 正常运行，Candidate 机制完整 | §3.2~3.5, §4 |
| **Phase 3** | 数据提取完整，价格/Plan/Cache 分域存储 | §5 |
| **Phase 4** | 每日快照 + Diff + Change Event 正常生成 | §6, §7 |
| **Phase 5** | 每日情报报告 + API 查询接口上线 | §9, §10 |
| **Phase 6** | Feedback Loop + 自动扩展 + 监控告警完整 | §11, §12 |
| **Phase 7** | 测试覆盖 ≥ 80%，CI/CD 完整，生产验证通过 | §13, §14 |

---

> **最终约束再确认：**
> 本大纲中所有 Discovery 任务的执行范围由系统在运行时通过搜索、GitHub、RSS 和 API 探测**动态确定**。
> 用户举例的任何平台名称**仅作为系统验证样本**，不构成采集上界，不构成白名单，不构成发现范围的边界。
> 任何缺失数据**强制标记** `NOT_FOUND / UNKNOWN / NOT_CONFIRMED`，禁止推断填充。