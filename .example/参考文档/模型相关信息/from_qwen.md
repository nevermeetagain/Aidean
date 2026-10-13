# AI 市场发现与情报引擎：工程化实施蓝图

## 角色确认

我是 **AI Model & Access Intelligence Researcher + Discovery System Architect + Data Verification Engineer**。

我完全接受并内化你提出的 47 条协议。此前将“用户举例平台”误当作“采集范围边界”是根本性的设计错误。以下方案彻底抛弃静态名单思维，将系统定义为具备**自主发现、技术验证、关系图谱、变化检测、情报生成**能力的长期无人值守引擎。

---

## A. 问题重构

### 表面需求
> “采集 OpenRouter、302.AI、硅基流动、阿里云等平台的价格、模型、Coding Plan、缓存命中率。”

### 真实需求
> **构建一台 AI 市场发现机器。**

这台机器的核心能力不是“采集已知”，而是：

1. **自动发现**：即使昨天完全不存在的新 Provider / Gateway / 中转 / 模型，只要它在互联网公开出现（官网、GitHub、搜索索引、新闻、API 文档），系统就有能力在 24 小时内将其捕获为 Candidate。
2. **技术验证**：不信任网页标题和搜索结果，通过 HTTP 探针、SDK 兼容性测试、OpenAPI 解析、实际调用验证其真实能力。
3. **关系图谱**：不存储扁平的“模型价格表”，而是构建 `Model × AccessRoute × Provider/Gateway × Protocol × Tool × Pricing × Plan × Cache × Reliability × Evidence` 的多维可用性图谱。
4. **变化检测**：每日输出不是“当前状态快照”，而是“今日市场发生了什么变化”的事件流。
5. **证据可追溯**：任何结论都必须能反向追溯到原始来源、抓取时间、证据等级。

### 核心范式转换

| 旧范式 | 新范式 |
|--------|--------|
| 维护 `providers.json` 白名单 | 维护 `discovery_patterns.yaml` 发现模式 |
| 每日定时拉取已知平台 | 每日主动搜索 + 探针 + 指纹识别未知实体 |
| 价格是一个字段 | 价格是带维度、阶梯、来源、时间、货币的结构化对象 |
| Coding Plan 换算成 Token Price | Coding Plan 是独立产品模型，禁止强行换算 |
| Cache Price = Cache Hit Rate | Cache Policy ≠ Cache Observation，无实测则标 `NOT_AVAILABLE` |
| “OpenAI Compatible” = 全兼容 | 必须拆分为 Chat / Responses / Streaming / Tool / Structured / Vision / MCP 等独立探针 |
| 搜索结果 = 事实 | 搜索结果 = Candidate，必须经过 Entity Resolution + Technical Fingerprint + Source Verification 才能升级 |
| 缺失数据靠 LLM 补齐 | 缺失数据必须标 `UNKNOWN` / `NOT_CONFIRMED` / `REQUIRES_ACCOUNT` |

---

## B. 完整架构

系统采用 **七层流水线架构**，每一层都有明确的输入、输出、失败处理和证据留存。

```text
┌─────────────────────────────────────────────────────────────┐
│                    SIGNAL INGESTION                         │
│  Search APIs / GitHub APIs / RSS / Registry APIs / DNS CT   │
└──────────────────────┬──────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    CANDIDATE TRIAGE                         │
│  Heuristic Filter → Entity Resolution → Deduplication       │
│  Output: CANDIDATE (status=UNVERIFIED)                      │
└──────────────────────┬──────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              ACTIVE PROBING & FINGERPRINTING                │
│  HTTP Probe / SDK Compat Test / OpenAPI Parse / Auth Detect │
│  Output: Technical Fingerprint + Protocol Matrix            │
└──────────────────────┬──────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────┐
│            EXTRACTION & NORMALIZATION                       │
│  LLM-Assisted (unstructured) + JSON Schema (structured)     │
│  Entity Resolution / Unit Normalization / Time Normalization│
│  Output: Normalized Entities + Evidence Chain               │
└──────────────────────┬──────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  KNOWLEDGE GRAPH                            │
│  PostgreSQL (Relational + JSONB) + Redis (Cache/Queue)      │
│  Model → AccessRoute → Provider/Gateway → Protocol/Tool     │
│  Pricing / Plan / Cache / Reliability / Evidence            │
└──────────────────────┬──────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                SNAPSHOT & DIFF ENGINE                       │
│  T-1 Snapshot vs T Snapshot → Field-Level Diff              │
│  Output: Change Events (NEW/UPDATED/REMOVED/PRICE_UP/...)   │
└──────────────────────┬──────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              INTELLIGENCE API & REPORTING                   │
│  Daily Market Intelligence / Query API / Alerting           │
└─────────────────────────────────────────────────────────────┘
```

### 苏格拉底式架构追问

**问题**：能否直接用 LLM 读取网页并生成结构化价格和协议数据？

**正向钢人**：LLM 对非结构化文本理解能力强，可以处理各种异构网页，开发效率高。

**反向钢人**：LLM 会产生幻觉。它可能把“Cache Write Price”误读为“Input Price”，把“每周额度”误算为“每天额度 × 7”，把网页标题里的“OpenAI Compatible”误判为“支持 OpenAI Responses API”。一旦核心计费数据出错，整个情报系统的可信度归零。

**幸存结论**：
- LLM **仅允许**用于非结构化文本的辅助提取（如从 Blog 中提取 Plan 名称、从 GitHub README 中提取 Tool 兼容性线索）。
- 所有**核心计费字段、协议兼容性、模型能力**必须通过以下至少一种方式验证：
  - 官方 JSON API 响应（S0）
  - 官方 OpenAPI / SDK 源码解析（S1）
  - 官方 Pricing / Plan 页面结构化解析（S2）
  - 实际 HTTP 探针调用（S0）
- 任何 LLM 提取结果如果无法与上述证据交叉验证，必须标记为 `evidence_level=S6` 且 `verification_status=UNVERIFIED`。

---

## C. 数据模型

### 核心实体关系图

