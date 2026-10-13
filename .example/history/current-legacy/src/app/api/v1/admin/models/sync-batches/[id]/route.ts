import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { successResponse, errorResponse } from "@/lib/api/response";

// GET /api/v1/admin/models/sync-batches/:id
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const syncBatch = await prisma.syncBatch.findUnique({
      where: { id: params.id },
      include: {
        changeLogs: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    });

    if (!syncBatch) {
      return errorResponse("同步批次不存在", 404);
    }

    return successResponse(syncBatch);
  } catch (error) {
    console.error("Error fetching sync batch:", error);
    return errorResponse("获取同步批次详情失败");
  }
}

// PUT /api/v1/admin/models/sync-batches/:id
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const syncBatch = await prisma.syncBatch.update({
      where: { id: params.id },
      data: {
        source: body.source,
        sourceUrl: body.sourceUrl,
        totalRecords: body.totalRecords,
        successRecords: body.successRecords,
        failedRecords: body.failedRecords,
        status: body.status,
        validationSummary: body.validationSummary,
        errorSamples: body.errorSamples,
        operatorNotes: body.operatorNotes,
      },
    });
    return successResponse(syncBatch);
  } catch (error) {
    console.error("Error updating sync batch:", error);
    return errorResponse("更新同步批次失败");
  }
}

// DELETE /api/v1/admin/models/sync-batches/:id
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.syncBatch.delete({
      where: { id: params.id },
    });
    return successResponse({ success: true });
  } catch (error) {
    console.error("Error deleting sync batch:", error);
    return errorResponse("删除同步批次失败");
  }
}
