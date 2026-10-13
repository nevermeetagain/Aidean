-- Migration: AI Market Discovery & Intelligence Engine
-- 12 new tables for discovery pipeline, intelligence, and market monitoring

CREATE TABLE "discovery_candidates" (
    "id" TEXT NOT NULL,
    "candidate_type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT,
    "api_base" TEXT,
    "description" TEXT,
    "source_type" TEXT NOT NULL,
    "source_url" TEXT NOT NULL,
    "source_keyword" TEXT,
    "status" TEXT NOT NULL DEFAULT 'discovered',
    "promoted_to_type" TEXT,
    "promoted_to_id" TEXT,
    "fingerprint" JSONB,
    "discovered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verified_at" TIMESTAMP(3),
    "promoted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discovery_candidates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "evidence_chains" (
    "id" TEXT NOT NULL,
    "candidate_id" TEXT,
    "provider_id" TEXT,
    "model_id" TEXT,
    "evidence_type" TEXT NOT NULL,
    "claim" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "source_url" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "evidence_data" JSONB,
    "collected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_chains_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "protocol_compatibilities" (
    "id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "protocol" TEXT NOT NULL,
    "supported" BOOLEAN NOT NULL,
    "probe_method" TEXT,
    "probe_result" JSONB,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "probed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "protocol_compatibilities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "capability_matrices" (
    "id" TEXT NOT NULL,
    "model_id" TEXT NOT NULL,
    "capability" TEXT NOT NULL,
    "supported" BOOLEAN NOT NULL,
    "max_context_length" INTEGER,
    "detail" JSONB,
    "source" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "detected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "capability_matrices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tool_compatibilities" (
    "id" TEXT NOT NULL,
    "model_id" TEXT NOT NULL,
    "tool_name" TEXT NOT NULL,
    "compatible" BOOLEAN NOT NULL,
    "integration_type" TEXT,
    "setup_guide" TEXT,
    "verified_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tool_compatibilities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cache_policies" (
    "id" TEXT NOT NULL,
    "model_id" TEXT,
    "provider_id" TEXT,
    "cache_type" TEXT NOT NULL,
    "supported" BOOLEAN NOT NULL,
    "ttl" INTEGER,
    "minimum_tokens" INTEGER,
    "cache_write_price" DOUBLE PRECISION,
    "cache_read_price" DOUBLE PRECISION,
    "source" TEXT NOT NULL,
    "documented_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cache_policies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cache_observations" (
    "id" TEXT NOT NULL,
    "model_id" TEXT NOT NULL,
    "api_key_id" TEXT,
    "eligible_tokens" INTEGER NOT NULL,
    "cached_tokens" INTEGER NOT NULL,
    "cache_hit_tokens" INTEGER NOT NULL DEFAULT 0,
    "cache_hit_requests" INTEGER NOT NULL DEFAULT 0,
    "latency" DOUBLE PRECISION,
    "effective_cost" DOUBLE PRECISION,
    "cache_hit_rate" DOUBLE PRECISION,
    "observed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cache_observations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "rate_limit_policies" (
    "id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "rate_limit_type" TEXT NOT NULL,
    "limit_value" INTEGER NOT NULL,
    "window_seconds" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "documented_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_limit_policies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reliability_observations" (
    "id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "avg_latency_ms" DOUBLE PRECISION,
    "p99_latency_ms" DOUBLE PRECISION,
    "uptime_percent" DOUBLE PRECISION,
    "error_rate" DOUBLE PRECISION,
    "success_count" INTEGER NOT NULL DEFAULT 0,
    "failure_count" INTEGER NOT NULL DEFAULT 0,
    "window_start" TIMESTAMP(3) NOT NULL,
    "window_end" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reliability_observations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "price_rules" (
    "id" TEXT NOT NULL,
    "model_id" TEXT,
    "provider_id" TEXT,
    "region" TEXT,
    "input_tier" TEXT,
    "input_price_minor" BIGINT,
    "cache_read_price_minor" BIGINT,
    "cache_write_price_minor" BIGINT,
    "output_price_minor" BIGINT,
    "batch_price_minor" BIGINT,
    "source" TEXT NOT NULL,
    "source_url" TEXT,
    "effective_from" TIMESTAMP(3),
    "effective_to" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "price_rules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "coding_plans" (
    "id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "plan_name" TEXT NOT NULL,
    "plan_type" TEXT NOT NULL,
    "price_minor" BIGINT,
    "currency" TEXT NOT NULL DEFAULT 'CNY',
    "token_limit" INTEGER,
    "request_limit" INTEGER,
    "window_days" INTEGER,
    "credits_included" INTEGER,
    "features" JSONB,
    "source_url" TEXT,
    "effective_from" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coding_plans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "market_snapshots" (
    "id" TEXT NOT NULL,
    "snapshot_date" TIMESTAMP(3) NOT NULL,
    "snapshot_type" TEXT NOT NULL,
    "provider_count" INTEGER NOT NULL,
    "model_count" INTEGER NOT NULL,
    "station_count" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "diff" JSONB,
    "summary" JSONB,
    "sync_batch_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "discovery_candidates_status_idx" ON "discovery_candidates"("status");
CREATE INDEX "discovery_candidates_domain_idx" ON "discovery_candidates"("domain");
CREATE INDEX "discovery_candidates_candidate_type_idx" ON "discovery_candidates"("candidate_type");
CREATE INDEX "discovery_candidates_source_type_idx" ON "discovery_candidates"("source_type");
CREATE INDEX "evidence_chains_candidate_id_idx" ON "evidence_chains"("candidate_id");
CREATE INDEX "evidence_chains_provider_id_idx" ON "evidence_chains"("provider_id");
CREATE INDEX "evidence_chains_model_id_idx" ON "evidence_chains"("model_id");
CREATE INDEX "evidence_chains_evidence_type_idx" ON "evidence_chains"("evidence_type");
CREATE INDEX "protocol_compatibilities_entity_type_entity_id_idx" ON "protocol_compatibilities"("entity_type", "entity_id");
CREATE UNIQUE INDEX "protocol_compatibilities_entity_type_entity_id_protocol_key" ON "protocol_compatibilities"("entity_type", "entity_id", "protocol");
CREATE INDEX "capability_matrices_model_id_idx" ON "capability_matrices"("model_id");
CREATE UNIQUE INDEX "capability_matrices_model_id_capability_source_key" ON "capability_matrices"("model_id", "capability", "source");
CREATE INDEX "tool_compatibilities_model_id_idx" ON "tool_compatibilities"("model_id");
CREATE UNIQUE INDEX "tool_compatibilities_model_id_tool_name_key" ON "tool_compatibilities"("model_id", "tool_name");
CREATE INDEX "cache_policies_model_id_idx" ON "cache_policies"("model_id");
CREATE INDEX "cache_policies_provider_id_idx" ON "cache_policies"("provider_id");
CREATE INDEX "cache_observations_model_id_idx" ON "cache_observations"("model_id");
CREATE INDEX "cache_observations_api_key_id_idx" ON "cache_observations"("api_key_id");
CREATE INDEX "rate_limit_policies_entity_type_entity_id_idx" ON "rate_limit_policies"("entity_type", "entity_id");
CREATE INDEX "reliability_observations_entity_type_entity_id_idx" ON "reliability_observations"("entity_type", "entity_id");
CREATE INDEX "reliability_observations_window_start_idx" ON "reliability_observations"("window_start");
CREATE INDEX "price_rules_model_id_idx" ON "price_rules"("model_id");
CREATE INDEX "price_rules_provider_id_idx" ON "price_rules"("provider_id");
CREATE INDEX "price_rules_source_idx" ON "price_rules"("source");
CREATE INDEX "coding_plans_entity_type_entity_id_idx" ON "coding_plans"("entity_type", "entity_id");
CREATE INDEX "coding_plans_plan_type_idx" ON "coding_plans"("plan_type");
CREATE INDEX "market_snapshots_snapshot_date_idx" ON "market_snapshots"("snapshot_date");
CREATE INDEX "market_snapshots_snapshot_type_idx" ON "market_snapshots"("snapshot_type");
