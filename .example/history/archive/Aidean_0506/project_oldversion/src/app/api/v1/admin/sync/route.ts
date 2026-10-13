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

/**
 * GET /api/v1/admin/sync
 * 获取同步状态、历史记录和活跃批次
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
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
        
        return NextResponse.json({
          success: true,
          data: {
            sync: syncStatus,
            scheduler: schedulerStatus,
            timestamp: new Date().toISOString(),
          },
        });
      }
      
      case 'history': {
        // 获取同步历史
        const limit = parseInt(searchParams.get('limit') || '20', 10);
        const history = getJobHistory(limit);
        
        return NextResponse.json({
          success: true,
          data: {
            history,
            count: history.length,
          },
        });
      }
      
      case 'batches': {
        // 获取最近的批次
        const limit = parseInt(searchParams.get('limit') || '10', 10);
        const batches = await getRecentBatches(limit);
        
        return NextResponse.json({
          success: true,
          data: {
            batches,
            count: batches.length,
          },
        });
      }
      
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid view parameter' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[Admin Sync API] GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get sync status' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/admin/sync
 * 触发手动同步任务
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
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
      return NextResponse.json(
        { 
          success: false, 
          error: 'Another sync is already running',
          data: { currentJob: schedulerStatus.currentJob },
        },
        { status: 409 }
      );
    }
    
    // 触发同步（异步执行，不等待完成）
    // 实际生产环境应该使用任务队列
    const result = await triggerManualSync(config);
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Sync completed successfully',
        data: {
          batchId: result.batchId,
          stats: result.stats,
          phases: result.phases,
          duration: result.stats.duration,
        },
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Sync failed',
          details: result.errors,
          data: {
            batchId: result.batchId,
            stats: result.stats,
          },
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[Admin Sync API] POST error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
