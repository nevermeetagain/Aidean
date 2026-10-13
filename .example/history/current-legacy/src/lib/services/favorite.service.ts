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

  const modelFavoriteIds = items
    .filter((item) => item.refType === "MODEL")
    .map((item) => item.refId);

  const models = modelFavoriteIds.length
    ? await prisma.aiModel.findMany({
        where: {
          id: { in: modelFavoriteIds },
          deletedAt: null,
        },
        select: {
          id: true,
          nameDisplay: true,
          vendor: {
            select: {
              name: true,
            },
          },
        },
      })
    : [];

  const modelMap = new Map(models.map((model) => [model.id, model]));

  return {
    items: items.map((item) => ({
      ...item,
      model: item.refType === "MODEL" ? modelMap.get(item.refId) ?? null : null,
    })),
    total,
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
