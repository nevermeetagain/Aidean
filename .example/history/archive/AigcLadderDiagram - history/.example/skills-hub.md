# skills-hub 竞品深度分析报告

> 来源：https://github.com/qufei1993/skills-hub
> 分析日期：2026-03-26
> 当前版本：v0.4.1 | License：MIT

---

## 一、架构设计

### 1.1 技术栈

| 层级 | 技术 | 版本 | 说明 |
|---|---|---|---|
| **桌面框架** | Tauri 2 | ^2.9.x | Rust后端 + WebView前端，与cc-switch一致 |
| **前端框架** | React | ^19.2.3 | 最新版本 |
| **构建工具** | Vite | ^7.3.1 | 极速构建 |
| **语言** | TypeScript | ~5.9.3 | 严格类型 |
| **样式** | Tailwind CSS v4 | ^4.1.18 | 最新版，@tailwindcss/vite集成 |
| **路由** | react-router-dom | ^7.12.0 | 前端路由 |
| **Markdown渲染** | react-markdown | ^10.1.0 | 支持GFM+frontmatter |
| **代码高亮** | react-syntax-highlighter | ^16.1.1 | 40+语言 |
| **国际化** | i18next + react-i18next | ^25/^16 | 多语言 |
| **Toast通知** | Sonner | ^2.0.7 | 与cc-switch相同 |
| **图标** | lucide-react | ^0.562.0 | 线性图标 |
| **本地数据库** | rusqlite（SQLite）| - | Rust端SQLite |
| **Tauri插件** | dialog/opener/updater | ^2.x | 平台能力 |
| **后端语言** | Rust（Cargo）| stable | 核心业务逻辑 |

### 1.2 代码结构

```
skills-hub/
├── src/                          # 前端（React + TypeScript）
│   ├── components/
│   │   ├── Layout.tsx            # 应用布局
│   │   └── skills/               # Skills相关组件
│   │       ├── ExplorePage.tsx   # 探索/商城页
│   │       ├── FilterBar.tsx     # 筛选栏
│   │       ├── Header.tsx        # 头部导航
│   │       ├── LoadingOverlay.tsx
│   │       ├── SettingsPage.tsx  # 设置页（全页面）
│   │       ├── SkillCard.tsx     # Skill卡片
│   │       ├── SkillDetailView.tsx # Skill详情（文件树+Markdown）
│   │       ├── SkillsList.tsx    # My Skills列表
│   │       ├── modals/           # 弹窗
│   │       └── types.ts          # 类型定义
│   ├── pages/
│   │   └── Dashboard.tsx         # 主仪表盘页
│   └── i18n/                     # 国际化
│
├── src-tauri/src/               # 后端（Rust）
│   ├── commands/                 # Tauri命令入口
│   │   └── mod.rs               # 所有命令注册
│   └── core/                    # 核心业务逻辑
│       ├── skill_store.rs       # SQLite数据访问（SkillStore）
│       ├── installer.rs         # 安装器（本地/Git/GitHub）
│       ├── sync_engine.rs       # 同步引擎（symlink/junction/copy）
│       ├── tool_adapters/       # IDE适配器（38+工具）
│       ├── git_fetcher.rs       # Git克隆/拉取
│       ├── github_download.rs   # GitHub API目录下载
│       ├── github_search.rs     # skills.sh搜索
│       ├── featured_skills.rs   # 精选Skills（ClawHub）
│       ├── skills_search.rs     # 本地搜索
│       ├── onboarding.rs        # 迁移接管
│       ├── central_repo.rs      # 中心仓库管理
│       ├── skill_files.rs       # Skill文件读取
│       ├── content_hash.rs      # 内容哈希（变更检测）
│       ├── cache_cleanup.rs     # Git缓存清理
│       ├── cancel_token.rs      # 取消令牌
│       └── temp_cleanup.rs      # 临时文件清理
│
├── featured-skills.json         # 精选Skills数据（GitHub Actions每日更新，300个）
└── docs/
    ├── README.zh.md             # 中文文档
    └── CHANGELOG.zh.md          # 中文更新日志
```

### 1.3 SQLite数据库 Schema

```sql
-- skills表：中心仓库的Skill记录
CREATE TABLE skills (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  source_type TEXT NOT NULL,      -- local/git/github
  source_ref TEXT NULL,           -- Git URL或本地路径
  source_revision TEXT NULL,      -- Git commit hash
  central_path TEXT NOT NULL UNIQUE, -- 中心仓库路径
  content_hash TEXT NULL,         -- 内容哈希（变更检测）
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  last_sync_at INTEGER NULL,
  last_seen_at INTEGER NOT NULL,
  status TEXT NOT NULL            -- active/deleted
);

-- skill_targets表：每个Skill同步到哪些IDE工具
CREATE TABLE skill_targets (
  id TEXT PRIMARY KEY,
  skill_id TEXT NOT NULL,
  tool TEXT NOT NULL,             -- cursor/claude_code/opencode等
  target_path TEXT NOT NULL,      -- 目标目录路径
  mode TEXT NOT NULL,             -- symlink/junction/copy
  status TEXT NOT NULL,           -- synced/error/pending
  last_error TEXT NULL,
  synced_at INTEGER NULL,
  UNIQUE(skill_id, tool),
  FOREIGN KEY(skill_id) REFERENCES skills(id) ON DELETE CASCADE
);

-- settings表：应用设置
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- discovered_skills表：迁移接管时扫描到的已有Skills
CREATE TABLE discovered_skills (
  id TEXT PRIMARY KEY,
  tool TEXT NOT NULL,
  found_path TEXT NOT NULL,
  name_guess TEXT NULL,
  fingerprint TEXT NULL,
  found_at INTEGER NOT NULL,
  imported_skill_id TEXT NULL,
  FOREIGN KEY(imported_skill_id) REFERENCES skills(id) ON DELETE SET NULL
);
```

### 1.4 同步引擎（sync_engine.rs）— 核心算法

