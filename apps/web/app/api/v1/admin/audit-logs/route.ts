/**
 * /api/v1/admin/audit-logs — 审计日志查询（T-2.3.4）。
 *
 * GET：requireAdminApi → 分页 + tableName/recordId/action/userId 过滤。
 *   仅读侧，不暴露 actorIp/requestId 等敏感字段。
 */

import { prisma } from '../../../../../lib/db/prisma';
import { requireAdminApi } from '../../../../../lib/features/auth/session';
import { withApi } from '../../_lib/handler';

export const dynamic = 'force-dynamic';

export const GET = withApi(async (req: Request) => {
  await requireAdminApi("admin.audit-logs.read");

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize') ?? '20')));
  const tableName = url.searchParams.get('tableName');
  const recordId = url.searchParams.get('recordId');
  const action = url.searchParams.get('action');
  const userId = url.searchParams.get('userId');

  const where: Record<string, unknown> = {};
  if (tableName) where.tableName = tableName;
  if (recordId) where.recordId = recordId;
  if (action) where.action = parseInt(action);
  if (userId) where.userId = userId;

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        tableName: true,
        recordId: true,
        action: true,
        changedFields: true,
        oldData: true,
        newData: true,
        actorId: true,
        createdAt: true,
        // Deliberately exclude: actorIp, requestId (sensitive)
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  // Map action int to label
  const ACTION_LABEL: Record<number, string> = {
    1: 'INSERT',
    2: 'UPDATE',
    3: 'DELETE',
  };

  const serialized = items.map(log => ({
    ...log,
    actionLabel: ACTION_LABEL[log.action] ?? 'UNKNOWN',
    // changedFields is String[] — keep as-is
  }));

  return {
    items: serialized,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
});
