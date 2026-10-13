export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { successResponse, errorResponse } from "@/lib/api/response";

// GET /api/v1/admin/analytics/usage
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const keyword = searchParams.get("keyword") || undefined;
    const actionType = searchParams.get("actionType") || undefined;
    const resourceType = searchParams.get("resourceType") || undefined;

    const where: any = {};
    if (keyword) {
      where.OR = [
        { action: { contains: keyword, mode: "insensitive" } },
        { description: { contains: keyword, mode: "insensitive" } },
      ];
    }
    if (actionType) where.actionType = actionType;
    if (resourceType) where.resourceType = resourceType;

    const [items, total] = await Promise.all([
      prisma.operationLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.operationLog.count({ where }),
    ]);

    return successResponse({
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Error fetching usage logs:", error);
    return errorResponse("获取使用记录失败");
  }
}
