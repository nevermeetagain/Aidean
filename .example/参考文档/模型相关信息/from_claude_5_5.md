# AI Market Discovery & Intelligence Engine
## 完整可行方案与执行大纲

---

## 0. 问题重构：真正要建设的系统

你要建设的**不是**：
- ❌ "AI模型信息采集器"
- ❌ "AI平台价格对比网站"
- ❌ "模型评测数据库"

你要建设的**是**：

> **AI Market Discovery & Intelligence Engine**  
> **AI市场发现与情报引擎**

这是一个能够：
1. **主动发现**互联网上新出现的AI模型、Provider、Gateway、中转服务
2. **自动验证**其技术能力、协议兼容性、工具支持
3. **持续追踪**价格变化、Plan变化、能力变化
4. **生成情报**：每日市场变化报告、可用性分析、成本分析
5. **建立关系图**：Model × Access Route × Protocol × Tool × Price × Plan

核心特征：
- **发现驱动**而非名单驱动
- **证据支撑**而非推测
- **关系图**而非单一记录
- **变化检测**而非静态快照
- **情报生成**而非原始数据

---

## 1. 系统架构：六层设计

```
┌─────────────────────────────────────────────────────────┐
│ Layer 6: Intelligence Generation                         │
│ - Daily Market Intelligence                              │
│ - Change Events                                          │
│ - Availability Analysis                                  │
│ - Cost Analysis                                          │
└─────────────────────────────────────────────────────────┘
                            ↑
┌─────────────────────────────────────────────────────────┐
│ Layer 5: Analysis & Diff                                 │
│ - Snapshot Comparison                                    │
│ - Change Detection                                       │
│ - Trend Analysis                                         │
│ - Quality Assessment                                     │
└─────────────────────────────────────────────────────────┘
                            ↑
┌─────────────────────────────────────────────────────────┐
│ Layer 4: Storage & Relationship Graph                    │
│ - Models, Providers, Gateways                            │
│ - Access Routes                                          │
│ - Prices, Plans, Cache                                   │
│ - Evidence Chain                                         │
└─────────────────────────────────────────────────────────┘
                            ↑
┌─────────────────────────────────────────────────────────┐
│ Layer 3: Normalization & Entity Resolution               │
│ - Canonical Names                                        │
│ - Deduplication                                          │
│ - Type Classification                                    │
│ - Relationship Mapping                                   │
└─────────────────────────────────────────────────────────┘
                            ↑
┌─────────────────────────────────────────────────────────┐
│ Layer 2: Verification & Extraction                       │
│ - Technical Fingerprinting                               │
│ - API Probing                                            │
│ - Multi-source Verification                              │
│ - Data Extraction                                        │
└─────────────────────────────────────────────────────────┘
                            ↑
┌─────────────────────────────────────────────────────────┐
│ Layer 1: Discovery                                       │
│ - Structured Registries                                  │
│ - Search Discovery                                       │
│ - GitHub Discovery                                       │
│ - Official Sources                                       │
│ - RSS/News Discovery                                     │
└─────────────────────────────────────────────────────────┘
```

---

## 2. 完整执行大纲体系（三级结构）

### 2.1 Discovery Layer（发现层）

#### 2.1.1 Structured Registry Discovery
- 2.1.1.1 OpenRouter API采集
  - 2.1.1.1.1 GET /api/v1/models 全量拉取
  - 2.1.1.1.2 解析provider字段提取Provider信息
  - 2.1.1.1.3 解析pricing字段提取价格信息
  - 2.1.1.1.4 记录adopted_at作为discovery_time而非release_time
- 2.1.1.2 Hugging Face Models采集
  - 2.1.1.2.1 API /api/models?filter=text-generation
  - 2.1.1.2.2 识别inference endpoint availability
  - 2.1.1.2.3 区分open-weight vs hosted-only
- 2.1.1.3 Replicate采集
  - 2.1.1.3.1 API /v1/models
  - 2.1.1.3.2 提取pricing per prediction
- 2.1.1.4 ModelScope采集
  - 2.1.1.4.1 爬取模型列表（中文平台）
  - 2.1.1.4.2 识别阿里云部署情况
- 2.1.1.5 Artificial Analysis采集
  - 2.1.1.5.1 抓取benchmark数据
  - 2.1.1.5.2 提取quality/price排名
  - 2.1.1.5.3 标记为S5证据等级（独立评测）

#### 2.1.2 Official Source Discovery
- 2.1.2.1 已知厂商官方源监控
  - 2.1.2.1.1 Anthropic: /models, /pricing
  - 2.1.2.1.2 OpenAI: /docs/models, /pricing
  - 2.1.2.1.3 Google AI: /gemini/docs/models
  - 2.1.2.1.4 Cohere, Mistral, 01.AI等官网
  - 2.1.2.1.5 国内厂商：智谱、月之暗面、百川、MiniMax、DeepSeek等
- 2.1.2.2 Cloud MaaS官方监控
  - 2.1.2.2.1 阿里云百炼模型广场
  - 2.1.2.2.2 华为云盘古大模型
  - 2.1.2.2.3 腾讯云混元
  - 2.1.2.2.4 火山方舟
  - 2.1.2.2.5 百度千帆
  - 2.1.2.2.6 AWS Bedrock
  - 2.1.2.2.7 Azure OpenAI
  - 2.1.2.2.8 Google Cloud Vertex AI
- 2.1.2.3 Gateway官方监控
  - 2.1.2.3.1 302.AI /pricing, /models
  - 2.1.2.3.2 DeerAPI官网
  - 2.1.2.3.3 无问芯穹官网
  - 2.1.2.3.4 AIHubMix官网
  - 2.1.2.3.5 硅基流动官网
  - 2.1.2.3.6 AnyRouter等
- 2.1.2.4 Changelog/Release监控
  - 2.1.2.4.1 RSS订阅各厂商blog
  - 2.1.2.4.2 官方/changelog页面diff检测
  - 2.1.2.4.3 提取model version/capability变化

#### 2.1.3 Search-based Discovery
- 2.1.3.1 英文搜索模式
  - 2.1.3.1.1 "OpenAI compatible API" site:.com -openai.com
  - 2.1.3.1.2 "Anthropic compatible API" -anthropic.com
  - 2.1.3.1.3 "LLM inference API provider"
  - 2.1.3.1.4 "AI gateway" OR "model router"
  - 2.1.3.1.5 "prompt caching API"
  - 2.1.3.1.6 "coding plan" AI tokens
  - 2.1.3.1.7 每周轮换搜索词避免结果固化
- 2.1.3.2 中文搜索模式
  - 2.1.3.2.1 "OpenAI兼容API"
  - 2.1.3.2.2 "Claude API中转"
  - 2.1.3.2.3 "大模型API聚合"
  - 2.1.3.2.4 "AI推理服务"
  - 2.1.3.2.5 "编程套餐"
  - 2.1.3.2.6 站内搜索：site:zhihu.com, site:v2ex.com等
- 2.1.3.3 新闻/Launch平台搜索
  - 2.1.3.3.1 Hacker News: "AI model" OR "LLM API"
  - 2.1.3.3.2 Product Hunt: AI category
  - 2.1.3.3.3 机器之心、量子位等中文AI媒体
- 2.1.3.4 搜索结果处理
  - 2.1.3.4.1 提取domain
  - 2.1.3.4.2 识别/pricing, /docs, /api等路径
  - 2.1.3.4.3 创建Candidate记录
  - 2.1.3.4.4 标记discovery_source = "search"

#### 2.1.4 GitHub Discovery
- 2.1.4.1 关键词搜索
  - 2.1.4.1.1 "OpenAI compatible" language:Python
  - 2.1.4.1.2 "LLM gateway" language:TypeScript
  - 2.1.4.1.3 "model router"
  - 2.1.4.1.4 "AI inference API"
  - 2.1.4.1.5 "prompt cache"
- 2.1.4.2 Repository分析
  - 2.1.4.2.1 检查README中的API base URL
  - 2.1.4.2.2 检查是否有公开deployment
  - 2.1.4.2.3 检查pricing文档
  - 2.1.4.2.4 区分开源项目 vs 商业服务
- 2.1.4.3 Release监控
  - 2.1.4.3.1 订阅已知项目的release events
  - 2.1.4.3.2 解析changelog中的new model support
- 2.1.4.4 Organization发现
  - 2.1.4.4.1 从repo找到org
  - 2.1.4.4.2 检查org主页
  - 2.1.4.4.3 查找官网链接

#### 2.1.5 Candidate Management
- 2.1.5.1 Candidate创建
  - 2.1.5.1.1 记录first_discovered_at
  - 2.1.5.1.2 记录discovery_sources数组
  - 2.1.5.1.3 初始status = CANDIDATE
  - 2.1.5.1.4 初始confidence = LOW
- 2.1.5.2 去重检查
  - 2.1.5.2.1 domain匹配
  - 2.1.5.2.2 name similarity检查
  - 2.1.5.2.3 API base URL匹配
- 2.1.5.3 优先级排序
  - 2.1.5.3.1 多源发现的Candidate优先验证
  - 2.1.5.3.2 有明确API endpoint的优先
  - 2.1.5.3.3 有pricing信息的优先

---

### 2.2 Verification & Extraction Layer（验证与提取层）

#### 2.2.1 Technical Fingerprinting
- 2.2.1.1 API Endpoint探测
  - 2.2.1.1.1 尝试GET /v1/models
  - 2.2.1.1.2 尝试GET /api/v1/models
  - 2.2.1.1.3 尝试GET /v2/models
  - 2.2.1.1.4 尝试GET /models
  - 2.2.1.1.5 记录响应格式（OpenAI-style vs custom）
- 2.2.1.2 协议兼容性检测
  - 2.2.1.2.1 检测OpenAI Chat Completions支持
    - 2.2.1.2.1.1 POST /v1/chat/completions
    - 2.2.1.2.1.2 验证request/response schema
    - 2.2.1.2.1.3 测试streaming
  - 2.2.1.2.2 检测OpenAI Responses支持
    - 2.2.1.2.2.1 POST /v1/responses
    - 2.2.1.2.2.2 验证multimodal input format
  - 2.2.1.2.3 检测Anthropic Messages支持
    - 2.2.1.2.3.1 POST /v1/messages
    - 2.2.1.2.3.2 检查anthropic-version header
  - 2.2.1.2.4 检测Tool Calling
    - 2.2.1.2.4.1 发送tools参数测试
    - 2.2.1.2.4.2 验证tool_choice支持
  - 2.2.1.2.5 检测Structured Output
    - 2.2.1.2.5.1 测试response_format: json_schema
  - 2.2.1.2.6 检测Vision
    - 2.2.1.2.6.1 发送image_url测试
  - 2.2.1.2.7 检测Prompt Cache
    - 2.2.1.2.7.1 检查文档中cache相关参数
    - 2.2.1.2.7.2 发送cache_control测试（Anthropic风格）
    - 2.2.1.2.7.3 检查响应中cache统计字段
- 2.2.1.3 认证方式识别
  - 2.2.1.3.1 Authorization: Bearer
  - 2.2.1.3.2 x-api-key header
  - 2.2.1.3.3 api-key header
  - 2.2.1.3.4 query parameter认证
