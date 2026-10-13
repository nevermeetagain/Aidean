# openskills 竞品深度分析报告

> 来源：https://github.com/numman-ali/openskills
> 分析日期：2026-03-26
> 当前版本：v1.5.0 | 9次发布 | License：Apache-2.0

---

## 一、架构设计

### 1.1 产品形态

**openskills 是纯 CLI 工具**，所有参考案例中最轻量，无桌面端、无Web服务。

```bash
npm install -g openskills
# 或直接 npx
npx openskills install anthropics/skills
```

### 1.2 技术栈

| 层级 | 技术 | 版本 | 说明 |
|---|---|---|---|
| **形态** | CLI工具（Node.js）| - | npx直接使用，无需安装 |
| **语言** | TypeScript | ^5.9.3 | 96.9%代码量 |
| **构建** | tsup | ^8.5.0 | 极速打包为dist/cli.js |
| **CLI框架** | commander | ^12.1.0 | 命令行参数解析 |
| **交互TUI** | @inquirer/prompts | ^7.9.0 | 交互式checkbox/confirm |
| **颜色输出** | chalk | ^5.6.2 | 终端彩色输出 |
| **加载动画** | ora | ^9.0.0 | 终端Spinner |
| **测试** | vitest | ^4.0.3 | 88个测试用例 |
| **协议** | Apache-2.0 | - | 可商业使用 |

### 1.3 代码结构

```
openskills/
├── src/
│   ├── cli.ts              # CLI入口（commander注册所有命令）
│   ├── types.ts            # TypeScript类型定义
│   ├── commands/           # 7个命令
│   │   ├── install.ts      # 安装（584行，核心）
│   │   ├── sync.ts         # 同步AGENTS.md
│   │   ├── list.ts         # 列出已安装Skills
│   │   ├── read.ts         # 读取Skill供Agent调用
│   │   ├── update.ts       # 更新已安装Skills
│   │   ├── manage.ts       # 交互式管理（删除）
│   │   └── remove.ts       # 删除指定Skill
│   └── utils/              # 7个工具模块
│       ├── dirs.ts         # Skills目录路径管理
│       ├── skills.ts       # Skill文件扫描
│       ├── agents-md.ts    # AGENTS.md生成/解析
│       ├── skill-metadata.ts # 来源元数据读写
│       ├── skill-names.ts  # Skill名称处理
│       ├── marketplace-skills.ts # Anthropic官方Skills列表
│       └── yaml.ts         # YAML frontmatter解析
└── tests/                  # 88个测试用例，6个文件
```

### 1.4 目录优先级设计（4级）

```typescript
// utils/dirs.ts
function getSearchDirs(): string[] {
  return [
    join(cwd(), '.agent/skills'),    // 1. 项目级universal（最高）
    join(homedir(), '.agent/skills'), // 2. 全局universal
    join(cwd(), '.claude/skills'),   // 3. 项目级claude
    join(homedir(), '.claude/skills'),// 4. 全局claude（最低）
  ];
}

// 安装范围标志
// --global     → ~/.claude/skills/
// --universal  → ./.agent/skills/ 或 ~/.agent/skills/
// （默认）     → ./.claude/skills/（project-local）
```

### 1.5 AGENTS.md自动生成

```xml
<!-- sync命令生成的标准XML格式（与Claude Code完全兼容）-->
<skills_system priority="1">
  <available_skills>
    <skill>
      <name>pdf</name>
      <description>Comprehensive PDF toolkit...</description>
      <location>project</location>
    </skill>
  </available_skills>
</skills_system>
```

---

## 二、核心功能分析

### 2.1 解决的核心问题

1. **Skills安装碎片化**：无统一CLI工具，各Agent安装方式各异
2. **跨Agent兼容性差**：Claude/Cursor/Windsurf/Aider格式不统一
3. **AGENTS.md维护繁琐**：手动更新`<available_skills>`块容易出错
4. **Progressive Disclosure缺失**：Skills全量加载导致Context爆炸
5. **私有Skills访问困难**：无标准方式安装企业私有仓库Skills

**核心价值**：One CLI. Every agent. Same format as Claude Code.

---

## 三、功能清单

### 3.1 install（安装）⭐ 核心

| 功能 | 说明 | 优先级 |
|---|---|---|
| GitHub仓库安装 | `openskills install owner/repo` | P0 |
| 多Skill批量选择 | 交互式checkbox选择 | P0 |
| 本地路径安装 | 绝对/相对/波浪号路径 | P0 |
| 私有Git仓库 | SSH URL / HTTPS with auth | P0 |
| Anthropic官方市场 | 内置marketplace-skills.ts | P1 |
| 来源元数据记录 | 记录sourceType/repoUrl供update | P1 |
| 安全路径检查 | 防路径遍历（isPathInside）| P1 |

### 3.2 sync（同步AGENTS.md）

| 功能 | 说明 | 优先级 |
|---|---|---|
| 生成available_skills块 | 写入标准XML格式 | P0 |
| 交互式选择 | checkbox选择要写入的Skills | P0 |
| 自定义输出路径 | `--output .ruler/AGENTS.md` | P1 |
| 增量更新 | 只更新skills块，不影响其他内容 | P0 |
| `-y` CI模式 | 跳过确认，自动化脚本 | P1 |

### 3.3 其他命令

| 命令 | 功能 | 优先级 |
|---|---|---|
| `list` | 列出已安装Skills（名称/位置/描述）| P0 |
| `read <name>` | 读取Skill内容供Agent调用（支持逗号多个）| P0 |
| `update [name]` | 从源更新Skills（默认全部）| P1 |
| `manage` | 交互式删除（checkbox多选）| P1 |
| `remove <name>` | 删除指定Skill | P0 |

### 3.4 SKILL.md格式

| 功能 | 说明 | 优先级 |
|---|---|---|
| YAML frontmatter解析 | 提取name/description | P0 |
| 捆绑资源支持 | references/ scripts/ assets/ | P0 |
| Progressive Disclosure | 按需加载Skill内容 | P0 |
| Symlink支持 | Skill可以是符号链接 | P1 |

---

