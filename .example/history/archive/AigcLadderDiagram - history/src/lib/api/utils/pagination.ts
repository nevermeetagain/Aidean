/**
 * 分页工具
 * 统一处理API分页参数解析和响应格式
 */

import { NextRequest } from 'next/server';

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * 从请求中解析分页参数
 */
export function parsePagination(request: NextRequest): PaginationParams {
  const { searchParams } = new URL(request.url);

  const page = Math.max(1, parseInt(searchParams.get('page') || String(DEFAULT_PAGE), 10));
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT), 10))
  );
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * 生成分页元数据
 */
export function createPaginationMeta(
  total: number,
  params: PaginationParams
): PaginationMeta {
  const { page, limit } = params;
  return {
    page,
    limit,
    total,
    total_pages: Math.ceil(total / limit),
    has_next: page * limit < total,
    has_prev: page > 1,
  };
}
