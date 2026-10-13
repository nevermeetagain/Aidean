# mcp-router 竞品深度分析报告

> 来源：https://github.com/mcp-router/mcp-router
> 分析日期：2026-03-26
> 当前版本：v0.6.2 | License：Sustainable Use License

---

## 一、架构设计

### 1.1 技术栈

| 层级 | 技术 | 版本 | 说明 |
|---|---|---|---|
| **桌面框架** | Electron + Electron Forge | ^36.9.5 | 主流桌面框架，跨平台 |
| **构建工具** | Webpack 5 + Turbo | ^5.103.0 | monorepo构建加速 |
| **前端框架** | React | ^19.x | 最新版本 |
| **前端语言** | TypeScript | ^5.9.3 | 严格类型 |
| **样式** | Tailwind CSS | ^3.4.18 | 原子化CSS |
| **UI组件** | shadcn/ui（components.json）| - | 基于Radix UI |
| **状态管理** | Zustand | - | stores/目录 |
| **本地数据库** | better-sqlite3 | - | SQLite绑定 |
| **路由** | react-router-dom | ^5.3 | 前端路由 |
| **图表** | react-wordcloud + d3-cloud | ^1.2 | 词云可视化 |
| **国际化** | locales/目录 | - | 多语言支持 |
| **MCP SDK** | @modelcontextprotocol/sdk | >=1.25.2 | 官方MCP SDK |
| **HTTP服务** | express | - | 本地HTTP服务器 |
| **测试** | Playwright | ^1.57.0 | E2E测试 |
| **包管理** | pnpm workspaces + Turbo | ^10.22.0 | monorepo |

### 1.2 Monorepo 结构

```
mcp-router/
├── apps/
│   ├── electron/          # 桌面应用主体（Electron）
│   └── cli/               # CLI工具（stdio↔HTTP桥接）
├── packages/
│   ├── shared/            # 前后端共享类型（Platform API类型定义）
│   ├── ui/                # 共享UI组件库
│   ├── tailwind-config/   # 共享Tailwind配置
│   └── remote-api-types/  # 远程API类型
└── docs/adr/              # 架构决策记录（ADR）
```

### 1.3 Electron应用架构（Clean Architecture）

```
apps/electron/src/
├── main/                           # 主进程（Node.js）
│   ├── modules/                    # 模块层（业务逻辑，自包含）
│   │   ├── auth/                   # 认证模块
│   │   ├── cloud-sync/             # 云同步模块
│   │   ├── mcp-apps-manager/       # MCP应用管理（含token管理）
│   │   ├── mcp-logger/             # MCP日志模块
│   │   ├── mcp-server-manager/     # MCP服务器管理（含DXT处理）
│   │   ├── mcp-server-runtime/     # MCP服务器运行时（含HTTP服务）
│   │   ├── projects/               # 项目管理
│   │   ├── settings/               # 应用设置
│   │   ├── skills/                 # Skills管理
│   │   ├── system/                 # 系统管理
│   │   ├── tool-catalog/           # 工具目录
│   │   ├── workflow/               # 工作流+Hook管理
│   │   └── workspace/              # 工作区管理
│   ├── infrastructure/             # 基础设施层
│   │   ├── database/               # SQLite数据访问
│   │   └── ipc.ts                  # IPC通信
│   └── ui/
│       ├── menu.ts                 # 菜单
│       └── tray.ts                 # 系统托盘
│
└── renderer/                       # 渲染进程（React）
    ├── components/                 # UI组件
    │   ├── auth/                   # 认证UI
    │   ├── common/                 # 通用组件
    │   ├── layout/                 # 布局组件
    │   ├── mcp/                    # MCP管理UI
    │   ├── setting/                # 设置UI
    │   ├── skills/                 # Skills UI
    │   ├── workflow/               # 工作流UI
    │   └── workspace/              # 工作区UI
    ├── platform-api/               # Platform API抽象层
    ├── services/                   # 渲染进程服务
    ├── stores/                     # Zustand状态
    └── utils/                      # 工具函数
```

### 1.4 Platform API 架构（核心亮点）

```typescript
// packages/shared/src/types/platform-api/ipc.ts
interface PlatformAPI {
  app: AppAPI;         // 应用管理（版本/Token/更新）
  auth: AuthAPI;       // 认证授权
  hooks: HookAPI;      // MCP Hook管理
  log: LogAPI;         // 日志管理
  package: PackageAPI; // 包管理（npx/uvx等）
  server: ServerAPI;   // MCP服务器CRUD+运行时
  settings: SettingsAPI; // 应用设置
  workspace: WorkspaceAPI; // 工作区管理
}
```

**设计亮点**：Platform API 抽象层屏蔽 Electron/Web 差异，同一前端代码可跑在 Electron 和 Web 两个平台。

### 1.5 CLI 工具

```bash
# stdio → HTTP 桥接（让stdio型MCP客户端连接HTTP服务器）
npx @mcp_router/cli connect --url http://localhost:3283/mcp

# HTTP → stdio 桥接（让HTTP服务器包装stdio型MCP服务器）
npx @mcp_router/cli serve npx @modelcontextprotocol/server-filesystem /path
```

---

## 二、核心功能分析

### 2.1 解决的核心问题

1. **MCP服务器碎片化**：各IDE/工具各自维护MCP配置，缺乏统一管理入口
2. **上下文爆炸**：多个MCP服务器同时加载，Token消耗过大
3. **工作区隔离需求**：不同项目需要不同的MCP组合，手动切换繁琐
4. **协议壁垒**：stdio型MCP无法被HTTP型客户端直接调用（CLI桥接解决）
5. **隐私安全**：MCP配置含API Key等敏感信息，不希望上传第三方

---

## 三、功能清单

### 3.1 MCP服务器管理 ⭐ 核心

