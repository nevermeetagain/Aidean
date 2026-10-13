import { prisma } from "@/lib/db/prisma";
import bcrypt from "bcryptjs";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "@/lib/auth/jwt";

export type AuthUser = {
  id: string;
  email: string;
  nickname: string | null;
  avatar: string | null;
  role: string;
  balance: number;
};

function sanitizeUser(user: any): AuthUser {
  return {
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    avatar: user.avatar,
    role: user.role,
    balance: Number(user.balance),
  };
}

export class AuthError extends Error {
  code: string;
  status: number;
  details?: Record<string, unknown>;

  constructor(code: string, message: string, status: number, details?: Record<string, unknown>) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function authError(code: string, message: string, status: number, details?: Record<string, unknown>): never {
  throw new AuthError(code, message, status, details);
}

export async function register(email: string, password: string, nickname?: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    authError("A3AU-002", "该邮箱已注册", 409);
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      nickname: nickname || email.split("@")[0],
      role: "USER",
      status: "ACTIVE",
      balance: 0,
    },
  });

  const token = generateAccessToken({ userId: user.id, email: user.email, role: user.role });
  const refreshToken = generateRefreshToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    tokenId: `${user.id}:${Date.now()}`,
  });

  return {
    user: sanitizeUser(user),
    token,
    refreshToken,
  };
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    authError("A3AU-001", "邮箱或密码错误", 401);
  }

  if (user.status !== "ACTIVE") {
    authError("A3AU-011", "账号已被禁用", 403);
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    authError("A3AU-001", "邮箱或密码错误", 401);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      lastLoginAt: new Date(),
      loginCount: { increment: 1 },
      failedLoginAttempts: 0,
    },
  });

  const token = generateAccessToken({ userId: user.id, email: user.email, role: user.role });
  const refreshToken = generateRefreshToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    tokenId: `${user.id}:${Date.now()}`,
  });

  return {
    user: sanitizeUser(user),
    token,
    refreshToken,
  };
}

export async function verifyToken(token: string) {
  try {
    const decoded = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, nickname: true, avatar: true, role: true, balance: true, status: true },
    });
    if (!user || user.status !== "ACTIVE") {
      return null;
    }
    return sanitizeUser(user);
  } catch {
    return null;
  }
}

export async function logout() {
  return { success: true };
}

export async function refreshToken(token: string) {
  try {
    const decoded = verifyRefreshToken(token);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, nickname: true, avatar: true, role: true, balance: true, status: true },
    });
    if (!user || user.status !== "ACTIVE") {
      authError("A3AU-013", "Token无效或已过期", 401);
    }
    const accessToken = generateAccessToken({ userId: user.id, email: user.email, role: user.role });
    const refreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      tokenId: `${user.id}:${Date.now()}`,
    });
    return { user: sanitizeUser(user), token: accessToken, refreshToken };
  } catch (error) {
    if (error instanceof AuthError) throw error;
    authError("A3AU-013", "Token无效或已过期", 401);
  }
}
