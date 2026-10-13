# emp 竞品深度分析报告

> 来源：https://github.com/empjs/emp
> 分析日期：2026-03-26
> 当前版本：@empjs/cli v3.12.4 | License：MIT
> 定位：**微前端构建框架**（非Skills管理工具，参考价值在Skills生态实践）

---

## 一、架构设计

### 1.1 产品形态

emp **不是桌面端工具，也不是Skills管理器**，而是一个**微前端构建框架**（类似 Vite/Webpack，基于 Rspack + Module Federation）。

它对 Aidean Desktop 的参考价值在于：**作为框架如何内置并管理 Skills**，是「框架级Skills集成」的最佳实践案例。

### 1.2 技术栈

| 层级 | 技术 | 版本 | 说明 |
|---|---|---|---|
| **形态** | 构建框架 + CLI | - | 类似Vite，`emp dev/build` |
| **核心引擎** | Rspack | 1.7.4 | Rust编写的Webpack兼容构建器 |
| **模块联邦** | Module Federation | - | 微前端核心技术 |
| **CLI框架** | commander | 11.1.0 | 命令行 |
| **语言** | TypeScript | ^5.9.2 | |
| **构建工具** | tsup / rslib | - | 打包CLI本身 |
| **插件体系** | Rspack插件 + empChain | - | webpack-chain风格 |
| **状态管理** | @empjs/valtio | - | Valtio增强版 |
| **样式** | Tailwind CSS v4 | - | 官方插件支持 |
| **代码质量** | Biome | - | Lint + Format |
| **包管理** | pnpm monorepo | >=8 | 30个子包 |
| **License** | MIT | - | 可商业使用 |

### 1.3 Monorepo 结构（30个包）

```
emp/
├── packages/
│   ├── cli/                  # @empjs/cli（核心，v3.12.4）
│   ├── emp-chain/            # webpack-chain风格配置
│   ├── emp-share/            # 共享工具
│   ├── emp-polyfill/         # Polyfill
│   ├── plugin-react/         # React插件
│   ├── plugin-vue2/          # Vue2插件
│   ├── plugin-vue3/          # Vue3插件
│   ├── plugin-tailwindcss/   # Tailwind v3插件
│   ├── plugin-tailwindcss3/  # Tailwind v3插件
│   ├── plugin-tailwindcss4/  # Tailwind v4插件（最新）
│   ├── plugin-lightningcss/  # LightningCSS插件
│   ├── plugin-postcss/       # PostCSS插件
│   ├── plugin-stylus/        # Stylus插件
│   ├── bridge-react/         # React跨版本桥接
│   ├── bridge-vue2/          # Vue2桥接
│   ├── bridge-vue3/          # Vue3桥接
│   ├── cdn-react-17/         # React 17 CDN包
│   ├── cdn-react-18/         # React 18 CDN包
│   ├── cdn-react-19/         # React 19 CDN包
│   └── ...（更多cdn包）
├── skills/
│   └── empjs/                # EMP官方Skills包
│       ├── SKILL.md          # 主技能文件（220行）
│       ├── references/       # 10个参考文档
│       │   ├── empconfig.md  # emp.config.ts配置参考
│       │   ├── examples.md   # 使用示例
│       │   ├── react-performance.md
│       │   ├── runtime-build.md
│       │   ├── startkit.md   # 脚手架
│       │   ├── tailwind-v4.md
│       │   ├── valtio-api.md
│       │   ├── valtio-examples.md
│       │   ├── valtio-skill.md
│       │   └── valtio-usage.md
│       ├── scripts/          # 可执行脚本
│       │   └── create-emp-react19.js  # React 19脚手架生成器
│       ├── .agent/skills/empjs/  # .agent路径的symlink/copy
│       ├── .agents/              # agents路径
│       └── .shared/skills/       # shared路径
├── .trae/
│   └── skills/
│       └── emp-best-practices/   # Trae专用Skills
│           ├── SKILL.md
│           └── references/
└── projects/                 # 演示项目（微前端示例）
```

### 1.4 Skills内部结构（核心亮点）

```
skills/empjs/
├── SKILL.md              # 主入口（frontmatter + 内容）
├── references/           # 10个细分参考文档（本地化内容）
│   ├── empconfig.md      # 配置参考
│   ├── valtio-api.md     # 状态管理API
│   └── ...（8个更多）
├── scripts/              # 可执行脚本
│   └── create-emp-react19.js  # 脚手架生成器
├── .agent/skills/empjs/  # openskills universal路径
├── .agents/              # agents路径
└── .shared/skills/       # 共享路径
```

**多路径设计**：同一个Skill内容，通过不同目录路径适配不同IDE的发现机制。

---

## 二、核心功能分析

### 2.1 emp作为构建框架解决的问题

1. **微前端配置复杂**：Module Federation配置繁琐，emp提供约定大于配置的简化方案
2. **多框架互操作**：React/Vue2/Vue3混用时的bridge层封装
3. **构建性能**：基于Rspack（Rust编写），比webpack快5-10倍
4. **CDN依赖管理**：多版本React/Vue CDN包统一管理

### 2.2 emp Skills的实践价值（对Aidean的参考意义）

emp 展示了**框架/生态级Skills集成的最佳实践**：

