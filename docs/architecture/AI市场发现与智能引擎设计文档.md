# AI Market Discovery & Intelligence Engine 设计文档

> 版本: v1.0 | 日期: 2026-09-30 | 状态: DESIGN
> 锚定: 提示词指令.md (base prompt) + from_claude_5_5.md (blueprint) + 核心.md (集大成者)
> 范围: Aidean 项目从「管理平台」升级为「自主发现 + 智能分析引擎」

---

## 0. 执行摘要

### 0.1 当前状态

Aidean 当前是一个成熟的 AI 模型管理平台（v7.5），具备：
- **52 个 Prisma 模型**：覆盖用户、认证、计费、模型、提供商、产品、测评等
- **105 个 API 路由**：24 个 admin 域 + 公共 API + 网关
- **10 个 sync adapters**：OpenRouter / HuggingFace / LMSys / EpochAI / LLMStats / ArtificialAnalysis / AgentIndex / SkillsMP / Smithery
- **708+ 测试通过**：unit + e2e 全绿
- **完整文档体系**：ADR / architecture / specs / plans / product

### 0.2 核心差距

参考文档定义的「AI Market Discovery & Intelligence Engine」要求系统具备**自主发现能力**——不仅能管理已知平台，还能：

| 能力 | 当前状态 | 目标状态 |
|------|----------|----------|
| 候选发现 | 仅从 10 个已知源同步 | 搜索+GitHub+News+Crawl 联合发现未知平台 |
| 实体消歧 | 无去重机制 | 同域名/API Base/公司/品牌多源去重 |
| 技术指纹 | 无自动探测 | 自动检查 /v1/models 等端点 |
| 协议探测 | 无协议兼容矩阵 | OpenAI/Anthropic/Streaming/Tool/Vision/MCP 逐项探测 |
| 价格提取 | 有 ModelPrice 但结构简单 | 分层价格+多源证据 |
| 套餐发现 | 有 Package 但无自动发现 | 自动发现 coding/subscription/credit/window |
| 缓存发现 | 无缓存策略追踪 | 文档型+实测型缓存指标 |
| 质量发现 | 有 Benchmark/ModelScore | 多源质量(official/benchmark/independent/observed) |
| 变更检测 | 有 ModelChangeLog | 每日快照+diff+变更事件流 |
| 智能生成 | 无日报 | 每日市场智能报告 |

### 0.3 设计原则

1. **自动发现 ≠ 神奇地知道所有网站**：把开放互联网中可观测的证据转化为候选实体，再逐步验证升级
2. **证据链是一等公民**：每个数据点都有来源、置信度、时间戳
3. **Candidate → Provider 渐进升级**：新实体先作为 Candidate，验证后升级为正式 Provider/Model
4. **多源不覆盖**：official_price / aggregator_price / observed_price 分开存储
5. **UI 统一、底层分离**：UI 可统一为「使用渠道」，DB 必须保留实体类型

---

## 1. 6 层发现架构

### 1.1 架构总览

```
                    ┌─────────────────────────────────┐
                    │     Intelligence / API Layer     │  ← 日报、快照、变更事件
                    └─────────────┬───────────────────┘
                                  │
                    ┌─────────────┴───────────────────┐
                    │       Storage & Graph Layer      │  ← 52→64 个 Prisma 模型
                    └─────────────┬───────────────────┘
                                  │
                    ┌─────────────┴───────────────────┐
                    │     Normalization & Mapping      │  ← 统一命名、分类、映射
                    └─────────────┬───────────────────┘
                                  │
                    ┌─────────────┴───────────────────┐
                    │  Verification & Extraction Layer │  ← 指纹、协议、价格、套餐
                    └─────────────┬───────────────────┘
                                  │
                    ┌─────────────┴───────────────────┐
                    │     Entity Resolution Layer      │  ← 去重、消歧、合并
                    └─────────────┬───────────────────┘
                                  │
                    ┌─────────────┴───────────────────┐
                    │    Candidate Discovery Layer     │  ← 搜索、GitHub、News、Crawl
                    └─────────────────────────────────┘
```

