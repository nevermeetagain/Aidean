import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 管理员路径匹配
const ADMIN_PATH_PATTERN = /^\/admin(\/.*)?$/;

// 公开的管理员路径（不需要登录）
const PUBLIC_ADMIN_PATHS = ["/admin/login"];

// JWT Token 解码（不验证签名，仅获取 payload）
function decodeToken(token: string): { role?: string; exp?: number } | null {
  try {
    const base64Payload = token.split(".")[1];
    if (!base64Payload) return null;

    const payload = JSON.parse(
      Buffer.from(base64Payload, "base64").toString("utf-8")
    );
    return payload;
  } catch {
    return null;
  }
}

// 检查是否是管理员角色
function isAdminRole(role?: string): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. 管理员路由保护
  if (ADMIN_PATH_PATTERN.test(pathname)) {
    // 公开路径放行
    if (PUBLIC_ADMIN_PATHS.includes(pathname)) {
      return NextResponse.next();
    }

    // 检查 Token
    const token = request.cookies.get("token")?.value;

    // 未登录，重定向到登录页
    if (!token) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // 解析 Token 检查角色
    const payload = decodeToken(token);

    // Token 无效或过期
    if (!payload) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("error", "invalid_token");
      return NextResponse.redirect(loginUrl);
    }

    // 检查过期
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("error", "token_expired");
      return NextResponse.redirect(loginUrl);
    }

    // 检查管理员权限
    if (!isAdminRole(payload.role)) {
      // 无权限，重定向到 403 页面
      const forbiddenUrl = new URL("/admin/403", request.url);
      return NextResponse.redirect(forbiddenUrl);
    }

    // 检查通过，添加角色信息到请求头（供后续使用）
    const response = NextResponse.next();
    response.headers.set("x-user-role", payload.role || "");
    return response;
  }

  // 2. 非管理员路由正常放行
  return NextResponse.next();
}

export const config = {
  matcher: [
    // 管理员路由
    "/admin/:path*",
    // 排除静态资源
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:css|js|png|jpg|jpeg|gif|svg|ico)).*)",
  ],
};