- 2.2.1.4 Rate Limit检测
  - 2.2.1.4.1 检查响应header: x-ratelimit-*
  - 2.2.1.4.2 记录rpm/tpm/rpd限制

#### 2.2.2 Official Data Extraction
- 2.2.2.1 Model List提取
  - 2.2.2.1.1 从API /models提取
  - 2.2.2.1.2 从文档页面提取
  - 2.2.2.1.3 规范化model_id
  - 2.2.2.1.4 识别model family
  - 2.2.2.1.5 提取context_window
  - 2.2.2.1.6 提取max_output_tokens
  - 2.2.2.1.7 提取modalities
- 2.2.2.2 Pricing提取
  - 2.2.2.2.1 定位pricing页面
  - 2.2.2.2.2 提取input price per token/1K/1M
  - 2.2.2.2.3 提取output price
  - 2.2.2.2.4 提取cache_write price
  - 2.2.2.2.5 提取cache_read price
  - 2.2.2.2.6 识别阶梯定价
    - 2.2.2.2.6.1 提取tier ranges
    - 2.2.2.2.6.2 每个tier单独记录
  - 2.2.2.2.7 识别currency
  - 2.2.2.2.8 识别region限制
  - 2.2.2.2.9 记录effective_date
- 2.2.2.3 Coding Plan提取
  - 2.2.2.3.1 识别plan类型（subscription vs credit）
  - 2.2.2.3.2 提取monthly_price, yearly_price
  - 2.2.2.3.3 提取5-hour limit
  - 2.2.2.3.4 提取daily/weekly/monthly limits
  - 2.2.2.3.5 识别计量单位
    - 2.2.2.3.5.1 TOKEN
    - 2.2.2.3.5.2 CREDIT
    - 2.2.2.3.5.3 REQUEST
    - 2.2.2.3.5.4 MESSAGE
    - 2.2.2.3.5.5 TIME_WINDOW
  - 2.2.2.3.6 提取reset规则
    - 2.2.2.3.6.1 rolling window
    - 2.2.2.3.6.2 fixed period
  - 2.2.2.3.7 提取included models
  - 2.2.2.3.8 提取overage规则
- 2.2.2.4 Cache Policy提取
  - 2.2.2.4.1 提取TTL
  - 2.2.2.4.2 提取minimum tokens
  - 2.2.2.4.3 提取cache key策略
  - 2.2.2.4.4 区分provider cache vs gateway cache
- 2.2.2.5 Documentation提取
  - 2.2.2.5.1 SDK examples
  - 2.2.2.5.2 API reference
  - 2.2.2.5.3 Tool integration guides
  - 2.2.2.5.4 Changelog/release notes

#### 2.2.3 Multi-source Verification
- 2.2.3.1 Cross-reference检查
  - 2.2.3.1.1 官方API vs 官方文档
  - 2.2.3.1.2 官方价格 vs OpenRouter价格
  - 2.2.3.1.3 官方声称 vs 实际API响应
- 2.2.3.2 冲突处理
  - 2.2.3.2.1 记录所有源的数据
  - 2.2.3.2.2 标记conflict = true
  - 2.2.3.2.3 按证据等级排序
  - 2.2.3.2.4 选择最可靠源作为primary
  - 2.2.3.2.5 保留其他源作为alternatives
- 2.2.3.3 时效性验证
  - 2.2.3.3.1 检查数据published_at
  - 2.2.3.3.2 检查effective_at
  - 2.2.3.3.3 如果时间过旧，降低confidence

#### 2.2.4 Evidence Chain建立
- 2.2.4.1 每条数据记录evidence
  - 2.2.4.1.1 source_id
  - 2.2.4.1.2 source_type (API/DOC/PRICING/BLOG/SEARCH/GITHUB)
  - 2.2.4.1.3 source_url
  - 2.2.4.1.4 fetched_at
  - 2.2.4.1.5 raw_value（原始提取值）
  - 2.2.4.1.6 normalized_value（规范化后值）
  - 2.2.4.1.7 evidence_level (S0-S6)
- 2.2.4.2 证据等级定义
  - 2.2.4.2.1 S0: 官方API实际响应
  - 2.2.4.2.2 S1: 官方API文档
  - 2.2.4.2.3 S2: 官方Pricing/Plan页
  - 2.2.4.2.4 S3: 官方Blog/Changelog
  - 2.2.4.2.5 S4: 高质量第三方数据库（OpenRouter等）
  - 2.2.4.2.6 S5: 独立评测/社区
  - 2.2.4.2.7 S6: 搜索推断

---

### 2.3 Normalization & Entity Resolution Layer（规范化与实体解析层）

#### 2.3.1 Entity Resolution
- 2.3.1.1 Provider/Gateway识别
  - 2.3.1.1.1 提取canonical_name
    - 2.3.1.1.1.1 从domain提取（openrouter.ai → OpenRouter）
    - 2.3.1.1.1.2 从官网title/brand提取
    - 2.3.1.1.1.3 从GitHub org提取
  - 2.3.1.1.2 识别aliases
    - 2.3.1.1.2.1 openrouter, OpenRouter, openrouter.ai
    - 2.3.1.1.2.2 302.ai, 302AI, 302 AI
  - 2.3.1.1.3 识别实体类型
    - 2.3.1.1.3.1 MODEL_LAB: Anthropic, OpenAI, Google
    - 2.3.1.1.3.2 CLOUD_MAAS: 阿里云, 华为云, AWS Bedrock
    - 2.3.1.1.3.3 INFERENCE_PROVIDER: 硅基流动, Replicate
    - 2.3.1.1.3.4 GATEWAY: 302.AI, DeerAPI
    - 2.3.1.1.3.5 AGGREGATOR: OpenRouter, AIHubMix
  - 2.3.1.1.4 去重合并
    - 2.3.1.1.4.1 domain完全匹配 → 同一实体
    - 2.3.1.1.4.2 name高度相似 + API base相同 → 同一实体
    - 2.3.1.1.4.3 合并evidence链
    - 2.3.1.1.4.4 合并aliases

- 2.3.1.2 Model识别
  - 2.3.1.2.1 提取canonical_model_id
    - 2.3.1.2.1.1 官方model_id优先
    - 2.3.1.2.1.2 处理provider前缀（去除或保留）
  - 2.3.1.2.2 识别model family
    - 2.3.1.2.2.1 gpt-4o → GPT-4o family
    - 2.3.1.2.2.2 claude-3.5-sonnet → Claude 3.5 family
  - 2.3.1.2.3 识别version
    - 2.3.1.2.3.1 从model_id提取日期：gpt-4-turbo-2024-04-09
    - 2.3.1.2.3.2 从changelog关联version
  - 2.3.1.2.4 识别alias
    - 2.3.1.2.4.1 gpt-4-turbo → gpt-4-turbo-preview
    - 2.3.1.2.4.2 claude-3-opus-20240229 → claude-3-opus-latest
  - 2.3.1.2.5 去重合并
    - 2.3.1.2.5.1 多个provider提供同一模型 → 同一model，多个access_route
    - 2.3.1.2.5.2 不同model_id但指向同一版本 → 同一model，记录aliases

#### 2.3.2 Canonical Name建立
- 2.3.2.1 规范化规则
  - 2.3.2.1.1 Provider名称首字母大写
  - 2.3.2.1.2 Model ID保持官方格式
  - 2.3.2.1.3 Protocol名称全大写（OPENAI_CHAT_COMPLETIONS）
  - 2.3.2.1.4 Currency统一为大写（USD, CNY）
- 2.3.2.2 ID生成
  - 2.3.2.2.1 provider_id: slug(canonical_name)
  - 2.3.2.2.2 model_id: canonical_model_id
  - 2.3.2.2.3 route_id: {provider_id}:{model_id}
  - 2.3.2.2.4 plan_id: {provider_id}:{plan_name_slug}

#### 2.3.3 Type Classification
- 2.3.3.1 确定实体类型
  - 2.3.3.1.1 如果有/v1/models API → PROVIDER或GATEWAY
  - 2.3.3.1.2 如果列出多个上游provider → GATEWAY/AGGREGATOR
  - 2.3.3.1.3 如果只提供自家模型 → PROVIDER
  - 2.3.3.1.4 如果是云服务商 → CLOUD_MAAS
  - 2.3.3.1.5 如果提供GPU推理 → INFERENCE_PROVIDER
- 2.3.3.2 争议处理
  - 2.3.3.2.1 如果类型不明确 → type = DISPUTED
  - 2.3.3.2.2 记录争议原因
  - 2.3.3.2.3 记录候选类型
  - 2.3.3.2.4 等待更多证据

#### 2.3.4 Relationship Mapping
- 2.3.4.1 建立Model-Provider关系
  - 2.3.4.1.1 记录哪些Provider提供哪些Model
  - 2.3.4.1.2 区分official vs third-party
- 2.3.4.2 建立Provider-Gateway关系
  - 2.3.4.2.1 Gateway路由到哪些上游Provider
  - 2.3.4.2.2 记录路由规则（如果公开）
- 2.3.4.3 建立Model-Protocol关系
  - 2.3.4.3.1 哪些模型支持哪些协议
  - 2.3.4.3.2 通过哪个Route支持
- 2.3.4.4 建立Route-Tool关系
  - 2.3.4.4.1 哪些工具可以使用哪些Route
  - 2.3.4.4.2 兼容性级别（FULL/PARTIAL/UNKNOWN）

---

### 2.4 Storage & Relationship Graph Layer（存储与关系图层）

#### 2.4.1 Core Entities Schema

- 2.4.1.1 models表
  ```sql
  model_id (PK)
  canonical_model_id
  canonical_name
  display_name
  maker
  family
  version
  release_date
  announcement_date
  status (ACTIVE/DEPRECATED/BETA)
  license
  open_weight
  context_window
  max_output_tokens
  modalities (JSON array)
  capabilities (JSON)
  created_at
  updated_at
  ```

- 2.4.1.2 providers表
  ```sql
  provider_id (PK)
  canonical_name
  type (MODEL_LAB/CLOUD_MAAS/INFERENCE_PROVIDER/GATEWAY/AGGREGATOR)
  domain
  legal_name
  github_org
  api_base_url
  status
  region
  created_at
  discovered_at
  verified_at
  updated_at
  ```

- 2.4.1.3 access_routes表
  ```sql
  route_id (PK)
  model_id (FK)
  provider_id (FK)
  gateway_id (FK, nullable)
  base_url
  endpoint
  region
  status
  context_window_override
  max_output_override
  created_at
  updated_at
  ```

- 2.4.1.4 protocols表
  ```sql
  protocol_id (PK)
  name
  type (OPENAI_CHAT/OPENAI_RESPONSES/ANTHROPIC_MESSAGES)
  version
  ```

- 2.4.1.5 route_protocols表（关联表）
  ```sql
  route_id (FK)
  protocol_id (FK)
  supported
  verified_at
  evidence_id (FK)
  ```

- 2.4.1.6 capabilities表
  ```sql
  capability_id (PK)
  name (STREAMING/TOOL_CALLING/STRUCTURED_OUTPUT/VISION/AUDIO/MCP)
  category
  ```

