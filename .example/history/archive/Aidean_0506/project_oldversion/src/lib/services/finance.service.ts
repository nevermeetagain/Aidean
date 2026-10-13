import { prisma } from '@/lib/db/prisma';

export type TransactionListParams = {
  page?: number;
  limit?: number;
  keyword?: string;
  type?: string;
  userId?: string;
};

export async function getTransactions(params: TransactionListParams = {}) {
  const { page = 1, limit = 20, userId } = params;
  
  const where: any = {};
  if (userId) {
    where.userId = userId;
  }
  
  const [items, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, email: true, nickname: true } },
      },
    }),
    prisma.transaction.count({ where }),
  ]);
  
  return {
    items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getUserBalances(params: { page?: number; limit?: number; keyword?: string } = {}) {
  const { page = 1, limit = 20, keyword } = params;
  
  const where: any = {};
  if (keyword) {
    where.OR = [
      { email: { contains: keyword, mode: 'insensitive' } },
      { nickname: { contains: keyword, mode: 'insensitive' } },
    ];
  }
  
  const [items, total, stats] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { balance: 'desc' },
      select: {
        id: true,
        email: true,
        nickname: true,
        balance: true,
        role: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.user.count({ where }),
    prisma.user.aggregate({
      where,
      _sum: { balance: true },
    }),
  ]);
  
  return {
    items,
    stats: { 
      totalBalance: stats._sum.balance || 0,
    },
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getRechargeOrders(params: { page?: number; limit?: number; keyword?: string; status?: string } = {}) {
  // 暂返回空数据，待RechargeOrder表实现后完善
  const { page = 1, limit = 20 } = params;
  return {
    items: [],
    pagination: { page, limit, total: 0, totalPages: 0 },
  };
}

export async function getSubscriptionPlans() {
  return prisma.subscriptionPlan.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });
}

export async function getUserQuotas(params: { page?: number; limit?: number; keyword?: string } = {}) {
  // 暂返回空数据，待UserQuota表实现后完善
  const { page = 1, limit = 20 } = params;
  return {
    items: [],
    pagination: { page, limit, total: 0, totalPages: 0 },
  };
}
