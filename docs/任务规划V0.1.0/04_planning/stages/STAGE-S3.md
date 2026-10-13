# 阶段 S3 · 收藏

> 版本: v0.1 | 更新: 2026-10-13 | 变更: 首次落档（任务规划V0.1.0）

- **交付**：登录用户收藏模型/站点并在控制台管理
- **可演示行为（本刀新增）**：登录用户在模型详情页点星收藏 → 控制台「我的收藏」可见 → 取消后消失
- **启动闸门 / 待裁决**：U-8（是否保留需求）
- **任务数**：5（Hark 1 / 外部Agent 4）｜工时 ≈ 26h

## 执行顺序（按依赖层级）

| 层级 | 任务 | 执行者 | 所有权 | 依赖 |
|---|---|---|---|---|
| L2 | [TASK-021](../../05_execution/tasks/TASK-021.md) 收藏契约落地（favorites.schema.ts） | 外部Agent | Agent-Contract | TASK-001 |
| L3 | [TASK-022](../../05_execution/tasks/TASK-022.md) 收藏 API：GET/POST /api/v1/user/favorites + DELETE /[id] | 外部Agent | Agent-API | TASK-021, TASK-015 |
| L4 | [TASK-023](../../05_execution/tasks/TASK-023.md) UI：收藏按钮（详情页/天梯卡片）+ 控制台「我的收藏」Tab | Hark(主Agent) | Agent-App | TASK-022 |
| L6 | [TASK-024](../../05_execution/tasks/TASK-024.md) e2e：收藏端到端（收藏→控制台可见→取消→未登录引导） | 外部Agent | Agent-Guard | TASK-023, TASK-006 |
| L11 | [TASK-025](../../05_execution/tasks/TASK-025.md) S3 文档同步：API 文档登记收藏端点 + 数据库文档 favorites 由「零消费」改「已消费」 | 外部Agent | Agent-Docs | TASK-024 |

## 切片验收（独立验证者只看 diff + 运行结果，输出 PASS / FAIL / UNKNOWN）

- [ ] TASK-021：`pnpm --filter @aidean/shared exec tsc --noEmit && pnpm --filter @aidean/shared test`
- [ ] TASK-022：`pnpm --filter web exec vitest run lib/features/favorites && pnpm --filter web exec tsc --noEmit`
- [ ] TASK-023：`pnpm --filter web exec tsc --noEmit && pnpm --filter web lint`
- [ ] TASK-024：`pnpm exec playwright test e2e/web/favorites.spec.ts --config playwright.config.ts --project=web --workers=1`
- [ ] TASK-025：`node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs`
- [ ] `node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs` 全 PASS
- [ ] `pnpm --filter @aidean/shared exec tsc --noEmit && pnpm --filter web exec tsc --noEmit && pnpm --filter @aidean/shared test && pnpm --filter web test` 全绿（不得低于基线 118 / 1081 例）

## 完成定义（DoD，全项目唯一口径见 11_基线指标.md §11.3）

所有权内 diff 符合任务 ∧ 验收条目逐条有结果 ∧ 自动测试可复现 ∧ 证据可让一周后的人复现 ∧ 守卫通过 ∧ 无新增同类错误 ∧ 未改冻结契约（除非本任务即改契约）。