- 2.4.1.7 route_capabilities表（关联表）
  ```sql
  route_id (FK)
  capability_id (FK)
  supported (FULL/PARTIAL/NO/UNKNOWN)
  verified_at
  evidence_id (FK)
  ```

- 2.4.1.8 tools表
  ```sql
  tool_id (PK)
  name (Claude Code/Cursor/Codex/OpenCode/Cline等)
  type (IDE/CLI/SDK/FRAMEWORK)
  vendor
  version
  ```

- 2.4.1.9 route_tools表（关联表）
  ```sql
  route_id (FK)
  tool_id (FK)
  compatibility (FULL/PARTIAL/NO/UNKNOWN)
  verified_at
  evidence_id (FK)
  notes
  ```

- 2.4.1.10 prices表
  ```sql
  price_id (PK)
  route_id (FK)
  input_price
  output_price
  cache_write_price
  cache_read_price
  image_price
  audio_price
  unit (PER_TOKEN/PER_1K/PER_1M)
  currency
  billing_model (PAY_AS_GO/TIERED)
  region
  effective_at
  expires_at
  source_id (FK)
  created_at
  ```

- 2.4.1.11 price_tiers表
  ```sql
  tier_id (PK)
  price_id (FK)
  tier_start (tokens)
  tier_end (tokens, nullable)
  input_price
  output_price
  ```

- 2.4.1.12 coding_plans表
  ```sql
  plan_id (PK)
  provider_id (FK)
  name
  monthly_price
  yearly_price
  currency
  billing_cycle
  five_hour_limit
  daily_limit
  weekly_limit
  monthly_limit
  credit_limit
  token_limit
  request_limit
  unit (TOKEN/CREDIT/REQUEST/MESSAGE/TIME_WINDOW)
  reset_rule (ROLLING/FIXED)
  reset_period
  concurrency
  included_models (JSON array)
  included_tools (JSON array)
  overage_allowed
  overage_price
  effective_at
  expires_at
  source_id (FK)
  created_at
  ```

- 2.4.1.13 cache_policies表
  ```sql
  policy_id (PK)
  route_id (FK)
  cache_type (PROVIDER_PROMPT/GATEWAY_RESPONSE)
  supported
  ttl
  minimum_tokens
  cache_key_strategy
  sticky_routing
  verified_at
  source_id (FK)
  ```

- 2.4.1.14 cache_observations表
  ```sql
  observation_id (PK)
  route_id (FK)
  date
  eligible_input_tokens
  cached_input_tokens
  cache_write_tokens
  cache_hit_requests
  cache_eligible_requests
  token_cache_hit_rate (computed)
  request_cache_hit_rate (computed)
  effective_cost_per_token
  ```

- 2.4.1.15 rate_limits表
  ```sql
  limit_id (PK)
  route_id (FK)
  rpm
  tpm
  rpd
  concurrent_requests
  limit_type (OFFICIAL/DOCUMENTED/OBSERVED)
  verified_at
  source_id (FK)
  ```

- 2.4.1.16 reliability_observations表
  ```sql
  observation_id (PK)
  route_id (FK)
  date
  avg_latency_ms
  avg_ttft_ms
  avg_tokens_per_second
  error_rate
  rate_limit_429_rate
  server_error_5xx_rate
  timeout_rate
  availability
  request_count
  ```

- 2.4.1.17 benchmarks表
  ```sql
  benchmark_id (PK)
  model_id (FK)
  benchmark_name (MMLU/HumanEval/GPQA等)
  score
  rank
  date
  source_id (FK)
  ```

- 2.4.1.18 quality_assessments表
  ```sql
  assessment_id (PK)
  model_id (FK)
  dimension (CODING/REASONING/AGENT/MATH/CHINESE/VISION等)
  assessment_type (OFFICIAL_CLAIM/BENCHMARK/INDEPENDENT/OBSERVED)
  score
  rating
  notes
  date
  source_id (FK)
  ```

- 2.4.1.19 sources表
  ```sql
  source_id (PK)
  source_type (API/DOC/PRICING/BLOG/CHANGELOG/SEARCH/GITHUB/REGISTRY)
  url
  title
  domain
  published_at
  effective_at
  fetched_at
  verified_at
  evidence_level (S0-S6)
  raw_data (JSON)
  ```

- 2.4.1.20 evidence表
  ```sql
  evidence_id (PK)
  entity_type (MODEL/PROVIDER/ROUTE/PRICE/PLAN/CACHE/CAPABILITY)
  entity_id
  field_name
  raw_value
  normalized_value
  source_id (FK)
  confidence
  created_at
  ```

- 2.4.1.21 candidates表
  ```sql
  candidate_id (PK)
  candidate_type (PROVIDER/GATEWAY/MODEL)
  name
  domain
  api_base
  first_discovered_at
  discovery_sources (JSON array)
  status (CANDIDATE/VERIFYING/VERIFIED/REJECTED)
  confidence
  evidence (JSON)
  promoted_to_id (nullable, 转正后的实体ID)
  promoted_at
  ```

- 2.4.1.22 snapshots表
  ```sql
  snapshot_id (PK)
  snapshot_date
  entity_type
  entity_id
  snapshot_data (JSON)
  created_at
  ```

- 2.4.1.23 change_events表
  ```sql
  event_id (PK)
  event_date
  event_type (NEW_MODEL/PRICE_UP/PLAN_CHANGED等)
  entity_type
  entity_id
  old_value (JSON)
  new_value (JSON)
  diff (JSON)
  significance (LOW/MEDIUM/HIGH/CRITICAL)
  created_at
  ```

#### 2.4.2 Relationship Graph建立
- 2.4.2.1 多对多关系
  - 2.4.2.1.1 Model × Provider (access_routes)
  - 2.4.2.1.2 Route × Protocol (route_protocols)
  - 2.4.2.1.3 Route × Capability (route_capabilities)
  - 2.4.2.1.4 Route × Tool (route_tools)
- 2.4.2.2 一对多关系
  - 2.4.2.2.1 Provider → Plans
  - 2.4.2.2.2 Route → Prices
  - 2.4.2.2.3 Route → Cache Policies
  - 2.4.2.2.4 Route → Rate Limits
- 2.4.2.3 图查询能力
  - 2.4.2.3.1 给定Model，找到所有Access Routes
  - 2.4.2.3.2 给定Tool，找到兼容的Routes
  - 2.4.2.3.3 给定Protocol，找到支持的Routes
  - 2.4.2.3.4 给定价格范围，找到符合的Routes

---

### 2.5 Analysis & Diff Layer（分析与变更检测层）

#### 2.5.1 Daily Snapshot
- 2.5.1.1 快照执行
  - 2.5.1.1.1 每日UTC 02:00执行
  - 2.5.1.1.2 对所有活跃实体创建快照
  - 2.5.1.1.3 快照包含完整状态JSON
- 2.5.1.2 快照范围
  - 2.5.1.2.1 所有models
  - 2.5.1.2.2 所有providers
  - 2.5.1.2.3 所有access_routes
  - 2.5.1.2.4 所有prices
  - 2.5.1.2.5 所有coding_plans
  - 2.5.1.2.6 所有cache_policies

#### 2.5.2 Diff Detection
- 2.5.2.1 Model Diff
  - 2.5.2.1.1 检测new model
  - 2.5.2.1.2 检测context_window变化
  - 2.5.2.1.3 检测max_output_tokens变化
  - 2.5.2.1.4 检测capabilities变化
  - 2.5.2.1.5 检测status变化（ACTIVE→DEPRECATED）
- 2.5.2.2 Provider/Gateway Diff
  - 2.5.2.2.1 检测new provider
  - 2.5.2.2.2 检测api_base_url变化
  - 2.5.2.2.3 检测status变化
  - 2.5.2.2.4 检测type变化
- 2.5.2.3 Price Diff
  - 2.5.2.3.1 检测价格上涨
    - 2.5.2.3.1.1 计算涨幅百分比
    - 2.5.2.3.1.2 标记significance
  - 2.5.2.3.2 检测价格下降
    - 2.5.2.3.2.1 计算降幅百分比
    - 2.5.2.3.2.2 标记significance
  - 2.5.2.3.3 检测cache价格变化
  - 2.5.2.3.4 检测阶梯定价规则变化
- 2.5.2.4 Plan Diff
  - 2.5.2.4.1 检测new plan
  - 2.5.2.4.2 检测plan removed
  - 2.5.2.4.3 检测月费变化
  - 2.5.2.4.4 检测额度变化
    - 2.5.2.4.4.1 5h limit
    - 2.5.2.4.4.2 daily/weekly/monthly
  - 2.5.2.4.5 检测included models变化
  - 2.5.2.4.6 检测reset规则变化
- 2.5.2.5 Capability Diff
  - 2.5.2.5.1 检测protocol支持新增
  - 2.5.2.5.2 检测protocol支持移除
  - 2.5.2.5.3 检测tool兼容性变化
  - 2.5.2.5.4 检测cache支持变化
- 2.5.2.6 Route Diff
  - 2.5.2.6.1 检测new route (新Provider提供已有Model)
  - 2.5.2.6.2 检测route removed
  - 2.5.2.6.3 检测endpoint变化

#### 2.5.3 Change Event Generation
- 2.5.3.1 Event创建
  - 2.5.3.1.1 每个diff创建一个event
  - 2.5.3.1.2 记录old_value和new_value
  - 2.5.3.1.3 计算diff (JSON patch格式)
  - 2.5.3.1.4 分配event_type
- 2.5.3.2 Event类型定义
  - 2.5.3.2.1 NEW_MODEL
  - 2.5.3.2.2 MODEL_UPDATED
  - 2.5.3.2.3 MODEL_DEPRECATED
  - 2.5.3.2.4 NEW_PROVIDER
  - 2.5.3.2.5 PROVIDER_UPDATED
  - 2.5.3.2.6 NEW_GATEWAY
  - 2.5.3.2.7 NEW_ROUTE
  - 2.5.3.2.8 ROUTE_REMOVED
  - 2.5.3.2.9 PRICE_UP
  - 2.5.3.2.10 PRICE_DOWN
  - 2.5.3.2.11 CACHE_POLICY_CHANGED
  - 2.5.3.2.12 CACHE_PRICE_CHANGED
  - 2.5.3.2.13 PLAN_ADDED
  - 2.5.3.2.14 PLAN_CHANGED
  - 2.5.3.2.15 PLAN_REMOVED
  - 2.5.3.2.16 PROTOCOL_SUPPORT_ADDED
  - 2.5.3.2.17 PROTOCOL_SUPPORT_REMOVED
  - 2.5.3.2.18 TOOL_SUPPORT_ADDED
  - 2.5.3.2.19 TOOL_SUPPORT_REMOVED
  - 2.5.3.2.20 RATE_LIMIT_CHANGED
  - 2.5.3.2.21 CONTEXT_CHANGED
  - 2.5.3.2.22 STATUS_CHANGED
- 2.5.3.3 Significance评分
  - 2.5.3.3.1 CRITICAL: 模型下线、服务不可用、重大价格上涨(>50%)
  - 2.5.3.3.2 HIGH: 新重要模型、价格变化(20-50%)、Plan重大变化
  - 2.5.3.3.3 MEDIUM: 新小众模型、价格小幅变化(<20%)、能力新增
  - 2.5.3.3.4 LOW: 文档更新、非关键参数变化

