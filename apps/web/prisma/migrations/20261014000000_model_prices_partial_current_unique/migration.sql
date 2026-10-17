-- M-001（TASK-011）：model_prices 全列唯一 (model_id, is_current) → 部分唯一 (model_id) WHERE is_current = true
-- 目的：修复 R-01「同一模型连续多次采集写价 23505/P2002」（REQ-F-019 / REQ-F-14 / REQ-F-12；决策 ADR-P003）。
-- 根因：@@unique([modelId, isCurrent]) 使同一 modelId 仅能存在一行 is_current=false 的历史价，
--       persistPrices 的「updateMany(current→false) → create(新 current)」在第三次采集时必撞该唯一键。
--
-- 前置核验（期望 0 行；若非 0 必须先出数据清洗方案，禁止迁移）：
--   SELECT model_id, COUNT(*) FROM model_prices WHERE is_current = true GROUP BY model_id HAVING COUNT(*) > 1;
--   已在实施环境核验：dup_current_groups = 0（见 EVD-011）。
--
-- 说明：Prisma schema 无法表达「带 WHERE 的部分唯一索引」。
--   schema.prisma 已移除 @@unique([modelId, isCurrent])，本约束改由本迁移在数据库层维护；
--   `prisma migrate diff --from-migrations --to-schema-datamodel` 会将其列为已知差异，
--   该差异为 ADR-P003 登记的豁免项（非漂移，勿据此回滚）。

-- 既有对象为独立唯一索引（由 20260925170000_align_unique_indexes 以 CREATE UNIQUE INDEX 建立，非表约束），故用 DROP INDEX。
DROP INDEX IF EXISTS "model_prices_model_id_is_current_key";

-- 新语义：每个 model 至多一条「当前价」(is_current = true)；历史价 (is_current = false) 不再受唯一约束限制。
CREATE UNIQUE INDEX "model_prices_model_id_current_key"
  ON "model_prices" ("model_id")
  WHERE "is_current" = true;
