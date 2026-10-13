# 桌面端完整设计方案

> 设计日期：2026-03-26
> 产品名称：AI Skills & MCP 控制中枢（暂定名）
> 目标平台：Windows / macOS / Linux

---

## 一、参考案例综合分析

### 1.1 七大参考案例提炼

| 项目 | 核心借鉴点 | 技术栈 | Stars | 发布版本 |
|---|---|---|---|---|
| **skills.sh** | 210+公开Skills、18+Agent支持、官方认证体系、统一安装协议 | - | - | - |
| **cc-switch** | Profile切换、会话管理、Deep Link、Tauri分层架构、50+Provider预设 | Tauri 2 + React | 33.7k | v3.12.3 |
| **skills-hub** | 符号链接同步、多IDE路径表（30+工具）、探索页+一键安装 | Tauri + React | - | - |
| **mcp-router** | 工作区/项目分组、工具粒度开关、本地日志统计、隐私安全 | Tauri + Rust | - | - |
| **mcphub** | servers.json标准格式、向量语义搜索、热插拔配置、OAuth 2.0 | React + Express | - | - |
| **openskills** | 通用安装协议（SKILL.md + AGENTS.md）、私有仓库支持、渐进式加载 | TypeScript CLI | 9.2k | v1.5.0 |
| **emp** | 框架级Skills包模式、Git URL安装、18+ Agents支持、项目级隔离 | Rspack + Module Federation | 2.4k | v3.10.1 |

### 1.2 核心借鉴点总结

#### 从 cc-switch 借鉴
- ✅ **Profile切换机制**：支持多配置文件切换，适应不同开发场景
- ✅ **会话管理**：本地会话缓存、搜索、恢复
- ✅ **Deep Link支持**：`aiskills://` 协议，网页端一键唤起桌面端
- ✅ **Tauri分层架构**：Rust后端（文件操作）+ React前端（UI）
- ✅ **健康检查机制**：实时验证Skills/MCP可用性
- ✅ **Failover降级**：主服务不可用时自动切换备用

#### 从 skills-hub 借鉴
- ✅ **符号链接同步**：symlink/junction 模式，节省磁盘空间，更新即生效
- ✅ **多IDE路径表**：内置30+AI工具的配置路径，自动检测
- ✅ **探索页+一键安装**：浏览ClawHub/skills.sh，一键安装并同步
- ✅ **技能详情预览**：Markdown渲染+语法高亮，预览技能内容
- ✅ **统一视图+per-tool激活状态**：一个界面管理所有工具的Skills/MCP

#### 从 mcp-router 借鉴
- ✅ **工作区/项目分组**：按项目组织MCP服务器，隔离不同开发环境
- ✅ **工具粒度开关**：每个MCP服务器的工具可单独启用/禁用
- ✅ **本地日志统计**：记录MCP调用日志，便于调试和优化
- ✅ **隐私安全**：所有数据本地存储，API Key不上传云端

#### 从 mcphub 借鉴
- ✅ **servers.json标准格式**：统一MCP配置格式，便于迁移和备份
- ✅ **向量语义搜索**：AI-powered tool discovery，智能推荐相关Skills/MCP
- ✅ **热插拔配置**：添加/删除/更新MCP服务器无需重启
- ✅ **OAuth 2.0支持**：安全的第三方认证（GitHub/Google）
- ✅ **Docker-Ready**：容器化部署，便于运维

#### 从 openskills 借鉴
- ✅ **通用安装协议**：SKILL.md + AGENTS.md 标准格式
- ✅ **私有仓库支持**：从私有Git仓库安装Skills/MCP
- ✅ **渐进式加载**：按需加载Skills，保持Agent上下文干净
- ✅ **项目级和全局级安装**：灵活的安装范围控制

#### 从 emp 借鉴
- ✅ **框架级Skills包模式**：打包完整的开发框架Skills（如EMP全栈）
- ✅ **Git URL安装**：无需NPM发布，直接从GitHub/GitLab安装
- ✅ **项目级隔离**：每个项目独立的Skills/MCP环境
- ✅ **Symlink/Full Copy模式**：灵活的同步策略

#### 从 skills.sh 借鉴
- ✅ **官方认证体系**：Skills/MCP的官方认证标识
- ✅ **统一安装协议**：`npx skills add <owner/repo>` 标准命令
- ✅ **210+公开Skills**：丰富的Skills生态

---

## 二、产品定位

### 2.1 核心定位

**AI Skills & MCP 控制中枢** — 一站式管理所有AI编程工具的Skills、MCP、Agent和任务环境。

### 2.2 核心价值

| 价值点 | 说明 |
|---|---|
| **统一管理** | 一个界面管理30+AI工具的Skills/MCP/Agent |
| **一键应用** | 收藏夹一键应用到全局或项目级 |
| **自动更新** | Skills/MCP自动检测和更新 |
| **智能推荐** | AI-powered语义搜索，推荐相关Skills/MCP |
| **隐私安全** | 所有数据本地存储，API Key不上传云端 |
| **跨平台** | Windows / macOS / Linux 全平台支持 |

### 2.3 目标用户

| 用户类型 | 需求 |
|---|---|
| **AI编程工具重度用户** | 多工具并存，需要统一管理 |
| **企业开发团队** | 需要统一的Skills/MCP标准和私有仓库 |
| **Skills/MCP开发者** | 需要发布和分发自己的Skills/MCP |
| **AI Agent爱好者** | 需要探索和尝试最新的Skills/MCP |

---

## 三、技术选型

### 3.1 整体技术栈

| 层级 | 技术 | 版本 | 说明 |
|---|---|---|---|
| **桌面框架** | Tauri 2 | ^2.8.0 | Rust后端 + WebView前端 |
| **前端语言** | TypeScript | ^5.3.0 | 严格类型检查 |
| **前端框架** | React | ^18.2.0 | 函数式组件 |
| **构建工具** | Vite | ^7.3.0 | 极速HMR开发体验 |
| **样式** | Tailwind CSS | ^3.4.17 | 原子化CSS |
| **UI组件库** | Radix UI | 全套 | 无障碍基础组件 |
| **状态管理** | Zustand | ^4.x | 轻量级状态管理 |
| **数据请求** | TanStack Query | ^5.90.3 | 服务端状态管理 |
| **表单** | react-hook-form + zod | ^7/^4 | 表单验证 |
| **动画** | Framer Motion | ^12.23.25 | 流畅过渡动画 |
| **代码编辑器** | CodeMirror 6 | ^6.0.2 | JSON/JS/Markdown编辑 |
| **搜索** | FlexSearch | ^0.8.212 | 本地全文搜索 |
| **拖拽** | dnd-kit | ^6/^10 | 列表排序拖拽 |
| **国际化** | i18next + react-i18next | ^25/^16 | zh/en/ja 三语言 |
| **Toast通知** | Sonner | ^2.0.7 | 优雅通知 |
| **Markdown渲染** | react-markdown + remark/rehype | ^9/^15 | Markdown渲染+语法高亮 |
| **后端语言** | Rust | - | 核心业务逻辑、文件操作 |
| **本地存储** | SQLite (via Tauri) | - | 数据持久化 |
| **向量搜索** | qdrant-client | ^1.x | 本地向量数据库（可选） |
| **Tauri插件** | store/updater/dialog/process | ^2.x | 平台能力 |

### 3.2 技术选型理由

#### 为什么选择 Tauri 2？

| 对比项 | Tauri 2 | Electron | 结论 |
|---|---|---|---|
| **安装包大小** | ~10MB | ~150MB | Tauri 胜出 |
| **内存占用** | ~50MB | ~200MB | Tauri 胜出 |
| **启动速度** | ~1s | ~3s | Tauri 胜出 |
| **安全性** | Rust后端，内存安全 | Node.js，存在安全风险 | Tauri 胜出 |
| **开发体验** | Rust学习曲线陡峭 | JavaScript生态丰富 | Electron 胜出 |
| **社区生态** | 快速增长 | 成熟稳定 | Electron 胜出 |

**结论**：Tauri 2 在性能、体积、安全性方面优势明显，适合桌面端应用。

#### 为什么选择 SQLite？

| 对比项 | SQLite | PostgreSQL/MySQL | 结论 |
|---|---|---|---|
| **部署复杂度** | 零配置，单文件 | 需要独立服务 | SQLite 胜出 |
| **跨设备同步** | 文件复制即可 | 需要导出/导入 | SQLite 胜出 |
| **并发性能** | 单写多读 | 高并发 | PostgreSQL 胜出 |
| **数据规模** | 适合中小规模 | 适合大规模 | PostgreSQL 胜出 |

