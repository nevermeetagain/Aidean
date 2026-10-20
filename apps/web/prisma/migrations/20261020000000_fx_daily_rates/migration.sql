-- TASK-047（ADR-P005 v0.3，U-15）：日汇率快照
CREATE TABLE "fx_daily_rates" (
    "id" UUID NOT NULL,
    "rate_date" DATE NOT NULL,
    "base" VARCHAR(3) NOT NULL,
    "quote" VARCHAR(3) NOT NULL,
    "rate" DECIMAL(18,8) NOT NULL,
    "source" VARCHAR(40) NOT NULL,
    "source_url" TEXT NOT NULL,
    "fetched_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fx_daily_rates_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "fx_daily_rates_rate_positive" CHECK ("rate" > 0),
    CONSTRAINT "fx_daily_rates_pair_chk" CHECK ("base" <> "quote")
);
CREATE UNIQUE INDEX "fx_daily_rates_date_pair_key" ON "fx_daily_rates"("rate_date", "base", "quote");
CREATE INDEX "fx_daily_rates_pair_date_idx" ON "fx_daily_rates"("base", "quote", "rate_date" DESC);
