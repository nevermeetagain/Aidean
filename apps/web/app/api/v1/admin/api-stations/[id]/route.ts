/**
 * GET    /api/v1/admin/api-stations/[id] — get station detail
 * PATCH  /api/v1/admin/api-stations/[id] — update station
 * DELETE /api/v1/admin/api-stations/[id] — soft-delete station
 *
 * R-49: API站点 admin 板块——单站 CRUD。
 */
import { Prisma } from "@prisma/client";

import { prisma } from "../../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../../lib/features/auth/session";
import { ApiError, ERROR_CODES, formatZodMessage } from "../../../_lib/errors";
import { withApi, type RouteContext } from "../../../_lib/handler";
import { writeAudit } from "../../../_lib/audit";
import { z } from "zod";

export const dynamic = "force-dynamic";

const ApiStationUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  nameCn: z.string().max(100).optional(),
  displayName: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  provider: z.string().max(100).optional(),
  website: z.string().url().optional().or(z.literal("")),
  apiDocs: z.string().url().optional().or(z.literal("")),
  baseUrl: z.string().url().optional().or(z.literal("")),
  models: z.array(z.string()).optional(),
  protocols: z.array(z.string()).optional(),
  features: z.array(z.string()).optional(),
  useCase: z.string().max(200).optional(),
  icon: z.string().optional(),
  isVerified: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  avgLatency: z.number().optional(),
  uptime: z.number().optional(),
});

export const GET = withApi(
  async (_req: Request, ctx: RouteContext<{ id: string }>) => {
    await requireAdminApi("admin.api-stations.read");
    const { id } = await ctx.params;

    const station = await prisma.aPIStation.findUnique({
      where: { id },
      include: {
        keys: { orderBy: { createdAt: "desc" } },
        billingRule: true,
        _count: { select: { packages: true, stationUserKeys: true } },
      },
    });

    if (!station || station.deletedAt) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, "API站点不存在");
    }

    return { item: station };
  }
);

export const PATCH = withApi(
  async (req: Request, ctx: RouteContext<{ id: string }>) => {
    const session = await requireAdminApi("admin.api-stations.write");
    const { id } = await ctx.params;

    const body = (await req.json().catch(() => null)) as unknown;
    const parsed = ApiStationUpdateSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, formatZodMessage(parsed.error.issues[0]));
    }

    const existing = await prisma.aPIStation.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, "API站点不存在");
    }

    const updated = await prisma.aPIStation.update({
      where: { id },
      data: parsed.data,
      select: {
        id: true, name: true, nameCn: true, displayName: true, description: true,
        provider: true, website: true, apiDocs: true, baseUrl: true,
        models: true, protocols: true, features: true, useCase: true,
        icon: true, isVerified: true, isFeatured: true, updatedAt: true,
      },
    });

    await writeAudit({
      actorId: session.userId,
      tableName: "api_stations",
      recordId: id,
      action: 2,
      changedFields: Object.keys(parsed.data),
      oldData: { name: existing.name, displayName: existing.displayName, isVerified: existing.isVerified, isFeatured: existing.isFeatured },
      newData: updated,
      requestId: req.headers.get("x-request-id"),
    });

    return { item: updated };
  }
);

export const DELETE = withApi(
  async (req: Request, ctx: RouteContext<{ id: string }>) => {
    const session = await requireAdminApi("admin.api-stations.write");
    const { id } = await ctx.params;

    const existing = await prisma.aPIStation.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, "API站点不存在");
    }

    await prisma.aPIStation.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await writeAudit({
      actorId: session.userId,
      tableName: "api_stations",
      recordId: id,
      action: 3,
      changedFields: ["deletedAt"],
      oldData: { name: existing.name, displayName: existing.displayName },
      requestId: req.headers.get("x-request-id"),
    });

    return { deleted: true, id };
  }
);
