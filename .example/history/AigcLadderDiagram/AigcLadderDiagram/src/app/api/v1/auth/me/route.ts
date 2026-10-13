import { NextRequest } from "next/server";
import { withAuth, extractTokenFromRequest } from "@/lib/auth/middleware";
import { getRequestIdFromRequest, successResponse, unauthorized } from "@/lib/api/response";
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

    return successResponse({ user }, "获取当前用户成功", requestId);
  } catch {
    return unauthorized("认证失败", requestId);
  }
}

export const GET = withAuth(getHandler);
