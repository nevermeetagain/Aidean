/**
 * /api/v1/partner/codes — 卡商取码 API（SubTask 3.5.2）。
 *
 * GET ?count≤100&targetType=BALANCE|PACKAGE&balanceMinor：
 * X-API-Key → SHA-256 比对 PartnerKey.keyHash（isActive）→ Redis 限流 60 次/分（key 维度）
 * → redemptionService.issueToPartner（ENABLED→ISSUED 出库明文）→ 更新 lastUsedAt。
 */
import { prisma } from "../../../../../lib/db/prisma";
import { redemptionService } from "../../../../../lib/features/package/redemption/service";
import { checkFixedWindow } from "../../../../../lib/rate-limit";
import { ApiError, ERROR_CODES } from "../../_lib/errors";
import { withApi } from "../../_lib/handler";
import { authenticatePartnerKey } from "../../_lib/partner-auth";

export const dynamic = "force-dynamic";

export const GET = withApi(async (req: Request) => {
  const key = await authenticatePartnerKey(req);

  const rl = await checkFixedWindow(`rl:partner:${key.id}`, 60, 60);
  if (!rl.allowed) {
    throw new ApiError(ERROR_CODES.TOO_MANY_REQUESTS, "请求过于频繁");
  }

  const url = new URL(req.url);
  const count = Number(url.searchParams.get("count") ?? "1");
  if (!Number.isInteger(count) || count < 1 || count > 100) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, "count 须为 1-100 整数");
  }
  const targetType = url.searchParams.get("targetType") ?? "BALANCE";
  if (targetType !== "BALANCE" && targetType !== "PACKAGE") {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, "targetType 仅允许 BALANCE|PACKAGE");
  }
  const balanceParam = url.searchParams.get("balanceMinor");
  let balanceMinor: bigint | undefined;
  if (balanceParam !== null) {
    // 先格式校验再转换：BigInt("abc") 会抛 SyntaxError → 50000，须收敛为参数 40000
    if (!/^\d+$/.test(balanceParam)) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, "balanceMinor 须为正整数（分）");
    }
    balanceMinor = BigInt(balanceParam);
    if (balanceMinor <= 0n) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, "balanceMinor 须为正整数（分）");
    }
  }

  const { codes } = await redemptionService.issueToPartner({
    targetType,
    balanceMinor,
    count,
  });

  await prisma.partnerKey.update({
    where: { id: key.id },
    data: { lastUsedAt: new Date() },
  });

  return { codes, count: codes.length, targetType };
});

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../_lib/method-not-allowed";
export const { POST, PUT, PATCH, DELETE, OPTIONS } = methodNotAllowed(["GET"]);
