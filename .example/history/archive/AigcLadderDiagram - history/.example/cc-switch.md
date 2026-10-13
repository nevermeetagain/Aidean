# cc-switch 竞品深度分析报告

> 来源：https://github.com/farion1231/cc-switch
> 分析日期：2026-03-26
> 当前版本：v3.12.3 | ⭐ 33.7k Stars | 35次发布 | 2k Forks

---

## 一、架构设计

### 1.1 技术栈

| 层级 | 技术 | 版本 | 说明 |
|---|---|---|---|
| **桌面框架** | Tauri 2 | ^2.8.0 | Rust后端 + WebView前端 |
| **前端语言** | TypeScript | ^5.3.0 | 严格类型检查 |
| **前端框架** | React | ^18.2.0 | 函数式组件 |
| **构建工具** | Vite | ^7.3.0 | 极速HMR开发体验 |
| **样式** | Tailwind CSS | ^3.4.17 | 原子化CSS |
| **UI组件库** | Radix UI | 全套 | 无障碍基础组件 |
| **数据请求** | TanStack Query | ^5.90.3 | 服务端状态管理 |
| **表单** | react-hook-form + zod | ^7/^4 | 表单验证 |
| **动画** | Framer Motion | ^12.23.25 | 流畅过渡动画 |
| **代码编辑器** | CodeMirror 6 | ^6.0.2 | JSON/JS/Markdown编辑 |
| **图表** | Recharts | ^3.5.1 | 用量统计图表 |
| **搜索** | FlexSearch | ^0.8.212 | 本地全文搜索 |
| **拖拽** | dnd-kit | ^6/^10 | 列表排序拖拽 |
| **国际化** | i18next + react-i18next | ^25/^16 | zh/en/ja 三语言 |
| **Toast通知** | Sonner | ^2.0.7 | 优雅通知 |
| **TOML解析** | smol-toml | ^1.4.2 | 配置文件解析 |
| **后端语言** | Rust | - | 51.3%代码量 |
| **本地存储** | SQLite (via Tauri) | - | 数据持久化 |
| **Tauri插件** | store/updater/dialog/process | ^2.x | 平台能力 |

### 1.2 代码占比

```
Rust       51.3%   ← 核心业务逻辑、配置文件读写、代理服务
TypeScript 45.7%   ← UI层、交互逻辑、API调用
HTML        2.4%   ← 入口文件
Other       0.6%
```

### 1.3 整体架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                      前端（React + TypeScript）                   │
│                                                                  │
│  ┌──────────┐ ┌─────────┐ ┌──────────┐ ┌───────────┐          │
│  │ Providers│ │   MCP   │ │  Skills  │ │ Sessions  │          │
│  │  管理    │ │  管理   │ │  管理    │ │  会话管理  │          │
│  └──────────┘ └─────────┘ └──────────┘ └───────────┘          │
│  ┌──────────┐ ┌─────────┐ ┌──────────┐ ┌───────────┐          │
│  │ Workspace│ │  Proxy  │ │  Usage   │ │ Settings  │          │
│  │  工作区  │ │  代理   │ │  用量    │ │   设置    │          │
│  └──────────┘ └─────────┘ └──────────┘ └───────────┘          │
│                TanStack Query ← → Tauri Commands                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │ Tauri IPC（类型安全）
┌──────────────────────────▼──────────────────────────────────────┐
│                      后端（Rust）                                 │
│                                                                  │
│  commands/（25个命令模块）                                        │
│  ├── provider.rs   ├── mcp.rs      ├── skill.rs                 │
│  ├── session_manager.rs           ├── proxy.rs                  │
│  ├── webdav_sync.rs               ├── deeplink.rs               │
│  ├── auth.rs（Copilot OAuth）      ├── usage.rs                  │
│  └── workspace.rs                 └── ...                       │
│                                                                  │
│  services/（17个服务模块）                                        │
│  ├── provider/     ├── mcp.rs      ├── skill.rs                 │
│  ├── proxy.rs      ├── webdav_sync ├── usage_stats.rs           │
│  └── stream_check.rs              └── ...                       │
│                                                                  │
│  database/（SQLite）                                             │
│  ├── schema.rs     ├── migration.rs ├── backup.rs               │
│  └── dao/（数据访问层）                                           │
└──────────────────────────┬──────────────────────────────────────┘
                           │ 文件系统操作
