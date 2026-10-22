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
 * B11-11（Q-11-05=A）：原内联 `toInt()` 已提升为共享件 `lib/http/pagination.ts`（parsePagination /
 * parseOptionalInt），本端点为全站接入的参考实现。P0 收尾（B11-11 待裁定第 1 项）：非法
 * `page`/`pageSize`/`status` 统一→400/40000（不再静默回退 200），与其余 15 个列表端点同口径。
 * 以下为 M1 加固时的历史记录（语义未变）：
 * 子智能体审查（M1）加固：status 与 page/pageSize 三处 parseInt 统一走有限性守卫，
 * 避免同类缺陷只修一半（非法分页串同样会把 NaN 送进 Prisma 而 500）。
 * 变异检验（已落盘 `.scratch/u3-mutation.txt`：`PATTERN_HIT p1=True p2=True`、`GUARD_CALLS_LEFT=0`、
 * `MUT_TEST_EXIT=1`、`Tests 1 failed | 6 passed (7)`、`AssertionError: expected NaN to be +0`，还原后
 * `RESTORE_SHA … MATCH=True`）：把下两行改回 HEAD 的无守卫写法后，第 7 例必失败，
 * 证明该例真在测被修的表达式（首次尝试 `.scratch/u2-mutation.txt` 只留了 vitest 输出、未写入退出码）。
 */

import { prisma } from '../../../../../../../lib/db/prisma';
import { requireAdminApi } from '../../../../../../../lib/features/auth/session';
import { parseIntParam, parseOptionalInt, parsePagination } from '../../../../../../../lib/http/pagination';
import { ApiError, ERROR_CODES } from '../../../../_lib/errors';
import { withApi, type RouteContext } from '../../../../_lib/handler';

export const dynamic = 'force-dynamic';

export const GET = withApi(async (req: Request, ctx: RouteContext<{ id: string }>) => {
  await requireAdminApi("admin.scripts.read");

  const url = new URL(req.url);
  // 路径参数取自 Next 路由段（不再用 pathname 下标切片）；与 prisma.scheduledScript.id 同义
  const scriptId = (await ctx.params).id;
  // B11-11 P0（Q-11-05=A）：与其余 15 个列表端点同口径——非法整数串显式 400（不再静默回退 200），
  // 空串视同缺省；合法值仍由 parsePagination 钳制到既有区间。
  for (const key of ["page", "pageSize"] as const) {
    const raw = url.searchParams.get(key);
    if (raw !== null && raw !== "" && Number.isNaN(parseIntParam(raw, Number.NaN))) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, `参数 ${key} 必须为整数`);
    }
  }
  const { page, pageSize, skip, take } = parsePagination(url, { defaultPageSize: 20, maxPageSize: 50 });
  const where: Record<string, unknown> = { scriptId };
  // 非法 status 串（如 ?status=abc）同样显式 400，绝不把 NaN 送进 where（不得触达 Prisma）
  const statusRaw = url.searchParams.get("status");
  if (statusRaw !== null && statusRaw !== "" && Number.isNaN(parseIntParam(statusRaw, Number.NaN))) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, "参数 status 必须为整数");
  }
  const status = parseOptionalInt(url, 'status');
  if (status !== undefined) {
    where.status = status;
  }

  const [items, total] = await Promise.all([
    prisma.scriptExecution.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      skip,
      take,
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

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../../../_lib/method-not-allowed";
export const { POST, PUT, PATCH, DELETE, OPTIONS } = methodNotAllowed(["GET"]);