## 四、功能差异分析

### 4.1 openskills 独特功能

| 独特功能 | 说明 | 参考价值 |
|---|---|---|
| **AGENTS.md自动生成** | sync命令维护`<available_skills>`XML块 | 极高 |
| **Progressive Disclosure** | read命令按需加载，保持Context整洁 | 极高 |
| **私有Git仓库** | SSH + HTTPS with auth | 高 |
| **来源元数据追踪** | 记录安装来源，支持精确update | 高 |
| **通用安装协议** | 兼容所有主流Agent | 高 |
| **4级目录优先级** | 清晰的覆盖层级 | 中 |
| **Symlink开发工作流** | 开发中的Skill可symlink进目录 | 中 |
| **CI模式(-y)** | 非交互式，适合自动化 | 中 |
| **多Skill同时读取** | 逗号分隔多名称 | 中 |

### 4.2 openskills 缺失功能（Aidean Desktop 机会点）

| 缺失功能 | Aidean Desktop 机会点 |
|---|---|
| **图形界面** | 桌面端GUI降低门槛 |
| **MCP管理** | Skills+MCP统一管理 |
| **商城/探索页** | 可视化浏览+搜索 |
| **多IDE自动同步** | skills-hub的多工具同步 |
| **会员订阅** | 私有Skills按订阅控制 |
| **平台联动** | 与网页端收藏夹同步 |
| **任务环境** | Skills+MCP+Agent组合 |
| **代币体系** | 贡献Skills获得AID奖励 |

---

## 五、功能迭代分析

### 5.1 版本节奏

```
v1.0.0  2025-10-26  初始版本：install/sync/list/read/manage/remove
v1.3.0  2025-12-14  Symlink + 本地路径 + 私有Git + 88个测试
v1.4.0  2026-01-xx  多Skills选择 + read多名称
v1.5.0  2026-01-17  update命令 + 来源元数据追踪
```

**节奏特征**：约2-4周一版，功能增量清晰，2个贡献者（作者+Claude AI）

### 5.2 功能演进轨迹

```
初期  → 基础安装/同步/列表/读取
  ↓
中期  → Symlink + 本地路径 + 私有仓库 + 测试覆盖
  ↓
近期  → 来源追踪 + update命令（完整生命周期）
  ↓
趋势  → 向「通用Skills包管理器」演进（类似npm for Skills）
```

---

## 六、交互体验分析

### 6.1 核心操作流程

**安装Skills**
```bash
# 从GitHub安装
npx openskills install anthropics/skills
# 交互式选择要安装的Skills（checkbox）
# ✓ pdf ✓ frontend-design □ canvas-design ...
# 安装到 ./.claude/skills/

# 全局安装
npx openskills install anthropics/skills --global

# 私有仓库
npx openskills install git@github.com:company/private-skills.git
```

**同步AGENTS.md**
```bash
npx openskills sync
# 交互式选择要写入AGENTS.md的Skills
# 自动更新 <available_skills> 块
# 保留文件其他内容不变
```

**Agent读取Skill**
```bash
# Agent在执行时按需加载
npx openskills read pdf
npx openskills read pdf,frontend-design,canvas-design
```

### 6.2 命令全貌（CLI UX）

```
openskills
├── install <source> [options]  # GitHub/本地/私有Git
│   ├── --global                # 全局安装
│   ├── --universal             # .agent/skills/
│   └── -y                      # 跳过确认
├── sync [-y] [-o <path>]       # 更新AGENTS.md
├── list                        # 显示已安装
├── read <name[,name2]>         # 读取内容（Agent调用）
├── update [name...]            # 从源更新
├── manage                      # 交互式删除
└── remove <name>               # 删除指定
```

### 6.3 交互设计亮点

| 设计点 | 说明 |
|---|---|
| **@inquirer/prompts** | 美观的终端交互（checkbox/confirm/input）|
| **chalk彩色输出** | 状态颜色区分（成功绿/错误红/提示黄）|
| **ora Spinner** | Git克隆/安装过程有加载动画 |
| **CI模式(-y)** | 自动化场景无需人工确认 |
| **错误信息友好** | 明确提示下一步操作 |

---

## 七、UI设计风格

### 7.1 终端UI风格

```
形态：CLI终端界面
颜色：chalk（绿/红/黄/青/灰）
交互：@inquirer/prompts（checkbox/confirm）
动画：ora Spinner
风格：开发者友好，信息简洁
```

---

## 八、对 Aidean Desktop 的借鉴方案

### 8.1 CLI作为桌面端补充

openskills 是纯CLI，Aidean Desktop 是桌面GUI，两者**互补而非竞争**：

```
Aidean Desktop（GUI）
    ↓ 底层调用
openskills CLI 协议（兼容）
    ↓ 安装到
Skills目录（.claude/skills/ 等）
    ↓ 被
各IDE/Agent读取
```

**具体策略**：
- Aidean Desktop 的Skills安装逻辑与 openskills **协议兼容**（相同目录结构）
- 用户既可以用 GUI 操作，也可以用 CLI，效果相同
- 平台提供 `aidean install <skill>` CLI 工具（参考openskills）

### 8.2 直接借鉴的设计

| openskills设计 | Aidean Desktop 应用 |
|---|---|
| **4级目录优先级** | 继承相同优先级（.agent > ~/.agent > .claude > ~/.claude）|
| **来源元数据追踪** | skill_targets表的source_ref/source_revision字段 |
| **私有仓库支持** | 君子订阅专属私有Skills仓库，SSH/HTTPS安装 |
| **Progressive Disclosure** | 商城展示时懒加载Skill详情 |
| **AGENTS.md生成** | 桌面端「应用」操作自动更新AGENTS.md |
| **CI模式(-y)** | 平台API下发配置时自动执行，无需弹窗确认 |
| **Symlink开发工作流** | 开发者模式：本地Skills目录symlink到中心仓库 |

### 8.3 Aidean CLI工具设计（参考openskills）