┌──────────────────────────▼──────────────────────────────────────┐
│               本地配置文件（各AI工具配置目录）                    │
│  Claude Code  Codex  Gemini CLI  OpenCode  OpenClaw             │
└─────────────────────────────────────────────────────────────────┘
```

### 1.4 数据库架构（SQLite）

```rust
// database/schema.rs 核心表（推断）
- providers          // AI提供商配置
- provider_health    // 提供商健康状态
- mcp_servers        // MCP服务器配置
- skills             // Skills记录
- skill_backups      // Skills备份（最多20条）
- sessions           // 会话记录缓存
- workspaces         // 工作区配置
- settings           // 全局设置
- usage_stats        // 用量统计
- webdav_sync_state  // WebDAV同步状态
```

---

## 二、核心功能分析

### 2.1 解决的核心问题

cc-switch 解决的是 **AI编程工具用户的多工具配置管理痛点**：

1. **多CLI工具并存**：Claude Code / Codex / Gemini CLI / OpenCode / OpenClaw 各自有不同的配置格式，手动维护极其繁琐
2. **API Key管理混乱**：不同Provider（OpenAI/Anthropic/第三方中转）的Key散落各处
3. **MCP配置碎片化**：每个工具都要单独配置MCP，没有统一管理入口
4. **会话难以检索**：本地会话记录分散，无法快速搜索和恢复
5. **多设备同步缺失**：配置无法跨设备同步（WebDAV解决）

---

## 三、功能清单（完整功能地图）

### 3.1 Provider（AI提供商）管理 ⭐ 核心

| 功能 | 说明 | 优先级 |
|---|---|---|
| Provider列表 | 展示所有配置的API提供商 | P0 |
| 添加Provider | 支持预设模板（50+内置预设）| P0 |
| 编辑Provider | 修改API Key/BaseURL/Model/参数 | P0 |
| Provider切换 | 一键切换当前激活的Provider | P0 |
| 健康检查（Stream Check）| 实时验证Provider可用性，流式测试 | P1 |
| 健康状态指示器 | 列表中实时显示Provider健康状态 | P1 |
| Failover降级 | 主Provider不可用时自动切换备用 | P1 |
| Failover优先级 | 拖拽排序降级链路 | P1 |
| 内置Provider预设 | OpenAI/Anthropic/SiliconFlow/硅基流动等50+预设 | P0 |
| GitHub Copilot | OAuth Device Code Flow集成，自动刷新Token | P1 |
| 多账号管理 | 全局Auth Center，per-provider账号绑定 | P1 |
| Reasoning Effort映射 | o系列模型的thinking参数自动映射 | P2 |
| Bedrock优化器 | AWS Bedrock思考参数注入 | P2 |
| OpenAI Responses API | Anthropic↔OpenAI格式双向转换 | P2 |

### 3.2 MCP（Model Context Protocol）管理

| 功能 | 说明 | 优先级 |
|---|---|---|
| MCP列表展示 | 跨应用统一展示所有MCP配置 | P0 |
| MCP表单编辑 | 可视化编辑MCP服务器参数 | P0 |
| MCP向导 | 引导式添加MCP服务器 | P1 |
| MCP验证 | 配置校验（useMcpValidation）| P1 |
| 跨应用同步 | MCP配置同步到所有支持的CLI工具 | P0 |
| 应用级开关 | 每个MCP可按应用单独启用/禁用 | P1 |

### 3.3 Skills 管理

| 功能 | 说明 | 优先级 |
|---|---|---|
| Skills列表 | 展示已安装的Skills | P0 |
| Repo管理器 | 从Git仓库安装Skills | P0 |
| 统一Skills面板 | 跨应用统一视图 | P0 |
| Skills卡片 | 单个Skill详情展示 | P0 |
| Skills备份 | 卸载前自动备份到`~/.cc-switch/skill-backups/` | P1 |
| 备份恢复/删除 | 最多保留20份备份，可列表/恢复/删除 | P1 |
| 跨应用同步 | Skills同步到所有已检测CLI工具 | P0 |

### 3.4 Session Manager（会话管理）

| 功能 | 说明 | 优先级 |
|---|---|---|
| 多应用会话扫描 | Claude Code/Codex/Gemini/OpenCode/OpenClaw | P0 |
| 会话列表 | Provider/时间/工作目录/摘要 | P0 |
| 会话详情 | 目录导航+会话内搜索 | P1 |
| 关键词搜索 | FlexSearch全文检索 | P1 |
| App过滤 | 按当前应用自动过滤 | P1 |
| 复制恢复命令 | 一键复制，粘贴到终端 | P0 |
| 在终端恢复 | macOS Terminal/kitty/WezTerm直接打开 | P1 |
| SQLite后端 | OpenCode双后端（JSON+SQLite） | P2 |
| 并行扫描 | 并行目录扫描+头尾JSONL读取 | P1 |

### 3.5 Proxy（代理）管理

| 功能 | 说明 | 优先级 |
|---|---|---|
| 本地反向代理 | 在本地启动代理服务器，统一转发 | P0 |
| 全局代理接管 | 系统级代理，覆盖所有应用 | P1 |
| Gzip压缩 | 代理响应压缩 | P2 |
| 请求日志 | 记录所有代理请求 | P1 |
| Failover集成 | 代理层自动降级 | P1 |
| 速度测试 | Provider延迟测试（speedtest.rs）| P2 |

### 3.6 WebDAV 云同步

| 功能 | 说明 | 优先级 |
|---|---|---|
| WebDAV同步 | 配置数据同步到WebDAV（坚果云/Nextcloud等）| P1 |
| 自动同步 | 后台定时自动同步 | P1 |
| 双层版本控制 | 冲突检测和解决 | P1 |
| 密码安全 | WebDAV密码安全存储 | P1 |

### 3.7 Workspace（工作区）管理

| 功能 | 说明 | 优先级 |
|---|---|---|
| 工作区文件编辑 | 编辑HEARTBEAT/BOOTSTRAP/BOOT等特殊文件 | P1 |
| 日常记忆面板 | DailyMemoryPanel（OpenClaw专用）| P2 |
| 工作区文件管理 | WorkspaceFilesPanel | P1 |

### 3.8 Usage（用量统计）

| 功能 | 说明 | 优先级 |
|---|---|---|
| Token用量统计 | 各Provider Token消耗统计 | P1 |
| Recharts图表 | 可视化用量趋势 | P1 |
| 用量脚本 | UsageScriptModal，自定义统计脚本 | P2 |
| 定价配置 | 每个Provider的价格配置 | P2 |

### 3.9 Settings（设置）

| 功能 | 说明 | 优先级 |
|---|---|---|
| General | 通用设置（主题/语言/自动启动）| P0 |
| Proxy Tab | 代理设置（本地代理/Failover/全局出口）| P0 |
| Advanced | 高级设置 | P1 |
| Usage | 用量设置（计价配置）| P1 |
| About | 关于/版本/更新 | P0 |
| Backup管理 | 备份策略/最大数量/自动清理/重命名 | P1 |
| Import/Export | 配置导入导出 | P1 |
| Cloud Sync | WebDAV云同步配置 | P1 |
| Auth Center | GitHub账号全局管理 | P2 |

### 3.10 其他功能

| 功能 | 说明 | 优先级 |
|---|---|---|
| Deep Link | `cc-switch://`协议，外部唤起+配置导入 | P1 |
| 系统托盘 | 后台运行，托盘快捷操作 | P1 |
| 自动更新 | Tauri Updater，自动检测新版本 | P0 |
| 多语言 | 中文/英文/日语（69个i18n key修复）| P1 |
| 暗黑/亮色主题 | 跟随系统+手动切换 | P0 |
| 紧凑模式 | 工具栏自动紧凑（窗口宽度不足时）| P2 |
| Prompt管理 | 提示词文件管理（prompt_files.rs）| P2 |
| AppSwitcher | 多应用切换（Claude/Codex/Gemini/OpenCode/OpenClaw）| P0 |

