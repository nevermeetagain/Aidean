# Aidean Desktop 最优解决方案

> 版本：v1.0 | 日期：2026-03-26
> 基于7个竞品深度分析，提炼最优实现方案
> 角色：以Linus Torvalds风格思考——极简主义架构、不妥协的技术决策、从实际用例出发

---

## 一、竞品综合对比矩阵

### 1.1 七大竞品核心能力对比

| 能力维度 | cc-switch | skills-hub | mcp-router | mcphub | openskills | emp | skills.sh |
|---|---|---|---|---|---|---|---|
| **形态** | 桌面端 | 桌面端 | 桌面端 | Web服务 | CLI | 构建框架 | 平台 |
| **技术栈** | Tauri+Rust | Tauri+Rust | Electron+TS | Node+Express | Node CLI | Rspack | - |
| **Skills管理** | ✅基础 | ✅完整 | ⚠️无 | ⚠️无 | ✅CLI | ✅框架级 | ✅平台 |
| **MCP管理** | ✅基础 | ⚠️无 | ✅完整 | ✅完整 | ⚠️无 | ⚠️无 | ⚠️无 |
| **Agent管理** | ⚠️无 | ⚠️无 | ✅基础 | ⚠️无 | ⚠️无 | ⚠️无 | ⚠️无 |
| **商城/探索** | ⚠️无 | ✅基础 | ⚠️无 | ✅基础 | ⚠️无 | ⚠️无 | ✅完整 |
| **智能路由** | ⚠️无 | ⚠️无 | ✅基础 | ✅pgvector | ⚠️无 | ⚠️无 | ⚠️无 |
| **会员订阅** | ⚠️无 | ⚠️无 | ⚠️无 | ⚠️无 | ⚠️无 | ⚠️无 | ⚠️无 |
| **多IDE同步** | ✅5个 | ✅38个 | ✅IDE配置 | ⚠️HTTP端点 | ✅CLI | ⚠️手动 | ⚠️无 |
| **双协议支持** | ⚠️单协议 | ⚠️单协议 | ⚠️无 | ⚠️无 | ✅双协议 | ⚠️无 | ⚠️单协议 |
| **代币体系** | ⚠️无 | ⚠️无 | ⚠️无 | ⚠️无 | ⚠️无 | ⚠️无 | ⚠️无 |
| **License** | MIT | MIT | Sustainable | Apache 2.0 | Apache 2.0 | MIT | - |

### 1.2 各竞品核心痛点总结

| 竞品 | 解决的核心痛点 | 未解决的痛点 |
|---|---|---|
| **cc-switch** | Provider/API Key混乱 | 无商城、无会员、无MCP深度管理 |
| **skills-hub** | Skills安装分散、多IDE同步繁琐 | 无MCP管理、无Agent、无会员 |
| **mcp-router** | MCP服务器碎片化、Context爆炸 | 无Skills管理、无商城、无会员 |
| **mcphub** | MCP聚合代理、智能工具发现 | 无桌面端、无Skills、无会员 |
| **openskills** | Skills安装标准化、跨Agent兼容 | 无GUI、无MCP、无商城 |
| **emp** | 框架级Skills集成 | 专用于emp框架、非通用 |
| **skills.sh** | Skills发现与分发平台 | 无桌面端、无IDE集成 |

**结论**：没有任何一个竞品同时解决了Skills+MCP+Agent+商城+会员这5个维度，这就是Aidean Desktop的市场空间。

---

## 二、架构设计最优方案

### 2.1 架构决策原则

基于竞品分析，提炼3条不妥协的架构原则：

1. **本地优先**：所有数据本地存储（SQLite），不依赖云端即可完整运行
2. **协议兼容**：同时支持Anthropic SKILL.md协议和OpenAI/通用AGENTS.md协议
3. **最小复杂度**：不重复造轮子，直接复用竞品的MIT代码（skills-hub的sync_engine、tool_adapters）

### 2.2 技术栈最优选择

