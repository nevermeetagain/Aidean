# DESIGN-004 · 模型源监控体系

> 版本: v0.4 | 更新: 2026-10-14 | 变更: V0.4.0 新增——监控体系详细设计（分层、数据流、归一规则、调度、保留期、性能与扩展点）

> V0.9.0 承接说明（2026-10-19）：本文件正文为 **V0.8.0 原文**（基线 c2da219），其中「待裁决 B-0'/APPROVE/U-22」「未开工」等表述均指当时；**当前事实以 `25_执行记录.md`、`17g_V0.8.0到V0.9.0差异.md`、`05_execution/task-index.md` 为准**（B-0' 已裁决 A'；089/026/082/027/056/058/060/057 已完成）。契约唯一源仍为 `docs/任务规划V0.5.0/contracts/`。


## 1. 目标与非目标
- 目标：REQ-M-001..016（03b）。用一句话说：**每个源每天一次快照 → 按源观测 → diff 出事件 → 后台可管、前台可查。**
- 非目标：替代 `lib/discovery`（发现未知平台）、替代 `lib/sync` 写 AiModel/ModelPrice 的既有主链路（天梯数据源不变）。

## 2. 分层与目录（新增 `apps/web/lib/monitoring/`，Agent-API 所有）

```
lib/monitoring/
  catalog/            TASK-060  公开源 collector（openrouter / aihubmix / quanzil）+ registry
  keyed/              TASK-070  需 Key 的源（条件：U-M1）
  diff/               TASK-061  detect(prev,curr) 纯函数 + persist
  probe/              TASK-071  可用性/身份信号探针（条件：U-M3）
  __tests__/          TASK-063/066 路由单测（vitest 仅收录 lib/**/*.spec.ts）
lib/sync/writers/catalog-snapshot.ts   TASK-059（Agent-Data）
lib/sync/writers/offering-sync.ts      TASK-068（Agent-Data，条件：U-M5）
scripts/crawl/monitor_catalogs.ts      TASK-062（Agent-Guard）
app/api/v1/admin/monitoring/**         TASK-063
app/api/v1/models/[id]/offerings       TASK-066
app/(admin)/admin/monitoring           TASK-064（UI，Hark）
components/models/ModelOfferings.tsx   TASK-067（UI，Hark）
```

## 3. 数据流

```
ScheduledScript(cron 15 2 * * *) → run-due → monitor_catalogs.ts
  └─ for source in monitoring_sources(enabled):
       collector.fetch() ──(safeFetch, cap 4MB, SSRF 校验)──► raw
       sha256(raw) → persistCatalogSnapshot()  [同哈希 → 直接返回，不产生事件]
       normalize(raw) → ProviderModelObservation[] → upsert(source_id, external_model_id)
       detect(prevSnapshot, currSnapshot) → catalog_change_events (+ EvidenceChain for model_first_seen)
       update monitoring_sources.last_* （失败只记本源 last_error，继续下一个）
```

## 4. 归一规则（冻结，collector 必须遵守）
- `normalizedModelId` = 小写 → 去掉 `vendor/` 前缀 → 去掉 `:free|:batch|:beta|:thinking` 等后缀 → 空白转 `-`。只用于关联展示，**不自动合并**到 AiModel。
- 价格：保留原币与单位（`price_unit`）。OpenRouter `pricing.prompt/completion` 单位是 USD/token，×1e6 → `usd_per_1m_tokens`；Quanzil 是倍率体系，复用 `QuanzilAdapter` 的换算纯函数，得到 USD/1M，并在观测中保留 `ratio` 原值；缺字段一律 null，不推断。
- `vendorHint` 只作线索（REQ-M-014）。

## 5. 事件规则
- `listed`：本次在列、上次不在列（或首次出现在该源）。`delisted`：上次在列、本次不在。
- `price_changed`：输入或输出价 |Δ| ≥ 1%（`PRICE_CHANGE_THRESHOLD_PCT`），单位不同时不比较，改记 `listed` 的 evidence。
- `model_first_seen`：normalizedModelId 在**所有源**的观测中第一次出现 → 同时写 EvidenceChain(evidenceType='discovery', source='aggregator')。
- 幂等：`(snapshot_id, normalized_model_id, kind)` 唯一。

## 6. 存储、保留与性能
- 原始响应**不落盘**，只存 sha256 + 字节数 + ≤2KB 采样（避免存第三方数据副本，也控制体积）。
- 保留期：快照 180 天，事件 365 天，观测常驻（每源每模型 1 行）。清理任务不在本版本立卡（**尚无基线**，体量数据跑满 30 天后再评估，避免为未来过度设计）。
- 量级估算（以 19 的实测为依据，只是估算）：5 源 × 每日 ≤1,000 条观测 upsert；事件按日增量通常远小于观测数。索引见 002_monitoring.sql。
- 前台 offerings 走 Redis 600s 缓存（沿用 05-events 缓存口径）。

## 7. 扩展点
- 新增公开源：写 collector → 在 registry 与 seed 各登记一行（键集合由单测断言一致，沿用 `lib/sync/sources/registry.spec.ts` 的防漂移范式）。
- 新增 keyed 源：只在 `keyed/` 下新增，凭证走 `MONITOR_KEY_<SOURCE>`。
- 后续可接入 HF Webhooks（推模式）替代 HF 轮询——**COULD**，本版本不立卡。

## 8. 安全
- 所有外连复用 `lib/security/url-policy`（assertSafeUrl/safeFetch/readCappedJson）。
- 后台 PATCH 只允许改 `enabled/cadenceCron`；端点不能从后台改（防 SSRF 跳板）。
- secret-scan（TASK-007）覆盖 `MONITOR_KEY_` 前缀。
