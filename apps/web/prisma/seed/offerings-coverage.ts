/**
 * B11-07 · 供给覆盖 seed（消解 DEF-011-10「模型详情页 offerings 恒空」）
 *
 * 卡面口径（07_ 卡集 SubTask C.2.1【范围】第二项）：
 *   「修改 seed.ts 或 UI seed（ProviderModelOffering 覆盖度提升，落在少量高代表模型上，不追求 1000）」
 *
 * 与「不写假数据」的边界（fail-closed 口径）：
 *   - 本模块只作用于**演示模型**（modelCode 前缀 demo-model-），不碰 curated 真实模型；
 *     给真实模型挂虚构标价会把「某聚合平台的真实标价」污染成假数据，故排除。
 *   - 价格不另编：一律读同库 ModelPrice 的当前行（isCurrent=true，USD/per_million_tokens），
 *     使「详情页价格」与「在哪里可调用」两块数字同源，避免同页自相矛盾。
 *   - 模型缺当前价 → 跳过并计数（fail-closed：宁可不挂，不猜价）。
 *   - 真实采集数据走独立链路（monitor_catalogs → provider_model_observations），
 *     与本模块的演示供给互不覆盖：本模块不写 observations，采集器不写 offerings。
 *
 * 幂等：按 (providerId, modelId) 唯一键 upsert；effectiveFrom 锚定 UTC 日界，
 *       同日重跑**最终态**不变。注意 aligned 每轮恒为 5 而非 0：seed.ts 6.y 在每轮
 *       先以固定公式重置 siliconflow 示例 offering 的价格，本模块随后再对齐；
 *       中间态重置不影响结束态（探针 priceMismatches 恒为 0）。
 *
 * provenance：ProviderModelOffering 无 sourceType/sourceName 字段（schema 既有设计），
 *   因此本模块不产生任何「官方来源」标记，也不会触发 seed-no-official 断言。
 */
import type { PrismaClient } from '@prisma/client'

/** 演示模型编码前缀（与 seed.ts demoModelsData / pricing-tiers.ts 同源） */
const DEMO_PREFIX = 'demo-model-'
/** 供给样本区间：demo-model-041 … demo-model-060（USD 付费层，价格非零便于展示） */
const OFFERING_SEQ_FROM = 41
const OFFERING_SEQ_TO = 60
/** 挂载平台：openrouter（seed.ts providerSeeds 已建，isActive=true） */
const PROVIDER_CODE = 'openrouter'
/** offerings 价格口径（与 providerModelOffering.priceUnit 同口径） */
const OFFERING_PRICE_UNIT = 'per_million_tokens'

const pad3 = (n: number) => String(n).padStart(3, '0')

export interface OfferingCoverageStats {
  requested: number
  upserted: number
  skippedNoPrice: number
  /** 既有 demo offerings 价格与当前 ModelPrice 不一致、本次已对齐的条数 */
  aligned: number
  providerFound: boolean
  distinctModels: number
}

/**
 * 为 openrouter 挂载 OFFERING_SEQ_FROM…TO 的演示模型（价格取各自当前价）。
 * 调用点位于 seed.ts 价格分层之后（需 ModelPrice 已就绪）、count 取证之前。
 */