| 功能 | 说明 | 优先级 |
|---|---|---|
| 服务器列表 | 展示所有MCP服务器，含状态指示 | P0 |
| 添加服务器 | 支持DXT / JSON / Manual三种方式 | P0 |
| 编辑服务器 | 修改command/args/env参数 | P0 |
| 删除服务器 | 含确认对话框 | P0 |
| 启动/停止服务器 | 单个服务器开关控制 | P0 |
| 服务器状态监控 | 实时显示运行/停止/错误状态 | P0 |
| 按工具粒度开关 | 启用/禁用单个工具，不影响整个服务器 | P1 |
| DXT格式支持 | 解析DXT包，自动提取MCP配置 | P1 |
| 服务器日志查看 | 实时日志流，含导出功能 | P1 |
| 工具目录（Tool Catalog）| 浏览所有可用工具，d3词云可视化 | P1 |
| HTTP端点暴露 | 本地HTTP服务器（默认3283端口）供IDE连接 | P0 |

### 3.2 工作区（Workspace）管理

| 功能 | 说明 | 优先级 |
|---|---|---|
| 工作区CRUD | 创建/编辑/删除工作区 | P0 |
| 工作区切换 | 类似浏览器Profile，不同工作区独立配置 | P0 |
| 工作区级MCP配置 | 每个工作区有独立的MCP服务器组合 | P0 |
| 激活工作区 | 切换后立即生效 | P0 |

### 3.3 项目（Project）管理

| 功能 | 说明 | 优先级 |
|---|---|---|
| 项目CRUD | 按项目对MCP分组管理 | P1 |
| 项目级MCP配置 | 每个项目有独立MCP服务器组合 | P1 |
| 项目切换 | 快速切换项目上下文 | P1 |

### 3.4 Workflow（工作流）+ Hook

| 功能 | 说明 | 优先级 |
|---|---|---|
| Hook管理 | MCP请求/响应拦截钩子 | P1 |
| 工作流配置 | 自定义MCP调用链路 | P1 |
| 工作流UI | 可视化工作流编辑 | P2 |

### 3.5 Skills 管理

| 功能 | 说明 | 优先级 |
|---|---|---|
| Skills列表 | 展示已安装Skills | P1 |
| Skills UI | 可视化管理界面（skills/目录）| P1 |

### 3.6 认证（Auth）

| 功能 | 说明 | 优先级 |
|---|---|---|
| 用户登录 | 平台账号认证 | P1 |
| Token管理 | API Token生成/验证/撤销 | P1 |
| 认证状态监听 | onAuthChange实时回调 | P1 |

### 3.7 云同步（Cloud Sync）

| 功能 | 说明 | 优先级 |
|---|---|---|
| 配置云同步 | MCP配置跨设备同步 | P2 |
| cloud-sync模块 | 独立模块（主进程）| P2 |

### 3.8 设置（Settings）

| 功能 | 说明 | 优先级 |
|---|---|---|
| 应用设置 | 主题/语言/HTTP端口等 | P0 |
| overlay计数 | 叠加配置计数管理 | P2 |
| 设置变更监听 | 实时同步设置变更 | P1 |

### 3.9 日志与监控

| 功能 | 说明 | 优先级 |
|---|---|---|
| MCP请求日志 | 记录所有MCP调用 | P1 |
| 日志查询 | 按时间/服务器过滤 | P1 |
| 日志导出 | 导出为文件 | P2 |
| 统计图表 | d3词云工具使用频率 | P2 |

### 3.10 CLI工具

| 功能 | 说明 | 优先级 |
|---|---|---|
| stdio→HTTP桥接 | `connect`命令，让stdio客户端连HTTP服务器 | P1 |
| HTTP→stdio桥接 | `serve`命令，暴露stdio服务器为HTTP | P1 |
| Token认证 | Bearer Token保护端点 | P1 |

---

## 四、功能差异分析

### 4.1 mcp-router 独特功能

| 独特功能 | 说明 | 参考价值 |
|---|---|---|
| **Platform API抽象层** | 屏蔽Electron/Web差异，同代码双端运行 | 极高 |
| **Clean Architecture ADR** | 完整架构决策文档，模块化架构设计 | 极高 |
| **工具粒度开关** | 单个MCP工具级别的启用/禁用 | 高 |
| **DXT格式支持** | 自动解析DXT包提取MCP配置 | 中 |
| **Hook系统** | MCP请求/响应拦截钩子，可自定义处理链路 | 高 |
| **CLI桥接工具** | stdio↔HTTP双向桥接，打通协议壁垒 | 高 |
| **d3词云可视化** | 工具使用频率词云，直观展示使用热度 | 中 |
| **本地HTTP服务器** | 内置HTTP端点，IDE直接连接（端口3283）| 高 |
| **模块化架构文档（ADR）** | 完整的架构决策记录，工程规范严格 | 极高 |

### 4.2 mcp-router 缺失功能（Aidean Desktop 机会点）

| 缺失功能 | Aidean Desktop 机会点 |
|---|---|
| **Skills/MCP商城** | 内置商城，接入skills.sh/平台数据 |
| **君子订阅会员** | 付费权益体系，私有Skills/MCP |
| **AI聚合搜索** | 语义推荐最合适的MCP组合 |
| **任务环境** | Skills+MCP+Agent组合收藏夹 |
| **公众号联动** | 微信扫码触发桌面操作 |
| **代币体系** | AID Token空投激励 |
| **平台网页联动** | 网页收藏夹一键推送到桌面 |
| **Provider/API Key管理** | cc-switch的Provider切换能力 |
| **会话管理** | 扫描/搜索/恢复AI会话 |
| **自动更新机制** | Tauri Updater类似的无感升级 |
| **伴侣插件通信** | VS Code插件注入提示词 |

---

## 五、功能迭代分析

### 5.1 版本特征

```
当前版本：v0.6.2
 License：Sustainable Use License（商业授权，非完全开源）
发布渠道：GitHub Releases（Windows/macOS）
迭代状态：活跃开发中
```

### 5.2 功能演进轨迹（从ADR推断）

