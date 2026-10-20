# EVD-049 · 价格写入路径静态盘点 + 结论（供 TASK-048）

> 生成：2026-10-20 CST｜基线 origin/main@33a2e62｜只读盘点，未改任何 apps/** / packages/** 文件
> 实测数据见 `census.md`（本地 PG16 + migrate deploy + pnpm db:seed）；本文件补充「这些口径从哪里写进来」。

## 0. 状态更新（rebase 后复跑）

推送前 rebase 到 origin/main@491481c，其中 Hark TASK-048 已含迁移 `20261020010000_model_prices_unit_per_million`（非爬虫 USD 行 per_1k_tokens → per_million_tokens，列默认值改 per_million_tokens）。
migrate deploy + 重新 seed 后复跑见 `census-post-048.md`：USD 966 行已为 `per_million_tokens`，CNY 34 行保持 `per_1k_tokens`，合计仍 1000。**F-049-01 已由 TASK-048 关闭**；下文 §1–§3 为 048 之前（origin/main@33a2e62）的盘点，保留作依据。

## 1. 实测结论（seed 后库，is_current=true 共 1000 行；048 之前）

| billingCurrency | billingUnit | sourceType | 行数 |
|---|---|---|---:|
| CNY | per_1k_tokens | OFFICIAL | 34 |
| USD | per_1k_tokens | OFFICIAL | 966 |

- 只有两组，合计 1000 = is_current 总数；billingMode 全为 PER_TOKEN；priceCache / pricePerRequest 全空。
- 966 行 USD 中 937 行价格为 0（`demoModelsData` 演示模型），非零 29 行；CNY 34 行中 12 行为 0。

### ⚠ 发现 F-049-01：seed 的 USD 行「标签 per_1k_tokens，数值是每百万口径」

`apps/web/prisma/seed.ts:499-507` 写价时**不传 billingUnit**，落到 schema 默认值 `per_1k_tokens`（schema.prisma:462）。但 `modelsData` 里 USD 模型的数值是厂商公开的「$/1M tokens」：

| 模型 | 库内值（标 per_1k_tokens） | 厂商公开价 | 若按标签解释 |
|---|---|---|---|
| GPT-4o | 5 / 15 | $5 / $15 每 1M | $5000 / $15000 每 1M（放大 1000×） |
| Claude 3.5 Haiku | 0.8 / 4 | $0.8 / $4 每 1M | $800 / $4000 每 1M（放大 1000×） |
| GPT-4.5 | 75 / 150 | $75 / $150 每 1M | 放大 1000× |

CNY 行数值量级（如 MiniMax-01 0.01/0.02、abab-7 0.005/0.01）与「元/千 tokens」一致，即 **CNY 行标签与数值自洽，USD 行不自洽**。
`price-normalization.ts:24` 对 `per_1k_tokens` 乘 1000 换算到每百万，所以按标签归一会把 seed 的 USD 价放大 1000 倍。

**影响**：TASK-048 若「生效价 → 按 billingUnit 归一到 per_million_tokens」，在 seed 库上 USD 模型展示/扣费会放大 1000×；单元测试若用 seed 数值作 fixture 也会被误导。
**建议（需 Hark 裁决，本线不改 seed 价格口径——seed.ts 不在 049 允许范围）**：
- 方案 a：seed.ts 写价时显式 `billingUnit: m.priceCurrency === 'USD' ? 'per_1m_tokens' : 'per_1k_tokens'`（最小改动；需 Hark 或 seed 所有者改）；
- 方案 b：USD 行数值 ÷1000 保持 per_1k_tokens。
- 两方案均应重新跑本脚本复核：期望出现 `USD · per_1m_tokens` 组，USD 非零行的 per_1k 组为 0。

## 2. 写入 model_prices 的路径与默认口径（静态）

| # | 写入路径 | billingCurrency | billingUnit | sourceType | 备注 |
|---|---|---|---|---|---|
| 1 | `apps/web/prisma/seed.ts:499` | `m.priceCurrency`（USD/CNY） | **不传 → 默认 per_1k_tokens** | 默认 OFFICIAL | F-049-01 |
| 2 | `apps/web/lib/sync/writers/index.ts:106-111`（Hark 独占） | `price.currency \|\| 'CNY'` | `price.unit \|\| 'per_1k_tokens'` | CRAWLER | 由 mapper 传入 |
| 3 | `apps/web/lib/sync/mappers/index.ts:56-57` | `raw.currency ?? 'CNY'` | `raw.unit ?? 'per_1k_tokens'` | — | adapter 未给单位时兜底 per_1k |
| 4 | `apps/web/app/api/v1/admin/prices/route.ts:119-120`（POST） | `?? "CNY"` | `?? "per_1k_tokens"` | OFFICIAL | 后台手工录入 |
| 5 | `apps/web/app/api/v1/admin/prices/batch-upsert/route.ts:120-123`（助手 A 独占） | `?? "CNY"` | `?? "per_1k_tokens"` | OFFICIAL | 批量导入 |
| 6 | `apps/web/app/api/v1/admin/prices/promotions/**` | 继承当前价 | 继承当前价 | PROMOTION | 口径与当前价不一致时拒绝（promotions/[id]/route.ts:107-118） |

## 3. sync adapters 输出口径（静态）

| adapter | currency | unit | 数值换算 | 自洽性 |
|---|---|---|---|---|
| `openrouter.ts:95-98` | USD | per_1k_tokens | `pricing.prompt`（$/token）×1000 | ✓ |
| `artificial-analysis.ts:124-125`（模型主列表） | USD | per_1m_tokens | 原值 input_price/output_price | ✓（AA 原生 $/1M） |
| `artificial-analysis.ts:158-161`（OpenRouter 兼容分支） | USD | per_1k_tokens | ×1000 | ✓ |
| `llmstats.ts:71-72` | USD | per_1m_tokens | 原值 | ✓ |
| `quanzil.ts:145-152` | USD | per_1m_tokens；按次计费 → per_request | model_ratio×$2/M | ✓（per_request 行 outputPrice=0） |
| 其余（huggingface/lmsys/arena-ai/epochai/agentindex/skillsmp/smithery） | — | — | 不产价格 | — |

**单位别名并存**：adapters 写 `per_1m_tokens`，`price-normalization.ts:20-24` 同时接受 `per_million_tokens` 与 `per_1m_tokens`；`per_request` 不在 token 换算表内（监控合成单位 `usd_per_1m_tokens/cny_per_1m_tokens` 由 `:206-209` 映射）。048 的归一器需显式处理 `per_request`（不可按 token 换算）。

## 4. 给 TASK-048 的要点

1. 现存库（seed）只有 `{USD,CNY} × per_1k_tokens × OFFICIAL` 两组；同步/采集上线后会出现 `USD × per_1m_tokens × CRAWLER` 与 `USD × per_request × CRAWLER`。
2. F-049-01：seed USD 行数值与单位标签差 1000×，048 的测试与 e2e 不要以 seed USD 原值作「正确价」锚点，先由 Hark 决定 a/b 修法。
3. 三处默认兜底 `CNY + per_1k_tokens`（mapper/admin POST/batch-upsert）——未显式给币种的外币价会被当成人民币；048 若改默认值，需同步 A 线 batch-upsert。
4. 价格为 0 的行占 949/1000（U-23：免费模型跳过余额校验，048 范围）。