**结论**：桌面端应用数据规模不大，SQLite 零配置、易同步，适合本地存储。

---

## 四、三大主页面设计

### 4.1 首页（控制台）

#### 4.1.1 页面布局

```
┌─────────────────────────────────────────────────────────────────┐
│  [Logo] AI Skills & MCP 控制中枢              [设置] [帮助] │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  欢迎回来，开发者！                                 │ │
│  │  今日已更新 3 个 Skills，2 个 MCP 服务器             │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌──────────────────────┐  ┌──────────────────────┐        │
│  │  Skills 收藏夹      │  │  MCP 收藏夹         │        │
│  │  [12] 个Skills      │  │  [8] 个MCP         │        │
│  │  [一键应用]         │  │  [一键应用]         │        │
│  └──────────────────────┘  └──────────────────────┘        │
│                                                          │
│  ┌──────────────────────┐  ┌──────────────────────┐        │
│  │  Agent 收藏夹       │  │  任务环境收藏夹     │        │
│  │  [5] 个Agent       │  │  [3] 个任务环境    │        │
│  │  [一键应用]         │  │  [一键应用]         │        │
│  └──────────────────────┘  └──────────────────────┘        │
│                                                          │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  最近更新                                             │ │
│  │  • pdf (v2.1.0) — 2小时前                           │ │
│  │  • fetch-mcp (v1.2.0) — 5小时前                     │ │
│  │  • empjs (v1.0.0) — 1天前                          │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  AI 推荐                                             │ │
│  │  根据您的使用习惯，推荐以下 Skills/MCP：               │ │
│  │  • react-native-best-practices — React Native 性能优化  │ │
│  │  • mcp-ragflow — RAGFlow 知识库集成                  │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

#### 4.1.2 核心功能

| 功能 | 说明 | 优先级 |
|---|---|---|
| 欢迎卡片 | 显示今日更新统计、快捷操作 | P0 |
| 四大收藏夹 | Skills/MCP/Agent/任务环境，显示数量和一键应用按钮 | P0 |
| 最近更新 | 显示最近更新的Skills/MCP，带时间戳 | P1 |
| AI 推荐 | 根据使用习惯推荐相关Skills/MCP | P1 |
| 快捷搜索 | 全局搜索框，搜索Skills/MCP/Agent/任务环境 | P0 |

### 4.2 商城（探索）

#### 4.2.1 页面布局

```
┌─────────────────────────────────────────────────────────────────┐
│  [← 首页] 商城                    [搜索框] [筛选] [排序] │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  [Skills] [MCP] [Agent] [任务环境]                 │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  热门推荐                                             │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐│ │
│  │  │  pdf     │ │  fetch   │ │  empjs   │ │  ragflow ││ │
│  │  │  ⭐ 4.9  │ │  ⭐ 4.8  │ │  ⭐ 4.7  │ │  ⭐ 4.6 ││ │
│  │  │  10k+    │ │  8k+     │ │  5k+     │ │  3k+   ││ │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘│ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  最新发布                                             │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐│ │
│  │  │  new-skill│ │  new-mcp │ │  new-agent│ │  new-env ││ │
│  │  │  ⭐ 4.5  │ │  ⭐ 4.4  │ │  ⭐ 4.3  │ │  ⭐ 4.2 ││ │
│  │  │  1k+     │ │  800+    │ │  600+    │ │  400+   ││ │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘│ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  分类浏览                                             │ │
│  │  [文档处理] [数据分析] [Web开发] [移动开发] [AI/ML] ... │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  官方认证                                             │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐│ │
│  │  │  official│ │  official│ │  official│ │  official││ │
│  │  │  ⭐ 5.0  │ │  ⭐ 5.0  │ │  ⭐ 5.0  │ │  ⭐ 5.0 ││ │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘│ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

#### 4.2.2 核心功能

| 功能 | 说明 | 优先级 |
|---|---|---|
| 分类切换 | Skills/MCP/Agent/任务环境四个分类 | P0 |
| 搜索 | 全文搜索Skills/MCP/Agent/任务环境 | P0 |
| 筛选 | 按分类、标签、评分、更新时间筛选 | P1 |
| 排序 | 按热门、最新、评分排序 | P1 |
| 热门推荐 | 显示最受欢迎的Skills/MCP/Agent/任务环境 | P0 |
| 最新发布 | 显示最新发布的Skills/MCP/Agent/任务环境 | P1 |
| 分类浏览 | 按分类浏览Skills/MCP/Agent/任务环境 | P1 |
| 官方认证 | 显示官方认证的Skills/MCP/Agent/任务环境 | P1 |
| 详情预览 | 点击Skills/MCP/Agent/任务环境查看详情（Markdown渲染）| P0 |
| 一键安装 | 点击安装按钮，自动下载并同步到所有检测到的工具 | P0 |
| 添加到收藏夹 | 点击收藏按钮，添加到对应收藏夹 | P0 |

### 4.3 设置

#### 4.3.1 页面布局

