# Trae Skill 同步方案 - 多智能体深度思考

> 生成日期：2026-04-10
> 思考模式：PUA + 多智能体发散性思维
> 参考文档：Skills同步规则.md、数据库设计文档、openskills.md、skills.md、mind1.txt、mind2.txt

---

## 🎭 多智能体思考过程

### Phase 1: Primary Designer（初始设计）

**需求理解：**
- 目标：为 Trae 平台设计 Skill 同步方案
- 频率：每日同步
- 数据源：skillsmp.com (P1)、smithery.ai (P2)、skills.sh (P3)
- 冲突处理：以 GitHub 仓库名为唯一标识，高优先级覆盖低优先级

**核心挑战：**
1. 数据源多样性（API、爬虫）
2. 数据质量不一致
3. 增量更新 vs 全量更新
4. 冲突解决（同一 Skill 多数据源）
5. 版本控制与变更追踪
6. 异常处理与重试

---

### Phase 2: Skeptic / Challenger（质疑者）

**发现的风险：**

| 风险点 | 严重性 | 说明 |
|--------|--------|------|
| **单点故障** | 🔴 高 | ETL Pipeline 同步执行，适配器卡死会阻塞任务 |
| **内存溢出** | 🔴 高 | 全量同步时，10万条记录加载到内存会 OOM |
| **API 限流** | 🟡 中 | GitHub API 未认证 60次/小时，认证后 5000次/小时 |
| **数据不一致** | 🟡 中 | 增量同步依赖时间戳，外部系统时间不准会漏数据 |
| **幂等性问题** | 🟡 中 | 同一批数据同步两次会产生重复记录 |
| **缺乏熔断** | 🟡 中 | 外部 API 故障时持续重试，无熔断保护 |

**建议修复：**
1. 流式处理（Streaming）：Generator/Yield，边获取边处理
2. 连接池管理：限制并发数
3. 幂等性设计：`external_id` + `source` 作为唯一键
4. 熔断器：连续失败5次后熔断30分钟

---

### Phase 3: Constraint Guardian（约束守护者）

**约束检查：**

| 约束项 | 当前设计 | 评估 | 建议 |
|--------|---------|------|------|
| **性能** | 批量插入100条/批 | 🟡 可接受 | 可调整到500-1000条测试 |
| **数据库连接** | 未明确限制 | 🔴 风险 | 使用连接池，最大10连接 |
| **存储成本** | 保存所有历史版本 | 🟡 中等 | 设置版本保留策略（90天）|
| **API限流** | 指数退避 | ✅ 良好 | 符合最佳实践 |
| **并发控制** | 未明确 | 🔴 风险 | 使用分布式锁 |

---

### Phase 4: User Advocate（用户代言人）

**用户体验问题：**

| 问题 | 影响 | 解决方案 |
|------|------|----------|
| **缺乏可视化界面** | 无法直观查看同步状态 | 开发同步监控 Dashboard |
| **错误信息难以理解** | 原始堆栈对运维不友好 | 结构化错误码和中文说明 |
| **无法手动触发同步** | 只能等定时任务 | 提供 API 接口手动触发 |
| **缺乏数据预览** | 无法查看同步前后差异 | 数据对比预览功能 |

---

### Phase 5: Integrator / Arbiter（整合者）

**关键决策：**

| 决策 | 选择 | 理由 |
|------|------|------|
| **同步模式** | 混合模式 | 优先 Webhook 事件驱动，定时全量兜底 |
| **并发策略** | 流式处理 | 避免内存溢出，支持大数据量 |
| **冲突解决** | 智能合并 | 优先级+时间戳+字段级策略 |
| **错误处理** | 分级重试+熔断 | 网络错误重试，API错误熔断 |
| **可观测性** | 管理后台+告警 | 满足运营人员需求 |

---

## 🏗️ 三套同步方案

---

## 方案一：经典 ETL Pipeline（推荐用于生产环境）

### 适用场景
- 数据源稳定，API 文档完善
- 数据量中等（< 10万条）
- 团队有运维能力