1. **Skills本地化**：将在线文档内容内嵌到Skills中（references/目录），AI无需联网查文档
2. **可执行脚本**：Skills不只是文档，还包含可执行脚本（scripts/create-emp-react19.js）
3. **多IDE路径适配**：同一Skill通过不同目录结构适配Cursor/Trae/Claude/OpenCode
4. **细粒度references**：将大文档拆分为多个references/*.md，AI按需引用

---

## 三、功能清单

### 3.1 emp框架功能（构建框架视角）

| 功能 | 说明 | 优先级 |
|---|---|---|
| Rspack构建 | 基于Rust的高性能构建 | P0 |
| Module Federation | 微前端模块共享 | P0 |
| React/Vue多框架支持 | 插件化支持React 16/17/18/19 + Vue2/3 | P0 |
| Tailwind CSS v4 | 官方插件，开箱即用 | P0 |
| @empjs/valtio | 状态管理（Valtio增强版）| P1 |
| CDN依赖管理 | 多版本CDN包统一管理 | P1 |
| 跨框架bridge | React↔Vue桥接 | P1 |
| webpack-chain插件 | 通用插件接口 | P1 |
| emp dev/build CLI | 开发/构建命令 | P0 |

### 3.2 emp Skills功能（Skills实践视角）

| 功能 | 说明 | 优先级（对Aidean参考价值）|
|---|---|---|
| SKILL.md主文件 | 框架文档内嵌为AI技能 | 极高 |
| references/分模块 | 细粒度文档，按需引用 | 极高 |
| scripts/脚手架 | Skills内含可执行脚本 | 高 |
| 多IDE路径适配 | .agent/.agents/.shared/.trae | 高 |
| 本地化内容 | 无需联网，AI直接读取 | 高 |
| emp-best-practices | Trae专用技能变体 | 中 |

---

## 四、功能差异分析

### 4.1 emp Skills实践的独特贡献

| 独特功能 | 说明 | 对Aidean参考价值 |
|---|---|---|
| **框架级官方Skills** | 框架官方维护配套Skills，与代码版本同步 | 极高 |
| **本地化references** | 将文档内嵌到Skills，AI无需联网 | 极高 |
| **可执行脚本Skills** | scripts/内含脚手架生成器 | 高 |
| **多路径自动适配** | .agent/.agents/.shared覆盖所有主流IDE | 高 |
| **细粒度文档拆分** | 10个references文件，AI按需加载 | 高 |
| **IDE特定变体** | emp-best-practices专为Trae优化 | 中 |
| **与npm包版本绑定** | Skills和@empjs/cli版本一起发布 | 中 |

### 4.2 emp缺失功能（Aidean Desktop视角）

| 缺失功能 | Aidean Desktop 机会点 |
|---|---|
| **Skills商城/分发平台** | Aidean平台作为框架级Skills的分发渠道 |
| **跨框架Skills安装** | 一键安装empjs Skills到用户项目 |
| **版本追踪** | 框架升级时Skills自动跟进 |
| **MCP配套** | 框架级MCP工具（如构建状态MCP）|

---

## 五、功能迭代分析

### 5.1 版本节奏

```
@empjs/cli v3.x  持续迭代中
Skills/empjs  与cli版本同步维护
主要更新方向：
- Rspack版本升级（跟随Rspack发布节奏）
- React/Vue新版本支持
- 新插件（Tailwind v4、LightningCSS等）
- Skills内容更新（与框架新特性同步）
```

### 5.2 Skills演进模式

```
早期  → 无Skills支持，用户自行查文档
  ↓
中期  → 添加skills/empjs/目录，内嵌框架文档
  ↓
近期  → 多IDE路径适配，Trae专用变体，脚手架脚本
  ↓
趋势  → 框架文档越来越多迁移到Skills格式
```

---

## 六、交互体验分析

### 6.1 Skills使用流程

**在Cursor中使用emp Skills**
```
1. 项目根目录有 skills/empjs/SKILL.md
2. 在Cursor对话中 @skills/empjs/SKILL.md
3. AI自动读取EMP技能内容
4. 按需引用 references/ 下的细分文档
```

**在Claude Code中使用**
```bash
# 方式1：全局安装（openskills）
npx openskills install empjs/emp
npx openskills sync

# 方式2：直接引用（项目已包含）
# .claude/skills/empjs/SKILL.md 自动被发现
```

**在Trae/OpenCode中使用**
```
.trae/skills/emp-best-practices/SKILL.md
自动被IDE发现并注册到可用技能列表
```

### 6.2 Skills设计亮点

| 设计点 | 说明 |
|---|---|
| **SKILL.md frontmatter** | name + description精确描述触发场景 |
| **references分模块** | 每个细分功能独立.md文件，不臃肿 |
| **内嵌脚手架脚本** | Skills内有可执行Node.js脚本 |
| **多路径冗余** | 同一内容在多个路径各放一份，覆盖所有IDE |
| **本地化文档** | API文档、示例、配置参考全部本地化 |

---

## 七、UI设计风格

### 7.1 Skills内容质量标准（参考价值）

emp Skills展示了高质量Skills的内容标准：

```
优质SKILL.md结构：
├── frontmatter（name + description）
├── 快速开始（最少配置）
├── 完整配置参考
├── 常见场景示例
├── 进阶用法
└── 引用 references/ 细分文档

优质references/结构：
├── API参考文档（valtio-api.md）
├── 使用示例（valtio-examples.md）
├── 最佳实践（react-performance.md）
└── 完整示例（examples.md）
```

---

## 八、对 Aidean Desktop 的借鉴方案

### 8.1 框架级Skills生态策略

emp的最大启示：**框架和工具应该提供官方配套Skills**，这是Skills生态的重要内容来源。

```
Aidean Desktop 生态策略：

官方维护Skills包：
├── 主流框架（React/Vue/Next.js/Nuxt等）
├── 主流工具（Docker/CI-CD/数据库等）
├── 编程语言（Python/Go/Rust等）
└── 最佳实践（安全/性能/测试等）

鼓励框架方合作：
├── 框架官方在Aidean平台发布Skills
├── 与npm/pip版本同步更新
├── 平台提供「官方认证」标识
└── 君子订阅可获取框架专属私有Skills
```

### 8.2 Skills内容结构标准（参考emp）

```markdown
# Aidean平台 Skills内容标准

## 基础结构（参考emp/openskills）
---
name: skill-name
description: 一句话精确描述（用于AGENTS.md和商城搜索）
supportedAgents: [cursor, claude-code, opencode, windsurf]
category: framework|tool|language|practice
tags: [react, typescript, performance]
---

## 推荐内容结构（参考emp）
### 一、快速开始
### 二、核心配置
### 三、常见场景
### 四、最佳实践

## 推荐references/结构（参考emp）
references/
├── api.md          # API参考
├── examples.md     # 使用示例
├── config.md       # 配置说明
└── performance.md  # 性能优化

## 推荐scripts/结构（参考emp）
scripts/
├── setup.js        # 初始化脚本
└── generate.js     # 代码生成脚本
```

### 8.3 多IDE路径适配标准（参考emp）

```
# emp的多路径设计 → Aidean Desktop统一处理

emp当前方式（手动多份）：
├── skills/empjs/           # 项目根目录
├── .agent/skills/empjs/    # openskills universal
├── .agents/                # 其他agent
└── .trae/skills/emp-best-practices/  # Trae专用

Aidean Desktop统一方式（自动同步）：
1. 用户安装empjs Skill
2. 桌面端自动同步到所有已检测IDE
   ├── ~/.cursor/skills/empjs/         # Cursor
   ├── ~/.claude/skills/empjs/         # Claude Code
   ├── ~/.config/opencode/skills/empjs/ # OpenCode
   └── ~/.trae/skills/empjs/           # Trae
3. 无需手动维护多份副本
```

### 8.4 Skills质量评分体系（参考emp实践）

```typescript
// Aidean平台Skills质量评分维度
interface SkillQualityScore {
  hasDescription: boolean;        // SKILL.md有frontmatter描述
  hasQuickStart: boolean;         // 有快速开始章节
  hasReferences: boolean;         // 有references/细分文档
  hasScripts: boolean;            // 有可执行脚本（加分项）
  isLocalized: boolean;           // 内容本地化（无外部链接依赖）
  isOfficialMaintained: boolean;  // 框架/工具官方维护
  updateFrequency: number;        // 更新频率（月/次）
  supportedAgentCount: number;    // 支持IDE数量
}

// 评分结果用于：
// 1. 商城排序（高分优先展示）
// 2. 「官方认证」标识
// 3. 「精选推荐」筛选
// 4. 聚合搜索权重加成
```

### 8.5 Aidean Desktop 与框架生态联动设计

```
场景：用户在Aidean Desktop安装 empjs Skill

传统方式（无Aidean）：
1. 手动克隆emp仓库
2. 手动复制skills/empjs到各IDE目录
3. 手动更新AGENTS.md
4. 框架升级时手动重复上述步骤

Aidean Desktop方式：
1. 打开商城，搜索 "empjs"
2. 点击安装（一键）
3. 自动同步到所有已检测IDE
4. 订阅更新推送，@empjs/cli升级时收到通知
5. 一键更新（保持与框架版本同步）

增值：君子会员
- 获取emp官方私有Skills（内测功能/企业最佳实践）
- 订阅emp新版本推送
- AI自动分析项目，推荐最优emp配置
```

---

## 九、功能优先级矩阵

| 功能模块 | Phase | 来源 | 说明 |
|---|---|---|---|
| 框架级官方Skills认证 | P2 | emp启发 | 平台「官方认证」标识体系 |
| Skills内容质量评分 | P2 | emp启发 | 多维度评分，用于商城排序 |
| references/细分文档支持 | P1 | emp启发 | 商城展示Skills文件树 |
| scripts/可执行脚本支持 | P2 | emp启发 | Skills内含脚本，安全沙箱执行 |
| 多路径自动同步 | P1 | emp验证 | 取代emp的手动多份维护 |
| 框架版本联动更新 | P2 | emp启发 | 与npm版本绑定，自动推送更新通知 |
| 本地化内容验证 | P2 | emp启发 | 检测Skills是否依赖外部URL |
| 框架合作计划 | P3 | emp模式 | 邀请框架官方入驻平台 |

---

## 十、总结与关键结论

1. **emp不是竞品，是Skills生态实践的标杆案例**：它展示了框架级项目应该如何提供、维护和分发AI技能
2. **框架级Skills是商城的重要内容来源**：Aidean Desktop商城应重点引入主流框架的官方Skills，这是高质量内容的保证
3. **references/分模块是必须支持的结构**：商城展示时需要支持文件树浏览（参考skills-hub的SkillDetailView），让用户看到完整Skills内容结构
4. **可执行脚本Skills是差异化能力**：scripts/内的脚本让Skills不只是文档，而是可以直接执行的自动化能力，Aidean Desktop未来可以支持沙箱执行
5. **多路径手动维护是痛点**：emp团队需要手动维护.agent/.agents/.trae等多个路径副本，Aidean Desktop自动同步直接解决这个痛点
6. **本地化内容是质量标准**：empjs Skills将所有文档内嵌本地，AI无需联网，这应该成为Aidean平台Skills质量评分的重要维度
7. **MIT License**：emp代码和Skills内容均可自由使用，Aidean平台可以引入emp官方Skills作为平台精选内容

---

## 十、Aidean Desktop 基于 emp 的完善方案

### 10.1 架构设计继承与扩展

#### 10.1.1 继承 emp 的架构优势

| emp 架构特点 | Aidean Desktop 继承方式 | 扩展方向 |
|---|---|---|
| **Monorepo 结构** | 借鉴多包管理模式 | 平台 Skills 生态管理 |
| **Skills 本地化内容** | 核心借鉴点 | 本地化内容质量检测 |
| **references/ 分模块** | 完全继承 | 商城文件树展示 |
| **scripts/ 可执行脚本** | 借鉴脚本能力 | 沙箱安全执行 |
| **多 IDE 路径适配** | 自动同步取代手动 | 自动检测 + 一键同步 |
| **框架版本绑定** | 借鉴版本同步思想 | Skills 与 npm 版本联动 |
| **官方 Skills 认证** | 借鉴官方维护模式 | 平台「官方认证」体系 |
| **IDE 特定变体** | 借鉴适配策略 | 自动适配不同 IDE |
| **Rspack 高性能构建** | 技术参考 | 桌面端构建优化 |
| **MIT License** | 自由使用 | 商业使用无障碍 |

#### 10.1.2 扩展架构：框架级 Skills 生态中枢

```
┌─────────────────────────────────────────────────────────────────┐
│                    Aidean Desktop 扩展架构                        │
├─────────────────────────────────────────────────────────────────┤
│  前端（React + TypeScript + Tailwind CSS）                        │
│  ├── 首页（控制台）← 框架 Skills 推荐 + 最近更新                    │
│  ├── 商城（探索）← 框架/工具/语言/实践 分类                        │
│  │   ├── 官方认证（参考 emp 官方维护）                            │
│  │   ├── 框架级 Skills（React/Vue/Next.js）                       │
│  │   ├── 工具级 Skills（Docker/CI-CD）                            │
│  │   └── 最佳实践（安全/性能/测试）                               │
│  ├── Skills 管理（继承 emp 实践）                                 │
│  │   ├── 文件树浏览（references/ 展示）                           │
│  │   ├── 脚本执行（scripts/ 沙箱运行）                            │
│  │   ├── 本地化检测（无外部依赖）                                 │
│  │   └── 版本联动（与 npm 同步）                                  │
│  ├── MCP 管理                                                     │
│  ├── Agent 管理                                                   │
│  ├── 收藏夹                                                       │
│  ├── 任务环境                                                     │
│  └── 设置                                                         │
├─────────────────────────────────────────────────────────────────┤
│  Tauri 后端（Rust）                                               │
│  ├── modules/                                                     │
│  │   ├── skills/                                                  │
│  │   │   ├── installer.rs（安装逻辑）                             │
│  │   │   ├── file_tree.rs（文件树解析，参考 emp）                 │
│  │   │   ├── script_runner.rs（脚本沙箱执行）                     │
│  │   │   ├── localization_checker.rs（本地化检测）                │
│  │   │   └── version_sync.rs（版本联动）                          │
│  │   ├── marketplace/                                             │
│  │   │   ├── official_badge.rs（官方认证标识）                    │
│  │   │   ├── quality_score.rs（质量评分体系）                     │
│  │   │   └── framework_sync.rs（框架版本同步）                    │
│  │   ├── environment/                                             │
│  │   ├── subscription/                                            │
│  │   └── platform_sync/                                           │
│  ├── infrastructure/                                              │
│  │   ├── database/（SQLite）                                      │
│  │   └── ipc.rs                                                   │
│  └── ui/                                                          │
├─────────────────────────────────────────────────────────────────┤
│  框架生态联动层（新增，参考 emp）                                  │
│  ├── 官方认证体系                                                  │
│  │   ├── 框架官方入驻审核                                          │
│  │   ├── 「官方认证」标识展示                                      │
│  │   └── 版本同步绑定（npm ↔ Skills）                              │
│  ├── 质量评分体系                                                  │
│  │   ├── 内容完整性检测                                            │
│  │   ├── 本地化依赖检测                                            │
│  │   └── 更新频率统计                                              │
│  └── 框架合作计划                                                  │
│      ├── 邀请框架官方入驻                                          │
│      ├── 君子会员专属框架 Skills                                   │
│      └── 框架新版本推送通知                                        │
└─────────────────────────────────────────────────────────────────┘
```

### 10.2 核心功能对比与扩展

#### 10.2.1 功能对比矩阵

| 功能模块 | emp | Aidean Desktop | 差异说明 |
|---|---|---|---|
| **产品形态** | 微前端构建框架 | Skills + MCP 管理桌面端 | 不同领域，互补参考 |
| **Skills 本地化内容** | ✅ references/ 内嵌文档 | ✅ 继承 + 质量检测 | 本地化是质量标准 |
| **references/ 分模块** | ✅ 10个细分文档 | ✅ 商城文件树展示 | 可视化浏览 |
| **scripts/ 可执行脚本** | ✅ 脚手架生成器 | ✅ 沙箱安全执行 | 扩展执行能力 |
| **多 IDE 路径适配** | ✅ 手动维护多份 | ✅ 自动同步所有 IDE | 解决手动痛点 |
| **框架版本绑定** | ✅ 与 @empjs/cli 同步 | ✅ 与 npm 版本联动 | 自动更新通知 |
| **官方 Skills 维护** | ✅ emp 官方维护 | ✅ 平台「官方认证」体系 | 引入更多框架 |
| **IDE 特定变体** | ✅ Trae 专用变体 | ✅ 自动适配不同 IDE | 智能适配 |
| **Skills 商城** | ❌ 无 | ✅ 可视化浏览 + 搜索 | 平台核心功能 |
| **一键安装** | ❌ 手动复制 | ✅ 一键安装到多 IDE | 自动化 |
| **版本追踪** | ❌ 手动更新 | ✅ 自动检测更新 | 更新通知 |
| **MCP 配套** | ❌ 无 | ✅ 框架级 MCP 工具 | 扩展能力 |
| **质量评分** | ❌ 无 | ✅ 多维度评分体系 | 商城排序 |
| **收藏夹系统** | ❌ 无 | ✅ 多维度收藏夹 | 系统/IDE/协议 |
| **君子订阅** | ❌ 无 | ✅ 付费权益体系 | 私有框架 Skills |
| **平台联动** | ❌ 无 | ✅ 网页端双向同步 | WebSocket |
| **伴侣插件** | ❌ 无 | ✅ VS Code/Cursor 插件 | WebSocket |
| **代币体系** | ❌ 无 | ✅ AID Token 空投 | 会员激励 |

#### 10.2.2 核心问题演变

**emp 解决的核心问题**：
> 微前端开发者的 **构建配置复杂痛点** —— Module Federation 配置繁琐，多框架互操作困难

**Aidean Desktop 解决的核心问题**：
> AI 编程工具用户的 **Skills + MCP + Agent 生态管理痛点** —— 发现、安装、组合、同步、付费

**emp 对 Aidean 的启示**：
> 框架级 **官方 Skills 是高质量内容的重要来源**，Aidean 平台应建立「官方认证」体系，引入主流框架的官方 Skills

```
emp 框架痛点                          Aidean Desktop 解决
─────────────────────────────────    ─────────────────────────────────
Skills 手动维护多份         ────────→   自动同步到所有已检测 IDE
框架升级 Skills 不同步      ────────→   与 npm 版本联动，自动推送通知
无 Skills 分发平台          ────────→   平台商城，可视化浏览
无质量评估体系              ────────→   多维度质量评分，商城排序
scripts/ 脚本无安全沙箱     ────────→   沙箱安全执行环境
```

### 10.3 功能清单完善（Aidean Desktop 版）

#### 10.3.1 继承自 emp 的功能（P0）

| 功能 | 说明 | 继承方式 |
|---|---|---|
| Skills 本地化内容 | references/ 内嵌文档，无外部依赖 | 质量检测标准 |
| references/ 分模块 | 细粒度文档，按需引用 | 商城文件树展示 |
| scripts/ 可执行脚本 | Skills 内含脚手架生成器 | 沙箱安全执行 |
| 多 IDE 路径适配 | .agent/.agents/.trae 等路径 | 自动同步 |
| 框架版本绑定 | Skills 与 npm 包版本同步 | 版本联动 |
| 官方 Skills 维护 | 框架官方维护配套 Skills | 「官方认证」体系 |
| IDE 特定变体 | 针对不同 IDE 优化 | 自动适配 |

#### 10.3.2 新增核心功能（P0）

| 功能 | 说明 | 设计要点 |
|---|---|---|
| **官方认证体系** | 框架官方入驻，「官方认证」标识 | 审核 + 标识 + 权益 |
| **质量评分体系** | 多维度 Skills 质量评分 | 内容/本地化/更新/兼容 |
| **文件树浏览** | 商城展示 Skills 完整结构 | references/ 可视化 |
| **脚本沙箱执行** | 安全执行 scripts/ 脚本 | 隔离环境 + 权限控制 |
| **版本联动** | Skills 与 npm 版本同步 | 自动检测 + 推送通知 |
| **框架合作计划** | 邀请框架官方入驻平台 | 合作 + 认证 + 推广 |

#### 10.3.3 新增会员功能（君子订阅）

| 功能 | 免费版 | 君子订阅 |
|---|---|---|
| 公开框架 Skills | ✅ 无限 | ✅ 无限 |
| 官方认证 Skills | ✅ 基础版 | ✅ 完整版 |
| 框架内测 Skills | ❌ | ✅ 提前体验 |
| 框架企业最佳实践 | ❌ | ✅ 专属访问 |
| 私有框架 Skills | ❌ | ✅ 企业定制 |
| 脚本沙箱高级功能 | 基础执行 | 完整权限 |
| 版本推送通知 | 延迟 7 天 | 实时推送 |
| 框架专属客服 | ❌ | ✅ |
| AID 代币空投 | ❌ | 每月赠送 |

### 10.4 交互体验优化

#### 10.4.1 页面结构演变

**emp Skills 结构**：
```
skills/empjs/
├── SKILL.md              # 主入口
├── references/           # 10个细分文档
│   ├── empconfig.md
│   ├── valtio-api.md
│   └── ...
├── scripts/              # 可执行脚本
│   └── create-emp-react19.js
├── .agent/skills/empjs/  # openskills 路径
├── .agents/              # agents 路径
└── .trae/skills/         # Trae 专用
```

**Aidean Desktop 页面结构**：
```
侧边栏导航（左侧）
├── 首页（控制台）← 框架 Skills 推荐 + 最近更新 + AI 推荐
├── 商城（探索）← 分类浏览 + 搜索
│   ├── 官方认证 ← 「官方认证」标识筛选
│   ├── 框架级 Skills ← React/Vue/Next.js/Nuxt
│   ├── 工具级 Skills ← Docker/CI-CD/数据库
│   ├── 编程语言 ← Python/Go/Rust
│   └── 最佳实践 ← 安全/性能/测试
├── Skills 管理（继承 emp 实践）
│   ├── 已安装列表
│   ├── 文件树浏览 ← 可视化 references/
│   ├── 脚本管理 ← 安全执行 scripts/
│   ├── 本地化检测 ← 无外部依赖验证
│   └── 版本联动 ← 与 npm 同步
├── MCP 管理
├── Agent 管理
├── 收藏夹
├── 任务环境
└── 设置
    ├── 通用设置
    ├── 框架生态（新增）
    │   ├── 官方认证管理
    │   ├── 版本联动配置
    │   └── 框架合作计划
    ├── 平台联动
    ├── 工具检测
    └── 会员/关于
```

#### 10.4.2 核心操作流程

**安装官方认证框架 Skills**：
```
1. 用户进入商城页，浏览「官方认证」分类
2. 看到 React 官方 Skills（带「官方认证」金色标识）
3. 点击卡片查看详情
4. 文件树浏览：查看 references/ 完整结构
5. 点击「安装」按钮
6. 选择安装范围：项目级/全局
7. 自动同步到所有已检测 IDE
8. 自动更新 AGENTS.md
9. 显示安装成功提示
（全程：5-6步，<30秒）
```

**执行 Skills 脚本（沙箱安全）**：
```
1. 用户在 Skills 详情页，点击「脚本」标签
2. 查看 scripts/ 目录下的可执行脚本
3. 选择脚本（如 create-emp-react19.js）
4. 查看脚本说明和权限要求
5. 点击「执行」按钮
6. 沙箱环境启动，执行脚本
7. 显示执行结果和输出日志
（全程：4-5步，<10秒）
```

**框架版本联动更新**：
```
1. 系统检测到 @empjs/cli 发布新版本 v3.13.0
2. 推送通知到桌面端：「empjs Skills 有新版本」
3. 用户点击通知，查看更新详情
4. 点击「一键更新」
5. 自动下载新版 Skills
6. 自动同步到所有 IDE
7. 显示更新成功提示
（全程：2-3步，<15秒）
```

### 10.5 UI设计继承

#### 10.5.1 继承 emp 的内容质量标准

| 设计元素 | emp | Aidean Desktop |
|---|---|---|
| **SKILL.md frontmatter** | name + description | 继承 + 扩展（category/tags）|
| **references/ 分模块** | 10个细分文档 | 文件树可视化展示 |
| **scripts/ 可执行脚本** | 脚手架生成器 | 沙箱执行 + 权限管理 |
| **本地化内容** | 无外部依赖 | 质量检测标识 |
| **官方认证** | emp 官方维护 | 「官方认证」金色标识 |

#### 10.5.2 新增设计元素

```typescript
// 继承 emp 的 Skills 卡片设计
const FrameworkSkillCard = {
  // 展示信息
  name: 'empjs',
  displayName: 'EMP Micro-Frontend',
  description: '基于 Rspack 的微前端构建框架',
  
  // 官方认证
  isOfficial: true,           // 是否官方认证
  officialBadge: '官方认证',   // 金色标识
  maintainer: 'empjs',        // 维护者
  
  // 版本信息
  npmPackage: '@empjs/cli',   // 绑定的 npm 包
  currentVersion: '3.12.4',   // 当前 Skills 版本
  npmVersion: '3.12.4',       // npm 包最新版本
  isSynced: true,             // 版本是否同步
  
  // 质量评分
  qualityScore: 95,           // 质量评分（0-100）
  qualityDimensions: {
    hasDescription: true,
    hasQuickStart: true,
    hasReferences: true,
    hasScripts: true,
    isLocalized: true,
    isOfficialMaintained: true,
    updateFrequency: 2,       // 月/次
    supportedAgentCount: 5,   // 支持 5 个 IDE
  },
  
  // 文件树
  fileTree: {
    'SKILL.md': { type: 'file', size: '220 lines' },
    'references/': {
      type: 'directory',
      children: ['empconfig.md', 'valtio-api.md', ...],
    },
    'scripts/': {
      type: 'directory',
      children: ['create-emp-react19.js'],
    },
  },
  
  // 操作按钮
  actions: ['安装', '查看文件', '执行脚本', '查看源码'],
}

// 新增组件
const newComponents = [
  'OfficialBadge',          // 官方认证金色标识
  'QualityScoreBadge',      // 质量评分徽章
  'FileTreeViewer',         // 文件树浏览器
  'ScriptRunnerPanel',      // 脚本执行面板
  'VersionSyncStatus',      // 版本同步状态
  'FrameworkSyncSettings',  // 框架联动设置
  'LocalizationChecker',    // 本地化检测标识
  'UpdateNotification',     // 更新通知卡片
]
```

### 10.6 技术栈复用清单

#### 10.6.1 借鉴 emp 的技术选型

```json
{
  "dependencies": {
    // 前端
    "react": "^19.x",
    "react-dom": "^19.x",
    "react-router-dom": "^6.x",
    "tailwindcss": "^3.4.x",
    
    // 文件树展示
    "react-arborist": "^3.4.0",
    
    // 代码高亮
    "prismjs": "^1.29.0",
    "react-syntax-highlighter": "^15.6.1",
    
    // Markdown 渲染
    "react-markdown": "^9.0.1",
    "remark-gfm": "^4.0.0",
    
    // YAML 解析
    "yaml": "^2.7.0",
    "gray-matter": "^4.0.3"
  }
}
```

#### 10.6.2 新增依赖（框架生态联动）

```json
{
  "dependencies": {
    // Tauri 相关
    "@tauri-apps/api": "^2.9.x",
    "@tauri-apps/plugin-dialog": "^2.x",
    "@tauri-apps/plugin-shell": "^2.x",
    
    // 状态管理
    "zustand": "^4.5.0",
    
    // npm 版本查询
    "package-json": "^10.0.0",
    
    // 沙箱执行
    "vm2": "^3.9.19",
    
    // 文件树
    "path-browserify": "^1.0.1"
  }
}
```

### 10.7 官方认证体系（核心扩展点）

#### 10.7.1 emp 的官方维护模式

```
emp 官方 Skills 维护模式：
├── 与 @empjs/cli 版本同步发布
├── 官方团队维护，质量保证
├── 多 IDE 路径手动适配
└── 本地化内容，无外部依赖
```

#### 10.7.2 Aidean Desktop 官方认证体系

```rust
// src-tauri/src/modules/marketplace/official_badge.rs

use sqlx::SqlitePool;

pub struct OfficialBadgeSystem {
    db: SqlitePool,
}

impl OfficialBadgeSystem {
    /// 申请官方认证
    pub async fn apply_official(
        &self,
        skill_id: &str,
        maintainer: &str,
        npm_package: Option<&str>,
    ) -> Result<ApplicationResult, Error> {
        // 1. 验证维护者身份
        // 2. 检查 Skills 质量
        // 3. 审核通过，授予「官方认证」标识
        
        sqlx::query(
            r#"
            INSERT INTO official_skills (
                skill_id, maintainer, npm_package, 
                is_official, certified_at, updated_at
            ) VALUES (?, ?, ?, true, ?, ?)
            "#
        )
        .bind(skill_id)
        .bind(maintainer)
        .bind(npm_package)
        .bind(Utc::now())
        .bind(Utc::now())
        .execute(&self.db)
        .await?;
        
        Ok(ApplicationResult::Approved)
    }
    
    /// 检查官方认证状态
    pub async fn check_official(&self, skill_id: &str) -> Result<OfficialStatus, Error> {
        let status = sqlx::query_as::<_, OfficialStatus>(
            "SELECT * FROM official_skills WHERE skill_id = ?"
        )
        .bind(skill_id)
        .fetch_optional(&self.db)
        .await?;
        
        Ok(status.unwrap_or(OfficialStatus::NotOfficial))
    }
}
```

#### 10.7.3 质量评分体系

```rust
// src-tauri/src/modules/marketplace/quality_score.rs

pub struct QualityScoring;

impl QualityScoring {
    /// 计算 Skills 质量评分
    pub fn calculate_score(skill: &SkillMetadata) -> QualityScore {
        let mut score = 0;
        let mut dimensions = HashMap::new();
        
        // 基础内容完整性（30分）
        if skill.has_description {
            score += 10;
            dimensions.insert("hasDescription", 10);
        }
        if skill.has_quick_start {
            score += 10;
            dimensions.insert("hasQuickStart", 10);
        }
        if skill.has_config_reference {
            score += 10;
            dimensions.insert("hasConfigReference", 10);
        }
        
        // references/ 分模块（20分）
        let ref_count = skill.references.len();
        let ref_score = (ref_count.min(5) as i32) * 4;
        score += ref_score;
        dimensions.insert("referencesCount", ref_score);
        
        // scripts/ 可执行脚本（10分）
        if skill.has_scripts {
            score += 10;
            dimensions.insert("hasScripts", 10);
        }
        
        // 本地化内容（20分）
        if skill.is_localized {
            score += 20;
            dimensions.insert("isLocalized", 20);
        }
        
        // 官方维护（10分）
        if skill.is_official_maintained {
            score += 10;
            dimensions.insert("isOfficialMaintained", 10);
        }
        
        // 更新频率（10分）
        let update_score = match skill.update_frequency {
            f if f <= 1 => 10,  // 月更
            f if f <= 3 => 7,   // 季更
            f if f <= 6 => 5,   // 半年更
            _ => 3,             // 年更或更久
        };
        score += update_score;
        dimensions.insert("updateFrequency", update_score);
        
        QualityScore {
            total: score,
            max: 100,
            dimensions,
            grade: Self::grade(score),
        }
    }
    
    fn grade(score: i32) -> &'static str {
        match score {
            s if s >= 90 => "S",
            s if s >= 80 => "A",
            s if s >= 70 => "B",
            s if s >= 60 => "C",
            _ => "D",
        }
    }
}
```

### 10.8 版本联动系统（核心扩展点）

#### 10.8.1 emp 的版本同步模式

```
emp 版本同步：
@empjs/cli v3.12.4 发布
    ↓
skills/empjs 同步更新
    ↓
用户手动复制到各 IDE 目录
```

#### 10.8.2 Aidean Desktop 自动版本联动

```rust
// src-tauri/src/modules/marketplace/version_sync.rs

use reqwest;
use semver::Version;

pub struct VersionSyncSystem {
    db: SqlitePool,
    npm_registry: String,
}

impl VersionSyncSystem {
    /// 检查 npm 包新版本
    pub async fn check_npm_updates(&self) -> Result<Vec<VersionUpdate>, Error> {
        let official_skills = sqlx::query_as::<_, OfficialSkill>(
            "SELECT * FROM official_skills WHERE npm_package IS NOT NULL"
        )
        .fetch_all(&self.db)
        .await?;
        
        let mut updates = vec![];
        for skill in official_skills {
            let npm_version = self.fetch_npm_version(&skill.npm_package).await?;
            let skill_version = Version::parse(&skill.current_version)?;
            let npm_ver = Version::parse(&npm_version)?;
            
            if npm_ver > skill_version {
                updates.push(VersionUpdate {
                    skill_id: skill.skill_id,
                    npm_package: skill.npm_package,
                    current_version: skill.current_version,
                    latest_version: npm_version,
                    release_notes: self.fetch_release_notes(&skill.npm_package).await?,
                });
            }
        }
        
        Ok(updates)
    }
    
    /// 获取 npm 包最新版本
    async fn fetch_npm_version(&self, package: &str) -> Result<String, Error> {
        let url = format!("{}/{}", self.npm_registry, package);
        let resp = reqwest::get(&url).await?.json::<NpmPackageInfo>().await?;
        Ok(resp.dist_tags.latest)
    }
    
    /// 推送更新通知
    pub async fn notify_updates(&self, updates: &[VersionUpdate]) -> Result<(), Error> {
        for update in updates {
            // 发送桌面通知
            self.send_desktop_notification(update).await?;
            
            // 记录到更新中心
            sqlx::query(
                "INSERT INTO update_notifications (skill_id, current_version, latest_version, notified_at) VALUES (?, ?, ?, ?)"
            )
            .bind(&update.skill_id)
            .bind(&update.current_version)
            .bind(&update.latest_version)
            .bind(Utc::now())
            .execute(&self.db)
            .await?;
        }
        
        Ok(())
    }
}
```

### 10.9 脚本沙箱执行（核心扩展点）

#### 10.9.1 emp 的脚本模式

```javascript
// emp skills/empjs/scripts/create-emp-react19.js
// 直接执行，无沙箱

const { execSync } = require('child_process');
const fs = require('fs');

// 生成 React 19 项目脚手架
function createProject(name) {
  execSync(`npx create-emp@latest ${name} --template react19`);
  // ...
}

createProject(process.argv[2]);
```

#### 10.9.2 Aidean Desktop 沙箱安全执行

```rust
// src-tauri/src/modules/skills/script_runner.rs

use vm2::{VM, VMOptions};
use std::path::Path;

pub struct ScriptRunner;

impl ScriptRunner {
    /// 沙箱安全执行 Skills 脚本
    pub fn run_script(
        script_path: &Path,
        args: &[String],
        options: ScriptOptions,
    ) -> Result<ScriptOutput, Error> {
        // 1. 读取脚本内容
        let script_content = fs::read_to_string(script_path)?;
        
        // 2. 创建沙箱 VM
        let vm = VM::new(VMOptions {
            timeout: options.timeout_ms,
            memory_limit: options.memory_limit_mb,
            allow_file_system: options.allow_file_system,
            allow_network: options.allow_network,
            allow_child_process: options.allow_child_process,
            working_directory: options.working_directory,
        });
        
        // 3. 注入安全 API
        vm.inject_api("console", ConsoleAPI::new()?);
        vm.inject_api("fs", FileSystemAPI::new(options.allowed_paths)?);
        
        // 4. 执行脚本
        let result = vm.run(&script_content, args)?;
        
        Ok(ScriptOutput {
            stdout: result.stdout,
            stderr: result.stderr,
            exit_code: result.exit_code,
        })
    }
    
    /// 检查脚本权限要求
    pub fn analyze_permissions(script_path: &Path) -> Result<PermissionRequirements, Error> {
        let content = fs::read_to_string(script_path)?;
        
        let mut permissions = PermissionRequirements::default();
        
        // 检测 require('child_process')
        if content.contains("child_process") || content.contains("exec") {
            permissions.needs_child_process = true;
        }
        
        // 检测文件系统操作
        if content.contains("fs.") || content.contains("require('fs')") {
            permissions.needs_file_system = true;
        }
        
        // 检测网络请求
        if content.contains("fetch") || content.contains("http") || content.contains("axios") {
            permissions.needs_network = true;
        }
        
        Ok(permissions)
    }
}
```

### 10.10 开发优先级建议

#### Phase 1: MVP（3周）—— 继承 emp 核心

| 周次 | 任务 | 参考 emp |
|---|---|---|
| Week 1 | 实现 Skills 文件树解析 | skills/empjs/ 结构 |
| Week 2 | 实现 references/ 展示 | 文件树可视化 |
| Week 3 | 实现本地化内容检测 | 无外部依赖验证 |

#### Phase 2: 核心功能（4周）—— 框架生态联动

| 周次 | 任务 | 说明 |
|---|---|---|
| Week 4-5 | 官方认证体系 | 审核 + 标识 + 权益 |
| Week 6 | 质量评分体系 | 多维度评分 |
| Week 7 | 版本联动系统 | 与 npm 同步 |

#### Phase 3: 高级功能（3周）—— 脚本执行

| 周次 | 任务 | 说明 |
|---|---|---|
| Week 8 | 脚本沙箱执行 | 安全隔离环境 |
| Week 9 | 框架合作计划 | 邀请官方入驻 |
| Week 10 | 君子订阅专属 | 私有框架 Skills |

### 10.11 总结

#### 10.11.1 emp 对 Aidean Desktop 的价值

| 维度 | 价值 |
|---|---|
| **框架级 Skills 实践** | 展示了框架官方如何维护配套 Skills，是「官方认证」体系的标杆 |
| **本地化内容标准** | references/ 内嵌文档，无外部依赖，是质量评分的重要维度 |
| **references/ 分模块** | 细粒度文档拆分，AI 按需引用，商城需要文件树展示 |
| **scripts/ 可执行脚本** | Skills 不只是文档，还包含可执行能力，需要沙箱安全执行 |
| **多 IDE 路径适配** | .agent/.agents/.trae 手动维护是痛点，Aidean 自动同步解决 |
| **框架版本绑定** | Skills 与 npm 包版本同步，需要自动检测和推送通知 |
| **官方维护模式** | emp 官方维护 Skills，Aidean 平台应建立「官方认证」体系 |
| **IDE 特定变体** | Trae 专用变体，Aidean 自动适配不同 IDE |
| **MIT License** | 代码和 Skills 内容均可自由使用，商业使用无障碍 |

#### 10.11.2 Aidean Desktop 的差异化定位

```
市场定位对比：

emp                →   「微前端构建框架 + 官方 Skills 实践」
                      （面向微前端开发者，解决构建配置复杂痛点）
                      框架官方维护 Skills，展示最佳实践
                      
Aidean Desktop     →   「AI Skills & MCP 生态中枢（框架生态联动）」
                      （面向所有 AI 编程工具用户，解决 Skills 发现/安装/同步/付费）
                      平台引入框架官方 Skills，建立「官方认证」体系
```

**互补关系**：
- emp 是 **框架级 Skills 实践的标杆案例**，展示了官方如何维护高质量 Skills
- Aidean Desktop 是 **框架 Skills 的分发和管理平台**，解决手动维护多份、版本不同步等痛点
- emp 官方 Skills 可以作为 Aidean 平台的「官方认证」内容引入

#### 10.11.3 关键成功因素

1. **官方认证体系**：建立「官方认证」标识，引入主流框架的官方 Skills，保证内容质量
2. **质量评分体系**：多维度评分（内容完整性/本地化/更新频率/兼容性），用于商城排序
3. **文件树展示**：商城支持浏览 Skills 的 references/ 完整结构，可视化细分文档
4. **脚本沙箱执行**：安全执行 scripts/ 内的脚本，扩展 Skills 能力边界
5. **版本联动系统**：Skills 与 npm 包版本绑定，自动检测更新并推送通知
6. **自动同步取代手动**：emp 手动维护多 IDE 路径是痛点，Aidean 自动同步直接解决
7. **本地化内容检测**：验证 Skills 是否依赖外部 URL，本地化是质量标准
8. **框架合作计划**：邀请框架官方入驻平台，君子会员获取框架专属私有 Skills
9. **MIT License**：可自由参考 emp 代码和 Skills 内容，商业使用无障碍

---

> **文档版本**: v2.0
> **最后更新**: 2026-03-27
> **状态**: 基于 emp 完善的 Aidean Desktop 设计方案
