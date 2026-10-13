/**
 * Aidean 全局中间件配置
 * Next.js Middleware Chain
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ============================================
// 中间件配置
// ============================================

// 公开访问的路径（不需要认证）
const PUBLIC_PATHS = [
  '/',
  '/api/v1/auth/login',
  '/api/v1/auth/register',
  '/api/v1/auth/forgot-password',
  '/api/v1/auth/reset-password',
  '/api/v1/system/health',
  '/api/v1/models',
  '/api/v1/ladder',
  '/api/v1/tools',
];

// 静态资源路径
const STATIC_PATHS = [
  '/_next/',
  '/images/',
  '/fonts/',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
];

// ============================================
// 中间件主函数
// ============================================

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. 静态资源直接放行
  if (STATIC_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // 2. 公开API路径放行
  if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // 3. 添加安全响应头
  const response = NextResponse.next();
  
  // Security Headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;"
  );

  // 4. 添加请求追踪ID
  const requestId = generateRequestId();
  response.headers.set('X-Request-Id', requestId);

  return response;
}

// ============================================
// 辅助函数
// ============================================

function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

// ============================================
// 配置
// ============================================

export const config = {
  matcher: [
    // 匹配所有路径
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
