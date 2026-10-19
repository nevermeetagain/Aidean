# 阶段 S1 · 价格历史唯一约束修复（数据完整性，已确认缺陷）

> 版本: v0.9 | 更新: 2026-10-19 | 变更: 任务规划V0.9.0（V0.8.0 剩余部分；B-0' 已裁决 A'＝镜像 main 为开发线；Hark 完成 089/026/082/027/056/058/060/057 并经独立审查；已完成卡移出，仅保留未完成卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

- **交付**：同一模型多次采集不再 P2002；为限时优惠多行价格铺路
- **可演示行为（本刀新增）**：同一模型连续三次采集写价成功，当前价恰 1 条（集成测试绿）
- **启动闸门 / 待裁决**：无（缺陷已在 PGlite PG16.4 复现）
- **任务数**：2（Hark 0 / 外部Agent 2）｜条件卡 0｜工时 ≈ 3h

## 执行顺序（按依赖层级）

| 层级 | 任务 | 执行者 | 所有权 | 依赖 |
|---|---|---|---|---|
| L0 | [TASK-091](../../05_execution/tasks/TASK-091.md) PG16 真库验证：空库迁移重放 + persistPrices 三次写价 + 收藏唯一约束（证据产出，不改代码） | 外部Agent | Agent-Guard | — |
| L4 | [TASK-013](../../05_execution/tasks/TASK-013.md) S1 文档同步：数据库文档 model_prices 约束口径 + 台账登记缺陷闭环 | 外部Agent | Agent-Docs | — |

## 切片验收（独立验证者只看 diff + 运行结果，输出 PASS / FAIL / UNKNOWN）

- [ ] TASK-091：`test -n "$PG16_URL" || { echo PG16_URL_missing; exit 2; }; grep -Eq '23505|P2002' docs/任务规划V0.9.0/06_validation/evidence/EVD-091/favorites.txt && grep -q 'WHERE is_current' docs/任务规划V0.9.0/06_validation/evidence/EVD-091/model_prices.txt; echo exit=$?`
- [ ] TASK-013：`node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs`
- [ ] `node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs` 全 PASS
- [ ] `pnpm --filter @aidean/shared exec tsc --noEmit && pnpm --filter web exec tsc --noEmit && pnpm --filter @aidean/shared test && pnpm --filter web test` 全绿（不得低于基线 118 / 1081 例）

## 完成定义（DoD，全项目唯一口径见 11_基线指标.md §11.3）

所有权内 diff 符合任务 ∧ 验收条目逐条有结果 ∧ 自动测试可复现 ∧ 证据可让一周后的人复现 ∧ 守卫通过 ∧ 无新增同类错误 ∧ 未改冻结契约（除非本任务即改契约）。
