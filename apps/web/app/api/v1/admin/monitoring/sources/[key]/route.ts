/**
 * PATCH /api/v1/admin/monitoring/sources/{key} — 启停 / 调整采集节奏。
 *
 * 鉴权：admin.sync.write。契约 AdminMonitoringSourcePatchBody 为 strict 且至少一字段，
 * 仅 enabled、cadenceCron 可改（端点不可从后台改，DESIGN-004 §8 防 SSRF 跳板）。
 * 未知或已软删 key → MONITOR_SOURCE_NOT_FOUND(20004, 404)。
 * 写成功后落 audit_logs(action=2)；lastStatus/lastRunAt 由调度器维护，本端点不触碰。
 */
import { AdminMonitoringSourcePatchBody, MonitoringSourceSchema } from "@aidean/shared";

import { prisma } from "../../../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../../../lib/features/auth/session";
import { writeAudit } from "../../../../_lib/audit";
import { ApiError, ERROR_CODES, formatZodMessage } from "../../../../_lib/errors";
import { withApi, type RouteContext } from "../../../../_lib/handler";
import { SOURCE_SELECT, toSourceDto } from "../../_lib/serialize";

export const dynamic = "force-dynamic";

type Params = { key: string };

export const PATCH = withApi(async (req: Request, ctx: RouteContext<Params>) => {
  const session = await requireAdminApi("admin.sync.write");
  const { key } = await ctx.params;

  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = AdminMonitoringSourcePatchBody.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, formatZodMessage(parsed.error.issues[0]));
  }

  const existing = await prisma.monitoringSource.findFirst({
    where: { key, deletedAt: null },
    select: SOURCE_SELECT,
  });
  if (!existing) {
    throw new ApiError(ERROR_CODES.MONITOR_SOURCE_NOT_FOUND, "监控源不存在或已删除");
  }

  const data: { enabled?: boolean; cadenceCron?: string } = {};
  if (parsed.data.enabled !== undefined) data.enabled = parsed.data.enabled;
  if (parsed.data.cadenceCron !== undefined) data.cadenceCron = parsed.data.cadenceCron;
  const changedFields = Object.keys(data);

  const updated = await prisma.monitoringSource.update({
    where: { id: existing.id },
    data,
    select: SOURCE_SELECT,
  });

  await writeAudit({
    actorId: session.userId,
    tableName: "monitoring_sources",
    recordId: existing.id,
    action: 2,
    changedFields,
    oldData: { enabled: existing.enabled, cadenceCron: existing.cadenceCron },
    newData: data,
    requestId: req.headers.get("x-request-id"),
  });

  return MonitoringSourceSchema.parse(toSourceDto(updated));
});

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../../../_lib/method-not-allowed";
export const { GET, HEAD, POST, PUT, DELETE, OPTIONS } = methodNotAllowed(["PATCH"]);
