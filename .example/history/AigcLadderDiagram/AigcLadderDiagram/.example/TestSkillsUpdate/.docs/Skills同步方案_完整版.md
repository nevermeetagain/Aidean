# Skills & Models 同步方案（完整版）

## 一、数据源全景分析

### 1.1 Skills平台数据对比

| 平台 | 数据获取方式 | API可用性 | 核心字段 | 数据量 | 更新频率 |
|------|-------------|-----------|----------|--------|----------|
| **skillsmp.com** | 爬虫 | 无公开API | name, description, author, installs, logo, tags, repo_url | ~500 | 每日 |
| **smithery.ai** | 爬虫 | 无公开API | name, description, author, downloads, categories, github_url | ~800 | 每日 |
| **skills.sh** | 爬虫 | 无公开API | name, description, version, publisher, installCount | ~300 | 每日 |
| **npm registry** | API | ✅ 公开 | name, description, author, downloads, version, repository | 海量 | 实时 |
| **GitHub** | API | ✅ 需Token | stars, forks, issues, updated_at, topics | 海量 | 实时 |

### 1.2 AI Models平台数据对比

| 平台 | 数据获取方式 | API可用性 | 核心字段 | 更新频率 |
|------|-------------|-----------|----------|----------|
| **OpenAI** | API | ✅ 需Key | id, object, created, owned_by | 实时 |
| **Anthropic** | API | ✅ 需Key | id, display_name, created_at | 实时 |
| **Google Gemini** | API | ✅ 需Key | name, version, displayName | 实时 |
| **DeepSeek** | API | ✅ 需Key | model, context_length, pricing | 实时 |
| **通义千问** | API | ✅ 需Key | model_id, context_length | 实时 |
| **智谱GLM** | API | ✅ 需Key | model, max_tokens | 实时 |
| **LMSYS Arena** | 爬虫 | 无API | model, elo_score, votes | 每日 |
| **Artificial Analysis** | 爬虫 | 无API | model, pricing, latency, throughput | 每周 |

### 1.3 字段映射表

```
Skills统一字段设计：
┌─────────────────────────────────────────────────────────────────┐
│ 本地统一字段        │ skillsmp    │ smithery   │ skills.sh   │
├─────────────────────────────────────────────────────────────────┤
│ name               │ name        │ name       │ name        │
│ display_name       │ title       │ displayName│ displayName │
│ description        │ description │ description│ description │
│ author             │ author      │ author     │ publisher   │
│ source_url         │ repo_url    │ github_url │ packageUrl  │
│ icon_url           │ logo        │ icon       │ icon        │
│ category           │ tags[]      │ categories│ category    │
│ install_count      │ installs    │ downloads  │ installCount│
│ rating             │ rating      │ rating     │ rating      │
│ version            │ version     │ version    │ version     │
│ last_updated       │ updatedAt   │ updatedAt  │ updatedAt   │
│ platform_id        │ skillsmp_id │ smithery_id│ skillsh_id  │
└─────────────────────────────────────────────────────────────────┘

Models统一字段设计：
┌─────────────────────────────────────────────────────────────────┐
│ 本地统一字段        │ OpenAI      │ Anthropic  │ LMSYS       │
├─────────────────────────────────────────────────────────────────┤
│ model_id           │ id          │ id         │ model       │
│ display_name       │ id          │ display_name│ model      │
│ provider           │ openai      │ anthropic  │ lmsys       │
│ context_length     │ -           │ -          │ -           │
│ pricing_input      │ -           │ -          │ -           │
│ pricing_output     │ -           │ -          │ -           │
│ elo_score          │ -           │ -          │ elo         │
│ capabilities       │ -           │ -          │ -           │
│ supported_formats  │ -           │ -          │ -           │
│ last_updated       │ created     │ created_at │ timestamp   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 二、三套同步方案

### 方案A：API优先 + 爬虫兜底（推荐）

#### 架构设计
```
┌─────────────────────────────────────────────────────────────────┐
│                      调度中心 (BullMQ)                          │
│              ┌─────────────┐    ┌─────────────┐                │
│              │  Daily Job  │    │  Hourly Job │                │
│              │  (Skills)   │    │  (Models)   │                │
│              └──────┬──────┘    └──────┬──────┘                │
└─────────────────────┼──────────────────┼───────────────────────┘
                      │                  │
        ┌─────────────┴──────────┬───────┴──────────┐
        │                        │                  │