```bash
# Aidean提供配套CLI工具（与Desktop互补）
npx aidean install <skill-name>       # 从平台安装
npx aidean install owner/repo         # 从GitHub安装
npx aidean install --private git@...  # 私有仓库（君子会员）
npx aidean sync                       # 更新AGENTS.md
npx aidean env apply <env-name>       # 应用任务环境
npx aidean mcp add <mcp-name>         # 添加MCP配置

# 与openskills兼容：相同的目录结构和SKILL.md格式
```

### 8.4 SKILL.md格式作为统一标准

```markdown
---
name: skill-name
description: 一句话描述（用于商城搜索和AGENTS.md生成）
---

# Skill内容

## 触发条件
当用户请求XXX时使用此Skill。

## 执行步骤
1. 步骤一
2. 步骤二
```

Aidean Desktop 使用相同的SKILL.md格式，与openskills/skills-hub/cc-switch完全兼容。

### 8.5 install.ts 核心逻辑参考

```typescript
// 参考openskills的安装来源识别逻辑
function resolveInstallSource(source: string): InstallSourceInfo {
  if (isLocalPath(source)) {
    // 本地路径：绝对/相对/~
    return { source: expandPath(source), sourceType: 'local' };
  }
  if (isGitUrl(source)) {
    // 完整Git URL（SSH/HTTPS）
    return { source, sourceType: 'git', repoUrl: source };
  }
  // GitHub shorthand: owner/repo
  return {
    source: `https://github.com/${source}`,
    sourceType: 'github',
    repoUrl: `https://github.com/${source}`
  };
}

