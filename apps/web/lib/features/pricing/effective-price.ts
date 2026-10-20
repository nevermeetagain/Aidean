/**
 * TASK-027 · 生效价解析（DESIGN-002 §1 / 契约① EffectivePrice，packages/shared promotion.schema.ts）
 *
 * 唯一口径：生效价(modelId, at) =
 *   存在 sourceType=PROMOTION ∧ effectiveFrom ≤ at < effectiveUntil 的行（多条取 effectiveFrom 最新）→ 该行；
 *   否则 isCurrent=true 行（多条取 effectiveFrom 最新——部分唯一索引 M-001 保证至多 1 条）；
 *   都没有 → null。
 * 窗口为半开区间 [from, until)；effectiveUntil 为空的 PROMOTION 行视为无效（契约要求必填，防脏数据永久生效）。
 *
 * 计费：加价率/倍率仍只在 gateway service 内部相乘，本模块与 EffectivePrice DTO 均不触碰（开发流程 §五.3）。
 * 精度：选择逻辑不做数值运算，原样返回 Prisma Decimal；DTO 序列化用 Decimal.toString()（不经 Number）。
 */
import {
  PRICE_NORMALIZATION,
  PriceNormalizationError,
  normalizeUnitPrice,
  type EffectivePrice,
  type FxRates,
  type SupportedCurrency,
} from "@aidean/shared";
import { prisma } from "../../db/prisma";
import { getDailyFx } from "./fx";

/** 参与解析所需的最小价格行形状（Prisma ModelPrice 的子集；Decimal 以 unknown + toString 承接） */
export interface PriceRowLike {
  priceInput: unknown;
  priceOutput: unknown;
  priceCache?: unknown;
  /** TASK-048：归一所需（缺省按 schema 默认值处理：CNY / per_million_tokens） */
  billingCurrency?: string | null;
  billingUnit?: string | null;
  isCurrent: boolean;
  sourceType: string;
  effectiveFrom: Date;
  effectiveUntil: Date | null;
}

/** 生效价候选行的 Prisma where 片段：当前价 ∪ at 时刻窗口内的优惠行（供嵌套 prices 关系查询复用） */
export function effectivePriceWhere(at: Date) {
  return {
    OR: [
      { isCurrent: true },
      { sourceType: "PROMOTION" as const, effectiveFrom: { lte: at }, effectiveUntil: { gt: at } },
    ],
  };
}

/** 候选行上限：当前价至多 1 条 + 优惠窗口不重叠时至多 1 条；留余量容忍脏数据 */
export const EFFECTIVE_PRICE_CANDIDATE_TAKE = 5;

export function isActivePromotion(row: PriceRowLike, at: Date): boolean {
  return (
    row.sourceType === "PROMOTION" &&
    row.effectiveUntil !== null &&
    row.effectiveFrom.getTime() <= at.getTime() &&
    at.getTime() < row.effectiveUntil.getTime()
  );
}

const byFromDesc = (a: PriceRowLike, b: PriceRowLike) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime();

/** 纯函数：从候选行中选出 at 时刻的生效行，并给出原价（isCurrent 行）供划线展示 */
export function pickEffectivePrice<T extends PriceRowLike>(
  rows: readonly T[],
  at: Date,
): { effective: T; base: T | null; isPromotion: boolean } | null {
  // 当前价分支排除 PROMOTION 行：优惠行误写 isCurrent=true（Prisma 默认值）时，过期后不得被当成当前价永久生效
  // （STEP-2 审查真库探针；写侧强制 isCurrent=false 归 TASK-028 验收）。
  const current = rows.filter((r) => r.isCurrent && r.sourceType !== "PROMOTION").sort(byFromDesc)[0] ?? null;
  const promo = rows.filter((r) => isActivePromotion(r, at)).sort(byFromDesc)[0] ?? null;
  if (promo) return { effective: promo, base: current, isPromotion: true };
  if (current) return { effective: current, base: null, isPromotion: false };
  return null;
}

/** Decimal(19,6) → 十进制字符串（decimal.js toString 在 1e-7 < |x| < 1e21 区间不出科学计数，满足 DecimalStr） */
const dec = (v: unknown): string => String(v);

// ------------------------------------------------------------------ TASK-048 · 币种/单位归一（ADR-P005 v0.4）

/** 价格行缺省值（与 schema.prisma ModelPrice 默认一致；迁移 20261020010000 起 billing_unit 默认 per_million_tokens） */
const DEFAULT_ROW_CURRENCY = "CNY";
const DEFAULT_ROW_UNIT = "per_million_tokens";

/** 一行价格归一到目标币种 / 每百万 Token 的结果 */
export interface NormalizedRowPrice {
  priceInput: string;
  priceOutput: string;
  priceCache: string | null;
  currency: SupportedCurrency;
  unit: "per_million_tokens";
  sourceCurrency: SupportedCurrency;
  sourceUnit: string;
  sourcePriceInput: string;
  sourcePriceOutput: string;
  fxRate: string | null;
  fxDate: string | null;
  /** 输入与输出归一价均为 0（U-23：免费模型跳过余额校验） */
  isFree: boolean;
}

/**
 * 纯函数：价格行 → 目标币种 / 每百万 Token。任何一项不可归一（未知币种/单位、非法值、跨币种缺汇率）→ null（fail-closed，
 * 调用方按 skip-candidate 处理，绝不按 0 或原值放行）。计费与展示共用此函数，保证同一口径。
 */