| 层级 | 最优选择 | 理由 | 竞品验证 |
|---|---|---|---|
| **桌面框架** | **Tauri 2** | 安装包<15MB，内存占用低，Rust安全性 | cc-switch(33.7k⭐)、skills-hub均验证 |
| **后端语言** | **Rust** | 内存安全、高性能文件操作、跨平台 | cc-switch、skills-hub核心逻辑均用Rust |
| **前端框架** | **React 19 + TypeScript** | 最新稳定版，生态最成熟 | skills-hub、mcp-router均采用 |
| **样式** | **Tailwind CSS v4** | 最新版，@tailwindcss/vite原生集成 | skills-hub已验证v4可行 |
| **本地数据库** | **rusqlite (SQLite)** | 零配置，无需单独安装，易备份 | skills-hub、cc-switch均采用 |
| **构建工具** | **Vite 7** | 极速HMR，skills-hub已验证 | skills-hub采用^7.3.1 |
| **状态管理** | **Zustand** | 轻量，mcp-router已验证 | mcp-router stores/目录 |
| **UI组件** | **shadcn/ui (Radix UI)** | 高质量，mcp-router已验证 | mcp-router components.json |
| **MCP SDK** | **@modelcontextprotocol/sdk** | 官方SDK，必须使用 | mcphub、mcp-router均采用 |
| **国际化** | **i18next** | skills-hub、mcphub均验证 | 多工具已验证 |
| **Toast** | **Sonner** | cc-switch、skills-hub均使用 | 统一体验 |

### 2.3 项目目录结构（最优设计）

```
aidean-desktop/
├── src/                          # 前端（React + TypeScript）
│   ├── components/
│   │   ├── layout/               # 布局（参考mcp-router）
│   │   │   ├── Sidebar.tsx       # 左侧导航
│   │   │   ├── TitleBar.tsx      # 标题栏
│   │   │   └── Layout.tsx
│   │   ├── home/                 # 首页仪表盘
│   │   ├── skills/               # Skills管理（参考skills-hub）
│   │   │   ├── SkillCard.tsx
│   │   │   ├── SkillDetailView.tsx
│   │   │   ├── SkillsList.tsx
│   │   │   └── ExplorePage.tsx   # 商城探索
│   │   ├── mcp/                  # MCP管理（参考mcp-router/mcphub）
│   │   │   ├── McpServerCard.tsx
│   │   │   ├── McpServerList.tsx
│   │   │   └── McpMarket.tsx
│   │   ├── agent/                # Agent管理（新增）
│   │   ├── environment/          # 任务环境（新增）
│   │   ├── marketplace/          # 统一商城
│   │   ├── settings/             # 设置
│   │   └── common/               # 通用组件
│   ├── stores/                   # Zustand状态（参考mcp-router）
│   ├── platform-api/             # Platform API抽象层（参考mcp-router）
│   ├── services/                 # 前端服务层
│   └── i18n/                     # 国际化
│
├── src-tauri/src/
│   ├── lib.rs
│   ├── main.rs
│   ├── modules/                  # 功能模块（Clean Architecture，参考mcp-router ADR）
│   │   ├── skills/               # Skills核心（直接复用skills-hub Rust代码）
│   │   │   ├── installer.rs      # ← 复用skills-hub/installer.rs
│   │   │   ├── sync_engine.rs    # ← 复用skills-hub/sync_engine.rs
│   │   │   ├── tool_adapters/    # ← 复用skills-hub/tool_adapters/（38+工具）
│   │   │   ├── skill_store.rs    # ← 扩展skills-hub/skill_store.rs
│   │   │   ├── git_fetcher.rs    # ← 复用skills-hub/git_fetcher.rs
│   │   │   └── github_download.rs # ← 复用
│   │   ├── mcp/                  # MCP服务器管理（参考mcp-router）
│   │   │   ├── mcp_service.rs
│   │   │   ├── mcp_store.rs
│   │   │   └── config_writer.rs  # 写入各IDE的MCP配置文件
│   │   ├── agent/                # Agent管理（新增）
│   │   ├── environment/          # 任务环境（新增）
│   │   ├── marketplace/          # 商城数据（接入skills.sh/ClawHub）
│   │   ├── smart_routing/        # 智能路由（参考mcphub，本地轻量版）
│   │   ├── subscription/         # 君子订阅（新增）
│   │   ├── sync/                 # 平台同步（新增）
│   │   ├── auth/                 # 认证（参考mcp-router）
│   │   ├── settings/             # 设置
│   │   └── system/               # 系统信息
│   └── infrastructure/
│       ├── database/             # SQLite连接和迁移
│       └── ipc.rs                # IPC通信注册
│
└── src-tauri/tauri.conf.json
```

### 2.4 Platform API抽象（核心架构决策，来自mcp-router）

