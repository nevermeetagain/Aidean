# 完整项目开发流程 Spec

> change-id: `establish-dev-workflow` | 语言: 中文 | 版本: v2 | 创建: 2026-08-26 | 更新: 2026-08-26（按用户裁决改为「双轨合并」与「四级层级」）

---

## 为什么（Why）

项目处于实施前夜（需求 v1.4 / schema v2.0 / ADR-0002 已采纳），存在两类缺失：

1. **元流程缺位**：「一个变更从想法到合入要经过哪几步、每步谁做、产物是什么、如何算通过」没有成文规矩；
2. **实施计划粒度不足**：《目录结构文档》§八迁移清单仅有 7 条阶段级条目，无法逐项执行与核验。

本规格以**双轨合并**回应：轨道一建立元流程（六步循环，回答"怎么做事"）；轨道二建立路线图原子任务书（回答"做什么事"）。全部内容采用**四级层级 + 最小原子字段**书写。

---

## 变更清单（What Changes）

- **轨道一（元流程）**：确立六步开发循环 `PLAN 规划 → SPEC 规格 → APPROVE 批准 → IMPLEMENT 实施 → VERIFY 核验 → CLOSE 归档` 为本项目一切变更的唯一工作节拍
- **轨道二（路线图）**：Phase 0（工程基建）→ Phase 4（二阶段能力）五阶段全量原子化展开；粒度递减策略（0-2 全细化 / 3 模块级 / 4 远景级）
- **格式标准**：定义「阶段 Phase → 任务 Task → 子任务 SubTask → 字段 Field」四级层级，每级有标题行声明本级职责；SubTask 强制内联六个原子字段（见《字段字典》）
- 定义后续里程碑增量展开规则（新里程碑 = 新 change-id 继承本流程）

**BREAKING**：`src/**` 将在实施期整体移至 `.example/history/current-legacy/src/**`（归档非删除）；根目录 `prisma/` 迁入 `apps/web/prisma/`。两者均为既有决策（ADR-0002），此处仅作变更登记。

---

## 影响面（Impact）

- Affected specs: 无既有 specs（首个 change-id，被后续所有 change-id 继承引用）
- Affected code:
  - 移动类：`src/**`、`prisma/**`
  - 新建类：`pnpm-workspace.yaml`、`turbo.json`(重写)、`packages/{shared,ui,config}/**`、`apps/web/app|components|lib|hooks|stores/**`
  - 修改类：根与应用两处 `package.json`、`apps/web/tsconfig.json`

---

## 轨道一 · 六步开发循环（ADDED Requirements）

### Requirement: 循环节拍

本项目一切功能性变更 SHALL 依序经过以下六步；任何步骤未完成不得进入下一步。

#### Step: PLAN 规划
- **WHEN** 出现新想法/问题/里程碑
- **THEN** 在对话中经深度推理澄清目标与边界（5W1H），产出待确认分叉点
- **AND** 无法自决的分叉以 AskUserQuestion 向决策人收敛，直至置信度达标

#### Step: SPEC 规格
- **WHEN** 目标与边界清晰
- **THEN** 于 `docs/specs/<动词短语-change-id>/` 写入 spec.md / tasks.md / checklist.md 三件套
- **AND** 全部采用四级层级与六字段格式（见轨道三），语言与决策人一致

#### Step: APPROVE 批准
- **WHEN** 三件套就绪
- **THEN** NotifyUser 提请审批；**AND** 被拒则仅凭决策人反馈或澄清结果修订重提，不得擅自开工

#### Step: IMPLEMENT 实施
- **WHEN** 三件套获批
- **THEN** 以 TodoWrite 同步 tasks.md 为执行看板
- **AND** 无依赖的任务委派并行 Sub-Agent 实施；主控不得直接手写实现代码
- **AND** 每完成一项即勾选 tasks.md 对应复选框

