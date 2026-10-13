/**
 * 交易Service
 * 余额交易业务逻辑层
 */

import { transactionRepo, userRepo } from '@/lib/repositories';
import { Errors } from '@/lib/api/errors';
import { prisma } from '@/lib/db/prisma';
import type { TransactionType } from '@prisma/client';

class TransactionService {
  /**
   * 获取用户交易记录
   */
  async listTransactions(userId: string, options?: {
    page?: number;
    limit?: number;
    type?: TransactionType;
    startDate?: Date;
    endDate?: Date;
  }) {
    if (options?.startDate && options?.endDate) {
      return transactionRepo.findByDateRange(userId, options.startDate, options.endDate, options);
    }
    if (options?.type) {
      return transactionRepo.findByUserAndType(userId, options.type, options);
    }
    return transactionRepo.findByUser(userId, options);
  }

  /**
   * 获取用户余额
   */
  async getBalance(userId: string) {
    const user = await userRepo.findById(userId);
    if (!user) throw Errors.notFound('用户');
    return { balance: Number(user.balance) };
  }

  /**
   * 充值
   */
  async recharge(userId: string, amount: number, description?: string) {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw Errors.notFound('用户');

      const newBalance = Number(user.balance) + amount;
      await tx.user.update({
        where: { id: userId },
        data: { balance: newBalance },
      });

      const transaction = await tx.transaction.create({
        data: {
          userId,
          type: 'RECHARGE',
          amount,
          balance: newBalance,
          description: description || `充值 ¥${amount}`,
        },
      });

      return transaction;
    });
  }

  /**
   * 扣费
   */
  async charge(userId: string, amount: number, description: string, refType?: string, refId?: string) {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw Errors.notFound('用户');

      const currentBalance = Number(user.balance);
      if (currentBalance < amount) throw Errors.insufficientBalance();

      const newBalance = currentBalance - amount;
      await tx.user.update({
        where: { id: userId },
        data: { balance: newBalance },
      });

      const transaction = await tx.transaction.create({
        data: {
          userId,
          type: 'CHARGE',
          amount: -amount,
          balance: newBalance,
          description,
          refType,
          refId,
        },
      });

      return transaction;
    });
  }

  /**
   * 获取交易统计
   */
  async getStats(userId: string) {
    return transactionRepo.getUserStats(userId);
  }
}

export const transactionService = new TransactionService();
