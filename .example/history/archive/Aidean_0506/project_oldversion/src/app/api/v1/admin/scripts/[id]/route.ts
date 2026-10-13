import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { successResponse, errorResponse } from "@/lib/api/response";

// GET /api/v1/admin/scripts/:id
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const script = await prisma.scheduledScript.findUnique({
      where: { id: params.id },
      include: {
        executions: {
          orderBy: { startedAt: "desc" },
          take: 10,
        },
        _count: {
          select: { executions: true },
        },
      },
    });

    if (!script) {
      return errorResponse("脚本不存在", 404);
    }

    return successResponse(script);
  } catch (error) {
    console.error("Error fetching script:", error);
    return errorResponse("获取脚本详情失败");
  }
}

// PUT /api/v1/admin/scripts/:id
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const script = await prisma.scheduledScript.update({
      where: { id: params.id },
      data: {
        name: body.name,
        scriptPath: body.scriptPath,
        params: body.params,
        cronExpression: body.cronExpression,
        status: body.status,
        isActive: body.isActive,
      },
    });
    return successResponse(script);
  } catch (error) {
    console.error("Error updating script:", error);
    return errorResponse("更新脚本失败");
  }
}

// DELETE /api/v1/admin/scripts/:id
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.scheduledScript.delete({
      where: { id: params.id },
    });
    return successResponse({ success: true });
  } catch (error) {
    console.error("Error deleting script:", error);
    return errorResponse("删除脚本失败");
  }
}