```
早期  → 基础MCP服务器管理（启动/停止/配置）
  ↓
中期  → 工作区概念引入（Workspace）
         项目分组管理（Projects）
  ↓
2025-08  → Hook系统（MCP请求拦截）
            MCP应用管理器（mcp-apps-manager）
            Skills模块加入
  ↓
2025-09  → 模块化架构重构（Modular Architecture）
            Domain层→Modules层
            工作流模块（Workflow）
  ↓
近期  → Cloud Sync云同步
         Tool Catalog工具目录
         CLI工具发布
  ↓
趋势  → 向「MCP管理平台」演进，增加协作和云端能力
```

---

## 六、交互体验分析

### 6.1 核心操作流程

**添加MCP服务器**
```
1. 点击「Add Server」
2. 选择方式：DXT包 / JSON配置 / 手动输入
3. 填写 command/args/env
4. 保存 → 服务器加入列表
5. 点击启动按钮 → 服务器运行
6. 复制HTTP端点 → 配置到IDE
（全程：5步，约1分钟）
```

**切换工作区**
```
1. 点击顶部工作区选择器
2. 选择目标工作区
3. 立即生效（自动重启受影响的MCP服务器）
```

**IDE连接MCP Router**
```
1. 获取本地HTTP端点：http://localhost:3283/mcp
2. 在IDE（Cursor/Claude Desktop等）配置MCP
3. 填入上述URL即可
（或使用CLI：npx @mcp_router/cli connect）
```

### 6.2 页面跳转结构

```
主窗口
├── TitleBar（顶部标题栏）
├── Sidebar（左侧导航）
│   ├── Home（首页/仪表盘）
│   ├── MCP（MCP服务器管理）
│   │   ├── 服务器列表
│   │   ├── 工具目录（Tool Catalog）
│   │   └── 日志
│   ├── Workspace（工作区管理）
│   ├── Projects（项目管理）
│   ├── Skills（Skills管理）
│   ├── Workflow（工作流+Hook）
│   └── Setting（设置）
│       ├── 通用设置
│       ├── 认证
│       └── 云同步
└── Auth（认证页，未登录时显示）
```

### 6.3 设计亮点

| 设计点 | 说明 |
|---|---|
| **Sidebar导航** | 左侧固定导航，清晰的功能分区 |
| **工具粒度开关** | 细粒度控制，避免全量加载 |
| **词云可视化** | d3-cloud展示工具使用热度，直观 |
| **Platform API抽象** | 前端完全不感知Electron/Web差异 |
| **shadcn/ui** | 高质量组件库，现代美观 |
| **ADR文档驱动** | 架构决策有完整文档记录，工程成熟度高 |

---

## 七、UI设计风格

### 7.1 视觉风格

```
风格定位：专业工具类、信息密度中等、现代简约

颜色体系：
- 基础：shadcn/ui默认设计系统
- 支持暗色/亮色主题
- 状态色：green（运行）/ red（错误）/ gray（停止）

字体：系统字体栈
圆角：shadcn/ui默认（中等圆角）
间距：Tailwind默认间距体系
```

### 7.2 组件规范

```
基础组件：shadcn/ui（基于Radix UI）
图标：Lucide React（推断）
图表：react-wordcloud + d3-cloud（词云）
状态指示：颜色徽章（运行/停止/错误）
```

---

## 八、对 Aidean Desktop 的借鉴方案

### 8.1 架构层面直接借鉴

| mcp-router方案 | Aidean Desktop 应用 |
|---|---|
| **Platform API抽象层** | 设计 `AideanAPI` 接口，屏蔽Tauri/Web差异，为未来Web版预留 |
| **Clean Architecture（ADR）** | 采用相同分层：modules/infrastructure/ui/utils |
| **模块化自包含结构** | 每个功能模块（mcp/skills/ide/marketplace）自包含 |
| **IPC类型安全** | 前后端共享类型定义（packages/shared等价物：src/types/）|
| **monorepo结构** | pnpm workspace，桌面端+网页端+伴侣插件共享类型 |

### 8.2 功能层面直接借鉴

| mcp-router功能 | Aidean Desktop 应用 |
|---|---|
| 工作区管理（Workspace）| 任务环境（Environment）的基础概念 |
| 项目级MCP分组 | 项目级vs全局 应用范围选择 |
| 工具粒度开关 | MCP工具细粒度控制 |
| Hook系统 | MCP请求拦截，用于日志和监控 |
| 本地HTTP服务器 | 内置MCP聚合端点，IDE统一连接 |
| CLI桥接工具 | 伴侣插件的协议适配层参考 |
| 日志+统计 | MCP调用日志，用量分析 |

### 8.3 Platform API 设计参考（Tauri版）

```typescript
// Aidean Desktop Platform API（参考mcp-router设计）
interface AideanAPI {
  app: AppAPI;           // 应用管理（版本/更新/Token）
  auth: AuthAPI;         // 账号认证（JWT/会员状态）
  ide: IDEAPI;           // IDE检测与配置（Aidean特有）
  mcp: McpAPI;           // MCP服务器管理
  skills: SkillsAPI;     // Skills管理
  agent: AgentAPI;       // Agent管理（Aidean特有）
  environment: EnvAPI;   // 任务环境（Aidean特有）
  marketplace: MarketAPI;// 商城（Aidean特有）
  subscription: SubAPI;  // 君子订阅（Aidean特有）
  workspace: WorkspaceAPI;// 工作区/项目管理
  settings: SettingsAPI; // 应用设置
  log: LogAPI;           // 日志管理
  session: SessionAPI;   // 会话管理（参考cc-switch）
  sync: SyncAPI;         // 平台同步（替代云同步）
}

// 实现层（Tauri环境）
class TauriAideanAPI implements AideanAPI {
  mcp = {
    list: () => invoke<McpServer[]>('list_mcp_servers'),
    create: (input) => invoke('create_mcp_server', { input }),
    // ...
  };
}

// 预留Web实现（未来扩展）
class RemoteAideanAPI implements AideanAPI {
  mcp = {
    list: () => fetch('/api/mcp').then(r => r.json()),
    // ...
  };
}
```