---

## 四、功能差异分析

### 4.1 cc-switch 独特功能（竞品没有）

| 独特功能 | 说明 | 参考价值 |
|---|---|---|
| **GitHub Copilot反向代理** | OAuth Device Flow集成，格式双向转换 | 高 |
| **Provider健康检查** | 实时流式验证，自动降级Failover | 高 |
| **本地反向代理** | 系统级代理接管，统一转发 | 高 |
| **WebDAV云同步** | 跨设备配置同步 | 高 |
| **Bedrock优化器** | AWS Bedrock思考参数注入 | 低 |
| **Reasoning Effort映射** | o系列模型参数自动映射 | 中 |
| **Skills自动备份** | 卸载前备份，保留20份 | 高 |
| **用量统计+图表** | Token消耗可视化 | 中 |
| **多终端集成** | Terminal/kitty/WezTerm一键恢复会话 | 高 |
| **拖拽排序Failover** | 可视化配置降级优先级 | 中 |

### 4.2 cc-switch 缺失功能（Aidean Desktop有机会做）

| 缺失功能 | Aidean Desktop 机会点 |
|---|---|
| **Skills/MCP商城** | 内置商城，接入skills.sh/平台数据 |
| **君子订阅会员** | 付费权益体系，私有Skills/MCP |
| **AI聚合搜索** | 语义推荐最适合的Skills/MCP组合 |
| **任务环境（Environment）** | Skills+MCP+Agent组合一键应用 |
| **公众号联动** | 微信扫码触发桌面操作 |
| **代币体系** | AID Token空投激励 |
| **平台网页联动** | 网页收藏夹一键同步到桌面端 |
| **Agent收藏夹** | Agent定义文件统一管理 |
| **伴侣插件通信** | 向IDE注入提示词、读取对话输出 |
| **高分方案推荐** | AI自动生成最优任务环境 |

---

## 五、功能迭代分析（版本历史）

### 5.1 版本迭代节奏

```
v3.12.3  2026-03-24  36 commits  +9,124行   GitHub Copilot反代、Skills备份、macOS签名
v3.12.0  2026-03-09  56 commits  +20,582行  Stream Check恢复、OpenAI Responses API、Bedrock优化
v3.11.0  2026-02-26  147 commits +32,179行  OpenClaw支持、Session Manager、OMO集成
（更早版本未统计）
```

**节奏特征**：
- 约2-3周发布一个Minor版本
- 每次Major更新：+2万~3万行代码
- 社区活跃：PR/Issue贡献者多（贡献者name出现在changelog）
- 迭代方向：持续扩展支持的AI工具 + 深化配置管理能力

### 5.2 功能演进轨迹

```
早期  → Claude Code单工具管理
  ↓
中期  → 多工具（+Codex/+Gemini CLI）
  ↓
近期  → +OpenCode/+OpenClaw（第4/5个工具）
         +会话管理（Session Manager）
         +代理能力（本地反代）
         +云同步（WebDAV）
         +GitHub Copilot集成
  ↓
趋势  → 向「AI编程工具全家桶」演进
```

---

## 六、交互体验分析

### 6.1 操作流程

**核心流程：切换Provider**
```
1. 侧边栏选择目标应用（Claude/Codex/etc）
2. 点击Provider列表中的目标Provider
3. 确认切换 → Rust写入配置文件
4. Toast提示成功
（全程：3步，<5秒）
```

**MCP配置流程**
```
1. 切换到MCP标签
2. 点击「添加」→ 向导/表单二选一
3. 填入name/command/args/env
4. 保存 → 自动同步到所有已启用应用
```

**会话恢复流程**
```
1. 点击Session Manager
2. 搜索关键词 或 按应用/时间过滤
3. 点击会话 → 查看详情
4. 点击「复制恢复命令」或「在终端恢复」
```

### 6.2 页面跳转结构

```
主窗口
├── AppSwitcher（顶部）← 切换 Claude/Codex/Gemini/OpenCode/OpenClaw
│
├── [应用级标签页]
│   ├── Providers      ← 核心页，Provider列表+操作
│   ├── MCP            ← MCP统一管理
│   ├── Skills         ← Skills统一管理
│   ├── Workspace      ← 工作区文件
│   └── Usage          ← 用量统计
│
├── [全局功能]
│   ├── Session Manager ← 会话管理（跨应用）
│   ├── Proxy           ← 代理管理
│   └── Settings        ← 全局设置（5 Tab）
│       ├── General
│       ├── Proxy
│       ├── Advanced
│       ├── Usage
│       └── About
│
└── 系统托盘（后台常驻）
```

