import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { errorResponse, getRequestIdFromRequest, successResponse } from "@/lib/api/response";
import { withAdmin } from "@/lib/api/middleware/auth";

// GET /api/v1/admin/finance - 财务仪表盘
async function getHandler(request: NextRequest) {
  const requestId = getRequestIdFromRequest(request);
  try {
    const [planCount, activePlans, walletStats, transactionStats, recentTransactions] = await Promise.all([
      prisma.subscriptionPlan.count(),
      prisma.subscriptionPlan.count({ where: { isActive: true } }),
      prisma.user.aggregate({
        _count: { id: true },
        _sum: { balance: true },
        where: { balance: { gt: 0 } },
      }),
      prisma.transaction.aggregate({
        _count: { id: true },
        _sum: { amount: true },
      }),
      prisma.transaction.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { id: true, email: true, nickname: true },
          },
        },
      }),
    ]);

    return successResponse({
      stats: {
        totalPlans: planCount,
        activePlans,
        totalWallets: walletStats._count.id,
        totalWalletBalance: walletStats._sum.balance || 0,
        totalTransactionAmount: transactionStats._sum.amount || 0,
        totalTransactionCount: transactionStats._count.id,
      },
      recentTransactions: recentTransactions.map((item) => ({
        id: item.id,
        transactionNo: item.id,
        type: item.type === "CHARGE" ? "CONSUME" : item.type,
        amount: item.amount,
        balanceAfter: item.balance,
        description: item.description,
        createdAt: item.createdAt,
        user: {
          id: item.user.id,
          name: item.user.nickname || item.user.email,
          email: item.user.email,
        },
      })),
    }, "获取财务仪表盘成功", requestId);
  } catch (error) {
    console.error("Error fetching finance dashboard:", error);
    return errorResponse("获取财务仪表盘失败", 500, requestId);
  }
}

async function postHandler(request: NextRequest) {
  const requestId = getRequestIdFromRequest(request);
  try {
    const body = await request.json();
    return successResponse({ id: "1", ...body }, "创建财务记录成功", requestId, 201);
  } catch {
    return errorResponse("创建财务记录失败", 500, requestId);
  }
}

export const GET = withAdmin(getHandler);
export const POST = withAdmin(postHandler);
