# 阶段 S0 · 步行骨架与契约守卫（V0.9.0：剩工件回补、CI 门禁与独立复核）

> 版本: v0.9 | 更新: 2026-10-19 | 变更: 任务规划V0.9.0（V0.8.0 剩余部分；B-0' 已裁决 A'＝镜像 main 为开发线；Hark 完成 089/026/082/027/056/058/060/057 并经独立审查；已完成卡移出，仅保留未完成卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

- **交付**：叠加缺口回补与他线归档（085）→ 独立复核（086）→ 守卫/CI/生成器在镜像可执行
- **可演示行为（本刀新增）**：CI 中（lint+三包单测全绿后）空库重放 16 条迁移 → :3000 启动 → /system/ready=200 → 新用户注册登录 → 创建 API Key（鉴权写）→ 控制台可见 → 匿名访问得统一错误信封
- **启动闸门 / 待裁决**：无 BLOCKING（B-0' 已裁决 A'）；P-2 仅影响条件卡 TASK-008
- **任务数**：7（Hark 2 / 外部Agent 5）｜条件卡 1｜工时 ≈ 29h

## 执行顺序（按依赖层级）

| 层级 | 任务 | 执行者 | 所有权 | 依赖 |
|---|---|---|---|---|
| L0 | [TASK-085](../../05_execution/tasks/TASK-085.md) 叠加缺口回补 + 他线归档（B-0' 已裁决 A'：镜像 main 为唯一开发线） | 外部Agent | Agent-Guard | — |
| L1 | [TASK-008](../../05_execution/tasks/TASK-008.md) OIDC 种子 wechat-rag 回调白名单按端口裁决对齐（保留 BotHot 3200；AideanBot 3333 按 P-2 补录） | 外部Agent | Agent-Data | TASK-085 |
| L1 | [TASK-086](../../05_execution/tasks/TASK-086.md) 他线 S0–S3 落地独立复核：30 张卡逐卡跑验证命令并裁决 PASS/FAIL/UNKNOWN（单测已由规划期先行实测） | Hark(主Agent) | Agent-Guard | TASK-091 |
| L3 | [TASK-009](../../05_execution/tasks/TASK-009.md) S0 文档同步：API接口文档§4 全码表 + /system/ready 登记 + 双向锚 + 版本头 | 外部Agent | Agent-Docs | — |
| L4 | [TASK-006](../../05_execution/tasks/TASK-006.md) CI 新增 e2e-skeleton job（PG16+Redis7 服务容器、空库迁移重放、:3000 启动） | Hark(主Agent) | Agent-Guard | TASK-009 |
| L5 | [TASK-007](../../05_execution/tasks/TASK-007.md) 守卫脚本：根目录污染 / 密钥扫描 / 模块边界 / 端口区间一致性（零新依赖） | 外部Agent | Agent-Guard | TASK-085 |
| L6 | [TASK-050](../../05_execution/tasks/TASK-050.md) CI 门禁补齐：lint + @aidean/ui 单测进入 verify job | 外部Agent | Agent-Guard | TASK-007 |

## 切片验收（独立验证者只看 diff + 运行结果，输出 PASS / FAIL / UNKNOWN）

- [ ] TASK-085：`git merge-base --is-ancestor c2da219 origin/main; echo ff=$?; test -f scripts/contract/gen-contract-tests.mjs && node scripts/contract/gen-contract-tests.mjs && git diff --exit-code packages/shared/src/__tests__/contract/; echo gen=$?; test -d scripts/guard; echo guard=$?`
- [ ] TASK-008：`grep -n "auth/aidean/callback" apps/web/prisma/seed.ts && node scripts/guard/port-consistency.mjs`
- [ ] TASK-086：`test $(grep -cE '^\| TASK-(00[1-5]|01[0-24-9]|02[1-4]|07[6-9]) ' docs/任务规划V0.9.0/06_validation/evidence/EVD-086/verdicts.md) -eq 22; echo rows_ok=$?`
- [ ] TASK-009：`node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs`
- [ ] TASK-006：`gh run list --workflow CI --limit 1 （或在 Actions 页面查看 e2e-skeleton job 结论）`
- [ ] TASK-007：`node scripts/guard/run-all.mjs`
- [ ] TASK-050：`pnpm --filter web lint && pnpm --filter @aidean/ui exec vitest run`
- [ ] `node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs` 全 PASS
- [ ] `pnpm --filter @aidean/shared exec tsc --noEmit && pnpm --filter web exec tsc --noEmit && pnpm --filter @aidean/shared test && pnpm --filter web test` 全绿（不得低于基线 118 / 1081 例）

## 完成定义（DoD，全项目唯一口径见 11_基线指标.md §11.3）

所有权内 diff 符合任务 ∧ 验收条目逐条有结果 ∧ 自动测试可复现 ∧ 证据可让一周后的人复现 ∧ 守卫通过 ∧ 无新增同类错误 ∧ 未改冻结契约（除非本任务即改契约）。
