# ADR-P003：model_prices「当前行唯一」改为部分唯一索引

> 版本: v0.1 | 更新: 2026-10-13 | 变更: 首次落档（任务规划V0.1.0）——状态：提议；生效条件 = TASK-010 在真实 PG 复现缺陷

## 背景（证据）
- `schema.prisma:480` `@@unique([modelId, isCurrent])`（D3 修复，防并发产生多条 current），由迁移 `20260925170000_align_unique_indexes` 落库。
- `lib/sync/writers/index.ts:74-95 persistPrices`：先 `updateMany({isCurrent:true} → false)` 再 `create` 新行。
- PostgreSQL 唯一索引对 `false` 同样生效 → 每个模型最多只能有 1 条历史行；第二次同步时第二条历史行冲突（静态推理，待复现）。
- 限时优惠（需求 §3.6）建模为 `source_type=PROMOTION` 的价格行（schema 注释 :448-449），必然需要同模型多条非当前行。

## 决策
- 迁移 M-001：删除全列唯一 `(model_id,is_current)`，新建部分唯一 `(model_id) WHERE is_current = true`。原 D3 目标（不允许两条 current）完整保留，同时允许任意多历史/优惠行。
- Prisma 不支持部分索引 → schema 中移除 `@@unique` 并注释说明；`migrate diff` 对该索引的差异登记为已知豁免（本 ADR 即登记处）。
- 修正 `persistPrices`（TASK-012）：多价格时仅最新一条为 current，事务化。

## 备选
- 新建 `model_price_promotions` 表：与既有 PROMOTION 建模重复，违反单一事实来源 → 否决。
- 历史行改为删除而非标记：丢价格历史，违反「价格历史」表语义 → 否决。

## 风险与回滚
- 存量库若已有重复 current（前置核验 SQL 非 0）→ 停止迁移，先清洗。
- 回滚 SQL 见 `database/001_init.sql`（仅在无历史行重复时可回滚）。
