/**
 * 中间件编排器
 * 统一管理API请求的中间件执行顺序
 * 执行顺序: requestId → security → rateLimit → auth → logger → handler
 */

import { NextRequest, NextResponse } from 'next/server';
import { requestIdMiddleware } from './request-id';
import { securityMiddleware } from './security';
import { rateLimitMiddleware } from './rate-limit';
import { loggerMiddleware } from './logger';

export interface MiddlewareContext {
  requestId: string;
  startTime: number;
  userId?: string;
  route: string;
  method: string;
}

type MiddlewareFn = (
  request: NextRequest,
  context: MiddlewareContext,
  next: () => Promise<NextResponse>
) => Promise<NextResponse>;

/**
 * 创建中间件链
 */
export function composeMiddleware(
  ...middlewares: MiddlewareFn[]
): (request: NextRequest, context: MiddlewareContext) => Promise<NextResponse> {
  return async (request, context) => {
    let index = 0;

    const next = async (): Promise<NextResponse> => {
      if (index >= middlewares.length) {
        return NextResponse.json({ success: false, error: { code: 'MIDDLEWARE_CHAIN_END' } }, { status: 500 });
      }
      const middleware = middlewares[index++];
      return middleware(request, context, next);
    };

    return next();
  };
}

/**
 * 公开路由中间件链（无需认证）
 * requestId → security → rateLimit → logger
 */
export const publicMiddlewareChain = composeMiddleware(
  requestIdMiddleware,
  securityMiddleware,
  async (request, context, next) => {
    const result = await rateLimitMiddleware(request);
    if (!result.allowed) return result.response;
    return next();
  },
  loggerMiddleware,
);

/**
 * 认证路由中间件链（需要认证）
 * requestId → security → rateLimit → auth → logger
 */
export const authMiddlewareChain = composeMiddleware(
  requestIdMiddleware,
  securityMiddleware,
  async (request, context, next) => {
    const result = await rateLimitMiddleware(request, context.userId);
    if (!result.allowed) return result.response;
    return next();
  },
  loggerMiddleware,
);

/**
 * 创建中间件上下文
 */
export function createMiddlewareContext(request: NextRequest): MiddlewareContext {
  return {
    requestId: crypto.randomUUID(),
    startTime: Date.now(),
    route: new URL(request.url).pathname,
    method: request.method,
  };
}

export { requestIdMiddleware } from './request-id';
export { securityMiddleware } from './security';
export { rateLimitMiddleware } from './rate-limit';
export { loggerMiddleware } from './logger';
