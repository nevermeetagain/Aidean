/**
 * User Service
 * 用户业务逻辑层
 */

import { prisma } from '@/lib/db/prisma';
import { hash } from 'bcryptjs';
import { Errors } from '@/lib/api/errors';
import type { User } from '@prisma/client';

// ============================================
// 类型定义
// ============================================

export interface UserListQuery {
  page?: number;
  limit?: number;
  role?: string;
  status?: string;
  search?: string;
}

export interface UpdateUserInput {
  nickname?: string;
  avatar?: string;
  email?: string;
}

export interface UpdateProfileInput {
  bio?: string;
  company?: string;
  website?: string;
  location?: string;
}

// ============================================
// 用户查询
// ============================================

export async function getUserById(id: string): Promise<User> {
  const user = await (prisma as any).user.findUnique({
    where: { id },
    include: {
      profile: true,
    },
  });

  if (!user) {
    throw Errors.userNotFound();
  }

  return user;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  return (prisma as any).user.findUnique({
    where: { email },
  });
}

export async function getUsers(query: UserListQuery) {
  const page = query.page || 1;
  const limit = query.limit || 20;
  const skip = (page - 1) * limit;

  const where: any = {};

  if (query.role) {
    where.role = query.role;
  }

  if (query.status) {
    where.status = query.status;
  }

  if (query.search) {
    where.OR = [
      { email: { contains: query.search, mode: 'insensitive' } },
      { nickname: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  const [users, total] = await Promise.all([
    (prisma as any).user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        nickname: true,
        avatar: true,
        role: true,
        status: true,
        createdAt: true,
        lastLoginAt: true,
      },
    }),
    (prisma as any).user.count({ where }),
  ]);

  return {
    items: users,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// ============================================
// 用户更新
// ============================================

export async function updateUser(
  id: string,
  input: UpdateUserInput
): Promise<User> {
  // 检查邮箱是否已被其他用户使用
  if (input.email) {
    const existingUser = await (prisma as any).user.findFirst({
      where: {
        email: input.email,
        NOT: { id },
      },
    });

    if (existingUser) {
      throw Errors.emailAlreadyExists();
    }
  }

  return (prisma as any).user.update({
    where: { id },
    data: input,
  });
}

export async function updateProfile(
  userId: string,
  input: UpdateProfileInput
): Promise<any> {
  return (prisma as any).userProfile.upsert({
    where: { userId },
    create: {
      userId,
      ...input,
    },
    update: input,
  });
}

// ============================================
// 用户资料
// ============================================

export async function getUserProfile(userId: string): Promise<any> {
  const profile = await (prisma as any).userProfile.findUnique({
    where: { userId },
  });

  if (!profile) {
    // 创建默认资料
    return (prisma as any).userProfile.create({
      data: {
        userId,
      },
    });
  }

  return profile;
}

// ============================================
// 会话管理
// ============================================

export async function getUserSessions(userId: string): Promise<any[]> {
  return (prisma as any).userSession.findMany({
    where: {
      userId,
      isActive: true,
      expiresAt: { gt: new Date() },
    },
    orderBy: { lastActiveAt: 'desc' },
    select: {
      id: true,
      deviceInfo: true,
      ipAddress: true,
      lastActiveAt: true,
      expiresAt: true,
      createdAt: true,
    },
  });
}

export async function revokeSession(
  userId: string,
  sessionId: string
): Promise<void> {
  await (prisma as any).userSession.updateMany({
    where: {
      id: sessionId,
      userId,
    },
    data: { isActive: false },
  });
}

export async function revokeAllSessions(
  userId: string,
  exceptSessionId?: string
): Promise<void> {
  const where: any = {
    userId,
    isActive: true,
  };

  if (exceptSessionId) {
    where.NOT = { id: exceptSessionId };
  }

  await (prisma as any).userSession.updateMany({
    where,
    data: { isActive: false },
  });
}

// ============================================
// 密码管理
// ============================================

export async function changePassword(
  userId: string,
  oldPassword: string,
  newPassword: string
): Promise<void> {
  const user = await (prisma as any).user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw Errors.userNotFound();
  }

  const { compare } = await import('bcryptjs');
  const isValid = await compare(oldPassword, user.password);

  if (!isValid) {
    throw Errors.invalidCredentials();
  }

  const hashedPassword = await hash(newPassword, 12);

  await (prisma as any).user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });

  // 吊销所有会话，要求重新登录
  await revokeAllSessions(userId);
}

// ============================================
// 导出
// ============================================

export default {
  getUserById,
  getUserByEmail,
  getUsers,
  updateUser,
  updateProfile,
  getUserProfile,
  getUserSessions,
  revokeSession,
  revokeAllSessions,
  changePassword,
};
