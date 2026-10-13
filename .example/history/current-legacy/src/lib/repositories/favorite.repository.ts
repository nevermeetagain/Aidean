/**
 * FavoriteRepository
 * 用户收藏相关数据访问层 */

import { prisma } from '@/lib/db/prisma';
import { BaseRepository, FindManyOptions, FindManyResult } from './base.repository';
import type { Favorite, FavoriteType } from '@prisma/client';

class FavoriteRepository extends BaseRepository<Favorite> {
  protected model = prisma.favorite;

  /**
   * 按用户查找收藏   */
  async findByUser(userId: string, options: FindManyOptions): Promise<FindManyResult<Favorite>> {
    return this.findMany({
      ...options,
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 按用户和类型查找收藏
   */
  async findByUserAndType(
    userId: string,
    refType: FavoriteType,
    options: FindManyOptions
  ): Promise<FindManyResult<Favorite>> {
    return this.findMany({
      ...options,
      where: { userId, refType },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 检查是否已收藏
   */
  async isFavorited(userId: string, refType: FavoriteType, refId: string): Promise<boolean> {
    return this.exists({ userId, refType, refId });
  }

  /**
   * 添加收藏
   */
  async addFavorite(userId: string, refType: FavoriteType, refId: string, note: string): Promise<Favorite> {
    return prisma.favorite.create({
      data: { userId, refType, refId, note },
    });
  }

  /**
   * 移除收藏
   */
  async removeFavorite(userId: string, refType: FavoriteType, refId: string): Promise<Favorite> {
    return prisma.favorite.delete({
      where: { userId_refType_refId: { userId, refType, refId } },
    });
  }

  /**
   * 切换收藏状态   */
  async toggleFavorite(userId: string, refType: FavoriteType, refId: string): Promise<{ added: boolean }> {
    const exists = await this.isFavorited(userId, refType, refId);
    if (exists) {
      await this.removeFavorite(userId, refType, refId);
      return { added: false };
    }
    await this.addFavorite(userId, refType, refId, "");
    return { added: true };
  }

  /**
   * 统计用户收藏数   */
  async countByUser(userId: string): Promise<number> {
    return this.count({ userId });
  }

  /**
   * 统计资源被收藏数
   */
  async countByRef(refType: FavoriteType, refId: string): Promise<number> {
    return this.count({ refType, refId });
  }
}

export const favoriteRepo = new FavoriteRepository();