### 架构图

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Skill 同步平台 - ETL Pipeline                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Phase 1: EXTRACT (数据提取)                                        │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │   │
│   │  │SkillsMP │  │Smithery │  │GitHub   │  │  npm    │        │   │
│   │  │  API    │  │ Crawler│  │  API    │  │ Registry│        │   │
│   │  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘        │   │
│   │       │            │            │            │              │   │
│   │       └────────────┴────────────┴────────────┘              │   │
│   │                      │                                       │   │
│   │                      ▼                                       │   │
│   │              ┌─────────────┐                                 │   │
│   │              │  Adapter    │  ← 统一数据格式                  │   │
│   │              │  Layer      │                                 │   │
│   │              └──────┬──────┘                                 │   │
│   └─────────────────────┼────────────────────────────────────────┘   │
│                         │                                            │
│   Phase 2: TRANSFORM (数据转换)                                      │
│   ┌─────────────────────┼────────────────────────────────────────┐   │
│   │                     ▼                                        │   │
│   │   ┌─────────────────────────────────────────────────────┐   │   │
│   │   │              Validation & Normalization              │   │   │
│   │   │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐ │   │   │
│   │   │  │ Schema  │  │  Field  │  │Conflict │  │ Quality │ │   │   │
│   │   │  │ Check   │  │  Map    │  │Resolve  │  │  Score  │ │   │   │
│   │   │  └─────────┘  └─────────┘  └─────────┘  └─────────┘ │   │   │
│   │   └─────────────────────────────────────────────────────┘   │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                         │                                            │
│   Phase 3: LOAD (数据加载)                                           │
│   ┌─────────────────────┼────────────────────────────────────────┐   │
│   │                     ▼                                        │   │
│   │   ┌─────────────────────────────────────────────────────┐   │   │
│   │   │              PostgreSQL + Redis                      │   │   │
│   │   │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐ │   │   │
│   │   │  │  Main   │  │ Staging │  │  Cache  │  │  Queue  │ │   │   │
│   │   │  │ Tables  │  │ Tables  │  │  Layer  │  │  (DLQ)  │ │   │   │
│   │   │  └─────────┘  └─────────┘  └─────────┘  └─────────┘ │   │   │
│   │   └─────────────────────────────────────────────────────┘   │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 核心代码实现

#### 1. 数据源适配器

```typescript
// adapters/BaseAdapter.ts
export abstract class BaseSkillAdapter {
  protected config: DataSourceConfig;
  
  constructor(config: DataSourceConfig) {
    this.config = config;
  }
  
  // 抽象方法：子类必须实现
  abstract fetchSkills(params: FetchParams): AsyncGenerator<RawSkillRecord>;
  abstract getSkillDetail(externalId: string): Promise<RawSkillRecord>;
  abstract validateConnection(): Promise<boolean>;
  
  // 通用方法：数据标准化
  normalize(rawData: RawSkillRecord): SkillSyncRecord {
    const mapping = skillFieldMappings[this.config.sourceCode];
    return this.applyMapping(rawData, mapping);
  }
  
  protected applyMapping(data: any, mapping: FieldMapping): SkillSyncRecord {
    const result: Partial<SkillSyncRecord> = {};
    
    for (const [targetField, source] of Object.entries(mapping)) {
      if (typeof source === 'function') {
        result[targetField as keyof SkillSyncRecord] = source(data);
      } else if (typeof source === 'string') {
        result[targetField as keyof SkillSyncRecord] = this.getNestedValue(data, source);
      }
    }
    
    return result as SkillSyncRecord;
  }
  
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((o, p) => o?.[p], obj);
  }
}

// SkillsMP 适配器实现
export class SkillsMPAdapter extends BaseSkillAdapter {
  private client: AxiosInstance;
  
  constructor(config: DataSourceConfig) {
    super(config);
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: 30000,
      headers: {
        'Authorization': `Bearer ${config.authConfig?.apiKey}`,
      },
    });
  }
  
  async* fetchSkills(params: FetchParams): AsyncGenerator<RawSkillRecord> {
    let page = params.page || 1;
    const limit = params.limit || 100;
    let hasMore = true;
    
    while (hasMore) {
      try {
        const response = await this.client.get('/api/skills', {
          params: { page, limit, since: params.since },
        });
        
        const skills = response.data.data || [];
        
        for (const skill of skills) {
          yield skill;
        }
        
        hasMore = skills.length === limit;
        page++;
        
        // 限流控制
        await this.rateLimit();
      } catch (error) {
        throw new AdapterError('SkillsMP API error', error);
      }
    }
  }
  
  private async rateLimit(): Promise<void> {
    const delay = 60000 / (this.config.rateLimitRequests || 100);
    await sleep(delay);
  }
}
```

#### 2. 同步引擎