```
┌─────────────────────────────────────────────────────────────────┐
│  [← 首页] 设置                                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  通用设置                                             │ │
│  │  • 语言：[中文 ▼]                                     │ │
│  │  • 主题：[系统 ▼]                                     │ │
│  │  • 启动时：[显示首页 ▼]                                │ │
│  │  • 自动更新：[✓] 每天检查更新                          │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  平台联动                                             │ │
│  │  • 接受官网命令：[✓]                                 │ │
│  │  • 接受公众号命令：[✓]                                │ │
│  │  • 同步配置文件：[✓] 每30分钟同步                    │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  检测到的工具                                         │ │
│  │  ✓ Claude Code  (~/.claude/skills)                   │ │
│  │  ✓ Cursor       (~/.cursor/skills)                    │ │
│  │  ✓ Codex        (~/.codex/skills)                    │ │
│  │  ✗ OpenCode     (未安装)                             │ │
│  │  ✓ OpenClaw     (~/.openclaw/skills)                 │ │
│  │  [重新检测]                                           │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  同步策略                                             │ │
│  │  • 默认模式：[符号链接 ▼]                             │ │
│  │  • 备用模式：[完整复制 ▼]                             │ │
│  │  • Cursor 强制使用：[完整复制]（不支持符号链接）         │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  君子订阅                                             │ │
│  │  • 当前状态：[未订阅]                                 │ │
│  │  • 订阅特权：聚合搜索、多IDE协同、私有Skills/MCP等     │ │
│  │  • AID代币：[0]                                     │ │
│  │  • [查看订阅计划] [兑换代币]                           │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  数据管理                                             │ │
│  │  • 数据库路径：[~/.aiskills/data.db]                  │ │
│  │  • 数据库大小：[12.5 MB]                              │ │
│  │  • [备份数据库] [恢复数据库] [清空数据库]             │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  关于                                                 │ │
│  │  • 版本：v1.0.0                                      │ │
│  │  • 更新日期：2026-03-26                                │ │
│  │  • [检查更新] [GitHub] [反馈问题]                       │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

#### 4.3.2 核心功能

| 功能 | 说明 | 优先级 |
|---|---|---|
| 通用设置 | 语言、主题、启动行为、自动更新 | P0 |
| 平台联动 | 接受官网/公众号命令、配置文件同步 | P0 |
| 检测到的工具 | 显示已安装的AI工具及其配置路径 | P0 |
| 重新检测 | 重新扫描系统中安装的AI工具 | P1 |
| 同步策略 | 选择符号链接/完整复制模式 | P0 |
| 君子订阅 | 订阅管理、特权查看、代币兑换 | P1 |
| 数据管理 | 数据库备份/恢复/清空 | P1 |
| 关于 | 版本信息、检查更新、GitHub链接、反馈问题 | P1 |

---

## 五、配置文件路径表

### 5.1 各系统各IDE配置路径

| 工具 | Windows | macOS | Linux | 检测目录 |
|---|---|---|---|---|
| **Claude Code** | `%USERPROFILE%\.claude\skills` | `~/.claude/skills` | `~/.claude` |
| **Cursor** | `%USERPROFILE%\.cursor\skills` | `~/.cursor/skills` | `~/.cursor` |
| **Codex** | `%USERPROFILE%\.codex\skills` | `~/.codex/skills` | `~/.codex` |
| **OpenCode** | `%USERPROFILE%\.config\opencode\skills` | `~/.config/opencode/skills` | `~/.config/opencode` |
| **OpenClaw** | `%USERPROFILE%\.openclaw\skills` | `~/.openclaw/skills` | `~/.openclaw` |
| **Gemini CLI** | `%USERPROFILE%\.gemini\skills` | `~/.gemini/skills` | `~/.gemini` |
| **Antigravity** | `%USERPROFILE%\.gemini\antigravity\global_skills` | `~/.gemini/antigravity/global_skills` | `~/.gemini/antigravity` |
| **AMP** | `%USERPROFILE%\.config\agents\skills` | `~/.config/agents/skills` | `~/.config/agents` |
| **Cline** | `%USERPROFILE%\.cline\skills` | `~/.cline/skills` | `~/.cline` |
| **CodeBuddy** | `%USERPROFILE%\.codebuddy\skills` | `~/.codebuddy/skills` | `~/.codebuddy` |
| **Continue** | `%USERPROFILE%\.continue\skills` | `~/.continue/skills` | `~/.continue` |
| **Crush** | `%USERPROFILE%\.config\crush\skills` | `~/.config/crush/skills` | `~/.config/crush` |
| **Junie** | `%USERPROFILE%\.junie\skills` | `~/.junie/skills` | `~/.junie` |
| **iFlow CLI** | `%USERPROFILE%\.iflow\skills` | `~/.iflow/skills` | `~/.iflow` |
| **Kiro CLI** | `%USERPROFILE%\.kiro\skills` | `~/.kiro/skills` | `~/.kiro` |
| **Kode** | `%USERPROFILE%\.kode\skills` | `~/.kode/skills` | `~/.kode` |
| **MCPJam** | `%USERPROFILE%\.mcpjam\skills` | `~/.mcpjam/skills` | `~/.mcpjam` |
| **Mistral Vibe** | `%USERPROFILE%\.vibe\skills` | `~/.vibe/skills` | `~/.vibe` |
| **Mux** | `%USERPROFILE%\.mux\skills` | `~/.mux/skills` | `~/.mux` |
| **OpenClaude IDE** | `%USERPROFILE%\.openclaude\skills` | `~/.openclaude/skills` | `~/.openclaude` |
| **OpenHands** | `%USERPROFILE%\.openhands\skills` | `~/.openhands/skills` | `~/.openhands` |
| **Pi** | `%USERPROFILE%\.pi\agent\skills` | `~/.pi/agent/skills` | `~/.pi/agent` |
| **Qoder** | `%USERPROFILE%\.qoder\skills` | `~/.qoder/skills` | `~/.qoder` |
| **Qwen Code** | `%USERPROFILE%\.qwen\skills` | `~/.qwen/skills` | `~/.qwen` |
| **Trae** | `%USERPROFILE%\.trae\skills` | `~/.trae/skills` | `~/.trae` |
| **Trae CN** | `%USERPROFILE%\.trae-cn\skills` | `~/.trae-cn/skills` | `~/.trae-cn` |
| **Zencoder** | `%USERPROFILE%\.zencoder\skills` | `~/.zencoder/skills` | `~/.zencoder` |
| **Neovate** | `%USERPROFILE%\.neovate\skills` | `~/.neovate/skills` | `~/.neovate` |
| **Pochi** | `%USERPROFILE%\.pochi\skills` | `~/.pochi/skills` | `~/.pochi` |
| **AdaL** | `%USERPROFILE%\.adal\skills` | `~/.adal/skills` | `~/.adal` |
| **Kilo Code** | `%USERPROFILE%\.kilocode\skills` | `~/.kilocode/skills` | `~/.kilocode` |
| **Roo Code** | `%USERPROFILE%\.roo\skills` | `~/.roo/skills` | `~/.roo` |
| **Goose** | `%USERPROFILE%\.config\goose\skills` | `~/.config/goose/skills` | `~/.config/goose` |
| **GitHub Copilot** | `%USERPROFILE%\.copilot\skills` | `~/.copilot/skills` | `~/.copilot` |
| **Clawdbot** | `%USERPROFILE%\.clawdbot\skills` | `~/.clawdbot/skills` | `~/.clawdbot` |
| **Droid** | `%USERPROFILE%\.factory\skills` | `~/.factory/skills` | `~/.factory` |
| **Windsurf** | `%USERPROFILE%\.codeium\windsurf\skills` | `~/.codeium/windsurf/skills` | `~/.codeium/windsurf` |
| **MoltBot** | `%USERPROFILE%\.moltbot\skills` | `~/.moltbot/skills` | `~/.moltbot` |

### 5.2 配置文件检测逻辑

```typescript
// 检测逻辑（伪代码）
async function detectInstalledTools(): Promise<InstalledTool[]> {
  const tools: InstalledTool[] = [];
  
  for (const tool of TOOL_CONFIGS) {
    const skillsDir = getSkillsDir(tool);
    const exists = await fileExists(skillsDir);
    
    if (exists) {
      tools.push({
        name: tool.name,
        skillsDir,
        detected: true,
        skillsCount: await countFiles(skillsDir),
      });
    }
  }
  
  return tools;
}

// 获取技能目录
function getSkillsDir(tool: ToolConfig): string {
  const platform = process.platform; // 'win32', 'darwin', 'linux'
  const homeDir = os.homedir();
  
  if (platform === 'win32') {
    return tool.windowsPath.replace('%USERPROFILE%', homeDir);
  } else {
    return tool.unixPath.replace('~', homeDir);
  }
}
```

---

## 六、收藏夹数据结构

### 6.1 TypeScript 类型定义

```typescript
// 基础类型
interface BaseEntity {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  tags: string[];
  category: string;
  rating: number;
  downloads: number;
  updatedAt: string;
  createdAt: string;
  official: boolean;
  source: 'clawhub' | 'skills.sh' | 'private-git' | 'local';
  sourceUrl?: string;
  integrity?: string; // sha256 校验和
}

// Skill 收藏夹
interface Skill extends BaseEntity {
  type: 'skill';
  filePath: string; // 本地文件路径
  supportedSystems: ('windows' | 'macos' | 'linux')[];
  supportedIDEs: string[]; // ['claude-code', 'cursor', 'codex', ...]
  supportedProtocols: string[]; // ['skill.md', 'agents.md', ...]
  requires?: {
    tools?: string[];
    dependencies?: string[];
  };
}

// MCP 收藏夹
interface MCP extends BaseEntity {
  type: 'mcp';
  configPath: string; // 本地配置文件路径
  command: string;
  args: string[];
  env?: Record<string, string>;
  supportedSystems: ('windows' | 'macos' | 'linux')[];
  supportedIDEs: string[];
  tools: MCPTool[];
}

interface MCPTool {
  name: string;
  description: string;
  enabled: boolean;
}

// Agent 收藏夹
interface Agent extends BaseEntity {
  type: 'agent';
  configPath: string;
  supportedSystems: ('windows' | 'macos' | 'linux')[];
  supportedIDEs: string[];
  skills: string[]; // 关联的 Skill IDs
  mcps: string[]; // 关联的 MCP IDs
}

// 任务环境收藏夹
interface TaskEnvironment extends BaseEntity {
  type: 'environment';
  configPath: string;
  skills: string[]; // 关联的 Skill IDs
  mcps: string[]; // 关联的 MCP IDs
  agents: string[]; // 关联的 Agent IDs
  projectPath?: string; // 项目级环境的项目路径
}

// 收藏夹集合
interface Collection {
  id: string;
  name: string;
  description?: string;
  skills: Skill[];
  mcps: MCP[];
  agents: Agent[];
  environments: TaskEnvironment[];
  createdAt: string;
  updatedAt: string;
}

// 应用范围
interface ApplyScope {
  type: 'global' | 'project';
  projectPath?: string; // 项目级环境的项目路径
  targetTools: string[]; // 目标工具列表
}

// 应用记录
interface ApplyRecord {
  id: string;
  collectionId: string;
  scope: ApplyScope;
  appliedAt: string;
  status: 'success' | 'failed';
  error?: string;
}
```

### 6.2 数据库表结构（SQLite）

```sql
-- Skills 表
CREATE TABLE skills (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  version TEXT,
  author TEXT,
  tags TEXT, -- JSON array
  category TEXT,
  rating REAL,
  downloads INTEGER,
  updated_at TEXT,
  created_at TEXT,
  official INTEGER,
  source TEXT,
  source_url TEXT,
  integrity TEXT,
  file_path TEXT NOT NULL,
  supported_systems TEXT, -- JSON array
  supported_ides TEXT, -- JSON array
  supported_protocols TEXT, -- JSON array
  requires TEXT -- JSON object
);

-- MCP 表
CREATE TABLE mcps (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  version TEXT,
  author TEXT,
  tags TEXT, -- JSON array
  category TEXT,
  rating REAL,
  downloads INTEGER,
  updated_at TEXT,
  created_at TEXT,
  official INTEGER,
  source TEXT,
  source_url TEXT,
  config_path TEXT NOT NULL,
  command TEXT NOT NULL,
  args TEXT, -- JSON array
  env TEXT, -- JSON object
  supported_systems TEXT, -- JSON array
  supported_ides TEXT, -- JSON array
  tools TEXT -- JSON array
);

