/**
 * /api/v1/admin/users/[id]/credentials/revoke — 吊销用户凭据（S4.2 / M5）。
 *
 * auth: requireAdminApi("admin.users.write")（缺权限 → 403）。
 * body: { kind:"apiKey"|"stationKey"|"channel", id:string, reason:string }
 * 状态机（幂等护栏）：凭据须属于目标用户 [id]；不存在/非本人 → 400；已停用 → 409 CREDENTIAL_NOT_REVOCABLE；
 *   活跃 → isActive=false（非物理删除，保留审计痕迹）+ AuditLog(action=2 UPDATE, op=admin.credential.revoke)。
 * 契约见 spec §4①/②。
 */
import { z } from "zod";

import { prisma } from "../../../../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../../../../lib/features/auth/session";
import { ApiError, ERROR_CODES, formatZodMessage } from "../../../../../_lib/errors";
import { withApi, type RouteContext } from "../../../../../_lib/handler";
import { writeAudit } from "../../../../../_lib/audit";

export const dynamic = "force-dynamic";

const RevokeBodySchema = z.object({
  kind: z.enum(["apiKey", "stationKey", "channel"]),
  id: z.string().min(1),
  reason: z.string().min(1).max(200),
});

const TABLE_BY_KIND: Record<z.infer<typeof RevokeBodySchema>["kind"], string> = {
  apiKey: "api_keys",
  stationKey: "station_user_keys",
  channel: "custom_channels",
};

export const POST = withApi(async (req: Request, ctx: RouteContext<{ id: string }>) => {
  const session = await requireAdminApi("admin.users.write");
  const { id: userId } = await ctx.params;

  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = RevokeBodySchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, formatZodMessage(parsed.error.issues[0]));
  }
  const { kind, id: credId, reason } = parsed.data;

  // 归属校验：凭据必须属于目标用户（防跨用户误吊销）。
  const where = { id: credId, userId };
  let isActive: boolean | null;
  if (kind === "apiKey") {
    const row = await prisma.apiKey.findFirst({ where, select: { isActive: true } });
    isActive = row?.isActive ?? null;
  } else if (kind === "stationKey") {
    const row = await prisma.stationUserKey.findFirst({ where, select: { isActive: true } });
    isActive = row?.isActive ?? null;
  } else {
    const row = await prisma.customChannel.findFirst({ where, select: { isActive: true } });
    isActive = row?.isActive ?? null;
  }

  if (isActive === null) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, "凭据不存在或不属于该用户");
  }
  if (isActive === false) {
    throw new ApiError(ERROR_CODES.CREDENTIAL_NOT_REVOCABLE, "该凭据已吊销/停用，无需重复操作");
  }

  if (kind === "apiKey") {
    await prisma.apiKey.updateMany({ where, data: { isActive: false } });
  } else if (kind === "stationKey") {
    await prisma.stationUserKey.updateMany({ where, data: { isActive: false } });
  } else {
    await prisma.customChannel.updateMany({ where, data: { isActive: false } });
  }

  await writeAudit({
    actorId: session.userId,
    tableName: TABLE_BY_KIND[kind],
    recordId: credId,
    action: 2,
    changedFields: ["isActive"],
    oldData: { isActive: true },
    newData: { isActive: false, kind, op: "admin.credential.revoke", reason },
    requestId: req.headers.get("x-request-id"),
  });

  return { kind, id: credId, revoked: true };
});
