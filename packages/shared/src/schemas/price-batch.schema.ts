// S4 · 批量调价契约（TASK-082 / REQ-F-061）。
// 来源：docs/product/design/功能设计文档.md §3.5「批量/扩展能力扩展原则」——
//   POST /api/v1/admin/prices/batch-upsert（复用 §3.4.1 writers/prices 的 UPSERT 语义），
//   以 requestId 幂等键防双击（参照 redemption GRANT 幂等既有实现）。端点实现归 TASK-081。
// 行定义：冻结契约中无独立 PriceSchema；字段口径对齐 admin.schema.ts AdminPriceCreateSchema，收紧见 PriceBatchRowSchema。
// 命名：body.requestId 为「批量幂等键」（卡面 TASK-082 指定名），≠ 响应信封 requestId（链路追踪 x-request-id），二者无关。
// 语义（交 TASK-081 实现）：逐行独立 upsert，允许部分成功，失败行进 failed[]；不做整批单事务。
import { z } from "zod";

/** 非负十进制字符串（与 promotion.schema.ts 同口径） */
const DecimalStr = z.string().regex(/^\d+(\.\d+)?$/);
/**
 * 批量行价格：仅接受「有限数」或「非负十进制字符串」，再统一转 number。
 * 拒绝 ""/null/" "/布尔/数组/"0x10"/"1e3"——批量调价多来自 CSV/表格，空格子被 coerce 成 0 = 误写免费价（资金风险，V0.9.0 STEP-1 审查）。
 */
const BatchPriceAmount = z.union([z.number(), DecimalStr]).pipe(z.coerce.number().finite().min(0).max(1_000_000));

/**
 * 批量写价行：字段口径对齐 admin.schema.ts AdminPriceCreateSchema（现行唯一单行写价契约；冻结契约无独立 PriceSchema），
 * 但 ① 价格字段收紧为 BatchPriceAmount；② .strict() 拒绝拼错字段（防静默丢弃）；
 * ③ billingMode 可选且无默认值——新建时默认 PER_TOKEN、更新时保留原值，由端点（TASK-081）决定，避免 upsert 悄悄改计费方式。
 */
export const PriceBatchRowSchema = z
  .object({
    modelId: z.string().trim().min(1).max(64),
    priceInput: BatchPriceAmount,
    priceOutput: BatchPriceAmount,
    priceCache: BatchPriceAmount.nullable().optional(),
    pricePerRequest: BatchPriceAmount.nullable().optional(),
    billingMode: z.enum(["PER_TOKEN", "PER_REQUEST", "PER_MINUTE", "FREE"]).optional(),
    billingUnit: z.string().trim().max(40).optional(),
    billingCurrency: z.string().trim().regex(/^[A-Za-z]{3}$/).optional(),
    notes: z.string().trim().max(500).nullable().optional(),
  })
  .strict();

/** 单批上限（防超大事务与请求体；超限 → 40000） */
export const PRICE_BATCH_MAX_ROWS = 500;

/** 批量写价请求体 */
export const PriceBatchUpsertSchema = z
  .object({
    requestId: z.string().uuid(), // 幂等键：同 requestId 重放返回首次结果，不重复写
    rows: z.array(PriceBatchRowSchema).min(1).max(PRICE_BATCH_MAX_ROWS),
  })
  .strict()
  .superRefine((v, ctx) => {
    // 同批内同一 modelId 只允许一行（否则「当前价」语义不确定）
    const seen = new Map<string, number>();
    v.rows.forEach((r, i) => {
      const prev = seen.get(r.modelId);
      if (prev !== undefined) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["rows", i, "modelId"], message: `modelId 与第 ${prev} 行重复` });
      } else seen.set(r.modelId, i);
    });
  });

/** 单行失败明细（index 为请求 rows 下标） */
export const PriceBatchRowErrorSchema = z.object({
  index: z.number().int().min(0),
  modelId: z.string(),
  code: z.number().int(),
  message: z.string(),
});

/** 批量写价响应 data */
export const PriceBatchUpsertResponseSchema = z
  .object({
    requestId: z.string().uuid(),
    total: z.number().int().min(0),
    created: z.number().int().min(0),
    updated: z.number().int().min(0),
    failed: z.array(PriceBatchRowErrorSchema),
    replayed: z.boolean(), // true = 命中幂等键，返回首次结果
  })
  .refine((v) => v.total === v.created + v.updated + v.failed.length, "total 必须等于 created + updated + failed.length");

export type PriceBatchRow = z.infer<typeof PriceBatchRowSchema>;
export type PriceBatchUpsert = z.infer<typeof PriceBatchUpsertSchema>;
export type PriceBatchRowError = z.infer<typeof PriceBatchRowErrorSchema>;
export type PriceBatchUpsertResponse = z.infer<typeof PriceBatchUpsertResponseSchema>;
