-- 未完成事项目录 #63：schema↔DB unique 索引漂移补齐（v2.4 轮 D3/D4 修复写入了 schema，但迁移未落库）。
-- 前置核验（2026-09-25 dev 库实测）：model_prices is_current=true 共 536 条、重复组 0；
-- model_benchmarks 四列组合共 78 条、重复组 0 —— 可安全建唯一索引。
-- 索引名与 Prisma 默认命名一致（与 prisma migrate diff --to-schema-datamodel 输出对齐）。
CREATE UNIQUE INDEX "model_prices_model_id_is_current_key" ON "model_prices"("model_id", "is_current");
CREATE UNIQUE INDEX "model_benchmarks_model_id_benchmark_type_sourceType_test_da_key" ON "model_benchmarks"("model_id", "benchmark_type", "sourceType", "test_date");