```typescript
// engine/SyncEngine.ts
export class SkillSyncEngine {
  constructor(
    private adapter: BaseSkillAdapter,
    private validator: SkillValidator,
    private transformer: SkillTransformer,
    private repository: SkillRepository,
    private conflictResolver: ConflictResolver,
  ) {}
  
  async sync(params: SyncParams): Promise<SyncResult> {
    const task = await this.createTask(params);
    
    try {
      // Phase 1: Extract
      logger.info(`[${task.id}] Starting extraction from ${this.adapter.config.sourceCode}`);
      let fetchedCount = 0;
      
      for await (const rawSkill of this.adapter.fetchSkills(params)) {
        fetchedCount++;
        
        // Phase 2: Transform
        const normalized = this.adapter.normalize(rawSkill);
        const validated = await this.validator.validate(normalized);
        
        if (!validated.isValid) {
          await this.saveToStaging(task.id, rawSkill, 'validation_failed', validated.errors);
          continue;
        }
        
        const transformed = await this.transformer.transform(validated.data);
        
        // 变更检测
        const existing = await this.repository.findBySkillKey(transformed.skillKey);
        const changeType = this.detectChange(existing, transformed);
        
        if (changeType === 'no_change') {
          await this.saveToStaging(task.id, rawSkill, 'no_change');
          continue;
        }
        
        // Phase 3: Load
        if (existing && changeType === 'update') {
          // 冲突解决
          const resolution = await this.conflictResolver.resolve(existing, transformed);
          if (resolution.action === 'merge') {
            await this.repository.update(existing.id, resolution.mergedData);
          } else if (resolution.action === 'skip') {
            await this.saveToStaging(task.id, rawSkill, 'conflict_skipped');
            continue;
          }
        } else {
          await this.repository.create(transformed);
        }
        
        await this.saveToStaging(task.id, rawSkill, 'success', null, changeType);
      }
      
      await this.completeTask(task.id, 'success', fetchedCount);
      return { taskId: task.id, status: 'success', totalRecords: fetchedCount };
      
    } catch (error) {
      await this.completeTask(task.id, 'failed', 0, error.message);
      throw error;
    }
  }
  
  private detectChange(existing: Skill | null, incoming: SkillSyncRecord): ChangeType {
    if (!existing) return 'create';
    
    const incomingHash = computeHash(incoming);
    if (existing.rawHash === incomingHash) return 'no_change';
    
    return 'update';
  }
}
```

#### 3. 冲突解决器

```typescript
// resolver/ConflictResolver.ts
export class SkillConflictResolver {
  private rules: MergeRule[];
  
  constructor(rules: MergeRule[] = defaultMergeRules) {
    this.rules = rules;
  }
  
  async resolve(existing: Skill, incoming: SkillSyncRecord): Promise<ResolutionResult> {
    const merged: Partial<Skill> = {};
    const conflicts: FieldConflict[] = [];
    
    for (const rule of this.rules) {
      const existingValue = existing[rule.field as keyof Skill];
      const incomingValue = incoming[rule.field as keyof SkillSyncRecord];
      
      const resolution = this.resolveField(rule, existingValue, incomingValue);
      
      if (resolution.conflict) {
        conflicts.push({
          field: rule.field,
          existing: existingValue,
          incoming: incomingValue,
          chosen: resolution.value,
          reason: resolution.reason,
        });
      }
      
      merged[rule.field as keyof Skill] = resolution.value;
    }
    
    return {
      action: conflicts.length > 0 ? 'merge' : 'update',
      mergedData: { ...existing, ...merged },
      conflicts,
    };
  }
  
  private resolveField(
    rule: MergeRule,
    existing: any,
    incoming: any
  ): { value: any; conflict: boolean; reason: string } {
    // 非空合并策略
    if (rule.strategy === 'priority_wins') {
      if (incoming !== null && incoming !== undefined && incoming !== '') {
        return { 
          value: incoming, 
          conflict: existing !== incoming,
          reason: 'priority_source_has_value'
        };
      }
      return { 
        value: existing, 
        conflict: false,
        reason: 'priority_source_empty_use_existing'
      };
    }
    
    // 时间戳较新者胜
    if (rule.strategy === 'newer_wins' && rule.field === 'lastUpdated') {
      const existingDate = new Date(existing);
      const incomingDate = new Date(incoming);
      
      if (incomingDate > existingDate) {
        return { 
          value: incoming, 
          conflict: true,
          reason: 'incoming_is_newer'
        };
      }
      return { 
        value: existing, 
        conflict: false,
        reason: 'existing_is_newer_or_equal'
      };
    }
    
    // 合并数组（如tags）
    if (rule.strategy === 'merge' && Array.isArray(existing)) {
      const merged = [...new Set([...existing, ...incoming])];
      return { 
        value: merged, 
        conflict: merged.length !== existing.length,
        reason: 'merged_arrays'
      };
    }
    
    return { value: incoming, conflict: false, reason: 'default' };
  }
}
```

