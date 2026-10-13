/**
 * GET /api/v1/finance/balance
 * 获取当前用户余额
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { success, error } from "@/lib/api/response";
import { AuthenticationError, InternalError } from "@/lib/api/errors";
import { withAuth } from "@/lib/auth/middleware";
import { UserRoleInfo } from "@/lib/auth/rbac";

async function handler(req: NextRequest) {
  try {
    const user = (req as any).user as UserRoleInfo;
    
    if (!user) {
      return error(new AuthenticationError("A3AU-015", "未授权访问"));
    }

    // 查询用户余额
    const userData = await prisma.user.findUnique({
      where: { id: user.userId },
      select: {
        id: true,
        balance: true,
        _count: {
          select: {
            transactions: {
              where: {
                createdAt: {
                  gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30天内
                },
              },
            },
          },
        },
      },
    });

    if (!userData) {
      return error(new AuthenticationError("A3AU-016", "用户不存在"));
    }

    return success({
      userId: userData.id,
      balance: userData.balance,
      currency: "CNY",
      recentTransactions: userData._count.transactions,
    });
  } catch (e) {
    console.error("获取余额失败:", e);
    return error(new InternalError("A4CM-005", "获取余额失败"));
  }
}

export const GET = (req: NextRequest) => withAuth(req, handler);
