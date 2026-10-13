/**
 * 收藏Service
 * 用户收藏业务逻辑层
 */

import { favoriteRepo } from '@/lib/repositories';
import { Errors } from '@/lib/api/errors';
import type { FavoriteType } from '@prisma/client';

class FavoriteService {
  /**
   * 获取用户收藏列表
   */
  async listFavorites(userId: string, refType?: FavoriteType, options?: { page?: number; limit?: number }) {
    if (refType) {
      return favoriteRepo.findByUserAndType(userId, refType, options);
    }
    return favoriteRepo.findByUser(userId, options);
  }

  /**
   * 添加收藏
   */
  async addFavorite(userId: string, refType: FavoriteType, refId: string, note?: string) {
    const exists = await favoriteRepo.isFavorited(userId, refType, refId);
    if (exists) throw Errors.conflict('已收藏');
    return favoriteRepo.addFavorite(userId, refType, refId, note);
  }

  /**
   * 移除收藏
   */
  async removeFavorite(userId: string, refType: FavoriteType, refId: string) {
    const exists = await favoriteRepo.isFavorited(userId, refType, refId);
    if (!exists) throw Errors.notFound('收藏');
    return favoriteRepo.removeFavorite(userId, refType, refId);
  }

  /**
   * 切换收藏状态
   */
  async toggleFavorite(userId: string, refType: FavoriteType, refId: string) {
    return favoriteRepo.toggleFavorite(userId, refType, refId);
  }

  /**
   * 检查是否已收藏
   */
  async isFavorited(userId: string, refType: FavoriteType, refId: string) {
    return favoriteRepo.isFavorited(userId, refType, refId);
  }

  /**
   * 获取收藏统计
   */
  async getStats(userId: string) {
    const total = await favoriteRepo.countByUser(userId);
    return { total };
  }
}

export const favoriteService = new FavoriteService();
