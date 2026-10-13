import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function rateLimit(request: NextRequest, _userId?: string) {
  return { allowed: true, response: NextResponse.next() };
}

export const rateLimitMiddleware = rateLimit;