// Aidean Desktop Rust版本
// src-tauri/src/modules/skills/installer.rs
// 与skill-hub的installer.rs合并，增加openskills的来源类型
```

---

## 九、功能优先级矩阵

| 功能模块 | Phase | 来源 | 说明 |
|---|---|---|---|
| Skills目录4级优先级 | P1 | openskills | 继承相同目录结构 |
| AGENTS.md自动生成 | P1 | openskills | 应用时自动更新 |
| 来源元数据追踪 | P1 | openskills | skill_targets.source_ref |
| 私有仓库Skills | P2 | openskills | 君子会员专属 |
| CLI配套工具 | P2 | openskills启发 | npx aidean install |
| Progressive Disclosure | P1 | openskills | 按需加载Skill内容 |
| Symlink开发模式 | P2 | openskills | 本地开发者工作流 |
| CI模式支持 | P2 | openskills | 自动化/平台下发 |

---

## 十、总结与关键结论

1. **openskills 定义了 Skills 的通用安装标准**：SKILL.md格式 + 4级目录优先级 + AGENTS.md XML格式，Aidean Desktop 应完全兼容此标准
2. **CLI + 桌面端双轨并行**：openskills 服务于命令行用户，Aidean Desktop 服务于GUI用户，两者协议兼容，互相补充
3. **AGENTS.md自动维护是刚需**：sync命令的价值在于让开发者不必手动维护XML块，Aidean Desktop 应在每次应用操作时自动更新AGENTS.md
4. **Progressive Disclosure 是性能关键**：Skills不应全量写入Context，应按需加载；Aidean Desktop 的「应用」操作默认只写入AGENTS.md引用，不内联内容
5. **来源元数据是更新能力的基础**：没有来源记录就无法实现精确update，Aidean Desktop 的skill_store必须记录source_ref/source_type
6. **私有仓库 = 付费护城河**：openskills免费支持私有Git，但Aidean Desktop 可以将「平台私有Skills仓库」（非自托管Git）作为君子订阅专属权益
7. **Apache-2.0**：可以直接参考代码，尤其是install.ts的来源识别逻辑和安全路径检查

---

## 十、Aidean Desktop 基于 openskills 的完善方案

### 10.1 架构设计继承与扩展

#### 10.1.1 继承 openskills 的架构优势

| openskills 架构特点 | Aidean Desktop 继承方式 | 扩展方向 |
|---|---|---|
| **纯 CLI 工具形态** | 保留 CLI 作为桌面端补充 | 提供 `npx aidean` 配套 CLI |
| **TypeScript 96.9%** | 前端保持 TypeScript | Tauri 后端 Rust 实现 |
| **4级目录优先级** | 完全继承 | 扩展支持 MCP/Agent 配置 |
| **SKILL.md 标准格式** | 直接采用作为平台标准 | 扩展支持 MCP/Agent 定义 |
| **AGENTS.md 自动生成** | 核心借鉴点 | 应用操作自动更新 |
| **来源元数据追踪** | skill_targets.source_ref | 扩展支持 MCP/Agent |
| **Progressive Disclosure** | 按需加载 Skill | 商城懒加载 + 任务环境 |
| **私有 Git 仓库** | SSH/HTTPS 安装 | 君子订阅专属私有仓库 |
| **Symlink 开发模式** | 本地开发者工作流 | 开发者中心支持 |
| **CI 模式 (-y)** | 自动化脚本支持 | 平台 API 下发配置 |
| **Apache-2.0** | 自由参考代码 | 商业使用无障碍 |

#### 10.1.2 扩展架构：CLI + GUI 双轨并行

```
┌─────────────────────────────────────────────────────────────────┐
│                    Aidean Desktop 扩展架构                        │
├─────────────────────────────────────────────────────────────────┤
│  前端（React + TypeScript + Tailwind CSS）                        │
│  ├── 首页/商城/收藏夹/任务环境                                    │
│  ├── Skills 管理（继承 openskills 协议）                          │
│  │   ├── 安装（GUI 包装 CLI）                                     │
│  │   ├── 同步 AGENTS.md（自动触发）                               │
│  │   ├── 来源追踪（元数据管理）                                   │
│  │   └── 更新（批量更新）                                         │
│  ├── MCP 管理                                                     │
│  ├── Agent 管理                                                   │
│  ├── 会员中心（新增）                                             │
│  └── 设置（继承 + 扩展）                                          │
├─────────────────────────────────────────────────────────────────┤
│  Tauri 后端（Rust）                                               │
│  ├── modules/                                                     │
│  │   ├── skills/（继承 openskills 协议）                          │
│  │   │   ├── installer.rs（安装逻辑，参考 install.ts）            │
│  │   │   ├── sync_agents_md.rs（AGENTS.md 自动生成）              │
│  │   │   ├── source_tracker.rs（来源元数据追踪）                  │
│  │   │   ├── updater.rs（更新逻辑）                               │
│  │   │   └── dir_resolver.rs（4级目录优先级）                     │
│  │   ├── marketplace/（新增：商城数据）                           │
│  │   ├── environment/（新增：任务环境）                           │
│  │   ├── subscription/（新增：君子订阅）                          │
│  │   └── platform_sync/（新增：平台同步）                         │
│  ├── infrastructure/                                              │
│  │   ├── database/（SQLite）                                      │
│  │   └── ipc.rs（IPC通信）                                        │
│  └── cli_wrapper.rs（CLI 包装层，调用 npx aidean）                │
├─────────────────────────────────────────────────────────────────┤
│  Aidean CLI（配套工具，参考 openskills）                          │
│  ├── npx aidean install <source>                                  │
│  ├── npx aidean sync                                              │
│  ├── npx aidean update [name...]                                  │
│  ├── npx aidean env apply <env-name>                              │
│  └── npx aidean mcp add <mcp-name>                                │
├─────────────────────────────────────────────────────────────────┤
│  目录结构（完全继承 openskills）                                  │
│  ├── ./.agent/skills/（项目级 universal，最高）                   │
│  ├── ~/.agent/skills/（全局 universal）                           │
│  ├── ./.claude/skills/（项目级 claude）                           │
│  └── ~/.claude/skills/（全局 claude，最低）                       │
└─────────────────────────────────────────────────────────────────┘
```

### 10.2 核心功能对比与扩展

#### 10.2.1 功能对比矩阵

| 功能模块 | openskills | Aidean Desktop | 差异说明 |
|---|---|---|---|
| **形态** | 纯 CLI | CLI + GUI 桌面端 | 双轨并行，协议兼容 |
| **Skills 安装** | ✅ GitHub/本地/私有Git | ✅ 继承 + 平台商城 | + 平台一键安装 |
| **4级目录优先级** | ✅ .agent > ~/.agent > .claude > ~/.claude | ✅ 完全继承 | 扩展 MCP/Agent |
| **AGENTS.md 自动生成** | ✅ sync 命令 | ✅ 应用时自动触发 | 无需手动执行 |
| **来源元数据追踪** | ✅ sourceType/repoUrl | ✅ 继承 + 扩展 | 支持 MCP/Agent |
| **Progressive Disclosure** | ✅ read 按需加载 | ✅ 商城懒加载 | 任务环境按需 |
| **私有仓库支持** | ✅ SSH/HTTPS | ✅ 继承 + 平台私有 | 君子订阅专属 |
| **批量更新** | ✅ update 命令 | ✅ 继承 + 自动检测 | 更新通知 |
| **Symlink 开发模式** | ✅ 支持 | ✅ 继承 | 开发者中心 |
| **CI 模式 (-y)** | ✅ 跳过确认 | ✅ 平台 API 下发 | 自动化配置 |
| **图形界面** | ❌ 无 | ✅ Tauri 桌面端 | 降低使用门槛 |
| **商城/探索页** | ❌ 内置列表 | ✅ 可视化浏览+搜索 | 平台数据 |
| **MCP 管理** | ❌ 无 | ✅ Skills+MCP 统一 | mcphub 能力 |
| **Agent 管理** | ❌ 无 | ✅ Agent 收藏夹 | Agent 定义 |
| **任务环境** | ❌ 无 | ✅ Skills+MCP+Agent 组合 | 场景化 |
| **收藏夹系统** | ❌ 无 | ✅ 多维度收藏夹 | 系统/IDE/协议 |
| **君子订阅** | ❌ 无 | ✅ 付费权益体系 | 私有 Skills |
| **平台联动** | ❌ 无 | ✅ 网页端双向同步 | WebSocket |
| **伴侣插件** | ❌ 无 | ✅ VS Code/Cursor 插件 | WebSocket |
| **代币体系** | ❌ 无 | ✅ AID Token 空投 | 会员激励 |

#### 10.2.2 核心问题演变

**openskills 解决的核心问题**：
> AI 编程工具用户的 **Skills 安装碎片化痛点** —— 无统一 CLI 工具，各 Agent 安装方式各异，AGENTS.md 维护繁琐

**Aidean Desktop 解决的核心问题**：
> AI 编程工具用户的 **Skills + MCP + Agent 生态管理痛点** —— 发现、安装、组合、同步、付费

```
openskills 用户痛点                    Aidean Desktop 用户痛点
─────────────────────────────────    ─────────────────────────────────
Skills 安装碎片化         ────────→   Skills + MCP + Agent 三重碎片化
跨 Agent 兼容性差         ────────→   缺乏场景化组合方案
AGENTS.md 维护繁琐        ────────→   网页端与桌面端数据割裂
无统一 CLI 工具           ────────→   缺乏个性化推荐
无图形界面                ────────→   优质内容缺乏付费机制
无 MCP 管理               ────────→   需要 Skills+MCP 统一管理
```

### 10.3 功能清单完善（Aidean Desktop 版）

#### 10.3.1 继承自 openskills 的功能（P0）

| 功能 | 说明 | 继承方式 |
|---|---|---|
| Skills 目录 4级优先级 | .agent > ~/.agent > .claude > ~/.claude | 完全继承 |
| SKILL.md 标准格式 | YAML frontmatter + Markdown 内容 | 直接采用 |
| AGENTS.md 自动生成 | 应用时自动更新 `<available_skills>` | 自动触发 |
| 来源元数据追踪 | source_ref/source_type/source_revision | 数据库记录 |
| GitHub 仓库安装 | owner/repo 简写 | CLI + GUI |
| 本地路径安装 | 绝对/相对/~ 路径 | CLI + GUI |
| 私有 Git 仓库 | SSH/HTTPS with auth | 君子会员 |
| Progressive Disclosure | 按需加载 Skill 内容 | 商城懒加载 |
| Symlink 开发模式 | 本地 Skills symlink 到中心仓库 | 开发者中心 |
| CI 模式 (-y) | 跳过确认，自动化脚本 | 平台 API |
| 批量更新 | update 命令，从源更新 | 自动检测 |

#### 10.3.2 新增核心功能（P0）

| 功能 | 说明 | 设计要点 |
|---|---|---|
| **GUI 桌面端** | Tauri + React 桌面应用 | 降低使用门槛 |
| **平台商城** | 可视化浏览 Skills | 接入平台数据 |
| **任务环境** | Skills+MCP+Agent 组合 | 一键应用 |
| **收藏夹系统** | 多维度收藏夹 | 系统/IDE/协议标识 |
| **自动更新** | Skills 自动检测和更新 | 更新通知 |
| **平台同步** | 网页端双向同步 | WebSocket |

#### 10.3.3 新增会员功能（君子订阅）

| 功能 | 免费版 | 君子订阅 |
|---|---|---|
| 公开 Skills 安装 | ✅ 无限 | ✅ 无限 |
| 私有 Skills 仓库 | ❌ | ✅ SSH/HTTPS |
| 平台私有 Skills | ❌ | ✅ 专属访问 |
| 任务环境数量 | 2个 | 无限 |
| 自动更新频率 | 手动 | 自动检测 |
| 一键导入网页配置 | ❌ | ✅ |
| 公众号一键开发 | ❌ | ✅ |
| 高分方案推荐 | ❌ | ✅ |
| 订阅推送/邮箱推送 | ❌ | ✅ |
| AID 代币空投 | ❌ | 每月赠送 |

### 10.4 交互体验优化

#### 10.4.1 页面结构演变

**openskills 命令结构**：
```
openskills CLI
├── install <source> [options]
├── sync [-y] [-o <path>]
├── list
├── read <name[,name2]>
├── update [name...]
├── manage
└── remove <name>
```

**Aidean Desktop 页面结构**：
```
侧边栏导航（左侧）
├── 首页（控制台）← 四大收藏夹快捷入口 + 最近更新
├── 商城（探索）← Skills 分类浏览 + 搜索
│   ├── 精选（平台推荐）
│   ├── GitHub 热门（继承 openskills）
│   ├── 私有仓库（君子订阅）
│   └── 我的 Skills（已安装）
├── Skills 管理（继承 openskills）
│   ├── 已安装列表（来源追踪）
│   ├── 安装（GUI 包装 install）
│   ├── 更新（批量更新）
│   ├── 同步 AGENTS.md（自动触发）
│   └── 开发者模式（Symlink）
├── MCP 管理
├── Agent 管理
├── 收藏夹
├── 任务环境
└── 设置
    ├── 通用设置
    ├── CLI 配置（openskills 兼容）
    ├── 平台联动
    ├── 工具检测
    └── 会员/关于
