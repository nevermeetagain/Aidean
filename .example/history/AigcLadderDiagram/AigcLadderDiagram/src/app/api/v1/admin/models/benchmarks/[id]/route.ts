import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { successResponse, errorResponse } from "@/lib/api/response";

// GET /api/v1/admin/models/benchmarks/:id
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const benchmark = await prisma.benchmark.findUnique({
      where: { id: params.id },
      include: {
        model: {
          select: { id: true, nameDisplay: true, nameCn: true, slug: true },
        },
      },
    });

    if (!benchmark) {
      return errorResponse("基准测试记录不存在", 404);
    }

    return successResponse(benchmark);
  } catch (error) {
    console.error("Error fetching benchmark:", error);
    return errorResponse("获取基准测试详情失败");
  }
}

// PUT /api/v1/admin/models/benchmarks/:id
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const benchmark = await prisma.benchmark.update({
      where: { id: params.id },
      data: {
        modelId: body.modelId,
        sourceType: body.sourceType,
        sourceName: body.sourceName,
        sourceUrl: body.sourceUrl,
        benchmarkType: body.benchmarkType,
        benchmarkSubType: body.benchmarkSubType,
        scores: body.scores,
        totalScore: body.totalScore,
        scorePercentile: body.scorePercentile,
        testDate: body.testDate ? new Date(body.testDate) : undefined,
        testParams: body.testParams,
        rawData: body.rawData,
        confidenceLevel: body.confidenceLevel,
        sampleCount: body.sampleCount,
        weight: body.weight,
        isWeighted: body.isWeighted,
        verifiedStatus: body.verifiedStatus,
      },
    });
    return successResponse(benchmark);
  } catch (error) {
    console.error("Error updating benchmark:", error);
    return errorResponse("更新基准测试失败");
  }
}

// DELETE /api/v1/admin/models/benchmarks/:id
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.benchmark.delete({
      where: { id: params.id },
    });
    return successResponse({ success: true });
  } catch (error) {
    console.error("Error deleting benchmark:", error);
    return errorResponse("删除基准测试失败");
  }
}
