# 阶段 S10 · 模型源监控·步行骨架（公开源）

> 版本: v0.10 | 更新: 2026-10-19 | 变更: 任务规划V0.10.0（基线 main@ff08433；外部助手完成 085/091/090/009/013/020/025/038/059/028/093/073 并经独立审查，12 卡移出；审查缺陷拆为 095–099；仅保留未完成卡；契约唯一源仍为 packages/shared/src（冻结稿 docs/任务规划V0.5.0/contracts））

- **交付**：后台可见：5 个公开源按分级注册 → 运行 OpenRouter/AIHubMix/Quanzil 目录采集 → 快照/观测入库 → 变更流显示「新上架/下架/调价」
- **可演示行为（本刀新增）**：后台「模型源监控」页：5 个公开源按 S1/S2/A/B/C 分级注册；手动运行 OpenRouter 后变更流出现新上架/调价事件（证据可点开）
- **启动闸门 / 待裁决**：无 BLOCKING（全部公开源，无需 Key）；U-M4/U-M6 以默认假设推进
- **任务数**：7（Hark 1 / 外部Agent 6）｜条件卡 0｜工时 ≈ 32h

## 执行顺序（按依赖层级）

| 层级 | 任务 | 执行者 | 所有权 | 依赖 |
|---|---|---|---|---|
| L0 | [TASK-061](../../05_execution/tasks/TASK-061.md) 变更检测：快照 diff → catalog_change_events（新上架/下架/价格变动/新模型首次出现）+ 证据链 | 外部Agent | Agent-API | — |
| L0 | [TASK-098](../../05_execution/tasks/TASK-098.md) 快照写入器加固：空 items 不下架、分批 upsert 与事务超时、同 hash 并发返回既有快照 | 外部Agent | Agent-Data | — |
| L1 | [TASK-062](../../05_execution/tasks/TASK-062.md) 调度脚本 monitor_catalogs.ts（按源 cron 运行 collector→writer→diff，单源失败不影响他源） | 外部Agent | Agent-Guard | TASK-061 |
| L1 | [TASK-063](../../05_execution/tasks/TASK-063.md) 管理端 API：/api/v1/admin/monitoring/{sources, sources/:key, sources/:key/run, changes} | 外部Agent | Agent-API | TASK-061 |
| L2 | [TASK-064](../../05_execution/tasks/TASK-064.md) 后台 UI：「模型源监控」页（源分级卡片 + 健康/最后运行 + 变更流 + 手动运行，五态齐全） | Hark(主Agent) | Agent-App | TASK-063 |
| L3 | [TASK-065](../../05_execution/tasks/TASK-065.md) E2E：后台监控页五态 + 手动运行后变更流出现新事件（fixture 源） | 外部Agent | Agent-Guard | TASK-062, TASK-064, TASK-037, TASK-006 |
| L3 | [TASK-094](../../05_execution/tasks/TASK-094.md) 后台导航登记「模型源监控」：admin-nav 新增 /admin/monitoring 叶（权限 admin.sync.read） | 外部Agent | Agent-Data | TASK-064 |

## 切片验收（独立验证者只看 diff + 运行结果，输出 PASS / FAIL / UNKNOWN）

- [ ] TASK-061：`pnpm --filter web exec vitest run lib/monitoring/diff && pnpm --filter web exec tsc --noEmit`
- [ ] TASK-098：`pnpm --filter web exec vitest run lib/sync/writers && pnpm --filter web exec tsc --noEmit`
- [ ] TASK-062：`npx tsx scripts/crawl/monitor_catalogs.ts --help && MONITOR_FIXTURE_DIR=apps/web/lib/monitoring/catalog/__tests__/fixtures npx tsx scripts/crawl/monitor_catalogs.ts --source all --dry-run`
- [ ] TASK-063：`pnpm --filter web exec vitest run lib/monitoring/__tests__/admin-routes.spec.ts && pnpm --filter web exec tsc --noEmit`
- [ ] TASK-064：`pnpm --filter web exec tsc --noEmit && pnpm --filter web lint && cd apps/web && npx next build`
- [ ] TASK-065：`npx playwright test e2e/admin/monitoring.spec.ts --config playwright.config.ts`
- [ ] TASK-094：`pnpm --filter web exec vitest run lib/admin-nav`
- [ ] `node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs` 全 PASS
- [ ] `pnpm --filter @aidean/shared exec tsc --noEmit && pnpm --filter web exec tsc --noEmit && pnpm --filter @aidean/shared test && pnpm --filter web test` 全绿（不得低于基线 118 / 1081 例）

## 完成定义（DoD，全项目唯一口径见 11_基线指标.md §11.3）

所有权内 diff 符合任务 ∧ 验收条目逐条有结果 ∧ 自动测试可复现 ∧ 证据可让一周后的人复现 ∧ 守卫通过 ∧ 无新增同类错误 ∧ 未改冻结契约（除非本任务即改契约）。
