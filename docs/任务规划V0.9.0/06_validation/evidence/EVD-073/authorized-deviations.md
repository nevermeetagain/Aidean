# EVD-073 · 授权偏差与勘误登记

> 版本: v0.1 | 更新: 2026-10-19 | 变更: TASK-073 交付偏差登记

## 偏差（在允许范围内、受约束的实现裁量）

- **D-1 交付边界=纯映射层**：卡面「目标」表述「每次采集把…写 ReliabilityObservation」，但 Execution Step 1 明确「纯函数」、验证命令仅 `llmtest.spec.ts`、且「允许修改」不含 `candidate-discovery.ts`/任何持久化模块。故本卡交付 **composite 项 → `LlmtestObservationCreate` 写入载荷**的纯映射 + 单测；实际 `prisma.reliabilityObservation.upsert` 与 `discoverFromCrawl` 接线属后续集成（且卡面「保留既有候选发现行为不变」要求不动 candidate-discovery）。载荷形状与现有列一一对应，写入方零转换即可落库。
- **D-2 last_alive_at 落位 windowEnd**：`reliability_observations` 无 last_alive_at 列，M-002 禁本卡新增迁移。折衷：last_alive_at 若落在采集日 `[dayStart, dayEnd)` 内则记为 `windowEnd`（否则回落 dayEnd）。窗口整体仍 ∈ 采集日，兼顾「窗口=采集日」与「写 last_alive_at」两项要求。局限：跨日/缺失时 last_alive_at 精确值不单独保留（无列），已在 llmtest-observations.md §二说明。
- **D-3 score→uptimePercent、isAlive→errorRate**：二者皆无同名列。score（0..100 综合分）映射到 `uptimePercent`（缺 score 有计数则按通过率派生）；isAlive=false 置 `errorRate=1`，否则按失败率。为语义近似映射，非严格等价（score≠uptime、isAlive≠errorRate），受列约束。
- **D-4 entityType/entityId**：entityType='station'（llmtest 站点）；entityId 用规范化域名——采集时点候选尚未 promote、无 stationId，属卡面允许的「candidate 关联」口径。幂等键 `(entityType, entityId, windowStart)` 供写入方 upsert。
- **D-5 缺字段容错方向**：`total_checks` 缺时以 `pass_count` 作已观测数（不推断未观测项、failureCount≥0）；无任何计数与 score 时 uptime/errorRate 置 null，不臆造 0%（对齐证据 §四.4「数字类断言不写进常量/文案，只作采集结果入库」）。

## 勘误/数据源特性（以实测为准）

- **K-1 rank 缺 1**：`19_外部来源核验证据.md` L16 实测 composite「rank 从 2 开始，没有 rank=1」。按 Execution Step 3 记为**数据源特性、不补齐**；rank 非可靠性度量且无对应列，观测载荷不含 rank。
- **K-2 字段命名**：composite 混合命名（`isAlive` 驼峰、`total_checks/pass_count/last_alive_at` 下划线），`LlmtestLeaderboardItem` 据实声明，本卡新增 `last_alive_at?: unknown` 与实测字段一致。

## 未偏离声明

- 未改 `mapLlmtestItemToCandidate` / `discoverFromCrawl`（候选发现行为不变）。
- 未新建/改迁移（`apps/web/prisma/migrations/2026*` 只读，M-002）。
- 未改契约（`docs/任务规划V0.5.0/contracts/**`）、packages/shared、历代规划、AGENTS.md、.example/history。
