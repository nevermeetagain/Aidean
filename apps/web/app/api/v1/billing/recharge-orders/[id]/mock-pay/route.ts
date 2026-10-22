/**
 * POST /api/v1/billing/recharge-orders/[id]/mock-pay — dev 模拟支付（B.3.1）。
 *
 * 仅非生产可用（NODE_ENV=production 抛 40000「支付渠道尚未接入」）；
 * requireUserApi 本人订单 → 服务端代拟渠道签名走标准回调入账链路。
 */
import { requireUserApi } from "../../../../../../../lib/features/auth/session";
import { billingService } from "../../../../../../../lib/features/billing/service";
import { withApi, type RouteContext } from "../../../../_lib/handler";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: RouteContext): Promise<Response> {
  const { id } = await ctx.params;
  return await withApi(async (request) => {
    const session = await requireUserApi();
    return billingService.devMockPay(id, session.userId);
  })(req);
}

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../../../_lib/method-not-allowed";
export const { GET, HEAD, PUT, PATCH, DELETE, OPTIONS } = methodNotAllowed(["POST"]);