```

#### 10.4.2 核心操作流程

**从商城安装 Skill**：
```
1. 用户进入商城页，浏览 Skills 分类或搜索关键词
2. 点击 Skill 卡片查看详情（YAML frontmatter 解析展示）
3. 点击「安装」按钮
4. 选择安装范围：项目级/全局
5. 桌面端调用安装逻辑（参考 openskills install.ts）
6. 自动更新 AGENTS.md（无需手动执行 sync）
7. 显示安装成功提示
（全程：4-5步，<30秒）
```

**一键应用任务环境**：
```
1. 用户在任务环境页选择目标环境
2. 点击「一键应用」
3. 选择应用范围：全局（系统级）/ 项目级
4. 如选择项目级，弹出目录选择器确认项目路径
5. 桌面端应用 Skills（写入对应目录）
6. 自动更新 AGENTS.md（继承 openskills sync）
7. 桌面端应用 MCP 配置
8. 桌面端应用 Agent 配置
9. 显示应用成功提示
（全程：4-5步，<15秒）
```

#### 10.4.3 CLI 与 GUI 的协作

```
用户操作路径：

GUI 路径（推荐新手）：
商城 → 点击安装 → 选择范围 → 自动应用 → 自动更新 AGENTS.md

CLI 路径（推荐老手）：
npx aidean install <skill> → 自动更新 AGENTS.md

混合路径：
GUI 浏览发现 Skill → 复制安装命令 → CLI 执行
CLI 安装 Skill → GUI 查看和管理

协议兼容：
- GUI 和 CLI 使用相同的目录结构（4级优先级）
- GUI 和 CLI 使用相同的 SKILL.md 格式
- GUI 和 CLI 生成相同的 AGENTS.md XML 格式
- 操作结果互相可见（安装/更新/删除同步）
```

### 10.5 UI设计继承

#### 10.5.1 继承 openskills 的终端风格

| 设计元素 | openskills | Aidean Desktop |
|---|---|---|
| **信息密度** | 简洁（CLI 限制）| 适中（GUI 优势）|
| **颜色体系** | chalk（绿/红/黄）| Tailwind（继承+扩展）|
| **状态指示** | 文字 + 颜色 | 图标 + 颜色 + 文字 |
| **交互反馈** | Spinner + 文字 | 进度条 + Toast |
| **错误处理** | 明确提示下一步 | 弹窗 + 引导修复 |

#### 10.5.2 新增设计元素

```typescript
// 继承 openskills 的 Skill 卡片设计
const SkillCard = {
  // 展示信息（来自 YAML frontmatter）
  name: 'skill-name',
  description: '一句话描述',
  source: 'github/平台/私有',
  version: 'v1.2.3',
  
  // 操作按钮
  actions: ['安装', '更新', '删除', '查看源码'],
  
  // 状态指示
  status: '已安装/可更新/未安装',
  
  // 来源追踪
  sourceRef: 'owner/repo@commit',
  sourceType: 'github/marketplace/private',
}