### 1.2 第一层：Candidate Discovery

**目标**：每天凌晨自动发现数据库完全不知道的新平台。

**数据源联合**：

| 数据源类型 | 具体来源 | 发现什么 |
|------------|----------|----------|
| Registry | OpenRouter / HuggingFace / Models.dev / Artificial Analysis / LiteLLM | 已知网络中的 Provider 列表 |
| Search | 搜索引擎 API | "OpenAI compatible API" / "LLM API" 等关键词 |
| GitHub | Repo Search / Releases / SDK | 新 SDK、新推理引擎、新 API wrapper |
| News | 科技新闻 / Product Hunt / Hacker News | 新产品发布 |
| Crawl | 已知 Provider 的 docs/links | 链接到的其他平台 |

**输出**：`DiscoveryCandidate` 记录，包含 candidateType / name / domain / apiBase / evidence / status

**关键约束**：此时还不是 Provider，只是 Candidate。需要通过后续层验证后才能升级。

### 1.3 第二层：Entity Resolution

**目标**：防止同一个实体被当成多个。

**消歧信号**（按优先级）：
1. 同域名（openrouter.ai = OpenRouter API = OpenRouter Inc.）
2. 同 API Base URL
3. 同公司注册名
4. 同 GitHub Organization
5. 同品牌名
6. 同客服邮箱域名

### 1.4 第三层：Technical Fingerprinting

**探测清单**：

| 探测项 | 方法 | 判定 |
|--------|------|------|
| /v1/models | GET 请求 | 返回 `{object:"list",data:[...]}` → OpenAI-style |
| /api/v1/models | GET 请求 | 备选路径 |
| /v1/chat/completions | OPTIONS/HEAD | OpenAI Chat 端点存在 |
| /v1/responses | OPTIONS/HEAD | OpenAI Responses API |
| /v1/messages | OPTIONS/HEAD | Anthropic Messages |
| Bearer auth | Header 检查 | 认证方式 |
| Pricing page | /pricing 路径 | 价格页存在 |

### 1.5 第四层：Protocol Probe

**探测维度**：

| 维度 | 探测方法 |
|------|----------|
| OpenAI Chat Completions | 发送最小请求到 /v1/chat/completions |
| OpenAI Responses | 发送到 /v1/responses |
| Anthropic Messages | 发送到 /v1/messages |
| Streaming | stream=true 请求 |
| Tool Calling | 带 tools 参数请求 |
| Structured Output | 带 response_format 参数 |
| Vision | 带图片 URL 的消息 |
| Audio | 带音频输入 |
| PDF | 带 PDF 内容 |
| Reasoning | reasoning_effort 参数 |
| MCP | MCP Server 调用 |

### 1.6 第五层：Pricing Extraction

**结构化价格**（不是简单的 `price = 3.0`）：

```
PriceRule
├── region          (us-east / cn-north / ...)
├── input_tier      (0-128k / 128k-200k / ...)
├── input_price     (per 1M tokens)
├── cache_read_price
├── cache_write_price
├── output_price
├── batch_price     (批处理折扣)
├── effective_from  (生效时间)
└── source          (official / aggregator / observed)
```

**多源不覆盖原则**：official_price / aggregator_price / observed_price 分开存储。

### 1.7 第六层：Plan Discovery

| 套餐类型 | 说明 | 示例 |
|----------|------|------|
| token_based | 按 token 计费 | OpenAI API |
| request_based | 按请求计费 | 某些推理 API |
| credit_based | 按额度扣减 | 302.AI |
| window_based | 固定时间窗口 | 阿里云 7 天窗口 |
| hybrid | 多项独立计费 | Managed Agents = runtime + model + tools |

### 1.8 附加层：Cache Discovery

- **文档型**：cache_supported, cache_ttl, cache_write_price, cache_read_price, minimum_tokens
- **实测型**：eligible_tokens, cached_tokens, cache_hit_tokens, cache_hit_requests, latency, effective_cost
- **关键区分**：Provider Prompt Cache vs Gateway Response Cache 是两套机制，必须分开建模