#### 2.5.4 Trend Analysis
- 2.5.4.1 价格趋势
  - 2.5.4.1.1 过去30天价格变化统计
  - 2.5.4.1.2 识别降价趋势 vs 涨价趋势
  - 2.5.4.1.3 计算平均降幅/涨幅
- 2.5.4.2 新模型发布趋势
  - 2.5.4.2.1 每周新模型数量
  - 2.5.4.2.2 按厂商分组
  - 2.5.4.2.3 识别发布高峰期
- 2.5.4.3 Provider生态趋势
  - 2.5.4.3.1 新Provider增长率
  - 2.5.4.3.2 Gateway vs Direct Provider比例
  - 2.5.4.3.3 协议支持覆盖率变化

---

### 2.6 Intelligence Generation Layer（情报生成层）

#### 2.6.1 Daily Market Intelligence报告
- 2.6.1.1 报告结构
  ```
  # AI Daily Market Intelligence
  Date: YYYY-MM-DD
  
  ## Executive Summary
  - X new models
  - Y new providers
  - Z price changes
  - Notable events
  
  ## 1. New Models
  ## 2. New Providers & Gateways
  ## 3. Price Changes
  ## 4. Coding Plan Updates
  ## 5. Cache Policy Changes
  ## 6. Protocol & Tool Support Changes
  ## 7. Availability & Performance Changes
  ## 8. Deprecations & Removals
  ```

- 2.6.1.2 Section 1: New Models
  ```markdown
  | Model | Maker | Context | Modalities | Open Weight | Access Routes | Price Range |
  |-------|-------|---------|------------|-------------|---------------|-------------|
  | gpt-4.5-turbo | OpenAI | 128K | Text, Vision | No | OpenAI, OpenRouter, 302.AI | $10-15/1M tokens |
  ```
  - 2.6.1.2.1 列出所有昨日新发现的模型
  - 2.6.1.2.2 区分official release vs first discovered
  - 2.6.1.2.3 标注主要能力
  - 2.6.1.2.4 列出可用访问渠道
  - 2.6.1.2.5 给出价格区间

- 2.6.1.3 Section 2: New Providers & Gateways
  ```markdown
  ### NewAI Platform
  - Type: GATEWAY
  - API Base: https://api.newai.example
  - Protocols: OpenAI Chat, Anthropic Messages
  - Models: 50+ (including GPT-4, Claude-3.5)
  - Pricing: $X/1M input tokens
  - Tools: Compatible with Cursor, Claude Code
  - First Discovered: 2026-XX-XX
  - Verification Status: VERIFIED
  ```
  - 2.6.1.3.1 详细描述新发现的平台
  - 2.6.1.3.2 技术能力summary
  - 2.6.1.3.3 工具兼容性
  - 2.6.1.3.4 价格竞争力

- 2.6.1.4 Section 3: Price Changes
  ```markdown
  | Model | Route | Old Price | New Price | Change | Effective Date |
  |-------|-------|-----------|-----------|--------|----------------|
  | gpt-4o | OpenAI | $5/1M | $2.5/1M | -50% ↓ | 2026-XX-XX |
  | claude-3-opus | Anthropic | $15/1M | $12/1M | -20% ↓ | 2026-XX-XX |
  ```
  - 2.6.1.4.1 按Model分组
  - 2.6.1.4.2 计算变化百分比
  - 2.6.1.4.3 标注涨/降
  - 2.6.1.4.4 注明生效日期
  - 2.6.1.4.5 包含cache price变化

- 2.6.1.5 Section 4: Coding Plan Updates
  ```markdown
  ### Anthropic Claude Code Plan
  - Monthly Price: $20 → $18 (-10%)
  - 5-hour Limit: Unchanged (still 5h rolling window)
  - Weekly Limit: 100 sessions → 120 sessions (+20%)
  - Overage: $0.10/session → $0.08/session
  - Effective: 2026-XX-XX
  ```
  - 2.6.1.5.1 列出所有Plan变化
  - 2.6.1.5.2 详细对比before/after
  - 2.6.1.5.3 计算实际影响

- 2.6.1.6 Section 5: Cache Policy Changes
  ```markdown
  - OpenRouter: Added prompt caching for Claude models
    - Cache Write: $3.75/1M tokens
    - Cache Read: $0.30/1M tokens (vs $15/1M regular)
    - TTL: 5 minutes
    - Minimum: 1024 tokens
  ```

- 2.6.1.7 Section 6: Protocol & Tool Support Changes
  ```markdown
  - 302.AI: Added OpenAI Responses API support
  - DeerAPI: Added Anthropic Messages API support
  - SiliconFlow: Now compatible with Cursor (verified)
  ```

- 2.6.1.8 Section 7: Availability & Performance
  ```markdown
  - OpenRouter: Increased rate limit to 10000 RPM (was 5000)
  - Provider X: Observed 429 rate increased to 15% (alert)
  - Provider Y: TTFT improved by 30% (avg 500ms → 350ms)
  ```

- 2.6.1.9 Section 8: Deprecations & Removals
  ```markdown
  - gpt-4-0314: Deprecated by OpenAI, sunset date 2026-XX-XX
  - Provider Z: Removed claude-2.0 from model list
  ```

#### 2.6.2 Query Interface设计
- 2.6.2.1 模型发现查询
  - 2.6.2.1.1 "今天有哪些新模型？"
    - SQL: SELECT * FROM models WHERE DATE(discovered_at) = CURRENT_DATE
  - 2.6.2.1.2 "过去7天有哪些值得关注的新模型？"
    - 关联quality_assessments，过滤高分模型
- 2.6.2.2 可用性查询
  - 2.6.2.2.1 "GPT-4o在哪里可以用？"
    ```sql
    SELECT p.canonical_name, ar.base_url, pr.input_price
    FROM access_routes ar
    JOIN providers p ON ar.provider_id = p.provider_id
    JOIN prices pr ON ar.route_id = pr.route_id
    WHERE ar.model_id = 'gpt-4o' AND ar.status = 'ACTIVE'
    ORDER BY pr.input_price ASC
    ```
  - 2.6.2.2.2 "哪些渠道支持OpenAI Responses？"
    ```sql
    SELECT DISTINCT p.canonical_name, ar.base_url
    FROM route_protocols rp
    JOIN access_routes ar ON rp.route_id = ar.route_id
    JOIN providers p ON ar.provider_id = p.provider_id
    JOIN protocols pt ON rp.protocol_id = pt.protocol_id
    WHERE pt.name = 'OPENAI_RESPONSES' AND rp.supported = TRUE
    ```
- 2.6.2.3 工具兼容查询
  - 2.6.2.3.1 "哪些渠道可以直接给Claude Code使用？"
    ```sql
    SELECT p.canonical_name, ar.base_url, rt.compatibility
    FROM route_tools rt
    JOIN access_routes ar ON rt.route_id = ar.route_id
    JOIN providers p ON ar.provider_id = p.provider_id
    JOIN tools t ON rt.tool_id = t.tool_id
    WHERE t.name = 'Claude Code' AND rt.compatibility IN ('FULL', 'PARTIAL')
    ORDER BY rt.compatibility DESC
    ```
- 2.6.2.4 价格比较查询
  - 2.6.2.4.1 "gpt-4o哪里最便宜？"
    ```sql
    SELECT p.canonical_name, pr.input_price, pr.output_price, pr.currency
    FROM prices pr
    JOIN access_routes ar ON pr.route_id = ar.route_id
    JOIN providers p ON ar.provider_id = p.provider_id
    WHERE ar.model_id = 'gpt-4o' AND pr.expires_at IS NULL
    ORDER BY pr.input_price ASC
    LIMIT 10
    ```
  - 2.6.2.4.2 注意事项：输出时必须说明
    - "以下是各渠道公开价格，按input price排序"
    - "实际成本还需考虑cache、阶梯定价、地区等因素"
    - "不构成综合推荐"
- 2.6.2.5 Coding Plan对比查询
  - 2.6.2.5.1 "对比Claude Code vs Cursor vs Codex的Plan"
    ```sql
    SELECT provider_id, name, monthly_price, five_hour_limit,
           daily_limit, weekly_limit, monthly_limit,
           unit, reset_rule, overage_price
    FROM coding_plans
    WHERE name LIKE '%Code%' OR name LIKE '%Cursor%' OR name LIKE '%Codex%'
    ```
  - 2.6.2.5.2 输出格式化表格，清晰对比
- 2.6.2.6 Cache性能查询
  - 2.6.2.6.1 "哪个Provider的Cache Hit Rate最高？"
    ```sql
    SELECT p.canonical_name, AVG(co.token_cache_hit_rate) as avg_hit_rate
    FROM cache_observations co
    JOIN access_routes ar ON co.route_id = ar.route_id
    JOIN providers p ON ar.provider_id = p.provider_id
    WHERE co.date >= CURRENT_DATE - 7
    GROUP BY p.provider_id
    ORDER BY avg_hit_rate DESC
    ```
  - 2.6.2.6.2 明确标注：这是实测数据，基于过去7天观测
- 2.6.2.7 稳定性查询
  - 2.6.2.7.1 "哪个Route的TTFT最低？"
    ```sql
    SELECT p.canonical_name, m.canonical_name, AVG(ro.avg_ttft_ms) as avg_ttft
    FROM reliability_observations ro
    JOIN access_routes ar ON ro.route_id = ar.route_id
    JOIN providers p ON ar.provider_id = p.provider_id
    JOIN models m ON ar.model_id = m.model_id
    WHERE ro.date >= CURRENT_DATE - 7
    GROUP BY ar.route_id
    ORDER BY avg_ttft ASC
    LIMIT 10
    ```

#### 2.6.3 Availability Analysis
- 2.6.3.1 模型可用性矩阵
  - 2.6.3.1.1 Model × Provider矩阵
  - 2.6.3.1.2 标注各Route状态
  - 2.6.3.1.3 标注价格区间
- 2.6.3.2 工具兼容矩阵
  - 2.6.3.2.1 Tool × Provider矩阵
  - 2.6.3.2.2 标注兼容级别
- 2.6.3.3 协议支持矩阵
  - 2.6.3.3.1 Protocol × Provider矩阵
  - 2.6.3.3.2 区分支持程度

#### 2.6.4 Cost Analysis
- 2.6.4.1 价格排名
  - 2.6.4.1.1 按模型分组，列出各Route价格排名
  - 2.6.4.1.2 包含input, output, cache价格
- 2.6.4.2 Coding Plan性价比
  - 2.6.4.2.1 计算estimated cost per token
  - 2.6.4.2.2 对比API pricing vs Plan pricing
  - 2.6.4.2.3 给出breakeven point
  - 2.6.4.2.4 明确标注：这是估算，不是官方等效价格
- 2.6.4.3 Cache节省分析
  - 2.6.4.3.1 基于实测hit rate
  - 2.6.4.3.2 计算actual effective cost
  - 2.6.4.3.3 对比有cache vs 无cache

---

## 3. Ubuntu部署方案

### 3.1 技术栈选择

