import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { successResponse, errorResponse } from "@/lib/api/response";

// GET /api/v1/admin/models/versions
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const keyword = searchParams.get("keyword") || undefined;
    const modelId = searchParams.get("modelId") || undefined;
    const status = searchParams.get("status") || undefined;

    const where: any = {};
    if (keyword) {
      where.OR = [
        { versionName: { contains: keyword, mode: "insensitive" } },
        { changeSummary: { contains: keyword, mode: "insensitive" } },
      ];
    }
    if (modelId) where.modelId = modelId;

    const [items, total] = await Promise.all([
      prisma.modelVersion.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          model: {
            select: { id: true, nameDisplay: true, nameCn: true },
          },
        },
      }),
      prisma.modelVersion.count({ where }),
    ]);

    return successResponse({
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Error fetching model versions:", error);
    return errorResponse("获取模型版本列表失败");
  }
}

// POST /api/v1/admin/models/versions
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const version = await prisma.modelVersion.create({
      data: {
        modelId: body.modelId,
        versionName: body.versionName,
        changeSummary: body.changeSummary,
        breakingChanges: body.breakingChanges || false,
        versionSequence: body.versionSequence || 1,
        parentModelId: body.parentModelId,
      },
    });
    return successResponse(version);
  } catch (error) {
    console.error("Error creating model version:", error);
    return errorResponse("创建模型版本失败");
  }
}
