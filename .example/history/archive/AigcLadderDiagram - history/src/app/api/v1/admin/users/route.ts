/**
 * 管理员用户管理API
 * GET /api/v1/admin/users - 获取用户列表（管理员）
 */

import { NextRequest } from 'next/server';
import { success, error } from '@/lib/api/response';
import { withAdmin } from '@/lib/auth/middleware';
import { userRepo } from '@/lib/repositories';

export async function GET(request: NextRequest) {
  return withAdmin(request, async () => {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const keyword = searchParams.get('keyword') || undefined;

    if (keyword) {
      const result = await userRepo.search(keyword, { page, limit });
      return success(result.data, { page: result.page, limit: result.limit, total: result.total, total_pages: result.totalPages });
    }

    const result = await userRepo.findMany({ page, limit, where: { deletedAt: null } });
    return success(result.data, { page: result.page, limit: result.limit, total: result.total, total_pages: result.totalPages });
  });
}