```rust
// 三级fallback同步策略
pub enum SyncMode { Auto, Symlink, Junction, Copy }

pub fn sync_dir_hybrid(source: &Path, target: &Path) -> Result<SyncOutcome> {
    // 1. 尝试符号链接（Symlink）
    if try_link_dir(source, target).is_ok() {
        return Ok(SyncOutcome { mode_used: SyncMode::Symlink, ... });
    }
    // 2. Windows专用：Junction（目录联接点）
    #[cfg(windows)]
    if try_junction(source, target).is_ok() {
        return Ok(SyncOutcome { mode_used: SyncMode::Junction, ... });
    }
    // 3. 最终fallback：完整复制
    copy_dir_recursive(source, target)?;
    Ok(SyncOutcome { mode_used: SyncMode::Copy, ... })
}
```

> **注意**：Cursor不支持通过symlink发现Skills（已知issue），因此Cursor目标强制使用Copy模式。

### 1.5 支持的AI工具（38+）

| 工具 | Skills目录 |
|---|---|
| Cursor | `~/.cursor/skills/` |
| Claude Code | `~/.claude/skills/` |
| OpenCode | `~/.config/opencode/skills/` |
| Windsurf | `~/.codeium/windsurf/skills/` |
| Cline | `~/.cline/skills/` |
| Codex | `~/.codex/skills/` |
| Amp | `~/.config/agents/skills/` |
| Gemini CLI | `~/.gemini/skills/` |
| GitHub Copilot | `~/.copilot/skills/` |
| Trae | `~/.trae/skills/` |
| Roo Code | `~/.roo/skills/` |
| Kilo Code | `~/.kilocode/skills/` |
| Goose | `~/.config/goose/skills/` |
| … 以及更多26个工具 | 完整列表见README.zh.md |

---

## 二、核心功能分析

### 2.1 解决的核心问题

1. **Skills碎片化**：不同AI工具各有自己的Skills目录，手动维护极其繁琐
2. **多工具同步困难**：装一个Skill要手动复制到每个工具目录
3. **Skills发现困难**：没有统一的商城入口，不知道有哪些好用的Skill
4. **版本管理缺失**：不知道Skill是否有更新，无法追踪来源
5. **迁移成本高**：已有Skills散落各工具，无法统一管理

**核心价值主张**：Install once, sync everywhere.

---

## 三、功能清单

### 3.1 My Skills（技能管理）⭐ 核心

| 功能 | 说明 | 优先级 |
|---|---|---|
| Skills列表 | 展示中心仓库所有Skills，含同步状态 | P0 |
| Skill卡片 | 名称/来源/描述/更新时间/同步状态 | P0 |
| 本地文件夹导入 | 从本地目录导入Skill | P0 |
| Git URL导入 | 从Git仓库URL导入，支持分支/路径 | P0 |
| GitHub目录导入 | 解析GitHub URL，支持多Skill仓库批量选择 | P0 |
| `.claude/skills/`格式 | 支持多Skill仓库的skills子目录格式 | P0 |
| 一键同步到所有工具 | 单个Skill同步到所有已检测IDE | P0 |
| 批量同步 | 所有Skills一键同步 | P0 |
| 更新Skill | 从源重新拉取最新版本 | P1 |
| 删除Skill | 含确认，自动清理所有目标目录的链接/副本 | P1 |
| 内容哈希检测 | `content_hash`对比，精确判断是否有变更 | P1 |
| 同步状态显示 | 每个工具的同步状态（已同步/错误/待同步）| P1 |
| Skill详情页 | 文件树浏览 + Markdown渲染 + 语法高亮 | P1 |
| Frontmatter元数据表 | YAML frontmatter渲染为GitHub风格表格 | P2 |

### 3.2 Explore（探索/商城）

| 功能 | 说明 | 优先级 |
|---|---|---|
| 精选Skills展示 | ClawHub每日更新，300个精选Skills | P0 |
| 在线搜索 | skills.sh API实时搜索（2+字符触发，500ms防抖）| P0 |
| 搜索去重 | 搜索结果与精选列表去重，分区展示 | P1 |
| 一键安装 | 从探索页直接安装并同步 | P0 |
| 前端过滤 | 按分类/标签本地过滤 | P1 |
| Stars/下载数展示 | 展示popularity指标 | P1 |
| 来源链接 | 显示source_url，可跳转到GitHub | P1 |

### 3.3 迁移接管（Onboarding Migration）

| 功能 | 说明 | 优先级 |
|---|---|---|
| 扫描已有Skills | 扫描本机所有已安装工具的Skills目录 | P1 |
| 批量导入 | 发现已有Skills后一键导入到中心仓库 | P1 |
| 迁移后同步 | 导入后立即同步回所有工具 | P1 |

### 3.4 新工具检测

| 功能 | 说明 | 优先级 |
|---|---|---|
| 自动检测新IDE | 启动时检测新安装的AI工具 | P1 |
| 提示同步 | 发现新工具时提示是否同步已管理Skills | P1 |

### 3.5 设置（Settings）

| 功能 | 说明 | 优先级 |
|---|---|---|
| 存储路径配置 | 自定义中心仓库存储位置 | P0 |
| 语言切换 | 中文/英文 | P1 |
| 主题切换 | 暗色/亮色 | P1 |
| GitHub Token | 可选填入，API速率从60→5000次/小时 | P1 |
| 应用内更新检查 | 检查并安装新版本，无需离开应用 | P1 |
| Git缓存配置 | 缓存保留天数 + 新鲜度窗口（秒）| P2 |

---

## 四、功能差异分析

### 4.1 skills-hub 独特功能

| 独特功能 | 说明 | 参考价值 |
|---|---|---|
| **38+工具适配器** | 覆盖市面上几乎所有AI编程工具 | 极高 |
| **三级同步fallback** | symlink→junction(Win)→copy，自动选最优 | 极高 |
| **Cursor强制copy模式** | 已知Cursor不支持symlink发现Skills，自动处理 | 高 |
| **内容哈希变更检测** | content_hash精确判断是否需要更新 | 高 |
| **ClawHub每日精选** | GitHub Actions自动更新300个精选Skills | 高 |
| **skills.sh在线搜索** | 实时API搜索，500ms防抖 | 高 |
| **frontmatter元数据渲染** | YAML frontmatter渲染为GitHub风格表格 | 中 |
| **迁移接管（Onboarding）** | 扫描已有Skills批量导入 | 高 |
| **多Skill仓库批量选择** | 从多Skill仓库选择要安装的Skills | 中 |
| **Git克隆缓存** | 避免重复拉取，提升安装速度 | 中 |
| **取消令牌（CancelToken）** | 支持取消长时间安装操作 | 中 |
| **Tailwind CSS v4** | 最新版Tailwind，@tailwindcss/vite集成 | 低 |