```typescript
// 参考mcp-router的PlatformAPI设计，为Tauri实现
interface AideanAPI {
  skills: SkillsAPI;         // Skills安装/同步/更新
  mcp: McpAPI;               // MCP服务器管理
  agent: AgentAPI;           // Agent文件管理
  environment: EnvAPI;       // 任务环境
  marketplace: MarketAPI;    // 商城数据
  subscription: SubAPI;      // 君子订阅
  sync: SyncAPI;             // 平台同步
  settings: SettingsAPI;     // 应用设置
  app: AppAPI;               // 应用管理（更新/版本）
  auth: AuthAPI;             // 账号认证
}

// Tauri实现
class TauriAideanAPI implements AideanAPI {
  skills = {
    install: (source) => invoke('install_skill', { source }),
    sync: (toolId?) => invoke('sync_skills', { toolId }),
    update: (name?) => invoke('update_skills', { name }),
    list: () => invoke<SkillRecord[]>('list_skills'),
  };
}
```

---

## 三、核心功能最优方案

### 3.1 Skills管理（直接复用skills-hub，MIT）

**最优方案**：直接复用skills-hub的Rust核心模块，节省4-6周开发时间。

```
复用清单（MIT License，可直接使用）：
✅ sync_engine.rs         三级fallback同步（symlink→junction→copy）
✅ tool_adapters/mod.rs   38+工具路径适配器（完整覆盖）
✅ installer.rs           本地/Git/GitHub三种来源安装
✅ git_fetcher.rs         Git克隆缓存机制
✅ github_download.rs     GitHub API目录下载
✅ skill_store.rs         SQLite Schema（扩展后使用）
✅ content_hash.rs        内容哈希变更检测
✅ cancel_token.rs        取消令牌
✅ featured_skills.rs     精选Skills（ClawHub）

新增（Aidean专有）：
+ agents_md_writer.rs    双协议AGENTS.md自动生成（参考openskills）
+ platform_sync.rs       平台Skills同步（会员专属私有Skills）
+ marketplace_client.rs  接入skills.sh + ClawHub API
```

**Cursor强制Copy规则**（来自skills-hub CHANGELOG，必须实现）：
```rust
// tool_adapters/mod.rs 中Cursor的配置
ToolAdapter {
  key: "cursor",
  skills_dir: ".cursor/skills",
  force_copy: true,  // ⚠️ Cursor不支持symlink发现Skills
  mcp_config: Some(".cursor/mcp.json"),
}
```

### 3.2 MCP管理（融合mcp-router + mcphub设计）

**最优方案**：参考mcp-router的模块化架构 + mcphub的servers.json格式 + 本地HTTP端点。

```
MCP功能实现方案：
① 服务器管理（参考mcp-router）
   - 热插拔：无需重启即可添加/删除/更新MCP服务器
   - 工具粒度开关：单个工具级别启用/禁用
   - 运行时状态监控：connected/error/disabled

② 服务器目录（参考mcphub的servers.json）
   - 采用mcphub的servers.json标准格式
   - 本地内置数据（平台定期同步）
   - 格式：{ name, command, args, env, tools[], examples[] }

③ 本地HTTP端点（参考mcp-router）
   - 内置轻量HTTP服务（端口19527，可配置）
   - 端点：http://127.0.0.1:19527/mcp（所有已启用MCP聚合）
   - 端点：http://127.0.0.1:19527/mcp/{env-name}（按任务环境）
   - IDE配置：cursor/claude等一次配置，永久生效

④ 写入IDE配置文件（参考cc-switch + config-paths-reference）
   各IDE MCP配置文件路径：
   - Claude Desktop: ~/Library/Application Support/Claude/claude_desktop_config.json
   - Claude Code:    ~/.claude.json
   - Cursor:         ~/.cursor/mcp.json
   - Windsurf:       ~/.codeium/windsurf/mcp_config.json
   - OpenCode:       ~/.config/opencode/config.json（mcp字段）
```

### 3.3 智能路由（本地轻量版，参考mcphub移植）

**最优方案**：不依赖pgvector，使用本地嵌入 + SQLite FTS5全文搜索，实现零依赖智能推荐。

```
实现方案（两级降级）：

级别1：本地全文搜索（FTS5，默认，零依赖）
  - SQLite内置FTS5全文索引
  - 对Skills/MCP的name+description+tags建立索引
  - 响应时间：<10ms

级别2：本地向量搜索（可选，君子会员）
  - 使用@xenova/transformers（本地嵌入模型，无需API Key）
  - 模型：all-MiniLM-L6-v2（~25MB，首次下载）
  - 存储：SQLite的BLOB字段存储嵌入向量
  - 相似度：余弦相似度计算
  - 响应时间：<100ms

级别3：平台语义搜索（网络，君子会员专属）
  - 调用Aidean平台API：POST /api/search
  - 返回AI推荐的Skills/MCP组合
  - 支持自然语言描述场景
```

### 3.4 双协议实现（参考openskills设计）

**最优方案**：安装一次，自动同步两套协议，完全兼容openskills CLI。