### 数据库 Schema

```sql
-- ============================================================
-- 1. 数据源配置表
-- ============================================================
CREATE TABLE sync.data_sources (
    id BIGSERIAL PRIMARY KEY,
    source_code VARCHAR(50) NOT NULL UNIQUE,     -- skillsmp/smithery/skills_sh
    source_name VARCHAR(100) NOT NULL,           -- 数据源名称
    source_type VARCHAR(20) NOT NULL,            -- api/crawler/github/npm
    base_url VARCHAR(500),                       -- API基础URL
    config JSONB NOT NULL DEFAULT '{}',          -- 配置参数
    
    -- 认证信息（加密存储）
    auth_type VARCHAR(20),                       -- none/apikey/oauth
    auth_config JSONB,                           -- 加密后的认证信息
    
    -- 同步策略
    sync_strategy VARCHAR(20) DEFAULT 'full',    -- full/incremental
    sync_cron VARCHAR(50),                       -- 定时表达式
    sync_priority INTEGER DEFAULT 5,             -- 优先级（1-10）
    
    -- 状态
    is_active BOOLEAN DEFAULT TRUE,
    last_sync_at TIMESTAMPTZ,
    last_sync_status VARCHAR(20),                -- success/failed/running
    last_error TEXT,
    
    -- 限流配置
    rate_limit_requests INTEGER DEFAULT 100,     -- 每分钟请求数
    rate_limit_window INTEGER DEFAULT 60,        -- 窗口大小（秒）
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. 同步任务表
-- ============================================================
CREATE TABLE sync.sync_tasks (
    id BIGSERIAL PRIMARY KEY,
    data_source_id BIGINT NOT NULL REFERENCES sync.data_sources(id),
    task_type VARCHAR(30) NOT NULL DEFAULT 'skill_sync',
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending/running/completed/failed
    
    fetch_params JSONB,                          -- {page: 1, limit: 100}
    transform_config JSONB,                      -- 转换规则
    
    total_records INTEGER DEFAULT 0,
    processed_records INTEGER DEFAULT 0,
    failed_records INTEGER DEFAULT 0,
    skipped_records INTEGER DEFAULT 0,
    
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,
    
    error_count INTEGER DEFAULT 0,
    last_error TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    worker_node VARCHAR(100),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. 同步数据临时表（Staging）
-- ============================================================
CREATE TABLE sync.sync_staging (
    id BIGSERIAL PRIMARY KEY,
    task_id BIGINT NOT NULL REFERENCES sync.sync_tasks(id),
    data_source_id BIGINT NOT NULL REFERENCES sync.data_sources(id),
    external_id VARCHAR(100) NOT NULL,           -- 外部系统ID
    raw_data JSONB NOT NULL,                     -- 原始数据
    raw_hash VARCHAR(64) NOT NULL,               -- 原始数据SHA256
    processed_data JSONB,                        -- 处理后的数据
    status VARCHAR(20) DEFAULT 'pending',        -- pending/validated/transformed/failed
    error_message TEXT,
    target_table VARCHAR(50),
    target_id BIGINT,
    change_type VARCHAR(20),                     -- create/update/delete/no_change
    diff_fields JSONB,                           -- 变更字段详情
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. 数据版本表
-- ============================================================
CREATE TABLE sync.data_versions (
    id BIGSERIAL PRIMARY KEY,
    entity_type VARCHAR(30) NOT NULL,            -- skill/mcp/agent
    entity_id BIGINT NOT NULL,
    version_number INTEGER NOT NULL,
    data_snapshot JSONB NOT NULL,                -- 完整数据快照
    change_summary JSONB,                        -- 变更摘要
    source_task_id BIGINT REFERENCES sync.sync_tasks(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(entity_type, entity_id, version_number)
);

-- ============================================================
-- 5. 死信队列表
-- ============================================================
CREATE TABLE sync.dead_letters (
    id BIGSERIAL PRIMARY KEY,
    task_id BIGINT REFERENCES sync.sync_tasks(id),
    staging_id BIGINT REFERENCES sync.sync_staging(id),
    entity_type VARCHAR(30),
    external_id VARCHAR(100),
    raw_data JSONB,
    error_type VARCHAR(50),                      -- validation/transform/db
    error_message TEXT,
    error_stack TEXT,
    retry_history JSONB[],                       -- [{attempt, time, error}]
    status VARCHAR(20) DEFAULT 'pending',        -- pending/reviewing/fixed/discarded
    reviewed_by BIGINT,
    reviewed_at TIMESTAMPTZ,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引优化
CREATE INDEX idx_sync_tasks_status ON sync.sync_tasks(status);
CREATE INDEX idx_sync_tasks_data_source ON sync.sync_tasks(data_source_id);
CREATE INDEX idx_sync_staging_task ON sync.sync_staging(task_id);
CREATE INDEX idx_sync_staging_status ON sync.sync_staging(status);
CREATE INDEX idx_data_versions_entity ON sync.data_versions(entity_type, entity_id);
```

