# EVD-069 偏离说明

1. **口径按卡头 2026-10-20 变更与 26/27 号文件执行**（卡体仍写 system_configs `pricing.fxUsdCny` / FxConfigSchema / 前置 TASK-055，均已被 U-15 与 ADR-P005 v0.3 取代）：USD 价折算改读 TASK-047 当日汇率快照 `getDailyFx()`（`lib/features/pricing/fx.ts`，只读调用，未改 Hark 文件），换算走唯一归一函数 `normalizeUnitPrice`（packages/shared，只调用）。
2. **缺汇率 fail-closed**：卡体原写「抛 GATEWAY_NO_ROUTE 语义的可识别错误并跳过写 PriceRule」。实现：`toMinorCny` 抛 `PriceNormalizationError('fx_missing')`（契约内可识别错误），`extractPricing` 捕获后**跳过该条 USD PriceRule 不写库**并 `console.warn` 计数；CNY 价不依赖汇率照常写入；读快照异常（DB 不可用）同样按缺汇率处理，不抛出、不回退任何固定汇率。
3. **精度**：原实现 `Math.round(usd * 7.2 * 100)` 浮点；现解析阶段保留原文十进制串，经 BigInt 定点换算到 6 位小数后再半入到分。`$X/1M` 在 fx=7.2 时与旧值一致（单测 1440 分），汇率不同结果随之变化（证明无硬编码）。
4. **批量一次取汇率**：`extractPricingBatch` 共享一个懒加载提供者，同批只读一次快照（单测断言 getDailyFx 调用 1 次）；无 USD 价时不读快照。`extractPricing` 增加可选第 4 参 `opts.fxProvider`（向后兼容，`pipeline.ts` 调用方无需改动）。
5. **发现（未改，登记）**：聚合商 API 的裸数字价格（如 OpenRouter `pricing.prompt: "0.000002"`，语义为每 token 美元）沿用既有口径按「每百万 Token」处理，导致数值偏小 10^6 倍（`priceStringToMinor` 原实现即如此）。改为 `per_token` 会改变 PriceRule 写入值，超出本卡「只换汇率」范围，未改；建议另立卡裁决。
6. `scripts/check-docs-facts.mjs`：spec-count 190→191（R10-01，新增 `pricing-extraction-fx.spec.ts`）。
7. task-index 本卡行状态回写（派单要求，卡面禁止项 docs/任务规划V0.10.0/** 的授权偏离，同 EVD-036）。
