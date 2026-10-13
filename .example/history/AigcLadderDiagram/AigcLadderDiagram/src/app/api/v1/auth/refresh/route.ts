import { NextRequest } from "next/server";
import { AuthError, refreshToken } from "@/lib/services/auth.service";
import {
  errorResponse,
  getRequestIdFromRequest,
  successResponse,
  unauthorized,
} from "@/lib/api/response";
import { getRefreshTokenFromCookie, setTokenCookies } from "@/lib/auth/jwt";

export async function POST(request: NextRequest) {
  const requestId = getRequestIdFromRequest(request);
  try {
    const authHeader = request.headers.get("authorization");
    const body = await request.json().catch(() => ({}));
    const headerToken = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
    const token = body?.refreshToken || headerToken || getRefreshTokenFromCookie(request);
    if (!token) {
      return unauthorized("缺少Refresh Token", requestId);
    }

    const result = await refreshToken(token);
    const response = successResponse(
      { user: result.user, token: result.token, refreshToken: result.refreshToken },
      "刷新成功",
      requestId
    );
    setTokenCookies(response, result.token, result.refreshToken);
    return response;
  } catch (error) {
    if (error instanceof AuthError) {
      return errorResponse(
        { code: error.code, message: error.message, details: error.details },
        error.status,
        requestId
      );
    }
    return unauthorized("Refresh Token无效或已过期", requestId);
  }
}