```
安装Skill时自动处理：

① 中心仓库（单一真相来源）
   ~/.local/share/aidean/skills/{skill-name}/
   Windows: %APPDATA%\aidean\skills\{skill-name}\

② Anthropic协议路径（symlink/junction/copy）
   ~/.cursor/skills/{name}/         ← force_copy=true
   ~/.claude/skills/{name}/         ← symlink优先
   ~/.codeium/windsurf/skills/{name}/ ← symlink优先
   ~/.config/opencode/skills/{name}/  ← symlink优先
   ~/.trae/skills/{name}/           ← symlink优先
   ... (38+工具，来自skills-hub tool_adapters)

③ 通用协议路径（openskills兼容）
   ~/.agent/skills/{name}/          ← symlink优先
   项目级：./.claude/skills/{name}/ （可选）

④ AGENTS.md自动更新（openskills sync兼容格式）
   可选：应用时更新项目./AGENTS.md
   格式：<skills_system><available_skills>...
   读取方式：openskills read {name} 命令兼容
```

### 3.5 任务环境（差异化核心功能）

**最优方案**：超越mcp-router的工作区概念，三维组合（Skills+MCP+Agent）。

```
任务环境数据结构：
{
  id: string,
  name: string,              // "Web全栈开发"
  description: string,
  icon: string,              // emoji或图标
  skill_ids: string[],       // ["frontend-design", "css-development"]
  mcp_server_ids: string[],  // ["firecrawl", "fetch"]
  agent_ids: string[],       // ["code-reviewer"]
  apply_scope: "global" | "project",
  is_active: boolean,
  created_at: number,
}

一键应用流程：
1. 用户点击「应用」
2. 同步所有skill_ids到已检测IDE目录
3. 写入所有mcp_server_ids到各IDE MCP配置文件
4. 可选：更新项目AGENTS.md
5. Toast通知："任务环境已应用到 5 个工具"
```

---

## 四、功能清单与优先级

### 4.1 Phase 1 - MVP（4周，必须实现）

| 功能 | 来源 | 实现方式 |
|---|---|---|
| Skills安装（本地/Git/GitHub）| skills-hub | 直接复用Rust代码 |
| 同步引擎（三级fallback）| skills-hub | 直接复用sync_engine.rs |
| 38+工具适配器 | skills-hub | 直接复用tool_adapters/ |
| Explore探索页（ClawHub精选）| skills-hub | 复用ExplorePage + featured-skills.json |
| My Skills列表 | skills-hub | 复用SkillsList + SkillCard |
| 应用设置（路径/语言/主题）| skills-hub | 复用SettingsPage |
| 应用内更新 | skills-hub | 复用@tauri-apps/plugin-updater |

### 4.2 Phase 2 - 核心（6周，差异化功能）

| 功能 | 来源 | 实现方式 |
|---|---|---|
| MCP服务器管理（CRUD+热插拔）| mcp-router | 参考架构，Rust重写 |
| MCP配置写入各IDE | cc-switch | 参考config_writer，Rust实现 |
| 本地HTTP聚合端点 | mcp-router | 内置轻量HTTP服务 |
| servers.json MCP商城 | mcphub | 直接复用数据格式 |
| 任务环境（三维组合）| 原创 | 全新实现 |
| 双协议支持（AGENTS.md生成）| openskills | 参考sync命令，Rust实现 |
| 全文搜索（SQLite FTS5）| 原创 | 零依赖实现 |
| Platform API抽象层 | mcp-router | 参考架构设计 |

### 4.3 Phase 3 - 会员（4周，付费功能）

| 功能 | 来源 | 实现方式 |
|---|---|---|
| 君子订阅账号系统 | 原创 | JWT + 平台API |
| 私有Skills仓库（SSH安装）| openskills | 参考install.ts逻辑 |
| 本地向量搜索（AI推荐）| mcphub移植 | @xenova/transformers |
| 平台配置同步 | cc-switch | WebSocket长连接 |
| Deep Link（网页一键唤起）| cc-switch | `aidean://` 协议 |
| 订阅推送通知 | 原创 | 平台WebSocket推送 |

### 4.4 Phase 4 - 生态（4周，护城河）

| 功能 | 来源 | 实现方式 |
|---|---|---|
| 公众号联动 | 原创 | 微信扫码→平台→桌面端WebSocket |
| AID代币空投 | 原创 | 区块链钱包集成 |
| 框架合作计划 | emp启发 | 框架官方Skills认证体系 |
| 伴侣插件（VS Code）| cc-switch启发 | VS Code Extension API |

---

## 五、功能差异分析

### 5.1 Aidean独特功能（竞品均无）

