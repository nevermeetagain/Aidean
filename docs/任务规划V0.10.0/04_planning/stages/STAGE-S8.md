# 阶段 S8 · 生产部署实弹（含 RC-02 文档闭环）

> 版本: v0.10 | 更新: 2026-10-19 | 变更: 任务规划V0.10.0（基线 main@ff08433；外部助手完成 085/091/090/009/013/020/025/038/059/028/093/073 并经独立审查，12 卡移出；审查缺陷拆为 095–099；仅保留未完成卡；契约唯一源仍为 packages/shared/src（冻结稿 docs/任务规划V0.5.0/contracts））

- **交付**：备份恢复演练通过 → 生产 ready=200；发布环境契约成文
- **可演示行为（本刀新增）**：生产域名 /system/ready=200，smoke 7 例通过；备份恢复演练 diff=0；发布环境契约成文
- **启动闸门 / 待裁决**：U-3（BLOCKING）
- **任务数**：4（Hark 1 / 外部Agent 3）｜条件卡 4｜工时 ≈ 28h

## 执行顺序（按依赖层级）

| 层级 | 任务 | 执行者 | 所有权 | 依赖 |
|---|---|---|---|---|
| L2 | [TASK-042](../../05_execution/tasks/TASK-042.md) 备份/恢复演练脚本（pg_dump→restore→逐表行数比对） | 外部Agent | Agent-Guard | TASK-006 |
| L3 | [TASK-043](../../05_execution/tasks/TASK-043.md) 生产部署实弹（条件方案 A：自有服务器 docker compose prod） | Hark(主Agent) | Agent-Guard | TASK-042 |
| L3 | [TASK-083](../../05_execution/tasks/TASK-083.md) 上线前 seed 演示数据人工审核门禁（清单生成 + 审核记录校验） | 外部Agent | Agent-Guard | TASK-042 |
| L7 | [TASK-052](../../05_execution/tasks/TASK-052.md) RC-02 遗留文档闭环：发布环境契约 + 发布回滚与恢复验收 | 外部Agent | Agent-Docs | TASK-042 |

## 切片验收（独立验证者只看 diff + 运行结果，输出 PASS / FAIL / UNKNOWN）

- [ ] TASK-042：`node scripts/ops/pg-drill.mjs --source $DATABASE_URL`
- [ ] TASK-043：`E2E_BASE_URL=https://<域名> pnpm exec playwright test --config playwright.config.ts --project=smoke`
- [ ] TASK-083：`node scripts/release/check-seed-review.mjs; echo exit=$?`
- [ ] TASK-052：`node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs`
- [ ] `node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs` 全 PASS
- [ ] `pnpm --filter @aidean/shared exec tsc --noEmit && pnpm --filter web exec tsc --noEmit && pnpm --filter @aidean/shared test && pnpm --filter web test` 全绿（不得低于基线 118 / 1081 例）

## 完成定义（DoD，全项目唯一口径见 11_基线指标.md §11.3）

所有权内 diff 符合任务 ∧ 验收条目逐条有结果 ∧ 自动测试可复现 ∧ 证据可让一周后的人复现 ∧ 守卫通过 ∧ 无新增同类错误 ∧ 未改冻结契约（除非本任务即改契约）。
