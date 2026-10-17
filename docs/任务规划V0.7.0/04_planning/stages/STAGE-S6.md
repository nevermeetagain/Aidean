# 阶段 S6 · 测试资产与量级基线

> 版本: v0.7 | 更新: 2026-10-17 | 变更: 任务规划V0.7.0（基线 nevermeetagain/Aidean main@ffa158c，业务树仍 = 77c7952；承 V0.5.0 84 卡 + V0.6.0 对账结论；新增 B-0 主线归一与他线复核 4 卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

- **交付**：e2e 唯一配置 + 覆盖率首测 + 千级天梯首测
- **可演示行为（本刀新增）**：一条命令列出唯一 e2e 基线；输出覆盖率与千级天梯首测数值
- **启动闸门 / 待裁决**：U-10（新增 devDep）
- **任务数**：4（Hark 0 / 外部Agent 4）｜条件卡 0｜工时 ≈ 16h

## 执行顺序（按依赖层级）

| 层级 | 任务 | 执行者 | 所有权 | 依赖 |
|---|---|---|---|---|
| L3 | [TASK-038](../../05_execution/tasks/TASK-038.md) 单测覆盖率基线测量（web/shared，不设阈值） | 外部Agent | Agent-Guard | TASK-004 |
| L7 | [TASK-039](../../05_execution/tasks/TASK-039.md) 千级模型天梯量级基线（只测量，不优化） | 外部Agent | Agent-Guard | TASK-006 |
| L7 | [TASK-084](../../05_execution/tasks/TASK-084.md) 核验：天梯页无页脚 + 台账 #19 admin 配置治理收口状态 | 外部Agent | Agent-Guard | TASK-006 |
| L9 | [TASK-037](../../05_execution/tasks/TASK-037.md) e2e 配置口径收敛：根 playwright.config.ts 唯一（138+64 例并表） | 外部Agent | Agent-Guard | TASK-006 |

## 切片验收（独立验证者只看 diff + 运行结果，输出 PASS / FAIL / UNKNOWN）

- [ ] TASK-038：`pnpm --filter web exec vitest run --coverage`
- [ ] TASK-039：`node scripts/test/benchmark/ladder-1k.mjs --dry-run`
- [ ] TASK-084：`pnpm test:e2e -g ladder-no-footer`
- [ ] TASK-037：`pnpm exec playwright test --list --config playwright.config.ts`
- [ ] `node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs` 全 PASS
- [ ] `pnpm --filter @aidean/shared exec tsc --noEmit && pnpm --filter web exec tsc --noEmit && pnpm --filter @aidean/shared test && pnpm --filter web test` 全绿（不得低于基线 118 / 1081 例）

## 完成定义（DoD，全项目唯一口径见 11_基线指标.md §11.3）

所有权内 diff 符合任务 ∧ 验收条目逐条有结果 ∧ 自动测试可复现 ∧ 证据可让一周后的人复现 ∧ 守卫通过 ∧ 无新增同类错误 ∧ 未改冻结契约（除非本任务即改契约）。