```text
ENTITY (Provider / Gateway / Aggregator / Relay / ModelLab / CloudMaaS)
  ├── canonical_name
  ├── domains[]
  ├── github_org
  ├── legal_name
  ├── aliases[]
  ├── entity_type (PROVIDER / GATEWAY / AGGREGATOR / RELAY / RESELLER / MODEL_LAB / CLOUD_MAAS / INFERENCE_PROVIDER)
  └── status (ACTIVE / DEGRADED / OFFLINE / DISPUTED)

MODEL
  ├── canonical_model_id
  ├── family
  ├── maker_entity_id → ENTITY
  ├── license
  ├── open_weight (BOOL)
  ├── release_date
  ├── announcement_date
  ├── discovered_at
  └── status (RELEASED / ANNOUNCED / PREVIEW / DEPRECATED / REMOVED)

MODEL_VERSION
  ├── model_id → MODEL
  ├── version_tag
  ├── alias[]
  ├── context_window
  ├── max_output_tokens
  ├── modalities[]
  ├── capabilities (reasoning / tool_calling / structured_output / vision / audio / video / file / computer_use / web_search / code_execution / mcp)
  └── evidence_id → EVIDENCE

ACCESS_ROUTE  ← 核心枢纽
  ├── route_id
  ├── model_version_id → MODEL_VERSION
  ├── entity_id → ENTITY (Provider/Gateway)
  ├── base_url
  ├── endpoint_path
  ├── region
  ├── authentication_method (BEARER / X_API_KEY / API_KEY / CUSTOM)
  ├── protocols_supported[] → PROTOCOL
  ├── tools_compatible[] → TOOL
  ├── status (AVAILABLE / DEGRADED / UNAVAILABLE / REQUIRES_ACCOUNT)
  └── evidence_id → EVIDENCE

PROTOCOL
  ├── protocol_id
  ├── name (OPENAI_CHAT_COMPLETIONS / OPENAI_RESPONSES / ANTHROPIC_MESSAGES / GEMINI_GENERATE_CONTENT / ...)
  └── version

TOOL
  ├── tool_id
  ├── name (CLAUDE_CODE / CODEX / CURSOR / OPENCODE / CLINE / ROO_CODE / KIMI_CLI / HERMES / VS_CODE_COPILOT / LANGCHAIN / LLAMAINDEX / VERCEL_AI_SDK / LITELLM / OPENAI_SDK / ANTHROPIC_SDK)
  └── compat_evidence_level

PRICING  ← 绑定到 ACCESS_ROUTE
  ├── pricing_id
  ├── route_id → ACCESS_ROUTE
  ├── input_price
  ├── output_price
  ├── cache_read_price
  ├── cache_write_price
  ├── image_price
  ├── audio_price
  ├── video_price
  ├── batch_price
  ├── priority_price
  ├── flex_price
  ├── search_price
  ├── tool_price
  ├── storage_price
  ├── runtime_price
  ├── currency
  ├── unit (PER_1M_TOKENS / PER_1K_TOKENS / PER_REQUEST / PER_IMAGE / PER_SECOND / ...)
  ├── billing_model (PAYG / SUBSCRIPTION / HYBRID)
  ├── region
  ├── tier
  ├── volume_condition
  ├── promotion (BOOL)
  ├── effective_at
  ├── expires_at
  ├── source_type (OFFICIAL_API / OFFICIAL_DOC / OFFICIAL_PAGE / AGGREGATOR / OBSERVED)
  └── evidence_id → EVIDENCE

PRICE_TIER  ← 阶梯价格
  ├── tier_id
  ├── pricing_id → PRICING
  ├── tier_start
  ├── tier_end
  ├── unit_price
  └── condition_description

CODING_PLAN  ← 独立于 API Pricing
  ├── plan_id
  ├── entity_id → ENTITY
  ├── plan_name
  ├── monthly_price
  ├── yearly_price
  ├── currency
  ├── billing_cycle
  ├── quota_type (TOKEN / CREDIT / REQUEST / MESSAGE / COMPUTE / SESSION / TIME_WINDOW / HYBRID)
  ├── five_hour_limit
  ├── daily_limit
  ├── weekly_limit
  ├── monthly_limit
  ├── credit_limit
  ├── token_limit
  ├── request_limit
  ├── message_limit
  ├── concurrency
  ├── model_multiplier
  ├── included_models[]
  ├── included_tools[]
  ├── overage_policy
  ├── overage_price
  ├── reset_rule (5H_ROLLING / DAILY / WEEKLY / 7_DAY / MONTHLY / FIXED_PERIOD / ROLLING_PERIOD)
  ├── quota_shared_with
  └── evidence_id → EVIDENCE

CACHE_POLICY  ← Provider Prompt Cache
  ├── cache_policy_id
  ├── route_id → ACCESS_ROUTE
  ├── cache_supported (BOOL / UNKNOWN)
  ├── cache_type (PROMPT_CACHE / RESPONSE_CACHE / HYBRID)
  ├── ttl
  ├── write_price
  ├── read_price
  ├── minimum_tokens
  ├── cache_key_strategy
  ├── sticky_routing_required
  └── evidence_id → EVIDENCE

CACHE_OBSERVATION  ← 实测
  ├── observation_id
  ├── route_id → ACCESS_ROUTE
  ├── eligible_input_tokens
  ├── cached_input_tokens
  ├── cache_write_tokens
  ├── cache_hit_requests
  ├── cache_eligible_requests
  ├── latency_ms
  ├── effective_cost
  ├── token_cache_hit_rate
  ├── request_cache_hit_rate
  ├── observed_at
  └── evidence_level (S0)

RELIABILITY_OBSERVATION
  ├── observation_id
  ├── route_id → ACCESS_ROUTE
  ├── latency_p50 / p95 / p99
  ├── ttft_p50 / p95 / p99
  ├── tokens_per_second
  ├── error_rate
  ├── rate_429_rate
  ├── rate_5xx_rate
  ├── timeout_rate
  ├── availability_window
  ├── uptime_estimate
  ├── concurrency_observed
  ├── rpm_observed
  ├── tpm_observed
  ├── rpd_observed
  ├── official_rpm / official_tpm / official_rpd
  ├── observed_at
  └── evidence_level (S0)

BENCHMARK / QUALITY_OBSERVATION
  ├── observation_id
  ├── model_version_id → MODEL_VERSION
  ├── task_dimension (CODING / AGENT / REASONING / MATH / KNOWLEDGE / CHINESE / ENGLISH / LONG_CONTEXT / VISION / TOOL_USE / STRUCTURED_OUTPUT / WRITING / MULTIMODAL)
  ├── score_type (OFFICIAL_CLAIM / BENCHMARK_RESULT / INDEPENDENT_EVALUATION / OBSERVED_EVALUATION)
  ├── score_value
  ├── benchmark_name
  ├── source_url
  ├── published_at
  └── evidence_level

EVIDENCE
  ├── evidence_id
  ├── source_id
  ├── source_type (OFFICIAL_API / OFFICIAL_DOC / OFFICIAL_PRICING_PAGE / OFFICIAL_BLOG / OFFICIAL_CHANGELOG / THIRD_PARTY_DB / COMMUNITY / SEARCH_INFERENCE)
  ├── source_url
  ├── source_title
  ├── published_at
  ├── effective_at
  ├── fetched_at
  ├── verified_at
  ├── raw_payload (JSONB)
  ├── normalized_value
  ├── evidence_level (S0 / S1 / S2 / S3 / S4 / S5 / S6)
  └── verification_status (VERIFIED / CROSS_CHECKED / CONFLICTING / UNVERIFIED)

SNAPSHOT
  ├── snapshot_id
  ├── snapshot_date
  ├── entity_type
  ├── entity_id
  ├── payload (JSONB)
  └── created_at

CHANGE_EVENT
  ├── event_id
  ├── event_type (NEW_MODEL / MODEL_UPDATED / MODEL_REMOVED / NEW_PROVIDER / PROVIDER_UPDATED / PROVIDER_REMOVED / NEW_GATEWAY / GATEWAY_UPDATED / NEW_ROUTE / PRICE_UP / PRICE_DOWN / CACHE_POLICY_CHANGED / CACHE_PRICE_CHANGED / PLAN_ADDED / PLAN_CHANGED / PLAN_REMOVED / PROTOCOL_SUPPORT_ADDED / PROTOCOL_SUPPORT_REMOVED / TOOL_SUPPORT_ADDED / TOOL_SUPPORT_REMOVED / RATE_LIMIT_CHANGED / CONTEXT_CHANGED / STATUS_CHANGED / SCHEMA_CHANGED)
  ├── entity_type
  ├── entity_id
  ├── field_name
  ├── old_value
  ├── new_value
  ├── effective_at
  ├── detected_at
  ├── snapshot_id_t_minus_1
  ├── snapshot_id_t
  └── evidence_id

CANDIDATE
  ├── candidate_id
  ├── candidate_type (PROVIDER / GATEWAY / AGGREGATOR / RELAY / MODEL / PLAN / TOOL)
  ├── name
  ├── domain
  ├── first_discovered_at
  ├── discovery_sources[]
  ├── discovery_run_id
  ├── evidence[]
  ├── status (UNVERIFIED / VERIFIED / REJECTED / DUPLICATE)
  └── rejection_reason

DISCOVERY_RUN
  ├── run_id
  ├── started_at
  ├── finished_at
  ├── sources_executed[]
  ├── candidates_found
  ├── candidates_verified
  ├── errors[]
  └── status (SUCCESS / PARTIAL / FAILED)
```

