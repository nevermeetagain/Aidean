import { NextRequest } from "next/server";
import { AuthError, login } from "@/lib/services/auth.service";
import {
  badRequest,
  errorResponse,
  getRequestIdFromRequest,
  internalError,
  successResponse,
} from "@/lib/api/response";
import { setTokenCookies } from "@/lib/auth/jwt";

export async function POST(request: NextRequest) {
  const requestId = getRequestIdFromRequest(request);
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return badRequest("邮箱和密码不能为空", requestId);
    }

    const result = await login(email, password);
    const response = successResponse(
      { user: result.user, token: result.token, refreshToken: result.refreshToken },
      "登录成功",
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
    return internalError("登录失败", requestId);
  }
}
