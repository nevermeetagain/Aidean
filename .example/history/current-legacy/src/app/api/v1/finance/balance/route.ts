import { NextRequest } from "next/server";
import { errorResponse, getRequestIdFromRequest, successResponse, unauthorized } from "@/lib/api/response";
import { withAuth, extractTokenFromRequest } from "@/lib/api/middleware/auth";
import { verifyToken } from "@/lib/services/auth.service";

async function getHandler(request: NextRequest) {
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

    return successResponse(
      { balance: user.balance, currency: "CNY" },
      "获取余额成功",
      requestId
    );
  } catch (error) {
    return errorResponse("获取余额失败", 500, requestId);
  }
}

export const GET = withAuth(getHandler);
