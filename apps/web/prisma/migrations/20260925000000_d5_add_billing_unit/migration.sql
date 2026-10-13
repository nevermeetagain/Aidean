-- D5: Add billing_unit (计价粒度) to model_prices
-- schema.prisma 已声明 billingUnit（D5 修复），此迁移补齐落库；默认与 schema 默认值一致。

ALTER TABLE "model_prices" ADD COLUMN "billing_unit" TEXT NOT NULL DEFAULT 'per_1k_tokens';