### 苏格拉底式数据模型追问

**问题**：能否把 Provider 和 Gateway 合并为一张 `providers` 表，用 `type` 字段区分？

**正向钢人**：合并简化查询，减少 JOIN，开发初期更快。

**反向钢人**：Provider（如 SiliconFlow、阿里云）拥有自有推理集群和模型托管能力；Gateway（如 302.AI、DeerAPI）是路由/聚合/中转层，可能没有自有模型。两者的技术指纹、价格结构、上游依赖、故障模式完全不同。如果合并，会导致“Gateway 的上游 Provider 是谁”“Provider 是否也被其他 Gateway 聚合”等关系无法自然表达。当系统需要回答“某个 Gateway 是否更换了上游 Provider”时，合并模型将失效。

**幸存结论**：
- 使用统一的 `ENTITY` 表存储所有法律/品牌主体，通过 `entity_type` 区分。
- 但在关系层必须建立 `GATEWAY_UPSTREAM` 关系表，记录 Gateway → Provider 的路由依赖。
- `ACCESS_ROUTE` 必须同时关联 `model_version_id` 和 `entity_id`，无论该 Entity 是 Provider 还是 Gateway。
- 如果一个平台既是 Provider 又是 Gateway（如 OpenRouter 同时提供自有路由和聚合第三方），则 `entity_type = DISPUTED` 或 `MULTI`，并分别建立 Provider 行为和 Gateway 行为的证据。

---

## D. Discovery Source Architecture

### 发现源分层

系统不维护“平台白名单”，而是维护 **Discovery Pattern Registry**。

```yaml
discovery_patterns:
  search:
    en:
      - '"OpenAI compatible API" AND "pricing" AND "-openrouter"'
      - '"Anthropic compatible API" AND "docs" AND "-github"'
      - '"LLM inference API" AND "sign up" AND "API key"'
      - '"AI gateway" AND "model router" AND "pricing"'
      - '"prompt caching API" AND "cache read price"'
      - '"coding plan" AND "AI API" AND "monthly"'
      - '"OpenAI Responses API" AND "third party"'
    zh:
      - '"OpenAI 兼容 API" AND "价格" AND "中转"'
      - '"Anthropic 兼容" AND "Claude" AND "API"'
      - '"大模型推理 API" AND "注册" AND "密钥"'
      - '"AI 网关" AND "模型路由" AND "计费"'
      - '"编码套餐" AND "AI API" AND "月付"'
  github:
    topics:
      - llm-gateway
      - openai-proxy
      - anthropic-relay
      - ai-gateway
      - model-router
      - llm-provider
    search:
      - '"OpenAI compatible" AND "base_url" AND "pricing"'
      - '"Anthropic Messages" AND "proxy" AND "API"'
      - '"coding plan" AND "LLM" AND "subscription"'
    file_patterns:
      - "**/pricing.json"
      - "**/models.json"
      - "**/openapi.yaml"
      - "**/providers.yaml"
  registry:
    - name: Models.dev
      type: MODEL_REGISTRY
      endpoints:
        - /api/models
        - /api/providers
    - name: OpenRouter
      type: AGGREGATOR_REGISTRY
      endpoints:
        - /api/v1/models
        - /api/v1/providers
    - name: HuggingFace
      type: MODEL_REGISTRY
      endpoints:
        - /api/models
    - name: LiteLLM
      type: GATEWAY_REGISTRY
      source: github_repo
      paths:
        - model_prices_and_context_window.json
        - litellm/llms/
    - name: Artificial Analysis
      type: BENCHMARK_REGISTRY
  official:
    probe_paths:
      - /models
      - /v1/models
      - /v2/models
      - /pricing
      - /plans
      - /billing
      - /docs
      - /changelog
      - /releases
      - /api
      - /status
  news_rss:
    - hackernews_algolia
    - producthunt_api
    - github_releases
    - official_blogs_rss
  dns_ct:
    - certificate_transparency_logs
    - pattern: "api.*.com" OR "llm.*.io" OR "ai.*.dev"
```

### Discovery Feedback Loop

```text
Discovery Run N
  ↓
发现 Candidate: new-gateway.example
  ↓
Technical Fingerprint 发现:
  - 域名: api.new-gateway.example
  - GitHub Org: new-gateway-labs
  - 上游 Provider: siliconflow, aliyun
  - 关键词: "智能路由", "多模型聚合"
  ↓
提取新 Discovery Pattern:
  - 新搜索词: "new-gateway-labs" "智能路由"
  - 新域名模式: *.new-gateway.example
  - 新 GitHub Org: new-gateway-labs
  - 新上游 Provider 关联
  ↓
写入 Discovery Pattern Registry
  ↓
Discovery Run N+1 使用新 Pattern 扩大搜索
```

### 苏格拉底式发现追问

**问题**：如果只监控 Models.dev、OpenRouter、HuggingFace 等结构化 Registry，是否足够？

**正向钢人**：这些 Registry 数据质量高、结构化好、更新频繁，能覆盖绝大多数主流模型和 Provider。

**反向钢人**：Registry 只能覆盖“已经申请进入或被收录”的实体。大量新 Gateway、中转站、Reseller 不会主动提交到 Models.dev 或 OpenRouter。它们可能只出现在：
- 中文技术论坛的发布帖
- GitHub 的一个新 proxy 项目
- 某个新注册域名的 SSL 证书透明度日志
- 搜索引擎对“OpenAI 兼容 API 中转”的索引结果

如果只依赖 Registry，系统将成为“Registry 的镜像”，而不是“市场的发现机器”。

**幸存结论**：
- Registry 是 **Seed Source**，不是 **Universe**。
- 系统必须同时运行 Search Heuristics、GitHub Radar、DNS/CT 监控、RSS/News 扫描。
- 任何新发现的 Candidate 必须经过 Technical Fingerprint 验证后才能升级。
- 系统每日报告必须明确声明：“在当前发现源、搜索模式和时间窗口内发现了 X 个新 Candidate，其中 Y 个通过验证。” 不得声称“全网覆盖”。

