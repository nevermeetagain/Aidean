# 阶段 S10 · 模型源监控·步行骨架（公开源）

> 版本: v0.7 | 更新: 2026-10-17 | 变更: 任务规划V0.7.0（基线 nevermeetagain/Aidean main@ffa158c，业务树仍 = 77c7952；承 V0.5.0 84 卡 + V0.6.0 对账结论；新增 B-0 主线归一与他线复核 4 卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

- **交付**：后台可见：5 个公开源按分级注册 → 运行 OpenRouter/AIHubMix/Quanzil 目录采集 → 快照/观测入库 → 变更流显示「新上架/下架/调价」
- **可演示行为（本刀新增）**：后台「模型源监控」页：5 个公开源按 S1/S2/A/B/C 分级注册；手动运行 OpenRouter 后变更流出现新上架/调价事件（证据可点开）
- **启动闸门 / 待裁决**：无 BLOCKING（全部公开源，无需 Key）；U-M4/U-M6 以默认假设推进
- **任务数**：10（Hark 5 / 外部Agent 5）｜条件卡 0｜工时 ≈ 60h

## 执行顺序（按依赖层级）

| 层级 | 任务 | 执行者 | 所有权 | 依赖 |
|---|---|---|---|---|
| L6 | [TASK-056](../../05_execution/tasks/TASK-056.md) 监控契约落地：monitoring.schema.ts（源/快照/观测/变更事件/管理端 DTO）+ 2 个新错误码 | Hark(主Agent) | Agent-Contract | TASK-001 |
| L7 | [TASK-060](../../05_execution/tasks/TASK-060.md) 目录采集器框架 + 3 个公开源（OpenRouter /api/v1/models、AIHubMix /api/v1/models、Quanzil /api/pricing） | Hark(主Agent) | Agent-API | TASK-056 |
| L9 | [TASK-058](../../05_execution/tasks/TASK-058.md) 迁移 M-002：monitoring_sources / catalog_snapshots / provider_model_observations / catalog_change_events + 种子注册公开源 + 后台导航节点 | Hark(主Agent) | Agent-Data | TASK-011, TASK-056 |
| L10 | [TASK-059](../../05_execution/tasks/TASK-059.md) 仓储：目录快照与观测写入器（幂等、原始响应哈希、首次/末次出现） | 外部Agent | Agent-Data | TASK-058 |
| L11 | [TASK-061](../../05_execution/tasks/TASK-061.md) 变更检测：快照 diff → catalog_change_events（新上架/下架/价格变动/新模型首次出现）+ 证据链 | 外部Agent | Agent-API | TASK-059, TASK-060 |
| L12 | [TASK-062](../../05_execution/tasks/TASK-062.md) 调度脚本 monitor_catalogs.ts（按源 cron 运行 collector→writer→diff，单源失败不影响他源） | 外部Agent | Agent-Guard | TASK-061 |
| L12 | [TASK-063](../../05_execution/tasks/TASK-063.md) 管理端 API：/api/v1/admin/monitoring/{sources, sources/:key, sources/:key/run, changes} | 外部Agent | Agent-API | TASK-058, TASK-061 |
| L13 | [TASK-064](../../05_execution/tasks/TASK-064.md) 后台 UI：「模型源监控」页（源分级卡片 + 健康/最后运行 + 变更流 + 手动运行，五态齐全） | Hark(主Agent) | Agent-App | TASK-063 |
| L14 | [TASK-065](../../05_execution/tasks/TASK-065.md) E2E：后台监控页五态 + 手动运行后变更流出现新事件（fixture 源） | 外部Agent | Agent-Guard | TASK-062, TASK-064, TASK-037, TASK-006 |
| L17 | [TASK-057](../../05_execution/tasks/TASK-057.md) 文档：模型源监控设计入库 + 需求文档新增 §3.4.2「模型源监控」+ 文档索引登记 | Hark(主Agent) | Agent-Docs | TASK-056 |

## 切片验收（独立验证者只看 diff + 运行结果，输出 PASS / FAIL / UNKNOWN）

- [ ] TASK-056：`pnpm --filter @aidean/shared exec tsc --noEmit && pnpm --filter @aidean/shared test`
- [ ] TASK-060：`pnpm --filter web exec vitest run lib/monitoring/catalog && pnpm --filter web exec tsc --noEmit`
- [ ] TASK-058：`cd apps/web && DATABASE_URL=$TEST_DATABASE_URL npx prisma migrate deploy && DATABASE_URL=$TEST_DATABASE_URL npx prisma db seed && pnpm --filter web exec vitest run lib/admin-nav`
- [ ] TASK-059：`pnpm --filter web exec vitest run lib/sync/writers/catalog-snapshot.spec.ts && pnpm --filter web exec tsc --noEmit`
- [ ] TASK-061：`pnpm --filter web exec vitest run lib/monitoring/diff && pnpm --filter web exec tsc --noEmit`
- [ ] TASK-062：`npx tsx scripts/crawl/monitor_catalogs.ts --help && MONITOR_FIXTURE_DIR=apps/web/lib/monitoring/catalog/__tests__/fixtures npx tsx scripts/crawl/monitor_catalogs.ts --source all --dry-run`
- [ ] TASK-063：`pnpm --filter web exec vitest run lib/monitoring/__tests__/admin-routes.spec.ts && pnpm --filter web exec tsc --noEmit`
- [ ] TASK-064：`pnpm --filter web exec tsc --noEmit && pnpm --filter web lint && cd apps/web && npx next build`
- [ ] TASK-065：`npx playwright test e2e/admin/monitoring.spec.ts --config playwright.config.ts`
- [ ] TASK-057：`node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs && grep -c 'REQ-M-0' docs/product/requirements/需求文档.md`
- [ ] `node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs` 全 PASS
- [ ] `pnpm --filter @aidean/shared exec tsc --noEmit && pnpm --filter web exec tsc --noEmit && pnpm --filter @aidean/shared test && pnpm --filter web test` 全绿（不得低于基线 118 / 1081 例）

## 完成定义（DoD，全项目唯一口径见 11_基线指标.md §11.3）

所有权内 diff 符合任务 ∧ 验收条目逐条有结果 ∧ 自动测试可复现 ∧ 证据可让一周后的人复现 ∧ 守卫通过 ∧ 无新增同类错误 ∧ 未改冻结契约（除非本任务即改契约）。
