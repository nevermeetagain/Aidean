# 阶段 S2 · 功能开关运行时（需求 §3.9）

> 版本: v0.9 | 更新: 2026-10-19 | 变更: 任务规划V0.9.0（V0.8.0 剩余部分；B-0' 已裁决 A'＝镜像 main 为开发线；Hark 完成 089/026/082/027/056/058/060/057 并经独立审查；已完成卡移出，仅保留未完成卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

- **交付**：后台切换开关 → 前台入口隐藏/页面 403/API 50011
- **可演示行为（本刀新增）**：后台关闭「大模型云服务天梯图」→ 前台导航入口消失、/providers 显示「该功能暂未开放」、API 返回 50011 → 重新开启即恢复
- **启动闸门 / 待裁决**：U-7（失败策略）
- **任务数**：1（Hark 0 / 外部Agent 1）｜条件卡 0｜工时 ≈ 2h

## 执行顺序（按依赖层级）

| 层级 | 任务 | 执行者 | 所有权 | 依赖 |
|---|---|---|---|---|
| L5 | [TASK-020](../../05_execution/tasks/TASK-020.md) S2 文档同步：API 文档登记 3 端点 + 功能设计 §3.9 实装口径 + 术语表 | 外部Agent | Agent-Docs | — |

## 切片验收（独立验证者只看 diff + 运行结果，输出 PASS / FAIL / UNKNOWN）

- [ ] TASK-020：`node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs`
- [ ] `node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs` 全 PASS
- [ ] `pnpm --filter @aidean/shared exec tsc --noEmit && pnpm --filter web exec tsc --noEmit && pnpm --filter @aidean/shared test && pnpm --filter web test` 全绿（不得低于基线 118 / 1081 例）

## 完成定义（DoD，全项目唯一口径见 11_基线指标.md §11.3）

所有权内 diff 符合任务 ∧ 验收条目逐条有结果 ∧ 自动测试可复现 ∧ 证据可让一周后的人复现 ∧ 守卫通过 ∧ 无新增同类错误 ∧ 未改冻结契约（除非本任务即改契约）。