---

## E. Model Intelligence

### 模型发现 → 归一化 → 版本识别 → 能力提取 → 质量评估

```text
Discovery Signal
  ↓
Candidate Model (name="GPT-5 Turbo", source="search_result")
  ↓
Entity Resolution
  - 匹配 canonical_model_id: gpt-5-turbo
  - 匹配 family: gpt-5
  - 匹配 maker: openai
  - 识别 alias: ["gpt-5-turbo", "gpt-5-turbo-2026-09-15", "openai/gpt-5-turbo"]
  ↓
Version Identification
  - version_tag: 2026-09-15
  - context_window: 1000000 (S1: 官方文档)
  - max_output_tokens: 128000 (S1)
  - modalities: [text, vision, audio] (S1)
  ↓
Capability Extraction
  - reasoning: TRUE (S1: 官方文档明确支持 reasoning 参数)
  - tool_calling: TRUE (S0: 实际探针验证)
  - structured_output: TRUE (S0: JSON Schema 探针)
  - vision: TRUE (S1)
  - audio: TRUE (S1)
  - video: UNKNOWN (无证据)
  - file: TRUE (S1)
  - computer_use: UNKNOWN
  - web_search: TRUE (S1)
  - code_execution: TRUE (S1)
  - mcp: UNKNOWN
  ↓
Quality Assessment (禁止无依据打分)
  - CODING:
      official_claim: "SWE-bench Verified 78.3%" (S3: 官方 Blog, 2026-09-15)
      benchmark_result: "SWE-bench Verified 78.3%" (S4: Artificial Analysis, 2026-09-20)
      independent_evaluation: "实际 Agent 任务成功率 62%" (S5: 社区评测, 2026-09-25)
      observed_evaluation: NOT_AVAILABLE (系统未实测)
  - REASONING:
      official_claim: "GPQA Diamond 89.1%" (S3)
      benchmark_result: "GPQA Diamond 88.7%" (S4)
      independent_evaluation: NOT_FOUND
      observed_evaluation: NOT_AVAILABLE
  - CHINESE:
      official_claim: NOT_FOUND
      benchmark_result: "C-Eval 82.4" (S4: OpenCompass, 2026-09-18)
      independent_evaluation: NOT_FOUND
      observed_evaluation: NOT_AVAILABLE
```

### 禁止行为
- 禁止输出 `score=93` 或 `★★★★★`，除非有明确来源和定义。
- 禁止把 `official_claim` 写成 `observed_evaluation`。
- 禁止把 `benchmark_result` 泛化为“所有任务都很强”。
- 缺失维度必须写 `NOT_FOUND` / `NOT_AVAILABLE` / `UNKNOWN`。

---

## F. Access Intelligence

### AccessRoute 是核心查询对象

用户查询：
> “Claude-4.5 在哪里能用？怎么接？支持 Claude Code 吗？支持 Anthropic Messages 吗？”

系统查询路径：

```sql
SELECT
  mv.canonical_name,
  e.canonical_name AS provider,
  e.entity_type,
  ar.base_url,
  ar.endpoint_path,
  ar.authentication_method,
  ar.status,
  ARRAY_AGG(p.name) AS protocols,
  ARRAY_AGG(t.name) AS tools
FROM access_routes ar
JOIN model_versions mv ON ar.model_version_id = mv.id
JOIN entities e ON ar.entity_id = e.id
LEFT JOIN route_protocols rp ON ar.route_id = rp.route_id
LEFT JOIN protocols p ON rp.protocol_id = p.id
LEFT JOIN route_tools rt ON ar.route_id = rt.route_id
LEFT JOIN tools t ON rt.tool_id = t.id
WHERE mv.canonical_name ILIKE '%claude-4.5%'
GROUP BY ar.route_id, mv.canonical_name, e.canonical_name, e.entity_type;
```

### Protocol Matrix 示例

| Capability | Anthropic Direct | OpenRouter | 302.AI | DeerAPI | SiliconFlow |
|---|---|---|---|---|---|
| OpenAI Chat Completions | ❌ | ✅ | ✅ | ✅ | ✅ |
| OpenAI Responses | ❌ | ✅ | ❌ | ❌ | UNKNOWN |
| Anthropic Messages | ✅ | ✅ | ✅ | ✅ | ❌ |
| Streaming | ✅ | ✅ | ✅ | ✅ | ✅ |
| Tool Calling | ✅ | ✅ | ✅ | PARTIAL | ✅ |
| Structured Output | ✅ | ✅ | ❌ | UNKNOWN | ✅ |
| JSON Mode | ✅ | ✅ | ✅ | ✅ | ✅ |
| Vision | ✅ | ✅ | ✅ | ✅ | ✅ |
| Audio | ✅ | ✅ | UNKNOWN | UNKNOWN | ❌ |
| File | ✅ | ✅ | UNKNOWN | UNKNOWN | ✅ |
| Reasoning | ✅ | ✅ | ✅ | UNKNOWN | UNKNOWN |
| MCP | ✅ | UNKNOWN | ❌ | ❌ | UNKNOWN |

### Tool Compatibility Matrix 示例

| Tool | Anthropic Direct | OpenRouter | 302.AI | DeerAPI | SiliconFlow |
|---|---|---|---|---|---|
| Claude Code | ✅ (S0) | ✅ (S1) | ✅ (S5) | UNKNOWN | ❌ |
| Codex | ❌ | ✅ (S1) | UNKNOWN | UNKNOWN | ✅ (S1) |
| Cursor | ✅ (S1) | ✅ (S1) | ✅ (S5) | UNKNOWN | ✅ (S5) |
| OpenCode | ✅ (S1) | ✅ (S1) | UNKNOWN | UNKNOWN | ✅ (S5) |
| Cline | ✅ (S1) | ✅ (S1) | ✅ (S5) | UNKNOWN | ✅ (S5) |
| Roo Code | ✅ (S1) | ✅ (S1) | UNKNOWN | UNKNOWN | UNKNOWN |
| Kimi CLI | ❌ | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |
| Hermes | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |
| VS Code Copilot | ❌ | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |
| LangChain | ✅ (S1) | ✅ (S1) | ✅ (S5) | UNKNOWN | ✅ (S1) |
| LlamaIndex | ✅ (S1) | ✅ (S1) | UNKNOWN | UNKNOWN | ✅ (S1) |
| Vercel AI SDK | ✅ (S1) | ✅ (S1) | UNKNOWN | UNKNOWN | ✅ (S1) |
| LiteLLM | ✅ (S1) | ✅ (S1) | ✅ (S5) | UNKNOWN | ✅ (S1) |
| OpenAI SDK | ❌ | ✅ (S0) | ✅ (S0) | ✅ (S0) | ✅ (S0) |
| Anthropic SDK | ✅ (S0) | ✅ (S0) | ✅ (S0) | ✅ (S0) | ❌ |

### 苏格拉底式工具兼容追问

**问题**：如果某 Gateway 的文档写“支持 Claude Code”，是否可以直接标记 `Claude Code = TRUE`？

**正向钢人**：官方文档明确写了支持，应该信任。