#### 3.1.1 编程语言与框架
- 3.1.1.1 Python 3.11+
  - 3.1.1.1.1 主采集逻辑、数据处理、API客户端
  - 3.1.1.1.2 库：httpx, pydantic, beautifulsoup4, lxml, feedparser
- 3.1.1.2 PostgreSQL 16+
  - 3.1.1.2.1 主数据库，存储所有实体和关系
  - 3.1.1.2.2 使用JSONB字段存储灵活数据
- 3.1.1.3 Redis 7+
  - 3.1.1.3.1 任务队列（Celery backend）
  - 3.1.1.3.2 Cache层
  - 3.1.1.3.3 Rate limiting
- 3.1.1.4 Celery
  - 3.1.1.4.1 异步任务执行
  - 3.1.1.4.2 定时任务（Celery Beat）

#### 3.1.2 调度方案
- 3.1.2.1 Celery Beat
  - 3.1.2.1.1 定义每日任务schedule
  - 3.1.2.1.2 管理任务依赖和顺序
  - 3.1.2.1.3 失败重试机制
- 3.1.2.2 备选：systemd timer
  - 3.1.2.2.1 如果不需要分布式，可用systemd timer
  - 3.1.2.2.2 更简单，更可靠

#### 3.1.3 API客户端
- 3.1.3.1 httpx
  - 3.1.3.1.1 异步HTTP client
  - 3.1.3.1.2 支持HTTP/2
  - 3.1.3.1.3 timeout和retry配置
- 3.1.3.2 openai SDK
  - 3.1.3.2.1 官方SDK用于测试OpenAI兼容性
- 3.1.3.3 anthropic SDK
  - 3.1.3.3.1 官方SDK用于测试Anthropic兼容性

#### 3.1.4 数据提取
- 3.1.4.1 Structured: 直接JSON API
- 3.1.4.2 Semi-structured: BeautifulSoup4 + lxml
- 3.1.4.3 JavaScript-rendered: 尽量避免，如必需则使用playwright

### 3.2 项目结构

```
ai-market-intelligence/
├── src/
│   ├── discovery/
│   │   ├── registry_sources.py      # OpenRouter, HF等
│   │   ├── official_sources.py      # 厂商官网
│   │   ├── search_discovery.py      # 搜索引擎
│   │   ├── github_discovery.py      # GitHub搜索
│   │   └── candidate_manager.py     # Candidate管理
│   ├── verification/
│   │   ├── technical_fingerprint.py # API探测
│   │   ├── extractors/
│   │   │   ├── model_extractor.py
│   │   │   ├── pricing_extractor.py
│   │   │   ├── plan_extractor.py
│   │   │   └── cache_extractor.py
│   │   └── verifier.py              # 多源验证
│   ├── normalization/
│   │   ├── entity_resolver.py       # 实体解析
│   │   ├── canonical.py             # 规范化
│   │   └── relationship_mapper.py   # 关系建立
│   ├── storage/
│   │   ├── models.py                # SQLAlchemy models
│   │   ├── repositories.py          # Data access layer
│   │   └── migrations/              # Alembic migrations
│   ├── analysis/
│   │   ├── snapshot.py              # 快照
│   │   ├── diff.py                  # Diff检测
│   │   ├── change_detector.py       # 变化分类
│   │   └── trend_analyzer.py        # 趋势分析
│   ├── intelligence/
│   │   ├── daily_report.py          # 每日报告生成
│   │   ├── query_interface.py       # 查询接口
│   │   └── templates/               # 报告模板
│   ├── tasks/
│   │   ├── celery_app.py            # Celery配置
│   │   ├── discovery_tasks.py       # Discovery任务
│   │   ├── verification_tasks.py    # Verification任务
│   │   ├── snapshot_tasks.py        # Snapshot任务
│   │   └── daily_tasks.py           # 每日主任务
│   └── utils/
│       ├── http_client.py           # HTTP工具
│       ├── rate_limiter.py          # Rate limiting
│       └── logger.py                # Logging
├── config/
│   ├── settings.py                  # 配置管理
│   └── sources.yaml                 # Source配置
├── scripts/
│   ├── init_db.py                   # 数据库初始化
│   ├── seed_sources.py              # Seed已知sources
│   └── manual_verify.py             # 手动验证工具
├── tests/
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
├── requirements.txt
└── README.md
```

### 3.3 部署步骤

#### 3.3.1 系统准备
```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装依赖
sudo apt install -y python3.11 python3.11-venv python3-pip \
    postgresql-16 postgresql-contrib \
    redis-server \
    git curl wget

# 或使用Docker
sudo apt install -y docker.io docker-compose
```

#### 3.3.2 数据库设置
```bash
# 创建数据库
sudo -u postgres psql
CREATE DATABASE ai_market_intelligence;
CREATE USER ai_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE ai_market_intelligence TO ai_user;
\q

# 运行migrations
cd ai-market-intelligence
python -m alembic upgrade head
```

#### 3.3.3 应用部署
```bash
# 克隆项目
git clone <repo> ai-market-intelligence
cd ai-market-intelligence

# 创建虚拟环境
python3.11 -m venv venv
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 配置环境变量
cp .env.example .env
# 编辑.env填入数据库、Redis、API keys等

# 初始化数据库
python scripts/init_db.py

# Seed已知sources
python scripts/seed_sources.py
```

#### 3.3.4 Celery配置
```bash
# 启动Celery worker
celery -A src.tasks.celery_app worker --loglevel=info

# 启动Celery beat (定时任务)
celery -A src.tasks.celery_app beat --loglevel=info

# 使用systemd管理
sudo cp deploy/celery-worker.service /etc/systemd/system/
sudo cp deploy/celery-beat.service /etc/systemd/system/
sudo systemctl enable celery-worker celery-beat
sudo systemctl start celery-worker celery-beat
```

#### 3.3.5 Docker部署（推荐）
```bash
# 使用docker-compose
cd ai-market-intelligence
docker-compose up -d

# 查看日志
docker-compose logs -f worker

# 执行一次性任务
docker-compose exec worker python scripts/manual_verify.py
```

### 3.4 每日执行流程

#### 3.4.1 任务调度定义
```python
# src/tasks/celery_app.py
from celery.schedules import crontab

app.conf.beat_schedule = {
    'daily-discovery': {
        'task': 'src.tasks.daily_tasks.run_daily_discovery',
        'schedule': crontab(hour=2, minute=0),  # UTC 02:00
    },
}
```

#### 3.4.2 每日主任务流程
```python
# src/tasks/daily_tasks.py
@app.task
def run_daily_discovery():
    """每日发现主任务"""
    logger.info("Starting daily discovery...")
    
    # Phase 1: Discovery (并行)
    group(
        discovery_structured_registries.s(),
        discovery_official_sources.s(),
        discovery_search.s(),
        discovery_github.s(),
    ).apply_async()
    
    # Phase 2: Verification (串行，等Phase 1完成)
    chain(
        wait_for_discovery.s(),
        verify_candidates.s(),
        extract_data.s(),
    ).apply_async()
    
    # Phase 3: Normalization
    normalize_and_resolve.apply_async()
    
    # Phase 4: Snapshot & Diff
    chain(
        create_daily_snapshot.s(),
        detect_changes.s(),
    ).apply_async()
    
    # Phase 5: Intelligence
    generate_daily_report.apply_async()
    
    logger.info("Daily discovery completed")
```

#### 3.4.3 具体任务实现示例
```python
# src/tasks/discovery_tasks.py
@app.task(bind=True, max_retries=3)
def discovery_structured_registries(self):
    """从结构化Registry发现"""
    try:
        # OpenRouter
        openrouter_models = fetch_openrouter_models()
        process_openrouter_data(openrouter_models)
        
        # Hugging Face
        hf_models = fetch_huggingface_models()
        process_hf_data(hf_models)
        
        # ... 其他registries
        
    except Exception as exc:
        logger.error(f"Discovery failed: {exc}")
        raise self.retry(exc=exc, countdown=300)

@app.task
def discovery_search():
    """搜索引擎发现"""
    search_patterns = [
        "OpenAI compatible API",
        "LLM inference API",
        # ... 更多patterns
    ]
    
    for pattern in search_patterns:
        results = web_search(pattern)
        for result in results:
            create_candidate_from_search(result)
```

### 3.5 监控与维护

#### 3.5.1 日志
- 3.5.1.1 使用structured logging (structlog)
- 3.5.1.2 日志级别：DEBUG/INFO/WARNING/ERROR
- 3.5.1.3 日志rotation
- 3.5.1.4 关键事件记录：
  - 新Candidate发现
  - Candidate验证成功/失败
  - API调用失败
  - 数据冲突
  - Change event生成

#### 3.5.2 监控指标
- 3.5.2.1 任务执行时间
- 3.5.2.2 任务成功率
- 3.5.2.3 API调用成功率
- 3.5.2.4 每日新发现数量
- 3.5.2.5 数据库大小增长

#### 3.5.3 告警
- 3.5.3.1 任务连续失败
- 3.5.3.2 关键Source不可用
- 3.5.3.3 数据质量下降
- 3.5.3.4 CRITICAL级change event

### 3.6 Web UI（可选）

#### 3.6.1 FastAPI后端
```python
# src/api/main.py
from fastapi import FastAPI

app = FastAPI()

@app.get("/api/models")
def list_models(skip: int = 0, limit: int = 100):
    """列出所有模型"""
    return query_models(skip, limit)

@app.get("/api/models/{model_id}/routes")
def get_model_routes(model_id: str):
    """获取模型的所有访问路由"""
    return query_access_routes(model_id)

@app.get("/api/daily-report")
def get_daily_report(date: str = None):
    """获取每日报告"""
    return load_daily_report(date or today())

@app.get("/api/search")
def search(q: str, filter_type: str = None):
    """搜索模型/Provider/Plan"""
    return search_entities(q, filter_type)
```

#### 3.6.2 前端（可选）
- 3.6.2.1 React/Vue简单Dashboard
- 3.6.2.2 展示Daily Report
- 3.6.2.3 模型搜索和对比
- 3.6.2.4 价格趋势图表

---

## 4. Discovery机制深入设计

### 4.1 搜索Discovery详细算法

#### 4.1.1 搜索词库管理
```python
# config/search_patterns.yaml
english_patterns:
  - query: "OpenAI compatible API"
    exclude: ["openai.com"]
    frequency: daily
  - query: "LLM inference provider"
    frequency: weekly
  - query: "AI gateway"
    frequency: daily

chinese_patterns:
  - query: "OpenAI兼容API"
    frequency: daily
  - query: "大模型API聚合"
    frequency: daily
```

#### 4.1.2 搜索结果处理
```python
def process_search_result(result):
    """处理单个搜索结果"""
    # 提取domain
    domain = extract_domain(result.url)
    
    # 检查是否已知
    if is_known_entity(domain):
        return
    
    # 检查是否已是Candidate
    candidate = get_candidate_by_domain(domain)
    if candidate:
        # 增加发现次数
        candidate.discovery_count += 1
        candidate.last_seen_at = now()
        return
    
    # 创建新Candidate
    candidate = Candidate(
        candidate_type="PROVIDER",  # 初步猜测
        domain=domain,
        name=extract_site_name(result),
        first_discovered_at=now(),
        discovery_sources=["search"],
        discovery_context={
            "query": result.query,
            "title": result.title,
            "snippet": result.snippet
        },
        status="CANDIDATE",
        confidence="LOW"
    )
    save_candidate(candidate)
```

