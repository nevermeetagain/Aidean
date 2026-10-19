/**
 * /api/v1/admin/prices/promotions/[id] — 限时优惠编辑/删除（S4；API-010 PATCH / API-011 DELETE）。
 *
 * 目标行必须是 sourceType=PROMOTION（本端点只服务优惠行；OFFICIAL/当前价走 /prices 与 /prices/[id]）。
 * PATCH：requireAdminApi("admin.models.write") + PromotionPricePatchSchema（strict，未知键→40000，
 *   故请求体无法注入 isCurrent/sourceType/modelId）。合并现值后校验：
 *   effectiveUntil 必填且 > effectiveFrom；同模型窗口重叠（排除自身）→ 40000；价格小数位 ≤6。
 * DELETE：仅允许 PROMOTION 行（OFFICIAL → 40000，卡面验收 L41）；不存在 → 40000；
 *   成功写 AuditLog(action=3) + revalidatePath("/pricing")，返回 { deleted: true }（API-011 res）。
 */
import { revalidatePath } from "next/cache";

import { prisma } from "../../../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../../../lib/features/auth/session";
import { ApiError, ERROR_CODES, formatZodMessage } from "../../../../_lib/errors";
import { withApi, type RouteContext } from "../../../../_lib/handler";
import { writeAudit } from "../../../../_lib/audit";
import { PromotionPricePatchSchema } from "@aidean/shared";

export const dynamic = "force-dynamic";

/** Decimal(19,6) 防护：小数位 >6 会被静默舍入 → 拒 40000（E9-11）。 */
function exceedsScale(s: string, max = 6): boolean {
  const i = s.indexOf(".");
  return i >= 0 && s.length - i - 1 > max;
}

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
}

function toPromotion(r: PromotionRow) {
  return {
    id: r.id,
    modelId: r.modelId,
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

export const PATCH = withApi(
  async (req: Request, ctx: RouteContext<{ id: string }>) => {
    const session = await requireAdminApi("admin.models.write");
    const { id } = await ctx.params;

    const before = await prisma.modelPrice.findUnique({ where: { id }, select: SELECT_FIELDS });
    if (!before) throw new ApiError(ERROR_CODES.BAD_REQUEST, "优惠记录不存在");
    if (before.sourceType !== "PROMOTION") {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, "本端点仅允许修改优惠行（PROMOTION）");
    }

    const body = (await req.json().catch(() => null)) as unknown;
    const parsed = PromotionPricePatchSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, formatZodMessage(parsed.error.issues[0]));
    }
    const d = parsed.data;

    // 价格小数位 ≤6（仅对本次提交的字段判）。
    for (const [field, val] of [
      ["priceInput", d.priceInput],
      ["priceOutput", d.priceOutput],
      ["priceCache", d.priceCache],
    ] as const) {
      if (typeof val === "string" && exceedsScale(val)) {
        throw new ApiError(ERROR_CODES.BAD_REQUEST, `${field} 小数位不能超过 6 位`);
      }
    }

    // 合并现值后校验窗口合法性：until 必填且 > from（半开区间）。
    const from = d.effectiveFrom ? new Date(d.effectiveFrom) : before.effectiveFrom;
    const until = d.effectiveUntil ? new Date(d.effectiveUntil) : before.effectiveUntil;
    if (!until) throw new ApiError(ERROR_CODES.BAD_REQUEST, "effectiveUntil 必填");
    if (!(until > from)) throw new ApiError(ERROR_CODES.BAD_REQUEST, "effectiveUntil 必须晚于 effectiveFrom");

    // 窗口重叠（排除自身）。
    const overlap = await prisma.modelPrice.findFirst({
      where: {
        modelId: before.modelId,
        sourceType: "PROMOTION",
        id: { not: id },
        effectiveFrom: { lt: until },
        effectiveUntil: { gt: from },
      },
      select: { id: true },
    });
    if (overlap) throw new ApiError(ERROR_CODES.BAD_REQUEST, "与既有优惠窗口重叠");

    const updated = await prisma.modelPrice.update({
      where: { id },
      data: {
        ...(d.priceInput !== undefined ? { priceInput: d.priceInput } : {}),
        ...(d.priceOutput !== undefined ? { priceOutput: d.priceOutput } : {}),
        ...(d.priceCache !== undefined ? { priceCache: d.priceCache ?? null } : {}),
        ...(d.effectiveFrom !== undefined ? { effectiveFrom: from } : {}),
        ...(d.effectiveUntil !== undefined ? { effectiveUntil: until } : {}),
        ...(d.notes !== undefined ? { notes: d.notes } : {}),
        // 不动 isCurrent/sourceType/modelId/billing：优惠恒为 PROMOTION/isCurrent=false，口径继承当前价。
      },
      select: SELECT_FIELDS,
    });

    revalidatePath("/pricing");
    await writeAudit({
      actorId: session.userId,
      tableName: "model_prices",
      recordId: id,
      action: 2,
      changedFields: Object.keys(d).filter((k) => (d as Record<string, unknown>)[k] !== undefined),
      oldData: {
        priceInput: before.priceInput.toString(),
        priceOutput: before.priceOutput.toString(),
        effectiveFrom: before.effectiveFrom.toISOString(),
        effectiveUntil: before.effectiveUntil ? before.effectiveUntil.toISOString() : null,
      },
      newData: {
        priceInput: updated.priceInput.toString(),
        priceOutput: updated.priceOutput.toString(),
        effectiveFrom: updated.effectiveFrom.toISOString(),
        effectiveUntil: updated.effectiveUntil ? updated.effectiveUntil.toISOString() : null,
      },
      requestId: req.headers.get("x-request-id"),
    });
    return toPromotion(updated);
  },
);

export const DELETE = withApi(
  async (req: Request, ctx: RouteContext<{ id: string }>) => {
    const session = await requireAdminApi("admin.models.write");
    const { id } = await ctx.params;

    const row = await prisma.modelPrice.findUnique({
      where: { id },
      select: { id: true, modelId: true, sourceType: true, priceInput: true, priceOutput: true },
    });
    if (!row) throw new ApiError(ERROR_CODES.BAD_REQUEST, "优惠记录不存在");
    // 验收 L41：仅允许删除 PROMOTION 行；OFFICIAL（当前价）→ 40000。
    if (row.sourceType !== "PROMOTION") {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, "仅允许删除优惠行（PROMOTION）");
    }

    await prisma.modelPrice.delete({ where: { id } });

    revalidatePath("/pricing");
    await writeAudit({
      actorId: session.userId,
      tableName: "model_prices",
      recordId: id,
      action: 3,
      oldData: {
        modelId: row.modelId,
        priceInput: row.priceInput.toString(),
        priceOutput: row.priceOutput.toString(),
        sourceType: "PROMOTION",
      },
      requestId: req.headers.get("x-request-id"),
    });
    return { deleted: true };
  },
);
