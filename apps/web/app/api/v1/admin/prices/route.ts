/**
 * /api/v1/admin/prices — 模型定价管理（S7.1 定价孤岛激活）。
 *
 * 背景：ModelPrice 由爬虫/seed 写入、前台 /pricing 消费，此前无后台管理面。
 * GET ：requireAdminApi("admin.models.read") → 当前价（isCurrent=true）+ 模型投影，Decimal→string。
 * POST：requireAdminApi("admin.models.write") → 为尚无当前价的模型新建当前价（已有 → 400 请改用编辑）。
 *       写 AuditLog(action=1) + revalidatePath("/pricing")。
 */
import { invalidatePriceViews } from "../../../../../lib/features/ladder/price-views";
import { Prisma } from "@prisma/client";

import { prisma } from "../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../lib/features/auth/session";
import { ApiError, ERROR_CODES, formatZodMessage } from "../../_lib/errors";
import { withApi } from "../../_lib/handler";
import { writeAudit } from "../../_lib/audit";
import { AdminPriceCreateSchema, AdminPricesQuerySchema } from "@aidean/shared";

export const dynamic = "force-dynamic";

const dec = (v: { toString(): string } | null) => (v === null ? null : v.toString());

export const GET = withApi(async (req: Request) => {
  await requireAdminApi("admin.models.read");
  const url = new URL(req.url);
  const parsed = AdminPricesQuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, formatZodMessage(parsed.error.issues[0]));
  }
  const { q, modelId, limit } = parsed.data;

  const where: Prisma.ModelPriceWhereInput = {
    isCurrent: true,
    ...(modelId ? { modelId } : {}),
    ...(q
      ? {
          model: {
            OR: [
              { nameDisplay: { contains: q, mode: "insensitive" } },
              { slug: { contains: q, mode: "insensitive" } },
              { modelCode: { contains: q, mode: "insensitive" } },
            ],
          },
        }
      : {}),
  };

  const rows = await prisma.modelPrice.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      modelId: true,
      priceInput: true,
      priceOutput: true,
      priceCache: true,
      pricePerRequest: true,
      billingMode: true,
      billingCurrency: true,
      billingUnit: true,
      sourceType: true,
      notes: true,
      effectiveFrom: true,
      model: { select: { nameDisplay: true, slug: true, modelCode: true, vendor: { select: { name: true } } } },
    },
  });

  return {
    items: rows.map((r) => ({
      id: r.id,
      modelId: r.modelId,
      modelName: r.model.nameDisplay,
      modelSlug: r.model.slug,
      modelCode: r.model.modelCode,
      vendorName: r.model.vendor?.name ?? "—",
      priceInput: dec(r.priceInput),
      priceOutput: dec(r.priceOutput),
      priceCache: dec(r.priceCache),
      pricePerRequest: dec(r.pricePerRequest),
      billingMode: r.billingMode as string,
      billingCurrency: r.billingCurrency,
      billingUnit: r.billingUnit,
      sourceType: r.sourceType as string,
      notes: r.notes,
      effectiveFrom: r.effectiveFrom.toISOString(),
    })),
  };
});

export const POST = withApi(async (req: Request) => {
  const session = await requireAdminApi("admin.models.write");
  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = AdminPriceCreateSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, formatZodMessage(parsed.error.issues[0]));
  }
  const d = parsed.data;

  const model = await prisma.aiModel.findUnique({ where: { id: d.modelId }, select: { id: true, nameDisplay: true } });
  if (!model) throw new ApiError(ERROR_CODES.BAD_REQUEST, "模型不存在");

  const existing = await prisma.modelPrice.findFirst({
    where: { modelId: d.modelId, isCurrent: true },
    select: { id: true },
  });
  if (existing) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, "该模型已有当前价，请改用编辑");
  }

  const created = await prisma.modelPrice.create({
    data: {
      modelId: d.modelId,
      priceInput: d.priceInput,
      priceOutput: d.priceOutput,
      priceCache: d.priceCache ?? null,
      pricePerRequest: d.pricePerRequest ?? null,
      billingMode: d.billingMode,
      billingUnit: d.billingUnit ?? "per_1k_tokens",
      billingCurrency: d.billingCurrency ?? "CNY",
      notes: d.notes ?? "后台录入",
      sourceType: "OFFICIAL",
      sourceName: "admin-manual",
      effectiveFrom: new Date(),
      isCurrent: true,
    },
    select: { id: true, modelId: true },
  });

  await invalidatePriceViews(); // TASK-097：ISR + 天梯 Redis 两层失效
  await writeAudit({
    actorId: session.userId,
    tableName: "model_prices",
    recordId: created.id,
    action: 1,
    changedFields: ["priceInput", "priceOutput", "billingMode", "billingUnit"],
    newData: { modelId: d.modelId, priceInput: String(d.priceInput), priceOutput: String(d.priceOutput) },
    requestId: req.headers.get("x-request-id"),
  });
  return created;
});
