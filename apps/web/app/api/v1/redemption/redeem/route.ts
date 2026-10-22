/**
 * /api/v1/redemption/redeem — 站内兑换（SubTask 3.4.1）。
 *
 * POST {code}：requireUserApi + Redis 固定窗口限流（user 维度 5 次/分钟）
 * + RedeemInputSchema 校验 → redemptionService.redeem（CAS 不双花）。
 */
import { requireUserApi } from "../../../../../lib/features/auth/session";
import { redemptionService } from "../../../../../lib/features/package/redemption/service";
import { checkFixedWindow } from "../../../../../lib/rate-limit";
import { ApiError, ERROR_CODES } from "../../_lib/errors";
import { withApi } from "../../_lib/handler";
import { RedeemInputSchema } from "@aidean/shared";

export const dynamic = "force-dynamic";

export const POST = withApi(async (req: Request) => {
  const session = await requireUserApi();

  const rl = await checkFixedWindow(`rl:redeem:${session.userId}`, 5, 60);
  if (!rl.allowed) {
    throw new ApiError(ERROR_CODES.TOO_MANY_REQUESTS, "兑换过于频繁，请稍后再试");
  }

  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = RedeemInputSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, "兑换码格式非法（8-64 位字母数字）");
  }

  const result = await redemptionService.redeem(parsed.data.code, session.userId);
  return {
    result:
      result.kind === "balance"
        ? { kind: "balance", balanceYuan: (Number(result.balanceMinor) / 100).toFixed(2) }
        : { kind: "package", packageTitle: result.packageTitle },
  };
});

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../_lib/method-not-allowed";
export const { GET, HEAD, PUT, PATCH, DELETE, OPTIONS } = methodNotAllowed(["POST"]);
