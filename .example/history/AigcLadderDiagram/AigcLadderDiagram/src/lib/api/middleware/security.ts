import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function securityHeaders(request: NextRequest) {
  const response = NextResponse.next();
  response.headers.set("X-Frame-Options", "DENY");
  return response;
}

export const securityMiddleware = securityHeaders;
