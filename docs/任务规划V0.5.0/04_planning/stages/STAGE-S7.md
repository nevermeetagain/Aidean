# 阶段 S7 · 文档治理收口 + 统一需求追溯矩阵

> 版本: v0.5 | 更新: 2026-10-14 | 变更: 任务规划V0.5.0（基于 main@cd5b1a9 复核，业务树 = 77c7952 无 delta；V0.4.0 反向审计 28 项修正 + 14 条遗漏需求入表 + 执行者重分配与 Agent 任务书）

- **交付**：需求文档 v1.15 + 台账拆分 + RTM 入库 + 台账状态矛盾消解
- **可演示行为（本刀新增）**：需求文档 v1.15 与代码事实一致；台账拆分后门禁全绿；docs/product/requirements/需求追溯矩阵.md 成为唯一追溯表
- **启动闸门 / 待裁决**：U-1/U-2/U-11/U-15
- **任务数**：3（Hark 2 / 外部Agent 1）｜条件卡 0｜工时 ≈ 12h

## 执行顺序（按依赖层级）

| 层级 | 任务 | 执行者 | 所有权 | 依赖 |
|---|---|---|---|---|
| L13 | [TASK-040](../../05_execution/tasks/TASK-040.md) 需求文档 v1.15 对齐代码事实与用户裁决 | Hark(主Agent) | Agent-Docs | TASK-009 |
| L14 | [TASK-041](../../05_execution/tasks/TASK-041.md) 台账拆分 + 勾选滞后补录 + CHANGELOG 补录 finalize 里程碑 | 外部Agent | Agent-Docs | TASK-040 |
| L15 | [TASK-051](../../05_execution/tasks/TASK-051.md) 统一需求追溯矩阵入库 + 台账内部状态矛盾消解（#17/#36） | Hark(主Agent) | Agent-Docs | TASK-041 |

## 切片验收（独立验证者只看 diff + 运行结果，输出 PASS / FAIL / UNKNOWN）

- [ ] TASK-040：`node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs`
- [ ] TASK-041：`node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs`
- [ ] TASK-051：`node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs`
- [ ] `node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs` 全 PASS
- [ ] `pnpm --filter @aidean/shared exec tsc --noEmit && pnpm --filter web exec tsc --noEmit && pnpm --filter @aidean/shared test && pnpm --filter web test` 全绿（不得低于基线 118 / 1081 例）

## 完成定义（DoD，全项目唯一口径见 11_基线指标.md §11.3）

所有权内 diff 符合任务 ∧ 验收条目逐条有结果 ∧ 自动测试可复现 ∧ 证据可让一周后的人复现 ∧ 守卫通过 ∧ 无新增同类错误 ∧ 未改冻结契约（除非本任务即改契约）。