### 1.9 附加层：Quality Discovery

| 来源 | 可信度 | 说明 |
|------|--------|------|
| official_claim | 中 | 厂商宣传 |
| model_card | 中高 | 模型卡文档 |
| benchmark | 高 | 标准基准测试 |
| independent_eval | 高 | 第三方评测 |
| observed_eval | 高 | 实际使用观测 |

---

## 2. 数据库 Schema 扩展

### 2.1 新增模型清单

在现有 52 个 Prisma 模型基础上，新增 12 个模型：

| # | 模型名 | 用途 | 关联 |
|---|--------|------|------|
| 1 | `DiscoveryCandidate` | 发现的候选实体 | → ModelProvider/APIStation (promoted) |
| 2 | `EvidenceChain` | 证据链记录 | → DiscoveryCandidate, ModelProvider, AiModel |
| 3 | `ProtocolCompatibility` | 协议兼容性 | → ModelProvider/APIStation |
| 4 | `CapabilityMatrix` | 能力矩阵 | → AiModel |
| 5 | `ToolCompatibility` | 工具兼容性 | → AiModel |
| 6 | `CachePolicy` | 缓存策略 | → AiModel, ModelProvider |
| 7 | `CacheObservation` | 缓存实测 | → AiModel, ApiKey |
| 8 | `RateLimitPolicy` | 速率限制 | → ModelProvider/APIStation |
| 9 | `ReliabilityObservation` | 可靠性观测 | → ModelProvider/APIStation |
| 10 | `PriceRule` | 结构化价格规则 | → AiModel, ModelProvider |
| 11 | `CodingPlan` | 编码套餐 | → ModelProvider/APIStation |
| 12 | `MarketSnapshot` | 市场快照 | 独立，含 JSON 快照数据 |

### 2.2 关键模型字段

#### DiscoveryCandidate
- `candidateType`: provider / gateway / model / tool
- `name`, `domain`, `apiBase`
- `sourceType`: registry / search / github / news / crawl
- `sourceUrl`, `sourceKeyword`
- `status`: discovered → verifying → verified → promoted / rejected
- `promotedToType` / `promotedToId`: 升级为正式实体后的关联
- `fingerprint`: JSON，技术指纹结果

#### EvidenceChain
- `candidateId` / `providerId` / `modelId`: 关联实体
- `evidenceType`: discovery / fingerprint / protocol / pricing / quality / change
- `claim`: 具体声明（如 "supports OpenAI Chat Completions"）
- `source`: official / aggregator / observed / search
- `confidence`: 0.0-1.0
- `evidenceData`: JSON，详细证据数据

#### ProtocolCompatibility
- `entityType` / `entityId`: 关联 Provider 或 Station
- `protocol`: openai_chat / openai_responses / anthropic_messages / streaming / tool_calling / structured_output / vision / audio / pdf / reasoning / mcp
- `supported`: boolean
- `probeMethod`: endpoint_check / minimal_request / documented
- `confidence`: 0.0-1.0

#### CapabilityMatrix
- `modelId`: 关联模型
- `capability`: function_calling / vision / reasoning / structured_output / prompt_caching / code_execution / web_search / long_context
- `supported`: boolean
- `source`: official / benchmark / observed
- `maxContextLength`: for long_context

#### ToolCompatibility
- `modelId`: 关联模型
- `toolName`: claude_code / cursor / codex / opencode / cline / continue / aider
- `compatible`: boolean
- `integrationType`: native / api_compatible / plugin / unsupported

#### PriceRule
- `modelId` / `providerId`: 关联
- `region`: us-east / cn-north / ...
- `inputTier`: 0-128k / 128k-200k / ...
- `inputPrice` / `cacheReadPrice` / `cacheWritePrice` / `outputPrice` / `batchPrice`
- `source`: official / aggregator / observed
- `effectiveFrom`: 生效时间