### 8.4 模块化架构映射

```
mcp-router modules/          →  aidean-desktop src-tauri/src/modules/
├── auth/                    →  auth/（JWT + 平台账号）
├── mcp-server-manager/      →  mcp/（MCP服务器管理）
├── mcp-server-runtime/      →  mcp_runtime/（HTTP端点服务）
├── mcp-apps-manager/        →  ide/（IDE配置管理）
├── mcp-logger/              →  logger/（MCP日志）
├── skills/                  →  skills/（Skills管理）
├── workspace/               →  workspace/（工作区）
├── projects/                →  project/（项目管理）
├── workflow/                →  workflow/（Hook系统）
├── cloud-sync/              →  platform_sync/（平台同步）
├── settings/                →  settings/（应用设置）
└── system/                  →  system/（系统信息）
新增模块：
                             →  marketplace/（商城数据）
                             →  environment/（任务环境）
                             →  companion/（伴侣插件WS）
                             →  subscription/（会员权益）
                             →  token/（AID代币）
```

---

## 九、功能优先级矩阵

| 功能模块 | Phase | 来源 | 说明 |
|---|---|---|---|
| MCP服务器管理 | P1 | mcp-router | 核心功能，完整借鉴 |
| 工作区管理 | P1 | mcp-router | 工作区↔任务环境概念 |
| 本地HTTP端点 | P1 | mcp-router | IDE统一连接入口 |
| 工具粒度开关 | P1 | mcp-router | 细粒度MCP控制 |
| 日志与统计 | P2 | mcp-router | MCP调用记录 |
| Hook系统 | P2 | mcp-router | 请求拦截 |
| Platform API抽象 | P1 | mcp-router | 架构基础设计 |
| CLI桥接工具 | P2 | mcp-router | 协议适配 |
| 云同步→平台同步 | P2 | mcp-router改进 | 替换为平台WebSocket同步 |
| 商城 | P2 | 原创 | 接入skills.sh+平台 |
| 君子订阅 | P2 | 原创 | 付费权益 |
| AI聚合搜索 | P3 | mcphub启发 | 向量语义推荐 |
| 公众号联动 | P3 | 原创 | 微信触发 |

---

## 十、总结与关键结论

1. **mcp-router 是目前架构设计最成熟的 MCP 管理工具**，有完整 ADR 文档、Clean Architecture、Platform API 抽象，工程质量高
2. **Electron vs Tauri**：mcp-router 用 Electron（安装包大），Aidean Desktop 用 Tauri（更轻量），但前端代码结构可以完全参考
3. **Platform API 设计是核心借鉴点**：用 `AideanAPI` 接口抽象所有 Tauri 调用，预留未来 Web 版扩展能力
4. **模块化架构（ADR）直接采用**：modules/infrastructure/ui/utils 四层分离，每个模块自包含（service + repository + ipc + types）
5. **工作区概念升级为任务环境**：mcp-router 的工作区只管 MCP，Aidean Desktop 的任务环境包含 Skills+MCP+Agent 组合，维度更丰富
6. **本地 HTTP 端点是重要基础设施**：内置 HTTP 服务器让 IDE 无需配置桥接工具直接连接，大幅降低用户门槛
7. **License 注意**：mcp-router 使用 Sustainable Use License（非完全开源，商业使用需授权），Aidean Desktop 参考其架构思路即可，不直接复用代码

---

## 十、Aidean Desktop 基于 mcp-router 的完善方案

### 10.1 架构设计继承与扩展

#### 10.1.1 继承 mcp-router 的架构优势

| mcp-router 架构特点 | Aidean Desktop 继承方式 | 扩展方向 |
|---|---|---|
| **Clean Architecture ADR** | 完全继承，采用 modules/infrastructure/ui/utils 四层架构 | 增加 platform_sync 模块处理平台联动 |
| **Platform API 抽象层** | 继承设计思想，实现 `AideanAPI` 接口 | 扩展支持 Tauri 和 Web 双端运行 |
| **模块化自包含结构** | 每个功能模块自包含（service + repository + ipc + types）| 新增 marketplace/environment/companion 模块 |
| **IPC 类型安全** | 前后端共享类型定义 | 扩展支持 WebSocket 通信 |
| **monorepo 结构** | pnpm workspace，桌面端+网页端+伴侣插件共享类型 | 增加 companion 插件包 |
| **本地 HTTP 服务器** | 继承内置 HTTP 端点设计（端口 3283）| 扩展支持 Skills/MCP/Agent 统一聚合 |
| **Hook 系统** | 继承 MCP 请求/响应拦截钩子 | 扩展支持 Skills 和 Agent 的 Hook |

#### 10.1.2 扩展架构：平台联动与会员体系

