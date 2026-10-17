# 阶段 S1 · 价格历史唯一约束修复（数据完整性，已确认缺陷）

> 版本: v0.7 | 更新: 2026-10-17 | 变更: 任务规划V0.7.0（基线 nevermeetagain/Aidean main@ffa158c，业务树仍 = 77c7952；承 V0.5.0 84 卡 + V0.6.0 对账结论；新增 B-0 主线归一与他线复核 4 卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

- **交付**：同一模型多次采集不再 P2002；为限时优惠多行价格铺路
- **可演示行为（本刀新增）**：同一模型连续三次采集写价成功，当前价恰 1 条（集成测试绿）
- **启动闸门 / 待裁决**：无（缺陷已在 PGlite PG16.4 复现）
- **任务数**：5（Hark 1 / 外部Agent 4）｜条件卡 0｜工时 ≈ 21h

## 执行顺序（按依赖层级）

| 层级 | 任务 | 执行者 | 所有权 | 依赖 |
|---|---|---|---|---|
| L1 | [TASK-076](../../05_execution/tasks/TASK-076.md) 后端红线核验测试：字段所有权（sync 不覆盖人工字段）+ model_change_logs 全写入面 + 通用版等级固定序 | 外部Agent | Agent-API | TASK-085 |
| L7 | [TASK-010](../../05_execution/tasks/TASK-010.md) 固化复现：PG16 集成测试证明二次写价违反唯一索引（规划期已在 PGlite PG16.4 复现 23505） | 外部Agent | Agent-Data | TASK-006 |
| L8 | [TASK-011](../../05_execution/tasks/TASK-011.md) ADR-P003 + 迁移 M-001：is_current 改为部分唯一索引（WHERE is_current） | Hark(主Agent) | Agent-Data | TASK-010 |
| L9 | [TASK-012](../../05_execution/tasks/TASK-012.md) persistPrices 修正：单模型仅一条 current、事务化 | 外部Agent | Agent-Data | TASK-011 |
| L10 | [TASK-013](../../05_execution/tasks/TASK-013.md) S1 文档同步：数据库文档 model_prices 约束口径 + 台账登记缺陷闭环 | 外部Agent | Agent-Docs | TASK-012 |

## 切片验收（独立验证者只看 diff + 运行结果，输出 PASS / FAIL / UNKNOWN）

- [ ] TASK-076：`pnpm --filter web exec vitest run lib/features/admin/__tests__ lib/features/gateway/__tests__/tier-order.spec.ts && pnpm --filter web exec tsc --noEmit`
- [ ] TASK-010：`DATABASE_URL=postgresql://... pnpm --filter web exec vitest run lib/sync/writers/__tests__/persist-prices.int.spec.ts`
- [ ] TASK-011：`pnpm --filter web exec prisma migrate deploy && pnpm --filter web exec vitest run lib/sync/writers/__tests__/persist-prices.int.spec.ts`
- [ ] TASK-012：`pnpm --filter web exec vitest run lib/sync`
- [ ] TASK-013：`node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs`
- [ ] `node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs` 全 PASS
- [ ] `pnpm --filter @aidean/shared exec tsc --noEmit && pnpm --filter web exec tsc --noEmit && pnpm --filter @aidean/shared test && pnpm --filter web test` 全绿（不得低于基线 118 / 1081 例）

## 完成定义（DoD，全项目唯一口径见 11_基线指标.md §11.3）

所有权内 diff 符合任务 ∧ 验收条目逐条有结果 ∧ 自动测试可复现 ∧ 证据可让一周后的人复现 ∧ 守卫通过 ∧ 无新增同类错误 ∧ 未改冻结契约（除非本任务即改契约）。
