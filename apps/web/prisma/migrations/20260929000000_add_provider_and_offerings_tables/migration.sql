-- CreateTable: model_providers (模型提供商)
CREATE TABLE "model_providers" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_cn" TEXT,
    "name_en" TEXT,
    "logo_url" TEXT,
    "brand_color" TEXT,
    "website" TEXT,
    "api_url" TEXT,
    "description" TEXT,
    "description_cn" TEXT,
    "recharge_ratio" DECIMAL(10,4) NOT NULL,
    "price_currency" TEXT NOT NULL DEFAULT 'USD',
    "recharge_currency" TEXT NOT NULL DEFAULT 'CNY',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "model_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable: provider_model_offerings (提供商模型报价)
CREATE TABLE "provider_model_offerings" (
    "id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "model_id" TEXT NOT NULL,
    "listed_at" TIMESTAMP(3),
    "default_multiplier" DECIMAL(8,4) NOT NULL DEFAULT 1.0,
    "price_input" DECIMAL(19,6),
    "price_output" DECIMAL(19,6),
    "price_cache" DECIMAL(19,6),
    "price_unit" TEXT NOT NULL DEFAULT 'per_million_tokens',
    "discount_input_min" DECIMAL(19,6),
    "discount_input_max" DECIMAL(19,6),
    "discount_output_min" DECIMAL(19,6),
    "discount_output_max" DECIMAL(19,6),
    "discount_cache_min" DECIMAL(19,6),
    "discount_cache_max" DECIMAL(19,6),
    "effective_from" TIMESTAMP(3) NOT NULL,
    "effective_until" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_model_offerings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "model_providers_code_key" ON "model_providers"("code");

-- CreateIndex
CREATE INDEX "model_providers_is_active_idx" ON "model_providers"("is_active");

-- CreateIndex
CREATE INDEX "model_providers_sort_order_idx" ON "model_providers"("sort_order");

-- CreateIndex
CREATE INDEX "provider_model_offerings_provider_id_idx" ON "provider_model_offerings"("provider_id");

-- CreateIndex
CREATE INDEX "provider_model_offerings_model_id_idx" ON "provider_model_offerings"("model_id");

-- CreateIndex
CREATE INDEX "provider_model_offerings_is_active_idx" ON "provider_model_offerings"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "provider_model_offerings_provider_id_model_id_key" ON "provider_model_offerings"("provider_id", "model_id");

-- AddForeignKey
ALTER TABLE "provider_model_offerings" ADD CONSTRAINT "provider_model_offerings_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "model_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_model_offerings" ADD CONSTRAINT "provider_model_offerings_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "ai_models"("id") ON DELETE CASCADE ON UPDATE CASCADE;
