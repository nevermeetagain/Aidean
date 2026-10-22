/**
 * /api/v1/partner/codes/status — 卡商查码（对账，SubTask 3.5.2）。
 * GET ?code=…：X-API-Key 鉴权；仅返回状态面（status/targetType/redeemedAt），不返回面额。
 */
import { prisma } from "../../../../../../lib/db/prisma";
import { ApiError, ERROR_CODES } from "../../../_lib/errors";
import { withApi } from "../../../_lib/handler";
import { authenticatePartnerKey } from "../../../_lib/partner-auth";

export const dynamic = "force-dynamic";

export const GET = withApi(async (req: Request) => {
  await authenticatePartnerKey(req);

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (!code || !/^[A-Za-z0-9_-]{8,64}$/.test(code)) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, "code 参数非法");
  }
  const r = await prisma.redemption.findUnique({
    where: { code },
    select: { code: true, status: true, targetType: true, redeemedAt: true },
  });
  if (!r) throw new ApiError(ERROR_CODES.BAD_REQUEST, "兑换码不存在");
  return {
    code: r.code,
    status: r.status as string,
    targetType: r.targetType as string,
    redeemedAt: r.redeemedAt ? r.redeemedAt.toISOString() : null,
  };
});

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../../_lib/method-not-allowed";
export const { POST, PUT, PATCH, DELETE, OPTIONS } = methodNotAllowed(["GET"]);
