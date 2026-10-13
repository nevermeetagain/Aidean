-- ====================================================================
-- Aidean REL-01 initial migration baseline (0000_init)
-- generated: prisma migrate diff --from-empty --to-schema-datamodel --script
-- date: 2026-09-14 | not applied to any real production database
-- usage_logs/usage_daily_stats are created as plain tables here;
-- partitioning is a separate, documented follow-up step
-- (legacy docker/sql/partition script targets an obsolete schema).
-- Extension block mirrors docker/sql/init/00_extensions.sql.
-- ====================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gin;

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('0', '1', '10', '99', '100');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'DELETED');

-- CreateEnum
CREATE TYPE "AccountTier" AS ENUM ('1', '2', '3');

-- CreateEnum
CREATE TYPE "ModelType" AS ENUM ('1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13');

-- CreateEnum
CREATE TYPE "ModelProtocol" AS ENUM ('1', '2', '3', '4', '5');

-- CreateEnum
CREATE TYPE "ModelStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DEPRECATED', 'BETA');

-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('1', '2', '3', '4');

-- CreateEnum
CREATE TYPE "BillingMode" AS ENUM ('1', '2', '3', '4');

-- CreateEnum
CREATE TYPE "PriceSource" AS ENUM ('1', '2', '3', '4', '5');

-- CreateEnum
CREATE TYPE "BenchmarkSource" AS ENUM ('1', '2', '3', '4', '5');

-- CreateEnum
CREATE TYPE "ModelCategory" AS ENUM ('PROFESSIONAL', 'APPLICATION');

-- CreateEnum
CREATE TYPE "StationKeyStatus" AS ENUM ('1', '2', '3');

-- CreateEnum
CREATE TYPE "BillingModeRule" AS ENUM ('1', '2');

-- CreateEnum
CREATE TYPE "ModelTierLevel" AS ENUM ('1', '2', '3', '4');

-- CreateEnum
CREATE TYPE "RefreshCycle" AS ENUM ('1', '2', '3');

-- CreateEnum
CREATE TYPE "ChannelFormat" AS ENUM ('1', '2');

-- CreateEnum
CREATE TYPE "UsageBillingPath" AS ENUM ('1', '2', '3', '4', '5');

-- CreateEnum
CREATE TYPE "WalletStatus" AS ENUM ('1', '2', '3');

-- CreateEnum
CREATE TYPE "LedgerDirection" AS ENUM ('1', '2');

-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('1', '2', '3', '4', '5', '6', '7');

-- CreateEnum
CREATE TYPE "LedgerEntryStatus" AS ENUM ('1', '2', '3', '4');

-- CreateEnum
CREATE TYPE "HoldStatus" AS ENUM ('1', '2', '3', '4');

-- CreateEnum
CREATE TYPE "PayMethod" AS ENUM ('WECHAT', 'ALIPAY');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'EXPIRED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PackageStatus" AS ENUM ('1', '2');

-- CreateEnum
CREATE TYPE "PackageOrderStatus" AS ENUM ('1', '2', '3', '4');

-- CreateEnum
CREATE TYPE "RedemptionTarget" AS ENUM ('1', '2');

-- CreateEnum
CREATE TYPE "RedemptionStatus" AS ENUM ('1', '5', '2', '3', '4');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('1', '2');

-- CreateEnum
CREATE TYPE "FavoriteType" AS ENUM ('MODEL', 'API_STATION');

-- CreateEnum
CREATE TYPE "ChartType" AS ENUM ('1', '2', '3', '4', '5');

-- CreateEnum
CREATE TYPE "ConfigType" AS ENUM ('1', '2', '3', '4', '5');

