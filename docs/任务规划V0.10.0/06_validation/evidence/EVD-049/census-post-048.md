<!-- 复跑：rebase 到 origin/main@491481c（含 Hark TASK-048 迁移 20261020010000_model_prices_unit_per_million）后，migrate deploy + pnpm db:seed 重新灌库，再运行本脚本 -->
# 价格行口径盘点（TASK-049）

- 生成时间：2026-10-20T09:52:44.808Z
- 范围：model_prices WHERE is_current = true
- is_current 行总数：1000（全表 1000 行）
- 分组合计：1000（= 总数 ✓）

## 1. 三维分组计数（billingCurrency × billingUnit × sourceType）

| billingCurrency | billingUnit | sourceType | 行数 | priceInput min / avg / max | priceOutput min / avg / max |
|---|---|---|---:|---|---|
| CNY | per_1k_tokens | OFFICIAL | 34 | 0 / 0.0092 / 0.05 | 0 / 0.0220 / 0.12 |
| USD | per_million_tokens | OFFICIAL | 966 | 0 / 0.1555 / 75 | 0 / 0.4915 / 150 |
| **合计** | | | **1000** | | |

## 2. 按币种汇总

| billingCurrency | 行数 |
|---|---:|
| CNY | 34 |
| USD | 966 |

## 3. 按计费模式 × 计价单位

| billingMode | billingUnit | 行数 |
|---|---|---:|
| PER_TOKEN | per_1k_tokens | 34 |
| PER_TOKEN | per_million_tokens | 966 |

## 4. 每组样例（每组最多 5 条，按 model slug 排序）

### CNY · per_1k_tokens · OFFICIAL（34 行）

| model slug | 名称 | priceInput | priceOutput | priceCache | pricePerRequest | billingMode | sourceName |
|---|---|---:|---:|---:|---:|---|---|
| abab-7 | abab-7 | 0.005 | 0.01 | — | — | PER_TOKEN | — |
| bge-m3 | BGE-M3 | 0 | 0 | — | — | PER_TOKEN | — |
| bge-reranker-v2-m3 | bge-reranker-v2-m3 | 0 | 0 | — | — | PER_TOKEN | — |
| cogvlm2 | CogVLM2 | 0 | 0 | — | — | PER_TOKEN | — |
| deepseek-coder-v2 | DeepSeek-Coder-V2 | 0 | 0 | — | — | PER_TOKEN | — |

### USD · per_million_tokens · OFFICIAL（966 行）

| model slug | 名称 | priceInput | priceOutput | priceCache | pricePerRequest | billingMode | sourceName |
|---|---|---:|---:|---:|---:|---|---|
| claude-3-5-haiku | Claude 3.5 Haiku | 0.8 | 4 | — | — | PER_TOKEN | — |
| claude-3-5-sonnet-vision | Claude 3.5 Sonnet Vision | 3 | 15 | — | — | PER_TOKEN | — |
| claude-3-7-sonnet | Claude 3.7 Sonnet | 15 | 75 | — | — | PER_TOKEN | — |
| claude-3-haiku | Claude 3 Haiku | 0.25 | 1.25 | — | — | PER_TOKEN | — |
| claude-3-opus | Claude 3 Opus | 15 | 75 | — | — | PER_TOKEN | — |

