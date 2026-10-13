import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { errorResponse, getRequestIdFromRequest, successResponse } from "@/lib/api/response";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const requestId = getRequestIdFromRequest(request);
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);

    const model = await prisma.aiModel.findFirst({
      where: {
        OR: [{ id: params.id }, { slug: params.id }, { modelCode: params.id }],
        deletedAt: null,
        visibility: "PUBLIC",
      },
      select: { id: true },
    });

    if (!model) {
      return errorResponse({ code: "A3CM-404", message: "模型不存在" }, 404, requestId);
    }

    const [items, total] = await Promise.all([
      prisma.benchmark.findMany({
        where: { modelId: model.id },
        orderBy: [{ testDate: "desc" }, { createdAt: "desc" }],
        take: limit,
        select: {
          id: true,
          benchmarkType: true,
          benchmarkSubType: true,
          sourceName: true,
          totalScore: true,
          scorePercentile: true,
          testDate: true,
          createdAt: true,
        },
      }),
      prisma.benchmark.count({ where: { modelId: model.id } }),
    ]);

    return successResponse({ items, total }, "获取模型基准测试成功", requestId);
  } catch (error) {
    console.error("[Model Benchmarks API Error]", error);
    return errorResponse("获取模型基准测试失败", 500, requestId);
  }
}