### 4.2 skills-hub 缺失功能（Aidean Desktop 机会点）

| 缺失功能 | Aidean Desktop 机会点 |
|---|---|
| **MCP管理** | 同时管理Skills+MCP，统一入口 |
| **Agent管理** | Agent定义文件统一管理 |
| **任务环境** | Skills+MCP+Agent组合收藏夹 |
| **君子订阅会员** | 付费私有Skills，专属精选 |
| **平台联动** | 网页收藏夹一键推送到桌面 |
| **公众号联动** | 微信触发桌面操作 |
| **AI聚合搜索** | 语义推荐最优Skills组合 |
| **代币体系** | AID Token空投激励 |
| **Provider/API Key管理** | cc-switch的Provider切换能力 |
| **会话管理** | AI会话扫描/搜索/恢复 |
| **伴侣插件** | VS Code插件注入提示词 |
| **本地HTTP端点** | mcp-router的MCP聚合路由 |

---

## 五、功能迭代分析

### 5.1 版本迭代节奏

```
v0.1.0  2026-01-25  初始版本，核心Skills管理（本地/Git导入+同步）
v0.2.0  2026-02-xx  Skill更新功能，managed skill更新回灌
v0.3.0  2026-03-15  Explore探索页（独立页面）+ClawHub精选+skills.sh搜索+详情页
v0.4.0  2026-03-20  应用内更新检查+QoderWork适配+设置页升级+精选聚合7个仓库
v0.4.1  2026-03-21  frontmatter元数据表渲染
```

**节奏特征**：
- 约2-4周发布一个版本
- 每版本聚焦1-2个核心功能
- 社区驱动：issue来源的功能优先实现
- 快速响应用户反馈（如Cursor symlink问题当版修复）

### 5.2 功能演进轨迹

```
初期  → 本地管理（导入+同步+更新）
  ↓
中期  → 在线探索（ClawHub+skills.sh）
         详情查看（文件树+Markdown）
  ↓
近期  → 应用内更新，设置页升级
         更多工具适配（38+）
  ↓
趋势  → 向「Skills生态平台」演进，数据来源更丰富
```

---

## 六、交互体验分析

### 6.1 核心操作流程

**从探索页安装Skill**
```
1. 点击「Explore」标签
2. 浏览ClawHub精选 或 搜索关键词
3. 找到目标Skill，点击「Install」
4. 自动同步到所有已检测IDE工具
5. 切换到「My Skills」查看安装结果
（全程：3-4步，<30秒）
```

**从Git URL安装**
```
1. 点击「Add Skill」→ 选择Git URL
2. 输入GitHub仓库URL（支持/tree/<branch>/<path>格式）
3. 如果是多Skill仓库，出现批量选择界面
4. 确认安装 → 拉取并同步
```

**更新已安装Skill**
```
1. 在My Skills找到目标Skill
2. 点击「Update」
3. 从源仓库拉取最新版
4. content_hash对比，只有变更时才更新
5. 自动回灌到所有copy模式目标
```

### 6.2 页面跳转结构

```
主窗口
├── Header（顶部导航）
│   ├── My Skills（默认）
│   ├── Explore（探索商城）
│   └── Settings（设置）
│
├── My Skills 页
│   ├── FilterBar（筛选栏）
│   ├── SkillsList（Skills列表）
│   │   └── SkillCard（单个Skill卡片）
│   │       └── → SkillDetailView（详情页）
│   │           ├── 文件树
│   │           └── Markdown渲染+代码高亮
│   └── LoadingOverlay（安装中遮罩）
│
├── Explore 页
│   ├── FilterBar
│   ├── 精选Skills列表（ClawHub）
│   └── 搜索结果列表（skills.sh）
│
└── Settings 页
    ├── 存储路径
    ├── GitHub Token
    ├── 语言/主题
    └── 检查更新
```

### 6.3 设计亮点

| 设计点 | 说明 |
|---|---|
| **三标签导航** | My Skills / Explore / Settings，简洁清晰 |
| **SkillDetailView** | 文件树+Markdown渲染，开发者熟悉的体验 |
| **同步状态可视化** | 每个工具的同步状态一目了然 |
| **frontmatter表格** | SKILL.md元数据渲染为GitHub风格表格 |
| **LoadingOverlay** | 安装过程有全屏遮罩+进度提示 |
| **Sonner Toast** | 操作结果即时反馈 |

---

## 七、UI设计风格

### 7.1 视觉风格

```
风格定位：简洁实用、开发者工具风、信息密度中等

颜色体系：
- Tailwind CSS v4 默认设计系统
- 暗色/亮色主题切换
- 状态色：green（已同步）/ yellow（待同步）/ red（错误）

字体：系统字体栈
布局：三栏结构（Header + 内容区）
```

### 7.2 组件规范

```
图标：lucide-react（统一线性图标）
Toast：Sonner
Markdown：react-markdown + react-syntax-highlighter
基础组件：自定义（无UI组件库，轻量化）
CSS：Tailwind CSS v4（原子化）
```

---

## 八、对 Aidean Desktop 的借鉴方案

### 8.1 直接复用的核心模块

| skills-hub方案 | Aidean Desktop 应用方式 |
|---|---|
| **sync_engine.rs（同步引擎）** | 直接采用三级fallback（symlink→junction→copy）|
| **tool_adapters/（38+适配器）** | 直接复用所有工具路径配置表 |
| **Cursor强制copy模式** | 继承此规则，避免Cursor symlink bug |
| **content_hash变更检测** | 用于Skills/MCP配置变更检测 |
| **SQLite Schema设计** | skills/skill_targets/settings三表设计 |
| **installer.rs（安装器）** | 本地/Git/GitHub三种来源安装逻辑 |
| **git_fetcher.rs（Git缓存）** | 避免重复拉取的缓存机制 |
| **CancelToken** | 长时间操作可取消 |
| **featured-skills.json** | GitHub Actions每日更新精选数据，作为离线缓存 |
| **Explore页设计** | 精选+搜索双区展示，去重逻辑 |
| **Onboarding迁移** | 扫描已有Skills批量导入 |
| **SkillDetailView** | 文件树+Markdown渲染+frontmatter表格 |

