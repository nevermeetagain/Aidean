/**
 * PATCH /api/v1/admin/feature-flags/[id] — 编辑功能开关（TASK-016 / API-004）。
 *
 * requireAdminApi("admin.configs.write") + AdminFeatureFlagPatchSchema（strict + 至少一字段）。
 * 仅改 isEnabled/description；记录不存在 → 40000；非法体（未知键/空对象）→ 40000；
 * 成功后 revalidateTag("feature-flags")（先失效，使新态即时对 PUBLIC 端点与受控路由守卫可见，
 * 不被审计可用性牵连）→ writeAudit(action=2, tableName=feature_flags)。
 * 幂等（契约）：同值 PATCH 仍执行 update + 失效 + 写审计，返回当前投影结果。
 */
import { revalidateTag } from "next/cache";

import { prisma } from "../../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../../lib/features/auth/session";
import { ApiError, ERROR_CODES, formatZodMessage } from "../../../_lib/errors";
import { withApi, type RouteContext } from "../../../_lib/handler";
import { writeAudit } from "../../../_lib/audit";
import { AdminFeatureFlagPatchSchema } from "@aidean/shared";

export const dynamic = "force-dynamic";

const ADMIN_SELECT = {
  id: true,
  flagCode: true,
  name: true,
  nameCn: true,
  description: true,
  isEnabled: true,
  category: true,
  priority: true,
  updatedAt: true,
};

export const PATCH = withApi(async (req: Request, ctx: RouteContext<{ id: string }>) => {
  const session = await requireAdminApi("admin.configs.write");
  const { id } = await ctx.params;

  const before = await prisma.featureFlag.findUnique({ where: { id }, select: ADMIN_SELECT });
  if (!before) throw new ApiError(ERROR_CODES.BAD_REQUEST, "功能开关不存在");

  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = AdminFeatureFlagPatchSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, formatZodMessage(parsed.error.issues[0]));
  }
  const d = parsed.data;

  const updated = await prisma.featureFlag.update({
    where: { id },
    data: {
      ...(d.isEnabled !== undefined ? { isEnabled: d.isEnabled } : {}),
      ...(d.description !== undefined ? { description: d.description } : {}),
    },
    select: ADMIN_SELECT,
  });

  // 即时失效开关缓存（tag 见 service.ts unstable_cache / contracts 05-events CACHE_TAGS）；先于审计。
  revalidateTag("feature-flags");

  await writeAudit({
    actorId: session.userId,
    tableName: "feature_flags",
    recordId: id,
    action: 2,
    changedFields: Object.keys(d),
    oldData: { isEnabled: before.isEnabled, description: before.description },
    newData: { isEnabled: updated.isEnabled, description: updated.description },
    requestId: req.headers.get("x-request-id"),
  });

  return { ...updated, updatedAt: updated.updatedAt.toISOString() };
});
