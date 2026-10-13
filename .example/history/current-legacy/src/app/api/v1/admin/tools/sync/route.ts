/**
 * Admin Tool Sync API 路由
 * 提供 Skills / MCP / Agent 同步触发与状态查询
 *
 * GET  /api/v1/admin/tools/sync?entityType=skill  - 获取同步状态
 * POST /api/v1/admin/tools/sync                    - 触发手动同步
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeSkillsSync, executeMCPSync, executeAgentSync } from '@/lib/sync/tool-sync-orchestrator';
import { prisma } from '@/lib/db/prisma';
import type { ToolSyncConfig } from '@/lib/sync/types/tool-sync';
import { withAdmin } from '@/lib/api/middleware/auth';
import { badRequest, errorResponse, getRequestIdFromRequest, successResponse } from '@/lib/api/response';

// 运行中的同步任务追踪
const runningSyncs = new Map<string, { startedAt: Date; entityType: string }>();

/**
 * GET /api/v1/admin/tools/sync
 * 获取同步状态
 */
async function getHandler(request: NextRequest): Promise<NextResponse> {
  const requestId = getRequestIdFromRequest(request);
  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType') || 'skill';
    const view = searchParams.get('view') || 'status';

    if (view === 'status') {
      // 获取各实体最近同步状态
      const modelMap: Record<string, any> = {
        skill: prisma.skill,
        mcp: prisma.mCPServer,
        agent: prisma.agent,
      };

      const model = modelMap[entityType];
      if (!model) {
        return badRequest('不支持的实体类型', requestId, { entityType });
      }

      // 查询同步统计
      const [total, syncedCount, sourceBreakdown, lastSynced] = await Promise.all([
        model.count({ where: { deletedAt: null } }),
        model.count({ where: { source: { not: null }, deletedAt: null } }),
        model.groupBy({ by: ['source'], where: { source: { not: null }, deletedAt: null }, _count: true }),
        model.findFirst({ where: { lastSyncedAt: { not: null }, deletedAt: null }, orderBy: { lastSyncedAt: 'desc' }, select: { lastSyncedAt: true, source: true } }),
      ]);

      const isRunning = runningSyncs.has(entityType);

      return successResponse(
        {
          entityType,
          total,
          syncedCount,
          manualCount: total - syncedCount,
          sourceBreakdown: sourceBreakdown.map((s: any) => ({ source: s.source, count: s._count })),
          lastSyncedAt: lastSynced?.lastSyncedAt || null,
          lastSyncSource: lastSynced?.source || null,
          isRunning,
          runningSince: isRunning ? runningSyncs.get(entityType)?.startedAt : null,
        },
        '获取工具同步状态成功',
        requestId
      );
    }

    if (view === 'sources') {
      // 获取可用数据源列表
      const sourceMap: Record<string, { id: string; name: string; priority: number }[]> = {
        skill: [
          { id: 'skillsmp', name: 'SkillsMP.com', priority: 1 },
          { id: 'smithery', name: 'Smithery.ai', priority: 2 },
          { id: 'skills_sh', name: 'Skills.sh', priority: 3 },
        ],
        mcp: [
          { id: 'smithery', name: 'Smithery.ai', priority: 1 },
          { id: 'glama', name: 'Glama.ai', priority: 2 },
        ],
        agent: [
          { id: 'agentindex', name: 'AgentIndex.dev', priority: 1 },
          { id: 'agents_sh', name: 'Agents.sh', priority: 2 },
        ],
      };

      return successResponse(
        { entityType, sources: sourceMap[entityType] || [] },
        '获取工具同步数据源成功',
        requestId
      );
    }

    return badRequest('无效的 view 参数', requestId, { view });
  } catch (error) {
    console.error('[Admin Tool Sync API] GET error:', error);
    return errorResponse('获取工具同步状态失败', 500, requestId);
  }
}

/**
 * POST /api/v1/admin/tools/sync
 * 触发手动同步
 */
async function postHandler(request: NextRequest): Promise<NextResponse> {
  const requestId = getRequestIdFromRequest(request);
  try {
    const body = await request.json().catch(() => ({}));
    const entityType = body.entityType || 'skill';

    // 检查是否已有同步在运行
    if (runningSyncs.has(entityType)) {
      return errorResponse(
        {
          code: 'A3SR-409',
          message: `${entityType} 同步正在进行中`,
          details: { startedAt: runningSyncs.get(entityType)?.startedAt, entityType },
        },
        409,
        requestId
      );
    }

    const config: ToolSyncConfig = {
      entityType: entityType as 'skill' | 'mcp' | 'agent',
      dryRun: body.dryRun || false,
      sources: body.sources,
      limit: body.limit,
      timeout: body.timeout || 30000,
      retryCount: body.retryCount || 3,
    };

    console.log(`[Admin Tool Sync API] 触发 ${entityType} 同步, config:`, config);

    // 标记为运行中
    runningSyncs.set(entityType, { startedAt: new Date(), entityType });

    // 异步执行同步
    const syncFn = entityType === 'skill' ? executeSkillsSync
      : entityType === 'mcp' ? executeMCPSync
      : executeAgentSync;

    // 在后台执行，不阻塞响应
    const syncPromise = syncFn(config)
      .then(result => {
        console.log(`[Admin Tool Sync API] ${entityType} 同步完成:`, result.success ? '成功' : '失败');
        return result;
      })
      .catch(error => {
        console.error(`[Admin Tool Sync API] ${entityType} 同步异常:`, error);
        return null;
      })
      .finally(() => {
        runningSyncs.delete(entityType);
      });

    // 等待同步完成（同步脚本通常需要几秒到几分钟）
    const result = await syncPromise;

    if (!result) {
      return errorResponse('工具同步执行异常', 500, requestId);
    }

    if (!result.success) {
      return errorResponse(
        {
          code: 'A3SR-500',
          message: `${entityType} 同步部分失败`,
          details: {
            entityType: result.entityType,
            stats: result.stats,
            phases: result.phases.map((p) => ({
              name: p.name,
              status: p.status,
              stats: p.stats,
            })),
            errors: result.errors.slice(0, 10),
          },
        },
        500,
        requestId
      );
    }

    return successResponse(
      {
        entityType: result.entityType,
        stats: result.stats,
        phases: result.phases.map(p => ({
          name: p.name,
          status: p.status,
          stats: p.stats,
        })),
        errors: result.errors.slice(0, 10),
      },
      `${entityType} 同步完成`,
      requestId
    );
  } catch (error) {
    console.error('[Admin Tool Sync API] POST error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return errorResponse(errorMessage, 500, requestId);
  }
}

export const GET = withAdmin(getHandler);
export const POST = withAdmin(postHandler);
