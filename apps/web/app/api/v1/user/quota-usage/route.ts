/**
 * /api/v1/user/quota-usage — 免费额度用量视图（Task A.2.2）。
 *
 * GET：requireUserApi → 按账户 tier 过滤生效免费额度配置，
 * usedTokens 读 user_quota_usages 当期实况（与 gateway FREE_QUOTA 记账同口径），
 * nextResetAt 按 refreshCycle 推算。
 */
import { requireUserApi } from "../../../../../lib/features/auth/session";
import { userService } from "../../../../../lib/features/user/service";
import { withApi } from "../../_lib/handler";

export const dynamic = "force-dynamic";

export const GET = withApi(async () => {
  const session = await requireUserApi();
  return { quotas: await userService.quotaUsage(session.userId) };
});
