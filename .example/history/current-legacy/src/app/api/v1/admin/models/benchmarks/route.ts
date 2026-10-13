import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { successResponse, errorResponse } from "@/lib/api/response";

// GET /api/v1/admin/models/benchmarks
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const keyword = searchParams.get("keyword") || undefined;
    const modelId = searchParams.get("modelId") || undefined;
    const benchmarkType = searchParams.get("benchmarkType") || undefined;

    const where: any = {};
    if (keyword) {
      where.OR = [
        { benchmarkType: { contains: keyword, mode: "insensitive" } },
        { sourceName: { contains: keyword, mode: "insensitive" } },
      ];
    }
    if (modelId) where.modelId = modelId;
    if (benchmarkType) where.benchmarkType = benchmarkType;

    const [items, total] = await Promise.all([
      prisma.benchmark.findMany({
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
      prisma.benchmark.count({ where }),
    ]);

    return successResponse({
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Error fetching benchmarks:", error);
    return errorResponse("获取基准测试列表失败");
  }
}

// POST /api/v1/admin/models/benchmarks
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const benchmark = await prisma.benchmark.create({
      data: {
        modelId: body.modelId,
        sourceType: body.sourceType || "OFFICIAL",
        sourceName: body.sourceName,
        sourceUrl: body.sourceUrl,
        benchmarkType: body.benchmarkType,
        benchmarkSubType: body.benchmarkSubType,
        scores: body.scores || {},
        totalScore: body.totalScore || 0,
        scorePercentile: body.scorePercentile,
        testDate: body.testDate ? new Date(body.testDate) : null,
        testParams: body.testParams,
        rawData: body.rawData,
        confidenceLevel: body.confidenceLevel,
        sampleCount: body.sampleCount,
        weight: body.weight || 0.25,
        isWeighted: body.isWeighted || false,
        verifiedStatus: body.verifiedStatus || 0,
      },
    });
    return successResponse(benchmark);
  } catch (error) {
    console.error("Error creating benchmark:", error);
    return errorResponse("创建基准测试失败");
  }
}
