# 五维深检与管理端蓝图 Spec（probe-multidim-gaps-and-admin-blueprint）

> 版本: v1.0 | 更新: 2026-09-07 | 变更: 初稿——五维深检侦查 + 结论落档 + admin 扩容蓝图

## Why

上一轮审计（audit-full-dimension-gaps → 审计 v1.0）与 admin 收口（close-admin-loop-and-harden-billing → 审计 v1.1）以"验收三态"为主，未回答用户本轮五问：完成度之外的**联动对接状态**、**优化空间**、**数据可配置性**、**admin 管理端布局与功能遗漏**。初步侦查已发现关键事实：admin 仅一个 1290 字节单页（page.tsx + AdminConfigPanel，仅天梯颗粒度+厂商优先级两项），seed 的 13 个配置项（site.*/ui.*/security.*/pricing.*/ladder.*）**全部零读侧消费**（仅运行时 upsert 的 ladder_score_granularity 接线）——需要一次证据化深检并落档，形成 admin 扩容与配置治理的决策底稿。

## What Changes

- **Task 1 深检侦查（只读代码，零业务代码变更）**：
  - UI/交互维度：页面树全清单 + `/user/balance`、`/user/console` 等子页消费核验
  - 联动维度：内部联动闭环矩阵（gateway↔billing / admin↔config / auth↔admin / SSO 全端点）逐条标注证据（测试文件、E2E 记录）；外部等待清单（子平台接入、真实支付、微信凭据）；**空转联动盘点**（13 个 seed 配置、wechat/qrcode 预留路由、user/priorities 与 tier-mappings 等端点的消费方核验）
  - 数据维度：system_configs 14 项逐项"接线 or 裁剪"判定（rg 读侧证据）；seed 数据量级画像（20+ 模型/多厂商，距千级压测的差距）
  - admin 维度：现状画像（单页/单面板/2 API/门禁矩阵）+ 对照 API 文档 §5.8"第二阶段展开"规划的核心管理功能**缺失矩阵**（用户管理、模型/厂商 CRUD、订单/财务、内容、兑换码、同步任务、通用配置、操作审计）
- **Task 2 结论落档**：《项目状态审计.md》升 v1.2，新增"五维深检问答"章节（五问逐项证据化回答），版本标记合规（铁律 3）
- **Task 3 admin 扩容蓝图**：布局方案（侧栏分区 vs 单页分区）+ P0/P1/P2 功能矩阵 + 数据依赖，登记入审计文档行动序与二期候选（**本 spec 不实施扩容**，扩容另立 spec 从 `_template/` 起步）
- **Task 4 优化改进清单**：空转配置治理、seed 扩容、虚拟滚动压测等登记入行动序
- Task 5 checklist 核验 + spec 归档 + 项目记忆

## Impact

- 受影响 specs：audit-full-dimension-gaps（台账延续）、close-admin-loop-and-harden-billing（admin 现状基线）
- 受影响代码：**零业务代码变更**（纯侦查+文档）；文档仅《项目状态审计.md》（v1.2）与《文档索引.md》（如需）
- 后续 spec 候选：admin 管理端扩容（蓝图产出后立项）、配置项接线/裁剪专项

## ADDED Requirements

### Requirement: 五维深检证据化
系统 SHALL 对用户五问逐项产出**代码级证据**结论（文件路径/行号/rg 输出/测试名），不得凭记忆断言。

#### Scenario: 配置项接线判定
- **WHEN** 对任一 system_configs configKey 做接线判定
- **THEN** 必须给出读侧消费证据或"零消费"结论，并标注建议（接线/裁剪/挂账）

### Requirement: 结论落档与版本锚定
深检结论 SHALL 写入《项目状态审计.md》v1.2（新增五维问答章节），版本标记与锚点同步合规；admin 蓝图 SHALL 登记为后续 spec 候选而非本 spec 实施。

#### Scenario: 蓝图不越界
- **WHEN** admin 扩容蓝图完成
- **THEN** 本 spec 不修改任何 apps/web 业务代码，扩容实施另立 spec

## REMOVED Requirements

（无）
