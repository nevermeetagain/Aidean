import { z } from "zod";

/** 分页元信息 */
export const PaginationMetaSchema = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
});
export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;

/** 统一信封工厂:将任意 data payload 包装为标准四要素响应(code/message/data/requestId) */
export function envelope<T extends z.ZodTypeAny>(data: T) {
  return z.object({
    code: z.number().int(),
    message: z.string(),
    data: data.nullable(),
    requestId: z.string(),
  });
}

export type Envelope<T extends z.ZodTypeAny> = z.infer<ReturnType<typeof envelope<T>>>;

/** 错误响应基形:data 恒为 null */
export const ErrorResponseShapeSchema = z.object({
  code: z.number().int(),
  message: z.string(),
  data: z.null(),
  requestId: z.string(),
});
export type ErrorResponseShape = z.infer<typeof ErrorResponseShapeSchema>;