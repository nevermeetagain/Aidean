/**
 * 用户Repository
 * 用户相关数据访问层
 */

import { prisma } from '@/lib/db/prisma';
import { BaseRepository, FindManyOptions, FindManyResult } from './base.repository';
import type { User, UserStatus, UserRole } from '@prisma/client';

class UserRepository extends BaseRepository<User> {
  protected model = prisma.user;

  /**
   * 按邮箱查找用户
   */
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  }

  /**
   * 按角色查找用户列表
   */
  async findByRole(role: UserRole, options?: FindManyOptions): Promise<FindManyResult<User>> {
    return this.findMany({ ...options, where: { role, deletedAt: null } });
  }

  /**
   * 按状态查找用户列表
   */
  async findByStatus(status: UserStatus, options?: FindManyOptions): Promise<FindManyResult<User>> {
    return this.findMany({ ...options, where: { status, deletedAt: null } });
  }

  /**
   * 更新用户余额
   */
  async updateBalance(userId: string, amount: number): Promise<User> {
    return prisma.user.update({
      where: { id: userId },
      data: { balance: { increment: amount } },
    });
  }

  /**
   * 记录登录
   */
  async recordLogin(userId: string): Promise<User> {
    return prisma.user.update({
      where: { id: userId },
      data: {
        lastLoginAt: new Date(),
        loginCount: { increment: 1 },
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
  }

  /**
   * 记录登录失败
   */
  async recordFailedLogin(userId: string, maxAttempts: number = 5, lockMinutes: number = 30): Promise<User> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const attempts = (user?.failedLoginAttempts || 0) + 1;
    const shouldLock = attempts >= maxAttempts;

    return prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: attempts,
        ...(shouldLock ? { lockedUntil: new Date(Date.now() + lockMinutes * 60 * 1000) } : {}),
      },
    });
  }

  /**
   * 获取用户详情（含Profile）
   */
  async findWithProfile(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
  }

  /**
   * 搜索用户（按昵称或邮箱）
   */
  async search(keyword: string, options?: FindManyOptions): Promise<FindManyResult<User>> {
    return this.findMany({
      ...options,
      where: {
        OR: [
          { nickname: { contains: keyword, mode: 'insensitive' } },
          { email: { contains: keyword, mode: 'insensitive' } },
        ],
        deletedAt: null,
      },
    });
  }
}

export const userRepo = new UserRepository();
