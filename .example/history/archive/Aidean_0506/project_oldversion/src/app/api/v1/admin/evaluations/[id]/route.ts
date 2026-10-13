import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { successResponse, errorResponse } from "@/lib/api/response";

// GET /api/v1/admin/evaluations/:id
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const evaluation = await prisma.evaluation.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: { id: true, nickname: true, email: true },
        },
        evaluationModels: {
          include: {
            model: {
              select: { id: true, nameDisplay: true, nameCn: true, slug: true },
            },
          },
        },
      },
    });

    if (!evaluation) {
      return errorResponse("评测不存在", 404);
    }

    return successResponse(evaluation);
  } catch (error) {
    console.error("Error fetching evaluation:", error);
    return errorResponse("获取评测详情失败");
  }
}

// PUT /api/v1/admin/evaluations/:id
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const evaluation = await prisma.evaluation.update({
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
        status: body.status,
        isPaid: body.isPaid,
        cost: body.cost,
      },
    });
    return successResponse(evaluation);
  } catch (error) {
    console.error("Error updating evaluation:", error);
    return errorResponse("更新评测失败");
  }
}

// DELETE /api/v1/admin/evaluations/:id
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
    console.error("Error deleting evaluation:", error);
    return errorResponse("删除评测失败");
  }
}