### 8.2 需要扩展的地方

| skills-hub局限 | Aidean Desktop 扩展方案 |
|---|---|
| 只管Skills，不管MCP/Agent | 扩展skill_store为通用tool_store，支持Skills/MCP/Agent三类 |
| 无收藏夹概念 | 新增favorites表，支持按场景组合工具 |
| 无任务环境 | 新增environments表（Skills+MCP+Agent组合）|
| 无会员体系 | 新增subscription表，控制访问权限 |
| 无平台同步 | 新增sync_state表，记录与平台的同步状态 |
| 无代币体系 | 新增token_ledger表 |

### 8.3 扩展后的SQLite Schema（Aidean版）

```sql
-- 继承skills-hub的核心表
CREATE TABLE skills (  -- 同skills-hub，保持兼容
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_ref TEXT NULL,
  central_path TEXT NOT NULL UNIQUE,
  content_hash TEXT NULL,
  updated_at INTEGER NOT NULL,
  status TEXT NOT NULL
);

CREATE TABLE skill_targets ( -- 同skills-hub
  skill_id TEXT NOT NULL,
  tool TEXT NOT NULL,
  mode TEXT NOT NULL,  -- symlink/junction/copy
  status TEXT NOT NULL,
  UNIQUE(skill_id, tool)
);

-- 新增：MCP配置表
CREATE TABLE mcp_servers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  command TEXT NOT NULL,
  args TEXT NOT NULL,   -- JSON array
  env TEXT NULL,        -- JSON object
  source_type TEXT NOT NULL,  -- manual/marketplace/platform
  updated_at INTEGER NOT NULL
);

-- 新增：收藏夹表
CREATE TABLE favorites (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,       -- skills/mcp/agent/environment
  supported_os TEXT NOT NULL,   -- JSON array
  supported_ides TEXT NOT NULL, -- JSON array
  supported_protocols TEXT NOT NULL, -- JSON array
  source_type TEXT NOT NULL,   -- platform/local/github
  is_junzi_only INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);

-- 新增：任务环境表
CREATE TABLE environments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NULL,
  skills_ids TEXT NOT NULL,  -- JSON array
  mcp_ids TEXT NOT NULL,     -- JSON array
  agent_ids TEXT NOT NULL,   -- JSON array
  is_active INTEGER NOT NULL DEFAULT 0,
  applied_at INTEGER NULL,
  updated_at INTEGER NOT NULL
);

-- 新增：用户会员状态
CREATE TABLE subscription (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  plan TEXT NOT NULL,         -- free/junzi
  expires_at INTEGER NULL,
  token_balance INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);

-- 继承：settings表（扩展键名）
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
-- 新增设置键：accept_platform_commands/accept_wechat_commands/ws_port
```

### 8.4 工具适配器扩展（Aidean版）

```rust
// 继承skills-hub的38+工具适配器
// 新增：每个工具的MCP配置路径
pub struct ToolAdapter {
    pub key: &'static str,
    pub display_name: &'static str,
    pub skills_dir: &'static str,    // Skills目录（继承自skills-hub）
    pub mcp_config: Option<&'static str>, // MCP配置文件路径（新增）
    pub detect_dir: &'static str,
    pub force_copy: bool,            // Cursor需要强制copy
}

// 示例
const CURSOR: ToolAdapter = ToolAdapter {
    key: "cursor",
    display_name: "Cursor",
    skills_dir: ".cursor/skills",
    mcp_config: Some(".cursor/mcp.json"),
    detect_dir: ".cursor",
    force_copy: true,  // Cursor symlink bug
};

const CLAUDE_CODE: ToolAdapter = ToolAdapter {
    key: "claude_code",
    display_name: "Claude Code",
    skills_dir: ".claude/skills",
    mcp_config: None,  // Claude Code无MCP配置文件
    detect_dir: ".claude",
    force_copy: false,
};
```

---

## 九、功能优先级矩阵

| 功能模块 | Phase | 来源 | 说明 |
|---|---|---|---|
| Skills安装（本地/Git/GitHub）| P1 | skills-hub | 直接继承installer.rs |
| 同步引擎（三级fallback）| P1 | skills-hub | 直接继承sync_engine.rs |
| 38+工具适配器 | P1 | skills-hub | 直接继承，扩展MCP路径 |
| content_hash变更检测 | P1 | skills-hub | 精确更新判断 |
| Explore探索页 | P1 | skills-hub | 接入ClawHub+skills.sh |
| Skill详情页（Markdown）| P1 | skills-hub | 文件树+渲染 |
| 迁移接管 | P2 | skills-hub | 扫描已有Skills |
| MCP管理（扩展）| P1 | 原创 | 新增mcp_servers表 |
| 收藏夹（四类）| P1 | 原创 | 新增favorites表 |
| 任务环境 | P2 | 原创 | 新增environments表 |
| 君子订阅 | P2 | 原创 | subscription表+权益控制 |
| 平台同步 | P2 | 原创 | WebSocket平台联动 |
| AI聚合搜索 | P3 | mcphub启发 | 向量语义推荐 |
| 公众号联动 | P3 | 原创 | 微信触发桌面 |

---

## 十、总结与关键结论

1. **skills-hub 是 Aidean Desktop Skills层的直接蓝图**：sync_engine.rs + tool_adapters + installer.rs + SQLite schema 可以几乎直接复用，节省大量开发时间
2. **38+工具适配器是竞争壁垒**：覆盖市面上几乎所有AI编程工具，这个列表每月还在增长，Aidean Desktop 直接继承并扩展MCP路径字段
3. **Cursor强制copy是已知坑**：必须继承此规则，否则Cursor无法发现symlink指向的Skills
4. **三级fallback同步是核心算法**：symlink→junction(Win)→copy，代码可直接复用（MIT License）
5. **featured-skills.json + GitHub Actions = 零成本商城数据**：每日自动更新300个精选Skills，Aidean Desktop 可以接入同一数据源，再叠加平台自有数据
6. **SQLite Schema设计清晰**：skills + skill_targets + settings + discovered_skills四表设计合理，Aidean Desktop 在此基础上扩展mcp/favorites/environments/subscription表即可
7. **MIT License**：可以直接参考代码，甚至复用关键Rust模块

