import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { successResponse, errorResponse } from "@/lib/api/response";

// GET /api/v1/admin/models/versions/:id
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const version = await prisma.modelVersion.findUnique({
      where: { id: params.id },
      include: {
        model: {
          select: { id: true, nameDisplay: true, nameCn: true, slug: true },
        },
      },
    });

    if (!version) {
      return errorResponse("模型版本不存在", 404);
    }

    return successResponse(version);
  } catch (error) {
    console.error("Error fetching model version:", error);
    return errorResponse("获取模型版本详情失败");
  }
}

// PUT /api/v1/admin/models/versions/:id
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const version = await prisma.modelVersion.update({
      where: { id: params.id },
      data: {
        versionName: body.versionName,
        changeSummary: body.changeSummary,
        breakingChanges: body.breakingChanges,
        versionSequence: body.versionSequence,
        parentModelId: body.parentModelId,
      },
    });
    return successResponse(version);
  } catch (error) {
    console.error("Error updating model version:", error);
    return errorResponse("更新模型版本失败");
  }
}

// DELETE /api/v1/admin/models/versions/:id
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.modelVersion.delete({
      where: { id: params.id },
    });
    return successResponse({ success: true });
  } catch (error) {
    console.error("Error deleting model version:", error);
    return errorResponse("删除模型版本失败");
  }
}
