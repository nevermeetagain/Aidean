/**
 * /api/v1/admin/scripts/[id]/executions — 查看脚本执行历史（R-13 修复）。
 *
 * GET：requireAdminApi → 分页列表 + status 过滤
 */

import { prisma } from '../../../../../../../lib/db/prisma';
import { requireAdminApi } from '../../../../../../../lib/features/auth/session';
import { withApi } from '../../../../_lib/handler';

export const dynamic = 'force-dynamic';

export const GET = withApi(async (req: Request) => {
  await requireAdminApi("admin.scripts.read");

  const url = new URL(req.url);
  const scriptId = url.pathname.split('/').slice(-3, -2)[0];
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
  const pageSize = Math.min(50, Math.max(1, parseInt(url.searchParams.get('pageSize') ?? '20')));
  const status = url.searchParams.get('status');

  const where: Record<string, unknown> = { scriptId };
  if (status !== null && status !== undefined) {
    where.status = parseInt(status);
  }

  const [items, total] = await Promise.all([
    prisma.scriptExecution.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        status: true,
        startedAt: true,
        finishedAt: true,
        durationMs: true,
        output: true,
        errorMsg: true,
      },
    }),
    prisma.scriptExecution.count({ where }),
  ]);

  const serialized = items.map(e => ({
    ...e,
    startedAt: e.startedAt.toISOString(),
    finishedAt: e.finishedAt?.toISOString() ?? null,
    statusLabel: e.status === 0 ? '执行中' : e.status === 1 ? '成功' : '失败',
  }));

  return {
    items: serialized,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
});
