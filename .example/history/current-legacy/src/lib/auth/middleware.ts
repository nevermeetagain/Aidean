import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { forbidden, getRequestIdFromRequest, unauthorized } from "@/lib/api/response";
import { getUserPermissions, hasPermission, isAdmin } from "@/lib/auth/rbac";
import { getAccessTokenFromCookie, verifyAccessToken } from "@/lib/auth/jwt";

type RequestHandler = (req: NextRequest) => Promise<NextResponse>;

function extractBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice("Bearer ".length).trim();
}

function getRequestToken(request: NextRequest): string | null {
  return extractBearerToken(request) || getAccessTokenFromCookie(request);
}

function getVerifiedAuth(request: NextRequest) {
  const requestId = getRequestIdFromRequest(request);
  const token = getRequestToken(request);
  if (!token) {
    return { requestId, error: unauthorized("未登录", requestId) };
  }

  try {
    const payload = verifyAccessToken(token);
    return { requestId, payload };
  } catch {
    return { requestId, error: unauthorized("Token无效或已过期", requestId) };
  }
}

export function authMiddleware(request: NextRequest) {
  const result = getVerifiedAuth(request);
  if ("error" in result) {
    return result.error;
  }
  return NextResponse.next();
}

export function withAdmin(handler: RequestHandler) {
  return async (request: NextRequest) => {
    const result = getVerifiedAuth(request);
    if ("error" in result) {
      return result.error;
    }

    if (!isAdmin([result.payload.role])) {
      return forbidden("需要管理员权限", result.requestId);
    }

    return handler(request);
  };
}

export function withAuth(handler: RequestHandler) {
  return async (request: NextRequest) => {
    const result = getVerifiedAuth(request);
    if ("error" in result) {
      return result.error;
    }
    return handler(request);
  };
}

export function withOptionalAuth(handler: RequestHandler) {
  return async (request: NextRequest) => {
    return handler(request);
  };
}

export function withPermission(permission: string) {
  return function(handler: RequestHandler) {
    return async (request: NextRequest) => {
      const result = getVerifiedAuth(request);
      if ("error" in result) {
        return result.error;
      }

      const permissions = getUserPermissions(result.payload.role);
      if (!hasPermission(permissions, permission)) {
        return forbidden(`缺少权限: ${permission}`, result.requestId);
      }

      return handler(request);
    };
  };
}

export function withOwnership(resource: string) {
  return function(handler: RequestHandler) {
    return async (request: NextRequest) => {
      const result = getVerifiedAuth(request);
      if ("error" in result) {
        return result.error;
      }
      return handler(request);
    };
  };
}

export function withTokenRefresh(handler: RequestHandler) {
  return async (request: NextRequest) => {
    return handler(request);
  };
}

export function withPublic(handler: RequestHandler) {
  return async (request: NextRequest) => {
    return handler(request);
  };
}

export function extractTokenFromRequest(request: NextRequest): string | null {
  return getRequestToken(request);
}