┌───────▼────────┐    ┌──────────▼────────┐  ┌──────▼──────┐
│  API Fetcher   │    │   Web Scraper     │  │  GitHub API │
│  (npm/github)  │    │  (skillsmp/       │  │  (Stars/    │
│                │    │   smithery/       │  │   Forks)    │
│                │    │   skills.sh)      │  │             │
└───────┬────────┘    └──────────┬────────┘  └──────┬──────┘
        │                        │                  │
        └────────────┬───────────┴──────────┬───────┘
                     │                      │
           ┌─────────▼──────────┐  ┌───────▼────────┐
           │   Data Transformer│  │  Conflict      │
           │   (字段标准化)     │  │  Resolver      │
           └─────────┬──────────┘  └───────┬────────┘
                     │                      │
           ┌─────────▼──────────────────────▼────────┐
           │          统一数据模型 (Prisma)          │
           │  ┌─────────┐ ┌─────────┐ ┌─────────┐  │
           │  │  Skills │ │ Models  │ │Providers│  │
           │  └─────────┘ └─────────┘ └─────────┘  │
           └─────────────────────────────────────────┘
```

#### 技术栈
- **调度**: BullMQ (Redis-based)
- **爬虫**: Playwright + Cheerio
- **API客户端**: axios + retry
- **数据验证**: Zod Schema
- **存储**: PostgreSQL + Redis (缓存)

#### 同步策略
| 数据源 | 同步频率 | 方式 | 增量策略 |
|--------|----------|------|----------|
| npm registry | 每日凌晨 | API | 按update时间戳 |
| GitHub API | 实时补充 | API | 按stars变化 |
| skillsmp.com | 每日凌晨 | 爬虫 | 内容哈希对比 |
| smithery.ai | 每日凌晨 | 爬虫 | 内容哈希对比 |
| skills.sh | 每日凌晨 | 爬虫 | 内容哈希对比 |

#### 优缺点
**✅ 优点**:
- npm数据实时、准确、完整
- GitHub Stars/Forks数据权威
- 爬虫仅作为补充，降低封号风险
- 整体数据质量高

**❌ 缺点**:
- 需要维护两套采集代码(API+爬虫)
- 爬虫需要处理反爬机制
- npm数据可能不完全匹配Skills概念

---

### 方案B：爬虫主导 + API增强

#### 架构设计
```
┌─────────────────────────────────────────────────────────────────┐
│                      爬虫集群 (Playwright Cluster)               │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ skillsmp    │  │ smithery    │  │ skills.sh   │             │
│  │ Worker      │  │ Worker      │  │ Worker      │             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
│         │                │                │                    │
│         └────────────────┼────────────────┘                    │
│                          │                                      │
│  ┌───────────────────────▼────────────────────────┐             │
│  │           数据标准化流水线                      │             │
│  │  ┌─────────────┐    ┌─────────────────────┐   │             │
│  │  │ Field Mapper│ -> │ Enrichment (GitHub) │   │             │
│  │  └─────────────┘    └─────────────────────┘   │             │
│  └───────────────────────┬────────────────────────┘             │
└──────────────────────────┼──────────────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              │                         │
    ┌─────────▼─────────┐    ┌──────────▼────────┐
    │   本地数据库       │    │   GitHub API      │
    │   (SQLite/PG)     │    │   (补充Stars等)    │
    └───────────────────┘    └───────────────────┘
