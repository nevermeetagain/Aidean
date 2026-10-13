import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { successResponse, errorResponse } from "@/lib/api/response";

// GET /api/v1/admin/scripts
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const keyword = searchParams.get("keyword") || undefined;
    const status = searchParams.get("status") || undefined;

    const where: any = {};
    if (keyword) {
      where.name = { contains: keyword, mode: "insensitive" };
    }
    if (status) where.status = parseInt(status);

    const [items, total] = await Promise.all([
      prisma.scheduledScript.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { executions: true },
          },
        },
      }),
      prisma.scheduledScript.count({ where }),
    ]);

    return successResponse({
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Error fetching scripts:", error);
    return errorResponse("获取脚本列表失败");
  }
}

// POST /api/v1/admin/scripts
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const script = await prisma.scheduledScript.create({
      data: {
        name: body.name,
        scriptPath: body.scriptPath,
        params: body.params || {},
        cronExpression: body.cronExpression,
        status: body.status || 1,
        isActive: body.isActive !== false,
      },
    });
    return successResponse(script);
  } catch (error) {
    console.error("Error creating script:", error);
    return errorResponse("创建脚本失败");
  }
}