```
┌─────────────────────────────────────────────────────────────────┐
│                    Aidean Desktop 扩展架构                        │
├─────────────────────────────────────────────────────────────────┤
│  前端（React + TypeScript + Tailwind CSS）                        │
│  ├── 首页/商城/收藏夹/任务环境（扩展 mcp-router 模式）              │
│  ├── MCP 管理（继承 mcp-router）                                  │
│  ├── Skills 管理（继承 mcp-router）                               │
│  ├── Agent 管理（新增）                                           │
│  ├── 会员中心（新增）                                             │
│  └── 设置（继承 + 扩展平台联动）                                   │
├─────────────────────────────────────────────────────────────────┤
│  Platform API（继承 mcp-router 设计）                             │
│  ├── app（应用管理）                                              │
│  ├── auth（认证授权）                                             │
│  ├── mcp（MCP 服务器管理）                                        │
│  ├── skills（Skills 管理）                                        │
│  ├── agent（Agent 管理，新增）                                    │
│  ├── environment（任务环境，新增）                                │
│  ├── marketplace（商城，新增）                                    │
│  ├── subscription（君子订阅，新增）                               │
│  ├── platform_sync（平台同步，新增）                              │
│  └── companion（伴侣插件，新增）                                  │
├─────────────────────────────────────────────────────────────────┤
│  Tauri 后端（Rust）                                               │
│  ├── modules/（继承 mcp-router 目录结构）                          │
│  │   ├── mcp/（继承）                                             │
│  │   ├── skills/（继承）                                          │
│  │   ├── workspace/（继承，升级为任务环境）                        │
│  │   ├── mcp_runtime/（继承 HTTP 服务）                           │
│  │   ├── mcp_logger/（继承日志）                                  │
│  │   ├── workflow/（继承 Hook 系统）                              │
│  │   ├── agent/（新增）                                           │
│  │   ├── environment/（新增：任务环境管理）                        │
│  │   ├── marketplace/（新增：商城数据）                            │
│  │   ├── subscription/（新增：会员权益）                           │
│  │   ├── platform_sync/（新增：平台同步服务）                      │
│  │   └── companion/（新增：伴侣插件 WebSocket）                    │
│  ├── infrastructure/（继承）                                      │
│  │   ├── database/（SQLite 数据访问）                             │
│  │   └── ipc.rs（IPC 通信）                                       │
│  └── ui/（继承）                                                  │
│      ├── menu.rs（菜单）                                          │
│      └── tray.rs（系统托盘）                                      │
├─────────────────────────────────────────────────────────────────┤
│  平台联动层（新增）                                               │
│  ├── 网页端 API 客户端                                           │
│  ├── WebSocket 服务（伴侣插件）                                  │
│  └── Deep Link 处理器                                            │
├─────────────────────────────────────────────────────────────────┤
│  本地 HTTP 服务（继承 mcp-router）                                │
│  └── 统一聚合端点（Skills + MCP + Agent）                          │
└─────────────────────────────────────────────────────────────────┘
```

### 10.2 核心功能对比与扩展

#### 10.2.1 功能对比矩阵

| 功能模块 | mcp-router | Aidean Desktop | 差异说明 |
|---|---|---|---|
| **MCP 服务器管理** | ✅ 添加/启动/停止/编辑/删除 | ✅ 继承 + DXT/JSON/Manual | 完全继承，增加自动发现 |
| **工作区管理** | ✅ 工作区 + 项目分组 | ✅ 升级为任务环境 | 工作区→任务环境（Skills+MCP+Agent）|
| **工具粒度开关** | ✅ 单个工具启用/禁用 | ✅ 继承 | 直接借鉴 |
| **本地 HTTP 端点** | ✅ 端口 3283 | ✅ 继承 + 扩展 | 统一聚合 Skills+MCP+Agent |
| **Hook 系统** | ✅ MCP 请求/响应拦截 | ✅ 继承 + 扩展 | 扩展支持 Skills/Agent |
| **Skills 管理** | ✅ 基础列表 | ✅ 继承 + 商城 + 收藏夹 | 增加收藏夹、商城集成 |
| **Agent 管理** | ❌ 无 | ✅ 新增 | Agent 收藏夹、配置管理 |
| **任务环境** | ❌ 无（只有工作区）| ✅ 新增 | Skills+MCP+Agent 组合一键应用 |
| **商城** | ❌ 无 | ✅ 新增 | 接入 skills.sh/平台数据 |
| **收藏夹** | ❌ 无 | ✅ 新增 | 多维度收藏夹系统 |
| **君子订阅** | ❌ 无 | ✅ 新增 | 付费权益体系 |
| **AI 聚合搜索** | ❌ 无 | ✅ 新增 | 语义搜索、智能推荐 |
| **平台联动** | ❌ 无 | ✅ 新增 | 网页端双向同步、公众号 |
| **伴侣插件** | ❌ 无 | ✅ 新增 | VS Code/Cursor 插件通信 |
| **代币体系** | ❌ 无 | ✅ 新增 | AID Token 空投激励 |
| **CLI 桥接工具** | ✅ stdio↔HTTP 双向桥接 | ✅ 继承 | 伴侣插件的协议适配参考 |
| **日志与统计** | ✅ MCP 调用日志 + d3 词云 | ✅ 继承 + 扩展 | 扩展 Skills/Agent 日志 |
| **云同步** | ✅ 配置跨设备同步 | ✅ 改为平台同步 | 替换为网页端双向同步 |
| **Platform API** | ✅ 抽象层设计 | ✅ 完全继承 | 预留 Web 版扩展能力 |

#### 10.2.2 核心问题演变

**mcp-router 解决的核心问题**：
> AI 编程工具用户的 **MCP 服务器碎片化痛点** —— 各 IDE/工具各自维护 MCP 配置，缺乏统一管理入口，上下文爆炸

**Aidean Desktop 解决的核心问题**：
> AI 编程工具用户的 **Skills + MCP + Agent 生态管理痛点** —— 发现、安装、组合、同步、付费

```
mcp-router 用户痛点                    Aidean Desktop 用户痛点
─────────────────────────────────    ─────────────────────────────────
MCP 服务器碎片化          ────────→   Skills + MCP + Agent 三重碎片化
上下文爆炸                ────────→   缺乏场景化组合方案
工作区隔离需求            ────────→   网页端与桌面端数据割裂
协议壁垒（stdio↔HTTP）    ────────→   缺乏个性化推荐
隐私安全                  ────────→   优质内容缺乏付费机制
```

### 10.3 功能清单完善（Aidean Desktop 版）

#### 10.3.1 继承自 mcp-router 的功能（P0）

