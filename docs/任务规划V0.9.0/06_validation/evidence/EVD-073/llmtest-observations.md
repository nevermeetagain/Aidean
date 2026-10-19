# EVD-073 · llmtest 观测入时序（取证与验收映射）

> 版本: v0.1 | 更新: 2026-10-19 | 变更: TASK-073 交付取证（纯映射层；无迁移约束下的字段落位与范围边界）

## 一、交付内容

新增 `apps/web/lib/discovery/llmtest-observations.ts`（纯函数，无网络/无 prisma）：
- `mapLlmtestItemToObservation(item, { at })` → 单项 → `ReliabilityObservation` 写入载荷（`LlmtestObservationCreate`）；无有效域名 → null。
- `mapLlmtestItemsToObservations(items, { at })` → 批量 + 按 entityId(域名) 去重（重复采集保留 windowEnd 更晚的一条）。

`llmtest.ts` 仅补 `LlmtestLeaderboardItem.last_alive_at?: unknown`（供观测读取；候选映射路径未改）。
`llmtest.spec.ts` 增 3 例（缺字段 / isAlive=false / 重复采集）。

## 二、字段落位（受限于现有列，M-002 禁本卡新增迁移）

`reliability_observations` 现有度量列：`avgLatencyMs / p99LatencyMs / uptimePercent / errorRate / successCount / failureCount`（+ `entityType/entityId/windowStart/windowEnd`）。llmtest 采集项 → 列映射：

| llmtest 信号 | 落位 | 规则 |
|---|---|---|
| `pass_count` | `successCount` | 截断非负；缺 → 0 |
| `total_checks` - `pass_count` | `failureCount` | `max(0, total-pass)`；缺 total 以 pass 作已观测数 |
| `score` | `uptimePercent` | score 优先（截断 0..100）；无 score 有计数 → 按 `pass/total*100` 派生；均无 → null |
| `isAlive` | `errorRate` | `isAlive===false` → 1；否则 `failureCount/total`（有检查时）；无检查 → null |
| `last_alive_at` | `windowEnd` | 落在采集日 `[dayStart, dayEnd)` 内则记为 windowEnd，否则回落 dayEnd |
| 采集时刻 `at` | `windowStart`/`windowEnd` | 窗口=采集日 `[UTC 00:00, 次日 00:00)` |
| `entityType` | `'station'` | llmtest 站点归 station |
| `entityId` | 规范化域名 | 采集时点尚未解析 stationId，按「candidate 关联」用域名作键 |
| `avgLatencyMs`/`p99LatencyMs` | 不产出（null） | composite 无延迟字段 |
| `rank` | 不产出 | 非可靠性度量、无对应列；见 §四 |

## 三、验收标准逐条核对

- [x] `pnpm --filter web exec vitest run lib/discovery/llmtest.spec.ts` 全绿：8 passed（既有 5 + 新增 3），LLMTEST_SPEC_EXIT=0。
- [x] 既有用例不变（只增不减）：llmtest.spec.ts 5→8；全局 web test 1238→1241（+3，skipped 5 不变）。
- [x] `tsc` exit 0：WEB_TSC_EXIT=0。
- [x] diff 仅落在允许范围：`git diff --name-only` = `llmtest.spec.ts`、`llmtest.ts`；新增 = `llmtest-observations.ts` + `EVD-073/**`；未触 candidate-discovery.ts、迁移、契约、pricing/shared。

## 四、rank 缺 1 现象（Execution Step 3）

外部核验证据（19_外部来源核验证据.md）记录 llmtest composite `rank` 从 2 开始（缺 1）。
本卡将 **rank 视为数据源特性、不做补齐**，且 rank 非可靠性度量、`reliability_observations` 无对应列，
故观测载荷不含 rank。候选 description 侧仍按既有逻辑（`mapLlmtestItemToCandidate` 未改）透传原值。

## 五、范围边界（本卡只交付「映射层」）

- 本卡交付「llmtest composite 项 → ReliabilityObservation 写入载荷」的**纯映射**及其单测（对齐卡面 Execution Step 1「纯函数」+ 验证命令仅 `llmtest.spec.ts` + 允许文件不含持久化模块）。
- **实际 DB 写入（`prisma.reliabilityObservation.upsert`）与 `discoverFromCrawl` 接线不在本卡范围**：卡面明确「保留既有候选发现行为不变」，且 `candidate-discovery.ts` 未在「允许修改」清单内。写入方按 `(entityType, entityId, windowStart)` 幂等 upsert，消费本模块产出的 `LlmtestObservationCreate`（形状与现有列一一对应，可直接落库）。
- 该接线属后续集成范畴，本卡以纯函数 + 类型化载荷为交付边界（已在 authorized-deviations.md 登记）。
