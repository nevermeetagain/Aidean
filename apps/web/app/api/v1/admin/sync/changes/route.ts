/**
 * /api/v1/admin/sync/changes — ModelChangeLog 列表查询（R-11 修复）。
 *
 * GET：requireAdminApi → 分页 + changeType/syncBatchId/modelId/isReverted 过滤。
 *   返回变更记录列表，含 model.modelCode 便于展示。
 *   这是 sync/changes/[id]/revert 的前置依赖——管理员需要先列表才能拿到 id 做回滚。
 */

import { prisma } from '../../../../../../lib/db/prisma';
import { requireAdminApi } from '../../../../../../lib/features/auth/session';
import { parseIntParam, parsePagination } from '../../../../../../lib/http/pagination';
import { ApiError, ERROR_CODES } from '../../../_lib/errors';
import { withApi } from '../../../_lib/handler';

export const dynamic = 'force-dynamic';

export const GET = withApi(async (req: Request) => {
  await requireAdminApi("admin.sync.read");

  const url = new URL(req.url);
  // B11-11（Q-11-05=A / DEF-011-15）：非法整数串显式 400（不再 500，也不静默回退）；
  // 空串视同缺省；合法值仍由 parsePagination 钳制到既有区间。
  for (const key of ['page', 'pageSize'] as const) {
    const raw = url.searchParams.get(key);
    if (raw !== null && raw !== '' && Number.isNaN(parseIntParam(raw, Number.NaN))) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, `参数 ${key} 必须为整数`);
    }
  }
  const { page, pageSize, skip, take } = parsePagination(url, { defaultPageSize: 20, maxPageSize: 100 });
  const changeType = url.searchParams.get('changeType');
  const syncBatchId = url.searchParams.get('syncBatchId');
  const modelId = url.searchParams.get('modelId');
  const isReverted = url.searchParams.get('isReverted');

  const where: Record<string, unknown> = {};
  if (changeType) where.changeType = changeType;
  if (syncBatchId) where.syncBatchId = syncBatchId;
  if (modelId) where.modelId = modelId;
  if (isReverted !== null && isReverted !== undefined) {
    where.isReverted = isReverted === 'true';
  }

  const [items, total] = await Promise.all([
    prisma.modelChangeLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: {
        model: {
          select: { id: true, modelCode: true, nameDisplay: true },
        },
      },
    }),
    prisma.modelChangeLog.count({ where }),
  ]);

  const serialized = items.map(log => ({
    id: log.id,
    modelId: log.modelId,
    modelCode: log.model?.modelCode ?? null,
    modelName: log.model?.nameDisplay ?? null,
    syncBatchId: log.syncBatchId,
    changeType: log.changeType,
    changedFields: log.changedFields,
    source: log.source,
    operatorId: log.operatorId,
    isReverted: log.isReverted,
    revertedAt: log.revertedAt?.toISOString() ?? null,
    revertReason: log.revertReason,
    checksum: log.checksum,
    validationStatus: log.validationStatus,
    createdAt: log.createdAt.toISOString(),
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
import { methodNotAllowed } from "../../../_lib/method-not-allowed";
export const { POST, PUT, PATCH, DELETE, OPTIONS } = methodNotAllowed(["GET"]);
