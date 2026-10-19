// S3 · 收藏契约 —— 由 docs/任务规划V0.5.0/contracts/01-api.contract.ts §S3 经 TASK-021 原样落地。
// 落地映射（唯一源 = packages/shared/src/schemas/*，ADR-P001）：Favorite* → 本文件。
// 端点（01-api.contract.ts §端点注册表）：
//   API-005 GET    /api/v1/user/favorites（USER，TASK-022）→ req = FavoriteListQuerySchema；res = FavoriteListResponseSchema；
//   API-006 POST   /api/v1/user/favorites（USER，TASK-022）→ req = FavoriteCreateSchema；res = FavoriteItemSchema；幂等（@@unique userId+refType+refId），重复收藏返回既有记录 HTTP 200；
//   API-007 DELETE /api/v1/user/favorites/[id]（USER，TASK-022）→ res = FavoriteDeleteResponseSchema；0 行（不存在/非本人）→ 40000（防枚举，沿用 api-keys DELETE 口径）。
// 受控面：feature flag `favorites.enabled`（FEATURE_GATES，feature-flags.schema.ts）。
// 数据模型：apps/web/prisma/schema.prisma model Favorite（enum FavoriteType MODEL|API_STATION，@@unique[userId,refType,refId]）。
import { z } from "zod";

const Iso = z.string().datetime();

/** schema.prisma enum FavoriteType 的取值集（唯一源=契约，勿在业务侧重复硬编码） */
export const FAVORITE_TYPES = ["MODEL", "API_STATION"] as const;

/** POST /api/v1/user/favorites 请求体 */
export const FavoriteCreateSchema = z.object({
  refType: z.enum(FAVORITE_TYPES),
  refId: z.string().min(1).max(64),
  note: z.string().max(200).optional(),
});

/** GET /api/v1/user/favorites 查询参数（PageQuery + refType 可选过滤） */
export const FavoriteListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  refType: z.enum(FAVORITE_TYPES).optional(),
});

/** 收藏条目（target 在目标已下线时为 null，避免级联失效） */
export const FavoriteItemSchema = z.object({
  id: z.string(),
  refType: z.enum(FAVORITE_TYPES),
  refId: z.string(),
  note: z.string().nullable(),
  createdAt: Iso,
  target: z.object({ name: z.string(), href: z.string(), slug: z.string().nullable() }).nullable(),
});

/** GET /api/v1/user/favorites 分页响应 */
export const FavoriteListResponseSchema = z.object({
  items: z.array(FavoriteItemSchema),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  totalPages: z.number().int().min(0),
});

/** DELETE /api/v1/user/favorites/[id] 成功响应 */
export const FavoriteDeleteResponseSchema = z.object({ deleted: z.literal(true) });

export type FavoriteRefType = z.infer<typeof FavoriteCreateSchema>["refType"];
export type FavoriteCreate = z.infer<typeof FavoriteCreateSchema>;
export type FavoriteListQuery = z.infer<typeof FavoriteListQuerySchema>;
export type FavoriteItem = z.infer<typeof FavoriteItemSchema>;
export type FavoriteListResponse = z.infer<typeof FavoriteListResponseSchema>;
export type FavoriteDeleteResponse = z.infer<typeof FavoriteDeleteResponseSchema>;
