-- M-002 · 模型源监控（TASK-058 / DESIGN-004 / REQ-M-001..016）
-- 基线：docs/任务规划V0.5.0/database/002_monitoring.sql（仅 CREATE，不改既有表；排在 M-001 20261014000000 之后）。
-- 生成：prisma migrate diff --from-url <M-001 后 PG16 库> --to-schema-datamodel prisma/schema.prisma --script，
--       再人工追加 Prisma 无法表达的 CHECK 约束与部分索引（同 M-001 部分唯一索引先例），逐项对照基线 SQL。
-- 与基线差异（均为 Prisma 管理口径，非语义变更）：FK 带 ON UPDATE CASCADE（Prisma 默认）；约束/索引名以 Prisma 生成为准。

-- CreateTable
CREATE TABLE "monitoring_sources" (
    "id" UUID NOT NULL,
    "key" VARCHAR(40) NOT NULL,
    "label" VARCHAR(80) NOT NULL,
    "tier" VARCHAR(2) NOT NULL,
    "kind" VARCHAR(16) NOT NULL,
    "endpoint" TEXT NOT NULL,
    "docs_url" TEXT,
    "auth_required" BOOLEAN NOT NULL DEFAULT false,
    "cadence_cron" VARCHAR(64) NOT NULL DEFAULT '15 2 * * *',
    "tos_status" VARCHAR(24) NOT NULL DEFAULT 'pending',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "mapped_entity_type" VARCHAR(16),
    "mapped_entity_id" UUID,
    "last_run_at" TIMESTAMP(3),
    "last_status" VARCHAR(24) NOT NULL DEFAULT 'never',
    "last_count" INTEGER,
    "last_error" VARCHAR(2000),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "monitoring_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_snapshots" (
    "id" UUID NOT NULL,
    "source_id" UUID NOT NULL,
    "fetched_at" TIMESTAMP(3) NOT NULL,
    "item_count" INTEGER NOT NULL,
    "raw_sha256" CHAR(64) NOT NULL,
    "raw_bytes" INTEGER NOT NULL,
    "raw_sample" VARCHAR(2048) NOT NULL DEFAULT '',
    "source_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalog_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_model_observations" (
    "id" UUID NOT NULL,
    "source_id" UUID NOT NULL,
    "external_model_id" VARCHAR(200) NOT NULL,
    "normalized_model_id" VARCHAR(200) NOT NULL,
    "display_name" VARCHAR(200),
    "vendor_hint" VARCHAR(80),
    "is_listed" BOOLEAN NOT NULL DEFAULT true,
    "price_unit" VARCHAR(24),
    "price_input" DECIMAL(19,6),
    "price_output" DECIMAL(19,6),
    "price_cache_read" DECIMAL(19,6),
    "context_length" INTEGER,
    "first_seen_at" TIMESTAMP(3) NOT NULL,
    "last_seen_at" TIMESTAMP(3) NOT NULL,
    "delisted_at" TIMESTAMP(3),
    "last_snapshot_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_model_observations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_change_events" (
    "id" UUID NOT NULL,
    "source_id" UUID NOT NULL,
    "snapshot_id" UUID NOT NULL,
    "kind" VARCHAR(24) NOT NULL,
    "external_model_id" VARCHAR(200) NOT NULL,
    "normalized_model_id" VARCHAR(200) NOT NULL,
    "price_unit" VARCHAR(24),
    "before_input" DECIMAL(19,6),
    "before_output" DECIMAL(19,6),
    "after_input" DECIMAL(19,6),
    "after_output" DECIMAL(19,6),
    "delta_pct" DOUBLE PRECISION,
    "source_url" TEXT NOT NULL,
    "detected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalog_change_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "monitoring_sources_key_key" ON "monitoring_sources"("key");

-- CreateIndex
CREATE INDEX "catalog_snapshots_source_fetched_idx" ON "catalog_snapshots"("source_id", "fetched_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "catalog_snapshots_source_sha_key" ON "catalog_snapshots"("source_id", "raw_sha256");

-- CreateIndex
CREATE UNIQUE INDEX "pmo_source_external_key" ON "provider_model_observations"("source_id", "external_model_id");

-- CreateIndex
CREATE INDEX "cce_detected_idx" ON "catalog_change_events"("detected_at" DESC);

-- CreateIndex
CREATE INDEX "cce_source_kind_detected_idx" ON "catalog_change_events"("source_id", "kind", "detected_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "cce_snapshot_model_kind_key" ON "catalog_change_events"("snapshot_id", "normalized_model_id", "kind");

-- AddForeignKey
ALTER TABLE "catalog_snapshots" ADD CONSTRAINT "catalog_snapshots_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "monitoring_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_model_observations" ADD CONSTRAINT "provider_model_observations_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "monitoring_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_model_observations" ADD CONSTRAINT "provider_model_observations_last_snapshot_id_fkey" FOREIGN KEY ("last_snapshot_id") REFERENCES "catalog_snapshots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_change_events" ADD CONSTRAINT "catalog_change_events_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "monitoring_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_change_events" ADD CONSTRAINT "catalog_change_events_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "catalog_snapshots"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ===== 人工追加：CHECK 约束（基线 002_monitoring.sql；应用层真源为 contracts/07-monitoring.contract.ts zod 枚举）=====
ALTER TABLE "monitoring_sources"
  ADD CONSTRAINT "monitoring_sources_tier_check" CHECK ("tier" IN ('S1','S2','A','B','C')),
  ADD CONSTRAINT "monitoring_sources_kind_check" CHECK ("kind" IN ('official','cloud','hosted','aggregator','relay','benchmark','community')),
  ADD CONSTRAINT "monitoring_sources_tos_status_check" CHECK ("tos_status" IN ('allowed','attribution_required','pending','forbidden')),
  ADD CONSTRAINT "monitoring_sources_mapped_entity_type_check" CHECK ("mapped_entity_type" IN ('ModelProvider','APIStation')),
  ADD CONSTRAINT "monitoring_sources_last_status_check" CHECK ("last_status" IN ('never','ok','partial','failed','credential_missing','disabled'));
ALTER TABLE "catalog_snapshots"
  ADD CONSTRAINT "catalog_snapshots_item_count_check" CHECK ("item_count" >= 0),
  ADD CONSTRAINT "catalog_snapshots_raw_bytes_check" CHECK ("raw_bytes" >= 0);
ALTER TABLE "provider_model_observations"
  ADD CONSTRAINT "provider_model_observations_price_unit_check" CHECK ("price_unit" IN ('usd_per_1m_tokens','cny_per_1m_tokens','usd_per_request','ratio'));
ALTER TABLE "catalog_change_events"
  ADD CONSTRAINT "catalog_change_events_kind_check" CHECK ("kind" IN ('listed','delisted','model_first_seen','price_changed'));

-- ===== 人工追加：部分索引（Prisma schema 无法表达 WHERE）=====
CREATE INDEX "monitoring_sources_enabled_idx" ON "monitoring_sources"("enabled") WHERE "deleted_at" IS NULL;
-- 查询路径：「某模型在哪些源可调用」（TASK-066）
CREATE INDEX "pmo_normalized_listed_idx" ON "provider_model_observations"("normalized_model_id") WHERE "is_listed";
