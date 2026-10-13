/**
 * Aidean API Response Utilities
 * 统一响应格式封装
 */

import { NextResponse } from 'next/server';
import { AideanError, ErrorType } from './errors';

// ============================================
// 响应类型定义
// ============================================

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: ResponseMeta;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    type: ErrorType;
    details?: Record<string, unknown>;
    request_id?: string;
    timestamp: string;
  };
}

export interface ResponseMeta {
  page?: number;
  limit?: number;
  total?: number;
  total_pages?: number;
  has_next?: boolean;
  has_prev?: boolean;
  timestamp?: string;
  request_id?: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// ============================================
// 响应头配置
// ============================================

const defaultHeaders = {
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
};

// ============================================
// 成功响应
// ============================================

export function success<T>(
  data: T,
  meta?: ResponseMeta,
  status: number = 200,
  headers: Record<string, string> = {}
): NextResponse<ApiSuccessResponse<T>> {
  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
    ...(meta && { meta }),
  };

  return NextResponse.json(response, {
    status,
    headers: { ...defaultHeaders, ...headers },
  });
}

export function created<T>(
  data: T,
  location?: string
): NextResponse<ApiSuccessResponse<T>> {
  const headers: Record<string, string> = {};
  if (location) {
    headers['Location'] = location;
  }

  return success(data, undefined, 201, headers);
}

export function noContent(): NextResponse<null> {
  return new NextResponse(null, { status: 204 });
}

// ============================================
// 分页响应
// ============================================

export interface PaginationParams {
  page: number;
  limit: number;
  total: number;
}

export function paginated<T>(
  items: T[],
  params: PaginationParams,
  requestId?: string
): NextResponse<ApiSuccessResponse<T[]>> {
  const { page, limit, total } = params;
  const totalPages = Math.ceil(total / limit);

  const meta: ResponseMeta = {
    page,
    limit,
    total,
    total_pages: totalPages,
    has_next: page < totalPages,
    has_prev: page > 1,
    timestamp: new Date().toISOString(),
    request_id: requestId,
  };

  return success(items, meta);
}

// ============================================
// 错误响应
// ============================================

export function error(
  err: AideanError,
  requestId?: string
): NextResponse<ApiErrorResponse> {
  const errorResponse: ApiErrorResponse = {
    success: false,
    error: {
      code: err.code,
      message: err.message,
      type: err.type,
      ...(err.details && { details: err.details }),
      ...(requestId && { request_id: requestId }),
      timestamp: new Date().toISOString(),
    },
  };

  // 添加限流头
  const headers: Record<string, string> = { ...defaultHeaders };
  if (err.type === ErrorType.RATE_LIMIT) {
    headers['Retry-After'] = String(err.details?.retry_after || 60);
  }

  return NextResponse.json(errorResponse, {
    status: err.statusCode,
    headers,
  });
}

// ============================================
// 快捷错误响应
// ============================================

export function badRequest(
  message: string = '请求参数错误',
  code: string = 'A3CM-001',
  requestId?: string
): NextResponse<ApiErrorResponse> {
  const err = new AideanError(code, message, ErrorType.VALIDATION);
  return error(err, requestId);
}

export function unauthorized(
  message: string = '未授权',
  code: string = 'A3CM-002',
  requestId?: string
): NextResponse<ApiErrorResponse> {
  const err = new AideanError(code, message, ErrorType.AUTHENTICATION);
  return error(err, requestId);
}

export function forbidden(
  message: string = '禁止访问',
  code: string = 'A3CM-003',
  requestId?: string
): NextResponse<ApiErrorResponse> {
  const err = new AideanError(code, message, ErrorType.AUTHORIZATION);
  return error(err, requestId);
}

export function notFound(
  resource: string = '资源',
  code: string = 'A3CM-004',
  requestId?: string
): NextResponse<ApiErrorResponse> {
  const err = new AideanError(code, `${resource}不存在`, ErrorType.NOT_FOUND);
  return error(err, requestId);
}

export function tooManyRequests(
  retryAfter: number = 60,
  code: string = 'A3CM-013',
  requestId?: string
): NextResponse<ApiErrorResponse> {
  const err = new AideanError(
    code,
    '请求过于频繁，请稍后重试',
    ErrorType.RATE_LIMIT,
    { retry_after: retryAfter }
  );
  return error(err, requestId);
}

export function internalError(
  message: string = '服务器内部错误',
  code: string = 'A4CM-001',
  requestId?: string
): NextResponse<ApiErrorResponse> {
  const err = new AideanError(code, message, ErrorType.INTERNAL);
  return error(err, requestId);
}

// ============================================
// 响应工具类
// ============================================

export const apiResponse = {
  success,
  created,
  noContent,
  paginated,
  error,
};

export const apiError = {
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  tooManyRequests,
  internalError,
  error, // 原始error函数
};

// ============================================
// 常用HTTP状态码
// ============================================

export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// ============================================
// 导出默认
// ============================================

export default {
  success,
  created,
  noContent,
  paginated,
  error,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  tooManyRequests,
  internalError,
  HttpStatus,
};