### 6.3 设计亮点

| 设计点 | 说明 |
|---|---|
| **AppSwitcher** | 顶部应用切换栏，直观显示支持的5个工具 |
| **健康状态徽章** | Provider卡片实时绿/黄/红指示可用性 |
| **向导式添加MCP** | McpWizardModal 引导式，降低配置门槛 |
| **CodeMirror编辑器** | JSON/Markdown内嵌编辑器，专业级体验 |
| **Framer Motion** | 页面切换/列表动画，高级感 |
| **cmdk命令面板** | Command+K全局搜索 |
| **紧凑模式自适应** | 窗口缩小时工具栏自动压缩 |
| **DnD拖拽排序** | Failover优先级可视化拖拽 |

---

## 七、UI设计风格

### 7.1 视觉风格

```
风格定位：现代简约、开发者友好、高信息密度

颜色体系：
- 主色：跟随系统（暗色/亮色）
- 强调色：蓝色系（Tailwind blue-500）
- 状态色：green（健康）/ yellow（警告）/ red（异常）
- 背景：深灰系（暗色模式主要使用场景）

字体：系统字体栈（-apple-system/Segoe UI）
圆角：Radix UI默认（medium radius）
间距：Tailwind默认间距体系
```

### 7.2 组件规范

```
基础组件：全套 Radix UI 无障碍组件
├── Accordion / Collapsible（折叠面板）
├── Dialog（弹窗）
├── DropdownMenu（下拉菜单）
├── Select（选择器）
├── Switch（开关）
├── Tabs（标签页）
├── Tooltip（提示）
└── ScrollArea（滚动区域）

图标：lucide-react（统一线性图标）
Provider图标：@lobehub/icons-static-svg（AI厂商品牌图标）
```

---

## 八、对 Aidean Desktop 的借鉴方案

### 8.1 直接复用的设计模式

| cc-switch方案 | Aidean Desktop 应用方式 |
|---|---|
| AppSwitcher顶部切换栏 | IDE切换栏（Cursor/VSCode/Windsurf/Claude Desktop）|
| Provider健康检查 | MCP Server健康检查 |
| Failover降级链路 | MCP多源降级 |
| Skills备份/恢复机制 | Skills收藏夹备份（20份轮转）|
| Session Manager | 会话管理（直接参考PRD）|
| WebDAV同步 | 平台云同步（替代WebDAV）|
| Deep Link协议 | `aidean://` 协议（平台/公众号唤起）|
| CodeMirror编辑器 | JSON/TOML配置编辑内嵌编辑器 |
| 5-Tab Settings布局 | 设置页布局参考 |
| 系统托盘 | 常驻托盘，快捷操作 |
| Tauri Updater | 自动更新机制 |
| Framer Motion动画 | 页面切换动画 |
| cmdk命令面板 | 全局快捷搜索 |

### 8.2 需要差异化的地方

| cc-switch做法 | Aidean Desktop 差异化方向 |
|---|---|
| 无商城，靠用户手动配置 | **内置Skills/MCP商城**，接入skills.sh+平台数据 |
| 无会员体系 | **君子订阅**，私有Skills/聚合搜索/代币空投 |
| 无AI推荐 | **AI语义推荐**，自动生成任务环境 |
| 无任务环境概念 | **任务环境（Environment）**，Skills+MCP+Agent组合 |
| 无平台网页联动 | **平台↔桌面双向同步**，网页收藏夹一键推送 |
| 无公众号联动 | **微信公众号触发**，Deep Link唤起 |
| 无伴侣插件 | **VS Code伴侣插件**，注入提示词/读取输出 |
| 代理功能全面但复杂 | 简化代理，聚焦配置管理主线 |

### 8.3 推荐直接采用的技术栈

```json
// 直接采用 cc-switch 相同的核心依赖
{
  "@tauri-apps/api": "^2.x",
  "@tauri-apps/plugin-updater": "^2.x",
  "@tauri-apps/plugin-store": "^2.x",
  "@tauri-apps/plugin-dialog": "^2.x",
  "@tanstack/react-query": "^5.x",
  "@radix-ui/*": "latest",
  "framer-motion": "^12.x",
  "lucide-react": "latest",
  "@lobehub/icons-static-svg": "^1.x",
  "sonner": "^2.x",
  "cmdk": "^1.x",
  "i18next": "^25.x",
  "zod": "^4.x",
  "react-hook-form": "^7.x",
  "codemirror": "^6.x",
  "flexsearch": "^0.8.x",
  "@dnd-kit/core": "^6.x"
}
```

### 8.4 Rust后端命令层映射

```
cc-switch commands/          →  aidean-desktop commands/
├── provider.rs              →  ide.rs（IDE配置管理）
├── mcp.rs                   →  mcp.rs（MCP管理）
├── skill.rs                 →  skill.rs（Skills管理）
├── session_manager.rs       →  session.rs（会话管理）
├── deeplink.rs              →  deeplink.rs（aidean://协议）
├── webdav_sync.rs           →  platform_sync.rs（平台同步）
├── auth.rs                  →  auth.rs（JWT + 平台账号）
├── workspace.rs             →  workspace.rs（工作区）
└── settings.rs              →  settings.rs（设置）

新增命令（Aidean独有）：
                             →  marketplace.rs（商城数据）
                             →  environment.rs（任务环境）
                             →  companion.rs（伴侣插件WS）
                             →  subscription.rs（会员权益）
                             →  token.rs（AID代币）
```