```

#### 技术栈
- **爬虫**: Playwright Cluster (多浏览器并发)
- **代理**: brightdata/residential proxy
- **防检测**: puppeteer-extra-plugin-stealth
- **调度**: node-cron
- **存储**: SQLite (轻量)

#### 同步策略
| 数据源 | 同步频率 | 方式 | 反爬策略 |
|--------|----------|------|----------|
| skillsmp.com | 每6小时 | 爬虫 | 代理池+随机UA+请求间隔 |
| smithery.ai | 每6小时 | 爬虫 | 代理池+随机UA+请求间隔 |
| skills.sh | 每6小时 | 爬虫 | 代理池+随机UA+请求间隔 |
| GitHub | 按需 | API | Token轮换 |

#### 优缺点
**✅ 优点**:
- 直接从Skills平台获取，数据语义准确
- 不依赖npm的宽泛定义
- 可抓取平台特色数据（如评分、评论）

**❌ 缺点**:
- 爬虫维护成本高（页面改版需适配）
- 反爬对抗需要代理成本
- 被封IP风险
- 同步频率受限

---

### 方案C：混合联邦 + 众包补充

#### 架构设计
```
┌─────────────────────────────────────────────────────────────────┐
│                     联邦采集网络                                │
│                                                                  │
│   ┌──────────────────────────────────────────────────────┐    │
│   │              官方数据源 (Official)                    │    │
│   │  npm registry ──┐                                    │    │
│   │  GitHub API  ──┼──> 核心数据 (权重100%)              │    │
│   │  各大模型API ──┘                                    │    │
│   └──────────────────────────────────────────────────────┘    │
│                              │                                  │
│   ┌──────────────────────────▼──────────────────────────┐     │
│   │              第三方平台 (Aggregator)                 │     │
│   │  skillsmp.com ──┐                                    │     │
│   │  smithery.ai   ──┼──> 扩展数据 (权重60%)              │     │
│   │  skills.sh     ──┘                                    │     │
│   └──────────────────────────────────────────────────────┘     │
│                              │                                  │
│   ┌──────────────────────────▼──────────────────────────┐     │
│   │              社区众包 (Crowdsourced)                 │     │
│   │  用户提交Skills ──┐                                   │     │
│   │  评分/评论      ──┼──> 增强数据 (权重30%)             │     │
│   │  使用统计       ──┘                                   │     │
│   └──────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

#### 冲突解决策略
```typescript
// 加权投票冲突解决
interface DataSource {
  name: string;
  weight: number;  // 官方100%, 第三方60%, 社区30%
  trustScore: number;
}

function resolveConflict(values: Value[], sources: DataSource[]): Value {
  // 1. 按字段类型选择策略
  // 数值型：加权平均
  // 文本型：最长公共子串或最新时间戳
  // 枚举型：投票制
  
  // 2. 置信度计算
  const confidence = calculateConfidence(values, sources);
  
  // 3. 冲突标记（人工审核队列）
  if (confidence < 0.7) {
    queueForManualReview(values);
  }
  
  return mergeValues(values, sources);
}
```

#### 优缺点
**✅ 优点**:
- 数据覆盖面最广
- 单一数据源故障不影响整体
- 社区数据可补充官方缺失信息
- 抗风险能力最强

**❌ 缺点**:
- 架构最复杂
- 冲突解决逻辑复杂
- 需要人工审核机制
- 实施周期最长

---

## 三、增量同步机制

### 3.1 内容哈希检测
```typescript
// 适用于爬虫获取的数据
interface ContentHashStrategy {
  // 对关键字段计算哈希
  calculateHash(skill: Skill): string {
    const content = `${skill.name}|${skill.description}|${skill.version}|${skill.author}`;
    return crypto.createHash('md5').update(content).digest('hex');
  }
  
  // 对比存储的哈希
  async shouldUpdate(skill: Skill): Promise<boolean> {
    const stored = await db.getHash(skill.platform_id);
    const current = this.calculateHash(skill);
    return stored !== current;
  }
}
```

### 3.2 时间戳检测
```typescript
// 适用于API获取的数据
interface TimestampStrategy {
  async shouldUpdate(skill: Skill): Promise<boolean> {
    const stored = await db.getLastUpdated(skill.platform_id);
    return new Date(skill.last_updated) > new Date(stored);
  }
}
```

### 3.3 事件驱动检测
```typescript
// 适用于GitHub Webhook
interface WebhookStrategy {
  // 监听GitHub release事件
  onReleaseEvent(repo: string, tag: string) {
    this.queueForUpdate(repo);
  }
}
```

---

## 四、数据质量保障

### 4.1 验证规则
```typescript
const SkillSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(10).max(5000),
  author: z.string().min(1),
  source_url: z.string().url(),
  category: z.array(z.string()),
  version: z.string().regex(/^\d+\.\d+\.\d+/),
  install_count: z.number().min(0).optional(),
  rating: z.number().min(0).max(5).optional(),
});

const ModelSchema = z.object({
  model_id: z.string().min(1),
  provider: z.enum(['openai', 'anthropic', 'google', 'deepseek', 'qwen', 'zhipu', 'custom']),
  context_length: z.number().min(1000),
  pricing_input: z.number().min(0).optional(),
  pricing_output: z.number().min(0).optional(),
});
```