**反向钢人**：Claude Code 依赖 Anthropic Messages API 的特定行为：`cache_control`、`tool_use`、`computer_use`、`streaming`、`system` 提示格式、`max_tokens` 处理、错误码格式。很多 Gateway 只实现了 `/v1/messages` 的基础转发，但缺少 `cache_control` 或 `computer_use` 支持，导致 Claude Code 实际运行时报错或功能缺失。文档写“支持”可能只是营销话术。

**幸存结论**：
- 官方文档写“支持 Claude Code”只能作为 `S1` 或 `S3` 证据，不能直接标记为 `VERIFIED_TRUE`。
- 必须尽可能执行：
  1. 查找该 Gateway 的 Claude Code 集成文档或 SDK 示例。
  2. 搜索 GitHub Issue：`"gateway-name" "claude code" error`。
  3. 如果有测试账号，执行实际 Claude Code 探针。
- 如果无法验证，标记为 `CLAIMED_SUPPORTED` 且 `evidence_level=S1/S3`，不得标记为 `S0_VERIFIED`。
- 如果用户实际反馈“无法使用”，创建 `CONFLICTING` 证据并触发人工复核。

---

## G. Pricing Intelligence

### 价格对象结构

```json
{
  "pricing_id": "prc_abc123",
  "route_id": "route_siliconflow_qwen3_72b",
  "input_price": 0.0004,
  "output_price": 0.0012,
  "cache_read_price": 0.00008,
  "cache_write_price": 0.0004,
  "image_price": null,
  "audio_price": null,
  "video_price": null,
  "batch_price": 0.0002,
  "priority_price": null,
  "flex_price": null,
  "search_price": null,
  "tool_price": null,
  "storage_price": null,
  "runtime_price": null,
  "currency": "CNY",
  "unit": "PER_1M_TOKENS",
  "billing_model": "PAYG",
  "region": "cn-east-1",
  "tier": "standard",
  "volume_condition": null,
  "promotion": false,
  "effective_at": "2026-09-01T00:00:00Z",
  "expires_at": null,
  "source_type": "OFFICIAL_PRICING_PAGE",
  "evidence_id": "ev_98765",
  "price_tiers": [
    {
      "tier_start": 0,
      "tier_end": 131072,
      "unit_price": 0.0004,
      "condition_description": "Context <= 128K"
    },
    {
      "tier_start": 131073,
      "tier_end": 1048576,
      "unit_price": 0.0008,
      "condition_description": "Context 128K - 1M"
    },
    {
      "tier_start": 1048577,
      "tier_end": null,
      "unit_price": 0.0016,
      "condition_description": "Context > 1M"
    }
  ]
}
```

### 价格变化检测

```text
Snapshot T-1:
  input_price = 0.0004 CNY/1M tokens
  cache_read_price = 0.00008
  effective_at = 2026-09-01

Snapshot T:
  input_price = 0.0006 CNY/1M tokens
  cache_read_price = 0.00012
  effective_at = 2026-09-30

Diff:
  PRICE_UP:
    field: input_price
    old: 0.0004
    new: 0.0006
    change_pct: +50%
    effective_at: 2026-09-30
    evidence: official_pricing_page_fetched_2026-09-30T02:00Z

  CACHE_PRICE_CHANGED:
    field: cache_read_price
    old: 0.00008
    new: 0.00012
    change_pct: +50%
```

### 苏格拉底式价格追问

**问题**：能否把 Coding Plan 的月费除以估算 Token 数，得到“等效 Token Price”并参与价格排名？

**正向钢人**：用户确实关心“哪个更便宜”，换算后可以直接比较，用户体验好。

**反向钢人**：Coding Plan 的额度规则极其复杂：
- 5 小时滚动窗口 vs 每日重置 vs 每周重置
- 不同模型有不同 multiplier（Claude-4.5 可能消耗 5× credit，GPT-5 消耗 2×）
- 并发限制不同
- 超量后可能断供或按不同价格计费
- 套餐可能只包含特定工具（如只包含 Claude Code，不包含 API）

强行换算会得到一个看似精确但实际完全误导的数字。例如：¥200/月，假设每月用 10M tokens，得出 ¥20/1M。但实际用户可能因为 5h 窗口限制根本用不完 10M，或者因为 multiplier 实际只 equivalent 2M base tokens。

**幸存结论**：
- Coding Plan 必须独立建模，禁止直接换算为 Token Price 参与 API 价格排名。
- 可以额外计算 `estimated_effective_cost`，但必须：
  - 明确标注 `ESTIMATED`。
  - 公开估算假设：`assumed_monthly_tokens`, `assumed_model_mix`, `assumed_utilization_rate`。
  - 与官方 API Token Price 分开展示。
- 系统不得输出“Coding Plan 比 API 便宜 X%”这种无依据结论，只能输出结构化事实。

---

## H. Plan Intelligence

### Coding Plan 对象结构

```json
{
  "plan_id": "plan_kimi_code_pro",
  "entity_id": "entity_moonshot",
  "plan_name": "Kimi Code Pro",
  "monthly_price": 199.0,
  "yearly_price": 1990.0,
  "currency": "CNY",
  "billing_cycle": "MONTHLY",
  "quota_type": "HYBRID",
  "five_hour_limit": {
    "value": 200,
    "unit": "REQUEST",
    "window": "5H_ROLLING"
  },
  "daily_limit": {
    "value": null,
    "unit": null
  },
  "weekly_limit": {
    "value": 5000,
    "unit": "REQUEST",
    "window": "7_DAY_FIXED"
  },
  "monthly_limit": {
    "value": null,
    "unit": null
  },
  "credit_limit": {
    "value": 10000,
    "unit": "CREDIT"
  },
  "token_limit": {
    "value": null,
    "unit": null
  },
  "request_limit": {
    "value": null,
    "unit": null
  },
  "message_limit": {
    "value": null,
    "unit": null
  },
  "concurrency": 3,
  "model_multiplier": {
    "kimi-code-7b": 1.0,
    "kimi-code-72b": 3.0,
    "claude-4.5-sonnet": 5.0
  },
  "included_models": ["kimi-code-7b", "kimi-code-72b", "claude-4.5-sonnet"],
  "included_tools": ["kimi-cli", "claude-code"],
  "overage_policy": "BLOCK",
  "overage_price": null,
  "reset_rule": "5H_ROLLING_AND_7_DAY_FIXED",
  "quota_shared_with": ["kimi-cli", "kimi-web"],
  "evidence_id": "ev_55555"
}
```

### 禁止行为
- 禁止把 `weekly_limit=5000` 写成 `daily_limit=714`。
- 禁止把 `5H_ROLLING` 误认为 `DAILY`。
- 禁止把 `CREDIT` 直接等同于 `TOKEN`。
- 禁止把 `quota_shared_with` 忽略，导致用户误以为额度是独立的。

---

## I. Cache Intelligence

### Provider Prompt Cache vs Gateway Response Cache

```json
{
  "cache_policy_id": "cp_anthropic_direct",
  "route_id": "route_anthropic_direct",
  "cache_supported": true,
  "cache_type": "PROMPT_CACHE",
  "ttl": 300,
  "write_price": 0.00375,
  "read_price": 0.0003,
  "minimum_tokens": 1024,
  "cache_key_strategy": "PREFIX_MATCH",
  "sticky_routing_required": true,
  "evidence_id": "ev_11111"
}
```

