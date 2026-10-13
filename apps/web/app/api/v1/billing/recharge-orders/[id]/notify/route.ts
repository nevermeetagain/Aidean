/**
 * POST /api/v1/billing/recharge-orders/[id]/notify — 支付渠道回调（B.3.1）。
 *
 * 无会话依赖（渠道签名即凭证）：验签 fail→40005；订单不存在→40002；
 * 重复回调幂等返回当前状态。body: {payMethod, sign, tradeNo?}。
 */
import { PAY_METHODS } from "@aidean/shared";

import { billingService } from "../../../../../../../lib/features/billing/service";
import { ApiError, ERROR_CODES } from "../../../../_lib/errors";
import { withApi, type RouteContext } from "../../../../_lib/handler";

export const dynamic = "force-dynamic";

interface NotifyBody {
  payMethod?: string;
  sign?: string;
  tradeNo?: string;
}

export async function POST(req: Request, ctx: RouteContext): Promise<Response> {
  const { id } = await ctx.params;
  const handle = withApi(async (request) => {
    const body = (await request.json().catch(() => null)) as NotifyBody | null;
    if (
      !body ||
      !body.sign ||
      !body.payMethod ||
      !PAY_METHODS.includes(body.payMethod as (typeof PAY_METHODS)[number])
    ) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, "回调参数非法");
    }
    return billingService.handleChannelNotify(id, {
      payMethod: body.payMethod as "WECHAT" | "ALIPAY",
      sign: body.sign,
      tradeNo: body.tradeNo,
    });
  });
  return handle(req);
}
