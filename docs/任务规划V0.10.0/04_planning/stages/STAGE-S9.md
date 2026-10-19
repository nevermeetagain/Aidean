# 阶段 S9 · 子平台介绍页截图区块

> 版本: v0.10 | 更新: 2026-10-19 | 变更: 任务规划V0.10.0（基线 main@ff08433；外部助手完成 085/091/090/009/013/020/025/038/059/028/093/073 并经独立审查，12 卡移出；审查缺陷拆为 095–099；仅保留未完成卡；契约唯一源仍为 packages/shared/src（冻结稿 docs/任务规划V0.5.0/contracts））

- **交付**：介绍页展示真实截图画廊
- **可演示行为（本刀新增）**：子平台介绍页出现截图画廊，后台可增删
- **启动闸门 / 待裁决**：U-4（BLOCKING）
- **任务数**：3（Hark 1 / 外部Agent 2）｜条件卡 3｜工时 ≈ 11h

## 执行顺序（按依赖层级）

| 层级 | 任务 | 执行者 | 所有权 | 依赖 |
|---|---|---|---|---|
| L0 | [TASK-044](../../05_execution/tasks/TASK-044.md) Product.intro 契约扩展：screenshots（≤6，url/alt/caption） | 外部Agent | Agent-Contract | — |
| L1 | [TASK-045](../../05_execution/tasks/TASK-045.md) UI：介绍页截图画廊区块 + 后台 intro 编辑器截图条目 | Hark(主Agent) | Agent-App | TASK-044 |
| L11 | [TASK-046](../../05_execution/tasks/TASK-046.md) S9 文档同步：合作产品内容配置 / 子平台介绍页 intro 字段登记 | 外部Agent | Agent-Docs | TASK-045 |

## 切片验收（独立验证者只看 diff + 运行结果，输出 PASS / FAIL / UNKNOWN）

- [ ] TASK-044：`pnpm --filter @aidean/shared exec tsc --noEmit && pnpm --filter @aidean/shared test`
- [ ] TASK-045：`pnpm --filter web exec tsc --noEmit && pnpm --filter web lint`
- [ ] TASK-046：`node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs`
- [ ] `node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs` 全 PASS
- [ ] `pnpm --filter @aidean/shared exec tsc --noEmit && pnpm --filter web exec tsc --noEmit && pnpm --filter @aidean/shared test && pnpm --filter web test` 全绿（不得低于基线 118 / 1081 例）

## 完成定义（DoD，全项目唯一口径见 11_基线指标.md §11.3）

所有权内 diff 符合任务 ∧ 验收条目逐条有结果 ∧ 自动测试可复现 ∧ 证据可让一周后的人复现 ∧ 守卫通过 ∧ 无新增同类错误 ∧ 未改冻结契约（除非本任务即改契约）。