---

## 十、Aidean Desktop 基于 skills-hub 的完善方案

### 10.1 架构设计继承与扩展

#### 10.1.1 继承 skills-hub 的架构优势

| skills-hub 架构特点 | Aidean Desktop 继承方式 | 扩展方向 |
|---|---|---|
| **Tauri 2 + React + Tailwind v4** | 完全继承，保持技术栈一致 | 增加平台联动通信层 |
| **SQLite + rusqlite 本地存储** | 继承，零配置、易同步 | 扩展表结构支持 MCP/Agent/收藏夹/会员 |
| **三级同步 fallback** | 直接复用 sync_engine.rs | 扩展支持 MCP 配置文件同步 |
| **38+ 工具适配器** | 直接复用 tool_adapters/ | 增加 MCP 配置路径字段 |
| **内容哈希变更检测** | 继承 content_hash 机制 | 扩展支持 MCP/Agent 变更检测 |
| **Git 缓存机制** | 继承 git_fetcher.rs | 优化大仓库克隆性能 |
| **CancelToken 取消机制** | 直接复用 | 扩展支持所有长时间操作 |

#### 10.1.2 扩展架构：平台联动与会员体系

```
┌─────────────────────────────────────────────────────────────────┐
│                    Aidean Desktop 扩展架构                        │
├─────────────────────────────────────────────────────────────────┤
│  前端（React + TypeScript + Tailwind v4）                         │
│  ├── My Skills / MCP / Agent（继承 skills-hub 模式）              │
│  ├── 商城（Explore 扩展为完整商城）                               │
│  ├── 收藏夹（新增）                                               │
│  ├── 任务环境（新增）                                             │
│  └── 会员中心（新增）                                             │
├─────────────────────────────────────────────────────────────────┤
│  Tauri IPC（继承）                                               │
├─────────────────────────────────────────────────────────────────┤
│  Rust 后端                                                       │
│  ├── core/（继承 skills-hub 目录结构）                            │
│  │   ├── skill_store.rs（继承）                                  │
│  │   ├── mcp_store.rs（新增：MCP数据访问）                        │
│  │   ├── agent_store.rs（新增：Agent数据访问）                    │
│  │   ├── sync_engine.rs（继承 + 扩展MCP同步）                     │
│  │   ├── tool_adapters/（继承38+适配器 + 扩展MCP路径）            │
│  │   ├── installer.rs（继承 + 扩展MCP/Agent安装）                 │
│  │   ├── collection_store.rs（新增：收藏夹管理）                  │
│  │   ├── environment_store.rs（新增：任务环境管理）               │
│  │   ├── platform_sync.rs（新增：平台同步服务）                   │
│  │   └── token_ledger.rs（新增：代币账本服务）                    │
│  └── commands/                                                   │
│      └── mod.rs（注册所有命令）                                   │
├─────────────────────────────────────────────────────────────────┤
│  平台联动层（新增）                                               │
│  ├── 网页端 API 客户端                                           │
│  ├── WebSocket 服务（伴侣插件）                                  │
│  └── Deep Link 处理器                                            │
├─────────────────────────────────────────────────────────────────┤
│  本地配置文件（继承 skills-hub 路径管理）                         │
│  └── 38+ IDE/工具 Skills + MCP 配置目录                          │
└─────────────────────────────────────────────────────────────────┘
```

### 10.2 核心功能对比与扩展

#### 10.2.1 功能对比矩阵

| 功能模块 | skills-hub | Aidean Desktop | 差异说明 |
|---|---|---|---|
| **Skills 管理** | ✅ 安装/同步/更新/卸载 | ✅ 继承 + 收藏夹 + 商城 | 增加收藏夹、任务环境组合 |
| **MCP 管理** | ❌ 无 | ✅ 新增 | MCP 安装/配置/同步/收藏 |
| **Agent 管理** | ❌ 无 | ✅ 新增 | Agent 收藏夹、配置管理 |
| **任务环境** | ❌ 无 | ✅ 新增 | Skills+MCP+Agent 组合一键应用 |
| **商城** | ✅ ClawHub + skills.sh | ✅ 继承 + 平台数据 + 私有仓库 | 增加君子订阅专属内容 |
| **收藏夹** | ❌ 无 | ✅ 新增 | 多维度收藏夹系统 |
| **会员订阅** | ❌ 无 | ✅ 新增 | 君子订阅体系 |
| **AI 推荐** | ❌ 无 | ✅ 新增 | 语义搜索、智能推荐 |
| **平台联动** | ❌ 无 | ✅ 新增 | 网页端双向同步、公众号 |
| **伴侣插件** | ❌ 无 | ✅ 新增 | VS Code/Cursor 插件通信 |
| **代币体系** | ❌ 无 | ✅ 新增 | AID Token 空投激励 |
| **三级同步 fallback** | ✅ symlink→junction→copy | ✅ 继承 + 扩展 | 支持 Skills + MCP 配置 |
| **38+ 工具适配** | ✅ 完整适配器表 | ✅ 继承 + 扩展 | 增加 MCP 配置路径 |
| **内容哈希检测** | ✅ 变更检测 | ✅ 继承 + 扩展 | 支持 Skills/MCP/Agent |
| **迁移接管** | ✅ Onboarding | ✅ 继承 | 扫描已有 Skills/MCP/Agent |

#### 10.2.2 核心问题演变

**skills-hub 解决的核心问题**：
> AI 编程工具用户的 **Skills 碎片化痛点** —— 不同工具各有 Skills 目录，手动维护繁琐

**Aidean Desktop 解决的核心问题**：
> AI 编程工具用户的 **Skills + MCP + Agent 生态管理痛点** —— 发现、安装、组合、同步、付费

```
skills-hub 用户痛点                    Aidean Desktop 用户痛点
─────────────────────────────────    ─────────────────────────────────
Skills 碎片化              ────────→   Skills + MCP + Agent 三重碎片化
多工具同步困难            ────────→   缺乏场景化组合方案
Skills 发现困难           ────────→   网页端与桌面端数据割裂
版本管理缺失              ────────→   缺乏个性化推荐
迁移成本高                ────────→   优质内容缺乏付费机制
```

