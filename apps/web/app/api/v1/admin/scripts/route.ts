/**
 * /api/v1/admin/scripts — ScheduledScript 列表 + 新建（L2 自定义频率管理闭环）。
 *
 * GET  ：requireAdminApi → 分页列表（deletedAt 过滤）+ isActive 过滤
 * POST ：requireAdminApi → 新建脚本调度（校验 name / scriptPath 白名单 / cron），
 *        按频率计算 nextRunAt 落库 → 写 AuditLog(tableName="scheduled_scripts", action=1)。
 *
 * 触发已迁至 POST /api/v1/admin/scripts/[id]/trigger（REST 语义澄清：集合 POST=创建）。
 * 改写/软删见 /api/v1/admin/scripts/[id]。
 */

import { Prisma } from '@prisma/client';
import { prisma } from '../../../../../lib/db/prisma';
import { requireAdminApi } from '../../../../../lib/features/auth/session';
import { withApi } from '../../_lib/handler';
import { ApiError, ERROR_CODES } from '../../_lib/errors';
import { writeAudit } from '../../_lib/audit';
import {
  isValidScriptPath,
  validateCron,
  computeNextRunForSchedule,
} from '../../../../../lib/features/admin/script-validation';

export const dynamic = 'force-dynamic';

export const GET = withApi(async (req: Request) => {
  await requireAdminApi("admin.scripts.read");

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize') ?? '20')));
  const isActive = url.searchParams.get('isActive');

  const where: Record<string, unknown> = { deletedAt: null };
  if (isActive !== null) {
    where.isActive = isActive === 'true';
  }

  const [items, total] = await Promise.all([
    prisma.scheduledScript.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        _count: { select: { executions: true } },
      },
    }),
    prisma.scheduledScript.count({ where }),
  ]);

  const serialized = items.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    scriptPath: s.scriptPath,
    params: s.params ?? null,
    cronExpression: s.cronExpression,
    intervalDays: s.intervalDays,
    intervalCount: s.intervalCount,
    lastRunAt: s.lastRunAt?.toISOString() ?? null,
    nextRunAt: s.nextRunAt?.toISOString() ?? null,
    status: s.status,
    isActive: s.isActive,
    executionCount: s._count.executions,
    createdAt: s.createdAt.toISOString(),
  }));

  return {
    items: serialized,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
});

export const POST = withApi(async (req: Request) => {
  const session = await requireAdminApi("admin.scripts.write");

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) throw new ApiError(ERROR_CODES.BAD_REQUEST, '请求体缺失');

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) throw new ApiError(ERROR_CODES.BAD_REQUEST, '名称必填');

  const scriptPath = typeof body.scriptPath === 'string' ? body.scriptPath.trim() : '';
  if (!scriptPath) throw new ApiError(ERROR_CODES.BAD_REQUEST, '脚本路径必填');
  if (!isValidScriptPath(scriptPath)) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, '脚本路径非法：仅允许 scripts/crawl 或 scripts/ranking 下的 .ts 脚本');
  }

  const cronExpression =
    typeof body.cronExpression === 'string' && body.cronExpression.trim() ? body.cronExpression.trim() : null;
  const intervalDays =
    typeof body.intervalDays === 'number' && body.intervalDays > 0 ? Math.floor(body.intervalDays) : null;

  if (cronExpression) {
    const err = validateCron(cronExpression);
    if (err) throw new ApiError(ERROR_CODES.BAD_REQUEST, err);
  }
  if (!cronExpression && !intervalDays) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, '至少设置 cron 表达式或间隔天数之一');
  }

  const description = typeof body.description === 'string' ? body.description : null;
  const params = body.params && typeof body.params === 'object' ? (body.params as object) : null;
  const isActive = body.isActive === undefined ? true : Boolean(body.isActive);

  const nextRunAt = isActive ? computeNextRunForSchedule({ intervalDays, cronExpression }) : null;

  const created = await prisma.scheduledScript.create({
    data: {
      name,
      scriptPath,
      description,
      cronExpression,
      intervalDays,
      isActive,
      nextRunAt,
      createdBy: session.userId,
      ...(params ? { params: params as Prisma.InputJsonValue } : {}),
    },
  });

  await writeAudit({
    actorId: session.userId,
    tableName: 'scheduled_scripts',
    recordId: created.id,
    action: 1,
    changedFields: ['name', 'scriptPath', 'cronExpression', 'intervalDays', 'isActive'],
    newData: { name, scriptPath, cronExpression, intervalDays, isActive },
  });

  return { id: created.id, nextRunAt: created.nextRunAt?.toISOString() ?? null };
});
