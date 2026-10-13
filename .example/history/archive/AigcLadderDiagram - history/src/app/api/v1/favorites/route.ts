/**
 * 收藏API路由
 * GET  /api/v1/favorites          - 获取收藏列表
 * POST /api/v1/favorites          - 添加收藏
 * DELETE /api/v1/favorites        - 移除收藏
 */

import { NextRequest } from 'next/server';
import { success, error } from '@/lib/api/response';
import { withAuth } from '@/lib/auth/middleware';
import { favoriteService } from '@/lib/services/favorite.service';
import { Errors } from '@/lib/api/errors';
import { z } from 'zod';

const addFavoriteSchema = z.object({
  refType: z.enum(['MODEL', 'SKILL', 'MCP', 'AGENT', 'API_STATION']),
  refId: z.string().min(1),
  note: z.string().optional(),
});

function getUserId(req: NextRequest): string {
  return (req as any).user.userId;
}

export async function GET(request: NextRequest) {
  return withAuth(request, async (req) => {
    const userId = getUserId(req);
    const { searchParams } = new URL(request.url);
    const refType = searchParams.get('type') as any;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const result = await favoriteService.listFavorites(userId, refType, { page, limit });
    return success(result.data, { page: result.page, limit: result.limit, total: result.total, total_pages: result.totalPages });
  });
}

export async function POST(request: NextRequest) {
  return withAuth(request, async (req) => {
    const userId = getUserId(req);
    const body = await request.json().catch(() => null);
    if (!body) return error(Errors.badRequest());

    const parsed = addFavoriteSchema.safeParse(body);
    if (!parsed.success) return error(Errors.badRequest(parsed.error.issues[0]?.message));

    try {
      const favorite = await favoriteService.addFavorite(
        userId,
        parsed.data.refType,
        parsed.data.refId,
        parsed.data.note
      );
      return success(favorite, undefined, 201);
    } catch (err: any) {
      if (err.code === 'A3AU-007') return error(err);
      throw err;
    }
  });
}

export async function DELETE(request: NextRequest) {
  return withAuth(request, async (req) => {
    const userId = getUserId(req);
    const { searchParams } = new URL(request.url);
    const refType = searchParams.get('type') as any;
    const refId = searchParams.get('refId');

    if (!refType || !refId) return error(Errors.badRequest('缺少type或refId参数'));

    try {
      await favoriteService.removeFavorite(userId, refType, refId);
      return success(null, undefined, 204);
    } catch (err: any) {
      if (err.code === 'A3CM-004') return error(err);
      throw err;
    }
  });
}