```json
{
  "cache_policy_id": "cp_gateway_302ai",
  "route_id": "route_302ai_claude",
  "cache_supported": true,
  "cache_type": "RESPONSE_CACHE",
  "ttl": 3600,
  "write_price": null,
  "read_price": null,
  "minimum_tokens": null,
  "cache_key_strategy": "FULL_REQUEST_HASH",
  "sticky_routing_required": false,
  "provider_bill_behavior": "NOT_BILLED_ON_HIT",
  "evidence_id": "ev_22222"
}
```

### Cache Observation（实测）

```json
{
  "observation_id": "obs_cache_001",
  "route_id": "route_anthropic_direct",
  "eligible_input_tokens": 100000,
  "cached_input_tokens": 82300,
  "cache_write_tokens": 10240,
  "cache_hit_requests": 42,
  "cache_eligible_requests": 50,
  "latency_ms": 320,
  "effective_cost": 0.1842,
  "token_cache_hit_rate": 0.823,
  "request_cache_hit_rate": 0.84,
  "observed_at": "2026-09-30T01:15:00Z",
  "evidence_level": "S0"
}
```

### 苏格拉底式缓存追问

**问题**：如果价格页写“Cache Read $0.0003 / 1M tokens”，能否推断“Cache Hit Rate 很高，所以很便宜”？

**正向钢人**：Cache Read 价格远低于 Input 价格，说明命中后成本大幅下降，用户应该优先选择支持 Cache 的 Provider。

**反向钢人**：价格只说明“如果命中，单价是多少”。它完全不说明：
- 命中率是多少（可能因为 TTL 太短、路由不 sticky、minimum tokens 太高而实际命中率 < 5%）
- 哪些请求有资格命中（可能只支持 system prompt 前缀，不支持多轮对话）
- 是否需要额外配置（如显式 `cache_control` 标记）
- Gateway 是否在中间层破坏了 Cache Key

如果用户基于“Cache Read 便宜”做出决策，但实际命中率极低，总成本反而更高。

**幸存结论**：
- `cache_read_price` 和 `cache_write_price` 只能证明 **Policy Price**。
- `observed_cache_hit_rate` 必须来自系统实测或用户遥测。
- 如果无实测数据，必须标记 `observed_cache_hit_rate = NOT_AVAILABLE`。
- 系统可以输出：“该 Route 支持 Prompt Cache，Read Price 为 X，Write Price 为 Y，TTL 为 Z。当前无实测命中率数据。”
- 禁止输出：“该 Route Cache 命中率高，推荐使用。”

---

## J. Reliability Intelligence

### Reliability Observation 结构

```json
{
  "observation_id": "obs_rel_001",
  "route_id": "route_openrouter_claude",
  "latency_p50": 850,
  "latency_p95": 2100,
  "latency_p99": 4500,
  "ttft_p50": 320,
  "ttft_p95": 890,
  "ttft_p99": 1500,
  "tokens_per_second": 42.5,
  "error_rate": 0.012,
  "rate_429_rate": 0.008,
  "rate_5xx_rate": 0.003,
  "timeout_rate": 0.001,
  "availability_window": "2026-09-29T00:00Z / 2026-09-30T00:00Z",
  "uptime_estimate": 0.997,
  "concurrency_observed": 10,
  "rpm_observed": 120,
  "tpm_observed": 250000,
  "rpd_observed": 8500,
  "official_rpm": 500,
  "official_tpm": 1000000,
  "official_rpd": 50000,
  "observed_at": "2026-09-30T02:00:00Z",
  "evidence_level": "S0"
}
```

### 关键区分
- `official_rpm = 500` 不等于 `observed_rpm = 120`。
- 官方文档写“99.9% SLA”不等于实测 `uptime_estimate = 0.997`。
- 429 增多必须触发 `RELIABILITY_DEGRADED` 事件，即使官方状态页显示正常。

---

## K. Ubuntu 部署方案

### 技术栈

| 组件 | 选型 | 理由 |
|------|------|------|
| Runtime | Docker + Docker Compose | 隔离、可复现、易升级 |
| 主语言 | Python 3.12+ | httpx / FastAPI / SQLAlchemy / Celery / Playwright |
| 辅助语言 | Node.js 22+ | SDK 探针（OpenAI / Anthropic / Vercel AI SDK） |
| Scheduler | systemd timer + cron fallback | Ubuntu 原生，无人值守 |
| Database | PostgreSQL 16 + JSONB | 关系 + 半结构化，支持全文搜索 |
| Queue / Cache | Redis 7 | Celery broker + 去重缓存 + 限流 |
| Task Queue | Celery + Redis | 分布式任务、重试、退避 |
| Crawler | httpx (async) + Playwright (fallback) | 优先 API/JSON，无结构化接口时才用 headless |
| API Client | openai-python / anthropic-sdk-python / 自定义探针 | S0 级验证 |
| Storage | MinIO / S3 | 原始快照、网页存档、PDF |
| Logging | Loki + Promtail | 集中日志 |
| Monitoring | Prometheus + Grafana | 任务成功率、延迟、429 率 |
| Error Tracking | Sentry | 异常告警 |
| Schema Validation | pydantic v2 + JSON Schema | 输入输出校验，Schema Change Detection |

### 目录结构

```text
/opt/ai-market-intelligence/
├── docker-compose.yml
├── .env
├── services/
│   ├── discovery/
│   │   ├── search_worker.py
│   │   ├── github_radar.py
│   │   ├── registry_sync.py
│   │   ├── rss_scanner.py
│   │   └── dns_ct_monitor.py
│   ├── fingerprint/
│   │   ├── http_probe.py
│   │   ├── sdk_compat_test.js
│   │   └── openapi_parser.py
│   ├── extraction/
│   │   ├── pricing_extractor.py
│   │   ├── plan_extractor.py
│   │   ├── model_extractor.py
│   │   └── llm_assist.py
│   ├── graph/
│   │   ├── models.py
│   │   ├── entity_resolution.py
│   │   └── snapshot_diff.py
│   ├── intelligence/
│   │   ├── daily_report.py
│   │   ├── query_api.py
│   │   └── alerting.py
│   └── scheduler/
│       ├── daily-discovery.timer
│       ├── daily-discovery.service
│       └── cron_backup
├── patterns/
│   ├── discovery_patterns.yaml
│   ├── probe_endpoints.yaml
│   └── tool_compat_signatures.yaml
├── snapshots/
├── logs/
└── tests/
```

### systemd timer 示例

```ini
# /etc/systemd/system/ai-market-discovery.timer
[Unit]
Description=AI Market Discovery Daily Timer

[Timer]
OnCalendar=*-*-* 02:00:00
Persistent=true
RandomizedDelaySec=300

[Install]
WantedBy=timers.target
```

```ini
# /etc/systemd/system/ai-market-discovery.service
[Unit]
Description=AI Market Discovery Engine
After=network.target docker.service

[Service]
Type=oneshot
User=aimarket
WorkingDirectory=/opt/ai-market-intelligence
ExecStart=/usr/bin/docker compose run --rm scheduler python -m services.scheduler.daily_run
Environment=PYTHONUNBUFFERED=1
TimeoutStartSec=7200
```

