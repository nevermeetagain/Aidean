# EVD-010 — TASK-010 R-01 复现集成回归（persist-prices.int）

> 卡：TASK-010（固化 REQ-F-019 / R-01 缺陷复现，真实 PG16）
> 环境：docker `shared-postgres`（PostgreSQL 16，宿主 `localhost:5435`），目标库 `aidean_evd13`（空库纯迁移重建，含 M-001 部分唯一索引）
> 命令：`DATABASE_URL=...aidean_evd13 npx vitest run lib/sync/writers/__tests__/persist-prices.int.spec.ts`

## 结论（已确认）

`vitest-int.txt`：`Test Files 1 passed (1)` / `Tests 2 passed (2)`。

- 三轮 `upsertModel` 驱动 `persistPrices` 在真实 PG16 + 部分唯一索引下**不再触发 P2002/23505**（旧 `@@unique([model_id,is_current])` 会在第三次采集 `updateMany(current→false)` 撞历史 false 行）。
- 断言「多次采集后每模型恰 1 行 `is_current=true`」通过 → R-01 修复在物理库层生效。

## 红→绿对照

修复前（旧唯一约束）：round3 报 `P2002`（见台账 §7.35 TASK-010 行、提交 `2850e7cb`）。
修复后（M-001 部分唯一索引 + persistPrices 事务化单当前价）：本 EVD 2 passed。

## DB 门控说明

`persist-prices.int.spec.ts` 依赖 `DATABASE_URL`；无该环境变量时自动 skip（全量 vitest 中计入 skipped，属预期，非回归）。本取证显式注入 `aidean_evd13` 使其真实执行。
