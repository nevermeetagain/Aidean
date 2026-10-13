import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { successResponse, errorResponse } from "@/lib/api/response";

// GET /api/v1/admin/ladder
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const keyword = searchParams.get("keyword") || undefined;
    const chartType = searchParams.get("chartType") || undefined;
    const isDefault = searchParams.get("isDefault") || undefined;

    const where: any = {};
    if (keyword) {
      where.OR = [
        { name: { contains: keyword, mode: "insensitive" } },
        { description: { contains: keyword, mode: "insensitive" } },
      ];
    }
    if (chartType) where.chartType = chartType;
    if (isDefault !== undefined) where.isDefault = isDefault === "true";

    const [items, total] = await Promise.all([
      prisma.ladderChart.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { rankings: true },
          },
        },
      }),
      prisma.ladderChart.count({ where }),
    ]);

    return successResponse({
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Error fetching ladder charts:", error);
    return errorResponse("获取天梯图列表失败");
  }
}

// POST /api/v1/admin/ladder
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const chart = await prisma.ladderChart.create({
      data: {
        name: body.name,
        description: body.description,
        chartCode: body.chartCode || `chart_${Date.now()}`,
        chartType: body.chartType || "comparison",
      },
    });
    return successResponse(chart);
  } catch (error) {
    console.error("Error creating ladder chart:", error);
    return errorResponse("创建天梯图失败");
  }
}