-- Agents 表
CREATE TABLE agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  version TEXT,
  author TEXT,
  tags TEXT, -- JSON array
  category TEXT,
  rating REAL,
  downloads INTEGER,
  updated_at TEXT,
  created_at TEXT,
  official INTEGER,
  source TEXT,
  source_url TEXT,
  config_path TEXT NOT NULL,
  supported_systems TEXT, -- JSON array
  supported_ides TEXT, -- JSON array
  skills TEXT, -- JSON array
  mcps TEXT -- JSON array
);

-- 任务环境表
CREATE TABLE environments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  version TEXT,
  author TEXT,
  tags TEXT, -- JSON array
  category TEXT,
  rating REAL,
  downloads INTEGER,
  updated_at TEXT,
  created_at TEXT,
  official INTEGER,
  source TEXT,
  source_url TEXT,
  config_path TEXT NOT NULL,
  skills TEXT, -- JSON array
  mcps TEXT, -- JSON array
  agents TEXT, -- JSON array,
  project_path TEXT
);

-- 收藏夹表
CREATE TABLE collections (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  skills TEXT, -- JSON array
  mcps TEXT, -- JSON array
  agents TEXT, -- JSON array
  environments TEXT, -- JSON array
  created_at TEXT,
  updated_at TEXT
);

-- 应用记录表
CREATE TABLE apply_records (
  id TEXT PRIMARY KEY,
  collection_id TEXT,
  scope_type TEXT, -- 'global' or 'project'
  project_path TEXT,
  target_tools TEXT, -- JSON array
  applied_at TEXT,
  status TEXT, -- 'success' or 'failed'
  error TEXT,
  FOREIGN KEY (collection_id) REFERENCES collections(id)
);
```

---

## 七、一键应用完整流程

### 7.1 流程图

```
┌─────────────────────────────────────────────────────────────────┐
│  用户点击"一键应用"按钮                                     │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│  选择应用范围                                               │
│  ○ 全局（系统级）                                         │
│  ● 项目级（需要选择项目目录）                                 │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
              ┌────────────────┐
              │  选择项目目录？  │
              └──────┬────────┘
                     │
          ┌──────────┴──────────┐
          │ 是                  │ 否
          ▼                     ▼
┌──────────────────┐  ┌──────────────────┐
│  文件选择对话框    │  │  跳过此步骤       │
│  选择项目目录      │  └────────┬─────────┘
└────────┬─────────┘           │
         │                     │
         └──────────┬──────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│  选择目标工具                                               │
│  ☑ Claude Code  ☑ Cursor  ☑ Codex  ☐ OpenCode          │
│  ☑ OpenClaw    ☑ Gemini CLI ...                           │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│  确认应用                                                   │
│  即将应用 [收藏夹名称] 到 [全局/项目级]                    │
│  目标工具：[Claude Code, Cursor, Codex, ...]               │
│  [取消] [确认]                                             │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│  开始应用                                                   │
│  • 正在应用 Skills...                                      │
│  • 正在应用 MCP...                                         │
│  • 正在应用 Agents...                                       │
│  • 正在应用 任务环境...                                     │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│  应用完成                                                   │
│  ✓ 成功应用 12 个 Skills                                   │
│  ✓ 成功应用 8 个 MCP                                       │
│  ✓ 成功应用 5 个 Agents                                     │
│  ✓ 成功应用 3 个 任务环境                                    │
│  [查看详情] [关闭]                                           │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 应用逻辑

```typescript
// 应用收藏夹到指定范围
async function applyCollection(
  collection: Collection,
  scope: ApplyScope
): Promise<ApplyResult> {
  const results: ApplyResult = {
    skills: { success: 0, failed: 0, errors: [] },
    mcps: { success: 0, failed: 0, errors: [] },
    agents: { success: 0, failed: 0, errors: [] },
    environments: { success: 0, failed: 0, errors: [] },
  };

  // 应用 Skills
  for (const skill of collection.skills) {
    try {
      await applySkill(skill, scope);
      results.skills.success++;
    } catch (error) {
      results.skills.failed++;
      results.skills.errors.push({ skill: skill.name, error: error.message });
    }
  }

  // 应用 MCPs
  for (const mcp of collection.mcps) {
    try {
      await applyMCP(mcp, scope);
      results.mcps.success++;
    } catch (error) {
      results.mcps.failed++;
      results.mcps.errors.push({ mcp: mcp.name, error: error.message });
    }
  }

  // 应用 Agents
  for (const agent of collection.agents) {
    try {
      await applyAgent(agent, scope);
      results.agents.success++;
    } catch (error) {
      results.agents.failed++;
      results.agents.errors.push({ agent: agent.name, error: error.message });
    }
  }

  // 应用 任务环境
  for (const env of collection.environments) {
    try {
      await applyEnvironment(env, scope);
      results.environments.success++;
    } catch (error) {
      results.environments.failed++;
      results.environments.errors.push({ env: env.name, error: error.message });
    }
  }

  // 记录应用记录
  await recordApplyResult(collection.id, scope, results);

  return results;
}

// 应用单个 Skill
async function applySkill(skill: Skill, scope: ApplyScope): Promise<void> {
  const syncMode = getSyncMode(); // 'symlink' or 'copy'
  
  for (const tool of scope.targetTools) {
    const toolConfig = TOOL_CONFIGS.find(t => t.key === tool);
    if (!toolConfig) continue;

    const targetDir = getSkillsDir(toolConfig);
    const sourcePath = skill.filePath;
    const targetPath = path.join(targetDir, skill.name);

    if (syncMode === 'symlink') {
      await createSymlink(sourcePath, targetPath);
    } else {
      await copyDirectory(sourcePath, targetPath);
    }
  }
}

// 应用单个 MCP
async function applyMCP(mcp: MCP, scope: ApplyScope): Promise<void> {
  for (const tool of scope.targetTools) {
    const toolConfig = TOOL_CONFIGS.find(t => t.key === tool);
    if (!toolConfig) continue;

    const mcpConfigPath = getMCPConfigPath(toolConfig);
    const mcpConfig = await readMCPConfig(mcpConfigPath);
    
    mcpConfig.mcpServers[mcp.name] = {
      command: mcp.command,
      args: mcp.args,
      env: mcp.env,
    };
    
    await writeMCPConfig(mcpConfigPath, mcpConfig);
  }
}
```

---

## 八、自动更新机制

### 8.1 更新检测逻辑

```typescript
// 检查更新
async function checkUpdates(): Promise<UpdateInfo[]> {
  const updates: UpdateInfo[] = [];
  
  // 检查 Skills 更新
  for (const skill of installedSkills) {
    if (skill.source === 'clawhub' || skill.source === 'skills.sh') {
      const latest = await fetchLatestVersion(skill.sourceUrl);
      if (latest.version !== skill.version) {
        updates.push({
          type: 'skill',
          id: skill.id,
          name: skill.name,
          currentVersion: skill.version,
          latestVersion: latest.version,
          releaseNotes: latest.releaseNotes,
        });
      }
    }
  }

  // 检查 MCPs 更新
  for (const mcp of installedMCPs) {
    if (mcp.source === 'clawhub' || mcp.source === 'skills.sh') {
      const latest = await fetchLatestVersion(mcp.sourceUrl);
      if (latest.version !== mcp.version) {
        updates.push({
          type: 'mcp',
          id: mcp.id,
          name: mcp.name,
          currentVersion: mcp.version,
          latestVersion: latest.version,
          releaseNotes: latest.releaseNotes,
        });
      }
    }
  }

  return updates;
}

// 自动更新（定时任务）
function startAutoUpdateScheduler(): void {
  // 每天检查一次
  setInterval(async () => {
    const updates = await checkUpdates();
    if (updates.length > 0) {
      showUpdateNotification(updates);
    }
  }, 24 * 60 * 60 * 1000); // 24小时
}
```

### 8.2 更新流程

