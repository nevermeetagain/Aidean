/**
 * /api/v1/admin/package-orders/[id] — 套餐订单处置（S6.2 关单/标异常·受控状态机，非自由 PATCH）。
 *
 * PATCH：requireAdminApi("admin.orders.write") + AdminOrderDispositionSchema。
 *   CLOSE/FLAG → PENDING|ACTIVE→CANCELLED（FLAG 视同撤销并在审计标注异常）；
 *   REVERSE 不适用（套餐订单经兑换码发放，无资金流水）→ 40000。
 *   终态（EXPIRED/CANCELLED）不可再处置 → 40000；CAS 更新（where status=旧值）防并发；
 *   成功写 AuditLog（action 2）。绝不删除记录（对齐 spec「账本不可删改」）。
 */
import { prisma } from "../../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../../lib/features/auth/session";
import { ApiError, ERROR_CODES, formatZodMessage } from "../../../_lib/errors";
import { withApi, type RouteContext } from "../../../_lib/handler";
import { writeAudit } from "../../../_lib/audit";
import { AdminOrderDispositionSchema } from "@aidean/shared";

export const dynamic = "force-dynamic";

export const PATCH = withApi(
  async (req: Request, ctx: RouteContext<{ id: string }>) => {
    const session = await requireAdminApi("admin.orders.write");
    const { id } = await ctx.params;

    const before = await prisma.packageOrder.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!before) throw new ApiError(ERROR_CODES.BAD_REQUEST, "套餐订单不存在");

    const body = (await req.json().catch(() => null)) as unknown;
    const parsed = AdminOrderDispositionSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, formatZodMessage(parsed.error.issues[0]));
    }
    const { action, reason } = parsed.data;
    if (action === "REVERSE") {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, "套餐订单无资金流水，不可冲正（请关单）");
    }

    const from = before.status as string;
    if (from !== "PENDING" && from !== "ACTIVE") {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, `当前状态 ${from} 为终态，不可处置`);
    }
    const updated = await prisma.packageOrder.updateMany({
      where: { id, status: before.status },
      data: { status: "CANCELLED" },
    });
    if (updated.count === 0) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, "订单状态已变更，请刷新后重试");
    }

    await writeAudit({
      actorId: session.userId,
      tableName: "package_orders",
      recordId: id,
      action: 2,
      changedFields: ["status"],
      oldData: { status: before.status },
      newData: { status: "CANCELLED", disposition: action, reason: reason ?? null },
      requestId: req.headers.get("x-request-id"),
    });
    return { id, status: "CANCELLED", action };
  }
);

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../../_lib/method-not-allowed";
export const { GET, HEAD, POST, PUT, DELETE, OPTIONS } = methodNotAllowed(["PATCH"]);
