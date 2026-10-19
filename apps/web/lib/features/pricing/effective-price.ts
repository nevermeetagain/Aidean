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
import type { EffectivePrice } from "@aidean/shared";
import { prisma } from "../../db/prisma";

/** 参与解析所需的最小价格行形状（Prisma ModelPrice 的子集；Decimal 以 unknown + toString 承接） */
export interface PriceRowLike {
  priceInput: unknown;
  priceOutput: unknown;
  priceCache?: unknown;
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
  const current = rows.filter((r) => r.isCurrent).sort(byFromDesc)[0] ?? null;
  const promo = rows.filter((r) => isActivePromotion(r, at)).sort(byFromDesc)[0] ?? null;
  if (promo) return { effective: promo, base: current, isPromotion: true };
  if (current) return { effective: current, base: null, isPromotion: false };
  return null;
}

/** Decimal(19,6) → 十进制字符串（decimal.js toString 在 1e-7 < |x| < 1e21 区间不出科学计数，满足 DecimalStr） */
const dec = (v: unknown): string => String(v);
const decOrNull = (v: unknown): string | null => (v === null || v === undefined ? null : dec(v));

/** 选中结果 → 契约 EffectivePrice DTO（v0.1 字段；不含任何加价率/倍率键） */
export function toEffectivePriceDto(
  modelId: string,
  picked: { effective: PriceRowLike; base: PriceRowLike | null; isPromotion: boolean },
): EffectivePrice {
  const { effective, base, isPromotion } = picked;
  return {
    modelId,
    priceInput: dec(effective.priceInput),
    priceOutput: dec(effective.priceOutput),
    priceCache: decOrNull(effective.priceCache),
    isPromotion,
    promotionEndsAt: isPromotion && effective.effectiveUntil ? effective.effectiveUntil.toISOString() : null,
    basePriceInput: isPromotion && base ? dec(base.priceInput) : null,
    basePriceOutput: isPromotion && base ? dec(base.priceOutput) : null,
  };
}

type PriceClient = { modelPrice: { findMany: (args: unknown) => Promise<PriceRowLike[]> } };

/** 查询 + 解析：单模型生效价（读侧用）；无任何价格 → null */
export async function resolveEffectivePrice(
  modelId: string,
  at: Date = new Date(),
  client: PriceClient = prisma as unknown as PriceClient,
): Promise<EffectivePrice | null> {
  const rows = await client.modelPrice.findMany({
    where: { modelId, ...effectivePriceWhere(at) },
    orderBy: { effectiveFrom: "desc" },
    take: EFFECTIVE_PRICE_CANDIDATE_TAKE,
    select: {
      priceInput: true,
      priceOutput: true,
      priceCache: true,
      isCurrent: true,
      sourceType: true,
      effectiveFrom: true,
      effectiveUntil: true,
    },
  });
  const picked = pickEffectivePrice(rows, at);
  return picked ? toEffectivePriceDto(modelId, picked) : null;
}
