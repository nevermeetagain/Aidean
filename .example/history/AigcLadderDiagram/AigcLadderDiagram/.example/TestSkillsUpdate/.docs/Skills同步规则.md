# Skills同步规则

> 版本：v1.0 | 更新日期：2026-04-07
> 同步策略：每日全量同步，优先级冲突处理

---

## 一、数据源优先级

| 优先级 | 数据源 | 说明 |
|--------|--------|------|
| P1（最高） | skillsmp.com | 中文市场，有REST API，数据最全 |
| P2 | smithery.ai | 英文市场，数据量大 |
| P3 | skills.sh | Vercel官方，权威但API待探索 |

### 冲突处理规则

当同一技能在多个平台出现时（以GitHub仓库名为唯一标识），按优先级保留：
- **高优先级数据覆盖低优先级**
- 保留字段：name、description、author、category、tags
- 不保留字段（如取高优先级）：install_count

---

## 二、同步表结构（ai_skill扩展）

```sql
-- 新增同步专用字段
ALTER TABLE ai_skill ADD COLUMN IF NOT EXISTS source VARCHAR(50);
ALTER TABLE ai_skill ADD COLUMN IF NOT EXISTS source_id VARCHAR(255);
ALTER TABLE ai_skill ADD COLUMN IF NOT EXISTS source_url VARCHAR(500);
ALTER TABLE ai_skill ADD COLUMN IF NOT EXISTS stars INTEGER DEFAULT 0;
ALTER TABLE ai_skill ADD COLUMN IF NOT EXISTS install_command VARCHAR(500);
ALTER TABLE ai_skill ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

-- 唯一索引（来源+来源ID）
CREATE UNIQUE INDEX idx_skill_source_unique ON ai_skill(source, source_id) WHERE deleted_at IS NULL;
```

---

## 三、各平台同步规则

### 3.1 skillsmp.com（优先级P1）

**API端点**：
```
GET https://api.skillsmp.com/v1/skills
```

**请求参数**：

| 参数 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `search` | String | 搜索关键词 | `react` |
| `category` | String | 分类 | `development` |
| `sort` | String | 排序 | `stars`/`latest` |
| `page` | Integer | 页码 | `1` |
| `limit` | Integer | 每页数量（最大100） | `100` |

**响应字段映射**：

| 目标字段 | 来源字段 | 说明 |
|----------|----------|------|
| name | name | 技能名称 |
| description | description | 简短描述 |
| author | author | 作者 |
| source | 固定值 `skillsmp` | 来源平台 |
| source_id | repo | GitHub仓库名 |
| source_url | url | 详情页URL |
| stars | stars | GitHub stars |
| install_count | installs | 安装次数 |
| category | category | 分类 |
| tags | tags | 标签数组 |
| last_synced_at | NOW() | 同步时间 |

**同步脚本示例**（TypeScript）：

```typescript
// scripts/sync/skillsmp-sync.ts
interface SkillsMPResponse {
  data: SkillsMPItem[];
  total: number;
  page: number;
}

interface SkillsMPItem {
  name: string;
  description: string;
  author: string;
  repo: string;
  url: string;
  stars: number;
  installs: number;
  category: string;
  tags: string[];
  updated_at: string;
}

async function syncSkillsMP(page: number = 1, limit: number = 100): Promise<number> {
  const allSkills: SkillsMPItem[] = [];
  
  while (true) {
    const response = await fetch(
      `https://api.skillsmp.com/v1/skills?page=${page}&limit=${limit}&sort=stars`
    );
    
    if (!response.ok) {
      throw new Error(`SkillsMP API error: ${response.status}`);
    }
    
    const data: SkillsMPResponse = await response.json();
    allSkills.push(...data.data);
    
    if (data.data.length < limit || allSkills.length >= data.total) {
      break;
    }
    
    page++;
  }
  
  // 批量写入数据库
  let inserted = 0;
  for (const skill of allSkills) {
    await prisma.ai_skill.upsert({
      where: {
        source_unique: {
          source: 'skillsmp',
          source_id: skill.repo
        }
      },
      create: {
        name: skill.name,
        description: skill.description,
        author: skill.author,
        source: 'skillsmp',
        source_id: skill.repo,
        source_url: skill.url,
        stars: skill.stars,
        install_count: skill.installs,
        category: skill.category,
        tags: skill.tags,
        last_synced_at: new Date()
      },
      update: {
        name: skill.name,
        description: skill.description,
        stars: skill.stars,
        install_count: skill.installs,
        category: skill.category,
        tags: skill.tags,
        last_synced_at: new Date()
      }
    });
    inserted++;
  }
  
  return inserted;
}

// 入口函数
export async function runSkillsMPSync() {
  console.log('[SkillsMP] Starting full sync...');
  const count = await syncSkillsMP();
  console.log(`[SkillsMP] Synced ${count} skills`);
}
```

---

### 3.2 smithery.ai（优先级P2）

**说明**：需爬取网页或探索API，以下为爬取方案。

**目标页面**：
```
GET https://smithery.ai/skills
```

**字段映射**：

| 目标字段 | 来源字段 | 说明 |
|----------|----------|------|
| name | skill name | 技能名称 |
| description | description | 简短描述 |
| author | owner org | 作者 |
| source | 固定值 `smithery` | 来源平台 |
| source_id | repo path | GitHub仓库路径 |
| source_url | skills page URL | 详情页URL |
| stars | 需计算 | GitHub stars |
| install_count | installs | 安装次数 |
| last_synced_at | NOW() | 同步时间 |

**同步脚本示例**（TypeScript + Puppeteer）：

```typescript
// scripts/sync/smithery-sync.ts
import { chromium } from 'playwright';

