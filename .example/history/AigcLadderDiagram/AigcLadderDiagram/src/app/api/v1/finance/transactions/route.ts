import { NextRequest } from "next/server";
import type { TransactionType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { badRequest, errorResponse, getRequestIdFromRequest, successResponse, unauthorized } from "@/lib/api/response";
import { withAuth, extractTokenFromRequest } from "@/lib/api/middleware/auth";
import { getTransactions } from "@/lib/services/finance.service";
import { verifyToken } from "@/lib/services/auth.service";

async function getHandler(request: NextRequest) {
  const requestId = getRequestIdFromRequest(request);
  try {
    const { searchParams } = new URL(request.url);
    const token = extractTokenFromRequest(request);
    if (!token) {
      return unauthorized("未登录", requestId);
    }

    const user = await verifyToken(token);
    if (!user) {
      return unauthorized("Token无效或已过期", requestId);
    }

    const params = {
      page: parseInt(searchParams.get("page") || "1"),
      limit: parseInt(searchParams.get("limit") || "20"),
      type: searchParams.get("type") || undefined,
      userId: user.id,
    };

    const result = await getTransactions(params);
    return successResponse(result, "获取交易记录成功", requestId);
  } catch (error) {
    return errorResponse("获取交易记录失败", 500, requestId);
  }
}

async function postHandler(request: NextRequest) {
  const requestId = getRequestIdFromRequest(request);
  try {
    const token = extractTokenFromRequest(request);
    if (!token) {
      return unauthorized("未登录", requestId);
    }

    const user = await verifyToken(token);
    if (!user) {
      return unauthorized("Token无效或已过期", requestId);
    }

    const body = await request.json();
    const { type, amount, description, refType, refId } = body as {
      type?: string;
      amount?: number;
      description?: string;
      refType?: string;
      refId?: string;
    };

    if (!type || typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
      return badRequest("缺少必要参数或金额非法", requestId);
    }

    if (!["RECHARGE", "CHARGE", "REFUND"].includes(type)) {
      return badRequest("不支持的交易类型", requestId);
    }

    const transactionType = type as TransactionType;

    const result = await prisma.$transaction(async (tx) => {
      const currentUser = await tx.user.findUnique({
        where: { id: user.id },
        select: { id: true, balance: true },
      });

      if (!currentUser) {
        throw new Error("USER_NOT_FOUND");
      }

      const signedAmount = transactionType === "CHARGE" ? -Math.abs(amount) : Math.abs(amount);
      const currentBalance = Number(currentUser.balance);
      const nextBalance = currentBalance + signedAmount;

      if (nextBalance < 0) {
        throw new Error("INSUFFICIENT_BALANCE");
      }

      await tx.user.update({
        where: { id: currentUser.id },
        data: { balance: nextBalance },
      });

      const transaction = await tx.transaction.create({
        data: {
          userId: currentUser.id,
          type: transactionType,
          amount: signedAmount,
          balance: nextBalance,
          description: description || `${transactionType} transaction`,
          refType,
          refId,
        },
      });

      if (transactionType === "RECHARGE") {
        await tx.rechargeOrder.create({
          data: {
            userId: currentUser.id,
            amount: Math.abs(amount),
            bonusAmount: 0,
            totalAmount: Math.abs(amount),
            payMethod: "ALIPAY",
            status: "PAID",
            transactionId: transaction.id,
            paidAt: new Date(),
          },
        });
      }

      return {
        id: transaction.id,
        type: transactionType,
        amount: Math.abs(amount),
        balanceAfter: nextBalance,
        description: transaction.description,
        createdAt: transaction.createdAt,
      };
    });

    return successResponse(result, "交易创建成功", requestId, 201);
  } catch (error: any) {
    if (error instanceof SyntaxError) {
      return badRequest("请求体格式错误", requestId);
    }
    if (error?.message === "USER_NOT_FOUND") {
      return unauthorized("用户不存在", requestId);
    }
    if (error?.message === "INSUFFICIENT_BALANCE") {
      return errorResponse({ code: "A3FI-001", message: "余额不足" }, 400, requestId);
    }
    return errorResponse("创建交易失败", 500, requestId);
  }
}

export const GET = withAuth(getHandler);
export const POST = withAuth(postHandler);
