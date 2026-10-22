/**
 * B11-02 · 价格分层 seed（消解 DEF-011-02「演示数据近乎全免费 + 原币 100% null」）
 *
 * 口径（计价归一 §12 / ADR-P005 v0.4 / U-15 / TASK-030 / U-23=B）：
 *   - 单位：USD 行 per_million_tokens，CNY 行 per_1k_tokens（与 seed.ts 既有约定一致）；
 *   - 每个模型保留一条 isCurrent=true 当前价，由 /pricing 与 resolveEffectivePrice 统一归一；
 *   - 免费层保留（priceInput=priceOutput=0），U-23=B 免费路径不被破坏；
 *   - 促销样本 = sourceType=PROMOTION + isCurrent=false + 半开窗口 [from, until)，
 *     窗口锚定 UTC 日界 → 同日重跑结果一致（TASK-030：优惠价为 0 即免费）；
 *   - originalCurrency 默认与 billingCurrency 同币种（exchangeRate=1）；若 fx_daily_rates 已有
 *     USD/CNY 快照，则把 USD 层前 CROSS_CURRENCY_ROWS 行改写为「源站以 CNY 标价、记账 USD」的
 *     跨币种样本——汇率一律读库，本模块不硬编码任何汇率数值（REQ-M-007；packages/shared 的
 *     price-normalization.spec 有同口径断言）。
 *
 * 幂等：按 modelCode 前缀精确圈定演示模型，deleteMany 其全部价格行后 createMany 重建；
 * 重复执行结果一致，且不触碰 curated 模型（seed.ts modelsData）的既有官方价。
 *
 * provenance：演示行 sourceType=CRAWLER + sourceName=seed-pricing-tiers，不冒充「官方来源」
 * （check-docs-facts 的 seed-no-official 断言守护）。
 */
import type { Prisma, PrismaClient } from '@prisma/client'

/** 演示模型编码前缀（seed.ts demoModelsData：demo-model-001 … demo-model-922） */
const DEMO_PREFIX = 'demo-model-'
/** 免费层上界（含）：001–020 共 20 个，与 curated 零价模型共同构成「保留的免费层」 */
const FREE_TIER_MAX = 20
/** CNY 付费层上界（含）：021–040 共 20 个。curated 另有 22 条 CNY 有价行，二者合计已够展示 ¥ 价 */
const CNY_TIER_MAX = 40
/** 跨币种原币样本行数（仅当 fx_daily_rates 有快照时生效） */
const CROSS_CURRENCY_ROWS = 60
/** 促销样本：一个正常折扣、一个限时免费（TASK-030） */
const PROMO_DISCOUNT_CODE = 'demo-model-061'
const PROMO_FREE_CODE = 'demo-model-062'
/** 促销窗口长度（天）；起点 = 当日 UTC 00:00 前 1 小时，保证任何时刻重跑都覆盖 now */
const PROMO_WINDOW_DAYS = 30
const SOURCE_NAME = 'seed-pricing-tiers'

const tierNotes = (tier: string) => `seed:pricing-tiers:${tier}`

/** 演示模型序号：demo-model-007 → 7；解析失败返回 NaN 由调用方过滤 */
function demoSeq(modelCode: string): number {
  return Number.parseInt(modelCode.slice(DEMO_PREFIX.length), 10)
}

/**
 * USD 付费层（per_million_tokens）：0.10–2.99 美元/百万。
 * 整数分运算 + toFixed，避免浮点表示误差落进 Decimal(19,6)。
 */
function usdTierPrice(idx: number): { input: string; output: string } {
  const cents = 10 + ((idx * 7) % 290) // 10…299 分
  return { input: (cents / 100).toFixed(2), output: ((cents * 3) / 100).toFixed(2) }
}

/**
 * CNY 付费层（per_1k_tokens）：0.002–0.0215 元/千 Token（归一后 ¥2–¥21.5/百万，贴近国产模型官方价）。
 * 以「微元」为单位做整数运算，输出 6 位小数与 Decimal(19,6) 对齐。
 */
