/**
 * 系统公告API
 * GET /api/v1/system/announcements - 获取公告列表
 */

import { NextRequest } from 'next/server';
import { success } from '@/lib/api/response';
import { systemService } from '@/lib/services/system.service';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '10');

  const announcements = await systemService.getAnnouncements({ limit });
  return success(announcements);
}
