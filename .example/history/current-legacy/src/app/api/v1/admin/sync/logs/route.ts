/**
 * Admin Sync Logs API 路由
 * 提供同步变更日志查询接口
 * 
 * GET /api/v1/admin/sync/logs - 获取同步日志列表
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRecentChanges, getChangeTypeDistribution } from '@/lib/sync/change-recorder';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/admin/sync/logs
 * 获取同步变更日志
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    
    // 查询参数
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const changeType = searchParams.get('changeType') || undefined;
    const modelId = searchParams.get('modelId') || undefined;
    
    // 获取变更日志
    const changes = await getRecentChanges(limit, {
      modelId,
      changeType: changeType || undefined,
    });
    
    // 获取统计信息
    const distribution = getChangeTypeDistribution();
    
    return NextResponse.json({
      success: true,
      data: {
        changes,
        stats: {
          total: changes.length,
          distribution,
        },
        query: {
          limit,
          changeType,
          modelId,
        },
      },
    });
  } catch (error) {
    console.error('[Admin Sync Logs API] GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get sync logs' },
      { status: 500 }
    );
  }
}
