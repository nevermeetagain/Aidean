import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function authMiddleware(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.next();
}

export function withAdmin(handler: (req: NextRequest) => Promise<NextResponse>) {
  return async (request: NextRequest) => {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return handler(request);
  };
}

export function withAuth(handler: (req: NextRequest) => Promise<NextResponse>) {
  return withAdmin(handler);
}

export function withOptionalAuth(handler: (req: NextRequest) => Promise<NextResponse>) {
  return async (request: NextRequest) => {
    return handler(request);
  };
}

export function withPermission(permission: string) {
  return function(handler: (req: NextRequest) => Promise<NextResponse>) {
    return withAdmin(handler);
  };
}

export function withOwnership(resource: string) {
  return function(handler: (req: NextRequest) => Promise<NextResponse>) {
    return withAdmin(handler);
  };
}

export function withTokenRefresh(handler: (req: NextRequest) => Promise<NextResponse>) {
  return async (request: NextRequest) => {
    return handler(request);
  };
}

export function withPublic(handler: (req: NextRequest) => Promise<NextResponse>) {
  return async (request: NextRequest) => {
    return handler(request);
  };
}

export function extractTokenFromRequest(request: NextRequest): string | null {
  return request.headers.get("authorization")?.replace("Bearer ", "") || null;
}