```
┌─────────────────────────────────────────────────────────────────┐
│  检测到更新                                                 │
│  • pdf (v2.1.0 → v2.2.0)                                  │
│  • fetch-mcp (v1.2.0 → v1.3.0)                              │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│  更新通知                                                   │
│  发现 2 个可用更新                                           │
│  [立即更新] [稍后提醒] [忽略]                                │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│  开始更新                                                   │
│  • 正在下载 pdf v2.2.0...                                 │
│  • 正在下载 fetch-mcp v1.3.0...                             │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│  更新完成                                                   │
│  ✓ 成功更新 2 个项目                                        │
│  [查看详情] [关闭]                                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 九、君子订阅会员体系

### 9.1 订阅计划

| 计划 | 价格 | 特权 |
|---|---|---|
| **免费版** | ¥0/月 | 基础功能、公开Skills/MCP、单IDE支持 |
| **基础版** | ¥29/月 | 聚合搜索、多IDE协同、私有Skills/MCP（10个）、公众号一键开发 |
| **专业版** | ¥99/月 | 所有基础版特权、无限私有Skills/MCP、优先支持、AI推荐增强 |
| **企业版** | ¥299/月 | 所有专业版特权、团队协作、API访问、专属客服 |

### 9.2 AID代币系统

```typescript
// AID代币类型
interface AIDToken {
  id: string;
  userId: string;
  amount: number;
  type: 'earned' | 'purchased' | 'redeemed';
  source?: string; // 来源：订阅、活动、推荐等
  createdAt: string;
  expiresAt?: string;
}

// 代币使用场景
enum TokenUsage {
  DOWNLOAD_PRIVATE_SKILL = 10,    // 下载私有Skill
  DOWNLOAD_PRIVATE_MCP = 10,       // 下载私有MCP
  AI_RECOMMENDATION = 5,          // AI推荐
  PRIORITY_SUPPORT = 20,          // 优先支持
  CUSTOM_ENVIRONMENT = 50,        // 自定义任务环境
}

// 代币兑换
async function redeemTokens(userId: string, usage: TokenUsage): Promise<boolean> {
  const user = await getUser(userId);
  const cost = TokenUsage[usage];
  
  if (user.tokens < cost) {
    return false;
  }
  
  user.tokens -= cost;
  await updateUser(user);
  
  // 记录代币使用
  await recordTokenUsage({
    userId,
    amount: cost,
    usage,
    createdAt: new Date().toISOString(),
  });
  
  return true;
}
```

### 9.3 会员特权对比

| 功能 | 免费版 | 基础版 | 专业版 | 企业版 |
|---|---|---|---|---|
| 基础功能 | ✓ | ✓ | ✓ | ✓ |
| 公开Skills/MCP | ✓ | ✓ | ✓ | ✓ |
| 单IDE支持 | ✓ | ✓ | ✓ | ✓ |
| 聚合搜索 | ✗ | ✓ | ✓ | ✓ |
| 多IDE协同 | ✗ | ✓ | ✓ | ✓ |
| 私有Skills/MCP | ✗ | 10个 | 无限 | 无限 |
| 公众号一键开发 | ✗ | ✓ | ✓ | ✓ |
| AI推荐增强 | ✗ | ✗ | ✓ | ✓ |
| 优先支持 | ✗ | ✗ | ✓ | ✓ |
| 团队协作 | ✗ | ✗ | ✗ | ✓ |
| API访问 | ✗ | ✗ | ✗ | ✓ |
| 专属客服 | ✗ | ✗ | ✗ | ✓ |
| AID代币赠送 | 0/月 | 100/月 | 500/月 | 2000/月 |

---

## 十、聚合搜索AI推荐方案

### 10.1 向量语义搜索

```typescript
// 使用 qdrant 作为向量数据库
import { QdrantClient } from '@qdrant/js-client-rest';

const qdrant = new QdrantClient({ url: 'http://localhost:6333' });

// 为 Skill/MCP 生成向量嵌入
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
    }),
  });
  
  const data = await response.json();
  return data.data[0].embedding;
}

// 索引 Skill/MCP
async function indexSkill(skill: Skill): Promise<void> {
  const embedding = await generateEmbedding(
    `${skill.name} ${skill.description} ${skill.tags.join(' ')}`
  );
  
  await qdrant.upsert('skills', {
    points: [{
      id: skill.id,
      vector: embedding,
      payload: skill,
    }],
  });
}

// 语义搜索
async function semanticSearch(query: string, limit: number = 10): Promise<SearchResult[]> {
  const queryEmbedding = await generateEmbedding(query);
  
  const results = await qdrant.search('skills', {
    vector: queryEmbedding,
    limit,
    with_payload: true,
  });
  
  return results.map(result => ({
    id: result.id,
    score: result.score,
    skill: result.payload as Skill,
  }));
}
```

### 10.2 AI推荐算法

```typescript
// 基于用户行为的推荐
async function recommendSkills(userId: string, limit: number = 10): Promise<Skill[]> {
  const user = await getUser(userId);
  
  // 获取用户安装的 Skills
  const installedSkills = await getInstalledSkills(userId);
  
  // 获取用户最近使用的 Skills
  const recentSkills = await getRecentSkills(userId, 30); // 最近30天
  
  // 提取特征
  const categories = recentSkills.map(s => s.category);
  const tags = recentSkills.flatMap(s => s.tags);
  
  // 语义搜索相关 Skills
  const query = `${categories.join(' ')} ${tags.join(' ')}`;
  const searchResults = await semanticSearch(query, limit * 2);
  
  // 过滤已安装的 Skills
  const recommendations = searchResults
    .filter(result => !installedSkills.some(s => s.id === result.id))
    .slice(0, limit);
  
  return recommendations.map(r => r.skill);
}
```

---

## 十一、公众号一键开发流程

### 11.1 流程图

```
┌─────────────────────────────────────────────────────────────────┐
│  用户在公众号发送"一键开发"指令                               │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│  公众号验证用户身份                                           │
│  • 检查用户是否绑定桌面端                                     │
│  • 检查用户是否订阅君子会员                                   │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│  公众号发送开发任务到网页端                                   │
│  POST /api/wechat/one-click-develop                           │
│  {                                                         │
│    userId: "user123",                                       │
│    task: "开发一个React Native应用",                            │
│    preferences: {                                            │
│      framework: "React Native",                               │
│      language: "TypeScript",                                  │
│      ui: "Tailwind CSS",                                     │
│    }                                                        │
│  }                                                          │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│  网页端处理开发任务                                           │
│  • 分析任务需求                                               │
│  • 推荐相关 Skills/MCP/Agent                                 │
│  • 生成开发配置                                               │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│  网页端发送配置到桌面端                                       │
│  Deep Link: aiskills://apply-config?config=...                │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│  桌面端接收配置                                               │
│  • 解析 Deep Link                                          │
│  • 应用推荐的 Skills/MCP/Agent                               │
│  • 创建任务环境                                               │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│  桌面端启动开发环境                                           │
│  • 打开用户指定的IDE                                          │
│  • 加载任务环境                                               │
│  • 准备开始开发                                               │
└─────────────────────────────────────────────────────────────────┘
```

### 11.2 Deep Link 协议

```typescript
// Deep Link URL 格式
aiskills://apply-config?config=<base64_encoded_json>

// 配置结构
interface OneClickDevelopConfig {
  task: string;
  preferences: {
    framework?: string;
    language?: string;
    ui?: string;
  };
  recommendedSkills: string[];
  recommendedMCPs: string[];
  recommendedAgents: string[];
  environment: {
    name: string;
    description: string;
    skills: string[];
    mcps: string[];
    agents: string[];
  };
  targetIDE?: string;
  projectPath?: string;
}

// 解析 Deep Link
function parseDeepLink(url: string): OneClickDevelopConfig {
  const parsed = new URL(url);
  const configBase64 = parsed.searchParams.get('config');
  const configJson = atob(configBase64);
  return JSON.parse(configJson);
}

// 应用配置
async function applyOneClickDevelopConfig(config: OneClickDevelopConfig): Promise<void> {
  // 应用推荐的 Skills
  for (const skillId of config.recommendedSkills) {
    await installSkill(skillId);
  }

  // 应用推荐的 MCPs
  for (const mcpId of config.recommendedMCPs) {
    await installMCP(mcpId);
  }

  // 应用推荐的 Agents
  for (const agentId of config.recommendedAgents) {
    await installAgent(agentId);
  }

  // 创建任务环境
  await createEnvironment(config.environment);

  // 启动 IDE
  if (config.targetIDE && config.projectPath) {
    await openIDE(config.targetIDE, config.projectPath);
  }
}
```

---

## 十二、伴侣插件通信方案

### 12.1 伴侣插件架构

```
┌─────────────────────────────────────────────────────────────────┐
│  桌面端（主应用）                                           │
│  • Tauri Backend (Rust)                                     │
│  • React Frontend                                             │
│  • SQLite Database                                            │
└──────────────────────┬──────────────────────────────────────────┘
                       │ WebSocket
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│  伴侣插件（VS Code / Cursor / JetBrains 等）                     │
│  • Extension API                                              │
│  • WebSocket Client                                           │
│  • UI Components                                             │
└─────────────────────────────────────────────────────────────────┘
```

### 12.2 通信协议

```typescript
// 消息类型
enum MessageType {
  // 客户端 → 服务端
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  GET_SKILLS = 'get_skills',
  GET_MCPS = 'get_mcps',
  GET_AGENTS = 'get_agents',
  GET_ENVIRONMENTS = 'get_environments',
  APPLY_COLLECTION = 'apply_collection',
  