---

## 九、功能优先级矩阵（完整版）

| 功能模块 | Phase | 来源 | 说明 |
|---|---|---|---|
| IDE检测与配置路径 | P1 | cc-switch | 5工具→扩展到更多IDE |
| Provider/API Key管理 | P1 | cc-switch | 直接借鉴，50+预设 |
| MCP统一管理 | P1 | cc-switch+mcphub | 可视化+向导式 |
| Skills管理（含备份）| P1 | cc-switch+skills-hub | 符号链接+备份机制 |
| 系统托盘+自动更新 | P1 | cc-switch | 直接复用方案 |
| Session Manager | P1 | cc-switch | 参考session-manager.md |
| Skills/MCP商城 | P2 | 原创 | 接入skills.sh+平台 |
| 君子订阅会员 | P2 | 原创 | 付费权益体系 |
| 平台网页联动 | P2 | 原创 | WebSocket同步 |
| 任务环境（Environment）| P2 | 原创 | Skills+MCP+Agent组合 |
| 伴侣插件 | P3 | 原创 | VS Code Extension |
| AI聚合搜索 | P3 | mcphub启发 | 向量语义推荐 |
| 公众号联动 | P3 | 原创 | 微信Deep Link |
| 代币空投AID | P3 | 原创 | 激励体系 |

---

## 十、总结与关键结论

1. **cc-switch 是目前最完整的 AI CLI 工具配置管理器**（33.7k Stars验证），Aidean Desktop 应当以它为基础，在「商城+会员+平台联动」三个维度差异化
2. **技术栈完全对齐**：Tauri 2 + React + Rust + SQLite，直接采用，无需再做技术选型
3. **核心Rust命令层可以参考其分层模式**：commands/services/database 三层架构，按领域划分文件
4. **Session Manager PRD 可直接使用**：cc-switch 的 `session-manager.md` 已是完整PRD，直接参考实现
5. **UI组件库直接对齐**：Radix UI + Framer Motion + cmdk + lucide-react，保证开发效率和视觉一致性
6. **迭代节奏参考**：约2-3周一个Minor版本，Phase 1完成后快速发布，持续迭代

---

## 九、Aidean Desktop 基于 cc-switch 的完善方案

### 9.1 架构设计继承与扩展

#### 9.1.1 继承 cc-switch 的架构优势

| cc-switch 架构特点 | Aidean Desktop 继承方式 | 扩展方向 |
|---|---|---|
| **Tauri 2 + React 分层架构** | 完全继承，保持 Rust后端 + React前端 | 增加伴侣插件 WebSocket 通信层 |
| **commands/services/database 三层** | 继承目录结构，保持职责分离 | 增加 `sync/` 层处理平台联动 |
| **SQLite 本地存储** | 继承，零配置易同步 | 扩展表结构支持收藏夹、会员、代币 |
| **Tauri IPC 类型安全** | 继承，保持前后端类型一致 | 增加 Deep Link 处理模块 |
| **TanStack Query 状态管理** | 继承，服务端状态缓存 | 增加 Zustand 客户端状态 |

#### 9.1.2 扩展架构：平台联动层

```
┌─────────────────────────────────────────────────────────────────┐
│                      Aidean Desktop 扩展架构                      │
├─────────────────────────────────────────────────────────────────┤
│  前端（React + TypeScript）                                       │
│  ├── 首页/商城/设置（继承 cc-switch 布局）                        │
│  ├── 收藏夹管理（新增）                                          │
│  ├── 任务环境（新增）                                            │
│  └── 会员中心（新增）                                            │
├─────────────────────────────────────────────────────────────────┤
│  Tauri IPC（继承）                                               │
├─────────────────────────────────────────────────────────────────┤
│  Rust 后端                                                       │
│  ├── commands/（继承 cc-switch 模式）                            │
│  │   ├── skill.rs / mcp.rs / agent.rs                           │
│  │   ├── collection.rs（新增：收藏夹管理）                       │
│  │   ├── environment.rs（新增：任务环境）                        │
│  │   ├── sync.rs（新增：平台同步）                               │
│  │   ├── wechat.rs（新增：公众号联动）                           │
│  │   └── websocket.rs（新增：伴侣插件通信）                      │
│  ├── services/                                                   │
│  │   ├── sync_service.rs（平台同步服务）                         │
│  │   ├── recommendation.rs（AI推荐服务）                         │
│  │   └── token_ledger.rs（代币账本服务）                         │
│  └── database/                                                   │
│      ├── collections（收藏夹表）                                 │
│      ├── environments（任务环境表）                              │
│      ├── subscriptions（订阅表）                                 │
│      └── token_transactions（代币交易表）                        │
├─────────────────────────────────────────────────────────────────┤
│  平台联动层（新增）                                               │
│  ├── 网页端 API 客户端                                           │
│  ├── WebSocket 服务（伴侣插件）                                  │
│  └── Deep Link 处理器                                            │
├─────────────────────────────────────────────────────────────────┤
│  本地配置文件（继承 cc-switch 路径管理）                          │
│  └── 30+ IDE/工具配置目录                                        │
└─────────────────────────────────────────────────────────────────┘
```

### 9.2 核心功能对比与扩展

#### 9.2.1 功能对比矩阵