### 10.3 功能清单完善（Aidean Desktop 版）

#### 10.3.1 继承自 skills-hub 的功能（P0）

| 功能 | 说明 | 继承方式 |
|---|---|---|
| Skills 安装（本地/Git/GitHub） | 三种来源安装 Skills | 直接复用 installer.rs |
| 三级同步 fallback | symlink→junction→copy | 直接复用 sync_engine.rs |
| 38+ 工具适配器 | 完整工具路径配置表 | 直接复用 tool_adapters/ |
| Cursor 强制 copy 模式 | Cursor symlink bug 处理 | 继承规则 |
| 内容哈希变更检测 | content_hash 精确判断变更 | 继承机制 |
| Git 缓存机制 | 避免重复拉取 | 继承 git_fetcher.rs |
| CancelToken 取消机制 | 支持取消长时间操作 | 直接复用 |
| 迁移接管（Onboarding） | 扫描已有 Skills 批量导入 | 继承逻辑 |
| Skill 详情页 | 文件树 + Markdown 渲染 | 继承 SkillDetailView |
| 探索页（Explore） | ClawHub 精选 + skills.sh 搜索 | 继承设计 |

#### 10.3.2 新增核心功能（P0）

| 功能 | 说明 | 设计要点 |
|---|---|---|
| **MCP 管理** | MCP 安装/配置/同步/收藏 | 支持 servers.json 格式 |
| **Agent 管理** | Agent 收藏夹、配置管理 | Agent 定义文件管理 |
| **任务环境** | Skills+MCP+Agent 组合，一键应用 | 环境模板、场景化预设 |
| **收藏夹系统** | 多维度收藏夹（Skills/MCP/Agent/环境） | 支持系统/IDE/协议标识 |
| **商城扩展** | 接入平台数据、私有仓库 | 君子订阅专属内容 |
| **自动更新** | Skills/MCP 自动检测和更新 | 更新通知、批量更新 |

#### 10.3.3 新增会员功能（君子订阅）

| 功能 | 免费版 | 君子订阅 |
|---|---|---|
| 收藏夹数量 | 3个 | 无限 |
| 任务环境数量 | 1个 | 无限 |
| 商城访问 | 公开 Skills/MCP | + 私有 Skills/MCP |
| 聚合搜索 | 基础搜索 | AI 语义搜索 |
| 多 IDE 协同 | 手动配置 | 自动同步 |
| 一键导入网页配置 | ❌ | ✅ |
| 公众号一键开发 | ❌ | ✅ |
| 高分方案推荐 | ❌ | ✅ |
| 订阅推送/邮箱推送 | ❌ | ✅ |
| AID 代币空投 | ❌ | 每月赠送 |

### 10.4 交互体验优化

#### 10.4.1 页面结构演变

**skills-hub 页面结构**：
```
Header（顶部三标签导航）
├── My Skills（默认）
├── Explore（探索商城）
└── Settings（设置）
```

**Aidean Desktop 页面结构**：
```
侧边栏导航（左侧）
├── 首页（控制台）← 四大收藏夹快捷入口 + 最近更新 + AI推荐
├── 商城（探索）← Skills/MCP/Agent/任务环境 分类浏览
│   ├── 精选（继承 ClawHub）
│   ├── 搜索（继承 skills.sh）
│   └── 平台推荐（新增）
├── 收藏夹 ← 统一管理所有收藏
├── 任务环境 ← 场景化组合管理
└── 设置 ← 通用/平台联动/工具检测/会员/关于
```

#### 10.4.2 核心操作流程

**从商城安装 Skills 并添加到收藏夹**：
```
1. 用户进入商城页，浏览精选或搜索关键词
2. 点击 Skills 卡片查看详情（继承 SkillDetailView）
3. 点击「安装」按钮
4. 选择目标 IDE（可多选，继承 tool_adapters）
5. 自动下载并同步配置（继承 sync_engine.rs）
6. 提示安装成功，可选择添加到收藏夹
7. 选择收藏夹或创建新收藏夹
（全程：4-5步，<20秒）
```

**一键应用任务环境到项目级**：
```
1. 用户在任务环境页选择目标环境
2. 点击「一键应用」
3. 选择应用范围：全局（系统级）/ 项目级
4. 如选择项目级，弹出目录选择器确认项目路径
5. 桌面端应用 Skills（symlink/junction/copy）
6. 桌面端应用 MCP 配置（写入 servers.json）
7. 显示应用成功提示，记录应用历史
（全程：4-5步，<10秒）
```

### 10.5 UI设计继承

#### 10.5.1 继承 skills-hub 的设计系统

| 设计元素 | skills-hub | Aidean Desktop |
|---|---|---|
| **基础样式** | Tailwind CSS v4 | 完全继承 |
| **图标** | lucide-react | 完全继承 |
| **Toast** | Sonner | 完全继承 |
| **Markdown 渲染** | react-markdown + react-syntax-highlighter | 完全继承 |
| **代码高亮** | react-syntax-highlighter（40+语言） | 完全继承 |
| **布局** | 顶部三标签导航 | 改为左侧侧边栏 |
| **Skill 卡片** | 简洁信息展示 | 继承 + 增加收藏按钮 |
| **详情页** | 文件树 + Markdown | 完全继承 |

#### 10.5.2 新增设计元素

```typescript
// 继承 Tailwind v4 配置，扩展品牌色
const brandColors = {
  // 继承 skills-hub 基础色
  primary: '#3B82F6',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  
  // 新增会员专属色
  gold: '#FBBF24',         // 君子订阅金色标识
  token: '#6366F1',        // AID代币靛蓝色
  premium: '#8B5CF6',      // 高级功能紫色
}

// 新增组件
const newComponents = [
  'CollectionCard',       // 收藏夹卡片
  'EnvironmentCard',      // 任务环境卡片
  'MarketplaceItem',      // 商城项目卡片（扩展 SkillCard）
  'SyncStatusBadge',      // 同步状态徽章（继承 skills-hub）
  'SubscriptionBadge',    // 会员等级徽章
  'TokenBalance',         // 代币余额显示
  'PlatformSyncButton',   // 平台同步按钮
]
```

