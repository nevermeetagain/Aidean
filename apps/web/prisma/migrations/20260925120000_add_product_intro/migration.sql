-- add-subplatform-showcase-pages SubTask 1.1.1：产品矩阵介绍块（v1：links+facts，写侧经 @aidean/shared ProductIntroSchema 校验）
-- 本迁移刻意最小化：migrate diff 另检出的 model_benchmarks/model_prices 两处 unique 索引属存量 schema↔DB 漂移，
-- 不在本任务范围（另登记《未完成事项目录》），故不并入本迁移。
ALTER TABLE "products" ADD COLUMN "intro" JSONB;