| 独特功能 | 说明 | 护城河强度 |
|---|---|---|
| **三维任务环境** | Skills+MCP+Agent组合，一键切换场景 | 极高 |
| **君子订阅会员** | 私有Skills/MCP + AI推荐 + 代币激励 | 极高 |
| **AID代币体系** | 贡献Skills/MCP获得代币奖励 | 高 |
| **公众号联动** | 微信触发桌面端操作 | 高 |
| **双协议统一管理** | 一次安装，自动同步Anthropic+OpenAI双协议 | 高 |
| **框架官方认证** | 邀请emp/React/Vue官方入驻，认证标识 | 中 |
| **Deep Link网页联动** | 网页收藏→桌面端一键应用 | 中 |

### 5.2 从竞品继承的差异化组合

```
竞品最优实践 → Aidean Desktop整合：

skills-hub的「38+工具适配」
  + mcp-router的「Platform API抽象」
  + mcphub的「servers.json标准格式」
  + openskills的「双协议AGENTS.md生成」
  + cc-switch的「Deep Link + 配置文件写入」
  + emp的「框架级Skills认证」
  = 唯一能解决全链路Skills/MCP/Agent管理的桌面端工具
```

---

## 六、功能迭代策略

### 6.1 迭代节奏参考

| 竞品 | 迭代节奏 | 启示 |
|---|---|---|
| skills-hub | 2-4周/版本，社区驱动 | 快速响应用户反馈，每版聚焦1-2个功能 |
| mcp-router | 极快（含ADR文档）| 架构决策先行，代码后跟 |
| mcphub | 1-2天/版本（88次发布）| 企业级迭代速度，CI/CD自动化 |
| openskills | 2-4周/版本，2人团队 | 小团队同样能保持稳定迭代 |

**Aidean Desktop迭代策略**：
- Phase 1-2：2周/版本（快速迭代，抢占市场）
- Phase 3-4：4周/版本（稳定功能，打磨体验）
- 发布渠道：GitHub Releases + 应用内更新（@tauri-apps/plugin-updater）

### 6.2 版本路线图

```
v0.1.0（MVP）
  ├── Skills安装/同步/更新
  ├── 38+工具适配（直接来自skills-hub）
  └── Explore商城（ClawHub精选）

v0.2.0
  ├── MCP服务器管理
  ├── MCP配置写入各IDE
  └── 本地HTTP端点

v0.3.0
  ├── 任务环境（三维组合）
  ├── 双协议AGENTS.md生成
  └── 全文搜索

v0.4.0（会员版）
  ├── 君子订阅账号
  ├── 私有Skills仓库
  └── 本地向量AI推荐

v0.5.0
  ├── 平台同步
  ├── Deep Link
  └── 公众号联动

v1.0.0（正式版）
  ├── AID代币体系
  ├── 框架官方认证
  └── 伴侣插件（VS Code）
```

---

## 七、交互体验最优方案

### 7.1 核心操作流程设计

**流程1：首次安装Skills（<30秒完成）**
```
打开Aidean Desktop
  → 首页仪表盘
  → 点击「探索」
  → 浏览ClawHub精选（300个）或搜索关键词
  → 找到目标Skill，点击「安装」
  → ✅ 自动同步到所有已检测IDE（symlink/copy）
  → Toast：「已安装到 6 个工具」
```

**流程2：配置MCP服务器（<2分钟完成）**
```
点击「MCP」标签
  → 点击「从商城添加」
  → 搜索「firecrawl」
  → 选择，填写API Key
  → 点击「安装并应用」
  → 自动写入 ~/.cursor/mcp.json 等配置
  → ✅ MCP服务器启动成功
  → 内置HTTP端点：http://127.0.0.1:19527/mcp
```

**流程3：创建任务环境（<1分钟）**
```
点击「环境」标签
  → 「新建任务环境」
  → 输入名称：「Web全栈开发」
  → 选择Skills：[frontend-design, css-development]
  → 选择MCP：[firecrawl, fetch]
  → 点击「一键应用」
  → ✅ 已应用到 6 个工具
```

**流程4：君子订阅（会员专属）**
```
点击「订阅」
  → 扫码/登录（微信/邮箱）
  → 选择订阅计划
  → 解锁：私有Skills + AI推荐 + 代币激励
  → 公众号关注：接收更新推送
```

### 7.2 页面结构设计