#### Step: VERIFY 核验
- **WHEN** 某 Task 全部 SubTask 勾选完毕
- **THEN** 按 checklist.md 对应分组逐检查点取证核验并勾选
- **AND** 任一失败 → tasks.md 追加 `Fix:` 任务（引用检查点编号）→ 修复 → 重验，形成闭环

#### Step: CLOSE 归档
- **WHEN** 该 change-id 的 checklist.md 全部勾选
- **THEN** 产出最终摘要回执（不做 NotifyUser）；spec 目录永久保留不删除
- **AND** 若涉及结构变更，同步更新 `docs/governance/目录结构文档.md`（铁律 6）

### Requirement: 六步循环的全局约束

- **WHEN** 变更涉及技术栈偏离 → MUST 先提交新 ADR 并获批后才可进 IMPLEMENT
- **WHEN** 变更影响公开接口响应 → MUST 保证 packages/shared Zod 契约先行更新（契约先行）
- **WHEN** 敏感配置（markup_rate/token_multiplier 等）出现在任何面向用户的输出 → 一票否决回滚

---

## 轨道二 · 阶段路线图（ADDED Requirements）

### Requirement: 五阶段推进框架

系统开发 SHALL 按 Phase 0→4 推进；任一阶段开工的前置条件为其前置阶段的 checklist 分组全部通过。

#### Scenario: 阶段门禁
- **WHEN** Phase N 准备开工
- **THEN** 校验 Phase 0..N-1 各 checklist 分组复选框全勾
- **AND** 存在未勾选项时拒绝开工并在对话中报告缺口

### Requirement: 粒度递减策略

- **WHEN** 展开 Phase 0-2 → 全部细化为 SubTask×六字段（近期高频执行）
- **WHEN** 展开 Phase 3 → 模块级 Task + 关键 SubTask，剩余细节在该模块开工时以新 change-id 追加
- **WHEN** 展开 Phase 4 → 仅 Task 级远景条目

### Requirement: 增量展开规则（供后续 change-id 引用）

后续任何 change-id 的 tasks.md SHALL 声明其所属 Phase 编号并继承本文档的四层级/六字段规范；其 checklist SHOULD 至少含一条与本 workflow 的回归联动检查（全局构建门禁）。

---

## 轨道三 · 四级层级与字段字典（ADDED Requirements）

### Requirement: 四级层级书写格式

tasks.md SHALL 按以下四级组织，且每级以标题行声明本级职责：

| 级 | Markdown 载体 | 本级职责 |
|---|---|---|
| L1 阶段 Phase | `## Phase N · 名称` | 声明阶段目标、前置条件、交付物 |
| L2 任务 Task | `### Task N.M 名称` | 一个可独立验收的功能面；声明依赖与产出 |
| L3 子任务 SubTask | `#### SubTask N.M.K 名称` | 最小可执行工作单元；字段完备即合法 |
| L4 字段 Field | SubTask 下有序列表项 | 原子信息本身（目标/范围/验收/验证命令/产出/依赖） |

#### Scenario: 格式合法性
- **WHEN** 任一 SubTask 缺失六必需字段中任一项
- **THEN** 判定为非法任务，实施者停止执行并要求补齐

### Requirement: 字段字典（L3 强制 × 6）

| 字段 | 必填 | 内容要求 |
|---|---|---|
| 【目标】 | ✅ | 一句话说明做什么与为什么 |
| 【范围】 | ✅ | 精确到 glob 的目录/文件涉及面（新建/修改/移动须注明动作类型） |
| 【验收】 | ✅ | 可证伪标准；优先写成确切命令，纯 UI/视觉允许描述式断言 |
| 【验证命令】 | ⭕ | PowerShell 兼容的可执行取证命令（有则必填） |
| 【产出】 | ⭕ | 完成后新增/变化的可见工件 |
| 【依赖】 | ⭕ | 前置 SubTask/Task 编号；无依赖可省略 |

---

## REMOVED Requirements

（无——首个 change-id，无既存 Requirement 被移除）
