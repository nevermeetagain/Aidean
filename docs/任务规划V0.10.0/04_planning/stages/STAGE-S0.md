# 阶段 S0 · 步行骨架与契约守卫（V0.9.0：剩工件回补、CI 门禁与独立复核）

> 版本: v0.10 | 更新: 2026-10-19 | 变更: 任务规划V0.10.0（基线 main@ff08433；外部助手完成 085/091/090/009/013/020/025/038/059/028/093/073 并经独立审查，12 卡移出；审查缺陷拆为 095–099；仅保留未完成卡；契约唯一源仍为 packages/shared/src（冻结稿 docs/任务规划V0.5.0/contracts））

- **交付**：叠加缺口回补与他线归档（085）→ 独立复核（086）→ 守卫/CI/生成器在镜像可执行
- **可演示行为（本刀新增）**：CI 中（lint+三包单测全绿后）空库重放 16 条迁移 → :3000 启动 → /system/ready=200 → 新用户注册登录 → 创建 API Key（鉴权写）→ 控制台可见 → 匿名访问得统一错误信封
- **启动闸门 / 待裁决**：无 BLOCKING（B-0' 已裁决 A'）；P-2 仅影响条件卡 TASK-008
- **任务数**：5（Hark 3 / 外部Agent 2）｜条件卡 1｜工时 ≈ 13.5h

## 执行顺序（按依赖层级）

| 层级 | 任务 | 执行者 | 所有权 | 依赖 |
|---|---|---|---|---|
| L0 | [TASK-006](../../05_execution/tasks/TASK-006.md) e2e-skeleton 实跑：本地复现 ci.yml e2e-skeleton 全步骤（PG16+Redis7、迁移重放、seed、build、:3000、smoke+walking-skeleton）+ Actions 首轮绿 run（U-25） | Hark(主Agent) | Agent-Guard | — |
| L0 | [TASK-008](../../05_execution/tasks/TASK-008.md) OIDC 种子 wechat-rag 回调白名单按端口裁决对齐（保留 BotHot 3200；AideanBot 3333 按 P-2 补录） | 外部Agent | Agent-Data | — |
| L0 | [TASK-086](../../05_execution/tasks/TASK-086.md) 已移出卡独立复核：V0.8.0 判镜像落地的 22 张卡逐卡跑原验证命令并裁决 PASS/FAIL/UNKNOWN（补 e2e/真库/运行态证据） | Hark(主Agent) | Agent-Guard | — |
| L0 | [TASK-095](../../05_execution/tasks/TASK-095.md) CI 回绿：check-docs-facts 计数同步（route 154→156、spec 170→173）+ R10-01 规则落地 | Hark(主Agent) | Agent-Docs | — |
| L1 | [TASK-050](../../05_execution/tasks/TASK-050.md) CI verify 收尾：本地按 ci.yml 顺序复现 verify job 全部步骤 + coverage 目录入 .gitignore | 外部Agent | Agent-Guard | — |

## 切片验收（独立验证者只看 diff + 运行结果，输出 PASS / FAIL / UNKNOWN）

- [ ] TASK-006：`gh run list --workflow CI --limit 1 （或在 Actions 页面查看 e2e-skeleton job 结论）`
- [ ] TASK-008：`grep -n "auth/aidean/callback" apps/web/prisma/seed.ts && node scripts/guard/port-consistency.mjs`
- [ ] TASK-086：`test $(grep -cE '^\| TASK-(00[1-5]|01[0-24-9]|02[1-4]|07[6-9]) ' docs/任务规划V0.10.0/06_validation/evidence/EVD-086/verdicts.md) -eq 22; echo rows_ok=$?`
- [ ] TASK-095：`node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs; echo exit=$?`
- [ ] TASK-050：`grep -q 'apps/web/coverage' .gitignore && ! grep -E 'exit=[1-9]' docs/任务规划V0.10.0/06_validation/evidence/EVD-050/verify-job.txt; echo exit=$?`
- [ ] `node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs` 全 PASS
- [ ] `pnpm --filter @aidean/shared exec tsc --noEmit && pnpm --filter web exec tsc --noEmit && pnpm --filter @aidean/shared test && pnpm --filter web test` 全绿（不得低于基线 118 / 1081 例）

## 完成定义（DoD，全项目唯一口径见 11_基线指标.md §11.3）

所有权内 diff 符合任务 ∧ 验收条目逐条有结果 ∧ 自动测试可复现 ∧ 证据可让一周后的人复现 ∧ 守卫通过 ∧ 无新增同类错误 ∧ 未改冻结契约（除非本任务即改契约）。
