import { prisma } from '@/lib/db/prisma';

export type TransactionListParams = {
  page?: number;
  limit?: number;
  keyword?: string;
  type?: string;
  userId?: string;
};

function toDisplayTransactionType(type: string) {
  return type === 'CHARGE' ? 'CONSUME' : type;
}

function toName(user: { nickname: string | null; email: string }) {
  return user.nickname || user.email;
}

function readExtraQuotaNumber(extraQuotas: unknown, key: string) {
  if (!extraQuotas || typeof extraQuotas !== 'object') return 0;
  const value = (extraQuotas as Record<string, unknown>)[key];
  return typeof value === 'number' ? value : 0;
}

function readExtraQuotaBoolean(extraQuotas: unknown, key: string) {
  if (!extraQuotas || typeof extraQuotas !== 'object') return false;
  return Boolean((extraQuotas as Record<string, unknown>)[key]);
}

export async function getTransactions(params: TransactionListParams = {}) {
  const { page = 1, limit = 20, userId, keyword, type } = params;

  const where: any = {};
  if (userId) {
    where.userId = userId;
  }

  if (keyword) {
    where.OR = [
      { description: { contains: keyword, mode: 'insensitive' } },
      { user: { email: { contains: keyword, mode: 'insensitive' } } },
      { user: { nickname: { contains: keyword, mode: 'insensitive' } } },
      { id: { contains: keyword, mode: 'insensitive' } },
    ];
  }

  if (type) {
    where.type = type === 'CONSUME' ? 'CHARGE' : type;
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
    items: items.map((item) => ({
      id: item.id,
      transactionNo: item.id,
      user: {
        id: item.user.id,
        name: toName(item.user),
        email: item.user.email,
      },
      type: toDisplayTransactionType(item.type),
      amount: item.amount,
      balanceBefore: item.balance - item.amount,
      balanceAfter: item.balance,
      description: item.description,
      relatedOrderNo: item.refId || null,
      createdAt: item.createdAt,
    })),
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
      include: {
        transactions: {
          select: { type: true, amount: true, createdAt: true },
        },
        rechargeOrders: {
          select: { totalAmount: true, paidAt: true, status: true },
        },
      },
    }),
    prisma.user.count({ where }),
    prisma.user.aggregate({
      where,
      _sum: { balance: true },
    }),
  ]);
  
  return {
    items: items.map((item) => {
      const paidRechargeOrders = item.rechargeOrders.filter((order) => order.status === 'PAID');
      const rechargeTotal =
        paidRechargeOrders.reduce((sum, order) => sum + order.totalAmount, 0) ||
        item.transactions
          .filter((transaction) => transaction.type === 'RECHARGE')
          .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);
      const consumeTotal = item.transactions
        .filter((transaction) => transaction.type === 'CHARGE')
        .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);
      const lastRecharge = paidRechargeOrders
        .map((order) => order.paidAt)
        .filter((value): value is Date => value instanceof Date)
        .sort((a, b) => b.getTime() - a.getTime())[0] || null;

      return {
        id: item.id,
        user: {
          id: item.id,
          name: toName(item),
          email: item.email,
        },
        balance: item.balance,
        frozenAmount: 0,
        totalRecharge: rechargeTotal,
        totalConsume: consumeTotal,
        lastRechargeAt: lastRecharge,
        updatedAt: item.updatedAt,
      };
    }),
    stats: { 
      totalBalance: stats._sum.balance || 0,
    },
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getRechargeOrders(params: { page?: number; limit?: number; keyword?: string; status?: string } = {}) {
  const { page = 1, limit = 20, keyword, status } = params;

  const where: any = {};
  if (keyword) {
    where.OR = [
      { id: { contains: keyword, mode: 'insensitive' } },
      { transactionId: { contains: keyword, mode: 'insensitive' } },
      { user: { email: { contains: keyword, mode: 'insensitive' } } },
      { user: { nickname: { contains: keyword, mode: 'insensitive' } } },
    ];
  }
  if (status) {
    where.status = status;
  }

  const [items, total] = await Promise.all([
    prisma.rechargeOrder.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, email: true, nickname: true } },
      },
    }),
    prisma.rechargeOrder.count({ where }),
  ]);

  return {
    items: items.map((item) => ({
      id: item.id,
      orderNo: item.transactionId || item.id,
      user: {
        id: item.user.id,
        name: toName(item.user),
        email: item.user.email,
      },
      amount: item.amount,
      paymentMethod: item.payMethod,
      status: item.status,
      paidAt: item.paidAt,
      createdAt: item.createdAt,
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getSubscriptionPlans() {
  return prisma.subscriptionPlan.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });
}

export async function getUserQuotas(params: { page?: number; limit?: number; keyword?: string } = {}) {
  const { page = 1, limit = 20, keyword } = params;

  const where: any = {};
  if (keyword) {
    where.user = {
      OR: [
        { email: { contains: keyword, mode: 'insensitive' } },
        { nickname: { contains: keyword, mode: 'insensitive' } },
      ],
    };
  }

  const [items, total] = await Promise.all([
    prisma.userQuota.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { updatedAt: 'desc' },
      include: {
        user: { select: { id: true, email: true, nickname: true } },
        plan: { select: { id: true, name: true, code: true } },
      },
    }),
    prisma.userQuota.count({ where }),
  ]);

  return {
    items: items.map((item) => ({
      id: item.id,
      user: {
        id: item.user.id,
        name: toName(item.user),
        email: item.user.email,
      },
      dailyLimit: readExtraQuotaNumber(item.extraQuotas, 'dailyLimit'),
      dailyUsed: readExtraQuotaNumber(item.extraQuotas, 'dailyUsed'),
      monthlyLimit: item.apiCallsLimit || 0,
      monthlyUsed: item.apiCallsUsed,
      alertThreshold: readExtraQuotaNumber(item.extraQuotas, 'alertThreshold'),
      isAlertEnabled: readExtraQuotaBoolean(item.extraQuotas, 'isAlertEnabled'),
      plan: item.plan,
      apiCallsLimit: item.apiCallsLimit,
      apiCallsUsed: item.apiCallsUsed,
      storageLimitMb: item.storageLimitMb,
      storageUsedMb: item.storageUsedMb,
      modelsLimit: item.modelsLimit,
      modelsCreated: item.modelsCreated,
      skillsLimit: item.skillsLimit,
      skillsCreated: item.skillsCreated,
      agentsLimit: item.agentsLimit,
      agentsCreated: item.agentsCreated,
      updatedAt: item.updatedAt,
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}