// 新增组件
const newComponents = [
  'SkillCard',            // Skill 卡片（展示 YAML frontmatter）
  'SkillInstallDialog',   // 安装对话框（选择范围）
  'AGENTSMDPreview',      // AGENTS.md 预览
  'SourceTrackerBadge',   // 来源追踪徽章
  'UpdateAvailableBadge', // 可更新提示
  'CLITerminal',          // 内置终端（显示 CLI 输出）
  'DevModeToggle',        // 开发者模式开关（Symlink）
]
```

### 10.6 技术栈复用清单

#### 10.6.1 借鉴 openskills 的技术选型

```json
{
  "dependencies": {
    // 前端
    "react": "^19.x",
    "react-dom": "^19.x",
    "react-router-dom": "^6.x",
    "tailwindcss": "^3.4.x",
    
    // YAML 解析（SKILL.md frontmatter）
    "yaml": "^2.7.0",
    "gray-matter": "^4.0.3",
    
    // 路径处理
    "path-browserify": "^1.0.1",
    
    // 命令行（CLI 配套工具）
    "commander": "^12.1.0",
    "@inquirer/prompts": "^7.9.0",
    "chalk": "^5.6.2",
    "ora": "^9.0.0"
  }
}
```

#### 10.6.2 新增依赖（Tauri + 平台联动）

```json
{
  "dependencies": {
    // Tauri 相关
    "@tauri-apps/api": "^2.9.x",
    "@tauri-apps/plugin-dialog": "^2.x",
    "@tauri-apps/plugin-shell": "^2.x",
    
    // 状态管理
    "zustand": "^4.5.0",
    
    // 代码高亮（AGENTS.md 预览）
    "prismjs": "^1.29.0",
    "react-syntax-highlighter": "^15.6.1",
    
    // Markdown 渲染
    "react-markdown": "^9.0.1",
    "remark-gfm": "^4.0.0"
  }
}
```

### 10.7 AGENTS.md 自动生成（核心继承点）

#### 10.7.1 openskills 的 AGENTS.md 生成逻辑

```typescript
// openskills utils/agents-md.ts
// sync 命令生成的标准 XML 格式

function generateAGENTSMD(skills: Skill[]): string {
  return `<!-- Use this section to provide additional context and skills for your task. Remove it if not needed. -->
<skills_system priority="1">
  <available_skills>
${skills.map(s => `    <skill>
      <name>${s.name}</name>
      <description>${s.description}</description>
      <location>${s.location}</location>
    </skill>`).join('\n')}
  </available_skills>
</skills_system>`;
}

// 增量更新：只替换 <skills_system> 块，保留其他内容
function syncAGENTSMD(filePath: string, skills: Skill[]): void {
  const content = fs.readFileSync(filePath, 'utf-8');
  const newBlock = generateAGENTSMD(skills);
  
  // 正则替换现有 <skills_system> 块
  const updated = content.replace(
    /<skills_system[\s\S]*?<\/skills_system>/,
    newBlock
  );
  
  fs.writeFileSync(filePath, updated);
}
```

#### 10.7.2 Aidean Desktop 的 AGENTS.md 自动触发

```rust
// Aidean Desktop Rust 实现
// src-tauri/src/modules/skills/sync_agents_md.rs

use regex::Regex;

pub struct AgentsMdSync;

impl AgentsMdSync {
    /// 应用 Skills 后自动触发 AGENTS.md 更新
    pub fn sync_after_apply(skills: Vec<Skill>, project_path: &Path) -> Result<(), Error> {
        let agents_md_path = project_path.join("AGENTS.md");
        
        // 生成 XML 块
        let xml_block = Self::generate_xml_block(&skills);
        
        if agents_md_path.exists() {
            // 增量更新：替换现有块
            Self::update_existing(&agents_md_path, &xml_block)?;
        } else {
            // 创建新文件
            Self::create_new(&agents_md_path, &xml_block)?;
        }
        
        Ok(())
    }
    
    fn generate_xml_block(skills: &[Skill]) -> String {
        let skills_xml = skills.iter()
            .map(|s| format!(
                r#"    <skill>
      <name>{}</name>
      <description>{}</description>
      <location>{}</location>
    </skill>"#,
                s.name, s.description, s.location
            ))
            .collect::<Vec<_>>()
            .join("\n");
        
        format!(r#"<!-- Use this section to provide additional context and skills for your task. Remove it if not needed. -->
<skills_system priority="1">
  <available_skills>
{}
  </available_skills>
</skills_system>"#, skills_xml)
    }
    
    fn update_existing(path: &Path, new_block: &str) -> Result<(), Error> {
        let content = fs::read_to_string(path)?;
        
        // 正则替换现有 <skills_system> 块（与 openskills 兼容）
        let re = Regex::new(r"<skills_system[\s\S]*?</skills_system>")?;
        let updated = if re.is_match(&content) {
            re.replace(&content, new_block).to_string()
        } else {
            // 没有现有块，追加到文件末尾
            format!("{}\n\n{}", content, new_block)
        };
        
        fs::write(path, updated)?;
        Ok(())
    }
}
```

#### 10.7.3 与 openskills 的兼容性保证

```rust
// 兼容性测试：确保 Aidean Desktop 生成的 AGENTS.md 可以被 openskills 读取
#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_openskills_compatibility() {
        // Aidean Desktop 生成的 AGENTS.md
        let agents_md = AgentsMdSync::generate_xml_block(&test_skills());
        
        // 使用 openskills 的解析逻辑验证
        let parsed = openskills_parse_agents_md(&agents_md);
        
        assert_eq!(parsed.skills.len(), test_skills().len());
        assert_eq!(parsed.skills[0].name, test_skills()[0].name);
    }
}
```

### 10.8 来源追踪与更新（核心继承点）

#### 10.8.1 openskills 的来源元数据设计

```typescript
// openskills utils/skill-metadata.ts
// 记录安装来源，支持精确 update

interface SkillMetadata {
  name: string;
  sourceType: 'github' | 'git' | 'local' | 'marketplace';
  sourceRef: string;      // owner/repo 或完整 URL
  sourceRevision?: string; // commit hash
  installedAt: string;    // ISO timestamp
}

// 存储在 skill-root/.metadata.json
// update 时读取 metadata，从 sourceRef 拉取最新
```

#### 10.8.2 Aidean Desktop 的数据库实现

```rust
// src-tauri/src/modules/skills/source_tracker.rs

use sqlx::SqlitePool;

pub struct SourceTracker {
    db: SqlitePool,
}