### 优缺点分析

| 维度 | 评价 |
|------|------|
| **优点** | • 架构清晰，易于理解和维护<br>• 支持多数据源扩展<br>• 有完整的数据验证和冲突解决机制<br>• 支持数据版本追溯 |
| **缺点** | • 实时性较差（依赖定时任务）<br>• 需要额外的消息队列基础设施<br>• 开发成本较高 |
| **适用** | 生产环境，数据量中等，对实时性要求不高 |

---

## 方案二：事件驱动实时同步（推荐用于高实时性场景）

### 适用场景
- 数据源支持 Webhook
- 需要近实时更新
- 数据变更频繁

### 架构图

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Skill 同步平台 - 事件驱动架构                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Event Sources (事件源)                                             │
│   ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐                │
│   │ SkillsMP│  │Smithery │  │ GitHub  │  │  npm    │                │
│   │ Webhook │  │ Webhook │  │ Webhook │  │ Webhook │                │
│   └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘                │
│        │            │            │            │                       │
│        └────────────┴────────────┴────────────┘                       │
│                      │                                                │
│                      ▼                                                │
│   ┌─────────────────────────────────────────────────────────────┐    │
│   │              Event Router (事件路由器)                         │    │
│   │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │    │
│   │  │  Auth   │  │ Validate│  │  Route  │  │  Retry  │        │    │
│   │  │ 验证    │  │ 验证    │  │ 路由    │  │ 重试    │        │    │
│   │  └─────────┘  └─────────┘  └─────────┘  └─────────┘        │    │
│   └────────────────────────┬────────────────────────────────────┘    │
│                            │                                          │
│                            ▼                                          │
│   ┌─────────────────────────────────────────────────────────────┐    │
│   │              Message Queue (Redis Streams)                     │    │
│   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │    │
│   │  │ skill.create│  │ skill.update│  │  skill.delete       │  │    │
│   │  │  创建队列   │  │  更新队列   │  │   删除队列          │  │    │
│   │  └─────────────┘  └─────────────┘  └─────────────────────┘  │    │
│   └────────────────────────┬────────────────────────────────────┘    │
│                            │                                          │
│                            ▼                                          │
│   ┌─────────────────────────────────────────────────────────────┐    │
│   │              Event Processors (事件处理器)                     │    │
│   │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │    │
│   │  │Worker 1 │  │Worker 2 │  │Worker 3 │  │Worker N │        │    │
│   │  │(并发)   │  │(并发)   │  │(并发)   │  │(并发)   │        │    │
│   │  └─────────┘  └─────────┘  └─────────┘  └─────────┘        │    │
│   └────────────────────────┬────────────────────────────────────┘    │
│                            │                                          │
│                            ▼                                          │
│   ┌─────────────────────────────────────────────────────────────┐    │
│   │              Data Store (PostgreSQL + Redis)                   │    │
│   └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 核心代码实现

#### 1. Webhook 处理器

```typescript
// webhook/WebhookHandler.ts
export class SkillWebhookHandler {
  constructor(
    private eventRouter: EventRouter,
    private signatureValidator: SignatureValidator,
  ) {}
  
  async handle(req: Request, res: Response): Promise<void> {
    const source = req.params.source as DataSourceCode;
    const eventType = req.headers['x-webhook-event'] as string;
    const signature = req.headers['x-webhook-signature'] as string;
    
    // 1. 验证签名
    const isValid = await this.signatureValidator.validate(
      source,
      req.body,
      signature
    );
    
    if (!isValid) {
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }
    
    // 2. 解析事件
    const event = this.parseEvent(source, eventType, req.body);
    
    // 3. 路由到对应处理器
    await this.eventRouter.route(event);
    
    res.status(200).json({ received: true });
  }
  
  private parseEvent(
    source: DataSourceCode,
    type: string,
    payload: any
  ): SkillEvent {
    const adapters: Record<DataSourceCode, EventAdapter> = {
      skillsmp: new SkillsMPEventAdapter(),
      smithery: new SmitheryEventAdapter(),
      github: new GitHubEventAdapter(),
    };
    
    return adapters[source].adapt(type, payload);
  }
}
```

