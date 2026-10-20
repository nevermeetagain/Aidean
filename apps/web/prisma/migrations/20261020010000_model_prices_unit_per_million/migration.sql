-- TASK-048（ADR-P005 v0.4）· model_prices.billing_unit 口径订正（依据 EVD-049 盘点 + EVD-048 抽样）
-- 事实：
--   * 非爬虫 USD 行（seed 与后台录入，如 GPT-4o 5/15、Claude 3.7 Sonnet 15/75）数值是官方「美元 / 百万 Token」价，
--     只是被列默认值误标为 per_1k_tokens（按 per_1k 理解 GPT-4o 将是 $5000/M，明显不实）；
--   * 非爬虫 CNY 行（Qwen-Max 0.02/0.06、ERNIE-4.0 0.03/0.09 等）数值是官方「元 / 千 Token」价，标注属实，不动；
--   * 爬虫行（source_type=4 CRAWLER）由适配器显式写单位（OpenRouter = 每 token 价 ×1000 → per_1k；AA/llmstats = per_1m），不动。
-- 订正：非爬虫 USD 的 per_1k_tokens 改标 per_million_tokens；列默认值改为 per_million_tokens（新行须显式声明单位）。
UPDATE "model_prices"
   SET "billing_unit" = 'per_million_tokens'
 WHERE "billing_unit" = 'per_1k_tokens'
   AND "billing_currency" = 'USD'
   AND "source_type" <> '4';

ALTER TABLE "model_prices" ALTER COLUMN "billing_unit" SET DEFAULT 'per_million_tokens';