function cnyTierPrice(idx: number): { input: string; output: string } {
  const micro = 2000 + idx * 500 // 2000…21500 微元/千 Token
  return { input: (micro / 1e6).toFixed(6), output: ((micro * 4) / 1e6).toFixed(6) }
}

/** 促销窗口：锚定 UTC 日界，同日重跑数值不变 */
function promoWindow(now: Date): { from: Date; until: Date } {
  const dayStart = new Date(`${now.toISOString().slice(0, 10)}T00:00:00.000Z`)
  return {
    from: new Date(dayStart.getTime() - 60 * 60 * 1000),
    until: new Date(dayStart.getTime() + PROMO_WINDOW_DAYS * 24 * 60 * 60 * 1000),
  }
}

/**
 * 读最近一期 USD/CNY 日汇率快照（B11-01 采集器写入）。
 * 读不到 → 返回 null，调用方退化为「原币 = 记账币种」，绝不内置估算汇率。
 */
async function loadUsdCnyRate(prisma: PrismaClient): Promise<{ rate: string; rateDate: string } | null> {
  const row = await prisma.fxDailyRate.findFirst({
    where: { base: 'USD', quote: 'CNY' },
    orderBy: { rateDate: 'desc' },
    select: { rate: true, rateDate: true },
  })
  if (!row) return null
  return { rate: row.rate.toString(), rateDate: row.rateDate.toISOString().slice(0, 10) }
}

export interface PricingTierStats {
  demoModels: number
  free: number
  cnyPaid: number
  usdPaid: number
  promotions: number
  originalCurrencyNotNull: number
  crossCurrency: number
  fx: { rate: string; rateDate: string } | null
}

/**
 * 重建演示模型价格分层。幂等：同一份种子数据重复执行得到同一组行。
 * 调用点位于 seed.ts 主流程（模型与价格已建）之后、count 取证之前。
 */
