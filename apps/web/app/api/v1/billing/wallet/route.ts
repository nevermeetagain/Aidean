/**
 * GET /api/v1/billing/wallet — 钱包概览（B.3.1）。
 *
 * requireUserApi → walletService.getWalletView：
 * {balanceYuan, heldYuan, availableYuan, currency}；未登录 10004/401。
 */
import { requireUserApi } from "../../../../../lib/features/auth/session";
import { walletService } from "../../../../../lib/features/wallet/service";
import { withApi } from "../../_lib/handler";

export const dynamic = "force-dynamic";

export const GET = withApi(async () => {
  const session = await requireUserApi();
  return walletService.getWalletView(session.userId);
});

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../_lib/method-not-allowed";
export const { POST, PUT, PATCH, DELETE, OPTIONS } = methodNotAllowed(["GET"]);