### 4.2 异常检测
```typescript
// 数据漂移检测
function detectAnomaly(newData: Skill[], oldData: Skill[]): Anomaly[] {
  const anomalies = [];
  
  // 1. 数量突变检测
  if (newData.length < oldData.length * 0.5) {
    anomalies.push({
      type: 'MASSIVE_DROP',
      severity: 'high',
      message: `Skills数量从${oldData.length}骤降至${newData.length}`
    });
  }
  
  // 2. 字段缺失检测
  const requiredFields = ['name', 'description', 'author'];
  for (const skill of newData) {
    for (const field of requiredFields) {
      if (!skill[field]) {
        anomalies.push({
          type: 'MISSING_FIELD',
          severity: 'medium',
          skill: skill.name,
          field
        });
      }
    }
  }
  
  return anomalies;
}
```

---

## 五、实施建议

### 5.1 推荐方案选择

| 场景 | 推荐方案 | 理由 |
|------|----------|------|
| MVP阶段 | 方案A | 快速落地，数据质量可控 |
| 数据精度要求高 | 方案A | npm+GitHub数据最权威 |
| 预算充足 | 方案C | 数据最全，抗风险强 |
| 快速原型 | 方案B | 仅爬虫实现简单 |

### 5.2 分阶段实施

**Phase 1（第1-2周）**:
- 实现npm registry API同步
- 实现GitHub API Stars补充
- 基础数据模型落地

**Phase 2（第3-4周）**:
- 实现skillsmp.com爬虫
- 实现增量哈希检测
- 数据质量监控系统

**Phase 3（第5-6周）**:
- 扩展smithery.ai/skills.sh爬虫
- 实现冲突解决策略
- 自动化测试覆盖

**Phase 4（第7-8周）**:
- 接入模型厂商API
- LMSYS Arena爬虫
- 完整数据看板

### 5.3 技术选型总结

| 组件 | 选型 | 理由 |
|------|------|------|
| 调度器 | BullMQ | Redis-backed, 支持延迟任务和重试 |
| 爬虫 | Playwright | 现代浏览器引擎，反爬能力强 |
| ORM | Prisma | 类型安全，迁移方便 |
| 校验 | Zod | TS原生，性能好 |
| 缓存 | Redis | 增量检测哈希存储 |
| 监控 | Prometheus+Grafana | 标准监控方案 |

---

## 六、数据库Schema（最终版）

```sql
-- Skills主表
CREATE TABLE skills (
    id TEXT PRIMARY KEY,                    -- 本地唯一ID: slug格式
    name TEXT NOT NULL,                     -- 原始名称
    display_name TEXT,                      -- 展示名称
    description TEXT,                       -- 描述
    author TEXT,                            -- 作者
    source_url TEXT,                        -- 源码地址
    icon_url TEXT,                          -- 图标
    category TEXT[],                        -- 分类标签
    install_count INTEGER DEFAULT 0,        -- 安装量
    rating DECIMAL(2,1),                    -- 评分 0-5
    version TEXT,                           -- 版本号
    last_updated TIMESTAMP,                 -- 最后更新时间
    
    -- 平台关联
    npm_name TEXT,                          -- npm包名
    github_repo TEXT,                       -- GitHub仓库
    skillsmp_id TEXT,                       -- skillsmp平台ID
    smithery_id TEXT,                       -- smithery平台ID
    skillsh_id TEXT,                        -- skills.sh平台ID
    
    -- 元数据
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    sync_source TEXT,                       -- 数据来源
    content_hash TEXT,                      -- 内容哈希
    
    UNIQUE(npm_name),
    UNIQUE(skillsmp_id),
    UNIQUE(smithery_id),
    UNIQUE(skillsh_id)
);

-- AI Models主表
CREATE TABLE ai_models (
    id TEXT PRIMARY KEY,                    -- 本地唯一ID
    model_id TEXT NOT NULL,                 -- 厂商原始ID
    display_name TEXT,                      -- 展示名称
    provider TEXT NOT NULL,                 -- 提供商
    
    -- 能力参数
    context_length INTEGER,                 -- 上下文长度
    max_output_tokens INTEGER,              -- 最大输出token
    supports_vision BOOLEAN DEFAULT FALSE,  -- 是否支持视觉
    supports_tools BOOLEAN DEFAULT FALSE,   -- 是否支持工具调用
    supports_json BOOLEAN DEFAULT FALSE,    -- 是否支持JSON模式
    
    -- 定价 (per 1M tokens)
    pricing_input DECIMAL(10,6),            -- 输入价格
    pricing_output DECIMAL(10,6),           -- 输出价格
    
    -- 评测数据
    elo_score INTEGER,                      -- LMSYS Elo评分
    intelligence_index INTEGER,             -- 智能指数
    throughput_score DECIMAL(3,2),          -- 吞吐量评分
    latency_ms INTEGER,                     -- 延迟毫秒
    
    -- 元数据
    release_date DATE,                      -- 发布日期
    last_updated TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,         -- 是否可用
    
    UNIQUE(provider, model_id)
);

-- 同步日志
CREATE TABLE sync_logs (
    id SERIAL PRIMARY KEY,
    source TEXT NOT NULL,                   -- 数据源
    sync_type TEXT NOT NULL,                -- 同步类型: full/incremental
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    items_total INTEGER DEFAULT 0,
    items_created INTEGER DEFAULT 0,
    items_updated INTEGER DEFAULT 0,
    items_failed INTEGER DEFAULT 0,
    error_message TEXT,
    status TEXT                             -- running/success/failed
);
```