export async function applyOfferingCoverage(
  prisma: PrismaClient,
  now: Date = new Date(),
): Promise<OfferingCoverageStats> {
  const stats: OfferingCoverageStats = {
    requested: 0,
    upserted: 0,
    skippedNoPrice: 0,
    aligned: 0,
    providerFound: false,
    distinctModels: 0,
  }

  const provider = await prisma.modelProvider.findUnique({ where: { code: PROVIDER_CODE } })
  if (!provider) {
    console.warn(`[offerings-coverage] 未找到平台 ${PROVIDER_CODE}，跳过供给覆盖`)
    return stats
  }
  stats.providerFound = true

  const codes: string[] = []
  for (let seq = OFFERING_SEQ_FROM; seq <= OFFERING_SEQ_TO; seq++) codes.push(`${DEMO_PREFIX}${pad3(seq)}`)
  stats.requested = codes.length

  const models = await prisma.aiModel.findMany({
    where: { modelCode: { in: codes } },
    select: { id: true, modelCode: true },
  })
  if (models.length === 0) {
    console.warn('[offerings-coverage] 未找到目标演示模型，跳过供给覆盖')
    return stats
  }

  // 只认「USD + per_million_tokens 的当前价」：与 ProviderModelOffering.priceUnit 同口径
  const prices = await prisma.modelPrice.findMany({
    where: {
      modelId: { in: models.map((m) => m.id) },
      isCurrent: true,
      billingCurrency: 'USD',
      billingUnit: OFFERING_PRICE_UNIT,
    },
    select: { modelId: true, priceInput: true, priceOutput: true },
  })
  const priceByModel = new Map(prices.map((p) => [p.modelId, p] as const))

  const dayStart = new Date(`${now.toISOString().slice(0, 10)}T00:00:00.000Z`)

  for (const model of models) {
    const price = priceByModel.get(model.id)
    // 缺价行 / 免费层（0/0）：不挂，避免「可调用但标价缺失或为 0」的误导
    if (!price || (Number(price.priceInput) === 0 && Number(price.priceOutput) === 0)) {
      stats.skippedNoPrice += 1
      continue
    }

    await prisma.providerModelOffering.upsert({
      where: { providerId_modelId: { providerId: provider.id, modelId: model.id } },
      create: {
        providerId: provider.id,
        modelId: model.id,
        listedAt: dayStart,
        defaultMultiplier: 1.0,
        priceInput: price.priceInput,
        priceOutput: price.priceOutput,
        priceCache: null,
        priceUnit: OFFERING_PRICE_UNIT,
        effectiveFrom: dayStart,
        isActive: true,
      },
      update: {
        priceInput: price.priceInput,
        priceOutput: price.priceOutput,
        priceUnit: OFFERING_PRICE_UNIT,
        effectiveFrom: dayStart,
        isActive: true,
      },
    })
    stats.upserted += 1
  }

  // ---- 价格同源对齐：既有 demo offerings（如 seed.ts 6.y 的 siliconflow 示例挂载）可能先于
  // 价格分层创建而滞留旧价 → 统一对齐到当前 ModelPrice。只写价格字段（人工资段
  // defaultMultiplier/effectiveFrom/listedAt 不动），缺价或 0/0 的行保持原样。
  const demoModels = await prisma.aiModel.findMany({
    where: { modelCode: { startsWith: DEMO_PREFIX } },
    select: { id: true },
  })
  const demoIds = demoModels.map((m) => m.id)
  const demoPrices = await prisma.modelPrice.findMany({
    where: {
      modelId: { in: demoIds },
      isCurrent: true,
      billingCurrency: 'USD',
      billingUnit: OFFERING_PRICE_UNIT,
    },
    select: { modelId: true, priceInput: true, priceOutput: true },
  })
  const demoPriceByModel = new Map(demoPrices.map((p) => [p.modelId, p] as const))
  const demoOfferings = await prisma.providerModelOffering.findMany({
    where: { modelId: { in: demoIds } },
    select: { id: true, modelId: true, priceInput: true, priceOutput: true, priceUnit: true },
  })
  for (const offering of demoOfferings) {
    const price = demoPriceByModel.get(offering.modelId)
    if (!price) continue
    if (Number(price.priceInput) === 0 && Number(price.priceOutput) === 0) continue
    const same =
      Number(offering.priceInput) === Number(price.priceInput) &&
      Number(offering.priceOutput) === Number(price.priceOutput) &&
      offering.priceUnit === OFFERING_PRICE_UNIT
    if (same) continue
    await prisma.providerModelOffering.update({
      where: { id: offering.id },
      data: {
        priceInput: price.priceInput,
        priceOutput: price.priceOutput,
        priceUnit: OFFERING_PRICE_UNIT,
      },
    })
    stats.aligned += 1
  }

  const distinct = await prisma.providerModelOffering.groupBy({ by: ['modelId'], _count: true })
  stats.distinctModels = distinct.length

  console.log(
    `[offerings-coverage] requested=${stats.requested} upserted=${stats.upserted} ` +
      `skippedNoPrice=${stats.skippedNoPrice} aligned=${stats.aligned} distinctModels=${stats.distinctModels}`,
  )
  return stats
}
