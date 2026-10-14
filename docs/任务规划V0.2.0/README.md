# 任务规划 V0.2.0（索引）

> 版本: v0.2 | 更新: 2026-10-14 | 变更: 首次落档——未实现需求核查与统一规划体系（基于 main 业务代码树 = 77c7952，规划基线 59e83dd）

## 一页结论
- **需求核查**：统一追溯 83 条需求——已实现 42、部分 11、未实现 19（其中 8 条暂不执行，11 条可立即做）、待澄清 11；双向追溯无游离任务、无缺口。
- **关键缺口**：计价口径未统一（网关不读币种/单位，种子 48/82 条为美元，汇率 7.2 vs 需求 5）；限时优惠未进计费；功能开关未接入；错误码三源；健康检查不探库；CI 缺 e2e/lint/ui；收藏缺失；`model_prices` 唯一索引缺陷（PGlite 已复现 23505/P2002，M-001 修复验证有效）。
- **实测**：tsc、vitest（1,203 例）、lint（0 error）、next build、docs 门禁全部通过；无数据库/Redis，e2e 未执行。
- **规划**：55 张原子任务卡（Hark 主Agent 16 张，全部 opus：契约/迁移/资金路径/全部 UI；外部Agent 39 张：sonnect 27、haiku 12），约 271h；切片 S0 → S1 → S2 → S3 → S4a → S4b（待 U-15）→ S6 → S7，S5/S8/S9 为条件刀。
- **门禁**：本目录为六步循环 PLAN+SPEC 产物，**需用户 APPROVE 后才实施**；BLOCKING 见 `12_风险与待裁决.md`（P-1 Thesis 端口、P-2 AideanBot 3333、U-15 汇率等）。

## 阅读顺序
| § | 文件 |
|---|---|
| 0 | [00_深度分析.md](00_深度分析.md) |
| 1 | [01_规划快照.md](01_规划快照.md) |
| 2 | [02_事实基线.md](02_事实基线.md) |
| 3 | [03_需求基线复核.md](03_需求基线复核.md) · [03a_统一需求追溯矩阵.md](03a_统一需求追溯矩阵.md) |
| 4 | [04_契约冻结包.md](04_契约冻结包.md) + [contracts/](contracts/README.md) |
| 5 | [05_数据模型基线.md](05_数据模型基线.md) + [database/001_init.sql](database/001_init.sql) |
| 6 | [06_垂直切片清单.md](06_垂直切片清单.md) |
| 7 | [07_原子任务卡全集.md](07_原子任务卡全集.md) + [05_execution/task-index.md](05_execution/task-index.md) |
| 8 | [08_依赖DAG.md](08_依赖DAG.md) |
| 9 | [09_所有权矩阵.md](09_所有权矩阵.md) |
| 10 | [10_档位分配与成本预算.md](10_档位分配与成本预算.md) |
| 11 | [11_基线指标.md](11_基线指标.md) |
| 12 | [12_风险与待裁决.md](12_风险与待裁决.md) |
| 13 | [13_落盘清单.md](13_落盘清单.md) |
| 14 | [14_自检结果.md](14_自检结果.md) |
| 15 | [15_前提与局限.md](15_前提与局限.md) |
| 16 | [16_第一刀与启动顺序.md](16_第一刀与启动顺序.md) |
| — | [17_V0.1.0到V0.2.0差异.md](17_V0.1.0到V0.2.0差异.md) |

## §11 结构镜像
`00_governance/glossary.md` · `03_solution/{architecture.md, decisions/ADR-P001..P006, design/DESIGN-001..003}` · `04_planning/{current-plan.md, roadmap.md, stages/STAGE-S0..S9.md}` · `05_execution/{task-template.md, task-index.md, tasks/TASK-001..055.md}` · `06_validation/evidence/EVD-BASELINE-V2/` · `contracts/` · `database/001_init.sql` · `_generator/`
