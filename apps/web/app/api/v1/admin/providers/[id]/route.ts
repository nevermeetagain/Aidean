/**
 * /api/v1/admin/providers/[id] — 模型提供商详情 + 编辑 + 软删。
 *
 * GET：requireAdminApi → 单条详情（含 offerings 概览）。
 * PATCH：requireAdminApi → AdminProviderPatchSchema 白名单。
 * DELETE：requireAdminApi → 软删（deletedAt = now()，isActive = false）。
 */
import { revalidatePath } from "next/cache";

import { prisma } from "../../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../../lib/features/auth/session";
import { ApiError, ERROR_CODES, formatZodMessage } from "../../../_lib/errors";
import { withApi, type RouteContext } from "../../../_lib/handler";
import { writeAudit } from "../../../_lib/audit";
import { AdminProviderPatchSchema } from "@aidean/shared";

export const dynamic = "force-dynamic";

export const GET = withApi(
  async (_req: Request, ctx: RouteContext<{ id: string }>) => {
    await requireAdminApi("admin.providers.read");
    const { id } = await ctx.params;

    const provider = await prisma.modelProvider.findUnique({
      where: { id, deletedAt: null },
      include: {
        offerings: {
          where: { isActive: true },
          include: {
            model: {
              select: {
                id: true,
                modelCode: true,
                nameDisplay: true,
                slug: true,
                vendor: { select: { id: true, name: true, code: true } },
              },
            },
          },
          orderBy: [{ listedAt: "desc" }],
        },
      },
    });
    if (!provider) throw new ApiError(ERROR_CODES.MODEL_NOT_FOUND, "提供商不存在");
    return provider;
  },
);

export const PATCH = withApi(
  async (req: Request, ctx: RouteContext<{ id: string }>) => {
    const session = await requireAdminApi("admin.providers.write");
    const { id } = await ctx.params;

    const body = (await req.json().catch(() => null)) as unknown;
    const parsed = AdminProviderPatchSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, formatZodMessage(parsed.error.issues[0]));
    }

    const before = await prisma.modelProvider.findUnique({
      where: { id, deletedAt: null },
      select: { id: true, name: true, rechargeRatio: true, isActive: true },
    });
    if (!before) throw new ApiError(ERROR_CODES.MODEL_NOT_FOUND, "提供商不存在");

    const updated = await prisma.modelProvider.update({
      where: { id },
      data: parsed.data,
    });

    await writeAudit({
      actorId: session.userId,
      tableName: "model_providers",
      action: 2,
      recordId: id,
      oldData: { name: before.name, rechargeRatio: String(before.rechargeRatio), isActive: before.isActive },
      newData: parsed.data,
    });

    revalidatePath("/providers");
    return updated;
  },
);

export const DELETE = withApi(
  async (_req: Request, ctx: RouteContext<{ id: string }>) => {
    const session = await requireAdminApi("admin.providers.write");
    const { id } = await ctx.params;

    const provider = await prisma.modelProvider.findUnique({
      where: { id, deletedAt: null },
      select: { id: true, name: true, code: true },
    });
    if (!provider) throw new ApiError(ERROR_CODES.MODEL_NOT_FOUND, "提供商不存在");

    await prisma.modelProvider.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    await writeAudit({
      actorId: session.userId,
      tableName: "model_providers",
      action: 3,
      recordId: id,
      oldData: { name: provider.name, code: provider.code },
    });

    revalidatePath("/providers");
    return { id };
  },
);