### 失败处理与 Schema Change Detection

```python
class SourceFailurePolicy:
    max_retries = 3
    backoff_factor = 2
    retry_on = [429, 500, 502, 503, 504, TimeoutError, ConnectionError]
    continue_on = [403, 404, CaptchaDetected, AuthRequired]
    degrade_on = [SchemaChanged, ParseError]

    def execute(self, source):
        for attempt in range(self.max_retries):
            try:
                result = source.fetch()
                schema_validator.validate(result)
                return result
            except SchemaChangedError as e:
                alerting.send(f"SCHEMA_CHANGED: {source.name}: {e}")
                source.mark_degraded()
                return None
            except RetryableError as e:
                sleep(self.backoff_factor ** attempt)
                continue
            except ContinueableError as e:
                log.warning(f"SOURCE_CONTINUE: {source.name}: {e}")
                return None
        source.mark_degraded()
        return None
```

### Schema Change Detection 实现

```python
def detect_schema_change(old_snapshot: dict, new_snapshot: dict, path=""):
    changes = []
    old_keys = set(old_snapshot.keys())
    new_keys = set(new_snapshot.keys())

    for key in new_keys - old_keys:
        changes.append({"type": "FIELD_ADDED", "path": f"{path}.{key}"})

    for key in old_keys - new_keys:
        changes.append({"type": "FIELD_REMOVED", "path": f"{path}.{key}"})

    for key in old_keys & new_keys:
        old_val = old_snapshot[key]
        new_val = new_snapshot[key]
        if isinstance(old_val, dict) and isinstance(new_val, dict):
            changes.extend(detect_schema_change(old_val, new_val, f"{path}.{key}"))
        elif type(old_val) != type(new_val):
            changes.append({
                "type": "FIELD_TYPE_CHANGED",
                "path": f"{path}.{key}",
                "old_type": type(old_val).__name__,
                "new_type": type(new_val).__name__
            })

    return changes
```

---

## L. 每日执行流程

```text
02:00:00  [DISCOVERY]
          01. 拉取 Registry Seed (Models.dev / OpenRouter / HF / LiteLLM / Artificial Analysis)
          02. 执行 Search Patterns (EN + ZH)
          03. 执行 GitHub Radar (topics / search / releases)
          04. 扫描 RSS / News / Product Hunt / Hacker News
          05. 扫描 DNS/CT 新域名
          06. 创建 Candidate，写入 candidates 表
          07. Entity Resolution：去重、归一化、匹配已有 Entity

02:30:00  [FINGERPRINT & VERIFICATION]
          08. 对 Candidate 执行 HTTP Probe (/v1/models, /pricing, /docs, /openapi.yaml)
          09. 执行 SDK Compat Test (OpenAI / Anthropic / Responses / Messages)
          10. 检测认证方式 (Bearer / x-api-key / api-key)
          11. 提取 Protocol Matrix
          12. 验证通过 → 升级为 VERIFIED_ENTITY；失败 → REJECTED / REQUIRES_MANUAL

03:30:00  [EXTRACTION & NORMALIZATION]
          13. 对 Verified Entity 提取 Model List
          14. 提取 Pricing (input / output / cache / image / audio / batch / tier)
          15. 提取 Coding Plan (quota / reset / multiplier / included_models)
          16. 提取 Cache Policy (type / ttl / price / min_tokens)
          17. 提取 Rate Limit (rpm / tpm / rpd / concurrency)
          18. 提取 Tool Compatibility (docs / GitHub / SDK examples)
          19. LLM 辅助提取非结构化文本，但核心字段必须 Schema 验证
          20. 单位归一化 (CNY/USD, 1M tokens, 1K tokens)
          21. 时间归一化 (UTC, ISO8601)

04:30:00  [SNAPSHOT & DIFF]
          22. 生成 T Snapshot (所有 Entity / Model / Route / Price / Plan / Cache / Reliability)
          23. 加载 T-1 Snapshot
          24. 字段级 Diff，生成 Change Events
          25. Schema Change Detection：检测外部 API 结构变化
          26. 冲突检测：官方价格 ≠ 第三方价格 → 保存 CONFLICTING 证据

05:00:00  [INTELLIGENCE & OUTPUT]
          27. 生成 AI Daily Market Intelligence
          28. 写入 PostgreSQL + 推送 Alerting (Slack / Email / Webhook)
          29. 更新 Discovery Pattern Registry (Feedback Loop)
          30. 清理临时文件，归档原始快照到 MinIO
```

---

## M. 每日输出示例

```markdown
# AI Daily Market Intelligence
**数据窗口**: 2026-09-29 02:00 UTC → 2026-09-30 02:00 UTC
**发现源覆盖**: Registry(5) / Search(EN+ZH) / GitHub / RSS(12) / DNS-CT
**声明**: 本报告仅反映当前发现源与时间窗口内的可验证变化，不声称全网覆盖。

---

## 1. 今日新模型 (2)

| Model | Maker | Release | Discovered | Context | Modalities | License | Evidence |
|-------|-------|---------|------------|---------|------------|---------|----------|
| Qwen3-72B-Instruct-2026Q3 | Alibaba | 2026-09-29 | 2026-09-30 | 1M | text,vision | Apache-2.0 | S1:HF |
| Gemini-3-Flash | Google | 2026-09-29 | 2026-09-30 | 2M | text,vision,audio | Proprietary | S3:Blog |

## 2. 今日新增 Provider / Gateway (1)

| Name | Type | Domain | Protocols | Models | Status | Evidence |
|------|------|--------|-----------|--------|--------|----------|
| NovaRoute | GATEWAY / AGGREGATOR | novaroute.ai | OpenAI Chat, Anthropic Messages | 42 | VERIFIED | S0:Probe + S2:Pricing |

## 3. 今日价格变化 (3)

| Model | Route | Field | Old | New | Change | Effective | Source |
|-------|-------|-------|-----|-----|--------|-----------|--------|
| Claude-4.5-Sonnet | Anthropic Direct | input_price | $3.00 | $3.50 | +16.7% | 2026-10-01 | S2:Page |
| Qwen3-72B | SiliconFlow | cache_read_price | ¥0.00008 | ¥0.00012 | +50% | 2026-09-30 | S2:Page |
| GPT-5 | OpenRouter | output_price | $15.00 | $12.00 | -20% | 2026-09-29 | S0:API |

## 4. 今日 Coding Plan 变化 (1)

| Plan | Provider | Change | Old | New | Reset | Evidence |
|------|----------|--------|-----|-----|-------|----------|
| Kimi Code Pro | Moonshot | weekly_limit | 3000 req | 5000 req | 7_DAY_FIXED | S2:Page |

## 5. 今日 Cache 变化 (1)

| Provider | Model | Change | Detail | Evidence |
|----------|-------|--------|--------|----------|
| 302.AI | Claude-4.5 | CACHE_POLICY_CHANGED | response_cache TTL 3600s → 1800s | S1:Doc |

## 6. 今日工具兼容变化 (1)

| Tool | Route | Change | Status | Evidence |
|------|-------|--------|--------|----------|
| Claude Code | NovaRoute | TOOL_SUPPORT_ADDED | CLAIMED_SUPPORTED | S3:Blog |

## 7. 今日可靠性异常 (1)

| Route | Metric | Value | Window | Evidence |
|-------|--------|-------|--------|----------|
| DeerAPI / GPT-5 | 429_rate | 12.5% | 2026-09-29 18:00-20:00 | S0:Probe |

## 8. 今日 Schema / 数据源异常 (1)

| Source | Issue | Detail |
|--------|-------|--------|
| OpenRouter /api/v1/models | FIELD_REMOVED | `context_length` 字段消失，可能迁移至 `context_window` |

---

## 未覆盖 / 待验证区域
- NovaRoute 的 Claude Code 实际兼容性：REQUIRES_ACCOUNT
- Qwen3-72B 的 MCP 支持：UNKNOWN
- Gemini-3-Flash 的第三方 Route：NOT_FOUND
```

