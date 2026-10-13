-- > 版本: v0.1 | 更新: 2026-10-13 | 变更: 首次落档（任务规划V0.1.0 · 数据模型基线）
-- =============================================================================
-- 数据模型基线（规划产物，非可执行迁移）
--
-- 1) 基线说明
--    本项目 DDL 唯一源 = apps/web/prisma/schema.prisma + apps/web/prisma/migrations/**。
--    为避免「多源并存」，本文件【不复制】既有 68 张表的 DDL；基线即以下 16 条既有迁移按序重放的结果：
--      0000_init
--      20260915100201_add_station_user_key
--      20260916104633_encrypt_custom_channel_key
--      20260917004900_drop_deprecated_apikey
--      20260917150000_add_news_item
--      20260923120000_r34_extend_weight_columns
--      20260925000000_d5_add_billing_unit
--      20260925120000_add_product_intro
--      20260925170000_align_unique_indexes
--      20260928120000_product_display_name_category
--      20260929000000_add_provider_and_offerings_tables
--      20260930120000_ai_market_discovery_engine
--      20261008093000_channel_scheduling_enhance
--      20261010000000_channel_format_extend_4
--      20261012075217_navigation_menu_scope
--      20261012082315_rbac_role_permission_user_role
--    重放命令：pnpm --filter web exec prisma migrate deploy（TASK-006 在 CI 空库执行）
--
-- 2) 本规划唯一 DDL 变更草案 M-001（由 TASK-011 落地到
--    apps/web/prisma/migrations/20261014000000_model_prices_partial_current_unique/migration.sql；
--    落地前须 TASK-010 在真实 PG 复现缺陷，否则本草案作废）
-- =============================================================================

-- [前置核验] 期望 0 行；非 0 行则停止迁移，先出数据清洗方案
-- SELECT model_id, COUNT(*) FROM model_prices WHERE is_current = true GROUP BY model_id HAVING COUNT(*) > 1;

-- [M-001] 全列唯一 (model_id, is_current) → 部分唯一 (model_id) WHERE is_current
DROP INDEX IF EXISTS "model_prices_model_id_is_current_key";
CREATE UNIQUE INDEX "model_prices_model_id_current_key"
  ON "model_prices" ("model_id")
  WHERE "is_current" = true;

-- [回滚草案]（仅在无 is_current=false 重复组时可回滚）
-- DROP INDEX IF EXISTS "model_prices_model_id_current_key";
-- CREATE UNIQUE INDEX "model_prices_model_id_is_current_key" ON "model_prices" ("model_id", "is_current");
