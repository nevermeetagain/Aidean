/**
 * 管理员统计API
 * GET /api/v1/admin/stats - 系统统计（管理员）
 */

import { NextRequest } from 'next/server';
import { success } from '@/lib/api/response';
import { withAdmin } from '@/lib/auth/middleware';
import { systemService } from '@/lib/services/system.service';

export async function GET(request: NextRequest) {
  return withAdmin(request, async () => {
    const stats = await systemService.getStats();
    return success(stats);
  });
}