| 功能模块 | cc-switch | Aidean Desktop | 差异说明 |
|---|---|---|---|
| **Provider管理** | ✅ 50+ Provider预设 | ❌ 不需要（聚焦 Skills/MCP） | 简化，不管理 API Key |
| **MCP管理** | ✅ 跨应用同步 | ✅ 继承 + 商城接入 | 增加一键安装、自动更新 |
| **Skills管理** | ✅ Git安装、备份恢复 | ✅ 继承 + 收藏夹 + 商城 | 增加收藏夹、任务环境 |
| **Agent管理** | ❌ 无 | ✅ 新增 | Agent收藏夹、配置管理 |
| **任务环境** | ❌ 无 | ✅ 新增 | Skills+MCP+Agent组合 |
| **商城** | ❌ 无 | ✅ 新增 | 接入 skills.sh + 平台数据 |
| **会员订阅** | ❌ 无 | ✅ 新增 | 君子订阅体系 |
| **AI推荐** | ❌ 无 | ✅ 新增 | 语义搜索、智能推荐 |
| **平台联动** | ❌ 仅 WebDAV | ✅ 新增 | 网页端双向同步、公众号 |
| **伴侣插件** | ❌ 无 | ✅ 新增 | VS Code/Cursor 插件通信 |
| **代币体系** | ❌ 无 | ✅ 新增 | AID Token 空投激励 |
| **会话管理** | ✅ Session Manager | ⚠️ 简化版 | 保留核心功能，简化UI |
| **代理管理** | ✅ 本地反代 | ❌ 移除 | 聚焦配置管理，简化架构 |
| **用量统计** | ✅ Token统计 | ⚠️ 可选 | 作为会员功能提供 |

#### 9.2.2 核心问题演变

**cc-switch 解决的核心问题**：
> AI编程工具用户的多工具配置管理痛点（API Key、MCP配置、会话检索）

**Aidean Desktop 解决的核心问题**：
> AI编程工具用户的 **Skills/MCP/Agent 生态管理痛点**（发现、安装、组合、同步）

```
cc-switch 用户痛点                    Aidean Desktop 用户痛点
─────────────────────────────────    ─────────────────────────────────
多CLI工具配置繁琐         ────────→   Skills/MCP/Agent 发现困难
API Key 管理混乱          ────────→   多工具配置重复劳动
MCP 配置碎片化            ────────→   缺乏场景化组合方案
会话难以检索              ────────→   网页端与桌面端数据割裂
多设备同步缺失            ────────→   缺乏个性化推荐
```

### 9.3 功能清单完善（Aidean Desktop 版）

#### 9.3.1 继承自 cc-switch 的功能（P0）

| 功能 | 说明 | 继承方式 |
|---|---|---|
| MCP 跨应用同步 | 配置同步到所有检测到的IDE | 直接复用代码逻辑 |
| Skills 备份恢复 | 卸载前自动备份，20份轮转 | 直接复用机制 |
| 自动更新 | Tauri Updater 检测新版本 | 直接复用 |
| Deep Link | 外部唤起 + 配置导入 | 改为 `aidean://` 协议 |
| 系统托盘 | 后台常驻 + 快捷操作 | 直接复用 |
| 多语言 | 中文/英文/日文 | 直接复用 i18n 框架 |
| 暗黑/亮色主题 | 跟随系统 + 手动切换 | 直接复用 |

#### 9.3.2 新增核心功能（P0）

| 功能 | 说明 | 设计要点 |
|---|---|---|
| **Skills/MCP/Agent 收藏夹** | 用户可创建多个收藏夹，分类管理 | 支持拖拽排序、批量操作 |
| **任务环境** | Skills+MCP+Agent 组合，一键应用 | 环境模板、场景化预设 |
| **商城浏览** | 接入 skills.sh + 平台数据 | 分类筛选、评分排序、一键安装 |
| **自动更新** | Skills/MCP 自动检测和更新 | 更新通知、批量更新、回滚机制 |
| **平台联动** | 接收官网命令、公众号命令 | 配置同步、Deep Link 唤起 |

#### 9.3.3 新增会员功能（君子订阅）

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

### 9.4 交互体验优化

#### 9.4.1 页面结构演变

**cc-switch 页面结构**：
```
AppSwitcher（顶部）
├── Providers / MCP / Skills / Workspace / Usage（应用级标签页）
├── Session Manager / Proxy / Settings（全局功能）
└── 系统托盘
```

**Aidean Desktop 页面结构**：
```
侧边栏导航（左侧）
├── 首页（控制台）← 四大收藏夹快捷入口 + 最近更新 + AI推荐
├── 商城（探索）← Skills/MCP/Agent/任务环境 分类浏览
├── 收藏夹 ← 统一管理所有收藏
├── 任务环境 ← 场景化组合管理
└── 设置 ← 通用/平台联动/工具检测/会员/关于

系统托盘 ← 快捷操作 + 最近使用
```

#### 9.4.2 核心操作流程

**一键应用任务环境流程**：
```
1. 用户在首页点击「任务环境收藏夹」
2. 选择目标环境（如「React Native 开发环境」）
3. 点击「一键应用」
4. 选择应用范围：全局（系统级）/ 项目级
5. 如选择项目级，弹出目录选择器确认项目路径
6. 桌面端应用 Skills/MCP/Agent 配置到目标IDE
7. 显示应用成功提示，记录应用历史
（全程：4-5步，<10秒）
```

