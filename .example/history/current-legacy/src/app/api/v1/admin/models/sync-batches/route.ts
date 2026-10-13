import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { successResponse, errorResponse } from "@/lib/api/response";

// GET /api/v1/admin/models/sync-batches
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const keyword = searchParams.get("keyword") || undefined;
    const status = searchParams.get("status") || undefined;
    const source = searchParams.get("source") || undefined;

    const where: any = {};
    if (keyword) {
      where.OR = [
        { batchCode: { contains: keyword, mode: "insensitive" } },
        { sourceUrl: { contains: keyword, mode: "insensitive" } },
      ];
    }
    if (status) where.status = status;
    if (source) where.source = source;

    const [items, total] = await Promise.all([
      prisma.syncBatch.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { changeLogs: true },
          },
        },
      }),
      prisma.syncBatch.count({ where }),
    ]);

    return successResponse({
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Error fetching sync batches:", error);
    return errorResponse("获取同步批次列表失败");
  }
}

// POST /api/v1/admin/models/sync-batches
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const syncBatch = await prisma.syncBatch.create({
      data: {
        batchCode: body.batchCode || `BATCH-${Date.now()}`,
        source: body.source || "manual",
        sourceUrl: body.sourceUrl,
        totalRecords: body.totalRecords || 0,
        successRecords: body.successRecords || 0,
        failedRecords: body.failedRecords || 0,
        status: body.status || "running",
        validationSummary: body.validationSummary,
        errorSamples: body.errorSamples,
        operatorId: body.operatorId,
        operatorNotes: body.operatorNotes,
      },
    });
    return successResponse(syncBatch);
  } catch (error) {
    console.error("Error creating sync batch:", error);
    return errorResponse("创建同步批次失败");
  }
}
