# 阶段 S2 · 功能开关运行时（需求 §3.9）

> 版本: v0.1 | 更新: 2026-10-13 | 变更: 首次落档（任务规划V0.1.0）

- **交付**：后台切换开关 → 前台入口隐藏/页面 403/API 50011
- **可演示行为（本刀新增）**：后台关闭「大模型云服务天梯图」→ 前台导航入口消失、/providers 显示「该功能暂未开放」、API 返回 50011 → 重新开启即恢复
- **启动闸门 / 待裁决**：U-7（失败策略）
- **任务数**：7（Hark 3 / 外部Agent 4）｜工时 ≈ 39h

## 执行顺序（按依赖层级）

| 层级 | 任务 | 执行者 | 所有权 | 依赖 |
|---|---|---|---|---|
| L1 | [TASK-014](../../05_execution/tasks/TASK-014.md) 功能开关契约落地（码枚举/公开 DTO/后台 DTO/受控面映射） | Hark(主Agent) | Agent-Contract | TASK-001 |
| L2 | [TASK-015](../../05_execution/tasks/TASK-015.md) 开关服务 + 公开端点 + API 受控面接入（网关/测评/天梯站榜） | Hark(主Agent) | Agent-API | TASK-014, TASK-002 |
| L2 | [TASK-016](../../05_execution/tasks/TASK-016.md) 后台开关端点 GET/PATCH /api/v1/admin/feature-flags（审计+即时失效） | 外部Agent | Agent-API | TASK-014, TASK-002 |
| L3 | [TASK-017](../../05_execution/tasks/TASK-017.md) 后台菜单种子：新增「功能开关」入口（seed-navigation-menu + 默认树） | 外部Agent | Agent-Data | TASK-016 |
| L4 | [TASK-018](../../05_execution/tasks/TASK-018.md) UI：后台功能开关页 + 前台入口隐藏 + 功能关闭 403 态 | Hark(主Agent) | Agent-App | TASK-015, TASK-016, TASK-017 |
| L6 | [TASK-019](../../05_execution/tasks/TASK-019.md) e2e：功能开关端到端（关→入口消失+API 50011→开→恢复） | 外部Agent | Agent-Guard | TASK-018, TASK-006 |
| L10 | [TASK-020](../../05_execution/tasks/TASK-020.md) S2 文档同步：API 文档登记 3 端点 + 功能设计 §3.9 实装口径 + 术语表 | 外部Agent | Agent-Docs | TASK-019 |

## 切片验收（独立验证者只看 diff + 运行结果，输出 PASS / FAIL / UNKNOWN）

- [ ] TASK-014：`pnpm --filter @aidean/shared exec tsc --noEmit && pnpm --filter @aidean/shared test`
- [ ] TASK-015：`pnpm --filter web exec tsc --noEmit && pnpm --filter web test`
- [ ] TASK-016：`pnpm --filter web exec vitest run lib/features/auth/__tests__/admin-feature-flags.spec.ts && pnpm --filter web exec tsc --noEmit`
- [ ] TASK-017：`pnpm --filter web exec vitest run lib/admin-nav-default-tree.spec.ts lib/admin-navigation-core.spec.ts`
- [ ] TASK-018：`pnpm --filter web exec tsc --noEmit && pnpm --filter web lint`
- [ ] TASK-019：`pnpm exec playwright test e2e/admin/feature-flags.spec.ts --config playwright.config.ts --project=admin --workers=1`
- [ ] TASK-020：`node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs`
- [ ] `node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs` 全 PASS
- [ ] `pnpm --filter @aidean/shared exec tsc --noEmit && pnpm --filter web exec tsc --noEmit && pnpm --filter @aidean/shared test && pnpm --filter web test` 全绿（不得低于基线 118 / 1081 例）

## 完成定义（DoD，全项目唯一口径见 11_基线指标.md §11.3）

所有权内 diff 符合任务 ∧ 验收条目逐条有结果 ∧ 自动测试可复现 ∧ 证据可让一周后的人复现 ∧ 守卫通过 ∧ 无新增同类错误 ∧ 未改冻结契约（除非本任务即改契约）。
