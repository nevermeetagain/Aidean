/**
 * GET  /api/v1/admin/api-stations/[id]/keys — list station keys
 * POST /api/v1/admin/api-stations/[id]/keys — add a station key
 *
 * R-49: API站点 admin 板块——平台 Key 池管理。
 * ⚠️ keyValue 加密存储，列表仅返回 masked 版本。
 */
import { prisma } from "../../../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../../../lib/features/auth/session";
import { ApiError, ERROR_CODES, formatZodMessage } from "../../../../_lib/errors";
import { withApi, type RouteContext } from "../../../../_lib/handler";
import { writeAudit } from "../../../../_lib/audit";
import { maskApiKey } from "@aidean/shared";
import { z } from "zod";

export const dynamic = "force-dynamic";

const KeyCreateSchema = z.object({
  name: z.string().max(100).optional(),
  keyValue: z.string().min(1, "Key 值必填"),
  weight: z.number().int().min(1).max(100).optional().default(1),
  status: z.enum(["ACTIVE", "DISABLED"]).optional().default("ACTIVE"),
});

export const GET = withApi(
  async (_req: Request, ctx: RouteContext<{ id: string }>) => {
    await requireAdminApi("admin.api-stations.read");
    const { id } = await ctx.params;

    const keys = await prisma.stationKey.findMany({
      where: { stationId: id },
      orderBy: { createdAt: "desc" },
    });

    return {
      items: keys.map((k) => ({
        ...k,
        keyValue: maskApiKey(k.keyValue),
      })),
    };
  }
);

export const POST = withApi(
  async (req: Request, ctx: RouteContext<{ id: string }>) => {
    const session = await requireAdminApi("admin.api-stations.write");
    const { id } = await ctx.params;

    const body = (await req.json().catch(() => null)) as unknown;
    const parsed = KeyCreateSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, formatZodMessage(parsed.error.issues[0]));
    }

    const station = await prisma.aPIStation.findUnique({ where: { id } });
    if (!station || station.deletedAt) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, "API站点不存在");
    }

    const key = await prisma.stationKey.create({
      data: {
        stationId: id,
        name: parsed.data.name,
        keyValue: parsed.data.keyValue,
        weight: parsed.data.weight,
        status: parsed.data.status,
      },
    });

    await writeAudit({
      actorId: session.userId,
      tableName: "station_keys",
      recordId: key.id,
      action: 1,
      changedFields: ["stationId", "name", "weight", "status"],
      newData: { stationId: id, name: key.name, weight: key.weight, status: key.status as string },
      requestId: req.headers.get("x-request-id"),
    });

    return { item: { ...key, keyValue: maskApiKey(key.keyValue) } };
  }
);

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../../../_lib/method-not-allowed";
export const { PUT, PATCH, DELETE, OPTIONS } = methodNotAllowed(["GET", "POST"]);