| 功能 | 说明 | 继承方式 |
|---|---|---|
| MCP 服务器管理（CRUD） | 添加/启动/停止/编辑/删除 | 借鉴架构设计 |
| 工作区管理 | 工作区 + 项目分组概念 | 升级为任务环境 |
| 工具粒度开关 | 单个 MCP 工具启用/禁用 | 直接借鉴 |
| 本地 HTTP 端点 | 内置 HTTP 服务器（端口 3283）| 直接借鉴 |
| Hook 系统 | MCP 请求/响应拦截钩子 | 借鉴设计思想 |
| Skills 管理 | 基础 Skills 列表 | 扩展为完整管理 |
| 日志与统计 | MCP 调用日志 + d3 词云 | 扩展 Skills/Agent 日志 |
| Platform API 抽象 | 屏蔽 Electron/Web 差异 | 实现 `AideanAPI` 接口 |
| Clean Architecture | modules/infrastructure/ui/utils | 完全继承架构分层 |
| 模块化自包含 | 每个模块自包含 | 完全继承设计模式 |

#### 10.3.2 新增核心功能（P0）

| 功能 | 说明 | 设计要点 |
|---|---|---|
| **Agent 管理** | Agent 收藏夹、配置管理 | Agent 定义文件管理 |
| **任务环境** | Skills+MCP+Agent 组合，一键应用 | 环境模板、场景化预设 |
| **收藏夹系统** | 多维度收藏夹（Skills/MCP/Agent/环境） | 支持系统/IDE/协议标识 |
| **商城扩展** | 接入平台数据、skills.sh | 君子订阅专属内容 |
| **自动更新** | Skills/MCP 自动检测和更新 | 更新通知、批量更新 |
| **平台同步** | 网页端双向同步 | WebSocket + Deep Link |

#### 10.3.3 新增会员功能（君子订阅）

| 功能 | 免费版 | 君子订阅 |
|---|---|---|
| 工作区/任务环境数量 | 2个 | 无限 |
| MCP 服务器数量 | 5个 | 无限 |
| 工具粒度控制 | 基础 | 高级（按场景预设）|
| 商城访问 | 公开 Skills/MCP | + 私有 Skills/MCP |
| 聚合搜索 | 基础搜索 | AI 语义搜索 |
| Hook 系统 | 基础 Hook | 自定义 Hook |
| 一键导入网页配置 | ❌ | ✅ |
| 公众号一键开发 | ❌ | ✅ |
| 高分方案推荐 | ❌ | ✅ |
| 订阅推送/邮箱推送 | ❌ | ✅ |
| AID 代币空投 | ❌ | 每月赠送 |

### 10.4 交互体验优化

#### 10.4.1 页面结构演变

**mcp-router 页面结构**：
```
Sidebar（左侧导航）
├── Home（首页/仪表盘）
├── MCP（MCP服务器管理）
│   ├── 服务器列表
│   ├── 工具目录（Tool Catalog）
│   └── 日志
├── Workspace（工作区管理）
├── Projects（项目管理）
├── Skills（Skills管理）
├── Workflow（工作流+Hook）
└── Setting（设置）
```

**Aidean Desktop 页面结构**：
```
Sidebar（左侧导航，继承 mcp-router）
├── 首页（控制台）← 四大收藏夹快捷入口 + 最近更新 + AI推荐
├── 商城（探索）← Skills/MCP/Agent/任务环境 分类浏览
│   ├── 精选（继承 ClawHub/skills.sh）
│   ├── 搜索（AI语义搜索）
│   └── 平台推荐（新增）
├── MCP 管理（继承 mcp-router）
│   ├── 服务器列表
│   ├── 工具目录（词云可视化）
│   └── 日志
├── Skills 管理（继承 + 扩展）
├── Agent 管理（新增）
├── 收藏夹（新增）← 统一管理所有收藏
├── 任务环境（新增）← 场景化组合管理（继承工作区概念）
└── 设置（继承 + 扩展）
    ├── 通用设置
    ├── 平台联动（新增）
    ├── 工具检测
    ├── 会员/关于（新增）
```

#### 10.4.2 核心操作流程

**从商城安装 MCP 并添加到任务环境**：
```
1. 用户进入商城页，浏览 MCP 分类或搜索关键词
2. 点击 MCP 卡片查看详情（继承 mcp-router 设计）
3. 点击「安装」按钮
4. 选择安装方式：DXT包 / JSON配置 / 手动输入
5. 自动配置并启动 MCP 服务器
6. 提示安装成功，可选择添加到任务环境
7. 选择现有环境或创建新环境
（全程：5-6步，<30秒）
```

**一键应用任务环境到项目级**：
```
1. 用户在任务环境页选择目标环境（继承工作区概念）
2. 点击「一键应用」
3. 选择应用范围：全局（系统级）/ 项目级
4. 如选择项目级，弹出目录选择器确认项目路径
5. 桌面端应用 Skills（symlink/junction/copy）
6. 桌面端应用 MCP 配置（写入 servers.json）
7. 桌面端应用 Agent 配置
8. 显示应用成功提示，记录应用历史
（全程：4-5步，<15秒）
```

### 10.5 UI设计继承

#### 10.5.1 继承 mcp-router 的设计系统

| 设计元素 | mcp-router | Aidean Desktop |
|---|---|---|
| **基础样式** | Tailwind CSS + shadcn/ui | 完全继承 |
| **UI 组件库** | shadcn/ui（基于 Radix UI）| 完全继承 |
| **图标** | Lucide React（推断）| 完全继承 |
| **布局** | Sidebar 左侧导航 | 完全继承 |
| **词云可视化** | react-wordcloud + d3-cloud | 继承 + 扩展 Skills/Agent |
| **状态指示** | 颜色徽章（运行/停止/错误）| 完全继承 |
| **主题** | 暗色/亮色切换 | 完全继承 |

#### 10.5.2 新增设计元素

