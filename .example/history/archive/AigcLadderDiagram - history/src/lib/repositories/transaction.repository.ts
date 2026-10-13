/**
 * 交易Repository
 * 余额交易相关数据访问层
 */

import { prisma } from '@/lib/db/prisma';
import { BaseRepository, FindManyOptions, FindManyResult } from './base.repository';
import type { Transaction, TransactionType } from '@prisma/client';

class TransactionRepository extends BaseRepository<Transaction> {
  protected model = prisma.transaction;

  /**
   * 按用户查找交易记录
   */
  async findByUser(userId: string, options?: FindManyOptions): Promise<FindManyResult<Transaction>> {
    return this.findMany({
      ...options,
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 按用户和类型查找交易记录
   */
  async findByUserAndType(
    userId: string,
    type: TransactionType,
    options?: FindManyOptions
  ): Promise<FindManyResult<Transaction>> {
    return this.findMany({
      ...options,
      where: { userId, type },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 创建交易记录
   */
  async createTransaction(data: {
    userId: string;
    type: TransactionType;
    amount: number;
    balance: number;
    description: string;
    refType?: string;
    refId?: string;
  }): Promise<Transaction> {
    return prisma.transaction.create({ data });
  }

  /**
   * 获取用户交易统计
   */
  async getUserStats(userId: string) {
    const [totalRecharge, totalCharge, totalRefund] = await Promise.all([
      prisma.transaction.aggregate({
        where: { userId, type: 'RECHARGE' },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { userId, type: 'CHARGE' },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { userId, type: 'REFUND' },
        _sum: { amount: true },
      }),
    ]);

    return {
      totalRecharge: totalRecharge._sum.amount || 0,
      totalCharge: Math.abs(totalCharge._sum.amount || 0),
      totalRefund: totalRefund._sum.amount || 0,
    };
  }

  /**
   * 按日期范围查询
   */
  async findByDateRange(
    userId: string,
    startDate: Date,
    endDate: Date,
    options?: FindManyOptions
  ): Promise<FindManyResult<Transaction>> {
    return this.findMany({
      ...options,
      where: {
        userId,
        createdAt: { gte: startDate, lte: endDate },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const transactionRepo = new TransactionRepository();
