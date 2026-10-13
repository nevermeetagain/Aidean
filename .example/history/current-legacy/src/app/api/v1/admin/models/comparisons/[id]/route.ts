import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { successResponse, errorResponse } from "@/lib/api/response";

// GET /api/v1/admin/models/comparisons/:id
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const comparison = await prisma.evaluation.findUnique({
      where: { id: params.id },
      include: {
        evaluationModels: {
          include: {
            model: {
              select: { id: true, nameDisplay: true, nameCn: true, slug: true },
            },
          },
        },
        user: {
          select: { id: true, nickname: true, email: true },
        },
      },
    });

    if (!comparison) {
      return errorResponse("对比评测记录不存在", 404);
    }

    return successResponse(comparison);
  } catch (error) {
    console.error("Error fetching comparison:", error);
    return errorResponse("获取对比评测详情失败");
  }
}

// PUT /api/v1/admin/models/comparisons/:id
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const comparison = await prisma.evaluation.update({
      where: { id: params.id },
      data: {
        title: body.title,
        description: body.description,
        prompt: body.prompt,
        evalType: body.evalType,
        comparisonMode: body.comparisonMode,
        config: body.config,
        criteria: body.criteria,
        metadata: body.metadata,
        results: body.results,
        winnerModelId: body.winnerModelId,
        status: body.status,
        progress: body.progress,
        isPaid: body.isPaid,
        cost: body.cost,
        errorMsg: body.errorMsg,
      },
    });
    return successResponse(comparison);
  } catch (error) {
    console.error("Error updating comparison:", error);
    return errorResponse("更新对比评测失败");
  }
}

// DELETE /api/v1/admin/models/comparisons/:id
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.evaluation.delete({
      where: { id: params.id },
    });
    return successResponse({ success: true });
  } catch (error) {
    console.error("Error deleting comparison:", error);
    return errorResponse("删除对比评测失败");
  }
}