```typescript
// 继承 shadcn/ui + Tailwind 配置，扩展品牌色
const brandColors = {
  // 继承 mcp-router 基础色
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
  'EnvironmentCard',      // 任务环境卡片（扩展 WorkspaceCard）
  'MarketplaceItem',      // 商城项目卡片
  'McpServerCard',        // MCP服务器卡片（继承 mcp-router）
  'ToolCatalogCloud',     // 工具目录词云（继承 mcp-router）
  'SyncStatusBadge',      // 同步状态徽章
  'SubscriptionBadge',    // 会员等级徽章
  'TokenBalance',         // 代币余额显示
  'PlatformSyncButton',   // 平台同步按钮
]
```

### 10.6 技术栈复用清单

#### 10.6.1 完全复用的技术选型（与 mcp-router 一致）

```json
{
  "dependencies": {
    "react": "^19.x",
    "react-dom": "^19.x",
    "react-router-dom": "^5.3",
    "tailwindcss": "^3.4.18",
    "zustand": "latest",
    "@radix-ui/react-*": "latest",
    "class-variance-authority": "latest",
    "clsx": "latest",
    "tailwind-merge": "latest",
    "lucide-react": "latest",
    "react-wordcloud": "^1.2",
    "d3-cloud": "latest"
  },
  "devDependencies": {
    "typescript": "^5.9.3",
    "@types/node": "latest",
    "@types/react": "latest"
  }
}
```

#### 10.6.2 新增依赖

```json
{
  "dependencies": {
    // Tauri 相关（替代 Electron）
    "@tauri-apps/api": "^2.9.x",
    "@tauri-apps/plugin-dialog": "^2.x",
    "@tauri-apps/plugin-opener": "^2.x",
    "@tauri-apps/plugin-updater": "^2.x",
    
    // 状态管理增强
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

### 10.7 Platform API 设计（核心继承点）

#### 10.7.1 继承 mcp-router 的 Platform API 设计

mcp-router 的 Platform API 抽象层是其核心亮点，Aidean Desktop 完全继承并扩展：

```typescript
// Aidean Desktop Platform API（参考 mcp-router 设计）
interface AideanAPI {
  // 继承自 mcp-router
  app: AppAPI;           // 应用管理（版本/更新/Token）
  auth: AuthAPI;         // 账号认证（JWT/会员状态）
  mcp: McpAPI;           // MCP服务器管理
  skills: SkillsAPI;     // Skills管理
  workspace: WorkspaceAPI; // 工作区管理
  settings: SettingsAPI; // 应用设置
  log: LogAPI;           // 日志管理
  
  // 新增模块
  agent: AgentAPI;       // Agent管理
  environment: EnvAPI;   // 任务环境（升级 workspace）
  marketplace: MarketAPI;// 商城
  subscription: SubAPI;  // 君子订阅
  platform_sync: SyncAPI; // 平台同步（替代 cloud-sync）
  companion: CompanionAPI; // 伴侣插件
  token: TokenAPI;       // AID代币
}

// 实现层（Tauri环境）
class TauriAideanAPI implements AideanAPI {
  mcp = {
    list: () => invoke<McpServer[]>('list_mcp_servers'),
    create: (input) => invoke('create_mcp_server', { input }),
    start: (id) => invoke('start_mcp_server', { id }),
    stop: (id) => invoke('stop_mcp_server', { id }),
    delete: (id) => invoke('delete_mcp_server', { id }),
    // ... 继承 mcp-router 的完整 API
  };
  
  environment = {
    list: () => invoke<Environment[]>('list_environments'),
    create: (input) => invoke('create_environment', { input }),
    apply: (id, scope) => invoke('apply_environment', { id, scope }),
    // ... 新增任务环境 API
  };
  
  // ... 其他 API 实现
}

// 预留Web实现（未来扩展）
class RemoteAideanAPI implements AideanAPI {
  mcp = {
    list: () => fetch('/api/mcp').then(r => r.json()),
    // ... Web 版 API 实现
  };
}
```

#### 10.7.2 模块化架构映射

```
mcp-router modules/          →  aidean-desktop src-tauri/src/modules/
├── auth/                    →  auth/（JWT + 平台账号）
├── mcp-server-manager/      →  mcp/（MCP服务器管理）
├── mcp-server-runtime/      →  mcp_runtime/（HTTP端点服务）
├── mcp-logger/              →  logger/（MCP日志）
├── mcp-apps-manager/        →  ide/（IDE配置管理）
├── skills/                  →  skills/（Skills管理）
├── workspace/               →  workspace/ → environment/（升级为任务环境）
├── projects/                →  project/（项目管理）
├── workflow/                →  workflow/（Hook系统）
├── cloud-sync/              →  platform_sync/（平台同步，替代云同步）
├── settings/                →  settings/（应用设置）
└── system/                  →  system/（系统信息）
新增模块：
                             →  agent/（Agent管理）
                             →  marketplace/（商城数据）
                             →  companion/（伴侣插件WS）
                             →  subscription/（会员权益）
                             →  token/（AID代币）
```

### 10.8 开发优先级建议

#### Phase 1: MVP（4周）—— 继承 mcp-router 核心架构

| 周次 | 任务 | 参考 mcp-router |
|---|---|---|
| Week 1 | 搭建 Tauri + React + Tailwind + shadcn/ui 架构 | 复用 Clean Architecture ADR |
| Week 2 | 实现 Platform API 抽象层 | 复用 Platform API 设计 |
| Week 3 | 实现 MCP 服务器管理（CRUD + HTTP端点）| 借鉴 mcp-router 架构 |
| Week 4 | 实现 Skills 管理 + 工作区概念 | 借鉴模块化设计 |

#### Phase 2: 核心功能（6周）—— 新增差异化功能

| 周次 | 任务 | 说明 |
|---|---|---|
| Week 5-6 | Agent 管理 + 任务环境 | 升级工作区为任务环境 |
| Week 7-8 | 收藏夹系统 + 商城 | 接入 skills.sh/平台数据 |
| Week 9-10 | Hook 系统 + 日志统计 | 继承 mcp-router Hook |

#### Phase 3: 高级功能（4周）—— 会员体系

| 周次 | 任务 | 说明 |
|---|---|---|
| Week 11-12 | 君子订阅 + 平台同步 | 会员系统、网页端同步 |
| Week 13-14 | 伴侣插件 + 代币体系 | WebSocket 通信、AID Token |

### 10.9 总结

#### 10.9.1 mcp-router 对 Aidean Desktop 的价值

| 维度 | 价值 |
|---|---|
| **架构设计** | Clean Architecture ADR 文档完整，工程质量极高，可直接参考架构分层 |
| **Platform API** | 抽象层设计思想是核心借鉴点，预留 Web 版扩展能力 |
| **模块化架构** | modules/infrastructure/ui/utils 四层分离，每个模块自包含 |
| **MCP 管理** | 完整的 MCP 服务器生命周期管理设计参考 |
| **本地 HTTP 端点** | 内置 HTTP 服务器让 IDE 无需配置桥接工具直接连接 |
| **Hook 系统** | MCP 请求/响应拦截钩子设计，可用于日志和监控 |
| **CLI 桥接** | stdio↔HTTP 双向桥接设计，伴侣插件协议适配参考 |

#### 10.9.2 Aidean Desktop 的差异化定位

```
市场定位对比：