### 10.6 技术栈复用清单

#### 10.6.1 完全复用的依赖（与 skills-hub 一致）

```json
{
  "dependencies": {
    "@tauri-apps/api": "^2.9.x",
    "@tauri-apps/plugin-dialog": "^2.x",
    "@tauri-apps/plugin-opener": "^2.x",
    "@tauri-apps/plugin-updater": "^2.x",
    "react": "^19.2.3",
    "react-dom": "^19.2.3",
    "react-router-dom": "^7.12.0",
    "tailwindcss": "^4.1.18",
    "@tailwindcss/vite": "^4.1.18",
    "lucide-react": "^0.562.0",
    "sonner": "^2.0.7",
    "react-markdown": "^10.1.0",
    "react-syntax-highlighter": "^16.1.1",
    "i18next": "^25.0.0",
    "react-i18next": "^16.0.0"
  },
  "devDependencies": {
    "vite": "^7.3.1",
    "typescript": "~5.9.3"
  }
}
```

#### 10.6.2 新增依赖

```json
{
  "dependencies": {
    // 状态管理
    "zustand": "^4.5.0",
    
    // 向量搜索（AI推荐）
    "@qdrant/js-client-rest": "^1.12.0",
    
    // WebSocket（伴侣插件通信）
    "ws": "^8.18.0",
    
    // 二维码（公众号联动）
    "qrcode.react": "^4.2.0",
    
    // 表单验证
    "zod": "^4.0.0",
    "react-hook-form": "^7.54.0"
  }
}
```

### 10.7 工具适配器扩展（关键继承点）

#### 10.7.1 继承 skills-hub 的 38+ 工具适配器

skills-hub 已完整支持 38+ AI 编程工具，Aidean Desktop 直接继承：

| 工具 | Skills 路径（继承） | MCP 路径（新增） |
|---|---|---|
| Cursor | `~/.cursor/skills` | `~/.cursor/mcp.json` |
| Claude Code | `~/.claude/skills` | `~/.claude/mcp.json` |
| VS Code | `~/.vscode/skills` | `~/.vscode/mcp.json` |
| Windsurf | `~/.codeium/windsurf/skills` | `~/.codeium/windsurf/mcp.json` |
| Cline | `~/.cline/skills` | `~/.cline/mcp.json` |
| Codex | `~/.codex/skills` | `~/.codex/mcp.json` |
| Trae | `~/.trae/skills` | `~/.trae/mcp.json` |
| Roo Code | `~/.roo/skills` | `~/.roo/mcp.json` |
| Continue | `~/.continue/skills` | `~/.continue/mcp.json` |
| Goose | `~/.config/goose/skills` | `~/.config/goose/mcp.json` |
| GitHub Copilot | `~/.copilot/skills` | `~/.copilot/mcp.json` |
| ... 以及更多 26 个工具 | ... | ... |

#### 10.7.2 扩展适配器结构

```rust
// 继承 skills-hub 的 ToolAdapter，增加 MCP 配置路径
pub struct ToolAdapter {
    pub key: &'static str,
    pub display_name: &'static str,
    pub skills_dir: &'static str,           // 继承自 skills-hub
    pub mcp_config: Option<&'static str>,   // 新增：MCP配置文件路径
    pub detect_dir: &'static str,
    pub force_copy: bool,                   // Cursor 需要强制 copy
}

// 同步引擎扩展：支持 Skills + MCP 配置同步
pub fn sync_skill_and_mcp(
    skill_source: &Path,
    mcp_config: &Option<MCPConfig>,
    target_tool: &ToolAdapter,
) -> Result<SyncOutcome> {
    // 1. 同步 Skills（继承 skills-hub 逻辑）
    let skill_outcome = sync_dir_hybrid(skill_source, target_tool.skills_dir)?;
    
    // 2. 同步 MCP 配置（新增）
    if let Some(mcp) = mcp_config {
        if let Some(mcp_path) = target_tool.mcp_config {
            write_mcp_config(mcp, mcp_path)?;
        }
    }
    
    Ok(SyncOutcome { skill: skill_outcome, mcp: ... })
}
```

### 10.8 开发优先级建议

#### Phase 1: MVP（4周）—— 继承 skills-hub 核心

| 周次 | 任务 | 参考 skills-hub |
|---|---|---|
| Week 1 | 搭建 Tauri 2 + React 19 + Tailwind v4 架构 | 复用项目模板 |
| Week 2 | 实现 Skills 管理（安装/同步/更新） | 复用 skill_store.rs、sync_engine.rs |
| Week 3 | 实现商城浏览（精选 + 搜索） | 复用 ExplorePage、featured-skills.json |
| Week 4 | 实现 38+ 工具适配器 | 复用 tool_adapters/ |

#### Phase 2: 核心功能（6周）—— 新增差异化功能

| 周次 | 任务 | 说明 |
|---|---|---|
| Week 5-6 | MCP 管理 | 支持 servers.json 格式、MCP 同步 |
| Week 7-8 | 收藏夹系统 | Skills/MCP/Agent 收藏管理 |
| Week 9-10 | 任务环境 | 组合应用、场景化预设 |

#### Phase 3: 高级功能（4周）—— 会员体系

| 周次 | 任务 | 说明 |
|---|---|---|
| Week 11-12 | 君子订阅 | 会员系统、私有仓库 |
| Week 13-14 | 平台联动 | 网页端同步、公众号 |

### 10.9 总结

#### 10.9.1 skills-hub 对 Aidean Desktop 的价值

| 维度 | 价值 |
|---|---|
| **代码复用** | MIT License，可直接复用 70%+ 核心 Rust 模块（sync_engine、tool_adapters、installer）|
| **工具覆盖** | 38+ AI 工具完整适配，省去大量调研和测试工作 |
| **同步机制** | 三级 fallback（symlink→junction→copy）经过生产验证 |
| **商城设计** | Explore 页设计成熟，精选+搜索模式可直接继承 |
| **技术栈对齐** | Tauri 2 + React 19 + Tailwind v4，与 Aidean 技术选型完全一致 |

#### 10.9.2 Aidean Desktop 的差异化定位