#### 2. 事件处理器

```typescript
// processor/EventProcessor.ts
export class SkillEventProcessor {
  constructor(
    private repository: SkillRepository,
    private conflictResolver: ConflictResolver,
    private cache: RedisCache,
  ) {}
  
  async process(event: SkillEvent): Promise<void> {
    // 幂等性检查
    const processed = await this.cache.get(`event:${event.id}`);
    if (processed) {
      logger.info(`Event ${event.id} already processed, skipping`);
      return;
    }
    
    try {
      switch (event.type) {
        case 'skill.create':
          await this.handleCreate(event);
          break;
        case 'skill.update':
          await this.handleUpdate(event);
          break;
        case 'skill.delete':
          await this.handleDelete(event);
          break;
      }
      
      // 标记已处理
      await this.cache.setex(`event:${event.id}`, 86400, '1');
      
    } catch (error) {
      logger.error(`Failed to process event ${event.id}`, error);
      throw error;
    }
  }
  
  private async handleCreate(event: SkillEvent): Promise<void> {
    const existing = await this.repository.findBySkillKey(
      `${event.source}:${event.externalId}`
    );
    
    if (existing) {
      logger.warn(`Skill ${event.externalId} already exists, converting to update`);
      await this.handleUpdate(event);
      return;
    }
    
    await this.repository.create({
      ...event.data,
      skillKey: `${event.source}:${event.externalId}`,
      source: event.source,
      externalId: event.externalId,
      createdAt: event.timestamp,
    });
    
    logger.info(`Created skill ${event.externalId} from ${event.source}`);
  }
  
  private async handleUpdate(event: SkillEvent): Promise<void> {
    const existing = await this.repository.findBySkillKey(
      `${event.source}:${event.externalId}`
    );
    
    if (!existing) {
      logger.warn(`Skill ${event.externalId} not found, converting to create`);
      await this.handleCreate(event);
      return;
    }
    
    // 冲突解决
    const resolution = await this.conflictResolver.resolve(existing, event.data);
    
    if (resolution.action === 'skip') {
      logger.info(`Skipped update for ${event.externalId} due to conflict resolution`);
      return;
    }
    
    await this.repository.update(existing.id, {
      ...resolution.mergedData,
      updatedAt: event.timestamp,
    });
    
    // 清除缓存
    await this.cache.del(`skill:${existing.id}`);
    
    logger.info(`Updated skill ${event.externalId} from ${event.source}`);
  }
}
```

### 优缺点分析

| 维度 | 评价 |
|------|------|
| **优点** | • 近实时同步（秒级延迟）<br>• 资源利用率高（按需处理）<br>• 天然支持削峰填谷<br>• 易于扩展和监控 |
| **缺点** | • 依赖数据源支持 Webhook<br>• 需要处理幂等性和乱序<br>• 架构复杂度较高<br>• 需要 Redis 等消息队列 |
| **适用** | 高实时性场景，数据源支持 Webhook |

---

## 方案三：Serverless 无服务器（推荐用于低成本启动）

### 适用场景
- 初创项目，预算有限
- 数据量小（< 1万条）
- 不需要复杂运维

### 架构图

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Skill 同步平台 - Serverless架构                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                    CloudWatch/EventBridge                    │   │
│   │              定时触发器 (每日 02:00 UTC)                      │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│                              ▼                                       │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                    Lambda Function                           │   │
│   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │   │
│   │  │   Fetch     │  │  Transform  │  │      Load           │  │   │
│   │  │  数据获取   │  │  数据转换   │  │   数据加载          │  │   │
│   │  │             │  │             │  │                     │  │   │
│   │  │ • API调用   │  │ • 字段映射  │  │ • DynamoDB写入     │  │   │
│   │  │ • 分页处理  │  │ • 数据验证  │  │ • 冲突检测         │  │   │
│   │  │ • 限流控制  │  │ • 质量评分  │  │ • 批量写入         │  │   │
│   │  └─────────────┘  └─────────────┘  └─────────────────────┘  │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│                              ▼                                       │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                    数据存储                                    │   │
│   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │   │
│   │  │  DynamoDB   │  │     S3      │  │   CloudWatch        │  │   │
│   │  │  主数据     │  │  原始数据   │  │   日志/监控         │  │   │
│   │  └─────────────┘  └─────────────┘  └─────────────────────┘  │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 核心代码实现（AWS Lambda）

