/**
 * PATCH  /api/v1/admin/api-stations/[id]/keys/[keyId] — update key (status/weight)
 * DELETE /api/v1/admin/api-stations/[id]/keys/[keyId] — delete key
 *
 * R-49: API站点 admin 板块——平台 Key 池管理。
 */
import { prisma } from "../../../../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../../../../lib/features/auth/session";
import { ApiError, ERROR_CODES, formatZodMessage } from "../../../../../_lib/errors";
import { withApi, type RouteContext } from "../../../../../_lib/handler";
import { writeAudit } from "../../../../../_lib/audit";
import { maskApiKey } from "@aidean/shared";
import { z } from "zod";

export const dynamic = "force-dynamic";

const KeyUpdateSchema = z.object({
  name: z.string().max(100).optional(),
  weight: z.number().int().min(1).max(100).optional(),
  status: z.enum(["ACTIVE", "DISABLED", "COOLDOWN"]).optional(),
});

export const PATCH = withApi(
  async (req: Request, ctx: RouteContext<{ id: string; keyId: string }>) => {
    const session = await requireAdminApi("admin.api-stations.write");
    const { id, keyId } = await ctx.params;

    const body = (await req.json().catch(() => null)) as unknown;
    const parsed = KeyUpdateSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, formatZodMessage(parsed.error.issues[0]));
    }

    const existing = await prisma.stationKey.findUnique({ where: { id: keyId } });
    if (!existing || existing.stationId !== id) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, "Key 不存在");
    }

    const updated = await prisma.stationKey.update({
      where: { id: keyId },
      data: parsed.data,
    });

    await writeAudit({
      actorId: session.userId,
      tableName: "station_keys",
      recordId: keyId,
      action: 2,
      changedFields: Object.keys(parsed.data),
      oldData: { name: existing.name, weight: existing.weight, status: existing.status as string },
      newData: { name: updated.name, weight: updated.weight, status: updated.status as string },
      requestId: req.headers.get("x-request-id"),
    });

    return { item: { ...updated, keyValue: maskApiKey(updated.keyValue) } };
  }
);

export const DELETE = withApi(
  async (req: Request, ctx: RouteContext<{ id: string; keyId: string }>) => {
    const session = await requireAdminApi("admin.api-stations.write");
    const { id, keyId } = await ctx.params;

    const existing = await prisma.stationKey.findUnique({ where: { id: keyId } });
    if (!existing || existing.stationId !== id) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, "Key 不存在");
    }

    await prisma.stationKey.delete({ where: { id: keyId } });

    await writeAudit({
      actorId: session.userId,
      tableName: "station_keys",
      recordId: keyId,
      action: 3,
      changedFields: ["deleted"],
      oldData: { name: existing.name, weight: existing.weight, status: existing.status as string },
      requestId: req.headers.get("x-request-id"),
    });

    return { deleted: true, id: keyId };
  }
);

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../../../../_lib/method-not-allowed";
export const { GET, HEAD, POST, PUT, OPTIONS } = methodNotAllowed(["PATCH", "DELETE"]);
