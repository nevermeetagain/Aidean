/**
 * 请求日志中间件
 * 结构化JSON日志，记录请求方法、路径、耗时、状态码
 */

import { NextRequest, NextResponse } from 'next/server';
import type { MiddlewareContext } from './index';

interface RequestLog {
  requestId: string;
  method: string;
  route: string;
  statusCode: number;
  duration: number;
  userId?: string;
  ip?: string;
  userAgent?: string;
  timestamp: string;
}

function formatLogEntry(log: RequestLog): string {
  return JSON.stringify({
    ...log,
    level: log.statusCode >= 500 ? 'error' : log.statusCode >= 400 ? 'warn' : 'info',
    service: 'aidean-api',
  });
}

export async function loggerMiddleware(
  request: NextRequest,
  context: MiddlewareContext,
  next: () => Promise<NextResponse>
): Promise<NextResponse> {
  const response = await next();

  const duration = Date.now() - context.startTime;

  const logEntry: RequestLog = {
    requestId: context.requestId,
    method: context.method,
    route: context.route,
    statusCode: response.status,
    duration,
    userId: context.userId,
    ip: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown',
    timestamp: new Date().toISOString(),
  };

  // 输出结构化日志
  console.log(formatLogEntry(logEntry));

  return response;
}