```typescript
// lambda/skill-sync/handler.ts
import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDB } from 'aws-sdk';
import axios from 'axios';

const dynamodb = new DynamoDB.DocumentClient();
const TABLE_NAME = process.env.SKILLS_TABLE!;
const SOURCES = ['skillsmp', 'smithery', 'skills_sh'];

export const handler: APIGatewayProxyHandler = async (event) => {
  const results: SyncResult[] = [];
  
  for (const source of SOURCES) {
    try {
      const result = await syncFromSource(source);
      results.push(result);
    } catch (error) {
      console.error(`Failed to sync from ${source}`, error);
      results.push({
        source,
        status: 'failed',
        error: error.message,
      });
    }
  }
  
  // 发送通知（可选）
  await sendNotification(results);
  
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Sync completed',
      results,
    }),
  };
};

async function syncFromSource(source: string): Promise<SyncResult> {
  const config = getSourceConfig(source);
  let page = 1;
  let totalProcessed = 0;
  let totalFailed = 0;
  
  while (true) {
    // 获取数据
    const response = await axios.get(config.apiUrl, {
      params: { page, limit: 100 },
      headers: config.headers,
      timeout: 30000,
    });
    
    const skills = response.data.data || [];
    if (skills.length === 0) break;
    
    // 批量写入 DynamoDB
    const batchItems = skills.map(skill => ({
      PutRequest: {
        Item: {
          PK: `SKILL#${source}:${skill.id}`,
          SK: 'METADATA',
          ...normalizeSkill(skill, source),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          TTL: Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60, // 90天过期
        },
      },
    }));
    
    // DynamoDB 批量写入（最多25条）
    for (let i = 0; i < batchItems.length; i += 25) {
      const batch = batchItems.slice(i, i + 25);
      try {
        await dynamodb.batchWrite({
          RequestItems: { [TABLE_NAME]: batch },
        }).promise();
        totalProcessed += batch.length;
      } catch (error) {
        console.error('Batch write failed', error);
        totalFailed += batch.length;
      }
    }
    
    // 限流
    await sleep(1000);
    page++;
    
    // Lambda 超时保护（15分钟限制）
    const remainingTime = context.getRemainingTimeInMillis();
    if (remainingTime < 60000) { // 剩余少于1分钟
      console.warn('Approaching timeout, stopping sync');
      break;
    }
  }
  
  return {
    source,
    status: 'success',
    totalProcessed,
    totalFailed,
  };
}

function normalizeSkill(raw: any, source: string): NormalizedSkill {
  const mappings: Record<string, FieldMapping> = {
    skillsmp: {
      name: 'name',
      description: 'description',
      author: 'author',
      stars: 'stars',
      installs: 'installs',
    },
    smithery: {
      name: 'name',
      description: 'description',
      author: 'owner',
      stars: 'stargazers_count',
      installs: 'install_count',
    },
  };
  
  const mapping = mappings[source];
  const normalized: NormalizedSkill = {
    source,
    skillKey: `${source}:${raw.id || raw.repo}`,
  };
  
  for (const [target, sourceField] of Object.entries(mapping)) {
    normalized[target] = raw[sourceField];
  }
  
  return normalized;
}
```

### 优缺点分析

| 维度 | 评价 |
|------|------|
| **优点** | • 零运维成本<br>• 按需付费（数据量小时几乎免费）<br>• 自动扩缩容<br>• 快速启动 |
| **缺点** | • Lambda 15分钟执行限制<br>• 冷启动延迟<br>• Vendor lock-in<br>• 调试困难 |
| **适用** | 初创项目，数据量小，快速验证 MVP |

---

## 📊 三套方案对比总结

| 维度 | 方案一：ETL Pipeline | 方案二：事件驱动 | 方案三：Serverless |
|------|---------------------|-----------------|-------------------|
| **实时性** | ⭐⭐ 分钟级 | ⭐⭐⭐⭐⭐ 秒级 | ⭐⭐⭐ 分钟级 |
| **成本** | ⭐⭐⭐ 中等 | ⭐⭐ 较高 | ⭐⭐⭐⭐⭐ 低 |
| **复杂度** | ⭐⭐⭐ 中等 | ⭐⭐ 高 | ⭐⭐⭐⭐⭐ 低 |
| **可扩展性** | ⭐⭐⭐⭐ 良好 | ⭐⭐⭐⭐⭐ 优秀 | ⭐⭐⭐ 一般 |
| **可靠性** | ⭐⭐⭐⭐⭐ 高 | ⭐⭐⭐⭐ 高 | ⭐⭐⭐ 中等 |
| **运维成本** | ⭐⭐⭐ 中等 | ⭐⭐ 高 | ⭐⭐⭐⭐⭐ 低 |
| **开发周期** | ⭐⭐⭐ 2-4周 | ⭐⭐ 4-6周 | ⭐⭐⭐⭐⭐ 1-2周 |

---

## 🎯 最终推荐

### 阶段化实施建议

```
Phase 1 (MVP): 方案三 Serverless
  └── 目标：快速上线，验证业务逻辑
  └── 周期：1-2周
  └── 数据量：< 1万条

