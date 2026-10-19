# 阶段 S3 · 收藏

> 版本: v0.10 | 更新: 2026-10-19 | 变更: 任务规划V0.10.0（基线 main@ff08433；外部助手完成 085/091/090/009/013/020/025/038/059/028/093/073 并经独立审查，12 卡移出；审查缺陷拆为 095–099；仅保留未完成卡；契约唯一源仍为 packages/shared/src（冻结稿 docs/任务规划V0.5.0/contracts））

- **交付**：登录用户收藏模型/站点并在控制台管理
- **可演示行为（本刀新增）**：登录用户在模型详情页点星收藏 → 控制台「我的收藏」可见 → 取消后消失
- **启动闸门 / 待裁决**：U-8（是否保留需求）
- **任务数**：1（Hark 1 / 外部Agent 0）｜条件卡 0｜工时 ≈ 4h

## 执行顺序（按依赖层级）

| 层级 | 任务 | 执行者 | 所有权 | 依赖 |
|---|---|---|---|---|
| L1 | [TASK-092](../../05_execution/tasks/TASK-092.md) UI 运行态验收：S2 功能开关页/入口隐藏/403 态 + S3 收藏按钮/控制台 Tab/筛选全选/价格档位（截图 + 五态核对） | Hark(主Agent) | Agent-Guard | TASK-086 |

## 切片验收（独立验证者只看 diff + 运行结果，输出 PASS / FAIL / UNKNOWN）

- [ ] TASK-092：`test $(ls docs/任务规划V0.10.0/06_validation/evidence/EVD-092/*.png | wc -l) -ge 15; echo shots_ok=$?`
- [ ] `node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs` 全 PASS
- [ ] `pnpm --filter @aidean/shared exec tsc --noEmit && pnpm --filter web exec tsc --noEmit && pnpm --filter @aidean/shared test && pnpm --filter web test` 全绿（不得低于基线 118 / 1081 例）

## 完成定义（DoD，全项目唯一口径见 11_基线指标.md §11.3）

所有权内 diff 符合任务 ∧ 验收条目逐条有结果 ∧ 自动测试可复现 ∧ 证据可让一周后的人复现 ∧ 守卫通过 ∧ 无新增同类错误 ∧ 未改冻结契约（除非本任务即改契约）。