---

## N. 风险与边界

| 风险 | 影响 | 缓解策略 |
|------|------|----------|
| 反爬 / Captcha / 403 | 官方页面无法抓取 | 优先 API / JSON / RSS；Playwright fallback；标记 `DEGRADED`；不伪造数据 |
| API Schema 变更 | 采集器悄悄失效 | 字段级 Schema Change Detection；pydantic 校验；告警 |
| 价格 / Plan 频繁变化 | 情报滞后 | 每日 Snapshot + Diff；`effective_at` 时间边界；不输出“当前”而输出 `as_of` |
| 账号权限限制 | Coding Plan 剩余额度、真实 Cache Hit 不可见 | 区分 `PUBLIC` / `AUTHENTICATED` / `OBSERVED`；无账号则标 `REQUIRES_ACCOUNT` |
| 地区限制 | 价格 / 可用性因地区不同 | `region` 字段；多地区探针；冲突时保存 `CONFLICTING` |
| 平台消失 / 跑路 | 官网下线，API 仍可访问 | 定期归档快照；DNS / CT 监控；状态机 `OFFLINE` / `API_ONLY` |
| 第三方数据不一致 | 官方 ≠ OpenRouter ≠ Models.dev | 证据链保留所有来源；优先级规则但不覆盖；冲突事件 |
| LLM 提取幻觉 | 错误价格 / 错误兼容性 | LLM 仅辅助；核心字段必须 Schema / 探针 / 官方文档验证 |
| Candidate 误报 | 搜索到垃圾站 | Candidate 机制；Technical Fingerprint；多源交叉；`UNVERIFIED` 状态 |
| Discovery Pattern 老化 | 新平台特征变化，发现率下降 | Feedback Loop；从新实体反向提取关键词、域名、GitHub Org |

---

## O. 最终方案

### 必须做 (Must Have)

1. **Discovery Pattern Registry**：基于搜索特征、GitHub Topics、Registry API、DNS/CT 的主动发现，禁止硬编码平台白名单。
2. **Candidate → Verification 流水线**：任何新实体必须先为 Candidate，经过 Entity Resolution + Technical Fingerprint + Source Verification 才能升级。
3. **AccessRoute 核心模型**：所有查询围绕 `Model × Route × Entity × Protocol × Tool × Pricing × Plan × Cache × Reliability` 展开。
4. **独立数据域**：Pricing、CodingPlan、CachePolicy、CacheObservation、ReliabilityObservation 必须独立建表，禁止混用一个 `price` 字段。
5. **证据链与分级**：S0–S6 证据等级，`fetched_at` / `published_at` / `effective_at` 时间分离。
6. **Snapshot & Diff**：每日生成 Change Events，而不是静态报表。
7. **失败隔离**：单 Source 失败不导致全任务失败；Schema Change Detection 防止采集器悄悄失效。
8. **缺失数据显式标记**：`UNKNOWN` / `NOT_FOUND` / `NOT_CONFIRMED` / `REQUIRES_ACCOUNT` / `NOT_AVAILABLE`。
9. **Ubuntu 无人值守**：Docker + systemd timer + PostgreSQL + Redis + Celery + Prometheus/Grafana。

### 应该做 (Should Have)

1. **SDK 探针**：使用 OpenAI / Anthropic / Vercel AI SDK 实际调用验证协议兼容性（S0）。
2. **LLM 辅助提取**：对非结构化 Blog / README / 论坛帖进行辅助提取，但结果必须交叉验证。
3. **Discovery Feedback Loop**：从新实体自动提取新搜索词、新域名、新 GitHub Org，反哺下一轮发现。
4. **多地区探针**：对价格 / 可用性进行多地区探测，识别地区差异。
5. **用户遥测接入**：允许用户导入自己的调用日志，计算真实 Cache Hit Rate / 429 Rate / Effective Cost。
6. **工具兼容性签名库**：为 Claude Code / Codex / Cursor / OpenCode 等维护请求特征签名，用于 Gateway 兼容性探针。

### 可选增强 (Nice to Have)

1. **Benchmark 自动抓取**：从 Artificial Analysis / OpenCompass / LMSYS 定期同步 Benchmark，但必须与模型版本对齐。
2. **价格预测 / 异常检测**：基于历史价格变化检测异常波动。
3. **自然语言查询 API**：通过 RAG 查询知识图谱，回答“哪些渠道支持 Claude Code 且 Cache Read 低于 $0.0005”。
4. **Web Dashboard**：可视化 AccessRoute 矩阵、价格趋势、可靠性热力图。
5. **GitHub Issue 情绪分析**：监控 `gateway-name + error` 的 Issue 增长，提前发现可靠性问题。

### 暂不做 (Won't Have — For Now)

1. **不维护人工全量平台名单**。
2. **不输出无依据评分**（93分 / ★★★★★）。
3. **不把 Coding Plan 强行换算为 Token Price 参与排名**。
4. **不声称“全网覆盖”**。
5. **不用 LLM 直接生成核心计费字段**。
6. **不把搜索结果直接当作事实**。
7. **不忽略 `quota_shared_with` / `model_multiplier` / `reset_rule` 等 Plan 细节**。
8. **不把 Cache Price 当作 Cache Hit Rate**。
9. **不把“OpenAI Compatible”当作全协议兼容**。
10. **不在缺失数据时自行补齐**。

---

## 最终成功标准复述

系统建成以后，即使明天出现一个：

> **昨天完全不存在、用户从未告诉过我名字、OpenRouter 尚未收录、Models.dev 尚未收录的新 AI Provider**

只要它在互联网公开出现（官网、API 文档、GitHub、Pricing、Blog、Search Index、新闻、SSL 证书），系统就应该能够：

```text
发现
→ Candidate
→ Entity Resolution
→ Technical Fingerprint
→ Source Verification
→ 归类 (PROVIDER / GATEWAY / AGGREGATOR / RELAY)
→ 建立 Entity
→ 获取 Model List
→ 获取 Pricing / Tiers
→ 获取 Protocols / Tools
→ 获取 Coding Plan / Cache Policy
→ 纳入 Snapshot & Diff
→ 生成 Change Event
→ 输出 Daily Intelligence
```

并且任何结论都可以沿着：

```text
结论 → 数据 → 来源 → 时间 → 原始证据
```

反向验证。

这才算完成：

> **AI 模型与 AI 服务市场自动发现系统**

而不是：

> **已知 AI 平台信息整理器**。