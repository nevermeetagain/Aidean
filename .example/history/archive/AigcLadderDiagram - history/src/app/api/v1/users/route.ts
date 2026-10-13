/**
 * GET /api/v1/users
 * 获取用户列表（仅管理员）
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { success, error } from "@/lib/api/response";
import { InternalError } from "@/lib/api/errors";
import { withAdmin } from "@/lib/auth/middleware";

async function handler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    
    // 解析查询参数
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);
    const role = searchParams.get("role");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    
    // 构建查询条件
    const where: any = {};
    
    if (role) {
      where.role = role;
    }
    
    if (status) {
      where.status = status;
    }
    
    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { nickname: { contains: search, mode: "insensitive" } },
      ];
    }
    
    // 查询用户列表
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          nickname: true,
          role: true,
          status: true,
          balance: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              favorites: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);
    
    return success(users, {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
      has_next: page * limit < total,
      has_prev: page > 1,
    });
  } catch (e) {
    console.error("获取用户列表失败:", e);
    return error(new InternalError("A4CM-004", "获取用户列表失败"));
  }
}

export const GET = (req: NextRequest) => withAdmin(req, handler);