export function normalizePriceRow(
  row: Pick<PriceRowLike, "priceInput" | "priceOutput" | "priceCache" | "billingCurrency" | "billingUnit">,
  targetCurrency: SupportedCurrency,
  fx: FxRates | null,
): NormalizedRowPrice | null {
  const sourceCurrency = (row.billingCurrency ?? DEFAULT_ROW_CURRENCY).trim().toUpperCase();
  const sourceUnit = (row.billingUnit ?? DEFAULT_ROW_UNIT).trim();
  const one = (v: unknown) =>
    normalizeUnitPrice({ value: dec(v), sourceCurrency, sourceUnit, targetCurrency, fx });
  try {
    const input = one(row.priceInput);
    const output = one(row.priceOutput);
    const cache = row.priceCache === null || row.priceCache === undefined ? null : one(row.priceCache);
    return {
      priceInput: input.value,
      priceOutput: output.value,
      priceCache: cache ? cache.value : null,
      currency: targetCurrency,
      unit: "per_million_tokens",
      sourceCurrency: input.sourceCurrency,
      sourceUnit: input.sourceUnit,
      sourcePriceInput: input.sourceValue,
      sourcePriceOutput: output.sourceValue,
      fxRate: input.fxRate,
      fxDate: input.fxDate,
      isFree: /^0(\.0+)?$/.test(input.value) && /^0(\.0+)?$/.test(output.value),
    };
  } catch (err) {
    if (err instanceof PriceNormalizationError) {
      console.warn(`[pricing] 价格行不可归一（${err.reason}）：${sourceCurrency}/${sourceUnit} → ${targetCurrency}`);
      return null;
    }
    throw err;
  }
}

/** 是否需要汇率（源币种与目标币种不同）；未知币种交由 normalizePriceRow 判 null */
export function needsFx(rows: readonly Pick<PriceRowLike, "billingCurrency">[], targetCurrency: SupportedCurrency): boolean {
  return rows.some((r) => (r.billingCurrency ?? DEFAULT_ROW_CURRENCY).trim().toUpperCase() !== targetCurrency);
}

/**
 * 选中结果 → 契约 EffectivePrice DTO（v0.2：priceInput/priceOutput/priceCache 为归一后的目标币种 / 每百万 Token；
 * 原币原价进 source* 字段；不含任何加价率/倍率键）。生效行或（优惠时）原价行不可归一 → null。
 */
export function toEffectivePriceDto(
  modelId: string,
  picked: { effective: PriceRowLike; base: PriceRowLike | null; isPromotion: boolean },
  targetCurrency: SupportedCurrency = PRICE_NORMALIZATION.settlementCurrency,
  fx: FxRates | null = null,
): EffectivePrice | null {
  const { effective, base, isPromotion } = picked;
  const n = normalizePriceRow(effective, targetCurrency, fx);
  if (!n) return null;
  const b = isPromotion && base ? normalizePriceRow(base, targetCurrency, fx) : null;
  return {
    modelId,
    priceInput: n.priceInput,
    priceOutput: n.priceOutput,
    priceCache: n.priceCache,
    isPromotion,
    promotionEndsAt: isPromotion && effective.effectiveUntil ? effective.effectiveUntil.toISOString() : null,
    basePriceInput: b ? b.priceInput : null,
    basePriceOutput: b ? b.priceOutput : null,
    currency: n.currency,
    unit: n.unit,
    sourceCurrency: n.sourceCurrency,
    sourceUnit: n.sourceUnit,
    sourcePriceInput: n.sourcePriceInput,
    sourcePriceOutput: n.sourcePriceOutput,
    fxRate: n.fxRate,
    fxDate: n.fxDate,
  };
}

type PriceClient = { modelPrice: { findMany: (args: unknown) => Promise<PriceRowLike[]> } };

/** 生效价候选行 select（读侧与网关共用：选择 + 归一所需字段） */
export const EFFECTIVE_PRICE_SELECT = {
  priceInput: true,
  priceOutput: true,
  priceCache: true,
  billingCurrency: true,
  billingUnit: true,
  isCurrent: true,
  sourceType: true,
  effectiveFrom: true,
  effectiveUntil: true,
} as const;

export interface ResolveEffectivePriceOptions {
  /** 目标币种：计费恒为结算币种 CNY；展示由 resolveDisplayCurrency(国家) 决定 */
  currency?: SupportedCurrency;
  /** 测试注入；缺省读当日汇率快照 getDailyFx(at) */
  loadFx?: (at: Date) => Promise<FxRates | null>;
}

/** 查询 + 解析：单模型生效价（读侧用）；无任何价格或不可归一 → null */
export async function resolveEffectivePrice(
  modelId: string,
  at: Date = new Date(),
  client: PriceClient = prisma as unknown as PriceClient,
  opts: ResolveEffectivePriceOptions = {},
): Promise<EffectivePrice | null> {
  const rows = await client.modelPrice.findMany({
    where: { modelId, ...effectivePriceWhere(at) },
    orderBy: { effectiveFrom: "desc" },
    take: EFFECTIVE_PRICE_CANDIDATE_TAKE,
    select: EFFECTIVE_PRICE_SELECT,
  });
  const picked = pickEffectivePrice(rows, at);
  if (!picked) return null;
  const currency = opts.currency ?? PRICE_NORMALIZATION.settlementCurrency;
  const involved = picked.base ? [picked.effective, picked.base] : [picked.effective];
  const fx = needsFx(involved, currency) ? await (opts.loadFx ?? getDailyFx)(at) : null;
  return toEffectivePriceDto(modelId, picked, currency, fx);
}
