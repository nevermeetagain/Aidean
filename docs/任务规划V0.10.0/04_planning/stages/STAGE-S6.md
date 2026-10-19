# 阶段 S6 · 测试资产与量级基线

> 版本: v0.10 | 更新: 2026-10-19 | 变更: 任务规划V0.10.0（基线 main@ff08433；外部助手完成 085/091/090/009/013/020/025/038/059/028/093/073 并经独立审查，12 卡移出；审查缺陷拆为 095–099；仅保留未完成卡；契约唯一源仍为 packages/shared/src（冻结稿 docs/任务规划V0.5.0/contracts））

- **交付**：e2e 唯一配置 + 覆盖率首测 + 千级天梯首测
- **可演示行为（本刀新增）**：一条命令列出唯一 e2e 基线；输出覆盖率与千级天梯首测数值
- **启动闸门 / 待裁决**：U-10（新增 devDep）
- **任务数**：3（Hark 0 / 外部Agent 3）｜条件卡 0｜工时 ≈ 13h

## 执行顺序（按依赖层级）

| 层级 | 任务 | 执行者 | 所有权 | 依赖 |
|---|---|---|---|---|
| L1 | [TASK-037](../../05_execution/tasks/TASK-037.md) e2e 配置口径收敛：根 playwright.config.ts 唯一（138+64 例并表） | 外部Agent | Agent-Guard | TASK-006 |
| L1 | [TASK-039](../../05_execution/tasks/TASK-039.md) 千级模型天梯量级基线（只测量，不优化） | 外部Agent | Agent-Guard | TASK-006 |
| L1 | [TASK-084](../../05_execution/tasks/TASK-084.md) 核验：天梯页无页脚 + 台账 #19 admin 配置治理收口状态 | 外部Agent | Agent-Guard | TASK-006 |

## 切片验收（独立验证者只看 diff + 运行结果，输出 PASS / FAIL / UNKNOWN）

- [ ] TASK-037：`pnpm exec playwright test --list --config playwright.config.ts`
- [ ] TASK-039：`node scripts/test/benchmark/ladder-1k.mjs --dry-run`
- [ ] TASK-084：`pnpm test:e2e -g ladder-no-footer`
- [ ] `node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs` 全 PASS
- [ ] `pnpm --filter @aidean/shared exec tsc --noEmit && pnpm --filter web exec tsc --noEmit && pnpm --filter @aidean/shared test && pnpm --filter web test` 全绿（不得低于基线 118 / 1081 例）

## 完成定义（DoD，全项目唯一口径见 11_基线指标.md §11.3）

所有权内 diff 符合任务 ∧ 验收条目逐条有结果 ∧ 自动测试可复现 ∧ 证据可让一周后的人复现 ∧ 守卫通过 ∧ 无新增同类错误 ∧ 未改冻结契约（除非本任务即改契约）。