```
主窗口
├── TitleBar（顶部标题栏，参考mcp-router）
│   ├── 应用名称
│   ├── 当前任务环境选择器
│   └── 账号/会员状态
│
├── Sidebar（左侧导航，参考mcp-router）
│   ├── 🏠 首页（仪表盘）
│   ├── ⚡ Skills（管理+探索）
│   ├── 🔧 MCP（服务器+商城）
│   ├── 🤖 Agent（管理）
│   ├── 🎯 任务环境
│   ├── 🛍️ 商城（统一入口）
│   └── ⚙️ 设置
│
└── 内容区
    ├── 首页（统计+快捷操作+最近更新+AI推荐）
    ├── Skills页
    │   ├── My Skills（列表+同步状态）
    │   └── Explore（精选+搜索）
    ├── MCP页
    │   ├── 服务器列表（状态+工具开关）
    │   └── MCP商城
    ├── Agent页（管理Agent文件）
    ├── 任务环境页（创建/管理/应用）
    ├── 商城（Skills+MCP统一探索）
    └── 设置页（路径+语言+主题+更新+账号）
```

---

## 八、UI设计最优方案

### 8.1 视觉风格定位

```
定位：专业工具 + 现代简约 + 中文友好
参考：mcp-router（shadcn/ui专业感）+ skills-hub（轻量感）

颜色体系：
  主色：蓝紫色渐变（#6366f1 → #8b5cf6）
  背景：暗色主题优先（#0f0f0f / #1a1a1a）
  亮色主题：可选
  状态色：
    成功：#22c55e（已同步/运行中）
    警告：#f59e0b（待更新）
    错误：#ef4444（同步失败）
    信息：#3b82f6（提示）

字体：
  中文：系统默认（-apple-system/Microsoft YaHei）
  代码：JetBrains Mono / Fira Code

圆角：rounded-lg（8px），卡片rounded-xl（12px）
```

### 8.2 组件规范

```
基础组件：shadcn/ui（mcp-router已验证，高质量）
图标：lucide-react（skills-hub/openskills均使用）
Markdown：react-markdown（skills-hub已验证，支持GFM+代码高亮）
Toast：Sonner（cc-switch/skills-hub均使用）
对话框：Radix UI Dialog（shadcn/ui内置）
```

### 8.3 关键UI差异化设计

| UI元素 | 设计方案 | 参考来源 |
|---|---|---|
| **任务环境卡片** | 大图标+名称+三维标签（Skills/MCP/Agent数量）| 原创 |
| **商城卡片** | Stars+下载量+官方认证标签+一键安装 | skills-hub SkillCard |
| **同步状态** | 每个IDE的实时同步状态指示 | skills-hub |
| **MCP状态** | 绿色/红色/灰色运行状态指示 | mcp-router |
| **君子会员徽章** | 金色「君」字徽章，卡片右上角 | 原创 |
| **Skill详情** | 文件树+Markdown渲染+frontmatter表格 | skills-hub SkillDetailView |

---

## 九、配置路径完整实现方案

> 详细路径见：`.example/config-paths-reference.md`

### 9.1 Skills路径实现

```rust
// tool_adapters/mod.rs（复用skills-hub，扩展MCP路径字段）
pub struct ToolAdapter {
  pub key: &'static str,
  pub display_name: &'static str,
  pub skills_dir: &'static str,      // 相对~的Skills目录
  pub mcp_config: Option<&'static str>, // MCP配置文件路径（新增）
  pub detect_dir: &'static str,      // 检测目录（判断是否安装）
  pub force_copy: bool,              // Cursor必须true
}

// 示例：Cursor适配器
const CURSOR: ToolAdapter = ToolAdapter {
  key: "cursor",
  display_name: "Cursor",
  skills_dir: ".cursor/skills",
  mcp_config: Some(".cursor/mcp.json"),
  detect_dir: ".cursor",
  force_copy: true,  // ⚠️ Cursor symlink bug
};

// Claude Code适配器
const CLAUDE_CODE: ToolAdapter = ToolAdapter {
  key: "claude_code",
  display_name: "Claude Code",
  skills_dir: ".claude/skills",
  mcp_config: None,  // Claude Code通过~/.claude.json管理
  detect_dir: ".claude",
  force_copy: false,
};
```

### 9.2 MCP配置写入逻辑

```rust
// mcp/config_writer.rs
pub fn write_mcp_config(tool: &ToolAdapter, servers: &[McpServer]) -> Result<()> {
  let config_path = match tool.mcp_config {
    Some(p) => expand_home(p),
    None => return Ok(()), // 该工具不支持MCP配置文件写入
  };

  // 读取现有配置（保留用户自定义的其他配置）
  let mut config = read_json_or_default(&config_path)?;

  // 合并Aidean管理的MCP服务器
  config["mcpServers"] = build_mcp_servers_json(servers);

  // 写回（原子写入，防止损坏）
  write_json_atomic(&config_path, &config)
}
```

