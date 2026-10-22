/**
 * /api/v1/admin/providers/[id]/offerings/[offeringId] — 挂载编辑 + 删除。
 *
 * PATCH：requireAdminApi → AdminOfferingPatchSchema 白名单。
 * DELETE：requireAdminApi → 硬删（onDelete Cascade from provider/model）。
 */
import { revalidatePath } from "next/cache";

import { prisma } from "../../../../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../../../../lib/features/auth/session";
import { ApiError, ERROR_CODES, formatZodMessage } from "../../../../../_lib/errors";
import { withApi, type RouteContext } from "../../../../../_lib/handler";
import { writeAudit } from "../../../../../_lib/audit";
import { AdminOfferingPatchSchema } from "@aidean/shared";

export const dynamic = "force-dynamic";

export const PATCH = withApi(
  async (req: Request, ctx: RouteContext<{ id: string; offeringId: string }>) => {
    const session = await requireAdminApi("admin.providers.write");
    const { id, offeringId } = await ctx.params;

    const body = (await req.json().catch(() => null)) as unknown;
    const parsed = AdminOfferingPatchSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, formatZodMessage(parsed.error.issues[0]));
    }

    const existing = await prisma.providerModelOffering.findUnique({
      where: { id: offeringId, providerId: id },
    });
    if (!existing) throw new ApiError(ERROR_CODES.MODEL_NOT_FOUND, "挂载不存在");

    const d = parsed.data;
    const updated = await prisma.providerModelOffering.update({
      where: { id: offeringId },
      data: {
        ...(d.listedAt !== undefined ? { listedAt: d.listedAt ? new Date(d.listedAt) : null } : {}),
        ...(d.defaultMultiplier !== undefined ? { defaultMultiplier: d.defaultMultiplier } : {}),
        ...(d.priceInput !== undefined ? { priceInput: d.priceInput } : {}),
        ...(d.priceOutput !== undefined ? { priceOutput: d.priceOutput } : {}),
        ...(d.priceCache !== undefined ? { priceCache: d.priceCache } : {}),
        ...(d.priceUnit !== undefined ? { priceUnit: d.priceUnit } : {}),
        ...(d.discountInputMin !== undefined ? { discountInputMin: d.discountInputMin } : {}),
        ...(d.discountInputMax !== undefined ? { discountInputMax: d.discountInputMax } : {}),
        ...(d.discountOutputMin !== undefined ? { discountOutputMin: d.discountOutputMin } : {}),
        ...(d.discountOutputMax !== undefined ? { discountOutputMax: d.discountOutputMax } : {}),
        ...(d.discountCacheMin !== undefined ? { discountCacheMin: d.discountCacheMin } : {}),
        ...(d.discountCacheMax !== undefined ? { discountCacheMax: d.discountCacheMax } : {}),
        ...(d.effectiveFrom !== undefined ? { effectiveFrom: new Date(d.effectiveFrom) } : {}),
        ...(d.effectiveUntil !== undefined ? { effectiveUntil: d.effectiveUntil ? new Date(d.effectiveUntil) : null } : {}),
        ...(d.isActive !== undefined ? { isActive: d.isActive } : {}),
      },
    });

    await writeAudit({
      actorId: session.userId,
      tableName: "provider_model_offerings",
      action: 2,
      recordId: offeringId,
      newData: d,
    });

    revalidatePath("/providers");
    return updated;
  },
);

export const DELETE = withApi(
  async (_req: Request, ctx: RouteContext<{ id: string; offeringId: string }>) => {
    const session = await requireAdminApi("admin.providers.write");
    const { id, offeringId } = await ctx.params;

    const existing = await prisma.providerModelOffering.findUnique({
      where: { id: offeringId, providerId: id },
      select: { id: true, modelId: true },
    });
    if (!existing) throw new ApiError(ERROR_CODES.MODEL_NOT_FOUND, "挂载不存在");

    await prisma.providerModelOffering.delete({ where: { id: offeringId } });

    await writeAudit({
      actorId: session.userId,
      tableName: "provider_model_offerings",
      action: 3,
      recordId: offeringId,
      oldData: { providerId: id, modelId: existing.modelId },
    });

    revalidatePath("/providers");
    return { id: offeringId };
  },
);

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../../../../_lib/method-not-allowed";
export const { GET, HEAD, POST, PUT, OPTIONS } = methodNotAllowed(["PATCH", "DELETE"]);
