/**
 * /api/v1/admin/scripts/[id]/executions — 查看脚本执行历史（R-13 修复）。
 *
 * GET：requireAdminApi → 分页列表 + status 过滤
 *
 * DEF-011-12（运行态实证）：原实现以 `pathname.split('/').slice(-3, -2)[0]` 取 scriptId，
 * 对该路径切出的是字面量 'scripts' 而非 [id] 段（正确下标为 slice(-2, -1)），
 * 导致 where.scriptId 永不命中、执行历史恒返回空列表——即使 ScriptExecution 已有行。
 * 现改用与兄弟路由（[id]、[id]/trigger）一致的 ctx.params，从结构上消除下标偏移这一类错误。
 *
 * 子智能体审查（M1）加固：status 与 page/pageSize 三处 parseInt 统一走有限性守卫，
 * 避免同类缺陷只修一半（非法分页串同样会把 NaN 送进 Prisma 而 500）。
 * 变异检验（已落盘 `.scratch/u3-mutation.txt`：`PATTERN_HIT p1=True p2=True`、`GUARD_CALLS_LEFT=0`、
 * `MUT_TEST_EXIT=1`、`Tests 1 failed | 6 passed (7)`、`AssertionError: expected NaN to be +0`，还原后
 * `RESTORE_SHA … MATCH=True`）：把下两行改回 HEAD 的无守卫写法后，第 7 例必失败，
 * 证明该例真在测被修的表达式（首次尝试 `.scratch/u2-mutation.txt` 只留了 vitest 输出、未写入退出码）。
 */

import { prisma } from '../../../../../../../lib/db/prisma';
import { requireAdminApi } from '../../../../../../../lib/features/auth/session';
import { withApi, type RouteContext } from '../../../../_lib/handler';

export const dynamic = 'force-dynamic';

export const GET = withApi(async (req: Request, ctx: RouteContext<{ id: string }>) => {
  await requireAdminApi("admin.scripts.read");

  const url = new URL(req.url);
  // 路径参数取自 Next 路由段（不再用 pathname 下标切片）；与 prisma.scheduledScript.id 同义
  const scriptId = (await ctx.params).id;
  // 与下方 status 同一口径：非数字串 parseInt → NaN 经 Math.max/min 仍为 NaN，
  // 会直送 Prisma 的 skip/take 触发 500；不可解析即回退默认值
  const toInt = (raw: string | null, fallback: number) => {
    const n = Number.parseInt(raw ?? '', 10);
    return Number.isFinite(n) ? n : fallback;
  };
  const page = Math.max(1, toInt(url.searchParams.get('page'), 1));
  const pageSize = Math.min(50, Math.max(1, toInt(url.searchParams.get('pageSize'), 20)));
  const status = url.searchParams.get('status');

  const where: Record<string, unknown> = { scriptId };
  if (status !== null) {
    // 非法 status 串（如 ?status=abc）parseInt → NaN 会直送 Prisma 触发 500；
    // 不可解析即视为未过滤。注：这是**本端点新口径**，全仓分页/过滤参数此前无同构先例，
    // 多数兄弟列表端点仍会把 NaN 送进 skip/take（DEF-011-15，待裁决 Q-11-05 后统一）
    const parsed = Number.parseInt(status, 10);
    if (Number.isFinite(parsed)) {
      where.status = parsed;
    }
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
