/**
 * GET /api/v1/ladder
 * 获取天梯图数据（公开API，支持缓存）
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { success, error } from "@/lib/api/response";
import { InternalError } from "@/lib/api/errors";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    
    // 解析查询参数
    const type = searchParams.get("type") || "professional"; // professional | application
    const category = searchParams.get("category") || "all";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);
    
    // 获取排名数据
    const rankings = await prisma.ladderRanking.findMany({
      include: {
        model: {
          select: {
            id: true,
            nameDisplay: true,
            slug: true,
            modelType: true,
            isOpenSource: true,
          },
        },
      },
      orderBy: {
        rankPosition: "asc",
      },
      skip: (page - 1) * limit,
      take: limit,
    });
    
    // 获取总数
    const total = await prisma.ladderRanking.count();
    
    // 格式化响应数据
    const data = rankings.map((ranking: any) => ({
      rank: ranking.rankPosition,
      model: {
        id: ranking.model?.id,
        name: ranking.model?.nameDisplay,
        slug: ranking.model?.slug,
        type: ranking.model?.modelType,
        isOpenSource: ranking.model?.isOpenSource,
      },
      score: ranking.compositeScore,
      change: ranking.rankChange,
    }));
    
    return success(data, {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
      has_next: page * limit < total,
      has_prev: page > 1,
    });
  } catch (e) {
    console.error("获取天梯图数据失败:", e);
    return error(new InternalError("A4CM-002", "获取天梯图数据失败"));
  }
}

// 缓存配置：1小时
export const revalidate = 3600;
