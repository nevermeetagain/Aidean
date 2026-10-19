/**
 * favorites/service — 收藏业务服务（TASK-022 / SOL-S3 / 契约 §S3）。
 *
 * 校验全部走 @aidean/shared 唯一源 DTO（web 有 zod 依赖，ADR-P001；呼应 TASK-021 CodeReview Minor-1：
 *   分页/入参统一由 shared schema 收口，不在 web 侧二次硬编码）。出口以 FavoriteListResponseSchema.parse 结构收口。
 * 错误口径：
 *   - 入参非法 → 40000（BAD_REQUEST，HTTP 400）；
 *   - POST 目标不存在/已软删 → 20003（FAVORITE_TARGET_NOT_FOUND，HTTP 400）；
 *   - DELETE 0 行（不存在/非本人）→ 40000（防枚举，逐字对齐 apikey/service.ts:143-146）；
 *   - 开关关闭 → 由路由首行 requireFeature 抛 50011（HTTP 403），不进本服务。
 * 反 N+1：列表 target 投影调 repo.findTargets（MODEL/API_STATION 各至多一次 IN 查询）。
 */
import {
  ERROR_CODES,
  FavoriteCreateSchema,
  FavoriteListQuerySchema,
  FavoriteListResponseSchema,
  type FavoriteCreate,
  type FavoriteItem,
  type FavoriteListQuery,
  type FavoriteListResponse,
} from "@aidean/shared";

import { ApiError } from "../../../app/api/v1/_lib/errors";

import {
  deleteFavoriteById,
  findTarget,
  findTargets,
  listFavoritePage,
  upsertFavorite,
  type FavoriteRow,
  type TargetProjection,
} from "./repository";

/** 收藏行 + 目标投影 → 契约 FavoriteItem（createdAt ISO；target 缺失→null 避免级联失效） */
function toItem(row: FavoriteRow, target: TargetProjection | null): FavoriteItem {
  return {
    id: row.id,
    refType: row.refType,
    refId: row.refId,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
    target,
  };
}

/** POST：校验入参 → 目标存在性（20003）→ 幂等 upsert → 返回既有/新建 FavoriteItem */
export async function createFavorite(userId: string, raw: unknown): Promise<FavoriteItem> {
  const parsed = FavoriteCreateSchema.safeParse(raw);
  if (!parsed.success) throw new ApiError(ERROR_CODES.BAD_REQUEST, "收藏参数非法");
  const { refType, refId, note } = parsed.data as FavoriteCreate;

  const target = await findTarget(refType, refId);
  if (!target) {
    throw new ApiError(ERROR_CODES.FAVORITE_TARGET_NOT_FOUND, "收藏目标不存在或已下线");
  }

  const row = await upsertFavorite(userId, refType, refId, note);
  return toItem(row, target);
}

/** GET：校验分页查询 → 分页取行 → 按 refType 批量投影 target → 出口结构收口 */
export async function listFavorites(userId: string, rawQuery: unknown): Promise<FavoriteListResponse> {
  const parsed = FavoriteListQuerySchema.safeParse(rawQuery);
  if (!parsed.success) throw new ApiError(ERROR_CODES.BAD_REQUEST, "分页参数非法");
  const query = parsed.data as FavoriteListQuery;

  const { rows, total } = await listFavoritePage(userId, query);

  // 分组各取一次 IN 投影（杜绝逐行查）
  const modelIds = rows.filter((r) => r.refType === "MODEL").map((r) => r.refId);
  const stationIds = rows.filter((r) => r.refType === "API_STATION").map((r) => r.refId);
  const [modelMap, stationMap] = await Promise.all([
    findTargets("MODEL", modelIds),
    findTargets("API_STATION", stationIds),
  ]);

  const items = rows.map((r) => toItem(r, (r.refType === "MODEL" ? modelMap : stationMap).get(r.refId) ?? null));
  const totalPages = query.pageSize > 0 ? Math.ceil(total / query.pageSize) : 0;

  // 出口以契约收口（结构漂移即抛，杜绝脏形状外泄）
  return FavoriteListResponseSchema.parse({
    items,
    total,
    page: query.page,
    pageSize: query.pageSize,
    totalPages,
  });
}

/** DELETE：物理删本人记录；0 行（不存在/非本人）→ 40000（防枚举） */
export async function deleteFavorite(userId: string, id: string): Promise<{ deleted: true }> {
  const count = await deleteFavoriteById(userId, id);
  if (count === 0) throw new ApiError(ERROR_CODES.BAD_REQUEST, "收藏不存在或无权操作");
  return { deleted: true };
}
