/**
 * 系统统计API
 * GET /api/v1/system/stats - 系统统计
 */

import { success } from '@/lib/api/response';
import { systemService } from '@/lib/services/system.service';

export const dynamic = 'force-dynamic';

export async function GET() {
  const stats = await systemService.getStats();
  return success(stats);
}

