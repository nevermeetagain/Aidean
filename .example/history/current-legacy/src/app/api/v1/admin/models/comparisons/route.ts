import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { successResponse, errorResponse } from "@/lib/api/response";

// GET /api/v1/admin/models/comparisons
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const keyword = searchParams.get("keyword") || undefined;
    const modelId = searchParams.get("modelId") || undefined;
    const taskType = searchParams.get("taskType") || undefined;

    const where: any = {};
    if (keyword) {
      where.OR = [
        { title: { contains: keyword, mode: "insensitive" } },
        { content: { contains: keyword, mode: "insensitive" } },
      ];
    }
    if (modelId) where.modelId = modelId;
    if (taskType) where.taskType = taskType;

    const [items, total] = await Promise.all([
      prisma.evaluation.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          evaluationModels: {
            include: {
              model: {
                select: { id: true, nameDisplay: true, nameCn: true },
              },
            },
          },
          user: {
            select: { id: true, nickname: true, email: true },
          },
        },
      }),
      prisma.evaluation.count({ where }),
    ]);

    return successResponse({
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Error fetching comparisons:", error);
    return errorResponse("获取对比评测列表失败");
  }
}

// POST /api/v1/admin/models/comparisons
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const comparison = await prisma.evaluation.create({
      data: {
        userId: body.userId,
        title: body.title,
        description: body.description,
        prompt: body.prompt || "",
        evalType: body.evalType || "single",
        comparisonMode: body.comparisonMode,
        config: body.config || {},
        criteria: body.criteria || {},
        metadata: body.metadata,
        winnerModelId: body.winnerModelId,
        status: body.status || 0,
        progress: body.progress || 0,
        isPaid: body.isPaid || false,
        cost: body.cost || 0,
      },
    });
    return successResponse(comparison);
  } catch (error) {
    console.error("Error creating comparison:", error);
    return errorResponse("创建对比评测失败");
  }
}