impl SourceTracker {
    /// 记录 Skill 安装来源
    pub async fn record_install(&self, skill: &SkillInstallRecord) -> Result<(), Error> {
        sqlx::query(
            r#"
            INSERT INTO skill_targets (
                name, source_type, source_ref, source_revision,
                install_path, installed_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(name) DO UPDATE SET
                source_revision = excluded.source_revision,
                updated_at = excluded.updated_at
            "#
        )
        .bind(&skill.name)
        .bind(&skill.source_type)      // github/git/local/marketplace
        .bind(&skill.source_ref)       // owner/repo 或 URL
        .bind(&skill.source_revision)  // commit hash
        .bind(&skill.install_path)     // 实际安装路径
        .bind(&skill.installed_at)
        .bind(&skill.updated_at)
        .execute(&self.db)
        .await?;
        
        Ok(())
    }
    
    /// 检查更新
    pub async fn check_updates(&self) -> Result<Vec<UpdateAvailable>, Error> {
        let records = sqlx::query_as::<_, SkillTarget>(
            "SELECT * FROM skill_targets WHERE source_type != 'local'"
        )
        .fetch_all(&self.db)
        .await?;
        
        let mut updates = vec![];
        for record in records {
            let latest = self.fetch_latest_revision(&record).await?;
            if latest != record.source_revision {
                updates.push(UpdateAvailable {
                    name: record.name,
                    current: record.source_revision,
                    latest,
                });
            }
        }
        
        Ok(updates)
    }
}
```

### 10.9 Aidean CLI 配套工具设计

#### 10.9.1 CLI 命令设计（参考 openskills）

```bash
# Aidean CLI - 与 Desktop 协议兼容的配套工具
# npm install -g aidean-cli
# 或 npx aidean <command>

# Skills 管理（继承 openskills）
npx aidean skills install <source>     # 安装 Skill
npx aidean skills install --global     # 全局安装
npx aidean skills install --private    # 私有仓库（需认证）
npx aidean skills sync                 # 更新 AGENTS.md
nnpx aidean skills list                # 列出已安装
npx aidean skills update [name...]     # 更新 Skills
npx aidean skills remove <name>        # 删除 Skill

# MCP 管理（扩展）
npx aidean mcp add <mcp-name>          # 添加 MCP
npx aidean mcp remove <mcp-name>       # 删除 MCP
npx aidean mcp list                    # 列出 MCP

# 任务环境（扩展）
npx aidean env create <name>           # 创建任务环境
nnpx aidean env apply <name>           # 应用任务环境
npx aidean env list                    # 列出任务环境

# 平台联动（扩展）
npx aidean sync --platform             # 与平台同步
npx aidean login                       # 登录平台账号
n```

#### 10.9.2 CLI 与 Desktop 的互操作

```rust
// Desktop 调用 CLI 的 Rust 实现
// src-tauri/src/cli_wrapper.rs

use tauri::api::process::Command;

pub struct CliWrapper;

impl CliWrapper {
    /// Desktop 通过 CLI 执行安装（确保协议一致）
    pub async fn install_skill(source: &str, global: bool) -> Result<Output, Error> {
        let mut args = vec!["skills", "install", source];
        if global {
            args.push("--global");
        }
        
        // 调用 npx aidean
        let output = Command::new("npx")
            .args(&["aidean", ...args])
            .output()
            .await?;
        
        Ok(output)
    }
    