**从商城安装 Skills 流程**：
```
1. 用户进入商城页，浏览或搜索 Skills
2. 点击 Skills 卡片查看详情（Markdown渲染）
3. 点击「安装」按钮
4. 选择目标IDE（可多选）
5. 自动下载并同步配置
6. 提示安装成功，可选择添加到收藏夹
（全程：3-4步，<15秒）
```

### 9.5 UI设计继承

#### 9.5.1 继承 cc-switch 的设计系统

| 设计元素 | cc-switch | Aidean Desktop |
|---|---|---|
| **基础组件** | Radix UI | 完全继承 |
| **图标** | lucide-react | 完全继承 |
| **动画** | Framer Motion | 完全继承 |
| **Toast** | Sonner | 完全继承 |
| **命令面板** | cmdk | 完全继承 |
| **代码编辑** | CodeMirror 6 | 完全继承 |
| **颜色体系** | Tailwind 默认 | 继承 + 品牌色 |
| **布局** | 顶部切换栏 | 改为左侧侧边栏 |

#### 9.5.2 新增设计元素

```typescript
// 品牌色彩扩展
const brandColors = {
  primary: '#3B82F6',      // 继承 blue-500
  secondary: '#8B5CF6',    // 新增 violet-500
  success: '#10B981',      // 继承 green-500
  warning: '#F59E0B',      // 继承 amber-500
  danger: '#EF4444',       // 继承 red-500
  
  // 新增会员专属色
  gold: '#FBBF24',         // 君子订阅金色标识
  token: '#6366F1',        // AID代币靛蓝色
}

// 新增组件
const newComponents = [
  'CollectionCard',       // 收藏夹卡片
  'EnvironmentCard',      // 任务环境卡片
  'MarketplaceItem',      // 商城项目卡片
  'SyncStatusBadge',      // 同步状态徽章
  'SubscriptionBadge',    // 会员等级徽章
  'TokenBalance',         // 代币余额显示
]
```

### 9.6 技术栈直接复用清单

#### 9.6.1 完全复用的依赖（与 cc-switch 一致）

```json
{
  "dependencies": {
    "@tauri-apps/api": "^2.8.0",
    "@tauri-apps/plugin-updater": "^2.8.0",
    "@tauri-apps/plugin-store": "^2.8.0",
    "@tauri-apps/plugin-dialog": "^2.8.0",
    "@tauri-apps/plugin-process": "^2.8.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@tanstack/react-query": "^5.90.3",
    "framer-motion": "^12.23.25",
    "lucide-react": "latest",
    "@radix-ui/react-dialog": "latest",
    "@radix-ui/react-dropdown-menu": "latest",
    "@radix-ui/react-select": "latest",
    "@radix-ui/react-switch": "latest",
    "@radix-ui/react-tabs": "latest",
    "@radix-ui/react-tooltip": "latest",
    "cmdk": "^1.0.0",
    "sonner": "^2.0.7",
    "i18next": "^25.0.0",
    "react-i18next": "^16.0.0",
    "zod": "^4.0.0",
    "react-hook-form": "^7.54.0",
    "@codemirror/lang-json": "^6.0.0",
    "@codemirror/lang-markdown": "^6.0.0",
    "react-markdown": "^9.0.0",
    "flexsearch": "^0.8.212",
    "@dnd-kit/core": "^6.3.0",
    "@dnd-kit/sortable": "^10.0.0"
  }
}
```

#### 9.6.2 新增依赖

```json
{
  "dependencies": {
    // 状态管理增强
    "zustand": "^4.5.0",
    
    // 向量搜索（AI推荐）
    "@qdrant/js-client-rest": "^1.12.0",
    
    // WebSocket（伴侣插件通信）
    "ws": "^8.18.0",
    
    // 二维码（公众号联动）
    "qrcode.react": "^4.2.0"
  }
}
```

### 9.7 配置文件路径扩展

#### 9.7.1 继承 cc-switch 的 5 个工具

| 工具 | 配置路径（Windows） | 配置路径（macOS/Linux） |
|---|---|---|
| Claude Code | `%APPDATA%\Claude\` | `~/.claude/` |
| Codex | `%APPDATA%\Codex\` | `~/.codex/` |
| Gemini CLI | `%APPDATA%\Gemini\` | `~/.gemini/` |
| OpenCode | `%APPDATA%\OpenCode\` | `~/.opencode/` |
| OpenClaw | `%APPDATA%\OpenClaw\` | `~/.openclaw/` |

#### 9.7.2 扩展支持 30+ 工具（参考 skills-hub）

| 工具 | Skills 路径 | MCP 路径 |
|---|---|---|
| Cursor | `~/.cursor/skills` | `~/.cursor/mcp.json` |
| VS Code | `~/.vscode/skills` | `~/.vscode/mcp.json` |
| Windsurf | `~/.codeium/windsurf/skills` | `~/.codeium/windsurf/mcp.json` |
| Trae | `~/.trae/skills` | `~/.trae/mcp.json` |
| JetBrains | `~/.jetbrains/skills` | `~/.jetbrains/mcp.json` |
| Cline | `~/.cline/skills` | `~/.cline/mcp.json` |
| Roo Code | `~/.roo/skills` | `~/.roo/mcp.json` |
| Continue | `~/.continue/skills` | `~/.continue/mcp.json` |
| ... | ... | ... |

### 9.8 开发优先级建议

#### Phase 1: MVP（4周）—— 继承 cc-switch 核心

| 周次 | 任务 | 参考 cc-switch |
|---|---|---|
| Week 1 | 搭建 Tauri + React 架构 | 复用项目模板 |
| Week 2 | 实现 MCP/Skills 管理 | 复用 commands/mcp.rs、skill.rs |
| Week 3 | 实现一键应用（全局级） | 复用文件同步逻辑 |
| Week 4 | 实现设置页、自动更新 | 复用 settings.rs、updater |

#### Phase 2: 核心功能（6周）—— 新增差异化功能

| 周次 | 任务 | 说明 |
|---|---|---|
| Week 5-6 | 商城功能 | 接入 skills.sh API |
| Week 7-8 | 收藏夹系统 | Skills/MCP/Agent 收藏管理 |
| Week 9-10 | 任务环境 | 组合应用、场景化预设 |

#### Phase 3: 高级功能（4周）—— 会员体系

| 周次 | 任务 | 说明 |
|---|---|---|
| Week 11-12 | 君子订阅 | 会员系统、私有仓库 |
| Week 13-14 | 平台联动 | 网页端同步、公众号 |

### 9.9 总结

#### 9.9.1 cc-switch 对 Aidean Desktop 的价值

| 维度 | 价值 |
|---|---|
| **架构验证** | Tauri 2 + React 技术栈已验证可行，33.7k Stars 证明市场接受度 |
| **代码复用** | 可直接复用 60%+ 核心逻辑（文件操作、配置同步、自动更新）|
| **设计参考** | UI/UX 设计成熟，可直接继承设计系统 |
| **功能边界** | 明确 cc-switch 不做商城/会员/AI推荐，为 Aidean 提供差异化空间 |

#### 9.9.2 Aidean Desktop 的差异化定位

```
市场定位对比：

