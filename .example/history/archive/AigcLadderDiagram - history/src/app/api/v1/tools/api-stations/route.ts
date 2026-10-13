/**
 * API Stations API路由
 * GET /api/v1/tools/api-stations - 获取API Stations列表
 */

import { NextRequest } from 'next/server';
import { success } from '@/lib/api/response';
import { toolService } from '@/lib/services/tool.service';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const category = searchParams.get('category') || undefined;
  const keyword = searchParams.get('keyword') || undefined;
  const featured = searchParams.get('featured') === 'true';

  const result = await toolService.listTools('api_station', { page, limit, category, keyword, featured });
  return success(result.data, { page: result.page, limit: result.limit, total: result.total, total_pages: result.totalPages });
}
