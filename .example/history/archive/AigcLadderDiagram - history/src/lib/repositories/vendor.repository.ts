/**
 * 厂商Repository
 * AI厂商相关数据访问层
 */

import { prisma } from '@/lib/db/prisma';
import { BaseRepository, FindManyOptions, FindManyResult } from './base.repository';
import type { Vendor } from '@prisma/client';

class VendorRepository extends BaseRepository<Vendor> {
  protected model = prisma.vendor;

  /**
   * 按厂商代码查找
   */
  async findByCode(code: string): Promise<Vendor | null> {
    return prisma.vendor.findUnique({ where: { code } });
  }

  /**
   * 获取精选厂商
   */
  async findFeatured(options?: FindManyOptions): Promise<FindManyResult<Vendor>> {
    return this.findMany({
      ...options,
      where: { isFeatured: true, isActive: true, deletedAt: null },
      orderBy: { sortOrder: 'asc' },
    });
  }

  /**
   * 按层级查找
   */
  async findByTier(tierLevel: number, options?: FindManyOptions): Promise<FindManyResult<Vendor>> {
    return this.findMany({
      ...options,
      where: { tierLevel, isActive: true, deletedAt: null },
    });
  }

  /**
   * 获取厂商列表（含模型数量）
   */
  async findWithModelCount(options?: FindManyOptions) {
    const vendors = await prisma.vendor.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { models: true } } },
    });
    return vendors;
  }
}

export const vendorRepo = new VendorRepository();