#### 4.1.3 搜索词自动扩展
```python
def expand_search_patterns(new_provider):
    """从新Provider学习新搜索词"""
    # 分析其技术描述
    keywords = extract_keywords(new_provider.description)
    
    # 分析其domain pattern
    if ".ai" in new_provider.domain:
        add_search_pattern("site:.ai LLM API")
    
    # 分析其合作伙伴
    partners = extract_partners(new_provider)
    for partner in partners:
        if not is_known(partner):
            add_candidate(partner)
```

### 4.2 GitHub Discovery详细算法

#### 4.2.1 Repository分析
```python
def analyze_github_repo(repo):
    """分析GitHub repository"""
    # 读取README
    readme = fetch_file(repo, "README.md")
    
    # 查找API base URL
    api_urls = extract_urls(readme, pattern=r'https?://api\.')
    
    # 查找pricing信息
    has_pricing = "pricing" in readme.lower() or \
                  exists_file(repo, "PRICING.md")
    
    # 查找deployment信息
    deployment_info = extract_deployment_info(readme)
    
    # 判断是否为商业服务
    is_commercial = has_pricing or \
                    "sign up" in readme.lower() or \
                    "api key" in readme.lower()
    
    if is_commercial and api_urls:
        # 创建Candidate
        create_candidate_from_github(repo, api_urls[0])
```

#### 4.2.2 Release监控
```python
def monitor_github_releases():
    """监控已知项目的新release"""
    tracked_repos = get_tracked_github_repos()
    
    for repo in tracked_repos:
        latest_release = github_api.get_latest_release(repo)
        
        if is_new_release(latest_release):
            # 解析changelog
            changelog = latest_release.body
            
            # 提取新模型支持
            new_models = extract_model_mentions(changelog)
            for model in new_models:
                create_model_support_event(repo, model)
            
            # 提取新功能
            new_features = extract_features(changelog)
            for feature in new_features:
                update_capabilities(repo, feature)
```

### 4.3 Technical Fingerprinting详细实现

#### 4.3.1 OpenAI兼容性检测
```python
async def test_openai_compatibility(base_url, api_key):
    """测试OpenAI兼容性"""
    results = {
        "chat_completions": False,
        "responses": False,
        "streaming": False,
        "tool_calling": False,
        "structured_output": False,
        "vision": False,
    }
    
    # 测试 /v1/models
    try:
        models = await httpx.get(f"{base_url}/v1/models",
                                 headers={"Authorization": f"Bearer {api_key}"})
        if models.status_code == 200:
            results["models_endpoint"] = True
    except:
        pass
    
    # 测试 Chat Completions
    try:
        response = await httpx.post(
            f"{base_url}/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "model": "gpt-3.5-turbo",  # 或从models列表选择
                "messages": [{"role": "user", "content": "test"}],
                "max_tokens": 5
            }
        )
        if response.status_code == 200:
            results["chat_completions"] = True
            
            # 检查响应格式
            data = response.json()
            if "choices" in data and "message" in data["choices"][0]:
                results["format_valid"] = True
    except:
        pass
    
    # 测试 Streaming
    try:
        async with httpx.stream(
            "POST",
            f"{base_url}/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "model": "gpt-3.5-turbo",
                "messages": [{"role": "user", "content": "test"}],
                "stream": True
            }
        ) as response:
            if response.status_code == 200:
                async for chunk in response.aiter_text():
                    if chunk.startswith("data: "):
                        results["streaming"] = True
                        break
    except:
        pass
    
    # 测试 Responses API
    try:
        response = await httpx.post(
            f"{base_url}/v1/responses",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "model": "gpt-4o",
                "input": [{"type": "text", "text": "test"}],
                "max_tokens": 5
            }
        )
        if response.status_code == 200:
            results["responses"] = True
    except:
        pass
    
    # 测试 Tool Calling
    try:
        response = await httpx.post(
            f"{base_url}/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "model": "gpt-3.5-turbo",
                "messages": [{"role": "user", "content": "What's the weather?"}],
                "tools": [{
                    "type": "function",
                    "function": {
                        "name": "get_weather",
                        "parameters": {"type": "object", "properties": {}}
                    }
                }]
            }
        )
        if response.status_code == 200:
            data = response.json()
            if "tool_calls" in data["choices"][0]["message"]:
                results["tool_calling"] = True
    except:
        pass
    
    return results
```

#### 4.3.2 Anthropic兼容性检测
```python
async def test_anthropic_compatibility(base_url, api_key):
    """测试Anthropic兼容性"""
    results = {
        "messages": False,
        "streaming": False,
        "tool_use": False,
        "vision": False,
        "prompt_caching": False,
    }
    
    # 测试 Messages API
    try:
        response = await httpx.post(
            f"{base_url}/v1/messages",
            headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01"
            },
            json={
                "model": "claude-3-sonnet-20240229",
                "messages": [{"role": "user", "content": "test"}],
                "max_tokens": 5
            }
        )
        if response.status_code == 200:
            results["messages"] = True
            
            # 检查响应格式
            data = response.json()
            if "content" in data and "role" in data:
                results["format_valid"] = True
    except:
        pass
    
    # 测试 Prompt Caching
    try:
        response = await httpx.post(
            f"{base_url}/v1/messages",
            headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01"
            },
            json={
                "model": "claude-3-sonnet-20240229",
                "messages": [{"role": "user", "content": "test"}],
                "system": [
                    {
                        "type": "text",
                        "text": "Long context...",
                        "cache_control": {"type": "ephemeral"}
                    }
                ],
                "max_tokens": 5
            }
        )
        if response.status_code == 200:
            data = response.json()
            # 检查usage中是否有cache字段
            if "usage" in data and "cache_creation_input_tokens" in data["usage"]:
                results["prompt_caching"] = True
    except:
        pass
    
    return results
```

---

## 5. 数据质量保证机制

### 5.1 证据验证

#### 5.1.1 证据等级校验
```python
def validate_evidence_level(evidence):
    """验证证据等级是否合理"""
    # S0: 必须来自实际API响应
    if evidence.level == "S0":
        assert evidence.source_type == "API"
        assert "response" in evidence.raw_data
    
    # S1: 必须来自官方API文档
    elif evidence.level == "S1":
        assert evidence.source_type in ["DOC", "API_SPEC"]
        assert is_official_domain(evidence.url)
    
    # S2: 必须来自官方Pricing/Plan页
    elif evidence.level == "S2":
        assert evidence.source_type == "PRICING"
        assert is_official_domain(evidence.url)
    
    # ... 其他等级
```

#### 5.1.2 时效性检查
```python
def check_evidence_freshness(evidence):
    """检查证据新鲜度"""
    age = now() - evidence.fetched_at
    
    # 价格数据：超过7天降低confidence
    if evidence.field_name.endswith("_price"):
        if age > timedelta(days=7):
            evidence.confidence *= 0.8
    
    # 模型能力：超过30天降低confidence
    elif evidence.field_name in ["context_window", "modalities"]:
        if age > timedelta(days=30):
            evidence.confidence *= 0.9
    
    # API endpoint：超过1天降低confidence
    elif evidence.field_name == "base_url":
        if age > timedelta(days=1):
            evidence.confidence *= 0.95
```

### 5.2 冲突解决

#### 5.2.1 多源数据对比
```python
def resolve_conflicts(entity, field_name):
    """解决同一字段的冲突数据"""
    evidences = get_evidences(entity, field_name)
    
    if len(evidences) == 1:
        return evidences[0].normalized_value
    
    # 按证据等级排序
    evidences.sort(key=lambda e: (e.evidence_level, -e.confidence))
    
    # 如果最高等级的数据一致，采用
    top_level_evidences = [e for e in evidences if e.evidence_level == evidences[0].evidence_level]
    values = [e.normalized_value for e in top_level_evidences]
    
    if len(set(values)) == 1:
        return values[0]
    
    # 否则标记冲突
    mark_conflict(entity, field_name, evidences)
    
    # 返回最可靠的值作为primary，其他作为alternatives
    return {
        "primary": evidences[0].normalized_value,
        "alternatives": [e.normalized_value for e in evidences[1:]],
        "conflict": True,
        "resolution_strategy": "EVIDENCE_LEVEL_PRIORITY"
    }
```

### 5.3 数据完整性检查

#### 5.3.1 必填字段验证
```python
def validate_entity_completeness(entity):
    """验证实体数据完整性"""
    issues = []
    
    if entity.type == "MODEL":
        required_fields = ["canonical_name", "maker", "context_window"]
        for field in required_fields:
            if not getattr(entity, field):
                issues.append(f"Missing required field: {field}")
    
    elif entity.type == "PROVIDER":
        required_fields = ["canonical_name", "domain", "api_base_url"]
        for field in required_fields:
            if not getattr(entity, field):
                issues.append(f"Missing required field: {field}")
    
    return issues
```

#### 5.3.2 逻辑一致性检查
```python
def validate_logical_consistency(entity):
    """验证逻辑一致性"""
    issues = []
    
    # 价格一致性：cache_read应该 < input
    if hasattr(entity, "prices"):
        for price in entity.prices:
            if price.cache_read_price and price.input_price:
                if price.cache_read_price >= price.input_price:
                    issues.append("Cache read price >= input price (illogical)")
    
    # 日期一致性：discovered_at不应早于release_date
    if hasattr(entity, "discovered_at") and hasattr(entity, "release_date"):
        if entity.release_date and entity.discovered_at < entity.release_date:
            issues.append("Discovered before release date (check dates)")
    
    return issues
```

---

## 6. 输出示例

### 6.1 Daily Intelligence Report示例

