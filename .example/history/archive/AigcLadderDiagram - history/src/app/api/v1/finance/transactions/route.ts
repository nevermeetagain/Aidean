/**
 * GET /api/v1/finance/transactions
 * 获取当前用户交易记录
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
      return error(new AuthenticationError("A3AU-017", "未授权访问"));
    }

    const { searchParams } = new URL(req.url);
    
    // 解析查询参数
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);
    const type = searchParams.get("type"); // 交易类型过滤
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    
    // 构建查询条件
    const where: any = {
      userId: user.userId,
    };
    
    if (type) {
      where.type = parseInt(type, 10);
    }
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }
    
    // 查询交易记录
    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.transaction.count({ where }),
    ]);
    
    return success(transactions, {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
      has_next: page * limit < total,
      has_prev: page > 1,
    });
  } catch (e) {
    console.error("获取交易记录失败:", e);
    return error(new InternalError("A4CM-006", "获取交易记录失败"));
  }
}

export const GET = (req: NextRequest) => withAuth(req, handler);
