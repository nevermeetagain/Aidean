import { NextRequest, NextResponse } from "next/server";

// ==================== 后端响应工具 ====================

export interface ResponseMeta {
  requestId: string;
  timestamp: string;
}

export interface ErrorBody {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

function createMeta(requestId?: string): ResponseMeta {
  return {
    requestId: requestId || crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
}

export function getRequestIdFromRequest(request?: NextRequest | Request | null): string | undefined {
  return request?.headers?.get("x-request-id") || undefined;
}

export function successResponse(data: unknown, message = "Success", requestId?: string, status = 200) {
  return NextResponse.json(
    { success: true, data, message, meta: createMeta(requestId) },
    { status }
  );
}

export function errorResponse(
  error: string | ErrorBody,
  status = 500,
  requestId?: string
) {
  const normalized: ErrorBody =
    typeof error === "string"
      ? { code: `HTTP_${status}`, message: error }
      : error;

  return NextResponse.json(
    {
      success: false,
      error: normalized,
      meta: createMeta(requestId),
    },
    { status }
  );
}

export function apiResponse(data: unknown, message = "Success", requestId?: string) {
  return successResponse(data, message, requestId);
}

export function paginated<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
  requestId?: string
) {
  return successResponse(
    {
      items,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    },
    "Success",
    requestId
  );
}

export function created(data: unknown, requestId?: string) {
  return successResponse(data, "Created", requestId, 201);
}

export function badRequest(message: string, requestId?: string, details?: Record<string, unknown>) {
  return errorResponse({ code: "A3CM-012", message, details }, 400, requestId);
}

export function unauthorized(message = "未授权访问", requestId?: string) {
  return errorResponse({ code: "A3AU-401", message }, 401, requestId);
}

export function forbidden(message = "无权限访问", requestId?: string) {
  return errorResponse({ code: "A3AU-403", message }, 403, requestId);
}

export function notFound(resource: string, requestId?: string) {
  return errorResponse({ code: "A3CM-404", message: `${resource} not found` }, 404, requestId);
}

export function internalError(message = "服务异常", requestId?: string, details?: Record<string, unknown>) {
  return errorResponse({ code: "A3SR-500", message, details }, 500, requestId);
}

export const success = successResponse;
export const error = errorResponse;

// ==================== 前端响应类型 ====================

// 标准 API 响应结构
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
  meta?: ResponseMeta;
}

// 分页响应结构
export interface PaginatedData<T> {
  items: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<PaginatedData<T>> {
  data: PaginatedData<T>;
}

// 错误响应结构
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: ResponseMeta;
}

// ==================== 前端响应解析工具 ====================

/**
 * 解析标准 API 响应
 */
export function parseResponse<T>(response: unknown): ApiResponse<T> {
  if (!isApiResponse(response)) {
    throw new Error("Invalid API response format");
  }
  return response as ApiResponse<T>;
}

/**
 * 解析分页响应
 */
export function parsePaginatedResponse<T>(response: unknown): PaginatedData<T> {
  const parsed = parseResponse<PaginatedData<T>>(response);
  if (!parsed.data.items || !parsed.data.pagination) {
    throw new Error("Invalid paginated response format");
  }
  return parsed.data;
}

/**
 * 类型守卫：检查是否为 API 响应
 */
export function isApiResponse(response: unknown): response is ApiResponse {
  return (
    typeof response === "object" &&
    response !== null &&
    "success" in response &&
    typeof (response as ApiResponse).success === "boolean"
  );
}

/**
 * 类型守卫：检查是否为成功响应
 */
export function isSuccessResponse<T>(
  response: unknown
): response is ApiResponse<T> {
  return isApiResponse(response) && (response as ApiResponse).success === true;
}

/**
 * 类型守卫：检查是否为错误响应
 */
export function isErrorResponse(
  response: unknown
): response is ApiErrorResponse {
  return (
    isApiResponse(response) &&
    response.success === false &&
    "error" in response
  );
}

/**
 * 提取响应数据（自动处理分页和非分页）
 */
export function extractData<T>(response: unknown): T {
  if (isSuccessResponse<T>(response)) {
    return response.data;
  }
  throw new Error("Cannot extract data from error response");
}

/**
 * 提取错误信息
 */
export function extractError(response: unknown): {
  code: string;
  message: string;
} {
  if (isErrorResponse(response)) {
    return {
      code: response.error.code || "UNKNOWN_ERROR",
      message: response.error.message || "未知错误",
    };
  }

  // 处理旧格式错误
  if (
    typeof response === "object" &&
    response !== null &&
    "message" in response
  ) {
    return {
      code: "ERROR",
      message: (response as { message: string }).message,
    };
  }

  return { code: "UNKNOWN_ERROR", message: "未知错误" };
}

// ==================== 常用解析快捷函数 ====================

/**
 * 解析列表数据（支持分页和非分页）
 */
export function parseListResponse<T>(response: unknown): {
  items: T[];
  pagination?: PaginatedData<T>["pagination"];
} {
  const data = extractData<{
    items?: T[];
    pagination?: PaginatedData<T>["pagination"];
  }>(response);

  return {
    items: data.items || [],
    pagination: data.pagination,
  };
}

/**
 * 解析单个实体
 */
export function parseEntityResponse<T>(response: unknown): T {
  return extractData<T>(response);
}
