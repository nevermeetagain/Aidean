# 阶段 S5 · 顶栏全局搜索

> 版本: v0.7 | 更新: 2026-10-17 | 变更: 任务规划V0.7.0（基线 nevermeetagain/Aidean main@ffa158c，业务树仍 = 77c7952；承 V0.5.0 84 卡 + V0.6.0 对账结论；新增 B-0 主线归一与他线复核 4 卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

- **交付**：顶部导航搜索模型/产品/资讯并跳转
- **可演示行为（本刀新增）**：在顶部导航输入模型名 → 下拉分组结果 → 回车跳详情页
- **启动闸门 / 待裁决**：U-5（是否需要）
- **任务数**：5（Hark 1 / 外部Agent 4）｜条件卡 5｜工时 ≈ 20h

## 执行顺序（按依赖层级）

| 层级 | 任务 | 执行者 | 所有权 | 依赖 |
|---|---|---|---|---|
| L8 | [TASK-032](../../05_execution/tasks/TASK-032.md) 搜索契约落地（search.schema.ts） | 外部Agent | Agent-Contract | TASK-001 |
| L9 | [TASK-033](../../05_execution/tasks/TASK-033.md) 搜索 API GET /api/v1/search（模型/产品/资讯，仅已发布） | 外部Agent | Agent-API | TASK-032 |
| L10 | [TASK-034](../../05_execution/tasks/TASK-034.md) UI：顶栏搜索（桌面框 + 移动端展开 + 键盘导航） | Hark(主Agent) | Agent-App | TASK-033, TASK-018 |
| L11 | [TASK-035](../../05_execution/tasks/TASK-035.md) e2e：搜索（命中/无结果/键盘跳转/移动端） | 外部Agent | Agent-Guard | TASK-034, TASK-006 |
| L18 | [TASK-036](../../05_execution/tasks/TASK-036.md) S5 文档同步：API 文档登记搜索端点 + UI/界面交互文档补搜索 | 外部Agent | Agent-Docs | TASK-035 |

## 切片验收（独立验证者只看 diff + 运行结果，输出 PASS / FAIL / UNKNOWN）

- [ ] TASK-032：`pnpm --filter @aidean/shared exec tsc --noEmit && pnpm --filter @aidean/shared test`
- [ ] TASK-033：`pnpm --filter web exec vitest run lib/features/search && pnpm --filter web exec tsc --noEmit`
- [ ] TASK-034：`pnpm --filter web exec tsc --noEmit && pnpm --filter web lint`
- [ ] TASK-035：`pnpm exec playwright test e2e/web/search.spec.ts --config playwright.config.ts --project=web --workers=1`
- [ ] TASK-036：`node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs`
- [ ] `node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs` 全 PASS
- [ ] `pnpm --filter @aidean/shared exec tsc --noEmit && pnpm --filter web exec tsc --noEmit && pnpm --filter @aidean/shared test && pnpm --filter web test` 全绿（不得低于基线 118 / 1081 例）

## 完成定义（DoD，全项目唯一口径见 11_基线指标.md §11.3）

所有权内 diff 符合任务 ∧ 验收条目逐条有结果 ∧ 自动测试可复现 ∧ 证据可让一周后的人复现 ∧ 守卫通过 ∧ 无新增同类错误 ∧ 未改冻结契约（除非本任务即改契约）。
