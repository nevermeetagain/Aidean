/**
 * Authentication Service
 * 认证业务逻辑层
 */

import { prisma } from '@/lib/db/prisma';
import { compare, hash } from 'bcryptjs';
import {
  generateAccessToken as jwtGenerateAccess,
  generateRefreshToken as jwtGenerateRefresh,
  verifyRefreshToken as jwtVerifyRefresh,
  setTokenCookies,
  ACCESS_TOKEN_EXPIRY,
} from '@/lib/auth/jwt';
import redis from '@/lib/redis';
import { Errors } from '@/lib/api/errors';
import type { User, UserSession } from '@prisma/client';

// ============================================
// 配置（JWT配置统一由 @/lib/auth/jwt.ts 管理）
// ============================================

// ============================================
// 类型定义
// ============================================

export interface LoginInput {
  email: string;
  password: string;
  remember?: boolean;
}

export interface RegisterInput {
  email: string;
  password: string;
  nickname?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResult {
  user: User;
  tokens: TokenPair;
}

// ============================================
// 登录服务
// ============================================

export async function login(input: LoginInput): Promise<AuthResult> {
  // 1. 查找用户
  const user = await (prisma as any).user.findUnique({
    where: { email: input.email },
  });

  if (!user) {
    throw Errors.invalidCredentials();
  }

  // 2. 检查账号状态
  if (user.status === 'SUSPENDED') {
    throw Errors.accountSuspended();
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw Errors.accountLocked(user.lockedUntil);
  }

  // 3. 验证密码
  const isValidPassword = await compare(input.password, user.password);
  
  if (!isValidPassword) {
    // 增加失败次数
    await (prisma as any).user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: { increment: 1 },
      },
    });

    // 检查是否需要锁定
    if (user.failedLoginAttempts + 1 >= 5) {
      await (prisma as any).user.update({
        where: { id: user.id },
        data: {
          lockedUntil: new Date(Date.now() + 30 * 60 * 1000), // 锁定30分钟
        },
      });
      throw Errors.accountLocked(new Date(Date.now() + 30 * 60 * 1000));
    }

    throw Errors.invalidCredentials();
  }

  // 4. 重置失败次数
  await (prisma as any).user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
      loginCount: { increment: 1 },
    },
  });

  // 5. 生成Token
  const tokens = await generateTokens(user, input.remember);

  return { user, tokens };
}

// ============================================
// 注册服务
// ============================================

export async function register(input: RegisterInput): Promise<AuthResult> {
  // 1. 检查邮箱是否已存在
  const existingUser = await (prisma as any).user.findUnique({
    where: { email: input.email },
  });

  if (existingUser) {
    throw Errors.emailAlreadyExists();
  }

  // 2. 密码强度验证
  if (!isStrongPassword(input.password)) {
    throw Errors.invalidPasswordFormat();
  }

  // 3. 哈希密码
  const hashedPassword = await hash(input.password, 12);

  // 4. 创建用户
  const user = await (prisma as any).user.create({
    data: {
      email: input.email,
      password: hashedPassword,
      nickname: input.nickname || input.email.split('@')[0],
      role: 'USER',
      status: 'ACTIVE',
    },
  });

  // 5. 生成Token
  const tokens = await generateTokens(user);

  return { user, tokens };
}

// ============================================
// Token生成
// ============================================

export async function generateTokens(
  user: User,
  remember: boolean = false
): Promise<TokenPair> {
  const now = Math.floor(Date.now() / 1000);

  // 使用统一的JWT工具生成Token
  const accessToken = await jwtGenerateAccess({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  const refreshToken = await jwtGenerateRefresh({
    userId: user.id,
    version: 1,
  });

  // 创建会话记录
  await (prisma as any).userSession.create({
    data: {
      userId: user.id,
      token: generateTokenId(),
      refreshToken,
      expiresAt: new Date((now + ACCESS_TOKEN_EXPIRY) * 1000),
      isActive: true,
    },
  });

  return {
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_EXPIRY,
  };
}

// ============================================
// Token刷新
// ============================================

export async function refreshAccessToken(
  refreshToken: string
): Promise<TokenPair> {
  try {
    // 使用统一的JWT验证
    const payload = await jwtVerifyRefresh(refreshToken);
    if (!payload) {
      throw Errors.refreshTokenExpired();
    }

    const session = await (prisma as any).userSession.findFirst({
      where: {
        refreshToken,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!session) {
      throw Errors.refreshTokenExpired();
    }

    // 吊销旧Token
    await (prisma as any).userSession.update({
      where: { id: session.id },
      data: { isActive: false },
    });

    // 生成新Token
    return generateTokens(session.user);
  } catch (error) {
    if (error instanceof Error && 'code' in error) throw error;
    throw Errors.refreshTokenExpired();
  }
}

// ============================================
// 登出
// ============================================

export async function logout(userId: string, sessionId?: string): Promise<void> {
  if (sessionId) {
    // 吊销指定会话
    await (prisma as any).userSession.updateMany({
      where: {
        userId,
        token: sessionId,
      },
      data: { isActive: false },
    });
  } else {
    // 吊销所有会话
    await (prisma as any).userSession.updateMany({
      where: { userId },
      data: { isActive: false },
    });
  }
}

// ============================================
// 密码工具
// ============================================

function isStrongPassword(password: string): boolean {
  // 最小8位，包含大小写、数字
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password)
  );
}

function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

function generateTokenId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

// ============================================
// 导出
// ============================================

export default {
  login,
  register,
  generateTokens,
  refreshAccessToken,
  logout,
};
