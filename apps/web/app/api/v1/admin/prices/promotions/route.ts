/**
 * /api/v1/admin/prices/promotions — 限时优惠管理（S4；API-008 GET / API-009 POST）。
 *
 * 建模口径（DESIGN-002 §1 / promotion.schema.ts）：限时优惠 = ModelPrice 中
 *   sourceType=PROMOTION 且 isCurrent=false 的价格行，窗口为半开区间 [effectiveFrom, effectiveUntil)。
 * V0.9.0 状态注（卡面 L7）：真库探针证实「优惠行误标 isCurrent=true → 过期后被当当前价」，
 *   解析器（027）已读侧防御；本卡写侧根治——强制 isCurrent=false，且绝不接收请求体对该列的赋值。
 *
 * GET ：requireAdminApi("admin.models.read") → 分页列 PROMOTION 行（Decimal→string、Date→ISO）。
 * POST：requireAdminApi("admin.models.write") + PromotionPriceCreateSchema，四项写侧约束：
 *   ① 强制 sourceType=PROMOTION、isCurrent=false（create schema 非 strict，未知键被剥离，请求体无法写入）；
 *   ② billing 三元组一律从该模型当前价（isCurrent=true）派生，无当前价 → 40000（防 R9-04 计费口径漂移）；
 *   ③ 价格小数位 ≤6（Decimal(19,6) 静默舍入防护，E9-11）→ 超出 40000；
 *   ④ 同模型优惠窗口重叠 → 40000（errors.ts §「窗口非法/重叠→BAD_REQUEST」）。
 *   成功写 AuditLog(action=1) + revalidatePath("/pricing")。
 */
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

import { prisma } from "../../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../../lib/features/auth/session";
import { ApiError, ERROR_CODES, formatZodMessage } from "../../../_lib/errors";
import { withApi } from "../../../_lib/handler";
import { writeAudit } from "../../../_lib/audit";
import { AdminPageQuerySchema, PromotionPriceCreateSchema } from "@aidean/shared";

export const dynamic = "force-dynamic";

/** Decimal(19,6) 防护：小数位 >6 会被静默舍入 → 拒 40000（E9-11）。 */
function exceedsScale(s: string, max = 6): boolean {
  const i = s.indexOf(".");
  return i >= 0 && s.length - i - 1 > max;
}

/** 优惠行投影入参（结构面：Decimal 取 toString、enum 视为 string、关系可缺省）。 */
interface PromotionRow {
  id: string;
  modelId: string;
  priceInput: { toString(): string };
  priceOutput: { toString(): string };
  priceCache: { toString(): string } | null;
  billingMode: string;
  billingUnit: string;
  billingCurrency: string;
  effectiveFrom: Date;
  effectiveUntil: Date | null;
  isCurrent: boolean;
  sourceType: string;
  notes: string | null;
  model?: { nameDisplay: string } | null;
}

/** 统一「Promotion」投影（GET/POST 共用；GET 附 modelName）。 */
function toPromotion(r: PromotionRow) {
  return {
    id: r.id,
    modelId: r.modelId,
    ...(r.model ? { modelName: r.model.nameDisplay } : {}),
    priceInput: r.priceInput.toString(),
    priceOutput: r.priceOutput.toString(),
    priceCache: r.priceCache ? r.priceCache.toString() : null,
    billingMode: r.billingMode,
    billingUnit: r.billingUnit,
    billingCurrency: r.billingCurrency,
    effectiveFrom: r.effectiveFrom.toISOString(),
    effectiveUntil: r.effectiveUntil ? r.effectiveUntil.toISOString() : null,
    isCurrent: r.isCurrent,
    sourceType: r.sourceType,
    notes: r.notes,
  };
}

const SELECT_FIELDS = {
  id: true,
  modelId: true,
  priceInput: true,
  priceOutput: true,
  priceCache: true,
  billingMode: true,
  billingUnit: true,
  billingCurrency: true,
  effectiveFrom: true,
  effectiveUntil: true,
  isCurrent: true,
  sourceType: true,
  notes: true,
} as const;

