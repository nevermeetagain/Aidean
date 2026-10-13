/**
 * /api/v1/admin/recharge-orders/[id] — 充值订单处置（S6.2 关单/标异常/冲正·受控状态机）。
 *
 * PATCH：requireAdminApi("admin.orders.write") + AdminOrderDispositionSchema。
 *   CLOSE PENDING→EXPIRED；FLAG PENDING→FAILED；REVERSE PAID→REFUNDED（经 billingService
 *   reverseRechargeOrder 写 REVERSAL 反向分录，保留原 TOPUP/GRANT，非删除）。
 *   非待支付订单不可 CLOSE/FLAG；冲正资金变动全走账务服务（乐观锁+幂等+余额守卫）。成功写 AuditLog。
 */
import { prisma } from "../../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../../lib/features/auth/session";
import { billingService } from "../../../../../../lib/features/billing/service";
import { ApiError, ERROR_CODES, formatZodMessage } from "../../../_lib/errors";
import { withApi, type RouteContext } from "../../../_lib/handler";
import { writeAudit } from "../../../_lib/audit";
import { AdminOrderDispositionSchema, fenToYuan } from "@aidean/shared";

export const dynamic = "force-dynamic";

export const PATCH = withApi(
  async (req: Request, ctx: RouteContext<{ id: string }>) => {
    const session = await requireAdminApi("admin.orders.write");
    const { id } = await ctx.params;

    const before = await prisma.rechargeOrder.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!before) throw new ApiError(ERROR_CODES.RECHARGE_ORDER_NOT_FOUND, "充值订单不存在");

    const body = (await req.json().catch(() => null)) as unknown;
    const parsed = AdminOrderDispositionSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, formatZodMessage(parsed.error.issues[0]));
    }
    const { action, reason } = parsed.data;
    const status = before.status as string;

    // 冲正（资金处置）：仅经账务服务，绝不在此直写分录/余额
    if (action === "REVERSE") {
      const idempotencyKey = `recharge-reverse:${id}:${parsed.data.idempotencyKey ?? crypto.randomUUID()}`;
      const result = await billingService.reverseRechargeOrder(id, { idempotencyKey });
      if (!result.idempotent) {
        await writeAudit({
          actorId: session.userId,
          tableName: "recharge_orders",
          recordId: id,
          action: 2,
          changedFields: ["status"],
          oldData: { status },
          newData: {
            status: "REFUNDED",
            disposition: "REVERSE",
            reversedMinor: result.reversedMinor.toString(),
            reason: reason ?? null,
          },
          requestId: req.headers.get("x-request-id"),
        });
      }
      return {
        id,
        status: "REFUNDED",
        action,
        idempotent: result.idempotent,
        reversedYuan: fenToYuan(result.reversedMinor),
      };
    }

    // 非资金状态处置：关单/标异常仅限待支付订单
    const target = action === "CLOSE" ? "EXPIRED" : "FAILED";
    if (status !== "PENDING") {
      throw new ApiError(
        ERROR_CODES.BAD_REQUEST,
        `当前状态 ${status} 不可执行 ${action}（关单/标异常仅限待支付订单；已支付请冲正）`
      );
    }
    const updated = await prisma.rechargeOrder.updateMany({
      where: { id, status: "PENDING" },
      data: { status: target },
    });
    if (updated.count === 0) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, "订单状态已变更，请刷新后重试");
    }

    await writeAudit({
      actorId: session.userId,
      tableName: "recharge_orders",
      recordId: id,
      action: 2,
      changedFields: ["status"],
      oldData: { status },
      newData: { status: target, disposition: action, reason: reason ?? null },
      requestId: req.headers.get("x-request-id"),
    });
    return { id, status: target, action };
  }
);