cc-switch          →   「AI编程工具配置管理器」
                      （面向多工具用户，解决配置繁琐）
                      
Aidean Desktop     →   「AI Skills & MCP 生态中枢」
                      （面向 Skills/MCP 生态，解决发现/组合/同步）
```

#### 9.9.3 关键成功因素

1. **技术继承**：复用 cc-switch 成熟架构，降低技术风险
2. **生态接入**：快速接入 skills.sh 210+ Skills，丰富商城内容
3. **平台联动**：网页端与桌面端双向同步，形成产品闭环
4. **会员价值**：君子订阅提供切实价值（私有仓库、AI推荐、代币激励）

---

> **文档版本**: v2.1
> **最后更新**: 2026-03-26

---

## 十、Skills双协议与配置文件路径参考

> 完整路径表见：`.example/config-paths-reference.md`

### 10.1 cc-switch的Skills协议实现

cc-switch 实现的是 **Anthropic SKILL.md 协议**，每个Skill以独立目录存储：

```
~/.cc-switch/skills/（中心仓库）
└── my-skill/
    └── SKILL.md   # frontmatter: name + description

同步到各工具目录（symlink/copy）：
~/.claude/skills/my-skill/
~/.cursor/skills/my-skill/  ← 强制copy（Cursor不支持symlink）
~/.config/opencode/skills/my-skill/
```

### 10.2 cc-switch的MCP配置路径

cc-switch 会读写以下各IDE的MCP配置文件：

| IDE | macOS/Linux路径 | Windows路径 |
|---|---|---|
| **Claude Code** | `~/.claude.json` | `%USERPROFILE%\.claude.json` |
| **Cursor** | `~/.cursor/mcp.json` | `%USERPROFILE%\.cursor\mcp.json` |
| **Windsurf** | `~/.codeium/windsurf/mcp_config.json` | `%USERPROFILE%\.codeium\windsurf\mcp_config.json` |
| **OpenCode** | `~/.config/opencode/config.json` | `%APPDATA%\opencode\config.json` |
| **Codex** | `~/.codex/config.json` | `%USERPROFILE%\.codex\config.json` |
| **OpenClaw** | `~/.openclaw/config.json` | `%USERPROFILE%\.openclaw\config.json` |

### 10.3 cc-switch的Session路径

cc-switch Session Manager扫描以下目录：

| 工具 | 会话文件路径 | 格式 |
|---|---|---|
| **Claude Code** | `~/.claude/projects/` | JSONL |
| **Codex** | `~/.codex/history/` | JSONL |
| **Gemini CLI** | `~/.gemini/sessions/` | JSONL |
| **OpenCode** | `~/.config/opencode/sessions/` | JSONL或SQLite |
| **OpenClaw** | `~/.openclaw/sessions/` | JSONL |

### 10.4 双协议对比（cc-switch视角）

| 维度 | cc-switch实现 | Aidean Desktop扩展 |
|---|---|---|
| **Skills格式** | Anthropic SKILL.md（每个Skill一目录）| 同 + 额外生成AGENTS.md（OpenAI协议）|
| **Skills发现** | 扫描skills/目录，读取frontmatter | 同 |
| **AGENTS.md** | ❌ 不生成 | ✅ 应用后自动更新AGENTS.md |
| **Cursor同步** | ✅ 强制copy模式 | ✅ 继承此规则 |
| **MCP配置** | ✅ 直接读写各IDE配置文件 | ✅ 继承 + 扩展更多IDE |

### 10.5 Windows特殊路径注意

```
# cc-switch在Windows的路径映射
~/.claude/         → %USERPROFILE%\.claude\
~/.cursor/         → %USERPROFILE%\.cursor\
~/.config/opencode/ → %APPDATA%\opencode\

# Windows Junction点（cc-switch使用）
- junction2 crate实现目录联接
- 不需要管理员权限（与symlink不同）
- Cursor仍需copy（Junction也无法被Cursor发现）
```
> **状态**: 基于 cc-switch 完善的 Aidean Desktop 设计方案