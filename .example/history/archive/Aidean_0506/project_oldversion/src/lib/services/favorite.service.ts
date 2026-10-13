import { prisma } from "@/lib/db/prisma";
import type { FavoriteType } from "@prisma/client";

export type FavoriteListParams = {
  page?: number;
  limit?: number;
  refType?: FavoriteType;
};

export async function getFavorites(userId: string, params: FavoriteListParams = {}) {
  const { page = 1, limit = 50, refType } = params;
  const where: any = { userId };
  if (refType) {
    where.refType = refType;
  }

  const [items, total] = await Promise.all([
    prisma.favorite.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.favorite.count({ where }),
  ]);

  return {
    items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function addFavorite(userId: string, refType: FavoriteType, refId: string, note?: string) {
  const existing = await prisma.favorite.findUnique({
    where: {
      userId_refType_refId: { userId, refType, refId },
    },
  });

  if (existing) {
    throw new Error("已收藏");
  }

  return prisma.favorite.create({
    data: { userId, refType, refId, note },
  });
}

export async function removeFavorite(userId: string, refType: FavoriteType, refId: string) {
  return prisma.favorite.delete({
    where: {
      userId_refType_refId: { userId, refType, refId },
    },
  });
}

export async function isFavorited(userId: string, refType: FavoriteType, refId: string): Promise<boolean> {
  const fav = await prisma.favorite.findUnique({
    where: {
      userId_refType_refId: { userId, refType, refId },
    },
    select: { id: true },
  });
  return !!fav;
}