```markdown
# AI Daily Market Intelligence
**Date:** 2026-09-30  
**Generated:** 2026-09-30 03:00 UTC

---

## Executive Summary

- **5 new models** discovered (2 officially released, 3 first listed by providers)
- **2 new providers** verified (1 Gateway, 1 Inference Provider)
- **12 price changes** detected (8 decreases, 4 increases)
- **3 coding plan updates**
- **Notable:** GPT-4o price dropped 50%, new Claude 3.7 Opus discovered

---

## 1. New Models

| Model | Maker | Context | Modalities | Open Weight | Release Date | Access Routes | Price Range (input) |
|-------|-------|---------|------------|-------------|--------------|---------------|---------------------|
| claude-3.7-opus | Anthropic | 200K | Text, Vision, Tool Use | No | NOT_CONFIRMED | Anthropic, OpenRouter | $15-18/1M tokens |
| qwen-2.5-coder-32b | Alibaba | 32K | Text, Code | Yes | 2026-09-29 | SiliconFlow, OpenRouter, HuggingFace | $0.50-2/1M tokens |
| gpt-4.5-turbo-preview | OpenAI | 128K | Text, Vision, Audio, Tool Use | No | NOT_CONFIRMED | OpenRouter | $12/1M tokens |
| deepseek-v3 | DeepSeek | 64K | Text, Code | Yes | 2026-09-28 | DeepSeek, SiliconFlow | $0.27/1M tokens |
| gemini-2.0-flash | Google | 1M | Text, Vision, Audio, Video | No | 2026-09-29 | Google AI, Vertex AI | $0.10/1M tokens |

### Details

#### claude-3.7-opus
- **First Discovered:** 2026-09-30 01:23 UTC
- **Discovery Source:** OpenRouter model list
- **Official Release:** NOT_CONFIRMED (Anthropic官网暂无公告)
- **Capabilities:**
  - Extended thinking enabled
  - 200K context window (up from 180K in 3.5)
  - Improved code generation (claimed by OpenRouter)
- **Evidence Level:** S4 (third-party registry)
- **Status:** CANDIDATE (待官方确认)
- **Access Routes:**
  - Anthropic API: $15/1M input, $75/1M output
  - OpenRouter: $18/1M input, $90/1M output
- **Note:** 模型存在但尚未得到Anthropic官方发布公告确认

#### deepseek-v3
- **Release Date:** 2026-09-28 (official)
- **Announcement:** https://deepseek.com/blog/deepseek-v3
- **Context Window:** 64K → 128K (claimed, not yet verified in API)
- **Open Weight:** Yes (Apache 2.0)
- **Benchmark Highlights:**
  - HumanEval: 87.5%
  - MBPP: 84.2%
- **Evidence Level:** S3 (official blog) + S0 (API verified)
- **Access Routes:**
  - DeepSeek API: $0.27/1M input, $1.1/1M output
  - SiliconFlow: $0.50/1M input, $2.0/1M output

---

## 2. New Providers & Gateways

### NewAI Gateway
- **Type:** GATEWAY / AGGREGATOR
- **Domain:** newai.example.com
- **First Discovered:** 2026-09-29 18:45 UTC
- **Discovery Source:** Search ("LLM gateway" + GitHub)
- **Verification Status:** VERIFIED
- **API Base:** https://api.newai.example.com
- **Protocols:**
  - ✅ OpenAI Chat Completions
  - ✅ OpenAI Responses
  - ✅ Anthropic Messages
  - ✅ Streaming
  - ✅ Tool Calling
  - ⚠️ Structured Output (partial support)
- **Supported Models:** 60+ models
  - GPT-4o, GPT-4 Turbo, GPT-3.5
  - Claude 3.5 Sonnet, Opus, Haiku
  - Gemini 1.5 Pro, Flash
  - Llama 3.1 series
  - 等
- **Pricing:** 官方价格 + 小额标记（约+5-10%）
- **Tool Compatibility:**
  - ✅ Cursor (verified)
  - ✅ Claude Code (claimed, not yet verified)
  - ❌ Codex (not tested)
- **Unique Features:**
  - Response caching (5 min TTL)
  - Automatic failover between providers
  - 无需多个API keys
- **Evidence:** S0 (API tested) + S1 (official docs)

### FastInference
- **Type:** INFERENCE_PROVIDER
- **Domain:** fastinference.ai
- **First Discovered:** 2026-09-28 via GitHub
- **API Base:** https://api.fastinference.ai
- **Protocols:**
  - ✅ OpenAI Chat Completions
  - ❌ OpenAI Responses (not supported)
  - ❌ Anthropic Messages (not supported)
- **Supported Models:** Open-weight models only
  - Llama 3.1 series
  - Qwen 2.5 series
  - DeepSeek series
- **Pricing:** $0.10-1.5/1M tokens (varies by model)
- **Performance:** 
  - Advertised: <500ms TTFT, 80 tokens/s
  - Not yet observed

---

## 3. Price Changes

### Significant Decreases ⬇️

| Model | Route | Old Input Price | New Input Price | Change | Old Output Price | New Output Price | Effective Date |
|-------|-------|-----------------|-----------------|--------|------------------|------------------|----------------|
| gpt-4o | OpenAI Official | $5.00/1M | $2.50/1M | -50.0% | $15.00/1M | $10.00/1M | 2026-09-30 |
| gpt-4o | OpenRouter | $5.00/1M | $2.50/1M | -50.0% | $15.00/1M | $10.00/1M | 2026-09-30 |
| gpt-4-turbo | OpenAI Official | $10.00/1M | $7.50/1M | -25.0% | $30.00/1M | $22.50/1M | 2026-09-30 |
| claude-3-opus | Anthropic | $15.00/1M | $12.00/1M | -20.0% | $75.00/1M | $60.00/1M | 2026-09-30 |
| gemini-1.5-pro | Google AI | $3.50/1M | $2.50/1M | -28.6% | $10.50/1M | $7.50/1M | 2026-09-29 |

#### GPT-4o Price Drop Analysis
- **Previous:** $5.00/1M input, $15.00/1M output
- **New:** $2.50/1M input, $10.00/1M output
- **Impact:** 50% reduction, 使GPT-4o成为最便宜的frontier model之一
- **Cache Pricing (unchanged):**
  - Cache Write: $3.75/1M tokens
  - Cache Read: $0.30/1M tokens
- **Source:** Official OpenAI pricing page (S2)
- **Note:** 所有Provider（OpenRouter, 302.AI等）已同步更新

### Price Increases ⬆️

| Model | Route | Old Price | New Price | Change | Effective Date |
|-------|-------|-----------|-----------|--------|----------------|
| claude-2.1 | Anthropic | $8/1M | $10/1M | +25.0% | 2026-09-30 |
| gpt-3.5-turbo | OpenAI | $0.50/1M | $0.75/1M | +50.0% | 2026-09-30 |

#### Analysis
- **claude-2.1涨价:** 可能是引导用户升级到Claude 3系列
- **gpt-3.5-turbo涨价:** 首次涨价，可能反映成本调整

### Cache Pricing Changes

| Model | Route | Cache Type | Old Price | New Price | Change |
|-------|-------|------------|-----------|-----------|--------|
| claude-3-opus | Anthropic | Cache Read | $0.40/1M | $0.30/1M | -25% |
| claude-3-sonnet | Anthropic | Cache Read | $0.20/1M | $0.15/1M | -25% |

---

## 4. Coding Plan Updates

### Anthropic Claude Code Plan
**Provider:** Anthropic  
**Plan Name:** Claude Code Professional

**Changes:**
| Item | Old Value | New Value | Change |
|------|-----------|-----------|--------|
| Monthly Price | $20/month | $20/month | Unchanged |
| 5-hour Limit | 5h rolling | 5h rolling | Unchanged |
| Weekly Limit | 100 sessions | 120 sessions | +20% |
| Daily Limit | None | None | Unchanged |
| Overage Price | $0.10/session | $0.08/session | -20% |

**Effective Date:** 2026-10-01  
**Source:** Official pricing page (S2)

**Analysis:**
- 更宽松的weekly limit (100→120 sessions)
- 更低的overage cost ($0.10→$0.08)
- 月费未变，整体更划算

### Cursor Pro Plan
**Provider:** Cursor

**Changes:**
| Item | Old Value | New Value | Change |
|------|-----------|-----------|--------|
| Monthly Price | $20/month | $20/month | Unchanged |
| Fast Requests | 500/month | 500/month | Unchanged |
| Slow Requests | Unlimited | Unlimited | Unchanged |
| Models | GPT-4, Claude-3.5 | + GPT-4o, Claude-3.7 | Added models |

**Effective Date:** 2026-09-30  
**Source:** Official docs (S1)

**Note:** 
- 增加了对新模型的支持
- 价格和额度未变

### OpenAI Codex (New Plan)
**Provider:** OpenAI  
**Plan Name:** Codex Pro

**NEW PLAN** (首次发现)

| Item | Value |
|------|-------|
| Monthly Price | $25/month |
| Daily Limit | 100 requests |
| Monthly Limit | 2000 requests |
| Reset Rule | Fixed monthly period |
| Models | GPT-4o, GPT-4 Turbo |
| Overage | $0.05/request |

**First Discovered:** 2026-09-29  
**Source:** OpenAI pricing page (S2)  
**Status:** ACTIVE

---

## 5. Cache Policy Changes

### OpenRouter: Prompt Caching Now Supported for Claude Models
- **Models:** All Claude 3.x models
- **Cache Write Price:** $3.75/1M tokens (Opus), $1.00/1M (Sonnet)
- **Cache Read Price:** $0.30/1M tokens (Opus), $0.08/1M (Sonnet)
- **TTL:** 5 minutes
- **Minimum Tokens:** 1024
- **Implementation:** Uses Anthropic's ephemeral cache
- **First Available:** 2026-09-30
- **Source:** OpenRouter docs (S1)

### 302.AI: Response Caching Enabled
- **Type:** GATEWAY_RESPONSE_CACHE (not provider prompt cache)
- **Models:** All supported models
- **TTL:** 10 minutes
- **Cache Key:** Hash of (model + messages)
- **Billing:** 如果cache hit，用户不计费；302.AI不向上游provider发请求
- **Note:** 不同于Anthropic的prompt cache，这是gateway层cache
- **First Available:** 2026-09-29
- **Source:** 302.AI blog (S3)

---

## 6. Protocol & Tool Support Changes

### Protocol Support

#### OpenRouter
- ✅ **Added:** OpenAI Responses API support
  - Models: GPT-4o, GPT-4 Turbo, GPT-4
  - Full compatibility verified (S0)

#### DeerAPI
- ✅ **Added:** Anthropic Messages API support
  - All Claude 3.x models
  - Prompt caching supported
  - Verification: S0 (tested)

### Tool Compatibility

#### SiliconFlow
- ✅ **Now compatible with Cursor**
  - Tested with Claude 3.5 Sonnet
  - Full functionality confirmed
  - Evidence: S5 (community reports) + manual verification

#### AIHubMix
- ⚠️ **Partial Codex support**
  - Some models work, some timeout
  - Investigation ongoing

---

## 7. Availability & Performance Changes

### Rate Limit Increases

| Provider | Model | Old RPM | New RPM | Change |
|----------|-------|---------|---------|--------|
| OpenRouter | All | 5,000 | 10,000 | +100% |
| SiliconFlow | All | 1,000 | 2,000 | +100% |

### Performance Observations (Past 7 Days)

#### Best TTFT (Time To First Token)
| Route | Model | Avg TTFT |
|-------|-------|----------|
| OpenAI Official | gpt-4o | 320ms |
| Anthropic Official | claude-3-sonnet | 380ms |
| Google AI | gemini-1.5-flash | 250ms |

#### Reliability Issues
- **Provider X**: 429 rate increased to 18% (up from 5% last week)
  - Status: Monitoring
  - Action: Consider removing from recommended routes if persists
- **Gateway Y**: Observed 5% 5xx error rate
  - Status: Contacted provider

### Availability Changes
- **All systems operational** for major providers
- No significant outages detected in past 24 hours

---

## 8. Deprecations & Removals

### Model Deprecations
- **gpt-4-0314** (OpenAI)
  - Status: DEPRECATED
  - Sunset Date: 2026-12-31
  - Migration Path: gpt-4-turbo or gpt-4o
  - Source: OpenAI changelog (S3)

- **claude-2.0** (Anthropic)
  - Status: REMOVED from most third-party providers
  - Still available on Anthropic official API until 2026-12-31
  - Migration Path: claude-3-haiku or claude-3-sonnet

### Provider Changes
- **OldAI Gateway**
  - Status: Website offline since 2026-09-28
  - API: Still responding but likely shutting down
  - Action: Remove from recommended providers

---

## Appendix A: Discovery Statistics

### Discovery Sources Performance (Past 24 Hours)

| Source | Candidates Found | Verified | Rejected | Success Rate |
|--------|------------------|----------|----------|--------------|
| OpenRouter | 3 | 3 | 0 | 100% |
| Search (English) | 12 | 2 | 8 | 17% |
| Search (Chinese) | 8 | 1 | 5 | 13% |
| GitHub | 5 | 1 | 3 | 20% |
| Official Sources | 15 | 15 | 0 | 100% |
| **Total** | **43** | **22** | **16** | **51%** |

### New Entities Summary
- Models: 5
- Providers: 2
- Access Routes: 18
- Price Records: 47
- Plan Updates: 3
- Cache Policies: 5

---

## Appendix B: Data Freshness

- **Last Full Discovery Run:** 2026-09-30 02:00 UTC
- **Data Current As Of:** 2026-09-30 03:00 UTC
- **Next Scheduled Run:** 2026-10-01 02:00 UTC
- **Evidence Age:**
  - <24h: 89%
  - 24-48h: 8%
  - >48h: 3%
- **Verification Status:**
  - Verified: 94%
  - Pending: 4%
  - Disputed: 2%

---

*Report generated by AI Market Intelligence Engine v1.0*  
*For questions or data corrections: contact@example.com*
```

