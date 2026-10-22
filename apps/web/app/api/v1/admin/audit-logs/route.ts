/**
 * /api/v1/admin/audit-logs — 审计日志查询（T-2.3.4）。
 *
 * GET：requireAdminApi → 分页 + tableName/recordId/action/userId 过滤。
 *   仅读侧，不暴露 actorIp/requestId 等敏感字段。
 */

import { prisma } from '../../../../../lib/db/prisma';
import { requireAdminApi } from '../../../../../lib/features/auth/session';
import { parseIntParam, parseOptionalInt, parsePagination } from '../../../../../lib/http/pagination';
import { ApiError, ERROR_CODES } from '../../_lib/errors';
import { withApi } from '../../_lib/handler';

export const dynamic = 'force-dynamic';

export const GET = withApi(async (req: Request) => {
  await requireAdminApi("admin.audit-logs.read");

  const url = new URL(req.url);
  // B11-11（Q-11-05=A / DEF-011-15）：分页与 action 过滤统一走 lib/http/pagination.ts。
  // 非法整数串（如 ?page=abc）显式 400，不再静默回退、更不把 NaN 送进 Prisma skip/take/where；
  // 空串视同缺省（兼容表单清空）；合法值仍由 parsePagination 钳制到既有区间。
  const pageRaw = url.searchParams.get('page');
  if (pageRaw !== null && pageRaw !== '' && Number.isNaN(parseIntParam(pageRaw, Number.NaN))) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, '参数 page 必须为整数');
  }
  const pageSizeRaw = url.searchParams.get('pageSize');
  if (pageSizeRaw !== null && pageSizeRaw !== '' && Number.isNaN(parseIntParam(pageSizeRaw, Number.NaN))) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, '参数 pageSize 必须为整数');
  }
  const { page, pageSize, skip, take } = parsePagination(url, { defaultPageSize: 20, maxPageSize: 100 });
  const tableName = url.searchParams.get('tableName');
  const recordId = url.searchParams.get('recordId');
  const action = url.searchParams.get('action');
  const userId = url.searchParams.get('userId');

  const where: Record<string, unknown> = {};
  if (tableName) where.tableName = tableName;
  if (recordId) where.recordId = recordId;
  if (action) {
    const parsedAction = parseOptionalInt(url, 'action');
    if (parsedAction === undefined) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, '参数 action 必须为整数');
    }
    where.action = parsedAction;
  }
  if (userId) where.userId = userId;

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
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

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../_lib/method-not-allowed";
export const { POST, PUT, PATCH, DELETE, OPTIONS } = methodNotAllowed(["GET"]);
