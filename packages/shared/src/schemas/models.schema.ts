import { z } from "zod";
import { PaginationMetaSchema } from "./common.schema";

/** 列表查询参数(URL query 兼容,数值自动 coerce) */
export const ModelListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  modelType: z.string().optional(),
  protocol: z.string().optional(),
  isOpenSource: z.boolean().optional(),
  keyword: z.string().max(100).optional(),
});
export type ModelListQuery = z.infer<typeof ModelListQuerySchema>;

export const ModelSummarySchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  vendor: z.string().min(1),
  modelType: z.string().min(1),
  protocol: z.string().optional(),
  isOpenSource: z.boolean(),
  description: z.string().optional(),
});
export type ModelSummary = z.infer<typeof ModelSummarySchema>;

export const ModelDetailSchema = ModelSummarySchema.extend({
  protocols: z.array(z.string()).optional(),
  releasedAt: z.string().optional(),
  docsUrl: z.string().url().optional(),
});
export type ModelDetail = z.infer<typeof ModelDetailSchema>;

export const ModelListResponseSchema = z.object({
  items: z.array(ModelSummarySchema),
  pagination: PaginationMetaSchema,
});
export type ModelListResponse = z.infer<typeof ModelListResponseSchema>;