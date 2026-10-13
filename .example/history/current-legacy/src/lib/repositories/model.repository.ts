/**
 * ModelRepository
 * AI模型相关数据访问层 */

import { prisma } from '@/lib/db/prisma';
import { BaseRepository, FindManyOptions, FindManyResult } from './base.repository';
import type { AiModel, ModelType, ModelStatus } from '@prisma/client';

class ModelRepository extends BaseRepository<AiModel> {
  protected model = prisma.aiModel;

  /**
   * 按模型代码查找   */
  async findByCode(modelCode: string): Promise<AiModel | null> {
    return prisma.aiModel.findUnique({ where: { modelCode } });
  }

  /**
   * 按Slug查找
   */
  async findBySlug(slug: string): Promise<AiModel | null> {
    return prisma.aiModel.findUnique({ where: { slug } });
  }

  /**
   * 按厂商查找模型   */
  async findByVendor(vendorId: string, options: FindManyOptions): Promise<FindManyResult<AiModel>> {
    return this.findMany({ ...options, where: { vendorId, deletedAt: null } });
  }

  /**
   * 按类型查找模型   */
  async findByType(modelType: ModelType, options: FindManyOptions): Promise<FindManyResult<AiModel>> {
    return this.findMany({ ...options, where: { modelType, deletedAt: null } });
  }

  /**
   * 按状态查找模型   */
  async findByStatus(status: ModelStatus, options: FindManyOptions): Promise<FindManyResult<AiModel>> {
    return this.findMany({ ...options, where: { status, deletedAt: null } });
  }

  /**
   * 获取模型详情（含厂商、价格、评分）
   */
  async findWithDetails(modelId: string) {
    return prisma.aiModel.findUnique({
      where: { id: modelId },
      include: {
        vendor: true,
        prices: { where: { isCurrent: true }, take: 1 },
        scores: { where: { isCurrent: true }, take: 1 },
      },
    });
  }

  /**
   * 包含厂商信息的模型列表
   */
  async findWithVendor(options: FindManyOptions) {
    return this.findMany({
      ...options,
      include: { vendor: true },
    });
  }

  /**
   * 获取推荐模型列表
   */
  async findFeatured(options: FindManyOptions): Promise<FindManyResult<AiModel>> {
    return this.findMany({
      ...options,
      where: { isFeatured: true, isActive: true, deletedAt: null },
      orderBy: { featuredWeight: 'desc' },
    });
  }

  /**
   * 搜索模型
   */
  async search(keyword: string, options: FindManyOptions): Promise<FindManyResult<AiModel>> {
    return this.findMany({
      ...options,
      where: {
        OR: [
          { nameDisplay: { contains: keyword, mode: 'insensitive' } },
          { nameCn: { contains: keyword, mode: 'insensitive' } },
          { modelCode: { contains: keyword, mode: 'insensitive' } },
        ],
        isActive: true,
        deletedAt: null,
      },
    });
  }
}

export const modelRepo = new ModelRepository();



