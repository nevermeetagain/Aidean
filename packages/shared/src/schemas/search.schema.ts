// TASK-032 · S5 全局搜索契约落地
// 真源：docs/任务规划V0.5.0/contracts/01-api.contract.ts §S5（冻结稿原样落地，ADR-P001）
import { z } from "zod";

export const SEARCH_TYPES = ["model", "product", "news"] as const;

export const SearchQuerySchema = z.object({
  q: z.string().trim().min(1).max(50),
  types: z
    .string()
    .optional()
    .transform((s) => (s ? s.split(",") : [...SEARCH_TYPES]))
    .pipe(z.array(z.enum(SEARCH_TYPES)).min(1)),
  limit: z.coerce.number().int().min(1).max(10).default(5), // 每类上限
});
export type SearchQuery = z.infer<typeof SearchQuerySchema>;

export const SearchHitSchema = z.object({
  type: z.enum(SEARCH_TYPES),
  id: z.string(),
  title: z.string(),
  subtitle: z.string().nullable(),
  href: z.string().startsWith("/"),
});
export type SearchHit = z.infer<typeof SearchHitSchema>;

export const SearchResponseSchema = z.object({
  q: z.string(),
  hits: z.array(SearchHitSchema),
  tookMs: z.number().int().min(0),
});
export type SearchResponse = z.infer<typeof SearchResponseSchema>;
