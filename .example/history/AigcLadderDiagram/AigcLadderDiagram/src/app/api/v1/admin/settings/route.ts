import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { successResponse, errorResponse } from "@/lib/api/response";

// GET /api/v1/admin/settings
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const keyword = searchParams.get("keyword") || undefined;
    const category = searchParams.get("category") || undefined;

    const where: any = {};
    if (keyword) {
      where.OR = [
        { configKey: { contains: keyword, mode: "insensitive" } },
        { configValue: { contains: keyword, mode: "insensitive" } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.systemConfig.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { configKey: "asc" },
      }),
      prisma.systemConfig.count({ where }),
    ]);

    return successResponse({
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return errorResponse("获取系统设置列表失败");
  }
}

// POST /api/v1/admin/settings
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const setting = await prisma.systemConfig.create({
      data: {
        configKey: body.name || body.configKey,
        configValue: body.value || body.configValue,
        configGroup: body.category || "GENERAL",
        description: body.description,
        isPublic: body.isPublic ?? false,
        isEditable: body.isEditable ?? true,
      },
    });
    return successResponse(setting);
  } catch (error) {
    console.error("Error creating setting:", error);
    return errorResponse("创建设置失败");
  }
}
