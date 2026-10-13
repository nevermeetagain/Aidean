/**
 * /api/v1/admin/scripts/[id] — 单条脚本调度的改写与软删（L2 自定义频率管理闭环）。
 *
 * PATCH ：requireAdminApi → 白名单字段显式映射（name/description/scriptPath/params/
 *         cronExpression/intervalDays/isActive）；频率或启停变更后重算 nextRunAt；
 *         写 AuditLog(action=2)。
 * DELETE：requireAdminApi → 软删（deletedAt=now + isActive=false + nextRunAt=null）；
 *         写 AuditLog(action=3)。
 *
 * 校验真源在 lib/features/admin/script-validation.ts（与新建 route 共用）。
 */
import { Prisma } from '@prisma/client';
import { prisma } from '../../../../../../lib/db/prisma';
import { requireAdminApi } from '../../../../../../lib/features/auth/session';
import { withApi, type RouteContext } from '../../../_lib/handler';
import { ApiError, ERROR_CODES } from '../../../_lib/errors';
import { writeAudit } from '../../../_lib/audit';
import {
  isValidScriptPath,
  validateCron,
  computeNextRunForSchedule,
} from '../../../../../../lib/features/admin/script-validation';

export const dynamic = 'force-dynamic';

export const PATCH = withApi(async (req: Request, ctx: RouteContext<{ id: string }>) => {
  const session = await requireAdminApi("admin.scripts.write");
  const { id } = await ctx.params;

  const existing = await prisma.scheduledScript.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new ApiError(ERROR_CODES.BAD_REQUEST, '脚本不存在');

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) throw new ApiError(ERROR_CODES.BAD_REQUEST, '请求体缺失');

  const data: Prisma.ScheduledScriptUpdateInput = {};
  const changed: string[] = [];

  if (typeof body.name === 'string') {
    const v = body.name.trim();
    if (!v) throw new ApiError(ERROR_CODES.BAD_REQUEST, '名称不能为空');
    data.name = v;
    changed.push('name');
  }
  if (typeof body.description === 'string') {
    data.description = body.description;
    changed.push('description');
  }
  if ('scriptPath' in body) {
    const sp = typeof body.scriptPath === 'string' ? body.scriptPath.trim() : '';
    if (!isValidScriptPath(sp)) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, '脚本路径非法：仅允许 scripts/crawl 或 scripts/ranking 下的 .ts 脚本');
    }
    data.scriptPath = sp;
    changed.push('scriptPath');
  }
  if ('params' in body) {
    if (body.params === null) {
      data.params = Prisma.DbNull;
    } else if (typeof body.params === 'object') {
      data.params = body.params as Prisma.InputJsonValue;
    } else {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, 'params 必须为对象或 null');
    }
    changed.push('params');
  }
  if ('cronExpression' in body) {
    const cron = typeof body.cronExpression === 'string' && body.cronExpression.trim() ? body.cronExpression.trim() : null;
    if (cron) {
      const err = validateCron(cron);
      if (err) throw new ApiError(ERROR_CODES.BAD_REQUEST, err);
    }
    data.cronExpression = cron;
    changed.push('cronExpression');
  }
  if ('intervalDays' in body) {
    const iv = typeof body.intervalDays === 'number' && body.intervalDays > 0 ? Math.floor(body.intervalDays) : null;
    data.intervalDays = iv;
    changed.push('intervalDays');
  }
  if ('isActive' in body) {
    data.isActive = Boolean(body.isActive);
    changed.push('isActive');
  }

  // 频率 / 启停变更后重算 nextRunAt（取未改写字段的现值合并）
  const mergedIntervalDays = ('intervalDays' in data ? data.intervalDays : existing.intervalDays) as number | null;
  const mergedCron = ('cronExpression' in data ? data.cronExpression : existing.cronExpression) as string | null;
  const nextActive = ('isActive' in body ? data.isActive : existing.isActive) as boolean;
  if (changed.some((f) => f === 'cronExpression' || f === 'intervalDays' || f === 'isActive')) {
    data.nextRunAt = nextActive ? computeNextRunForSchedule({ intervalDays: mergedIntervalDays, cronExpression: mergedCron }) : null;
    changed.push('nextRunAt');
  }

  data.updatedBy = session.userId;

  const updated = await prisma.scheduledScript.update({ where: { id }, data });

  await writeAudit({
    actorId: session.userId,
    tableName: 'scheduled_scripts',
    recordId: id,
    action: 2,
    changedFields: changed,
    oldData: {
      cronExpression: existing.cronExpression,
      intervalDays: existing.intervalDays,
      isActive: existing.isActive,
    },
    newData: body,
  });

  return {
    id: updated.id,
    isActive: updated.isActive,
    nextRunAt: updated.nextRunAt?.toISOString() ?? null,
  };
});

export const DELETE = withApi(async (_req: Request, ctx: RouteContext<{ id: string }>) => {
  const session = await requireAdminApi("admin.scripts.write");
  const { id } = await ctx.params;

  const existing = await prisma.scheduledScript.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, name: true },
  });
  if (!existing) throw new ApiError(ERROR_CODES.BAD_REQUEST, '脚本不存在');

  const now = new Date();
  await prisma.scheduledScript.update({
    where: { id },
    data: { deletedAt: now, isActive: false, nextRunAt: null, updatedBy: session.userId },
  });

  await writeAudit({
    actorId: session.userId,
    tableName: 'scheduled_scripts',
    recordId: id,
    action: 3,
    changedFields: ['deletedAt', 'isActive', 'nextRunAt'],
    oldData: { deletedAt: null, isActive: true },
    newData: { deletedAt: now.toISOString(), isActive: false },
  });

  return { success: true };
});
