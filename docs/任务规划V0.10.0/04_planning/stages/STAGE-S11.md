# 阶段 S11 · 模型多源上架与价格对比（前台可见）

> 版本: v0.10 | 更新: 2026-10-19 | 变更: 任务规划V0.10.0（基线 main@ff08433；外部助手完成 085/091/090/009/013/020/025/038/059/028/093/073 并经独立审查，12 卡移出；审查缺陷拆为 095–099；仅保留未完成卡；契约唯一源仍为 packages/shared/src（冻结稿 docs/任务规划V0.5.0/contracts））

- **交付**：模型详情页显示该模型在哪些源可调用及原币价格；llmtest 观测入时序；（条件）观测同步到平台实体；（条件）发现引擎汇率统一
- **可演示行为（本刀新增）**：前台模型详情页显示「在哪里可调用」：多源上架状态 + 原币价格 + relay 身份未验证提示
- **启动闸门 / 待裁决**：U-M5（仅 TASK-068）/ U-15（仅 TASK-069）
- **任务数**：6（Hark 4 / 外部Agent 2）｜条件卡 2｜工时 ≈ 36h

## 执行顺序（按依赖层级）

| 层级 | 任务 | 执行者 | 所有权 | 依赖 |
|---|---|---|---|---|
| L0 | [TASK-066](../../05_execution/tasks/TASK-066.md) 扩展既有 GET /api/v1/models/[id]/stations：追加各监控源上架状态与原币价格（向后兼容，不新建 offerings 端点） | Hark(主Agent) | Agent-API | — |
| L0 | [TASK-068](../../05_execution/tasks/TASK-068.md) 上架同步：观测 → ProviderModelOffering（源↔平台实体映射，listedAt=firstSeenAt，isActive=isListed） | Hark(主Agent) | Agent-Data | — |
| L2 | [TASK-069](../../05_execution/tasks/TASK-069.md) 发现引擎汇率统一：pricing-extraction.ts 硬编码 7.2 → 读 system_configs pricing.fxUsdCny | 外部Agent | Agent-API | TASK-055 |
| L4 | [TASK-067](../../05_execution/tasks/TASK-067.md) 前台 UI：模型详情页「在哪里可调用」区块（多源上架/价格对比/中转风险提示/来源署名） | Hark(主Agent) | Agent-App | TASK-066 |
| L5 | [TASK-074](../../05_execution/tasks/TASK-074.md) UI：模型详情页基准测试弹窗 + 历史测评示例（多模型回答并排）替换「即将上线」占位 | Hark(主Agent) | Agent-App | TASK-067 |
| L6 | [TASK-075](../../05_execution/tasks/TASK-075.md) e2e：模型详情页基准弹窗与测评示例 | 外部Agent | Agent-Guard | TASK-074, TASK-006 |

## 切片验收（独立验证者只看 diff + 运行结果，输出 PASS / FAIL / UNKNOWN）

- [ ] TASK-066：`pnpm --filter web exec vitest run lib/monitoring/__tests__/offerings-route.spec.ts && pnpm --filter web exec tsc --noEmit`
- [ ] TASK-068：`pnpm --filter web exec vitest run lib/sync/writers/offering-sync.spec.ts && pnpm --filter web exec tsc --noEmit`
- [ ] TASK-069：`! grep -n '7\.2' apps/web/lib/discovery/pricing-extraction.ts && pnpm --filter web exec vitest run lib/discovery && pnpm --filter web exec tsc --noEmit`
- [ ] TASK-067：`pnpm --filter web exec tsc --noEmit && pnpm --filter web lint && cd apps/web && npx next build`
- [ ] TASK-074：`pnpm --filter web exec tsc --noEmit && pnpm --filter web lint && ! grep -n '即将上线' 'apps/web/app/(site)/models/[slug]/page.tsx'`
- [ ] TASK-075：`pnpm test:e2e -g model-detail-benchmark`
- [ ] `node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs` 全 PASS
- [ ] `pnpm --filter @aidean/shared exec tsc --noEmit && pnpm --filter web exec tsc --noEmit && pnpm --filter @aidean/shared test && pnpm --filter web test` 全绿（不得低于基线 118 / 1081 例）

## 完成定义（DoD，全项目唯一口径见 11_基线指标.md §11.3）

所有权内 diff 符合任务 ∧ 验收条目逐条有结果 ∧ 自动测试可复现 ∧ 证据可让一周后的人复现 ∧ 守卫通过 ∧ 无新增同类错误 ∧ 未改冻结契约（除非本任务即改契约）。
