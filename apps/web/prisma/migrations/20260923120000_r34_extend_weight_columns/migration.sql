-- R-34: Add 9 extended dimension weight columns to model_scores
-- Default weight = 0 (disabled). Admins can enable via ranking-weights API.

ALTER TABLE "model_scores" ADD COLUMN "reasoning_weight"    DECIMAL(4,3) NOT NULL DEFAULT 0;
ALTER TABLE "model_scores" ADD COLUMN "coding_weight"        DECIMAL(4,3) NOT NULL DEFAULT 0;
ALTER TABLE "model_scores" ADD COLUMN "math_weight"          DECIMAL(4,3) NOT NULL DEFAULT 0;
ALTER TABLE "model_scores" ADD COLUMN "multilingual_weight"  DECIMAL(4,3) NOT NULL DEFAULT 0;
ALTER TABLE "model_scores" ADD COLUMN "creativity_weight"    DECIMAL(4,3) NOT NULL DEFAULT 0;
ALTER TABLE "model_scores" ADD COLUMN "instruction_weight"   DECIMAL(4,3) NOT NULL DEFAULT 0;
ALTER TABLE "model_scores" ADD COLUMN "safety_weight"        DECIMAL(4,3) NOT NULL DEFAULT 0;
ALTER TABLE "model_scores" ADD COLUMN "efficiency_weight"    DECIMAL(4,3) NOT NULL DEFAULT 0;
ALTER TABLE "model_scores" ADD COLUMN "value_weight"         DECIMAL(4,3) NOT NULL DEFAULT 0;
