// S4 · 批量调价契约（TASK-082 / REQ-F-061）。
// 来源：docs/product/design/功能设计文档.md §3.5「批量/扩展能力扩展原则」——
//   POST /api/v1/admin/prices/batch-upsert（复用 §3.4.1 writers/prices 的 UPSERT 语义），
//   以 requestId 幂等键防双击（参照 redemption GRANT 幂等既有实现）。端点实现归 TASK-081。
// 行定义复用：冻结契约中无独立 PriceSchema，现行唯一「单行写价」契约为 admin.schema.ts 的
//   AdminPriceCreateSchema（modelId + 价格字段），故批量行原样复用之，不另立字段口径（ADR-P001）。
import { z } from "zod";
import { AdminPriceCreateSchema } from "./admin.schema";

/** 单批上限（防超大事务与请求体；超限 → 40000） */
export const PRICE_BATCH_MAX_ROWS = 500;

/** 批量写价请求体 */
export const PriceBatchUpsertSchema = z
  .object({
    requestId: z.string().uuid(), // 幂等键：同 requestId 重放返回首次结果，不重复写
    rows: z.array(AdminPriceCreateSchema).min(1).max(PRICE_BATCH_MAX_ROWS),
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
export const PriceBatchUpsertResponseSchema = z.object({
  requestId: z.string().uuid(),
  total: z.number().int().min(0),
  created: z.number().int().min(0),
  updated: z.number().int().min(0),
  failed: z.array(PriceBatchRowErrorSchema),
  replayed: z.boolean(), // true = 命中幂等键，返回首次结果
});

export type PriceBatchUpsert = z.infer<typeof PriceBatchUpsertSchema>;
export type PriceBatchRowError = z.infer<typeof PriceBatchRowErrorSchema>;
export type PriceBatchUpsertResponse = z.infer<typeof PriceBatchUpsertResponseSchema>;
