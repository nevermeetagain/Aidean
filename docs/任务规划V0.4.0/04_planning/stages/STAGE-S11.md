# 阶段 S11 · 模型多源上架与价格对比（前台可见）

> 版本: v0.4 | 更新: 2026-10-14 | 变更: 任务规划V0.4.0（基于 main@bfb3aef 复核，业务树 = 77c7952；未实现需求核查 + 模型源监控体系纳入统一规划）

- **交付**：模型详情页显示该模型在哪些源可调用及原币价格；llmtest 观测入时序；（条件）观测同步到平台实体；（条件）发现引擎汇率统一
- **可演示行为（本刀新增）**：前台模型详情页显示「在哪里可调用」：多源上架状态 + 原币价格 + relay 身份未验证提示
- **启动闸门 / 待裁决**：U-M5（仅 TASK-068）/ U-15（仅 TASK-069）
- **任务数**：5（Hark 2 / 外部Agent 3）｜条件卡 2｜工时 ≈ 27h

## 执行顺序（按依赖层级）

| 层级 | 任务 | 执行者 | 所有权 | 依赖 |
|---|---|---|---|---|
| L9 | [TASK-073](../../05_execution/tasks/TASK-073.md) llmtest 观测入时序：composite 分数/存活/通过计数写 ReliabilityObservation（不再只塞 description） | 外部Agent | Agent-API | TASK-058 |
| L10 | [TASK-066](../../05_execution/tasks/TASK-066.md) 公开 API：GET /api/v1/models/{id}/offerings（该模型在各监控源的上架与原币价格，含来源与采集时间） | 外部Agent | Agent-API | TASK-059, TASK-056 |
| L10 | [TASK-068](../../05_execution/tasks/TASK-068.md) 上架同步：观测 → ProviderModelOffering（源↔平台实体映射，listedAt=firstSeenAt，isActive=isListed） | Hark(主Agent) | Agent-Data | TASK-059 |
| L11 | [TASK-067](../../05_execution/tasks/TASK-067.md) 前台 UI：模型详情页「在哪里可调用」区块（多源上架/价格对比/中转风险提示/来源署名） | Hark(主Agent) | Agent-App | TASK-066 |
| L11 | [TASK-069](../../05_execution/tasks/TASK-069.md) 发现引擎汇率统一：pricing-extraction.ts 硬编码 7.2 → 读 system_configs pricing.fxUsdCny | 外部Agent | Agent-API | TASK-055 |

## 切片验收（独立验证者只看 diff + 运行结果，输出 PASS / FAIL / UNKNOWN）

- [ ] TASK-073：`pnpm --filter web exec vitest run lib/discovery/llmtest.spec.ts && pnpm --filter web exec tsc --noEmit`
- [ ] TASK-066：`pnpm --filter web exec vitest run lib/monitoring/__tests__/offerings-route.spec.ts && pnpm --filter web exec tsc --noEmit`
- [ ] TASK-068：`pnpm --filter web exec vitest run lib/sync/writers/offering-sync.spec.ts && pnpm --filter web exec tsc --noEmit`
- [ ] TASK-067：`pnpm --filter web exec tsc --noEmit && pnpm --filter web lint && cd apps/web && npx next build`
- [ ] TASK-069：`! grep -n '7\.2' apps/web/lib/discovery/pricing-extraction.ts && pnpm --filter web exec vitest run lib/discovery && pnpm --filter web exec tsc --noEmit`
- [ ] `node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs` 全 PASS
- [ ] `pnpm --filter @aidean/shared exec tsc --noEmit && pnpm --filter web exec tsc --noEmit && pnpm --filter @aidean/shared test && pnpm --filter web test` 全绿（不得低于基线 118 / 1081 例）

## 完成定义（DoD，全项目唯一口径见 11_基线指标.md §11.3）

所有权内 diff 符合任务 ∧ 验收条目逐条有结果 ∧ 自动测试可复现 ∧ 证据可让一周后的人复现 ∧ 守卫通过 ∧ 无新增同类错误 ∧ 未改冻结契约（除非本任务即改契约）。
