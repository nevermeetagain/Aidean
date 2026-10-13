/**
 * 系统配置API
 * GET /api/v1/system/config - 获取公开系统配置（平台名、描述等）
 */

import { success } from '@/lib/api/response';
import { systemService } from '@/lib/services/system.service';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const group = searchParams.get('group') || undefined;

  const config = await systemService.getPublicConfig(group);
  return success(config);
}