Phase 2 (增长期): 方案一 ETL Pipeline  
  └── 目标：稳定生产环境，支持多数据源
  └── 周期：2-4周
  └── 数据量：1万-10万条

Phase 3 (成熟期): 方案二 事件驱动
  └── 目标：实时同步，极致用户体验
  └── 周期：4-6周
  └── 数据量：> 10万条
```

### 技术选型建议

| 组件 | 推荐方案 |
|------|---------|
| **数据库** | PostgreSQL (主) + Redis (缓存/队列) |
| **消息队列** | Redis Streams / RabbitMQ |
| **调度器** | node-cron / Bull Queue |
| **监控** | Prometheus + Grafana |
| **日志** | ELK Stack / Loki |
| **告警** | PagerDuty / 钉钉机器人 |

---

## 📝 字段映射参考

### SkillsMP 字段映射

| 目标字段 | 来源字段 | 说明 |
|----------|----------|------|
| skill_key | `skillsmp:${repo}` | 唯一标识 |
| name | name | 技能名称 |
| description | description | 描述 |
| author | author | 作者 |
| source | `skillsmp` | 固定值 |
| source_id | repo | GitHub 仓库名 |
| source_url | url | 详情页 URL |
| stars | stars | GitHub stars |
| download_count | installs | 安装次数 |
| category | category | 分类 |
| tags | tags | 标签数组 |

### Smithery 字段映射

| 目标字段 | 来源字段 | 说明 |
|----------|----------|------|
| skill_key | `smithery:${repo}` | 唯一标识 |
| name | name | 技能名称 |
| description | description | 描述 |
| author | owner | 作者 |
| source | `smithery` | 固定值 |
| source_id | repo | GitHub 仓库路径 |
| source_url | `https://smithery.ai/skills/${repo}` | 构造 URL |
| stars | stargazers_count | GitHub stars |
| download_count | install_count | 安装次数 |

---

## 🔧 定时任务配置

```typescript
// scheduler.ts
import { CronJob } from 'cron';

export class SkillSyncScheduler {
  private jobs: Map<string, CronJob> = new Map();

  scheduleAll(): void {
    // SkillsMP - 每日凌晨2点全量同步
    this.schedule('skillsmp-full', '0 2 * * *', () => 
      this.runSync('skillsmp', 'full')
    );
    
    // Smithery - 每日凌晨3点全量同步
    this.schedule('smithery-full', '0 3 * * *', () => 
      this.runSync('smithery', 'full')
    );
    
    // Skills.sh - 每日凌晨4点全量同步
    this.schedule('skills-sh-full', '0 4 * * *', () => 
      this.runSync('skills_sh', 'full')
    );
    
    // GitHub Stars - 每小时增量更新
    this.schedule('github-stars-incremental', '0 * * * *', () => 
      this.runSync('github', 'incremental')
    );
    
    // 数据质量检查 - 每日早上8点
    this.schedule('quality-check', '0 8 * * *', () => 
      this.runQualityCheck()
    );
  }
  
  private schedule(name: string, cron: string, handler: () => Promise<void>): void {
    const job = new CronJob(cron, async () => {
      try {
        await handler();
      } catch (error) {
        logger.error(`Job ${name} failed`, error);
      }
    });
    this.jobs.set(name, job);
    job.start();
  }
}
```

---

## 🚨 错误处理与重试

```typescript
// retry.ts
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      logger.log(`[Retry] Attempt ${i + 1} failed: ${lastError.message}`);
      if (i < maxRetries - 1) {
        await new Promise(r => setTimeout(r, delay * Math.pow(2, i)));
      }
    }
  }
  
  throw lastError!;
}
```

---

## 📈 监控指标

| 指标 | 说明 | 告警阈值 |
|------|------|----------|
| **sync_latency** | 同步延迟（秒）| > 300s |
| **sync_success_rate** | 同步成功率 | < 95% |
| **records_per_minute** | 每分钟处理记录数 | < 100 |
| **error_rate** | 错误率 | > 5% |
| **dead_letter_count** | 死信队列数量 | > 100 |

---

*文档生成完成 - 2026-04-10*