#### MarketSnapshot
- `snapshotDate`: 快照日期
- `snapshotType`: full / incremental
- `data`: JSON，完整市场数据快照
- `diff`: JSON，与上次快照的差异
- `summary`: JSON，摘要统计

---

## 3. API 设计

### 3.1 新增 API 路由

| 路由 | 方法 | 用途 |
|------|------|------|
| `/api/v1/admin/discovery/candidates` | GET/POST | 候选列表/手动添加候选 |
| `/api/v1/admin/discovery/candidates/[id]` | GET/PATCH/DELETE | 候选详情/更新状态/删除 |
| `/api/v1/admin/discovery/candidates/[id]/promote` | POST | 将候选升级为正式实体 |
| `/api/v1/admin/discovery/pipeline` | POST/GET | 触发发现管道/查看管道状态 |
| `/api/v1/admin/discovery/pipeline/status` | GET | 管道执行状态 |
| `/api/v1/admin/intelligence/snapshots` | GET | 快照列表 |
| `/api/v1/admin/intelligence/snapshots/[id]` | GET | 快照详情 |
| `/api/v1/admin/intelligence/reports` | GET | 智能报告列表 |
| `/api/v1/admin/intelligence/reports/[id]` | GET | 报告详情 |
| `/api/v1/admin/intelligence/reports/generate` | POST | 手动生成报告 |
| `/api/v1/admin/protocols` | GET/POST | 协议兼容性管理 |
| `/api/v1/admin/capabilities` | GET/POST | 能力矩阵管理 |
| `/api/v1/admin/evidence` | GET | 证据链查询 |

### 3.2 发现管道 API

**POST /api/v1/admin/discovery/pipeline**

```json
{
  "stages": ["discovery", "resolution", "fingerprint", "protocol", "pricing", "plan"],
  "sources": ["registry", "search", "github", "news"],
  "dryRun": false
}
```

**响应**：

```json
{
  "pipelineId": "pipe_xxx",
  "status": "running",
  "stages": [
    { "name": "discovery", "status": "completed", "candidatesFound": 15 },
    { "name": "resolution", "status": "completed", "merged": 3, "new": 12 },
    { "name": "fingerprint", "status": "running", "processed": 5, "total": 12 },
    { "name": "protocol", "status": "pending" },
    { "name": "pricing", "status": "pending" },
    { "name": "plan", "status": "pending" }
  ]
}
```

### 3.3 智能报告 API

**GET /api/v1/admin/intelligence/reports**

返回每日市场智能报告列表，包含：
- 新发现的平台
- 价格变动
- 能力变化
- 协议兼容性更新
- 市场趋势摘要

---

## 4. 前端设计

### 4.1 新增 Admin 页面

| 页面 | 路由 | 组件 | 功能 |
|------|------|------|------|
| 发现管道控制台 | /admin/discovery | DiscoveryPipeline | 触发管道、查看状态、配置数据源 |
| 候选管理 | /admin/discovery/candidates | CandidateManager | 候选列表、详情、升级操作 |
| 智能仪表盘 | /admin/intelligence | IntelligenceDashboard | 日报、快照、趋势图 |
| 协议矩阵 | /admin/protocols | ProtocolMatrix | Provider × Protocol 兼容矩阵 |
| 能力矩阵 | /admin/capabilities | CapabilityMatrix | Model × Capability 矩阵 |

### 4.2 DiscoveryPipeline 组件

- 管道状态可视化（6 层进度条）
- 数据源配置（勾选 Registry/Search/GitHub/News/Crawl）
- 触发按钮（手动执行 / 定时配置）
- 历史执行记录
- 实时日志流

### 4.3 IntelligenceDashboard 组件

- 每日报告卡片（新平台/价格变动/能力变化）
- 快照时间线
- 市场趋势图（Provider 数量/Model 数量/价格趋势）
- 变更事件流

---

## 5. 实现路径

### 5.1 代码结构

