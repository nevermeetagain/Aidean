/**
 * GET /api/v1/billing/ledger — 流水分页 + 日期分组（B.3.1）。
 *
 * requireUserApi → LedgerQuerySchema 校验 query（page/pageSize/entryType，
 * fail→40000）→ billingService.getLedgerPage（仅本人钱包数据）。
 */
import { LedgerQuerySchema } from "@aidean/shared";

import { requireUserApi } from "../../../../../lib/features/auth/session";
import { billingService } from "../../../../../lib/features/billing/service";
import { ApiError, ERROR_CODES } from "../../_lib/errors";
import { withApi } from "../../_lib/handler";

export const dynamic = "force-dynamic";

export const GET = withApi(async (req: Request) => {
  const session = await requireUserApi();
  const url = new URL(req.url);
  const parsed = LedgerQuerySchema.safeParse({
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
    entryType: url.searchParams.get("entryType") ?? undefined,
  });
  if (!parsed.success) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, "流水查询参数非法");
  }
  return billingService.getLedgerPage(session.userId, parsed.data);
});

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../_lib/method-not-allowed";
export const { POST, PUT, PATCH, DELETE, OPTIONS } = methodNotAllowed(["GET"]);
