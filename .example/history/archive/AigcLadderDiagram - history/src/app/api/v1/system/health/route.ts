/**
 * 系统健康检查API
 * GET /api/v1/system/health - 健康检查
 */

import { success } from '@/lib/api/response';
import { systemService } from '@/lib/services/system.service';

export async function GET() {
  const health = await systemService.healthCheck();
  return success(health);
}