### 9.3 各系统路径处理

```rust
// infrastructure/paths.rs
pub fn get_home_dir() -> PathBuf {
  #[cfg(windows)]
  return PathBuf::from(std::env::var("USERPROFILE").unwrap());

  #[cfg(not(windows))]
  return PathBuf::from(std::env::var("HOME").unwrap());
}

pub fn get_config_dir() -> PathBuf {
  #[cfg(windows)]
  return PathBuf::from(std::env::var("APPDATA").unwrap());

  #[cfg(target_os = "macos")]
  return get_home_dir().join("Library").join("Application Support");

  #[cfg(target_os = "linux")]
  return get_home_dir().join(".config");
}

// Claude Desktop MCP配置（三平台路径）
pub fn claude_desktop_config_path() -> PathBuf {
  #[cfg(windows)]
  return get_config_dir().join("Claude").join("claude_desktop_config.json");

  #[cfg(target_os = "macos")]
  return get_config_dir().join("Claude").join("claude_desktop_config.json");

  #[cfg(target_os = "linux")]
  return get_home_dir().join(".config").join("claude").join("claude_desktop_config.json");
}
```

---

## 十、SQLite数据库最优Schema

```sql
-- 基于skills-hub扩展，增加MCP/Agent/Environment/Subscription

-- Skills表（继承skills-hub）
CREATE TABLE skills (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  source_type TEXT NOT NULL,  -- local|git|github|platform
  source_ref TEXT,            -- Git URL或本地路径
  source_revision TEXT,       -- Git commit hash
  central_path TEXT NOT NULL UNIQUE,
  content_hash TEXT,
  description TEXT,           -- 从SKILL.md frontmatter提取
  category TEXT,
  tags TEXT,                  -- JSON array
  is_official INTEGER DEFAULT 0, -- 官方认证
  is_junzi_only INTEGER DEFAULT 0, -- 君子会员专属
  updated_at INTEGER NOT NULL,
  status TEXT NOT NULL        -- active|deleted
);

-- Skill同步目标（继承skills-hub）
CREATE TABLE skill_targets (
  id TEXT PRIMARY KEY,
  skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  tool TEXT NOT NULL,         -- cursor|claude_code|opencode...
  target_path TEXT NOT NULL,
  mode TEXT NOT NULL,         -- symlink|junction|copy
  status TEXT NOT NULL,       -- synced|error|pending
  last_error TEXT,
  synced_at INTEGER,
  UNIQUE(skill_id, tool)
);

-- MCP服务器表（新增）
CREATE TABLE mcp_servers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  display_name TEXT,
  command TEXT,               -- stdio: npx/uvx/python等
  args TEXT,                  -- JSON array
  env TEXT,                   -- JSON object（加密存储敏感字段）
  url TEXT,                   -- HTTP/SSE/WS协议URL
  headers TEXT,               -- JSON object
  protocol TEXT NOT NULL,     -- stdio|sse|http|websocket
  status TEXT NOT NULL,       -- running|stopped|error
  enabled INTEGER DEFAULT 1,
  is_official INTEGER DEFAULT 0,
  source_type TEXT,           -- manual|marketplace|platform
  updated_at INTEGER NOT NULL
);

-- MCP工具开关（工具粒度控制，参考mcp-router）
CREATE TABLE mcp_tool_overrides (
  server_id TEXT NOT NULL REFERENCES mcp_servers(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (server_id, tool_name)
);

-- Agent文件（新增）
CREATE TABLE agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,    -- 实际文件路径
  model TEXT,
  tools TEXT,                 -- JSON array
  description TEXT,
  updated_at INTEGER NOT NULL
);

-- 任务环境（核心差异化功能）
CREATE TABLE environments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  skill_ids TEXT NOT NULL DEFAULT '[]',  -- JSON array
  mcp_server_ids TEXT NOT NULL DEFAULT '[]', -- JSON array
  agent_ids TEXT NOT NULL DEFAULT '[]', -- JSON array
  apply_scope TEXT NOT NULL DEFAULT 'global', -- global|project
  is_active INTEGER DEFAULT 0,
  applied_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- 用户订阅（君子会员）
CREATE TABLE subscription (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  email TEXT,
  plan TEXT NOT NULL DEFAULT 'free', -- free|junzi
  expires_at INTEGER,
  token_balance INTEGER DEFAULT 0,   -- AID代币余额
  updated_at INTEGER NOT NULL
);

-- 设置表（继承skills-hub）
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
-- 关键key：
-- central_repo_path: 中心仓库路径
-- language: zh|en
-- theme: dark|light
-- http_port: 本地HTTP端点端口（默认19527）
-- github_token: GitHub API Token
-- auto_update_enabled: 是否自动更新
-- accept_platform_commands: 接受平台下发指令
```

