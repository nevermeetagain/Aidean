# 阶段 S12 · 密钥源 + 中转真实性 + AA 数据（条件刀）

> 版本: v0.7 | 更新: 2026-10-17 | 变更: 任务规划V0.7.0（基线 nevermeetagain/Aidean main@ffa158c，业务树仍 = 77c7952；承 V0.5.0 84 卡 + V0.6.0 对账结论；新增 B-0 主线归一与他线复核 4 卡；契约唯一源仍为 docs/任务规划V0.5.0/contracts）

- **交付**：持 Key 的官方/托管目录入监控；中转可用性与身份信号入时序；AA 免费数据带署名入库
- **可演示行为（本刀新增）**：（条件）持 Key 官方/托管目录与中转探针结果进入后台监控页；AA 数据带署名
- **启动闸门 / 待裁决**：U-M1/U-M2/U-M3（BLOCKING）
- **任务数**：3（Hark 1 / 外部Agent 2）｜条件卡 3｜工时 ≈ 22h

## 执行顺序（按依赖层级）

| 层级 | 任务 | 执行者 | 所有权 | 依赖 |
|---|---|---|---|---|
| L7 | [TASK-072](../../05_execution/tasks/TASK-072.md) Artificial Analysis Data API v2 适配器重写（/api/v2/language/models/free，x-api-key，署名字段） | 外部Agent | Agent-API | TASK-056 |
| L8 | [TASK-070](../../05_execution/tasks/TASK-070.md) 密钥源目录采集：SiliconFlow /v1/models、DeepSeek /models 等官方/托管目录（缺凭证时健康=credential_missing） | 外部Agent | Agent-API | TASK-060 |
| L9 | [TASK-071](../../05_execution/tasks/TASK-071.md) 可用性与中转真实性探针：最小请求探测 → ReliabilityObservation + 身份信号（含 Claude thinking signature 检查） | Hark(主Agent) | Agent-API | TASK-070 |

## 切片验收（独立验证者只看 diff + 运行结果，输出 PASS / FAIL / UNKNOWN）

- [ ] TASK-072：`pnpm --filter web exec vitest run lib/sync/__tests__/artificial-analysis-v2.spec.ts && pnpm --filter web exec tsc --noEmit`
- [ ] TASK-070：`pnpm --filter web exec vitest run lib/monitoring/keyed && node scripts/guard/secret-scan.mjs`
- [ ] TASK-071：`pnpm --filter web exec vitest run lib/monitoring/probe && pnpm --filter web exec tsc --noEmit`
- [ ] `node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs` 全 PASS
- [ ] `pnpm --filter @aidean/shared exec tsc --noEmit && pnpm --filter web exec tsc --noEmit && pnpm --filter @aidean/shared test && pnpm --filter web test` 全绿（不得低于基线 118 / 1081 例）

## 完成定义（DoD，全项目唯一口径见 11_基线指标.md §11.3）

所有权内 diff 符合任务 ∧ 验收条目逐条有结果 ∧ 自动测试可复现 ∧ 证据可让一周后的人复现 ∧ 守卫通过 ∧ 无新增同类错误 ∧ 未改冻结契约（除非本任务即改契约）。