---

## 7. 风险与边界

### 7.1 技术风险

#### 7.1.1 反爬虫/Rate Limiting
- **风险:** 频繁访问可能被封IP或限流
- **缓解:**
  - Respect robots.txt
  - 合理间隔（每个domain至少10s间隔）
  - 使用rotating proxies（如需要）
  - API优先，HTML parsing为辅
  - 良好的User-Agent标识

#### 7.1.2 网站结构变化
- **风险:** HTML结构改变导致提取失败
- **缓解:**
  - Schema change detection
  - 多个提取策略（CSS selector + XPath + 正则）
  - 优先使用API和结构化数据
  - 失败后人工审查

#### 7.1.3 API变更
- **风险:** 第三方API格式变化
- **缓解:**
  - Version pinning where possible
  - 自动检测schema变化
  - Graceful degradation
  - 保留raw data用于重新解析

### 7.2 数据质量风险

#### 7.2.1 信息不一致
- **风险:** 不同来源数据冲突
- **缓解:**
  - 多源验证
  - 证据链追溯
  - 明确标注冲突
  - 按证据等级优先级

#### 7.2.2 时效性问题
- **风险:** 数据过时
- **缓解:**
  - 记录所有时间戳
  - 定期refresh
  - 标注数据年龄
  - 降低陈旧数据confidence

#### 7.2.3 虚假信息
- **风险:** 搜索结果包含虚假服务
- **缓解:**
  - Candidate验证流程
  - Technical fingerprinting
  - 不轻易promote到正式实体
  - 多证据要求

### 7.3 覆盖范围边界

#### 7.3.1 无法发现的平台
以下类型平台可能无法自动发现：
- 完全私有的内部服务
- 仅通过邀请访问的服务
- 无公开网站的服务
- 地理限制严格的服务
- 需要特殊认证的服务

#### 7.3.2 语言覆盖
- 主要覆盖：英文、中文
- 其他语言平台可能遗漏
- 需要逐步扩展搜索词库

#### 7.3.3 数据深度限制
- 无法获取需要登录才能看到的信息
- 无法测试需要付费才能使用的模型
- Observed metrics需要实际使用

### 7.4 法律与合规风险

#### 7.4.1 数据使用
- **考虑:** 爬取的数据使用是否合规
- **建议:**
  - 优先使用官方API和公开数据
  - Respect robots.txt和Terms of Service
  - 不存储和分发PII
  - 标注数据来源

#### 7.4.2 价格信息准确性
- **风险:** 价格信息不准确可能误导用户
- **缓解:**
  - 明确标注来源和时间
  - 多源验证
  - 声明：仅供参考，以官方为准
  - 及时更新

---

## 8. 扩展与优化方向

### 8.1 短期优化（1-3个月）

#### 8.1.1 Discovery覆盖扩展
- 增加更多语言的搜索词
- 增加社区平台监控（Reddit, Discord, Slack等）
- 增加行业报告和研究机构数据源

#### 8.1.2 Verification增强
- 实现更完整的协议测试
- 增加工具实际连接测试
- 建立自动化测试账户

#### 8.1.3 数据质量提升
- 实现ML-based entity resolution
- 自动识别和修复数据不一致
- 增强时序数据分析

### 8.2 中期优化（3-6个月）

#### 8.2.1 Observed Metrics
- 部署实际测试agent定期调用各Route
- 收集真实TTFT, TPS, error rate
- 收集真实cache hit rate
- 建立质量评分体系

#### 8.2.2 智能推荐
- 基于用户需求（场景、预算、工具）推荐最佳Route
- 考虑多维度：价格、性能、稳定性、兼容性

#### 8.2.3 用户社区
- 允许用户报告新Provider
- 用户验证和评价
- 众包数据完善

### 8.3 长期愿景（6-12个月）

#### 8.3.1 完全自动化Discovery
- ML模型识别Provider类型
- 自动生成提取规则
- 自适应schema变化

#### 8.3.2 实时监控
- 从每日快照升级到小时级甚至实时
- 价格和可用性实时追踪
- 即时告警

#### 8.3.3 Marketplace功能
- 不仅是情报，还能直接帮助用户选择和购买
- API key统一管理
- 使用分析和成本优化建议

---

## 9. 总结：必须做 vs 应该做 vs 可选

### 9.1 必须做（MVP核心功能）

#### 9.1.1 Discovery Layer
- ✅ Structured Registry采集（OpenRouter, HF等）
- ✅ 官方源监控（厂商官网、Cloud MaaS）
- ✅ Candidate管理机制
- ✅ Entity Resolution基础实现

#### 9.1.2 Verification Layer
- ✅ Technical Fingerprinting（OpenAI, Anthropic兼容性）
- ✅ Pricing提取
- ✅ Evidence Chain记录

#### 9.1.3 Storage Layer
- ✅ 核心实体数据库（Models, Providers, Routes, Prices）
- ✅ Evidence表
- ✅ 关系图建立

#### 9.1.4 Analysis Layer
- ✅ Daily Snapshot
- ✅ Basic Diff Detection（新模型、价格变化）
- ✅ Change Events

#### 9.1.5 Intelligence Layer
- ✅ Daily Report生成
- ✅ 基础查询接口（"哪里能用"、"价格对比"）

#### 9.1.6 Deployment
- ✅ Ubuntu部署脚本
- ✅ 定时任务（Celery或cron）
- ✅ PostgreSQL存储

### 9.2 应该做（增强功能，3个月内实现）

#### 9.2.1 Discovery Enhancement
- ⭐ Search Discovery（英文、中文）
- ⭐ GitHub Discovery
- ⭐ 搜索词自动扩展

#### 9.2.2 Data Quality
- ⭐ Multi-source Verification
- ⭐ Conflict Resolution
- ⭐ Evidence Level校验

#### 9.2.3 Additional Intelligence
- ⭐ Coding Plan详细分析
- ⭐ Cache Policy追踪
- ⭐ Tool Compatibility Matrix
- ⭐ Protocol Support Matrix

#### 9.2.4 Monitoring
- ⭐ Task execution monitoring
- ⭐ Data quality dashboard
- ⭐ Alert system

### 9.3 可选增强（6个月后考虑）

#### 9.3.1 Advanced Discovery
- 💡 ML-based entity recognition
- 💡 自动提取规则生成
- 💡 Social media monitoring

#### 9.3.2 Observed Metrics
- 💡 实际API调用测试
- 💡 真实TTFT/TPS采集
- 💡 真实cache hit rate观测
- 💡 质量评分体系

#### 9.3.3 User Features
- 💡 Web UI Dashboard
- 💡 API for external access
- 💡 User-contributed data
- 💡 智能推荐系统

#### 9.3.4 Advanced Analysis
- 💡 趋势预测
- 💡 成本优化建议
- 💡 异常检测

### 9.4 暂不做

#### 9.4.1 超出范围
- ❌ 模型fine-tuning服务
- ❌ API key代理和统一管理
- ❌ 实际inference服务
- ❌ 支付和交易功能

#### 9.4.2 技术复杂度过高
- ❌ Headless browser大规模使用（仅在必要时用）
- ❌ 分布式爬虫集群（初期单机足够）
- ❌ 实时流处理（每日批处理足够）

---

## 10. 最终执行检查清单

在开始实施前，确认以下问题的答案：

### 10.1 系统定位
- ✅ 明确这是"发现引擎"而非"静态采集器"
- ✅ 理解"自动发现未知平台"的核心需求
- ✅ 区分不同实体类型（Model/Provider/Gateway/Plan等）

### 10.2 Discovery机制
- ✅ 设计了至少4种Discovery Source（Registry/Official/Search/GitHub）
- ✅ 建立了Candidate→Verification→Entity的流程
- ✅ 不依赖硬编码的平台名单

### 10.3 数据模型
- ✅ 建立了完整的关系图（Model×Provider×Protocol×Tool）
- ✅ 区分了Price vs Plan vs Cache
- ✅ 建立了Evidence Chain

### 10.4 时间处理
- ✅ 区分了release_date vs discovered_at vs published_at vs effective_at
- ✅ 所有数据都有时间戳
- ✅ 不混淆"发现时间"和"发布时间"

### 10.5 证据验证
- ✅ 定义了证据等级（S0-S6）
- ✅ 建立了多源验证机制
- ✅ 能够标记和处理冲突数据

### 10.6 变化检测
- ✅ 实现了Snapshot机制
- ✅ 实现了Diff Detection
- ✅ 能够生成Change Events

### 10.7 输出情报
- ✅ 设计了Daily Intelligence Report格式
- ✅ 能够回答"哪里能用""怎么用""多少钱"等核心问题
- ✅ 明确区分了"事实"和"推测"

### 10.8 技术实现
- ✅ 选择了适合Ubuntu的技术栈
- ✅ 设计了可执行的部署方案
- ✅ 建立了定时任务调度
- ✅ 考虑了失败处理和监控

### 10.9 质量保证
- ✅ 建立了数据完整性检查
- ✅ 建立了逻辑一致性验证
- ✅ 考虑了数据过时处理
- ✅ 标记了缺失数据而不是猜测

### 10.10 边界认知
- ✅ 明确了系统能做什么、不能做什么
- ✅ 标注了数据的局限性
- ✅ 避免了过度承诺（"全网覆盖"等）
- ✅ 声明了数据仅供参考

---

**系统建设完成标准：**

当一个昨天还不存在的新AI Provider今天在互联网上出现时，系统能够在24-48小时内：
1. ✅ 发现它的存在
2. ✅ 识别它的类型
3. ✅ 验证它的技术能力
4. ✅ 提取它的价格和计划
5. ✅ 建立与模型的关系
6. ✅ 纳入每日情报报告

**并且**：整个过程无需人工指定这个Provider的名字或URL。

---

*这就是真正的AI Market Discovery & Intelligence Engine。*