```
市场定位对比：

skills-hub         →   「Skills 管理中心」
                      （面向 Skills 生态，解决安装/同步/更新）
                      
Aidean Desktop     →   「AI Skills & MCP 生态中枢」
                      （面向 Skills + MCP + Agent 生态，解决发现/组合/同步/付费）
```

#### 10.9.3 关键成功因素

1. **代码继承**：复用 skills-hub MIT License 代码，降低开发成本（预估节省 4-6 周）
2. **工具覆盖**：38+ 工具适配器确保广泛兼容性
3. **同步可靠**：三级 fallback 机制确保各平台稳定同步
4. **生态接入**：快速接入 skills.sh 210+ Skills + ClawHub 精选数据
5. **会员价值**：君子订阅提供切实价值（私有仓库、AI推荐、代币激励）

---

> **文档版本**: v2.1
> **最后更新**: 2026-03-26

---

## 十一、Skills双协议标准与完整路径参考

> 完整路径表见：`.example/config-paths-reference.md`

### 11.1 skills-hub的协议实现方式

skills-hub 实现的是 **Anthropic SKILL.md 协议**，每个Skill以独立目录形式存储和同步：

```
中心仓库（~/.local/share/skills-hub/ 或用户自定义）
└── my-skill/
    ├── SKILL.md          # 必须，含frontmatter（name+description）
    ├── references/       # 可选，细分参考文档
    └── scripts/          # 可选，可执行脚本
```

**注意**：skills-hub 当前版本**不生成 AGENTS.md**（OpenAI协议），只做Anthropic协议路径同步。
Aidean Desktop 应在此基础上额外支持 AGENTS.md 自动更新（openskills sync功能）。

### 11.2 tool_adapters完整路径表（来自源码）

以下路径均相对于用户主目录 `~`（macOS/Linux）或 `%USERPROFILE%`（Windows）：

| 工具 | Skills目录（全局）| 协议类型 | 特殊说明 |
|---|---|---|---|
| **Cursor** | `~/.cursor/skills/` | Anthropic | ⚠️ **强制copy**，不支持symlink发现 |
| **Claude Code** | `~/.claude/skills/` | Anthropic | 官方标准，支持symlink |
| **OpenCode** | `~/.config/opencode/skills/` | Anthropic | Linux/macOS路径；Win: `%APPDATA%\opencode\skills\` |
| **Codex** | `~/.codex/skills/` | 通用 | OpenAI官方CLI |
| **Antigravity** | `~/.gemini/antigravity/global_skills/` | 通用 | Gemini系列 |
| **Amp** | `~/.config/agents/skills/` | 通用 | Win: `%APPDATA%\agents\skills\` |
| **Kimi CLI** | `~/.config/agents/skills/` | 通用 | 与Amp共享路径 |
| **Augment** | `~/.augment/rules/` | 通用 | 使用rules而非skills目录 |
| **OpenClaw** | `~/.openclaw/skills/` | Anthropic | |
| **Cline** | `~/.cline/skills/` | 通用 | |
| **CodeBuddy** | `~/.codebuddy/skills/` | 通用 | |
| **Continue** | `~/.continue/skills/` | 通用 | |
| **Trae** | `~/.trae/skills/` | Anthropic | |
| **Trae CN** | `~/.trae-cn/skills/` | Anthropic | |
| **Roo Code** | `~/.roo/skills/` | 通用 | |
| **Kilo Code** | `~/.kilocode/skills/` | 通用 | |
| **Goose** | `~/.config/goose/skills/` | 通用 | Win: `%APPDATA%\goose\skills\` |
| **Gemini CLI** | `~/.gemini/skills/` | 通用 | |
| **GitHub Copilot** | `~/.copilot/skills/` | 通用 | |
| **Windsurf** | `~/.codeium/windsurf/skills/` | Anthropic | |
| **MoltBot** | `~/.moltbot/skills/` | 通用 | |
| **Zencoder** | `~/.zencoder/skills/` | 通用 | |
| **Qwen Code** | `~/.qwen/skills/` | 通用 | |
| **通用(.agent)** | `~/.agent/skills/` | OpenAI/通用 | openskills --universal路径 |
| *(共38+工具)* | 详见tool_adapters/mod.rs | - | |

### 11.3 同步模式选择逻辑

```rust
// sync_engine.rs 三级fallback（来自skills-hub源码）
// 规则1：Cursor强制copy
if tool == ToolId::Cursor { return SyncMode::Copy; }

// 规则2：尝试symlink（macOS/Linux优先）
if try_link_dir(source, target).is_ok() { return SyncMode::Symlink; }

// 规则3：Windows尝试Junction
#[cfg(windows)]
if try_junction(source, target).is_ok() { return SyncMode::Junction; }

// 规则4：最终fallback
copy_dir_recursive(source, target); return SyncMode::Copy;
```

### 11.4 MCP配置路径（skills-hub未实现，Aidean需补充）

skills-hub 只管理 Skills，**不管理 MCP 配置**。Aidean Desktop 需额外实现：

| IDE | MCP配置文件路径 |
|---|---|
| **Claude Desktop** | `~/Library/Application Support/Claude/claude_desktop_config.json`（macOS）|
| **Claude Desktop** | `%APPDATA%\Claude\claude_desktop_config.json`（Windows）|
| **Claude Code** | `~/.claude.json` |
| **Cursor** | `~/.cursor/mcp.json` |
| **Windsurf** | `~/.codeium/windsurf/mcp_config.json` |
| **OpenCode** | `~/.config/opencode/config.json`（mcp字段）|

### 11.5 Windows特殊注意事项

```
Windows路径对照：
  ~/.cursor/          → %USERPROFILE%\.cursor\
  ~/.claude/          → %USERPROFILE%\.claude\
  ~/.config/opencode/ → %APPDATA%\opencode\
  ~/Library/...       → %APPDATA%\...（macOS专用路径在Windows无效）

Junction点（Windows）：
  - 功能类似symlink，但不需要管理员权限
  - 使用 junction2 crate 或 std::os::windows::fs::junction
  - 只适用于目录（不适用于文件）
  - Cursor 即使使用Junction也无法发现Skills，必须用copy
```
> **状态**: 基于 skills-hub 完善的 Aidean Desktop 设计方案