  // 服务端 → 客户端
  SKILLS_UPDATE = 'skills_update',
  MCPS_UPDATE = 'mcps_update',
  AGENTS_UPDATE = 'agents_update',
  ENVIRONMENTS_UPDATE = 'environments_update',
  APPLY_RESULT = 'apply_result',
  ERROR = 'error',
}

// 消息结构
interface Message {
  type: MessageType;
  id: string;
  payload?: any;
  timestamp: string;
}

// WebSocket 服务端（桌面端）
class WebSocketServer {
  private server: WebSocketServer;
  private clients: Map<string, WebSocket> = new Map();

  async start(port: number): Promise<void> {
    this.server = new WebSocketServer({ port });
    
    this.server.on('connection', (ws, req) => {
      const clientId = generateClientId();
      this.clients.set(clientId, ws);
      
      ws.on('message', async (data) => {
        const message: Message = JSON.parse(data.toString());
        await this.handleMessage(clientId, message);
      });
      
      ws.on('close', () => {
        this.clients.delete(clientId);
      });
    });
  }

  private async handleMessage(clientId: string, message: Message): Promise<void> {
    switch (message.type) {
      case MessageType.CONNECT:
        await this.handleConnect(clientId, message.payload);
        break;
      case MessageType.GET_SKILLS:
        await this.handleGetSkills(clientId);
        break;
      case MessageType.APPLY_COLLECTION:
        await this.handleApplyCollection(clientId, message.payload);
        break;
      // ... 其他消息类型
    }
  }

  private async handleGetSkills(clientId: string): Promise<void> {
    const skills = await getAllSkills();
    const ws = this.clients.get(clientId);
    
    ws.send(JSON.stringify({
      type: MessageType.SKILLS_UPDATE,
      id: generateMessageId(),
      payload: skills,
      timestamp: new Date().toISOString(),
    }));
  }
}

// WebSocket 客户端（伴侣插件）
class WebSocketClient {
  private ws: WebSocket;
  private messageHandlers: Map<MessageType, (payload: any) => void> = new Map();

  async connect(url: string): Promise<void> {
    this.ws = new WebSocket(url);
    
    this.ws.onopen = () => {
      this.send({
        type: MessageType.CONNECT,
        id: generateMessageId(),
        payload: { extension: 'vscode', version: '1.0.0' },
        timestamp: new Date().toISOString(),
      });
    };
    
    this.ws.onmessage = (event) => {
      const message: Message = JSON.parse(event.data);
      const handler = this.messageHandlers.get(message.type);
      if (handler) {
        handler(message.payload);
      }
    };
  }

  on<T>(type: MessageType, handler: (payload: T) => void): void {
    this.messageHandlers.set(type, handler);
  }

  send(message: Message): void {
    this.ws.send(JSON.stringify(message));
  }

  async getSkills(): Promise<Skill[]> {
    return new Promise((resolve) => {
      this.on(MessageType.SKILLS_UPDATE, (skills: Skill[]) => {
        resolve(skills);
      });
      
      this.send({
        type: MessageType.GET_SKILLS,
        id: generateMessageId(),
        timestamp: new Date().toISOString(),
      });
    });
  }
}
```

---

## 十三、桌面端完整目录结构

```
aiskills-desktop/
├── src/                          # 源代码
│   ├── main/                      # Rust 后端（Tauri）
│   │   ├── commands/              # Tauri 命令
│   │   │   ├── skill.rs          # Skills 管理命令
│   │   │   ├── mcp.rs           # MCP 管理命令
│   │   │   ├── agent.rs         # Agent 管理命令
│   │   │   ├── environment.rs    # 环境管理命令
│   │   │   ├── collection.rs     # 收藏夹管理命令
│   │   │   ├── sync.rs         # 同步命令
│   │   │   ├── update.rs        # 更新命令
│   │   │   ├── search.rs       # 搜索命令
│   │   │   ├── recommendation.rs # 推荐命令
│   │   │   ├── deeplink.rs     # Deep Link 处理
│   │   │   ├── websocket.rs    # WebSocket 服务
│   │   │   └── wechat.rs       # 公众号集成
│   │   ├── services/            # 业务逻辑服务
│   │   │   ├── skill_service.rs
│   │   │   ├── mcp_service.rs
│   │   │   ├── agent_service.rs
│   │   │   ├── environment_service.rs
│   │   │   ├── collection_service.rs
│   │   │   ├── sync_service.rs
│   │   │   ├── update_service.rs
│   │   │   ├── search_service.rs
│   │   │   ├── recommendation_service.rs
│   │   │   └── embedding_service.rs
│   │   ├── database/             # 数据库
│   │   │   ├── schema.rs        # 数据库模型
│   │   │   ├── migration.rs     # 数据库迁移
│   │   │   └── dao.rs          # 数据访问层
│   │   ├── utils/               # 工具函数
│   │   │   ├── file_utils.rs
│   │   │   ├── path_utils.rs
│   │   │   └── network_utils.rs
│   │   ├── config.rs             # 配置管理
│   │   ├── error.rs             # 错误处理
│   │   ├── lib.rs               # 库入口
│   │   └── main.rs              # 主入口
│   │
│   ├── renderer/                 # React 前端
│   │   ├── pages/               # 页面
│   │   │   ├── Home.tsx         # 首页
│   │   │   ├── Marketplace.tsx  # 商城
│   │   │   ├── Settings.tsx     # 设置
│   │   │   ├── SkillDetail.tsx  # Skill 详情
│   │   │   ├── MCPDetail.tsx    # MCP 详情
│   │   │   ├── AgentDetail.tsx  # Agent 详情
│   │   │   └── EnvironmentDetail.tsx # 环境详情
│   │   ├── components/          # 组件
│   │   │   ├── ui/             # 基础 UI 组件
│   │   │   ├── layout/         # 布局组件
│   │   │   ├── collection/      # 收藏夹组件
│   │   │   ├── skill/          # Skill 组件
│   │   │   ├── mcp/            # MCP 组件
│   │   │   ├── agent/          # Agent 组件
│   │   │   └── environment/    # 环境组件
│   │   ├── hooks/               # 自定义 Hooks
│   │   │   ├── useSkills.ts
│   │   │   ├── useMCPs.ts
│   │   │   ├── useAgents.ts
│   │   │   ├── useEnvironments.ts
│   │   │   ├── useCollections.ts
│   │   │   ├── useSearch.ts
│   │   │   ├── useRecommendations.ts
│   │   │   └── useWebSocket.ts
│   │   ├── stores/              # Zustand 状态管理
│   │   │   ├── skillStore.ts
│   │   │   ├── mcpStore.ts
│   │   │   ├── agentStore.ts
│   │   │   ├── environmentStore.ts
│   │   │   ├── collectionStore.ts
│   │   │   └── settingsStore.ts
│   │   ├── lib/                 # 工具库
│   │   │   ├── api/            # API 调用
│   │   │   ├── utils/          # 工具函数
│   │   │   └── constants/      # 常量
│   │   ├── types/               # TypeScript 类型
│   │   │   ├── skill.ts
│   │   │   ├── mcp.ts
│   │   │   ├── agent.ts
│   │   │   ├── environment.ts
│   │   │   └── collection.ts
│   │   ├── i18n/                # 国际化
│   │   │   ├── locales/
│   │   │   │   ├── zh.json
│   │   │   │   ├── en.json
│   │   │   │   └── ja.json
│   │   │   └── index.ts
│   │   ├── App.tsx              # 根组件
│   │   ├── main.tsx             # 入口
│   │   └── vite-env.d.ts        # Vite 类型声明
│   │
│   └── shared/                  # 前后端共享代码
│       ├── types/               # 共享类型
│       │   ├── skill.ts
│       │   ├── mcp.ts
│       │   ├── agent.ts
│       │   ├── environment.ts
│       │   └── collection.ts
│       └── constants/           # 共享常量
│           ├── tools.ts         # 工具配置
│           └── paths.ts        # 路径配置
│
├── public/                      # 静态资源
│   ├── icons/                  # 图标
│   └── images/                 # 图片
│
├── src-tauri/                   # Tauri 配置
│   ├── icons/                   # 应用图标
│   ├── Cargo.toml               # Rust 依赖
│   ├── tauri.conf.json         # Tauri 配置
│   └── build.rs                # 构建脚本
│
├── tests/                       # 测试
│   ├── unit/                    # 单元测试
│   ├── integration/             # 集成测试
│   └── e2e/                    # 端到端测试
│
├── .gitignore                   # Git 忽略
├── .node-version               # Node 版本
├── package.json                # Node 依赖
├── pnpm-lock.yaml             # pnpm 锁文件
├── tsconfig.json              # TypeScript 配置
├── vite.config.ts             # Vite 配置
├── tailwind.config.ts         # Tailwind 配置
└── README.md                 # 项目说明
```

---

## 十四、四阶段开发优先级

### 14.1 第一阶段（MVP - 4周）

| 优先级 | 功能 | 说明 |
|---|---|---|
| P0 | 基础架构 | Tauri + React + SQLite 搭建 |
| P0 | 首页 | 四大收藏夹展示、快捷搜索 |
| P0 | 商城 | Skills/MCP 浏览、搜索、安装 |
| P0 | 设置 | 通用设置、工具检测、同步策略 |
| P0 | Skills 管理 | 安装、卸载、更新、收藏 |
| P0 | MCP 管理 | 配置、启用/禁用、收藏 |
| P0 | 一键应用 | 全局应用、项目级应用 |
| P0 | 符号链接同步 | symlink/junction 模式 |
| P1 | 自动更新 | 定时检查更新、更新通知 |
| P1 | Deep Link | `aiskills://` 协议支持 |