export async function applyPricingTiers(
  prisma: PrismaClient,
  now: Date = new Date(),
): Promise<PricingTierStats> {
  const demoModels = await prisma.aiModel.findMany({
    where: { modelCode: { startsWith: DEMO_PREFIX } },
    select: { id: true, modelCode: true },
    orderBy: { modelCode: 'asc' },
  })
  const stats: PricingTierStats = {
    demoModels: demoModels.length,
    free: 0,
    cnyPaid: 0,
    usdPaid: 0,
    promotions: 0,
    originalCurrencyNotNull: 0,
    crossCurrency: 0,
    fx: null,
  }
  if (demoModels.length === 0) {
    console.warn('[pricing-tiers] 未找到演示模型，跳过价格分层')
    return stats
  }

  const fx = await loadUsdCnyRate(prisma)
  stats.fx = fx

  const rows: Prisma.ModelPriceCreateManyInput[] = []
  const baseEffectiveFrom = now

  for (const model of demoModels) {
    const seq = demoSeq(model.modelCode)
    if (!Number.isFinite(seq)) continue

    // 演示行统一 provenance：不冒充官方来源
    const common = {
      modelId: model.id,
      billingMode: 'PER_TOKEN' as const,
      isCurrent: true,
      effectiveFrom: baseEffectiveFrom,
      sourceType: 'CRAWLER' as const,
      sourceName: SOURCE_NAME,
    }

    if (seq <= FREE_TIER_MAX) {
      // 免费层：U-23=B 可测路径
      rows.push({
        ...common,
        priceInput: '0',
        priceOutput: '0',
        billingCurrency: 'USD',
        billingUnit: 'per_million_tokens',
        originalCurrency: 'USD',
        originalPriceInput: '0',
        originalPriceOutput: '0',
        exchangeRate: '1',
        notes: tierNotes('free'),
      })
      stats.free += 1
      stats.originalCurrencyNotNull += 1
      continue
    }

    if (seq <= CNY_TIER_MAX) {
      const price = cnyTierPrice(seq - FREE_TIER_MAX - 1)
      rows.push({
        ...common,
        priceInput: price.input,
        priceOutput: price.output,
        billingCurrency: 'CNY',
        billingUnit: 'per_1k_tokens',
        originalCurrency: 'CNY',
        originalPriceInput: price.input,
        originalPriceOutput: price.output,
        notes: tierNotes('cny-paid'),
      })
      stats.cnyPaid += 1
      stats.originalCurrencyNotNull += 1
      continue
    }

    // USD 付费层：per_million_tokens
    const idx = seq - CNY_TIER_MAX - 1
    const price = usdTierPrice(idx)
    // 前 N 行在有汇率时改写为「源站 CNY 标价、记账 USD」的跨币种样本
    const cross = fx !== null && idx < CROSS_CURRENCY_ROWS
    if (cross) {
      const rate = Number(fx.rate)
      const cnyInput = Number(price.input) * rate
      const cnyOutput = Number(price.output) * rate
      rows.push({
        ...common,
        priceInput: price.input,
        priceOutput: price.output,
        billingCurrency: 'USD',
        billingUnit: 'per_million_tokens',
        originalCurrency: 'CNY',
        originalPriceInput: cnyInput.toFixed(6),
        originalPriceOutput: cnyOutput.toFixed(6),
        exchangeRate: fx.rate,
        notes: tierNotes('usd-paid-src-cny'),
      })
      stats.crossCurrency += 1
    } else {
      rows.push({
        ...common,
        priceInput: price.input,
        priceOutput: price.output,
        billingCurrency: 'USD',
        billingUnit: 'per_million_tokens',
        originalCurrency: 'USD',
        originalPriceInput: price.input,
        originalPriceOutput: price.output,
        exchangeRate: '1',
        notes: tierNotes('usd-paid'),
      })
    }
    stats.usdPaid += 1
    stats.originalCurrencyNotNull += 1
  }

  // 促销样本：挂 USD 层最低价的两个模型，避免与 e2e 自建窗口（claude-3-7-sonnet）重叠
  const { from, until } = promoWindow(now)
  const byCode = new Map(demoModels.map((m) => [m.modelCode, m.id]))
  const promoRows: Prisma.ModelPriceCreateManyInput[] = []
  const discountId = byCode.get(PROMO_DISCOUNT_CODE)
  const freeId = byCode.get(PROMO_FREE_CODE)
  if (discountId) {
    promoRows.push({
      modelId: discountId,
      priceInput: '0.05',
      priceOutput: '0.15',
      billingMode: 'PER_TOKEN',
      billingCurrency: 'USD',
      billingUnit: 'per_million_tokens',
      isCurrent: false,
      sourceType: 'PROMOTION',
      sourceName: SOURCE_NAME,
      notes: tierNotes('promo-discount'),
      effectiveFrom: from,
      effectiveUntil: until,
    })
    stats.promotions += 1
  }
  if (freeId) {
    promoRows.push({
      modelId: freeId,
      priceInput: '0',
      priceOutput: '0',
      billingMode: 'PER_TOKEN',
      billingCurrency: 'USD',
      billingUnit: 'per_million_tokens',
      isCurrent: false,
      sourceType: 'PROMOTION',
      sourceName: SOURCE_NAME,
      notes: tierNotes('promo-free'),
      effectiveFrom: from,
      effectiveUntil: until,
    })
    stats.promotions += 1
  } else {
    console.warn(`[pricing-tiers] 未找到促销样本模型 ${PROMO_FREE_CODE}，限时免费样本缺失`)
  }

  // 幂等重建：先删本模块圈定的演示模型全部价格行，再批量写入
  await prisma.$transaction([
    prisma.modelPrice.deleteMany({ where: { modelId: { in: demoModels.map((m) => m.id) } } }),
    prisma.modelPrice.createMany({ data: [...rows, ...promoRows] }),
  ])

  console.log(
    `[pricing-tiers] demo=${stats.demoModels} free=${stats.free} cnyPaid=${stats.cnyPaid} ` +
      `usdPaid=${stats.usdPaid} promo=${stats.promotions} originalCurrency=${stats.originalCurrencyNotNull} ` +
      `crossCurrency=${stats.crossCurrency} fx=${fx ? `${fx.rate}@${fx.rateDate}` : 'none'}`,
  )
  return stats
}
