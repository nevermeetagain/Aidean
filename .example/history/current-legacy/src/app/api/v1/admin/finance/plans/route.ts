import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { successResponse, errorResponse } from "@/lib/api/response";

// GET /api/v1/admin/finance/plans
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const keyword = searchParams.get("keyword") || undefined;
    const isActive = searchParams.get("isActive") || undefined;

    const where: any = {};
    if (keyword) {
      where.OR = [
        { name: { contains: keyword, mode: "insensitive" } },
        { code: { contains: keyword, mode: "insensitive" } },
      ];
    }
    if (isActive !== undefined) where.isActive = isActive === "true";

    const [items, total] = await Promise.all([
      prisma.subscriptionPlan.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.subscriptionPlan.count({ where }),
    ]);

    return successResponse({
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Error fetching subscription plans:", error);
    return errorResponse("获取订阅计划列表失败");
  }
}

// POST /api/v1/admin/finance/plans
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const plan = await prisma.subscriptionPlan.create({
      data: {
        name: body.name,
        code: body.code,
        priceMonthly: body.priceMonthly || 0,
        priceYearly: body.priceYearly || 0,
        currency: body.currency || "CNY",
        description: body.description,
        quotas: body.quotas || {},
        features: body.features || [],
        isActive: body.isActive ?? true,
        status: body.status ?? 1,
      },
    });
    return successResponse(plan);
  } catch (error) {
    console.error("Error creating subscription plan:", error);
    return errorResponse("创建订阅计划失败");
  }
}
