/**
 * /api/v1/admin/providers/[id]/offerings — 提供商模型挂载列表 + 新增。
 *
 * GET：requireAdminApi → 指定提供商下的 offerings 列表（含模型信息）。
 * POST：requireAdminApi → AdminOfferingUpsertSchema → upsert（providerId × modelId 唯一键）。
 */
import { revalidatePath } from "next/cache";

import { prisma } from "../../../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../../../lib/features/auth/session";
import { ApiError, ERROR_CODES, formatZodMessage } from "../../../../_lib/errors";
import { withApi, type RouteContext } from "../../../../_lib/handler";
import { writeAudit } from "../../../../_lib/audit";
import { AdminOfferingUpsertSchema } from "@aidean/shared";

export const dynamic = "force-dynamic";

export const GET = withApi(
  async (req: Request, ctx: RouteContext<{ id: string }>) => {
    await requireAdminApi("admin.providers.read");
    const { id } = await ctx.params;
    const url = new URL(req.url);
    const isActive = url.searchParams.get("isActive");

    const provider = await prisma.modelProvider.findUnique({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!provider) throw new ApiError(ERROR_CODES.MODEL_NOT_FOUND, "提供商不存在");

    const offerings = await prisma.providerModelOffering.findMany({
      where: {
        providerId: id,
        ...(isActive !== null ? { isActive: isActive === "true" } : {}),
      },
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
      orderBy: [{ listedAt: "desc" }, { createdAt: "desc" }],
    });

    return { items: offerings };
  },
);

export const POST = withApi(
  async (req: Request, ctx: RouteContext<{ id: string }>) => {
    const session = await requireAdminApi("admin.providers.write");
    const { id } = await ctx.params;

    const provider = await prisma.modelProvider.findUnique({
      where: { id, deletedAt: null },
      select: { id: true, rechargeRatio: true, priceCurrency: true },
    });
    if (!provider) throw new ApiError(ERROR_CODES.MODEL_NOT_FOUND, "提供商不存在");

    const body = (await req.json().catch(() => null)) as unknown;
    const parsed = AdminOfferingUpsertSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, formatZodMessage(parsed.error.issues[0]));
    }
    const d = parsed.data;

    // 校验模型存在
    const model = await prisma.aiModel.findUnique({
      where: { id: d.modelId },
      select: { id: true, modelCode: true },
    });
    if (!model) throw new ApiError(ERROR_CODES.MODEL_NOT_FOUND, "模型不存在");

    const offering = await prisma.providerModelOffering.upsert({
      where: {
        providerId_modelId: { providerId: id, modelId: d.modelId },
      },
      create: {
        providerId: id,
        modelId: d.modelId,
        listedAt: d.listedAt ? new Date(d.listedAt) : null,
        defaultMultiplier: d.defaultMultiplier,
        priceInput: d.priceInput,
        priceOutput: d.priceOutput,
        priceCache: d.priceCache,
        priceUnit: d.priceUnit,
        discountInputMin: d.discountInputMin,
        discountInputMax: d.discountInputMax,
        discountOutputMin: d.discountOutputMin,
        discountOutputMax: d.discountOutputMax,
        discountCacheMin: d.discountCacheMin,
        discountCacheMax: d.discountCacheMax,
        effectiveFrom: new Date(d.effectiveFrom),
        effectiveUntil: d.effectiveUntil ? new Date(d.effectiveUntil) : null,
        isActive: d.isActive,
      },
      update: {
        listedAt: d.listedAt ? new Date(d.listedAt) : null,
        defaultMultiplier: d.defaultMultiplier,
        priceInput: d.priceInput,
        priceOutput: d.priceOutput,
        priceCache: d.priceCache,
        priceUnit: d.priceUnit,
        discountInputMin: d.discountInputMin,
        discountInputMax: d.discountInputMax,
        discountOutputMin: d.discountOutputMin,
        discountOutputMax: d.discountOutputMax,
        discountCacheMin: d.discountCacheMin,
        discountCacheMax: d.discountCacheMax,
        effectiveFrom: new Date(d.effectiveFrom),
        effectiveUntil: d.effectiveUntil ? new Date(d.effectiveUntil) : null,
        isActive: d.isActive,
      },
    });

    await writeAudit({
      actorId: session.userId,
      tableName: "provider_model_offerings",
      action: 1,
      recordId: offering.id,
      newData: { providerId: id, modelId: d.modelId, modelCode: model.modelCode },
    });

    revalidatePath("/providers");
    revalidatePath(`/models/${model.modelCode}`);
    return offering;
  },
);
