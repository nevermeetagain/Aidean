/**
 * /api/v1/admin/prices/[id] — 编辑模型当前价（S7.1）。
 *
 * PATCH：requireAdminApi("admin.models.write") + AdminPricePatchSchema。
 *   仅更新价格数值/计价粒度/币种/备注；不动 isCurrent/modelId（新建当前价请走 POST /prices）。
 *   记录不存在 → 40000；成功写 AuditLog(action=2) + revalidatePath("/pricing")。
 */
import { revalidatePath } from "next/cache";

import { prisma } from "../../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../../lib/features/auth/session";
import { ApiError, ERROR_CODES, formatZodMessage } from "../../../_lib/errors";
import { withApi, type RouteContext } from "../../../_lib/handler";
import { writeAudit } from "../../../_lib/audit";
import { AdminPricePatchSchema } from "@aidean/shared";

export const dynamic = "force-dynamic";

export const PATCH = withApi(
  async (req: Request, ctx: RouteContext<{ id: string }>) => {
    const session = await requireAdminApi("admin.models.write");
    const { id } = await ctx.params;

    const before = await prisma.modelPrice.findUnique({
      where: { id },
      select: {
        id: true,
        modelId: true,
        priceInput: true,
        priceOutput: true,
        priceCache: true,
        pricePerRequest: true,
        billingUnit: true,
        billingCurrency: true,
        notes: true,
      },
    });
    if (!before) throw new ApiError(ERROR_CODES.BAD_REQUEST, "定价记录不存在");

    const body = (await req.json().catch(() => null)) as unknown;
    const parsed = AdminPricePatchSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, formatZodMessage(parsed.error.issues[0]));
    }
    const d = parsed.data;

    const updated = await prisma.modelPrice.update({
      where: { id },
      data: {
        priceInput: d.priceInput,
        priceOutput: d.priceOutput,
        priceCache: d.priceCache ?? null,
        pricePerRequest: d.pricePerRequest ?? null,
        ...(d.billingUnit !== undefined ? { billingUnit: d.billingUnit } : {}),
        ...(d.billingCurrency !== undefined ? { billingCurrency: d.billingCurrency } : {}),
        ...(d.notes !== undefined ? { notes: d.notes } : {}),
      },
      select: { id: true, modelId: true },
    });

    revalidatePath("/pricing");
    await writeAudit({
      actorId: session.userId,
      tableName: "model_prices",
      recordId: id,
      action: 2,
      changedFields: ["priceInput", "priceOutput", "priceCache", "pricePerRequest", "billingUnit", "billingCurrency", "notes"],
      oldData: {
        priceInput: before.priceInput.toString(),
        priceOutput: before.priceOutput.toString(),
        billingUnit: before.billingUnit,
        billingCurrency: before.billingCurrency,
      },
      newData: { priceInput: String(d.priceInput), priceOutput: String(d.priceOutput) },
      requestId: req.headers.get("x-request-id"),
    });
    return updated;
  }
);