```
apps/web/lib/
├── discovery/                    # 新增：发现层
│   ├── pipeline.ts               # 管道编排器
│   ├── candidate-discovery.ts    # 候选发现
│   ├── entity-resolution.ts      # 实体消歧
│   ├── technical-fingerprint.ts  # 技术指纹
│   ├── protocol-probe.ts         # 协议探测
│   ├── pricing-extraction.ts     # 价格提取
│   └── plan-discovery.ts         # 套餐发现
├── intelligence/                 # 新增：智能层
│   ├── snapshot.ts               # 快照生成
│   ├── change-detector.ts        # 变更检测
│   └── report-generator.ts       # 日报生成
├── sync/                         # 已有：同步适配器
│   ├── adapters/                 # 10 个已知源适配器
│   └── ...
```

### 5.2 执行顺序

1. **Schema 扩展** → Prisma migration
2. **发现层核心** → 6 个模块
3. **智能层核心** → 3 个模块
4. **管道编排器** → 串联 6 层
5. **API 路由** → 13 个新路由
6. **Admin UI** → 5 个新组件 + 5 个新页面
7. **测试** → unit + integration
8. **文档更新** → 索引/架构/计划
9. **GitHub 推送** → 双端一致

### 5.3 与现有系统的集成

- **SyncBatch**：发现管道执行记录复用 SyncBatch 表
- **ModelChangeLog**：变更检测复用 ModelChangeLog 表
- **ModelPrice**：PriceRule 是 ModelPrice 的结构化扩展，不替换
- **Benchmark/ModelScore**：CapabilityMatrix 是其补充，不替换
- **ScheduledScript**：发现管道定时触发复用 ScheduledScript 机制

---

## 6. 测试策略

### 6.1 单元测试

| 模块 | 测试文件 | 覆盖点 |
|------|----------|--------|
| candidate-discovery | discovery/candidate-discovery.spec.ts | 各数据源解析、候选生成 |
| entity-resolution | discovery/entity-resolution.spec.ts | 去重逻辑、合并决策 |
| technical-fingerprint | discovery/technical-fingerprint.spec.ts | 端点探测、格式判定 |
| protocol-probe | discovery/protocol-probe.spec.ts | 协议探测、矩阵生成 |
| pricing-extraction | discovery/pricing-extraction.spec.ts | 价格解析、多源存储 |
| snapshot | intelligence/snapshot.spec.ts | 快照生成、diff |
| change-detector | intelligence/change-detector.spec.ts | 变更检测、事件生成 |
| report-generator | intelligence/report-generator.spec.ts | 报告格式、摘要 |

### 6.2 API 契约测试

- 每个 admin API 路由的 GET/POST/PATCH/DELETE 契约
- 权限验证（requireAdminApi）
- 审计日志（writeAudit）

### 6.3 门禁

- `tsc --noEmit`：0 错误
- `vitest run`：全量通过
- `node scripts/check-docs-facts.mjs`：全绿

---

## 7. 致命问题回应

### 7.1 "真的可以发现一个昨天数据库完全不知道的新平台吗？"

可以。流程：搜索引擎发现新域名 → Candidate → 抓官网 → 发现 /v1/models → Technical Verification → Provider

**"自动发现"不是神奇地知道所有网站，而是把开放互联网中可观测的证据转化为候选实体。**

### 7.2 "搜索引擎就够了？"

不够。搜索引擎发现能力强但结构化能力弱。必须 Search + Registry + Official API + GitHub + Crawl 联合。

### 7.3 "OpenRouter 能把所有平台解决？"

不能。OpenRouter 只发现进入其网络的 Provider。刚上线、尚未接入的中国新平台不会出现。所以 Search/GitHub/News/Crawling 必须存在。

### 7.4 "Provider 数据能不能直接相信？"

不能。第三方价格网站 $1/1M，官方页面 $1.2/1M → 数据库保存 official_price + aggregator_price，不覆盖。

### 7.5 "缓存命中率能不能从网页抓？"

很多时候不能。需要实测型指标：eligible_tokens, cached_tokens, cache_hit_tokens → 从实际请求计算 cache_hit_rate。
