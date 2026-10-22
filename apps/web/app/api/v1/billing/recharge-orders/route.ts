/**
 * /api/v1/billing/recharge-orders — 充值订单（B.3.1）。
 *
 * POST：requireUserApi → RechargeOrderCreateSchema（tierId+payMethod，fail→40000）
 *       → createRechargeOrder → {order, payment}（MVP 为 dev mock 渠道参数）。
 * GET ：requireUserApi → 我的订单列表（最近 20 条）。
 */
import { RechargeOrderCreateSchema } from "@aidean/shared";

import { requireUserApi } from "../../../../../lib/features/auth/session";
import { billingService } from "../../../../../lib/features/billing/service";
import { ApiError, ERROR_CODES } from "../../_lib/errors";
import { withApi } from "../../_lib/handler";

export const dynamic = "force-dynamic";

export const POST = withApi(async (req: Request) => {
  const session = await requireUserApi();
  const parsed = RechargeOrderCreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, "充值下单参数非法");
  }
  return billingService.createRechargeOrder(
    session.userId,
    parsed.data.tierId,
    parsed.data.payMethod
  );
});

export const GET = withApi(async () => {
  const session = await requireUserApi();
  return { orders: await billingService.listRechargeOrders(session.userId) };
});

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../_lib/method-not-allowed";
export const { PUT, PATCH, DELETE, OPTIONS } = methodNotAllowed(["GET", "POST"]);
