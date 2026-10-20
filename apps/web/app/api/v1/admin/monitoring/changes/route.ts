/**
 * GET /api/v1/admin/monitoring/changes — 目录变更事件分页。
 *
 * 鉴权：admin.sync.read。
 * 过滤：sourceKey（源 key）/ kind / since（ISO datetime，含下界），分页 page≥1、1≤pageSize≤50；
 * 排序：detected_at DESC + id DESC（同毫秒事件分页稳定，避免跨页重复/漏读）。
 * 响应经 AdminMonitoringChangeListResponse.parse 收口；price_changed 才带价格前后值与 deltaPct。
 */
import { AdminMonitoringChangeListResponse, AdminMonitoringChangeQuery, type CatalogChangeEvent } from "@aidean/shared";
import type { Prisma } from "@prisma/client";

import { prisma } from "../../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../../lib/features/auth/session";
import { ApiError, ERROR_CODES, formatZodMessage } from "../../../_lib/errors";
import { withApi } from "../../../_lib/handler";
import { CHANGE_SELECT, toChangeDto } from "../_lib/serialize";

export const dynamic = "force-dynamic";

export const GET = withApi(async (req: Request) => {
  await requireAdminApi("admin.sync.read");

  const url = new URL(req.url);
  const parsed = AdminMonitoringChangeQuery.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, formatZodMessage(parsed.error.issues[0]));
  }
  const { page, pageSize, sourceKey, kind, since } = parsed.data;

  const where: Prisma.CatalogChangeEventWhereInput = {
    ...(sourceKey ? { source: { key: sourceKey } } : {}),
    ...(kind ? { kind } : {}),
    ...(since ? { detectedAt: { gte: new Date(since) } } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.catalogChangeEvent.findMany({
      where,
      orderBy: [{ detectedAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: CHANGE_SELECT,
    }),
    prisma.catalogChangeEvent.count({ where }),
  ]);

  const items: CatalogChangeEvent[] = rows.map(toChangeDto);

  return AdminMonitoringChangeListResponse.parse({
    items,
    total,
    page,
    pageSize,
    totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
  });
});
