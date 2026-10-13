/**
 * 安全头中间件
 * 添加安全相关HTTP响应头
 * 参考: https://owasp.org/www-project-secure-headers/
 */

import { NextRequest, NextResponse } from 'next/server';
import type { MiddlewareContext } from './index';

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https:; connect-src 'self' https:;",
};

const CORS_CONFIG = {
  'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, X-Request-ID',
  'Access-Control-Max-Age': '86400',
};

export async function securityMiddleware(
  request: NextRequest,
  context: MiddlewareContext,
  next: () => Promise<NextResponse>
): Promise<NextResponse> {
  // 处理CORS预检请求
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 204 });
    Object.entries(CORS_CONFIG).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }

  const response = await next();

  // 添加安全头
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // 添加CORS头
  Object.entries(CORS_CONFIG).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}
