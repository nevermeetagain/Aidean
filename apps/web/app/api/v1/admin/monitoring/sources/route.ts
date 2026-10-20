/**
 * GET /api/v1/admin/monitoring/sources — 监控源列表（含健康态）。
 *
 * 鉴权：admin.sync.read（ADMIN 全量 / MODERATOR 域内只读，E9-09 复用既有权限码）。
 * 口径：仅未软删源；按 key 升序稳定输出；lastRunAt 以 ISO 输出（null=从未运行）。
 * 响应经 AdminMonitoringSourceListResponse.parse 收口，契约外字段不落响应。
 */
import { AdminMonitoringSourceListResponse } from "@aidean/shared";

import { prisma } from "../../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../../lib/features/auth/session";
import { withApi } from "../../../_lib/handler";
import { SOURCE_SELECT, toSourceDto } from "../_lib/serialize";

export const dynamic = "force-dynamic";

export const GET = withApi(async () => {
  await requireAdminApi("admin.sync.read");

  const rows = await prisma.monitoringSource.findMany({
    where: { deletedAt: null },
    orderBy: { key: "asc" },
    select: SOURCE_SELECT,
  });

  return AdminMonitoringSourceListResponse.parse({ items: rows.map(toSourceDto) });
});
