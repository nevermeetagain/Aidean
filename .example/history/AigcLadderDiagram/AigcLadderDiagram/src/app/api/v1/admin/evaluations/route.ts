import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { successResponse, errorResponse } from "@/lib/api/response";

// GET /api/v1/admin/evaluations
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const keyword = searchParams.get("keyword") || undefined;
    const modelId = searchParams.get("modelId") || undefined;
    const taskType = searchParams.get("taskType") || undefined;
    const userId = searchParams.get("userId") || undefined;

    const where: any = {};
    if (keyword) {
      where.OR = [
        { title: { contains: keyword, mode: "insensitive" } },
        { description: { contains: keyword, mode: "insensitive" } },
      ];
    }
    if (taskType) where.evalType = taskType;
    if (userId) where.userId = userId;

    const [items, total] = await Promise.all([
      prisma.evaluation.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { id: true, nickname: true, email: true },
          },
          evaluationModels: {
            include: {
              model: {
                select: { id: true, nameDisplay: true, nameCn: true },
              },
            },
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
    console.error("Error fetching evaluations:", error);
    return errorResponse("获取评测列表失败");
  }
}

// POST /api/v1/admin/evaluations
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const evaluation = await prisma.evaluation.create({
      data: {
        userId: body.userId,
        title: body.title,
        description: body.description,
        prompt: body.prompt,
        evalType: body.taskType || "single",
        comparisonMode: body.comparisonMode,
        config: body.config || {},
        criteria: body.criteria || {},
        metadata: body.metadata,
        status: body.status || 0,
        isPaid: body.isPaid || false,
        cost: body.cost || 0,
      },
    });
    return successResponse(evaluation);
  } catch (error) {
    console.error("Error creating evaluation:", error);
    return errorResponse("创建评测失败");
  }
}
