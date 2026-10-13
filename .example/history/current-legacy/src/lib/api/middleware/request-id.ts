/**
 * Request ID 中间�? * 为每个请求生成唯一ID，用于日志追踪和问题排查
 */

import { NextRequest, NextResponse } from 'next/server';
import type { MiddlewareContext } from './index';

const REQUEST_ID_HEADER = 'X-Request-ID';
const REQUEST_ID_COOKIE = 'aidean_request_id';

export async function requestIdMiddleware(
  request: NextRequest,
  context: MiddlewareContext,
  next: () => Promise<NextResponse>
): Promise<NextResponse> {
  // 优先使用上游传入的Request ID
  const existingId = request.headers.get(REQUEST_ID_HEADER);
  const requestId = existingId || context.requestId;

  context.requestId = requestId;

  const response = await next();

  // 在响应头中返回Request ID
  response.headers.set(REQUEST_ID_HEADER, requestId);

  return response;
}

