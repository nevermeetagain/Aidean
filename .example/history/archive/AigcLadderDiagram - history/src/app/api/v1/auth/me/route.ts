/**
 * GET /api/v1/auth/me
 * 获取当前登录用户信息
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { success, error } from "@/lib/api/response";
import { AuthenticationError } from "@/lib/api/errors";
import { withAuth } from "@/lib/auth/middleware";
import { UserRoleInfo } from "@/lib/auth/rbac";

async function handler(req: NextRequest) {
  try {
    const user = (req as any).user as UserRoleInfo;
    
    if (!user) {
      return error(new AuthenticationError("A3AU-006", "未授权访问"));
    }

    // 查询完整用户信息
    const userData = await prisma.user.findUnique({
      where: { id: user.userId },
      select: {
        id: true,
        email: true,
        nickname: true,
        avatar: true,
        role: true,
        status: true,
        balance: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    if (!userData) {
      return error(new AuthenticationError("A3AU-007", "用户不存在"));
    }

    // 返回用户信息和权限
    return success({
      user: {
        id: userData.id,
        email: userData.email,
        nickname: userData.nickname,
        avatar: userData.avatar,
        role: userData.role,
        status: userData.status,
        balance: userData.balance,
        emailVerified: userData.emailVerified,
        createdAt: userData.createdAt,
      },
      permissions: user.permissions,
      isAdmin: user.isAdmin,
    });
  } catch (e) {
    console.error("获取用户信息失败:", e);
    return error(new AuthenticationError("A3AU-008", "获取用户信息失败"));
  }
}

export const GET = (req: NextRequest) => withAuth(req, handler);
