# 阶段 S0 · 步行骨架与契约守卫

> 版本: v0.1 | 更新: 2026-10-13 | 变更: 首次落档（任务规划V0.1.0）

- **交付**：契约唯一源 + 就绪探针 + 鉴权写闭环 e2e + CI 真库重放 + 守卫脚本
- **可演示行为（本刀新增）**：CI 中空库重放 16 条迁移 → :3000 启动 → /system/ready=200 → 新用户注册登录 → 创建 API Key（鉴权写）→ 控制台可见 → 匿名访问得统一错误信封
- **启动闸门 / 待裁决**：无
- **任务数**：9（Hark 1 / 外部Agent 8）｜工时 ≈ 43h

## 执行顺序（按依赖层级）

| 层级 | 任务 | 执行者 | 所有权 | 依赖 |
|---|---|---|---|---|
| L0 | [TASK-001](../../05_execution/tasks/TASK-001.md) 错误码唯一源迁入 shared + 删除冲突旧表 + 新增 3 码 + SystemReady 契约 | Hark(主Agent) | Agent-Contract | — |
| L0 | [TASK-008](../../05_execution/tasks/TASK-008.md) OIDC 种子端口口径对齐：wechat-rag(AideanBot) 本地回调 3200→3333 | 外部Agent | Agent-Data | — |
| L1 | [TASK-002](../../05_execution/tasks/TASK-002.md) web 侧错误码改为从 shared 重导出（消除双源） | 外部Agent | Agent-API | TASK-001 |
| L1 | [TASK-004](../../05_execution/tasks/TASK-004.md) 契约测试生成器（从 shared 契约自动生成契约测试） | 外部Agent | Agent-Guard | TASK-001 |
| L2 | [TASK-003](../../05_execution/tasks/TASK-003.md) 新增 GET /api/v1/system/ready（DB+Redis 就绪探针） | 外部Agent | Agent-API | TASK-002 |
| L3 | [TASK-005](../../05_execution/tasks/TASK-005.md) 步行骨架 e2e：注册→登录→鉴权写→页面可见→错误信封 | 外部Agent | Agent-Guard | TASK-003 |
| L4 | [TASK-009](../../05_execution/tasks/TASK-009.md) S0 文档同步：API接口文档§4 全码表 + /system/ready 登记 + 双向锚 + 版本头 | 外部Agent | Agent-Docs | TASK-003, TASK-004, TASK-005 |
| L5 | [TASK-006](../../05_execution/tasks/TASK-006.md) CI 新增 e2e-skeleton job（PG16+Redis7 服务容器、空库迁移重放、:3000 启动） | 外部Agent | Agent-Guard | TASK-005, TASK-004, TASK-009 |
| L6 | [TASK-007](../../05_execution/tasks/TASK-007.md) 守卫脚本：根目录污染 / 密钥扫描 / 模块边界 / 端口一致性（零新依赖） | 外部Agent | Agent-Guard | TASK-008 |

## 切片验收（独立验证者只看 diff + 运行结果，输出 PASS / FAIL / UNKNOWN）

- [ ] TASK-001：`pnpm --filter @aidean/shared exec tsc --noEmit && pnpm --filter @aidean/shared test`
- [ ] TASK-008：`grep -n "localhost:3333/auth/aidean/callback" apps/web/prisma/seed.ts && node apps/web/scripts/check-oidc.mjs`
- [ ] TASK-002：`pnpm --filter web exec tsc --noEmit && pnpm --filter web test`
- [ ] TASK-004：`node scripts/contract/gen-contract-tests.mjs && git diff --exit-code packages/shared/src/__tests__/contract && pnpm --filter @aidean/shared test`
- [ ] TASK-003：`pnpm --filter web exec vitest run lib/features/system && pnpm --filter web exec tsc --noEmit`
- [ ] TASK-005：`pnpm exec playwright test e2e/web/walking-skeleton.spec.ts --config playwright.config.ts --project=web --workers=1`
- [ ] TASK-009：`node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs`
- [ ] TASK-006：`gh run list --workflow CI --limit 1 （或在 Actions 页面查看 e2e-skeleton job 结论）`
- [ ] TASK-007：`node scripts/guard/run-all.mjs`
- [ ] `node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs` 全 PASS
- [ ] `pnpm --filter @aidean/shared exec tsc --noEmit && pnpm --filter web exec tsc --noEmit && pnpm --filter @aidean/shared test && pnpm --filter web test` 全绿（不得低于基线 118 / 1081 例）

## 完成定义（DoD，全项目唯一口径见 11_基线指标.md §11.3）

所有权内 diff 符合任务 ∧ 验收条目逐条有结果 ∧ 自动测试可复现 ∧ 证据可让一周后的人复现 ∧ 守卫通过 ∧ 无新增同类错误 ∧ 未改冻结契约（除非本任务即改契约）。
