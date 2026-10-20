// S4 · 限时优惠契约 —— 由 docs/任务规划V0.5.0/contracts/01-api.contract.ts §S4 经 TASK-026 落地。
// 落地映射（唯一源 = packages/shared/src/schemas/*，ADR-P001）：Promotion* / EffectivePrice → 本文件。
// 端点（01-api.contract.ts §端点注册表，TASK-028 实现）：
//   API-008 GET   /api/v1/admin/prices/promotions        （ADMIN:admin.models.read）
//   API-009 POST  /api/v1/admin/prices/promotions        （ADMIN:admin.models.write）← PromotionPriceCreateSchema
//   API-010 PATCH /api/v1/admin/prices/promotions/[id]   （ADMIN:admin.models.write）← PromotionPricePatchSchema
// 生效规则（单一口径，DESIGN-002 §1）：at 时刻存在 sourceType=PROMOTION 且 effectiveFrom<=at<effectiveUntil
//   的行（取 effectiveFrom 最新）→ 用之；否则 isCurrent=true 行。同一模型优惠窗口不得重叠（写侧 → 40000）。
//
// TASK-047（改写，2026-10-20，ADR-P005 v0.3）：EffectivePrice 追加归一字段（currency/unit/sourceCurrency/
//   sourceUnit/sourcePrice*/fxRate/fxDate）。为不破坏现有生产者，追加字段为 optional：TASK-048 起由生效价解析器
//   全量填充；priceInput/priceOutput 在归一后即为 currency / 每百万 Token 的值。固定汇率配置键 pricing.fxUsdCny
//   已被 U-15 裁决取代（日汇率快照，见 utils/price-normalization.ts），不再落地。
import { z } from "zod";
import { SUPPORTED_CURRENCIES } from "../utils/price-normalization";

const Iso = z.string().datetime();
/** 非负十进制字符串（¥/M Tokens）；"0" = 免费 */
const DecimalStr = z.string().regex(/^\d+(\.\d+)?$/);

/** 后台创建限时优惠（API-009）：effectiveUntil 必填且须晚于 effectiveFrom（半开区间 [from, until)） */
export const PromotionPriceCreateSchema = z
  .object({
    modelId: z.string().min(1),
    priceInput: DecimalStr, // ¥/M Tokens；"0" = 免费
    priceOutput: DecimalStr,
    priceCache: DecimalStr.nullish(),
    effectiveFrom: Iso,
    effectiveUntil: Iso, // 必填：限时优惠必须有结束时间
    notes: z.string().max(200).nullish(),
    idempotencyKey: z.string().min(8).max(64).optional(),
  })
  .refine((v) => new Date(v.effectiveUntil) > new Date(v.effectiveFrom), "effectiveUntil 必须晚于 effectiveFrom");

/** 后台修改限时优惠（API-010）：strict，未知键拒绝；窗口合法性（合并现值后）由服务端校验 */
export const PromotionPricePatchSchema = z
  .object({
    priceInput: DecimalStr.optional(),
    priceOutput: DecimalStr.optional(),
    priceCache: DecimalStr.nullish(),
    effectiveFrom: Iso.optional(),
    effectiveUntil: Iso.optional(),
    notes: z.string().max(200).nullish(),
  })
  .strict();

/**
 * 公开展示与计费共用的「生效价」DTO（v0.1 基础字段）。
 * 不含任何加价率/倍率字段（markupRate/tokenMultiplier 只在服务端内部相乘——开发流程.md §五.3）。
 */
export const EffectivePriceSchema = z.object({
  modelId: z.string(),
  priceInput: DecimalStr,
  priceOutput: DecimalStr,
  priceCache: DecimalStr.nullable(),
  isPromotion: z.boolean(),
  promotionEndsAt: Iso.nullable(),
  basePriceInput: DecimalStr.nullable(), // 优惠生效时的原价，供前台划线展示；非优惠时 null
  basePriceOutput: DecimalStr.nullable(),
  // ---- TASK-047 归一字段（optional，048 起必填充）
  currency: z.enum(SUPPORTED_CURRENCIES).optional(),
  unit: z.literal("per_million_tokens").optional(),
  sourceCurrency: z.enum(SUPPORTED_CURRENCIES).optional(),
  sourceUnit: z.string().optional(),
  sourcePriceInput: DecimalStr.optional(),
  sourcePriceOutput: DecimalStr.optional(),
  fxRate: DecimalStr.nullable().optional(),
  fxDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

export type PromotionPriceCreate = z.infer<typeof PromotionPriceCreateSchema>;
export type PromotionPricePatch = z.infer<typeof PromotionPricePatchSchema>;
export type EffectivePrice = z.infer<typeof EffectivePriceSchema>;
