/**
 * GET /api/v1/internal/billing/wallet?userId= — 服务间钱包/套餐查询（M-SSO P1.8）。
 * 鉴权：client 凭据（Basic/form）+ scope `wallet:read`；非 Cookie 用户面端点。
 * 返回：用户 tier/status 快照 + 实时钱包视图（balance/held/available，元）。
 * 子平台展示层经此端点获取主平台余额与权益（不做本地持久化，永远实时）。
 */
import { prisma } from "../../../../../../lib/db/prisma";
import { billingService } from "../../../../../../lib/features/billing/service";
import { oidcClientService } from "../../../../../../lib/features/oauth/clients";
import { ApiError, ERROR_CODES } from "../../../_lib/errors";
import { withApi } from "../../../_lib/handler";

export const dynamic = "force-dynamic";

export const GET = withApi(async (req: Request) => {
  const url = new URL(req.url);
  const form = new URLSearchParams();
  const client = await oidcClientService.authenticateClient(req, form);
  if (!client) {
    throw new ApiError(ERROR_CODES.UNAUTHENTICATED, "client 认证失败");
  }
  if (!oidcClientService.hasScope(client, "wallet:read")) {
    throw new ApiError(ERROR_CODES.FORBIDDEN_CLIENT_SCOPE, "缺少 wallet:read 授权范围");
  }

  const userId = url.searchParams.get("userId") ?? "";
  if (!userId) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, "userId 必填");
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, tier: true, status: true, nickname: true },
  });
  if (!user) {
    throw new ApiError(ERROR_CODES.USER_NOT_FOUND, "用户不存在");
  }

  const wallet = await billingService.getWalletView(userId);
  return {
    user: { id: user.id, tier: user.tier, status: user.status, nickname: user.nickname },
    wallet,
  };
});
