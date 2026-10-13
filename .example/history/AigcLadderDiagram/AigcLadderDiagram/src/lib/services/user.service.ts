import { prisma } from "@/lib/db/prisma";

export type UserListParams = {
  page?: number;
  limit?: number;
  keyword?: string;
  role?: string;
  status?: string;
};

export async function getUsers(params: UserListParams = {}) {
  const { page = 1, limit = 20, keyword, role, status } = params;
  
  const where: any = {};
  
  if (keyword) {
    where.OR = [
      { email: { contains: keyword, mode: "insensitive" } },
      { nickname: { contains: keyword, mode: "insensitive" } },
    ];
  }
  
  if (role) {
    where.role = role;
  }
  
  if (status) {
    where.status = status;
  }
  
  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        nickname: true,
        role: true,
        status: true,
        balance: true,
        emailVerified: true,
        lastLoginAt: true,
        loginCount: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            transactions: true,
            evaluations: true,
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);
  
  return {
    items: items.map((user) => ({
      ...user,
      transactionCount: user._count.transactions,
      evaluationCount: user._count.evaluations,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: {
      profile: true,
      subscription: true,
      _count: {
        select: {
          transactions: true,
          favorites: true,
          evaluations: true,
          apiKeys: true,
        },
      },
    },
  });
}

export async function updateUser(id: string, data: any) {
  return prisma.user.update({
    where: { id },
    data,
  });
}

export async function deleteUser(id: string) {
  return prisma.user.delete({
    where: { id },
  });
}

// 记录用户登录
export async function recordLogin(userId: string, ipAddress?: string, userAgent?: string) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      lastLoginAt: new Date(),
      loginCount: { increment: 1 },
    },
  });
}
