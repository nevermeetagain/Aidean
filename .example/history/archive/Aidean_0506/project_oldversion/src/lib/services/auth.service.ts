import { prisma } from "@/lib/db/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "aidean-dev-secret-key-2026";
const JWT_EXPIRES_IN = "7d";

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

function signToken(payload: { userId: string; email: string; role: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export async function register(email: string, password: string, nickname?: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error("该邮箱已注册");
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

  const token = signToken({ userId: user.id, email: user.email, role: user.role });

  return {
    user: sanitizeUser(user),
    token,
  };
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error("邮箱或密码错误");
  }

  if (user.status !== "ACTIVE") {
    throw new Error("账号已被禁用");
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    throw new Error("邮箱或密码错误");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      lastLoginAt: new Date(),
      loginCount: { increment: 1 },
      failedLoginAttempts: 0,
    },
  });

  const token = signToken({ userId: user.id, email: user.email, role: user.role });

  return {
    user: sanitizeUser(user),
    token,
  };
}

export async function verifyToken(token: string) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string; role: string };
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
  const user = await verifyToken(token);
  if (!user) {
    throw new Error("Token无效或已过期");
  }
  const newToken = signToken({ userId: user.id, email: user.email, role: user.role });
  return { user, token: newToken };
}
