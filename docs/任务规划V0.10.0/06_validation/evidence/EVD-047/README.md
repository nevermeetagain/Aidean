# EVD-047 计价/币种/日汇率契约（Hark 核心，改写版，2026-10-20）

依据：26_用户裁决记录 U-15（IP 定展示币种 + 每天一个汇率；扣费按余额币种）→ ADR-P005 v0.3 ACCEPTED。

## 交付
- `packages/shared/src/utils/price-normalization.ts`：SUPPORTED_CURRENCIES、UNIT_FACTOR_TO_MILLION（含 per_1m_tokens 别名）、PRICE_NORMALIZATION（settlementCurrency=CNY、scale=6、fxTimeZone=Asia/Shanghai、fxMaxStaleDays=3）、GEO_COUNTRY_HEADERS、FxDailyRateSchema、fxDateOf、resolveDisplayCurrency、normalizeUnitPrice（BigInt 定点、半入、无汇率字面量）、splitObservedPriceUnit、PriceNormalizationError
- `promotion.schema.ts`：EffectivePrice 追加 8 个归一字段（optional，048 起填充）；promotion.spec 键集合断言同步
- 表 `fx_daily_rates` + 迁移 `20261020000000_fx_daily_rates`（CHECK rate>0、base<>quote，UNIQUE(rate_date, base, quote)）
- `apps/web/lib/features/pricing/fx.ts#getDailyFx`：汇率日取数、≤3 天回退（stale）、超限 null、同日 10 分钟进程缓存
- 文档：ADR-P005 v0.3、数据库文档 v2.14（73 model）、TASK-047 卡头改写、facts 计数 72→73 / 179→180
- 未做（按裁决取消）：pricing.fxUsdCny 配置键、admin-config/pricing-config 改动

## 验证
- shared：22 文件 / 228 例全过（新增 price-normalization 18 例：四象限、CNY→USD、定点精度、0 价、5 类 fail-closed、展示币种、汇率日边界、Schema、无硬编码汇率）
- web fx.spec 5 例；prisma migrate deploy 于 PG16（127.0.0.1:55432）成功，`prisma migrate diff` 无差异（drift 0）
- 契约生成 drift 0；docs rule 0；facts 14/14；guard 4/4；web tsc 0；lint 0
- web test：135 文件 / 1324 passed / 5 skipped，0 failed