---

## 十一、君子订阅会员体系设计

### 11.1 会员权益对比

| 权益 | 免费版 | 君子会员 |
|---|---|---|
| Skills安装（公开）| ✅无限制 | ✅无限制 |
| MCP管理 | ✅基础 | ✅完整 |
| 任务环境 | ✅3个 | ✅无限 |
| 商城探索 | ✅基础 | ✅完整 |
| 私有Skills仓库 | ❌ | ✅SSH/HTTPS |
| AI语义推荐 | ❌ | ✅本地向量 |
| 平台云推荐 | ❌ | ✅高级 |
| 订阅推送 | ❌ | ✅邮件+公众号 |
| AID代币空投 | ❌ | ✅每月空投 |
| 优先客服 | ❌ | ✅ |
| 框架私有Skills | ❌ | ✅（合作框架专属）|

### 11.2 AID代币体系

```
获得代币途径：
  + 购买君子订阅：每月100 AID
  + 发布Skills到平台：50 AID/个
  + Skills被安装1次：0.1 AID
  + 推荐新用户：50 AID/人
  + 完成任务（日常使用）：1-5 AID

使用代币途径：
  - 购买私有Skills（创作者设定价格）
  - 兑换高级AI推荐次数
  - 解锁限定任务环境模板
  - 捐赠给开源Skills作者
```

### 11.3 公众号联动设计

```
绑定流程：
  1. Aidean Desktop → 设置 → 关联公众号
  2. 扫描二维码关注「Aidean Assistant」
  3. 发送绑定码完成关联

公众号触发桌面端：
  用户在公众号发送：「应用 Web全栈开发」
  → 平台通过WebSocket推送到桌面端
  → 桌面端自动应用「Web全栈开发」任务环境
  → 公众号回复：「已应用到 6 个工具 ✅」

订阅推送：
  - 关注的Skills/MCP有新版本 → 公众号通知
  - AID代币空投到账 → 公众号通知
  - 会员到期提醒 → 公众号+邮件通知
```

---

## 十二、总结与关键决策

### 12.1 不妥协的技术决策

1. **必须用Tauri 2**：cc-switch 33.7k⭐验证，skills-hub验证，安装包<15MB是核心竞争力
2. **直接复用skills-hub MIT代码**：节省4-6周，38+工具适配器是最难攻克的部分
3. **Cursor必须强制copy**：已知symlink bug，绝不妥协，否则Cursor用户全部失效
4. **SQLite不替换**：零依赖、易备份、跨平台，够用就好
5. **本地优先**：免费版完全本地运行，不依赖网络，这是信任基础

### 12.2 差异化护城河优先级

```
第1护城河（最难复制）：三维任务环境
  → 竞品只做1-2维，Aidean做3维（Skills+MCP+Agent）
  → 一键切换开发场景，用户依赖度最高

第2护城河（商业价值）：君子订阅体系
  → 私有Skills仓库，企业无法绕过
  → AID代币激励，形成正向飞轮

第3护城河（生态壁垒）：框架官方认证
  → emp已验证此模式，吸引框架官方入驻
  → 官方认证Skills，用户优先选择

第4护城河（用户粘性）：公众号联动
  → 中国用户独特体验，海外竞品无法复制
  → 微信生态接入，触达非技术决策者
```

### 12.3 开发资源分配建议

```
Phase 1（MVP，4周）：
  2人 × 4周 = 8人周
  - 1人主攻Rust后端（复用skills-hub代码）
  - 1人主攻React前端（复用skills-hub UI组件）
  目标：能用的Skills管理 + 38工具同步

Phase 2（核心，6周）：
  2人 × 6周 = 12人周
  - 1人Rust：MCP管理 + 配置写入 + HTTP端点
  - 1人React：任务环境 + 双协议 + 搜索
  目标：完整Skills+MCP管理 + 任务环境

Phase 3（会员，4周）：
  2人 × 4周 = 8人周
  - 1人后端：平台API + 订阅系统 + 推送
  - 1人前端：会员页面 + AI推荐 + Deep Link
  目标：君子订阅上线，开始商业化
```

---

> **文档版本**: v1.0
> **最后更新**: 2026-03-26
> **作者**: Aidean Desktop 产品团队
> **参考文档**: `.example/` 目录下全部7个竞品分析 + `config-paths-reference.md`