---

## 七、数据同步Pipeline（完整流程图）

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           触发层                                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐                │
│  │ 定时触发 │  │ Webhook  │  │ 手动触发 │  │ 事件触发 │                │
│  │ (Cron)   │  │(GitHub)  │  │(Admin)   │  │(Release) │                │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘                │
└───────┼────────────┼────────────┼────────────┼────────────────────────┘
        │            │            │            │
        └────────────┴────────────┴────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────────────┐
│                          调度层 (BullMQ)                                │
│                    ┌─────────────────┐                                  │
│                    │   Sync Queue    │                                  │
│                    └────────┬────────┘                                  │
│           ┌─────────────────┼─────────────────┐                         │
│    ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐                   │
│    │ API Worker  │  │Scraper Worker│  │Enrich Worker│                   │
│    └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                   │
└───────────┼────────────────┼────────────────┼───────────────────────────┘
            │                │                │
┌───────────▼────────────────▼────────────────▼───────────────────────────┐
│                          采集层                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │ npm registry│  │ skillsmp    │  │ smithery    │  │ GitHub API  │    │
│  │ (axios)     │  │(Playwright) │  │(Playwright) │  │ (octokit)   │    │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │
└───────────────────────────┬─────────────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────────────┐
│                          处理层                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │ Data Parse  │─>│Transform    │─>│ Validate    │─>│ Conflict    │    │
│  │ (字段提取)   │  │ (标准化)    │  │ (Zod Schema)│  │ Resolution  │    │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │
└───────────────────────────┬─────────────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────────────┐
│                          存储层                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      PostgreSQL                                 │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            │   │
│  │  │  skills │  │ models  │  │providers│  │sync_logs│            │   │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      Redis                                      │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐                        │   │
│  │  │  hash   │  │  cache  │  │  queue  │                        │   │
│  │  │  store  │  │  store  │  │  state  │                        │   │
│  │  └─────────┘  └─────────┘  └─────────┘                        │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 附录：各平台详细数据结构

### A. npm registry API响应示例
```json
{
  "name": "@anthropic-ai/skills",
  "description": "Claude Skills SDK",
  "dist-tags": { "latest": "1.2.3" },
  "versions": {
    "1.2.3": {
      "author": { "name": "Anthropic" },
      "repository": { "url": "git+https://github.com/anthropics/skills.git" },
      "keywords": ["claude", "ai", "skills"]
    }
  },
  "time": {
    "modified": "2025-04-01T12:00:00Z"
  }
}
```

### B. GitHub API响应示例
```json
{
  "stargazers_count": 1234,
  "forks_count": 567,
  "open_issues_count": 89,
  "updated_at": "2025-04-01T12:00:00Z",
  "topics": ["claude", "skills", "ai"]
}
```

### C. OpenAI Models API响应示例
```json
{
  "data": [
    {
      "id": "gpt-4-turbo-2024-04-09",
      "object": "model",
      "created": 1712601677,
      "owned_by": "openai"
    }
  ]
}
```

### D. LMSYS Arena页面结构
```
LMSYS Chatbot Arena Leaderboard
├── Model Ranking Table
│   ├── Model Name
│   ├── Elo Rating
│   ├── Vote Count
│   ├── Organization
│   └── License
└── Trend Chart (Elo over time)
```

---

*文档生成时间: 2025-04-10*
*版本: v1.0*
