# ADR-0007：主干迁移——huaweicloud 成为唯一主干，main 冻结为备份

> 状态：已接受 | 日期：2026-09-29 | 关联：《未完成事项目录》v2.15 §7.15、《文档索引》v1.63

## 一、背景

2026-09-22（merge-base `cd46fcc3`）起仓库出现双主干并行：`main`（此后独有 15 提交，止于 2026-09-24 16:56）与 `huaweicloud`（此后独有 39 提交，活跃至今）。两周内每次提交都需重新裁决「真源在哪个分支」（`c65977cc` 提交语已出现「main 仓不同步（管理者决策）」的口头治理），认知分裂成本随提交数线性增长。

2026-09-29 实测取证：

- `git cherry huaweicloud main` 显示 main 独有提交 patch **全部非等价**——但并行开发下 patch-id 法系统性误报：符号级抽查证明部分功能已在 huaweicloud 独立重实现（Dockerfile `packages/ui` COPY 修复已在 `Dockerfile:41-43`；run-due 路由已含 SETNX 互斥字样），部分确认缺失（AdminTable 共用件、FeatureFlag 读侧门面、`tests/contract` 17 契约测试）。
- 树差异 26706 文件中 26396 为权限位噪声（644↔755，本地 `core.filemode=false` 不受影响），真实内容差异仅 494 文件——**全量 merge 必然引入海量假差异与模式冲突**，故弃用 merge 路径。

## 二、决策（管理者 2026-09-29 裁决）

**`huaweicloud` 自本 ADR 起为仓库唯一主干与开发分支；`main` 冻结保留为历史备份，其独有提交不做带入。**

1. GitHub 默认分支 main → huaweicloud（`gh api -X PATCH repos/aideanew/Aidean`，瞬时生效、一条命令可逆）。
2. main 不删除、不重命名，作为 2026-09-22~24 分叉窗口期（合并基 `cd46fcc3`）的完整备份。
3. main 独有 15 提交**显式放弃带入**：确认缺失的资产（AdminTable 共用件、FeatureFlag 读侧门面、契约测试等）如未来需要，按当时需求重新实现，不做考古式搬运。
4. **平台限制注记**：私有仓库免费计划下，经典分支保护与 Rulesets API 均返回 403（升级 Pro 或公开化才可用，均已实测）。main 的冻结因此为**程序性冻结**——默认分支已移走 + 本 ADR 决策 + 单人协作无第二写者 + CI 双分支触发无需借道 main。若未来需要平台级强制（防误推/防误删），路径有二：升级 GitHub Pro，或仓库公开化；均属管理者决策，本轮不执行。
5. 观察期 1–2 周后可另行裁决「正名」（huaweicloud → main 双跳重命名，登记为《未完成事项目录》#75），本轮不执行。

## 三、影响

- 新克隆、新 PR、Actions 触发默认全部落在 huaweicloud；`ci.yml` 本就 `branches: [main, huaweicloud]` 双触发（ci.yml:13-18），切换零断窗。
- 本地 `origin/HEAD` 已刷新指向 huaweicloud。
- 文档与脚本不得再以 main 为真源基线；「main 分支」一词在活文档中仅允许以「冻结备份」口径出现。
- 回滚：默认分支一条 API 改回 main 即恢复原状；huaweicloud 分支历史与数据不受任何影响。