export const GET = withApi(async (req: Request) => {
  await requireAdminApi("admin.models.read");
  const url = new URL(req.url);
  const parsed = AdminPageQuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, formatZodMessage(parsed.error.issues[0]));
  }
  const { page, pageSize } = parsed.data;
  const modelId = url.searchParams.get("modelId") || undefined;

  const where: Prisma.ModelPriceWhereInput = { sourceType: "PROMOTION", ...(modelId ? { modelId } : {}) };

  const [total, rows] = await Promise.all([
    prisma.modelPrice.count({ where }),
    prisma.modelPrice.findMany({
      where,
      orderBy: { effectiveFrom: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: { ...SELECT_FIELDS, model: { select: { nameDisplay: true } } },
    }),
  ]);

  return {
    items: rows.map((r) => toPromotion(r)),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
});

export const POST = withApi(async (req: Request) => {
  const session = await requireAdminApi("admin.models.write");
  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = PromotionPriceCreateSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, formatZodMessage(parsed.error.issues[0]));
  }
  const d = parsed.data;

  // 模型存在性（errors.ts §「限时优惠指向不存在模型→MODEL_NOT_FOUND」）。
  const model = await prisma.aiModel.findUnique({ where: { id: d.modelId }, select: { id: true } });
  if (!model) throw new ApiError(ERROR_CODES.MODEL_NOT_FOUND, "模型不存在");

  // 写侧约束②：计费口径一律继承该模型当前价；无当前价 → 无从一致 → 40000（防 R9-04）。
  const current = await prisma.modelPrice.findFirst({
    where: { modelId: d.modelId, isCurrent: true },
    select: { billingMode: true, billingUnit: true, billingCurrency: true },
  });
  if (!current) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, "该模型无当前价，无法创建计费口径一致的优惠");
  }

  // 写侧约束③：价格小数位 ≤6（Decimal(19,6) 静默舍入防护，E9-11）。
  for (const [field, val] of [
    ["priceInput", d.priceInput],
    ["priceOutput", d.priceOutput],
    ["priceCache", d.priceCache],
  ] as const) {
    if (typeof val === "string" && exceedsScale(val)) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, `${field} 小数位不能超过 6 位`);
    }
  }

  const from = new Date(d.effectiveFrom);
  const until = new Date(d.effectiveUntil);

  // 写侧约束④：同模型优惠窗口 [from,until) 与既有重叠 → 40000（aFrom<bUntil && bFrom<aUntil）。
  const overlap = await prisma.modelPrice.findFirst({
    where: { modelId: d.modelId, sourceType: "PROMOTION", effectiveFrom: { lt: until }, effectiveUntil: { gt: from } },
    select: { id: true },
  });
  if (overlap) throw new ApiError(ERROR_CODES.BAD_REQUEST, "与既有优惠窗口重叠");

  // 写侧约束①：强制 sourceType=PROMOTION、isCurrent=false（不接受请求体赋值；schema 已剥离未知键）。
  const created = await prisma.modelPrice.create({
    data: {
      modelId: d.modelId,
      priceInput: d.priceInput,
      priceOutput: d.priceOutput,
      priceCache: d.priceCache ?? null,
      billingMode: current.billingMode,
      billingUnit: current.billingUnit,
      billingCurrency: current.billingCurrency,
      effectiveFrom: from,
      effectiveUntil: until,
      isCurrent: false,
      sourceType: "PROMOTION",
      sourceName: "admin-manual",
      notes: d.notes ?? "限时优惠",
    },
    select: SELECT_FIELDS,
  });

  revalidatePath("/pricing");
  await writeAudit({
    actorId: session.userId,
    tableName: "model_prices",
    recordId: created.id,
    action: 1,
    changedFields: ["priceInput", "priceOutput", "effectiveFrom", "effectiveUntil", "sourceType", "isCurrent"],
    newData: {
      modelId: d.modelId,
      priceInput: d.priceInput,
      priceOutput: d.priceOutput,
      sourceType: "PROMOTION",
      isCurrent: false,
    },
    requestId: req.headers.get("x-request-id"),
  });
  return toPromotion(created);
});