interface SmitherySkill {
  name: string;
  description: string;
  author: string;
  repo: string;
  url: string;
  installs: number;
}

async function fetchSmitherySkills(): Promise<SmitherySkill[]> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const skills: SmitherySkill[] = [];
  let pageNum = 1;
  const maxPages = 10; // 可配置
  
  while (pageNum <= maxPages) {
    await page.goto(`https://smithery.ai/skills?page=${pageNum}`);
    await page.waitForSelector('[data-skill-card]');
    
    const pageSkills = await page.$$eval('[data-skill-card]', (cards) => {
      return cards.map(card => ({
        name: card.dataset.name || '',
        description: card.dataset.description || '',
        author: card.dataset.owner || '',
        repo: card.dataset.repo || '',
        url: card.dataset.url || '',
        installs: parseInt(card.dataset.installs || '0')
      }));
    });
    
    if (pageSkills.length === 0) break;
    
    skills.push(...pageSkills);
    pageNum++;
  }
  
  await browser.close();
  return skills;
}

async function syncSmithery() {
  const skills = await fetchSmitherySkills();
  
  for (const skill of skills) {
    await prisma.ai_skill.upsert({
      where: {
        source_unique: {
          source: 'smithery',
          source_id: skill.repo
        }
      },
      create: {
        name: skill.name,
        description: skill.description,
        author: skill.author,
        source: 'smithery',
        source_id: skill.repo,
        source_url: skill.url,
        install_count: skill.installs,
        last_synced_at: new Date()
      },
      update: {
        name: skill.name,
        description: skill.description,
        install_count: skill.installs,
        last_synced_at: new Date()
      }
    });
  }
}

export async function runSmitherySync() {
  console.log('[Smithery] Starting sync...');
  await syncSmithery();
  console.log('[Smithery] Sync completed');
}
```

---

### 3.3 skills.sh（优先级P3）

**说明**：Vercel官方Skills市场，需探索API或爬取。

**目标页面**：
```
GET https://skills.sh/
```

**字段映射**：

| 目标字段 | 来源字段 | 说明 |
|----------|----------|------|
| name | skill name | 技能名称 |
| description | description | 简短描述 |
| author | org name | 作者 |
| source | 固定值 `skills_sh` | 来源平台 |
| source_id | skill path | 技能路径 |
| source_url | skills page URL | 详情页URL |
| stars | 需计算 | GitHub stars |
| install_count | installs | 安装次数 |
| last_synced_at | NOW() | 同步时间 |

**同步脚本示例**：

```typescript
// scripts/sync/skills-sh-sync.ts
async function syncSkillsSh() {
  // skills.sh 有公开的 leaderboard 页面，可参考 smithery 方式爬取
  // 或者探索其 API 端点
  console.log('[Skills.sh] Manual implementation required');
  // 待实现...
}
```

---

## 四、定时任务配置

### 4.1 Cron表达式

```typescript
// lib/cron.ts
import { CronJob } from 'cron';

const syncJobs = [
  // SkillsMP - 每日凌晨2点
  new CronJob('0 2 * * *', () => {
    const { runSkillsMPSync } = require('./sync/skillsmp-sync');
    runSkillsMPSync();
  }),
  
  // Smithery - 每日凌晨3点
  new CronJob('0 3 * * *', () => {
    const { runSmitherySync } = require('./sync/smithery-sync');
    runSmitherySync();
  }),
  
  // Skills.sh - 每日凌晨4点
  new CronJob('0 4 * * *', () => {
    const { runSkillsShSync } = require('./sync/skills-sh-sync');
    runSkillsShSync();
  }),
];

export function startSyncJobs() {
  syncJobs.forEach(job => job.start());
  console.log('[Cron] Sync jobs started');
}
```

### 4.2 数据库记录同步日志

```sql
CREATE TABLE sync_log (
  id              BIGINT PRIMARY KEY DEFAULT nextval('sync_log_id_seq'),
  source          VARCHAR(50) NOT NULL,
  status          VARCHAR(20) NOT NULL,  -- success/failed
  total_count     INTEGER DEFAULT 0,
  inserted_count INTEGER DEFAULT 0,
  updated_count  INTEGER DEFAULT 0,
  error_message  TEXT,
  started_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);
```

---

## 五、错误处理与重试

### 5.1 重试策略

```typescript
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
      console.log(`[Retry] Attempt ${i + 1} failed: ${lastError.message}`);
      if (i < maxRetries - 1) {
        await new Promise(r => setTimeout(r, delay * Math.pow(2, i)));
      }
    }
  }
  
  throw lastError!;
}
```

### 5.2 速率限制

- SkillsMP API：每分钟100次请求
- Smithery：建议添加延时（1-2秒/请求）
- 整体同步窗口：6小时内完成

---

## 六、总结

| 任务 | 执行时间 | 优先级 | 说明 |
|------|----------|--------|------|
| skillsmp.com | 每日02:00 | P1 | 主数据源，全量同步 |
| smithery.ai | 每日03:00 | P2 | 辅助数据源 |
| skills.sh | 每日04:00 | P3 | 补充数据源 |

**关键点**：
1. 冲突处理以P1为准，确保数据一致性
2. 不获取GitHub实时stars，使用各平台已有数据
3. 同步失败记录日志，支持手动重试