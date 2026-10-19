/**
 * favorites/repository — 收藏数据访问层（TASK-022 / SOL-S3）。
 *
 * 数据模型：apps/web/prisma/schema.prisma model Favorite（enum FavoriteType MODEL|API_STATION，
 *   @@unique([userId,refType,refId]) 幂等键，@@index([userId]) 分页读，@@index([refType,refId]) 目标反查）。
 *   表与索引在 S0 迁移已建（migrations 含 favorites + 唯一索引），本卡零新迁移。
 * 目标实体：MODEL→aiModel（slug 唯一、软删 deletedAt），API_STATION→aPIStation（displayName、软删 deletedAt，无独立详情页）。
 *   口径「存在且启用」＝未软删（对齐 station-user-key.ts:128 `deletedAt:null` 既有范式）。
 * 反 N+1：列表 target 投影按 refType 各一次 IN 查询（findTargets），绝不逐行查（TASK-022 验收③）。
 */
import { prisma } from "../../db/prisma";
import type { FavoriteRefType } from "@aidean/shared";

/** 收藏目标投影（契约 FavoriteItem.target；API_STATION 无 slug→null） */
export interface TargetProjection {
  name: string;
  href: string;
  slug: string | null;
}

/** 收藏行（仅取业务所需列，createdAt 保持 Date 由 service 归一 ISO） */
export interface FavoriteRow {
  id: string;
  refType: FavoriteRefType;
  refId: string;
  note: string | null;
  createdAt: Date;
}

/** 单目标存在性校验（POST 前置）：命中返回投影源，未命中（不存在/已软删）返回 null → service 抛 20003 */
export async function findTarget(
  refType: FavoriteRefType,
  refId: string,
): Promise<TargetProjection | null> {
  if (refType === "MODEL") {
    const m = await prisma.aiModel.findFirst({
      where: { id: refId, deletedAt: null },
      select: { nameDisplay: true, slug: true },
    });
    return m ? { name: m.nameDisplay, href: `/models/${m.slug}`, slug: m.slug } : null;
  }
  const s = await prisma.aPIStation.findFirst({
    where: { id: refId, deletedAt: null },
    select: { displayName: true },
  });
  // 站点无独立详情页：href 指向服务商列表 /providers；slug 无（契约 target.slug nullable）
  return s ? { name: s.displayName, href: "/providers", slug: null } : null;
}

/** 批量目标投影（每种 refType 恰一次 IN 查询）：已软删/不存在的 refId 不落 Map → service 侧 target=null */
export async function findTargets(
  refType: FavoriteRefType,
  refIds: readonly string[],
): Promise<Map<string, TargetProjection>> {
  if (refIds.length === 0) return new Map();
  if (refType === "MODEL") {
    const rows = await prisma.aiModel.findMany({
      where: { id: { in: [...refIds] }, deletedAt: null },
      select: { id: true, nameDisplay: true, slug: true },
    });
    return new Map(
      rows.map((r): [string, TargetProjection] => [r.id, { name: r.nameDisplay, href: `/models/${r.slug}`, slug: r.slug }]),
    );
  }
  const rows = await prisma.aPIStation.findMany({
    where: { id: { in: [...refIds] }, deletedAt: null },
    select: { id: true, displayName: true },
  });
  return new Map(
    rows.map((r): [string, TargetProjection] => [r.id, { name: r.displayName, href: "/providers", slug: null }]),
  );
}

/**
 * 幂等收藏（依赖 @@unique[userId,refType,refId]）：不存在则建，存在则原样返回既有记录。
 * update 分支：仅当显式传 note 才覆盖，未传则保持既有 note（契约「重复收藏返回既有记录」）。
 */
export async function upsertFavorite(
  userId: string,
  refType: FavoriteRefType,
  refId: string,
  note: string | undefined,
): Promise<FavoriteRow> {
  return prisma.favorite.upsert({
    where: { userId_refType_refId: { userId, refType, refId } },
    create: { userId, refType, refId, note: note ?? null },
    update: note !== undefined ? { note } : {},
    select: { id: true, refType: true, refId: true, note: true, createdAt: true },
  });
}

/** 分页列表（userId 索引 + createdAt 倒序）：findMany + count 并发，返回行集与总数 */
export async function listFavoritePage(
  userId: string,
  opts: { page: number; pageSize: number; refType?: FavoriteRefType },
): Promise<{ rows: FavoriteRow[]; total: number }> {
  const where = opts.refType ? { userId, refType: opts.refType } : { userId };
  const [rows, total] = await Promise.all([
    prisma.favorite.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (opts.page - 1) * opts.pageSize,
      take: opts.pageSize,
      select: { id: true, refType: true, refId: true, note: true, createdAt: true },
    }),
    prisma.favorite.count({ where }),
  ]);
  return { rows, total };
}

/** 物理删除本人收藏：返回受影响行数（0=不存在/非本人 → service 抛 40000 防枚举） */
export async function deleteFavoriteById(userId: string, id: string): Promise<number> {
  const res = await prisma.favorite.deleteMany({ where: { id, userId } });
  return res.count;
}