-- CreateEnum
CREATE TYPE "LinkType" AS ENUM ('1', '2', '3');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('1', '2', '3', '4', '5');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "wechat_openid" TEXT,
    "nickname" TEXT,
    "avatar" TEXT,
    "role" "UserRole" NOT NULL DEFAULT '1',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "tier" "AccountTier" NOT NULL DEFAULT '1',
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "last_login_at" TIMESTAMP(3),
    "login_count" INTEGER NOT NULL DEFAULT 0,
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "token_version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "jti" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "client_id" TEXT,
    "chain_id" TEXT NOT NULL,
    "rotated_from" TEXT,
    "rotated_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "userAgent" TEXT,
    "ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oidc_clients" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "client_secret_hash" TEXT NOT NULL,
    "redirect_uris" TEXT[],
    "logout_uri" TEXT,
    "scopes" TEXT[] DEFAULT ARRAY['openid', 'profile', 'wallet:read']::TEXT[],
    "pkce_required" BOOLEAN NOT NULL DEFAULT true,
    "first_party" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oidc_clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oidc_user_consents" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "scopes" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oidc_user_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "real_name" TEXT,
    "phone" TEXT,
    "company" TEXT,
    "position" TEXT,
    "bio" TEXT,
    "website" TEXT,
    "github" TEXT,
    "wechat" TEXT,
    "preferences" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "key_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rate_limit" JSONB,
    "last_used_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendors" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_cn" TEXT,
    "name_en" TEXT,
    "logo_url" TEXT,
    "brand_color" TEXT,
    "website" TEXT,
    "tier_level" INTEGER NOT NULL DEFAULT 1,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 50,
    "company_name" TEXT,
    "country" TEXT,
    "founded_year" INTEGER,
    "description" TEXT,
    "description_cn" TEXT,
    "model_count" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_models" (
    "id" TEXT NOT NULL,
    "model_code" TEXT NOT NULL,
    "name_display" TEXT NOT NULL,
    "name_cn" TEXT,
    "name_en" TEXT,
    "slug" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "model_type" "ModelType" NOT NULL,
    "category_id" TEXT,
    "parameter_count" TEXT,
    "context_length" INTEGER,
    "max_output_tokens" INTEGER,
    "is_open_source" BOOLEAN NOT NULL DEFAULT false,
    "is_multi_modal" BOOLEAN NOT NULL DEFAULT false,
    "is_reasoning" BOOLEAN NOT NULL DEFAULT false,
    "is_coding_optimized" BOOLEAN NOT NULL DEFAULT false,
    "protocol" "ModelProtocol" NOT NULL DEFAULT '1',
    "official_url" TEXT,
    "docs_url" TEXT,
    "api_url" TEXT,
    "github_url" TEXT,
    "paper_url" TEXT,
    "published_at" TIMESTAMP(3),
    "deprecated_at" TIMESTAMP(3),
    "status" "ModelStatus" NOT NULL DEFAULT 'ACTIVE',
    "visibility" "Visibility" NOT NULL DEFAULT '1',
    "benchmark_score" DOUBLE PRECISION,
    "popularity_score" DOUBLE PRECISION,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "featured_weight" INTEGER NOT NULL DEFAULT 0,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "ai_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_prices" (
    "id" TEXT NOT NULL,
    "model_id" TEXT NOT NULL,
    "price_cache" DECIMAL(19,6),
    "price_input" DECIMAL(19,6) NOT NULL,
    "price_output" DECIMAL(19,6) NOT NULL,
    "price_per_request" DECIMAL(19,6),
    "billing_mode" "BillingMode" NOT NULL DEFAULT '1',
    "billing_currency" TEXT NOT NULL DEFAULT 'CNY',
    "original_currency" TEXT,
    "original_price_input" DECIMAL(19,6),
    "original_price_output" DECIMAL(19,6),
    "exchange_rate" DECIMAL(10,6),
    "effective_from" TIMESTAMP(3) NOT NULL,
    "effective_until" TIMESTAMP(3),
    "is_current" BOOLEAN NOT NULL DEFAULT true,
    "source_type" "PriceSource" NOT NULL DEFAULT '1',
    "source_name" TEXT,
    "source_url" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "model_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_scores" (
    "id" TEXT NOT NULL,
    "model_id" TEXT NOT NULL,
    "official_score" DECIMAL(5,2),
    "actual_score" DECIMAL(5,2),
    "review_score" DECIMAL(5,2),
    "self_test_score" DECIMAL(5,2),
    "reasoning_score" DECIMAL(5,2),
    "coding_score" DECIMAL(5,2),
    "math_score" DECIMAL(5,2),
    "multilingual_score" DECIMAL(5,2),
    "creativity_score" DECIMAL(5,2),
    "instruction_score" DECIMAL(5,2),
    "safety_score" DECIMAL(5,2),
    "efficiency_score" DECIMAL(5,2),
    "value_score" DECIMAL(5,2),
    "official_weight" DECIMAL(4,3) NOT NULL DEFAULT 0.25,
    "actual_weight" DECIMAL(4,3) NOT NULL DEFAULT 0.25,
    "review_weight" DECIMAL(4,3) NOT NULL DEFAULT 0.25,
    "self_test_weight" DECIMAL(4,3) NOT NULL DEFAULT 0.25,
    "composite_score" DECIMAL(5,2) NOT NULL,
    "overall_rank" INTEGER,
    "category_rank" INTEGER,
    "vendor_rank" INTEGER,
    "calc_version" INTEGER NOT NULL DEFAULT 1,
    "calc_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_current" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "model_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_benchmarks" (
    "id" TEXT NOT NULL,
    "model_id" TEXT NOT NULL,
    "sourceType" "BenchmarkSource" NOT NULL,
    "source_name" TEXT,
    "source_url" TEXT,
    "source_version" TEXT,
    "benchmark_type" TEXT NOT NULL,
    "benchmark_sub_type" TEXT,
    "scores" JSONB NOT NULL,
    "total_score" DECIMAL(5,2) NOT NULL,
    "score_percentile" DECIMAL(5,2),
    "test_date" TIMESTAMP(3),
    "test_params" JSONB,
    "raw_data" JSONB,
    "confidence_level" DECIMAL(4,3),
    "sampleCount" INTEGER,
    "weight" DECIMAL(4,3) NOT NULL DEFAULT 0.25,
    "is_weighted" BOOLEAN NOT NULL DEFAULT false,
    "verified_status" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "model_benchmarks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_stations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_cn" TEXT,
    "display_name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "provider" TEXT,
    "website" TEXT,
    "api_docs" TEXT,
    "base_url" TEXT,
    "models" TEXT[],
    "protocols" TEXT[],
    "rate_limit" JSONB,
    "pricing" JSONB,
    "features" TEXT[],
    "use_case" TEXT,
    "avg_latency" DOUBLE PRECISION,
    "uptime" DOUBLE PRECISION,
    "active_users" INTEGER NOT NULL DEFAULT 0,
    "stars" INTEGER NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION,
    "review_count" INTEGER NOT NULL DEFAULT 0,
    "last_verified" TIMESTAMP(3),
    "icon" TEXT,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "api_stations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "station_keys" (
    "id" TEXT NOT NULL,
    "station_id" TEXT NOT NULL,
    "name" TEXT,
    "key_value" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "status" "StationKeyStatus" NOT NULL DEFAULT '1',
    "failure_count" INTEGER NOT NULL DEFAULT 0,
    "cooldown_until" TIMESTAMP(3),
    "last_used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "station_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "station_billing_rules" (
    "id" TEXT NOT NULL,
    "station_id" TEXT NOT NULL,
    "billing_mode" "BillingModeRule" NOT NULL DEFAULT '1',
    "markup_rate" DECIMAL(6,3) NOT NULL DEFAULT 1.000,
    "token_multiplier" DECIMAL(6,3) NOT NULL DEFAULT 1.000,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "station_billing_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_tier_mappings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tier_level" "ModelTierLevel" NOT NULL,
    "model_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_tier_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_model_priorities" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "model_id" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 50,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_model_priorities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_free_quotas" (
    "id" TEXT NOT NULL,
    "tier" "AccountTier" NOT NULL,
    "model_id" TEXT NOT NULL,
    "quota_tokens" INTEGER NOT NULL,
    "refresh_cycle" "RefreshCycle" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_free_quotas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_quota_usages" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "model_id" TEXT NOT NULL,
    "used" INTEGER NOT NULL DEFAULT 0,
    "period_start" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_quota_usages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_channels" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "base_url" TEXT NOT NULL,
    "api_key" TEXT NOT NULL,
    "format" "ChannelFormat" NOT NULL DEFAULT '1',
    "default_params" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_test_at" TIMESTAMP(3),
    "last_test_ok" BOOLEAN,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_logs" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "model_id" TEXT,
    "station_id" TEXT,
    "channel_id" TEXT,
    "model" TEXT NOT NULL,
    "provider" TEXT,
    "prompt_tokens" INTEGER NOT NULL DEFAULT 0,
    "completion_tokens" INTEGER NOT NULL DEFAULT 0,
    "cached_tokens" INTEGER NOT NULL DEFAULT 0,
    "reasoning_tokens" INTEGER NOT NULL DEFAULT 0,
    "quota_minor" BIGINT NOT NULL DEFAULT 0,
    "billing_path" "UsageBillingPath" NOT NULL DEFAULT '1',
    "latency_ms" INTEGER,
    "status_code" INTEGER,
    "is_stream" BOOLEAN NOT NULL DEFAULT false,
    "error" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_daily_stats" (
    "id" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "user_id" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "request_count" INTEGER NOT NULL DEFAULT 0,
    "quota_minor" BIGINT NOT NULL DEFAULT 0,
    "prompt_tokens" INTEGER NOT NULL DEFAULT 0,
    "completion_tokens" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "usage_daily_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CNY',
    "balance_minor" BIGINT NOT NULL DEFAULT 0,
    "held_minor" BIGINT NOT NULL DEFAULT 0,
    "posted_debits_minor" BIGINT NOT NULL DEFAULT 0,
    "posted_credits_minor" BIGINT NOT NULL DEFAULT 0,
    "status" "WalletStatus" NOT NULL DEFAULT '1',
    "lock_version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_entries" (
    "id" TEXT NOT NULL,
    "txn_id" TEXT NOT NULL,
    "wallet_id" TEXT NOT NULL,
    "direction" "LedgerDirection" NOT NULL,
    "amount_minor" BIGINT NOT NULL,
    "entryType" "LedgerEntryType" NOT NULL,
    "status" "LedgerEntryStatus" NOT NULL DEFAULT '2',
    "source_type" TEXT,
    "source_id" TEXT,
    "idempotency_key" TEXT NOT NULL,
    "effective_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "balance_holds" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "wallet_id" TEXT NOT NULL,
    "amount_minor" BIGINT NOT NULL DEFAULT 0,
    "captured_minor" BIGINT NOT NULL DEFAULT 0,
    "status" "HoldStatus" NOT NULL DEFAULT '1',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "balance_holds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recharge_orders" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount_minor" BIGINT NOT NULL,
    "bonus_amount_minor" BIGINT NOT NULL DEFAULT 0,
    "total_amount_minor" BIGINT NOT NULL,
    "pay_method" "PayMethod" NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "external_trade_no" TEXT,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recharge_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packages" (
    "id" TEXT NOT NULL,
    "station_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "price_minor" BIGINT NOT NULL,
    "duration_hours" INTEGER,
    "benefits" JSONB,
    "status" "PackageStatus" NOT NULL DEFAULT '1',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "package_orders" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "package_id" TEXT NOT NULL,
    "status" "PackageOrderStatus" NOT NULL DEFAULT '2',
    "redeemed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "package_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "redemptions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "target_type" "RedemptionTarget" NOT NULL,
    "balance_minor" BIGINT,
    "package_id" TEXT,
    "name" TEXT,
    "batch_no" TEXT,
    "status" "RedemptionStatus" NOT NULL DEFAULT '1',
    "expires_at" TIMESTAMP(3),
    "redeemed_by" TEXT,
    "redeemed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT,
    "description" TEXT,
    "badge" TEXT,
    "benefits" JSONB,
    "status" "ProductStatus" NOT NULL DEFAULT '1',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_keys" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorites" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "refType" "FavoriteType" NOT NULL,
    "ref_id" TEXT NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "prompt" TEXT NOT NULL,
    "eval_type" TEXT NOT NULL DEFAULT 'single',
    "comparison_mode" TEXT,
    "config" JSONB NOT NULL DEFAULT '{}',
    "criteria" JSONB NOT NULL DEFAULT '{}',
    "metadata" JSONB,
    "results" JSONB,
    "winner_model_id" TEXT,
    "status" INTEGER NOT NULL DEFAULT 0,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "is_paid" BOOLEAN NOT NULL DEFAULT false,
    "cost" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "error_msg" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluation_models" (
    "id" TEXT NOT NULL,
    "evaluation_id" TEXT NOT NULL,
    "model_id" TEXT NOT NULL,
    "response" TEXT,
    "thinking" TEXT,
    "reasoning_content" TEXT,
    "tokens_input" INTEGER NOT NULL DEFAULT 0,
    "tokens_output" INTEGER NOT NULL DEFAULT 0,
    "tokens_thinking" INTEGER NOT NULL DEFAULT 0,
    "tokens_total" INTEGER NOT NULL DEFAULT 0,
    "latency_ms" INTEGER,
    "ttft_ms" INTEGER,
    "score" DOUBLE PRECISION,
    "accuracy_score" DOUBLE PRECISION,
    "relevance_score" DOUBLE PRECISION,
    "coherence_score" DOUBLE PRECISION,
    "creativity_score" DOUBLE PRECISION,
    "raw_response" JSONB,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evaluation_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ranking_weights" (
    "id" TEXT NOT NULL,
    "dimension" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 25,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "ranking_weights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ladder_charts" (
    "id" TEXT NOT NULL,
    "chart_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_cn" TEXT,
    "name_en" TEXT,
    "description" TEXT,
    "description_short" TEXT,
    "chart_type" "ChartType" NOT NULL,
    "applicable_types" "ModelType"[],
    "default_sort_key" TEXT NOT NULL DEFAULT 'composite_score',
    "sort_direction" TEXT NOT NULL DEFAULT 'DESC',
    "secondary_sort_key" TEXT,
    "default_filters" JSONB,
    "display_columns" JSONB,
    "page_size" INTEGER NOT NULL DEFAULT 50,
    "score_weights" JSONB,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "required_role" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_featured" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "model_count" INTEGER NOT NULL DEFAULT 0,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ladder_charts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ladder_rankings" (
    "id" TEXT NOT NULL,
    "chart_id" TEXT NOT NULL,
    "model_id" TEXT NOT NULL,
    "rank_position" INTEGER NOT NULL,
    "previous_rank" INTEGER,
    "rank_change" INTEGER,
    "sort_value" DECIMAL(19,4),
    "secondary_value" DECIMAL(19,4),
    "model_code" TEXT NOT NULL,
    "model_name" TEXT NOT NULL,
    "vendor_name" TEXT NOT NULL,
    "vendor_color" TEXT,
    "composite_score" DECIMAL(5,2),
    "benchmark_score" DECIMAL(5,2),
    "contextLength" INTEGER,
    "price_input" DECIMAL(19,6),
    "price_output" DECIMAL(19,6),
    "is_open_source" BOOLEAN NOT NULL DEFAULT false,
    "version_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version_sequence" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ladder_rankings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_flags" (
    "id" TEXT NOT NULL,
    "flag_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_cn" TEXT,
    "description" TEXT,
    "is_enabled" BOOLEAN NOT NULL DEFAULT false,
    "enabled_roles" INTEGER[],
    "rollout_percentage" INTEGER NOT NULL DEFAULT 100,
    "rollout_strategy" TEXT NOT NULL DEFAULT 'all',
    "config" JSONB,
    "enable_from" TIMESTAMP(3),
    "enable_until" TIMESTAMP(3),
    "category" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_configs" (
    "id" TEXT NOT NULL,
    "config_key" TEXT NOT NULL,
    "config_group" TEXT NOT NULL,
    "config_type" "ConfigType" NOT NULL DEFAULT '1',
    "config_value" TEXT NOT NULL,
    "config_value_en" TEXT,
    "description" TEXT,
    "validation_rule" TEXT,
    "default_value" TEXT,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "is_editable" BOOLEAN NOT NULL DEFAULT true,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "input_type" TEXT,
    "input_options" JSONB,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "navigation_menus" (
    "id" TEXT NOT NULL,
    "menu_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_en" TEXT,
    "parent_id" TEXT,
    "parent_code" TEXT,
    "level" INTEGER NOT NULL DEFAULT 1,
    "path" TEXT,
    "link_type" "LinkType" NOT NULL DEFAULT '1',
    "link_url" TEXT,
    "link_target" TEXT NOT NULL DEFAULT '_self',
    "is_dropdown" BOOLEAN NOT NULL DEFAULT false,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "show_in_header" BOOLEAN NOT NULL DEFAULT true,
    "show_in_footer" BOOLEAN NOT NULL DEFAULT false,
    "require_login" BOOLEAN NOT NULL DEFAULT false,
    "required_roles" INTEGER[],
    "i18n_key" TEXT,
    "badge_text" TEXT,
    "badge_color" TEXT,
    "highlight" BOOLEAN NOT NULL DEFAULT false,
    "icon" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "navigation_menus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT '1',
    "action_url" TEXT,
    "action_text" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'system',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMP(3),
    "expired_at" TIMESTAMP(3),
    "target_roles" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "author_id" TEXT,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "table_name" TEXT NOT NULL,
    "record_id" TEXT NOT NULL,
    "action" INTEGER NOT NULL,
    "old_data" JSONB,
    "new_data" JSONB,
    "changed_fields" TEXT[],
    "actor_id" TEXT,
    "actor_ip" TEXT,
    "request_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_scripts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "script_path" TEXT NOT NULL,
    "params" JSONB,
    "cron_expression" TEXT,
    "interval_days" INTEGER,
    "interval_count" INTEGER,
    "trigger_time" TEXT,
    "last_run_at" TIMESTAMP(3),
    "next_run_at" TIMESTAMP(3),
    "status" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" TEXT,
    "updated_by" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "scheduled_scripts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "script_executions" (
    "id" TEXT NOT NULL,
    "script_id" TEXT NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3) NOT NULL,
    "finished_at" TIMESTAMP(3),
    "duration_ms" INTEGER,
    "output" TEXT,
    "error_msg" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "script_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_change_logs" (
    "id" TEXT NOT NULL,
    "model_id" TEXT NOT NULL,
    "sync_batch_id" TEXT,
    "change_type" TEXT NOT NULL,
    "before_data" JSONB,
    "after_data" JSONB,
    "changed_fields" TEXT[],
    "source" TEXT,
    "source_ip" TEXT,
    "operator_id" TEXT,
    "is_reverted" BOOLEAN NOT NULL DEFAULT false,
    "reverted_at" TIMESTAMP(3),
    "revert_reason" TEXT,
    "validation_status" TEXT NOT NULL DEFAULT 'pending',
    "checksum" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "model_change_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_batches" (
    "id" TEXT NOT NULL,
    "batch_code" TEXT NOT NULL,
    "source" TEXT,
    "source_url" TEXT,
    "total_records" INTEGER NOT NULL DEFAULT 0,
    "success_records" INTEGER NOT NULL DEFAULT 0,
    "failed_records" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'running',
    "validation_summary" JSONB,
    "error_samples" JSONB,
    "operator_id" TEXT,
    "operator_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sync_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT,
    "subject" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "attachments" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "assignee_id" TEXT,
    "resolution" TEXT,
    "resolved_at" TIMESTAMP(3),
    "rating" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback_comments" (
    "id" TEXT NOT NULL,
    "feedback_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "is_internal" BOOLEAN NOT NULL DEFAULT false,
    "attachments" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_wechat_openid_key" ON "users"("wechat_openid");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "users_tier_idx" ON "users"("tier");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_jti_key" ON "refresh_tokens"("jti");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_chain_id_idx" ON "refresh_tokens"("chain_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "oidc_clients_client_id_key" ON "oidc_clients"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "oidc_user_consents_user_id_client_id_key" ON "oidc_user_consents"("user_id", "client_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_user_id_key" ON "user_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_key_id_key" ON "api_keys"("key_id");

-- CreateIndex
CREATE INDEX "api_keys_user_id_idx" ON "api_keys"("user_id");

-- CreateIndex
CREATE INDEX "api_keys_key_hash_idx" ON "api_keys"("key_hash");

-- CreateIndex
CREATE UNIQUE INDEX "vendors_code_key" ON "vendors"("code");

-- CreateIndex
CREATE INDEX "vendors_tier_level_idx" ON "vendors"("tier_level");

-- CreateIndex
CREATE INDEX "vendors_is_active_idx" ON "vendors"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "ai_models_model_code_key" ON "ai_models"("model_code");

-- CreateIndex
CREATE UNIQUE INDEX "ai_models_slug_key" ON "ai_models"("slug");

-- CreateIndex
CREATE INDEX "ai_models_vendor_id_idx" ON "ai_models"("vendor_id");

-- CreateIndex
CREATE INDEX "ai_models_model_type_idx" ON "ai_models"("model_type");

-- CreateIndex
CREATE INDEX "ai_models_status_idx" ON "ai_models"("status");

-- CreateIndex
CREATE INDEX "ai_models_is_active_idx" ON "ai_models"("is_active");

-- CreateIndex
CREATE INDEX "ai_models_benchmark_score_idx" ON "ai_models"("benchmark_score");

-- CreateIndex
CREATE INDEX "model_prices_model_id_idx" ON "model_prices"("model_id");

-- CreateIndex
CREATE INDEX "model_prices_is_current_idx" ON "model_prices"("is_current");

-- CreateIndex
CREATE INDEX "model_prices_effective_from_idx" ON "model_prices"("effective_from");

-- CreateIndex
CREATE INDEX "model_scores_model_id_idx" ON "model_scores"("model_id");

-- CreateIndex
CREATE INDEX "model_scores_is_current_idx" ON "model_scores"("is_current");

-- CreateIndex
CREATE INDEX "model_scores_composite_score_idx" ON "model_scores"("composite_score");

-- CreateIndex
CREATE UNIQUE INDEX "model_scores_model_id_calc_version_key" ON "model_scores"("model_id", "calc_version");

-- CreateIndex
CREATE INDEX "model_benchmarks_model_id_idx" ON "model_benchmarks"("model_id");

-- CreateIndex
CREATE INDEX "model_benchmarks_sourceType_idx" ON "model_benchmarks"("sourceType");

-- CreateIndex
CREATE INDEX "model_benchmarks_benchmark_type_idx" ON "model_benchmarks"("benchmark_type");

-- CreateIndex
CREATE INDEX "api_stations_avg_latency_idx" ON "api_stations"("avg_latency");

-- CreateIndex
CREATE INDEX "api_stations_uptime_idx" ON "api_stations"("uptime");

-- CreateIndex
CREATE INDEX "api_stations_active_users_idx" ON "api_stations"("active_users");

-- CreateIndex
CREATE INDEX "station_keys_station_id_idx" ON "station_keys"("station_id");

-- CreateIndex
CREATE INDEX "station_keys_status_idx" ON "station_keys"("status");

-- CreateIndex
CREATE UNIQUE INDEX "station_keys_station_id_key_value_key" ON "station_keys"("station_id", "key_value");

-- CreateIndex
CREATE UNIQUE INDEX "station_billing_rules_station_id_key" ON "station_billing_rules"("station_id");

-- CreateIndex
CREATE INDEX "user_tier_mappings_user_id_idx" ON "user_tier_mappings"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_tier_mappings_user_id_tier_level_model_id_key" ON "user_tier_mappings"("user_id", "tier_level", "model_id");

-- CreateIndex
CREATE INDEX "user_model_priorities_user_id_idx" ON "user_model_priorities"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_model_priorities_user_id_model_id_key" ON "user_model_priorities"("user_id", "model_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_free_quotas_tier_model_id_key" ON "user_free_quotas"("tier", "model_id");

-- CreateIndex
CREATE INDEX "user_quota_usages_user_id_idx" ON "user_quota_usages"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_quota_usages_user_id_model_id_period_start_key" ON "user_quota_usages"("user_id", "model_id", "period_start");

-- CreateIndex
CREATE INDEX "custom_channels_user_id_idx" ON "custom_channels"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "custom_channels_user_id_name_key" ON "custom_channels"("user_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "usage_logs_request_id_key" ON "usage_logs"("request_id");

-- CreateIndex
CREATE INDEX "usage_logs_user_id_created_at_idx" ON "usage_logs"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "usage_logs_station_id_created_at_idx" ON "usage_logs"("station_id", "created_at");

-- CreateIndex
CREATE INDEX "usage_logs_model_created_at_idx" ON "usage_logs"("model", "created_at");

-- CreateIndex
CREATE INDEX "usage_daily_stats_user_id_day_idx" ON "usage_daily_stats"("user_id", "day");

-- CreateIndex
CREATE UNIQUE INDEX "usage_daily_stats_day_user_id_model_key" ON "usage_daily_stats"("day", "user_id", "model");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_user_id_key" ON "wallets"("user_id");

-- CreateIndex
CREATE INDEX "ledger_entries_wallet_id_created_at_idx" ON "ledger_entries"("wallet_id", "created_at");

-- CreateIndex
CREATE INDEX "ledger_entries_txn_id_idx" ON "ledger_entries"("txn_id");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_entries_wallet_id_idempotency_key_key" ON "ledger_entries"("wallet_id", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_entries_txn_id_direction_key" ON "ledger_entries"("txn_id", "direction");

-- CreateIndex
CREATE UNIQUE INDEX "balance_holds_request_id_key" ON "balance_holds"("request_id");

-- CreateIndex
CREATE INDEX "balance_holds_wallet_id_idx" ON "balance_holds"("wallet_id");

-- CreateIndex
CREATE INDEX "balance_holds_status_expires_at_idx" ON "balance_holds"("status", "expires_at");

-- CreateIndex
CREATE INDEX "recharge_orders_user_id_idx" ON "recharge_orders"("user_id");

-- CreateIndex
CREATE INDEX "recharge_orders_status_idx" ON "recharge_orders"("status");

-- CreateIndex
CREATE INDEX "packages_station_id_idx" ON "packages"("station_id");

-- CreateIndex
CREATE INDEX "package_orders_user_id_idx" ON "package_orders"("user_id");

-- CreateIndex
CREATE INDEX "package_orders_package_id_idx" ON "package_orders"("package_id");

-- CreateIndex
CREATE UNIQUE INDEX "redemptions_code_key" ON "redemptions"("code");

-- CreateIndex
CREATE INDEX "redemptions_batch_no_idx" ON "redemptions"("batch_no");

-- CreateIndex
CREATE INDEX "redemptions_status_idx" ON "redemptions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "partner_keys_key_hash_key" ON "partner_keys"("key_hash");

-- CreateIndex
CREATE INDEX "favorites_user_id_idx" ON "favorites"("user_id");

-- CreateIndex
CREATE INDEX "favorites_refType_ref_id_idx" ON "favorites"("refType", "ref_id");

-- CreateIndex
CREATE UNIQUE INDEX "favorites_user_id_refType_ref_id_key" ON "favorites"("user_id", "refType", "ref_id");

-- CreateIndex
CREATE INDEX "evaluations_user_id_idx" ON "evaluations"("user_id");

-- CreateIndex
CREATE INDEX "evaluations_status_idx" ON "evaluations"("status");

-- CreateIndex
CREATE INDEX "evaluations_created_at_idx" ON "evaluations"("created_at");

-- CreateIndex
CREATE INDEX "evaluation_models_evaluation_id_idx" ON "evaluation_models"("evaluation_id");

-- CreateIndex
CREATE INDEX "evaluation_models_model_id_idx" ON "evaluation_models"("model_id");

-- CreateIndex
CREATE UNIQUE INDEX "evaluation_models_evaluation_id_model_id_key" ON "evaluation_models"("evaluation_id", "model_id");

-- CreateIndex
CREATE UNIQUE INDEX "ranking_weights_dimension_key" ON "ranking_weights"("dimension");

-- CreateIndex
CREATE INDEX "ranking_weights_is_active_idx" ON "ranking_weights"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "ladder_charts_chart_code_key" ON "ladder_charts"("chart_code");

-- CreateIndex
CREATE INDEX "ladder_charts_chart_type_idx" ON "ladder_charts"("chart_type");

-- CreateIndex
CREATE INDEX "ladder_charts_is_active_idx" ON "ladder_charts"("is_active");

-- CreateIndex
CREATE INDEX "ladder_rankings_chart_id_version_date_idx" ON "ladder_rankings"("chart_id", "version_date");

-- CreateIndex
CREATE INDEX "ladder_rankings_model_id_idx" ON "ladder_rankings"("model_id");

-- CreateIndex
CREATE INDEX "ladder_rankings_rank_position_idx" ON "ladder_rankings"("rank_position");

-- CreateIndex
CREATE UNIQUE INDEX "ladder_rankings_chart_id_model_id_version_date_version_sequ_key" ON "ladder_rankings"("chart_id", "model_id", "version_date", "version_sequence");

-- CreateIndex
CREATE UNIQUE INDEX "feature_flags_flag_code_key" ON "feature_flags"("flag_code");

-- CreateIndex
CREATE INDEX "feature_flags_is_enabled_idx" ON "feature_flags"("is_enabled");

-- CreateIndex
CREATE INDEX "feature_flags_category_idx" ON "feature_flags"("category");

-- CreateIndex
CREATE UNIQUE INDEX "system_configs_config_key_key" ON "system_configs"("config_key");

-- CreateIndex
CREATE INDEX "system_configs_config_group_idx" ON "system_configs"("config_group");

-- CreateIndex
CREATE INDEX "system_configs_is_public_idx" ON "system_configs"("is_public");

-- CreateIndex
CREATE UNIQUE INDEX "navigation_menus_menu_code_key" ON "navigation_menus"("menu_code");

-- CreateIndex
CREATE INDEX "navigation_menus_parent_id_idx" ON "navigation_menus"("parent_id");

-- CreateIndex
CREATE INDEX "navigation_menus_is_visible_idx" ON "navigation_menus"("is_visible");

-- CreateIndex
CREATE INDEX "user_notifications_user_id_idx" ON "user_notifications"("user_id");

-- CreateIndex
CREATE INDEX "user_notifications_is_read_idx" ON "user_notifications"("is_read");

-- CreateIndex
CREATE INDEX "user_notifications_type_idx" ON "user_notifications"("type");

-- CreateIndex
CREATE INDEX "announcements_is_published_published_at_idx" ON "announcements"("is_published", "published_at");

-- CreateIndex
CREATE INDEX "announcements_type_idx" ON "announcements"("type");

-- CreateIndex
CREATE INDEX "announcements_priority_idx" ON "announcements"("priority");

-- CreateIndex
CREATE INDEX "audit_logs_table_name_record_id_idx" ON "audit_logs"("table_name", "record_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "scheduled_scripts_is_active_idx" ON "scheduled_scripts"("is_active");

-- CreateIndex
CREATE INDEX "scheduled_scripts_next_run_at_idx" ON "scheduled_scripts"("next_run_at");

-- CreateIndex
CREATE INDEX "script_executions_script_id_idx" ON "script_executions"("script_id");

-- CreateIndex
CREATE INDEX "script_executions_status_idx" ON "script_executions"("status");

-- CreateIndex
CREATE INDEX "script_executions_started_at_idx" ON "script_executions"("started_at");

-- CreateIndex
CREATE INDEX "model_change_logs_model_id_created_at_idx" ON "model_change_logs"("model_id", "created_at");

-- CreateIndex
CREATE INDEX "model_change_logs_sync_batch_id_idx" ON "model_change_logs"("sync_batch_id");

-- CreateIndex
CREATE INDEX "model_change_logs_change_type_created_at_idx" ON "model_change_logs"("change_type", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "sync_batches_batch_code_key" ON "sync_batches"("batch_code");

-- CreateIndex
CREATE INDEX "sync_batches_status_created_at_idx" ON "sync_batches"("status", "created_at");

-- CreateIndex
CREATE INDEX "feedback_user_id_idx" ON "feedback"("user_id");

-- CreateIndex
CREATE INDEX "feedback_type_idx" ON "feedback"("type");

-- CreateIndex
CREATE INDEX "feedback_status_idx" ON "feedback"("status");

-- CreateIndex
CREATE INDEX "feedback_created_at_idx" ON "feedback"("created_at");

-- CreateIndex
CREATE INDEX "feedback_comments_feedback_id_idx" ON "feedback_comments"("feedback_id");

-- CreateIndex
CREATE INDEX "feedback_comments_user_id_idx" ON "feedback_comments"("user_id");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oidc_user_consents" ADD CONSTRAINT "oidc_user_consents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oidc_user_consents" ADD CONSTRAINT "oidc_user_consents_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "oidc_clients"("client_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_models" ADD CONSTRAINT "ai_models_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_prices" ADD CONSTRAINT "model_prices_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "ai_models"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_scores" ADD CONSTRAINT "model_scores_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "ai_models"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_benchmarks" ADD CONSTRAINT "model_benchmarks_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "ai_models"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "station_keys" ADD CONSTRAINT "station_keys_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "api_stations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "station_billing_rules" ADD CONSTRAINT "station_billing_rules_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "api_stations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_tier_mappings" ADD CONSTRAINT "user_tier_mappings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_tier_mappings" ADD CONSTRAINT "user_tier_mappings_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "ai_models"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_model_priorities" ADD CONSTRAINT "user_model_priorities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_model_priorities" ADD CONSTRAINT "user_model_priorities_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "ai_models"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_free_quotas" ADD CONSTRAINT "user_free_quotas_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "ai_models"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_quota_usages" ADD CONSTRAINT "user_quota_usages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_quota_usages" ADD CONSTRAINT "user_quota_usages_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "ai_models"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_channels" ADD CONSTRAINT "custom_channels_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "api_stations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_daily_stats" ADD CONSTRAINT "usage_daily_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "balance_holds" ADD CONSTRAINT "balance_holds_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recharge_orders" ADD CONSTRAINT "recharge_orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packages" ADD CONSTRAINT "packages_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "api_stations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_orders" ADD CONSTRAINT "package_orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_orders" ADD CONSTRAINT "package_orders_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redemptions" ADD CONSTRAINT "redemptions_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redemptions" ADD CONSTRAINT "redemptions_redeemed_by_fkey" FOREIGN KEY ("redeemed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_models" ADD CONSTRAINT "evaluation_models_evaluation_id_fkey" FOREIGN KEY ("evaluation_id") REFERENCES "evaluations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_models" ADD CONSTRAINT "evaluation_models_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "ai_models"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ladder_rankings" ADD CONSTRAINT "ladder_rankings_chart_id_fkey" FOREIGN KEY ("chart_id") REFERENCES "ladder_charts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ladder_rankings" ADD CONSTRAINT "ladder_rankings_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "ai_models"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_notifications" ADD CONSTRAINT "user_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "script_executions" ADD CONSTRAINT "script_executions_script_id_fkey" FOREIGN KEY ("script_id") REFERENCES "scheduled_scripts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_change_logs" ADD CONSTRAINT "model_change_logs_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "ai_models"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_change_logs" ADD CONSTRAINT "model_change_logs_sync_batch_id_fkey" FOREIGN KEY ("sync_batch_id") REFERENCES "sync_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_comments" ADD CONSTRAINT "feedback_comments_feedback_id_fkey" FOREIGN KEY ("feedback_id") REFERENCES "feedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_comments" ADD CONSTRAINT "feedback_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


