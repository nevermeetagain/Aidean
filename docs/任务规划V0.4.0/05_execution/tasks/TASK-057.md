# TASK-057：文档：模型源监控设计入库 + 需求文档新增 §3.4.2「模型源监控」+ 文档索引登记

> 版本: v0.4 | 更新: 2026-10-14 | 变更: 任务规划V0.4.0（基于 main@bfb3aef 复核，业务树 = 77c7952；未实现需求核查 + 模型源监控体系纳入统一规划）

> 执行者：**外部Agent** ｜ 所有权 Agent：**Agent-Docs** ｜ 建议档位：**sonnect**

> V0.3.0→V0.4.0：新增（V0.4.0 模型源监控）

## 归属
- 所属切片：S10（模型源监控·步行骨架（公开源））
- 来源需求：REQ-M-001..016（需求登记）/ REQ-L 文档治理
- RTM 追溯（V0.4.0 统一编号，见 03a_统一需求追溯矩阵.md）：REQ-M-012
- 来源方案：DESIGN-004 / ADR-P007

## 目标
docs/architecture/模型源监控设计.md 与需求文档 §3.4.2 成文（MUST/SHOULD/COULD/MUST NOT 与 REQ-M 编号一致），check-docs-rule/facts 通过

## 输入
- 文档：`docs/任务规划V0.4.0/03_solution/design/DESIGN-004-模型源监控体系.md`；`docs/任务规划V0.4.0/03b_监控需求增量.md`；`docs/architecture/AI市场发现与智能引擎设计文档.md`
- 契约：`无（文档）`
- 前置任务：TASK-056
- 前置状态：APPROVE 已给出；U-M1..M6 裁决结果（若已有）写入

## 输出
- 新增/修改的文件路径：
  - `docs/architecture/模型源监控设计.md（新建，带版本头）`
  - `docs/product/requirements/需求文档.md（新增 §3.4.2）`
  - `docs/文档索引.md`
  - `docs/任务规划V0.4.0/06_validation/evidence/EVD-057/`（取证：命令输出/截图/日志）

## Execution Steps
1. [ ] 以 DESIGN-004 为底稿成文（引用而非复制 .example/history）
2. [ ] 需求文档 §3.4.2 写入 REQ-M 表与 MUST NOT 清单，版本头递增
3. [ ] 文档索引登记；若 check-docs-facts 断言 schema 模型数，等 TASK-058 合并后再同步数字
4. [ ] 运行「验证命令」并将完整输出存入证据目录

## 验收标准
- [ ] `node scripts/check-docs-rule.mjs` exit 0
- [ ] `node scripts/check-docs-facts.mjs` exit 0
- [ ] 需求文档 §3.4.2 含 REQ-M-001..016 全部编号（grep 计数=16）
- [ ] diff 仅落在「允许修改」范围内（`git diff --name-only` 逐行核对）

## 验证命令
```bash
node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs && grep -c 'REQ-M-0' docs/product/requirements/需求文档.md
```

## 证据路径
`docs/任务规划V0.4.0/06_validation/evidence/EVD-057/`

## 允许修改
- `docs/architecture/模型源监控设计.md`
- `docs/product/requirements/需求文档.md`
- `docs/文档索引.md`
- `docs/任务规划V0.4.0/06_validation/evidence/EVD-057/**`

## 禁止修改
- `apps/**`
- `packages/**`
- `apps/web/prisma/migrations/2026*（既有迁移只读，M-002 仅 TASK-058 可新建）`
- `.example/history/**（铁律4 历史只读）`
- `docs/任务规划V0.4.0/contracts/**（冻结契约；变更须先提 ADR 并经 opus/fable 券审批）`
- `docs/任务规划V0.1.0/** · docs/任务规划V0.2.0/** · docs/任务规划V0.3.0/**（历代规划只读）`
- `AGENTS.md`

## 依赖与阻塞
- Depends on：TASK-056
- 资源锁串行（同文件，须在其后执行）：TASK-009, TASK-020, TASK-025, TASK-031, TASK-040, TASK-041, TASK-051
- Blocks：无
- 阻塞条件：无

## 建议执行档位
sonnect　理由：按 DESIGN-004 与 RTM 机械成文，无新决策

## 升级条件
无；通用熔断：同一任务连续 2 次验收失败 → 停止改代码，改为重写任务书/升级档位/标记 blocked（禁止第 3 次硬撞）

## 预估规模
中　约 4h　≥2h
