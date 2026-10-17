# 阶段 S7 · 文档治理收口 + 统一需求追溯矩阵

> 版本: v0.7 | 更新: 2026-10-17 | 变更: 任务规划V0.7.0（基线 nevermeetagain/Aidean main@ffa158c，业务树仍 = 77c7952；承 V0.5.0 84 卡 + V0.6.0 对账结论；新增 B-0 主线归一与他线复核 4 卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

- **交付**：需求文档 v1.15 + 台账拆分 + RTM 入库 + 台账状态矛盾消解
- **可演示行为（本刀新增）**：需求文档 v1.15 与代码事实一致；台账拆分后门禁全绿；docs/product/requirements/需求追溯矩阵.md 成为唯一追溯表
- **启动闸门 / 待裁决**：U-1/U-2/U-11/U-15
- **任务数**：5（Hark 2 / 外部Agent 3）｜条件卡 0｜工时 ≈ 16h

## 执行顺序（按依赖层级）

| 层级 | 任务 | 执行者 | 所有权 | 依赖 |
|---|---|---|---|---|
| L1 | [TASK-087](../../05_execution/tasks/TASK-087.md) V0.5.0 规划树文件名 mojibake 修复（24 个双编码文件名 git mv 为正字 + 引用修正） | 外部Agent | Agent-Docs | TASK-085 |
| L2 | [TASK-088](../../05_execution/tasks/TASK-088.md) 治理登记：目录结构文档登记 V0.7.0 树 + task-index 状态回写 + docs/执行过程.md 归档拆分 | 外部Agent | Agent-Docs | TASK-086 |
| L14 | [TASK-040](../../05_execution/tasks/TASK-040.md) 需求文档 v1.15 对齐代码事实与用户裁决 | Hark(主Agent) | Agent-Docs | TASK-009 |
| L15 | [TASK-041](../../05_execution/tasks/TASK-041.md) 台账拆分 + 勾选滞后补录 + CHANGELOG 补录 finalize 里程碑 | 外部Agent | Agent-Docs | TASK-040 |
| L16 | [TASK-051](../../05_execution/tasks/TASK-051.md) 统一需求追溯矩阵入库 + 台账内部状态矛盾消解（#17/#36） | Hark(主Agent) | Agent-Docs | TASK-041 |

## 切片验收（独立验证者只看 diff + 运行结果，输出 PASS / FAIL / UNKNOWN）

- [ ] TASK-087：`git ls-files docs/任务规划V0.5.0 | grep -cP '[鍔娣瑙浜鏁鍨渚鎵椋钀鑷宸澶閲绔绗闇浠]'; node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs`
- [ ] TASK-088：`node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs && test ! -f docs/执行过程.md && grep -q '任务规划V0.7.0' docs/governance/目录结构文档.md; echo exit=$?`
- [ ] TASK-040：`node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs`
- [ ] TASK-041：`node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs`
- [ ] TASK-051：`node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs`
- [ ] `node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs` 全 PASS
- [ ] `pnpm --filter @aidean/shared exec tsc --noEmit && pnpm --filter web exec tsc --noEmit && pnpm --filter @aidean/shared test && pnpm --filter web test` 全绿（不得低于基线 118 / 1081 例）

## 完成定义（DoD，全项目唯一口径见 11_基线指标.md §11.3）

所有权内 diff 符合任务 ∧ 验收条目逐条有结果 ∧ 自动测试可复现 ∧ 证据可让一周后的人复现 ∧ 守卫通过 ∧ 无新增同类错误 ∧ 未改冻结契约（除非本任务即改契约）。