### 14.2 第二阶段（核心功能 - 6周）

| 优先级 | 功能 | 说明 |
|---|---|---|
| P0 | Agent 管理 | Agent 安装、配置、收藏 |
| P0 | 任务环境 | 环境创建、编辑、应用、收藏 |
| P0 | 收藏夹系统 | Skills/MCP/Agent/环境收藏管理 |
| P0 | 平台联动 | 官网命令接收、配置同步 |
| P1 | 向量搜索 | 语义搜索、智能推荐 |
| P1 | 健康检查 | Skills/MCP 可用性检测 |
| P1 | 多 IDE 支持 | 30+ 工具路径检测和配置 |
| P1 | 备份恢复 | 配置备份、历史版本管理 |
| P2 | 用量统计 | Token 消耗、使用频率统计 |

### 14.3 第三阶段（高级功能 - 4周）

| 优先级 | 功能 | 说明 |
|---|---|---|
| P0 | 君子订阅 | 会员体系、付费功能 |
| P0 | 聚合搜索 | AI 语义搜索、智能推荐 |
| P0 | 公众号联动 | 微信扫码触发、一键开发 |
| P1 | 伴侣插件 | VS Code/Cursor 插件通信 |
| P1 | 多语言支持 | 中文/英文/日文 |
| P1 | 主题切换 | 暗黑/亮色/系统主题 |
| P2 | WebDAV 同步 | 跨设备配置同步 |
| P2 | 团队协作 | 团队共享配置、权限管理 |

### 14.4 第四阶段（优化和扩展 - 4周）

| 优先级 | 功能 | 说明 |
|---|---|---|
| P1 | 性能优化 | 启动速度、内存占用优化 |
| P1 | 稳定性优化 | 错误处理、异常恢复 |
| P1 | 用户体验优化 | 交互细节、动画效果 |
| P2 | 高级推荐算法 | 协同过滤、深度学习推荐 |
| P2 | 企业功能 | SSO、审计日志、私有部署 |
| P2 | 生态系统 | 开发者文档、插件市场 |

---

## 十五、与网页端联动设计

### 15.1 数据同步机制

| 同步方向 | 触发条件 | 同步内容 | 冲突解决 |
|---|---|---|---|
| 网页端 → 桌面端 | 用户点击"推送到桌面" | 收藏夹、任务环境 | 以网页端为准 |
| 桌面端 → 网页端 | 手动同步或定时同步 | 收藏夹、使用统计 | 以桌面端为准 |
| 双向同步 | 配置变更时 | 设置项、偏好配置 | 时间戳优先 |

### 15.2 联动场景

**场景一：网页收藏推送到桌面**
```
1. 用户在网页端浏览 Skills/MCP
2. 点击"添加到桌面收藏"
3. 网页端发送推送请求到后端
4. 后端通知桌面端（WebSocket/推送）
5. 桌面端接收通知，同步数据
6. 桌面端显示新收藏提醒
```

**场景二：桌面应用推送到网页**
```
1. 用户在桌面端创建任务环境
2. 点击"同步到网页端"
3. 桌面端上传配置到后端
4. 网页端显示新环境
5. 用户可在网页端查看和编辑
```

**场景三：公众号一键开发**
```
1. 用户在公众号发送"一键开发"
2. 公众号验证用户身份和会员状态
3. 生成开发配置和推荐 Skills/MCP
4. 通过 Deep Link 发送到桌面端
5. 桌面端自动应用配置
6. 打开 IDE 准备开发
```

### 15.3 API 接口设计

```typescript
// 网页端 API
interface WebAPI {
  // 推送收藏到桌面端
  POST /api/desktop/push-collection
  {
    userId: string;
    collectionType: 'skill' | 'mcp' | 'agent' | 'environment';
    items: CollectionItem[];
  }

  // 获取桌面端同步状态
  GET /api/desktop/sync-status?userId=xxx

  // 接收桌面端配置
  POST /api/desktop/receive-config
  {
    userId: string;
    config: DesktopConfig;
  }
}

// 桌面端 API（本地服务）
interface DesktopAPI {
  // 接收网页端推送
  POST /local/receive-push
  {
    collectionType: string;
    items: CollectionItem[];
  }

  // 发送配置到网页端
  POST /local/send-config
  {
    config: DesktopConfig;
  }

  // 获取本地收藏夹
  GET /local/collections
}
```

---

## 十六、配置文件路径表

### 16.1 各 IDE/工具配置路径

| 工具 | Windows 路径 | macOS 路径 | Linux 路径 |
|---|---|---|---|
| **Claude Code** | `%APPDATA%\Claude\` | `~/.claude/` | `~/.claude/` |
| **Claude Desktop** | `%APPDATA%\Claude\` | `~/Library/Application Support/Claude/` | `~/.config/Claude/` |
| **Cursor** | `%APPDATA%\Cursor\` | `~/.cursor/` | `~/.cursor/` |
| **VS Code** | `%APPDATA%\Code\` | `~/Library/Application Support/Code/` | `~/.config/Code/` |
| **Windsurf** | `%APPDATA%\Windsurf\` | `~/.windsurf/` | `~/.windsurf/` |
| **Codex** | `%APPDATA%\Codex\` | `~/.codex/` | `~/.codex/` |
| **Gemini CLI** | `%APPDATA%\Gemini\` | `~/.gemini/` | `~/.gemini/` |
| **OpenCode** | `%APPDATA%\OpenCode\` | `~/.opencode/` | `~/.opencode/` |
| **OpenClaw** | `%APPDATA%\OpenClaw\` | `~/.openclaw/` | `~/.openclaw/` |
| **Trae** | `%APPDATA%\Trae\` | `~/.trae/` | `~/.trae/` |
| **JetBrains** | `%APPDATA%\JetBrains\` | `~/Library/Application Support/JetBrains/` | `~/.config/JetBrains/` |
| **Neovim** | - | `~/.config/nvim/` | `~/.config/nvim/` |

### 16.2 配置文件结构

```typescript
// Skills 配置（以 Claude Code 为例）
interface ClaudeSkillsConfig {
  skills: {
    name: string;
    source: string;  // Git URL 或本地路径
    version?: string;
    enabled: boolean;
  }[];
}

// MCP 配置（servers.json）
interface MCPServersConfig {
  mcpServers: {
    [name: string]: {
      command: string;
      args: string[];
      env?: Record<string, string>;
      disabled?: boolean;
    };
  };
}