mcp-router         →   「MCP 管理平台」
                      （面向 MCP 生态，解决服务器管理/工作区隔离）
                      
Aidean Desktop     →   「AI Skills & MCP 生态中枢」
                      （面向 Skills + MCP + Agent 生态，解决发现/组合/同步/付费）
```

#### 10.9.3 关键成功因素

1. **架构继承**：借鉴 mcp-router Clean Architecture ADR，确保代码质量和可维护性
2. **Platform API 设计**：用 `AideanAPI` 接口抽象所有 Tauri 调用，预留未来 Web 版扩展
3. **本地 HTTP 端点**：内置 HTTP 服务器（端口 3283），IDE 统一连接入口
4. **模块化架构**：每个功能模块自包含，便于团队协作和独立测试
5. **工作区升级**：将 mcp-router 的工作区概念升级为任务环境（Skills+MCP+Agent 组合）
6. **License 注意**：mcp-router 使用 Sustainable Use License，Aidean Desktop 仅参考架构思路，不直接复用代码

---

> **文档版本**: v2.1
> **最后更新**: 2026-03-26

---

## 十一、MCP配置路径与Skills双协议参考

> 完整路径表见：`.example/config-paths-reference.md`

### 11.1 mcp-router的MCP配置实现方式

mcp-router 通过**本地HTTP端点**统一代理，不直接写IDE配置文件：

```
mcp-router运行后暴露HTTP端点：
  http://localhost:3283/mcp           ← 所有服务器
  http://localhost:3283/mcp/{group}   ← 特定分组
  http://localhost:3283/mcp/{server}  ← 单个服务器
  http://localhost:3283/mcp/$smart    ← 智能路由

IDE配置（以Cursor为例）：
  ~/.cursor/mcp.json
  {
    "mcpServers": {
      "mcp-router": {
        "url": "http://localhost:3283/mcp"
      }
    }
  }
```

### 11.2 各IDE MCP配置文件路径（Aidean Desktop需写入）

| IDE | macOS/Linux路径 | Windows路径 | 写入字段 |
|---|---|---|---|
| **Claude Desktop** | `~/Library/Application Support/Claude/claude_desktop_config.json` | `%APPDATA%\Claude\claude_desktop_config.json` | `mcpServers` |
| **Claude Code** | `~/.claude.json` | `%USERPROFILE%\.claude.json` | `mcpServers` |
| **Cursor** | `~/.cursor/mcp.json` | `%USERPROFILE%\.cursor\mcp.json` | `mcpServers` |
| **Windsurf** | `~/.codeium/windsurf/mcp_config.json` | `%USERPROFILE%\.codeium\windsurf\mcp_config.json` | `mcpServers` |
| **OpenCode** | `~/.config/opencode/config.json` | `%APPDATA%\opencode\config.json` | `mcp`嵌套字段 |
| **Zed** | `~/.config/zed/settings.json` | `%APPDATA%\Zed\settings.json` | `context_servers` |

### 11.3 mcp-router的MCP服务器存储

mcp-router 将MCP服务器配置存储在 **本地SQLite数据库** 和 `mcp_settings.json` 文件：

```json
// mcp_settings.json 格式
{
  "mcpServers": {
    "server-name": {
      "command": "npx",
      "args": ["-y", "package-name"],
      "env": { "API_KEY": "${API_KEY}" }
    },
    "remote-server": {
      "url": "http://localhost:3000/mcp",
      "headers": { "Authorization": "Bearer token" }
    }
  }
}
```

### 11.4 Skills路径（mcp-router扩展方向）

mcp-router 当前**不管理Skills**，Aidean Desktop需扩展的Skills路径支持：

| 协议 | 路径 | 说明 |
|---|---|---|
| **Anthropic** | `~/.cursor/skills/{name}/SKILL.md` | 每个Skill独立目录，渐进式加载 |
| **Anthropic** | `~/.claude/skills/{name}/SKILL.md` | Claude Code原生路径 |
| **OpenAI/通用** | `~/.agent/skills/{name}/SKILL.md` | openskills通用路径 |
| **项目级** | `./.claude/skills/{name}/SKILL.md` | 项目本地Skills |

### 11.5 MCP协议类型说明

```
stdio协议（本地进程）：
  command: "npx" / "uvx" / "python" / "node"
  args: ["-y", "package-name", "arg1"]
  env: { "KEY": "value" }
  通信：主进程通过stdin/stdout与子进程通信

HTTP/SSE协议（远程服务）：
  url: "http://hostname:port/path"
  headers: { "Authorization": "Bearer token" }
  通信：HTTP请求或Server-Sent Events长连接

WebSocket协议（双向通信）：
  url: "ws://hostname:port/path"
  通信：WebSocket全双工连接
```
> **状态**: 基于 mcp-router 完善的 Aidean Desktop 设计方案