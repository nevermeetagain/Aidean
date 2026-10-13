/**
 * Admin Sync API 路由
 * 提供模型数据同步的管理接口
 * 
 * GET  /api/v1/admin/sync - 获取同步状态和历史
 * POST /api/v1/admin/sync - 触发手动同步
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeFullSync, getSyncStatus } from '@/lib/sync/sync-orchestrator';
import { triggerManualSync, getSchedulerStatus, getJobHistory } from '@/lib/sync/scheduler';
import { getRecentBatches } from '@/lib/sync/batch-manager';
import type { SyncConfig } from '@/lib/sync/types/sync';
import { withAdmin } from '@/lib/api/middleware/auth';
import { badRequest, errorResponse, getRequestIdFromRequest, successResponse } from '@/lib/api/response';

/**
 * GET /api/v1/admin/sync
 * 获取同步状态、历史记录和活跃批次
 */
async function getHandler(request: NextRequest): Promise<NextResponse> {
  const requestId = getRequestIdFromRequest(request);
  try {
    const { searchParams } = new URL(request.url);
    
    // 根据查询参数返回不同数据
    const view = searchParams.get('view') || 'status';
    
    switch (view) {
      case 'status': {
        // 获取综合状态
        const [syncStatus, schedulerStatus] = await Promise.all([
          getSyncStatus(),
          Promise.resolve(getSchedulerStatus()), // getSchedulerStatus 是同步的
        ]);
        
        return successResponse(
          {
            sync: syncStatus,
            scheduler: schedulerStatus,
            timestamp: new Date().toISOString(),
          },
          '获取同步状态成功',
          requestId
        );
      }
      
      case 'history': {
        // 获取同步历史
        const limit = parseInt(searchParams.get('limit') || '20', 10);
        const history = getJobHistory(limit);
        
        return successResponse(
          {
            history,
            count: history.length,
          },
          '获取同步历史成功',
          requestId
        );
      }
      
      case 'batches': {
        // 获取最近的批次
        const limit = parseInt(searchParams.get('limit') || '10', 10);
        const batches = await getRecentBatches(limit);
        
        return successResponse(
          {
            batches,
            count: batches.length,
          },
          '获取同步批次成功',
          requestId
        );
      }
      
      default:
        return badRequest('无效的 view 参数', requestId, { view });
    }
  } catch (error) {
    console.error('[Admin Sync API] GET error:', error);
    return errorResponse('获取同步状态失败', 500, requestId);
  }
}

/**
 * POST /api/v1/admin/sync
 * 触发手动同步任务
 */
async function postHandler(request: NextRequest): Promise<NextResponse> {
  const requestId = getRequestIdFromRequest(request);
  try {
    // 解析请求体
    const body = await request.json().catch(() => ({}));
    
    // 构建同步配置
    const config: Partial<SyncConfig> = {
      dryRun: body.dryRun || false,
      sources: body.sources || ['openrouter', 'arena'],
      timeout: body.timeout || 30000,
      retryCount: body.retryCount || 3,
    };
    
    console.log('[Admin Sync API] Manual sync triggered with config:', config);
    
    // 检查是否已有同步在进行中
    const schedulerStatus = getSchedulerStatus();
    if (schedulerStatus.isRunning) {
      return errorResponse(
        {
          code: 'A3SR-409',
          message: '已有同步任务正在执行',
          details: { currentJob: schedulerStatus.currentJob },
        },
        409,
        requestId
      );
    }
    
    // 触发同步（异步执行，不等待完成）
    // 实际生产环境应该使用任务队列
    const result = await triggerManualSync(config);
    
    if (result.success) {
      return successResponse(
        {
          batchId: result.batchId,
          stats: result.stats,
          phases: result.phases,
          duration: result.stats.duration,
        },
        '同步执行成功',
        requestId
      );
    } else {
      return errorResponse(
        {
          code: 'A3SR-500',
          message: '同步执行失败',
          details: {
            errors: result.errors,
            batchId: result.batchId,
            stats: result.stats,
          },
        },
        500,
        requestId
      );
    }
  } catch (error) {
    console.error('[Admin Sync API] POST error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return errorResponse(
      { code: 'A3SR-500', message: errorMessage },
      500,
      requestId
    );
  }
}

export const GET = withAdmin(getHandler);
export const POST = withAdmin(postHandler);