// Agent 配置
interface AgentConfig {
  agents: {
    id: string;
    name: string;
    description: string;
    systemPrompt: string;
    allowedSkills: string[];
    allowedMCPs: string[];
  }[];
}
```

---

## 十七、安全设计

### 17.1 数据安全

| 安全措施 | 说明 |
|---|---|
| 本地存储 | 所有配置数据本地存储，不上传云端 |
| API Key 加密 | 使用系统密钥链存储 API Key |
| 配置文件权限 | 设置配置文件为只读，防止意外修改 |
| 备份加密 | 备份文件可选加密存储 |

### 17.2 网络安全

| 安全措施 | 说明 |
|---|---|
| HTTPS 通信 | 所有网络请求使用 HTTPS |
| 证书校验 | 校验服务器证书，防止中间人攻击 |
| 请求签名 | 敏感操作使用请求签名验证 |
| 限流保护 | API 请求限流，防止滥用 |

### 17.3 应用安全

| 安全措施 | 说明 |
|---|---|
| 代码签名 | Windows/macOS 应用代码签名 |
| 自动更新验证 | 验证更新包签名，防止篡改 |
| 沙箱运行 | Tauri 默认沙箱，限制权限 |
| 输入验证 | 所有用户输入严格验证 |

---

## 十八、性能指标

### 18.1 启动性能

| 指标 | 目标值 | 说明 |
|---|---|---|
| 冷启动时间 | < 2s | 首次启动 |
| 热启动时间 | < 1s | 后台恢复 |
| 内存占用 | < 150MB | 运行时内存 |
| 安装包大小 | < 50MB | 压缩后 |

### 18.2 操作性能

| 指标 | 目标值 | 说明 |
|---|---|---|
| 页面切换 | < 200ms | 路由切换 |
| 搜索响应 | < 100ms | 本地搜索 |
| 语义搜索 | < 500ms | 向量搜索 |
| 应用配置 | < 3s | 一键应用 |
| 同步数据 | < 5s | 全量同步 |

### 18.3 稳定性指标

| 指标 | 目标值 | 说明 |
|---|---|---|
| 崩溃率 | < 0.1% | 日活跃用户 |
| 错误率 | < 1% | API 请求 |
| 更新成功率 | > 99% | 自动更新 |

---

## 十九、总结

### 19.1 核心差异化优势

| 竞品 | 我们的优势 |
|---|---|
| cc-switch | + 商城 + 君子订阅 + AI 推荐 + 任务环境 + 公众号联动 |
| skills-hub | + 会员体系 + 代币激励 + 伴侣插件 + 平台联动 |
| mcp-router | + Skills 管理 + Agent 收藏 + 智能推荐 + 付费功能 |
| mcphub | + 桌面端 + 公众号 + 伴侣插件 + 多 IDE 协同 |

### 19.2 技术选型总结

| 层级 | 选型 | 理由 |
|---|---|---|
| 桌面框架 | Tauri 2 | 体积小、性能好、安全性高 |
| 前端 | React + TypeScript | 生态成熟、类型安全 |
| 后端 | Rust | 性能优异、内存安全 |
| 存储 | SQLite | 零配置、易同步 |
| 搜索 | FlexSearch + Qdrant | 本地全文 + 向量语义 |

### 19.3 下一步行动

1. **立即执行**：搭建 Tauri + React 基础架构
2. **第 1 周**：完成首页和商城基础功能
3. **第 2 周**：实现 Skills/MCP 管理和一键应用
4. **第 3-4 周**：完善收藏夹系统和自动更新
5. **第 5-8 周**：开发 Agent 管理和任务环境
6. **第 9-12 周**：实现君子订阅和高级功能
7. **第 13-16 周**：优化性能、测试、发布

---

> **文档版本**: v1.1
> **最后更新**: 2026-03-26

---

## 二十、Skills双协议标准与配置路径完整参考

> 详细路径参考：`.example/config-paths-reference.md`

### 20.1 Skills双协议对比

| 维度 | Anthropic SKILL.md协议 | OpenAI/通用 AGENTS.md协议 |
|---|---|---|
| **核心文件** | 每个Skill一个独立目录（含`SKILL.md`）| 所有Skills汇总写入`AGENTS.md`单文件 |
| **发现方式** | Agent扫描`skills/`目录，读取frontmatter | Agent读取`AGENTS.md`的`<available_skills>` XML块 |
| **加载方式** | **渐进式**：按需加载Skill全文 | **全量**：启动时全部注入Context |
| **Context效率** | 高（只加载需要的Skill）| 低（Skills越多越臃肿）|
| **适用Agent** | Claude Code、OpenCode、Cursor、Windsurf | Codex、通用Agent（任何能读Markdown的工具）|
| **SKILL.md格式** | frontmatter（name+description）+ 正文 | 不需要SKILL.md，直接在AGENTS.md写XML |

### 20.2 SKILL.md 标准格式（Anthropic协议）

```markdown
---
name: skill-name
description: 一句话描述，供Agent判断是否加载（保持简洁，<200字符）
---

# Skill标题

## 触发条件
当用户请求XXX时使用此Skill。

## 执行步骤
1. 步骤一
2. 步骤二
```

### 20.3 AGENTS.md 标准格式（OpenAI/通用协议）

```xml
<!-- AGENTS.md 中的 available_skills 块 -->
<skills_system priority="1">
  <available_skills>
    <skill>
      <name>pdf</name>
      <description>Comprehensive PDF toolkit...</description>
      <location>global</location>  <!-- project | global -->
    </skill>
  </available_skills>
</skills_system>
```

### 20.4 Aidean Desktop双协议兼容实现

```
安装一个Skill → 自动处理双协议：

① 中心仓库存储
   ~/.aidean/skills/my-skill/SKILL.md

② 同步到Anthropic协议路径（symlink/copy）
   ~/.claude/skills/my-skill/       ← Claude Code
   ~/.cursor/skills/my-skill/  [CP] ← Cursor（强制copy）
   ~/.codeium/windsurf/skills/my-skill/ ← Windsurf
   ~/.config/opencode/skills/my-skill/  ← OpenCode
   ~/.trae/skills/my-skill/         ← Trae

③ 同步到通用路径（openskills兼容）
   ~/.agent/skills/my-skill/        ← 通用Agent路径

④ 可选：更新项目AGENTS.md（OpenAI协议）
   ./AGENTS.md 的 <available_skills> 块

[CP] = Cursor强制使用copy，不支持symlink发现Skills
```

### 20.5 MCP配置文件路径速查

| IDE/工具 | macOS/Linux | Windows | 格式 |
|---|---|---|---|
| **Claude Desktop** | `~/Library/Application Support/Claude/claude_desktop_config.json` | `%APPDATA%\Claude\claude_desktop_config.json` | JSON |
| **Claude Code** | `~/.claude.json` | `%USERPROFILE%\.claude.json` | JSON |
| **Cursor** | `~/.cursor/mcp.json` | `%USERPROFILE%\.cursor\mcp.json` | JSON |
| **Windsurf** | `~/.codeium/windsurf/mcp_config.json` | `%USERPROFILE%\.codeium\windsurf\mcp_config.json` | JSON |
| **OpenCode** | `~/.config/opencode/config.json`（mcp字段）| `%APPDATA%\opencode\config.json` | JSON嵌套 |
| **Codex** | `~/.codex/config.json` | `%USERPROFILE%\.codex\config.json` | JSON |
| **Zed** | `~/.config/zed/settings.json`（context_servers字段）| `%APPDATA%\Zed\settings.json` | JSON嵌套 |

### 20.6 Agent文件路径速查

| IDE/工具 | macOS/Linux全局 | Windows全局 | 项目级 |
|---|---|---|---|
| **Claude Code** | `~/.claude/agents/` | `%USERPROFILE%\.claude\agents\` | `./.claude/agents/` |
| **OpenCode** | `~/.config/opencode/agents/` | `%APPDATA%\opencode\agents\` | - |
| **Cursor** | `~/.cursor/rules/` | `%USERPROFILE%\.cursor\rules\` | `./.cursor/rules/` |
| **Windsurf** | `~/.codeium/windsurf/rules/` | `%USERPROFILE%\.codeium\windsurf\rules\` | `./.windsurfrules` |

### 20.7 Rules / CLAUDE.md 路径速查

| 工具 | macOS/Linux | Windows | 说明 |
|---|---|---|---|
| **Claude Code全局** | `~/.claude/CLAUDE.md` | `%USERPROFILE%\.claude\CLAUDE.md` | 全局系统提示 |
| **Claude Code项目** | `{workspace}/CLAUDE.md` | 同左 | 项目级系统提示 |
| **Cursor全局** | `~/.cursor/rules/` | `%USERPROFILE%\.cursor\rules\` | `.mdc`文件 |
| **Windsurf全局** | `~/.codeium/windsurf/memories/global_rules.md` | `%USERPROFILE%\.codeium\windsurf\memories\global_rules.md` | |
| **OpenCode全局** | `~/.config/opencode/AGENTS.md` | `%APPDATA%\opencode\AGENTS.md` | |
| **通用项目** | `{workspace}/AGENTS.md` | 同左 | OpenAI生态标准 |
> **状态**: 完整设计方案，待开发