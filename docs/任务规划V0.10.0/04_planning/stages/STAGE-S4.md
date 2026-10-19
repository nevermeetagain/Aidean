# 阶段 S4 · 生效价：限时优惠 + 计价口径归一（需求 §3.6/§3.2）

> 版本: v0.10 | 更新: 2026-10-19 | 变更: 任务规划V0.10.0（基线 main@ff08433；外部助手完成 085/091/090/009/013/020/025/038/059/028/093/073 并经独立审查，12 卡移出；审查缺陷拆为 095–099；仅保留未完成卡；契约唯一源仍为 packages/shared/src（冻结稿 docs/任务规划V0.5.0/contracts））

- **交付**：后台建优惠 → 前台显示优惠价 → 网关按优惠价扣费；USD/per_1k 价格行按统一口径扣费与展示
- **可演示行为（本刀新增）**：后台给某模型建「限时免费」→ 价格页显示限时免费徽标 → 网关调用不扣费 → 删除优惠后按原价扣费；（U-15 后）USD 计价模型在价格页显示 ¥/M 并按同一归一价扣费
- **启动闸门 / 待裁决**：U-9（优惠是否叠加折扣）/ U-15（汇率口径，BLOCKING 局部：仅 048/053/054）
- **任务数**：13（Hark 7 / 外部Agent 6）｜条件卡 6｜工时 ≈ 60h

## 执行顺序（按依赖层级）

| 层级 | 任务 | 执行者 | 所有权 | 依赖 |
|---|---|---|---|---|
| L0 | [TASK-047](../../05_execution/tasks/TASK-047.md) 计价口径归一契约：币种 CNY + 每百万 Token + 汇率配置键（EffectivePrice 扩展） | Hark(主Agent) | Agent-Contract | — |
| L0 | [TASK-049](../../05_execution/tasks/TASK-049.md) 存量价格行口径盘点脚本（只读：币种×计价单位×来源） | 外部Agent | Agent-Guard | — |
| L0 | [TASK-081](../../05_execution/tasks/TASK-081.md) 后台价格批量写入 POST /api/v1/admin/prices/batch-upsert（requestId 幂等） | 外部Agent | Agent-API | — |
| L1 | [TASK-048](../../05_execution/tasks/TASK-048.md) 生效价解析器接入币种/单位归一（网关扣费与读侧同口径） | Hark(主Agent) | Agent-API | TASK-047 |
| L1 | [TASK-055](../../05_execution/tasks/TASK-055.md) 种子：系统配置新增 pricing.fxUsdCny 默认行（值取 U-15 裁决） | 外部Agent | Agent-Data | TASK-047 |
| L1 | [TASK-096](../../05_execution/tasks/TASK-096.md) 限时优惠写侧加固：开放式窗口重叠、PATCH 强制 isCurrent=false 与计费口径复核、事务内校验+写入、整数位上限 | Hark(主Agent) | Agent-API | TASK-095 |
| L2 | [TASK-080](../../05_execution/tasks/TASK-080.md) 缓存命中 token 计价（priceCache / discountCache）接入网关扣费 | Hark(主Agent) | Agent-API | TASK-048 |
| L2 | [TASK-097](../../05_execution/tasks/TASK-097.md) 天梯生效价读侧加固 + 缓存失效：价格行排序/脏行排除、优惠写入后清天梯缓存 | Hark(主Agent) | Agent-API | TASK-096 |
| L3 | [TASK-029](../../05_execution/tasks/TASK-029.md) UI：后台优惠子表与创建对话框 + 前台优惠价徽标 | Hark(主Agent) | Agent-App | TASK-097 |
| L4 | [TASK-030](../../05_execution/tasks/TASK-030.md) 计费集成 e2e：优惠窗口内按优惠价扣费、窗外按原价 | 外部Agent | Agent-Guard | TASK-029, TASK-006 |
| L5 | [TASK-031](../../05_execution/tasks/TASK-031.md) S4 文档同步：API 文档登记优惠端点 + 网关计费时序契约补生效价规则 | 外部Agent | Agent-Docs | TASK-030 |
| L6 | [TASK-053](../../05_execution/tasks/TASK-053.md) UI：价格页/详情页统一 ¥/M 展示（附原币原价注记） | Hark(主Agent) | Agent-App | TASK-048, TASK-029 |
| L7 | [TASK-054](../../05_execution/tasks/TASK-054.md) S4b 文档同步：计价口径归一（网关计费时序契约 + API 文档 + 术语表） | 外部Agent | Agent-Docs | TASK-053, TASK-031 |

## 切片验收（独立验证者只看 diff + 运行结果，输出 PASS / FAIL / UNKNOWN）

- [ ] TASK-047：`pnpm --filter @aidean/shared exec tsc --noEmit && pnpm --filter @aidean/shared test`
- [ ] TASK-049：`node scripts/audit/price-normalization-audit.mjs`
- [ ] TASK-081：`pnpm --filter web exec vitest run lib/features/auth/__tests__/admin-prices-batch.spec.ts && pnpm --filter web exec tsc --noEmit`
- [ ] TASK-048：`pnpm --filter web exec vitest run lib/features/pricing lib/features/gateway && pnpm --filter web exec tsc --noEmit`
- [ ] TASK-055：`pnpm --filter web exec vitest run lib/features/auth/__tests__/admin-config-seed-parity.spec.ts`
- [ ] TASK-096：`pnpm --filter web exec vitest run lib/features/auth/__tests__/admin-promotions.spec.ts && pnpm --filter web exec tsc --noEmit`
- [ ] TASK-080：`pnpm --filter web exec vitest run lib/features/gateway && pnpm --filter web exec tsc --noEmit`
- [ ] TASK-097：`pnpm --filter web exec vitest run lib/features/ladder && pnpm --filter web exec tsc --noEmit`
- [ ] TASK-029：`pnpm --filter web exec tsc --noEmit && pnpm --filter web lint`
- [ ] TASK-030：`pnpm exec playwright test e2e/tests/promotion-billing.spec.ts --config e2e/playwright.config.ts --workers=1`
- [ ] TASK-031：`node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs`
- [ ] TASK-053：`pnpm --filter web exec tsc --noEmit && pnpm --filter web lint`
- [ ] TASK-054：`node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs`
- [ ] `node scripts/check-docs-rule.mjs && node scripts/check-docs-facts.mjs` 全 PASS
- [ ] `pnpm --filter @aidean/shared exec tsc --noEmit && pnpm --filter web exec tsc --noEmit && pnpm --filter @aidean/shared test && pnpm --filter web test` 全绿（不得低于基线 118 / 1081 例）

## 完成定义（DoD，全项目唯一口径见 11_基线指标.md §11.3）

所有权内 diff 符合任务 ∧ 验收条目逐条有结果 ∧ 自动测试可复现 ∧ 证据可让一周后的人复现 ∧ 守卫通过 ∧ 无新增同类错误 ∧ 未改冻结契约（除非本任务即改契约）。
