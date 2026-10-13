/**
 * /api/v1/admin/scripts/[id]/trigger — 手动触发单条脚本（L2 语义澄清）。
 *
 * 原集合级 POST /api/v1/admin/scripts 承载「触发」，与 REST「POST 集合=创建」冲突；
 * L2 将集合 POST 改为新建，触发迁到本子资源端点：POST → executeScript(id)。
 * 触发会写 ScriptExecution 并更新 lastRunAt/nextRunAt，故落一条 action=2 审计。
 */
import { prisma } from '../../../../../../../lib/db/prisma';
import { requireAdminApi } from '../../../../../../../lib/features/auth/session';
import { executeScript } from '../../../../../../../lib/features/admin/script-executor';
import { withApi, type RouteContext } from '../../../../_lib/handler';
import { ApiError, ERROR_CODES } from '../../../../_lib/errors';
import { writeAudit } from '../../../../_lib/audit';

export const dynamic = 'force-dynamic';

export const POST = withApi(async (req: Request, ctx: RouteContext<{ id: string }>) => {
  const session = await requireAdminApi("admin.scripts.write");
  const { id } = await ctx.params;

  const script = await prisma.scheduledScript.findFirst({ where: { id, deletedAt: null } });
  if (!script) throw new ApiError(ERROR_CODES.BAD_REQUEST, '脚本不存在');

  const body = (await req.json().catch(() => ({}))) as { params?: Record<string, unknown> };
  const params = body.params ?? (script.params as Record<string, unknown> | null) ?? undefined;
  const result = await executeScript(id, params);

  await writeAudit({
    actorId: session.userId,
    tableName: 'scheduled_scripts',
    recordId: id,
    action: 2,
    changedFields: ['trigger'],
    newData: { triggered: true, executionId: result.executionId, status: result.status },
  });

  return { result };
});
