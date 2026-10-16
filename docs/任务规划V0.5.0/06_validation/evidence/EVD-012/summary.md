# EVD-012 — TASK-012 persistPrices 重写单测

> 卡：TASK-012（`persistPrices` 事务化 + 单当前价，REQ-F-019）
> 命令：`npx vitest run lib/sync/writers/__tests__/persist-prices.spec.ts`

## 结论（已确认）

`vitest-unit.txt`：`Test Files 1 passed (1)` / `Tests 2 passed (2)`。

覆盖：
1. 多价输入 → `$transaction` 内按 `effectiveAt` 降序，仅 `i===0` 行 `isCurrent=true`，其余 false（单当前价不变量）。
2. 单价格输入 → 该行 `isCurrent=true`。

配套：`writer-prices-benchmarks.spec.ts` 适配 `$transaction` mock；`field-ownership.spec.ts` 保证 sync UPDATE 只 SET 16 个 SYNC_OWNED 字段、不越权人工字段（见 EVD-076）。

## 说明

纯单元测试，mock `prisma`，不依赖 `DATABASE_URL`，全量 vitest 中始终执行。