    /// Desktop 通过 CLI 同步 AGENTS.md
    pub async fn sync_agents_md() -> Result<Output, Error> {
        let output = Command::new("npx")
            .args(&["aidean", "skills", "sync", "-y"])
            .output()
            .await?;
        
        Ok(output)
    }
}
```

### 10.10 开发优先级建议

#### Phase 1: MVP（3周）—— 继承 openskills 核心

| 周次 | 任务 | 参考 openskills |
|---|---|---|
| Week 1 | 实现 4级目录优先级 | dirs.ts |
| Week 2 | 实现 SKILL.md 解析 | yaml.ts |
| Week 3 | 实现 AGENTS.md 自动生成 | agents-md.ts |

#### Phase 2: 核心功能（4周）—— CLI + GUI 双轨

| 周次 | 任务 | 说明 |
|---|---|---|
| Week 4-5 | 实现 Skills 安装（GitHub/本地/私有）| install.ts |
| Week 6 | 实现来源追踪 | skill-metadata.ts |
| Week 7 | 实现更新功能 | update.ts |

#### Phase 3: 高级功能（3周）—— 平台联动

| 周次 | 任务 | 说明 |
|---|---|---|
| Week 8 | Aidean CLI 配套工具 | npx aidean |
| Week 9 | 平台同步 + 商城 | 接入平台数据 |
| Week 10 | 君子订阅 + 私有仓库 | 会员专属 |

### 10.11 总结

#### 10.11.1 openskills 对 Aidean Desktop 的价值

| 维度 | 价值 |
|---|---|
| **SKILL.md 标准** | 定义了 Skills 的通用格式，Aidean Desktop 完全兼容 |
| **4级目录优先级** | 清晰的覆盖层级，.agent > ~/.agent > .claude > ~/.claude |
| **AGENTS.md 自动生成** | 核心功能，sync 命令维护 `<available_skills>` XML 块 |
| **来源元数据追踪** | 记录安装来源，支持精确 update |
| **Progressive Disclosure** | 按需加载 Skill 内容，保持 Context 整洁 |
| **私有 Git 仓库** | SSH/HTTPS 安装，君子订阅专属私有仓库基础 |
| **Symlink 开发模式** | 本地开发者工作流，开发者中心支持 |
| **CI 模式 (-y)** | 自动化脚本支持，平台 API 下发配置 |
| **CLI 设计** | commander + @inquirer/prompts 的最佳实践 |
| **Apache-2.0** | 可自由参考代码，商业使用无障碍 |

#### 10.11.2 Aidean Desktop 的差异化定位

```
市场定位对比：

openskills         →   「Skills 通用包管理器（CLI）」
                      （面向 Skills 生态，解决安装/同步/更新）
                      纯命令行，适合开发者
                      
Aidean Desktop     →   「AI Skills & MCP 生态中枢（GUI + CLI）」
                      （面向 Skills + MCP + Agent 生态，解决发现/组合/同步/付费）
                      桌面 GUI + CLI 双轨，适合所有用户
```

**互补关系**：
- openskills 适合 **命令行用户** 快速安装 Skills
- Aidean Desktop 适合 **GUI 用户** 可视化管理 Skills + MCP + Agent
- 两者 **协议兼容**，操作结果互相可见

#### 10.11.3 关键成功因素

1. **SKILL.md 标准兼容**：使用 openskills 定义的 YAML frontmatter + Markdown 格式，与生态兼容
2. **4级目录优先级**：完全继承 .agent > ~/.agent > .claude > ~/.claude 的覆盖层级
3. **AGENTS.md 自动触发**：应用 Skills 时自动更新 AGENTS.md，无需手动执行 sync
4. **来源元数据记录**：skill_targets 表必须记录 source_ref/source_type/source_revision
5. **CLI + GUI 双轨**：提供 `npx aidean` 配套 CLI，与 Desktop 协议兼容
6. **Progressive Disclosure**：按需加载 Skill 内容，商城懒加载，任务环境按需应用
7. **私有仓库 = 付费护城河**：平台私有 Skills 仓库作为君子订阅专属
8. **Apache-2.0**：可自由参考代码，尤其是 install.ts 的来源识别逻辑

---

> **文档版本**: v2.1
> **最后更新**: 2026-03-26

---

## 十一、Skills双协议与目录路径完整参考

> 完整路径表见：`.example/config-paths-reference.md`

### 11.1 openskills的协议定位

openskills 同时支持两套协议，是目前唯一明确兼容双协议的工具：

| 协议 | 安装标志 | 目标路径 | 说明 |
|---|---|---|---|
| **Anthropic协议** | 默认（无标志）| `./.claude/skills/` | 项目级Claude路径 |
| **Anthropic协议** | `--global` | `~/.claude/skills/` | 全局Claude路径 |
| **OpenAI/通用协议** | `--universal` | `./.agent/skills/` | 项目级通用路径 |
| **OpenAI/通用协议** | `--global --universal` | `~/.agent/skills/` | 全局通用路径 |

### 11.2 两套协议的根本区别（openskills视角）

```
Anthropix SKILL.md协议（--claude路径）：
  ~/.claude/skills/
  └── my-skill/
      └── SKILL.md   ← Agent按需加载（渐进式）
                       frontmatter描述注入Context
                       全文只在需要时才加载

OpenAI/通用AGENTS.md协议（--universal路径）：
  ~/.agent/skills/
  └── my-skill/
      └── SKILL.md   ← 汇总写入AGENTS.md（全量）

  openskills sync 命令将已安装Skills汇总写入：
  ./AGENTS.md 或自定义路径
  格式：<skills_system><available_skills>...
  所有Skills在Agent启动时全量注入Context
```

### 11.3 目录优先级（4级，openskills标准）

```
发现优先级（高→低）：
  1. {workspace}/.agent/skills/    ← 项目universal（最高）
  2. ~/.agent/skills/               ← 全局universal
  3. {workspace}/.claude/skills/   ← 项目Anthropic
  4. ~/.claude/skills/              ← 全局Anthropic（最低）

同名Skill：高优先级目录中的版本覆盖低优先级
```

### 11.4 AGENTS.md生成格式（OpenAI协议输出）

```xml
<!-- openskills sync 生成的标准格式 -->
<skills_system priority="1">
  <usage>
    When users ask you to perform tasks, check if any of the
    available skills below can help...
    How to use skills:
    - Invoke: Bash("npx openskills read <skill-name>")
  </usage>
  <available_skills>
    <skill>
      <name>pdf</name>
      <description>Comprehensive PDF toolkit...</description>
      <location>project</location>  <!-- project | global -->
    </skill>
  </available_skills>
</skills_system>
```

**关键点**：`<usage>`块告诉Agent如何通过`npx openskills read`加载Skill全文，
实现了在AGENTS.md全量注入结构的同时，保留了渐进式加载的能力。

### 11.5 Aidean Desktop双协议实现方案

```typescript
// 安装一个Skill时，Aidean Desktop的处理流程
async function installSkill(source: string, options: InstallOptions) {
  // 1. 安装到中心仓库
  const central = await installToCenter(source);

  // 2. 同步到Anthropic协议路径
  for (const tool of detectedTools) {
    const target = getAnthropicSkillsPath(tool);
    await syncDir(central.path, target, {
      mode: tool.isCursor ? 'copy' : 'auto' // Cursor强制copy
    });
  }

  // 3. 同步到通用路径（openskills兼容）
  await syncDir(central.path, '~/.agent/skills/' + central.name, { mode: 'auto' });

  // 4. 可选：更新项目AGENTS.md
  if (options.updateAgentsMd) {
    await updateAgentsMd('./AGENTS.md', central);
    // 生成openskills兼容的XML格式
  }
}

// AGENTS.md更新（openskills sync兼容格式）
async function updateAgentsMd(path: string, skill: SkillRecord) {
  const content = readFileSync(path, 'utf-8');
  const newXml = generateSkillsXml(getInstalledSkills());
  const updated = replaceSkillsSection(content, newXml);
  writeFileSync(path, updated);
}
```

### 11.6 全平台路径速查（openskills关注的路径）

| 路径 | macOS/Linux | Windows |
|---|---|---|
| **全局Anthropic** | `~/.claude/skills/` | `%USERPROFILE%\.claude\skills\` |
| **全局通用** | `~/.agent/skills/` | `%USERPROFILE%\.agent\skills\` |
| **项目Anthropic** | `./.claude/skills/` | 同左 |
| **项目通用** | `./.agent/skills/` | 同左 |
| **AGENTS.md输出** | `./AGENTS.md`（默认）| 同左 |
| **自定义输出** | `--output .ruler/AGENTS.md` | 同左 |
> **状态**: 基于 openskills 完善的 Aidean Desktop 设计方案
