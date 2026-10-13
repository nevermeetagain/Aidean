import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { successResponse, errorResponse } from "@/lib/api/response";

// GET /api/v1/admin/finance - 财务仪表盘
export async function GET() {
  try {
    const [planCount, activePlans] = await Promise.all([
      prisma.subscriptionPlan.count(),
      prisma.subscriptionPlan.count({ where: { isActive: true } }),
    ]);

    return successResponse({
      stats: {
        totalPlans: planCount,
        activePlans,
        totalWallets: 0,
        totalTransactionAmount: 0,
        totalTransactionCount: 0,
      },
      recentTransactions: [],
    });
  } catch (error) {
    console.error("Error fetching finance dashboard:", error);
    return errorResponse("获取财务仪表盘失败");
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  return NextResponse.json({ id: "1", ...body });
}
