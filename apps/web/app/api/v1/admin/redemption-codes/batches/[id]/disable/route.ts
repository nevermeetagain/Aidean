/**
 * /api/v1/admin/redemption-codes/batches/[batchNo]/disable — 整批禁用（P1）。
 *
 * POST：requireAdminApi → redemptionService.disableBatch（仅 ENABLED/ISSUED 可禁，其余状态不动）
 *       → 写 AuditLog(tableName="redemptions", action=2, recordId=batchNo)。
 * 说明：批次禁用为幂等操作（无可用码时返回 0）；单码禁用走 /redemption-codes/[id] PATCH。
 */
import { requireAdminApi } from "../../../../../../../../lib/features/auth/session";
import { ApiError, ERROR_CODES } from "../../../../../_lib/errors";
import { withApi, type RouteContext } from "../../../../../_lib/handler";
import { writeAudit } from "../../../../../_lib/audit";
import { redemptionService } from "../../../../../../../../lib/features/package/redemption/service";

export const dynamic = "force-dynamic";

export const POST = withApi(
  async (req: Request, ctx: RouteContext<{ id: string }>) => {
    const session = await requireAdminApi("admin.redemptions.write");
    const batchNo = (await ctx.params).id?.trim() ?? "";
    if (!batchNo || batchNo.length > 64) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, "batchNo 非法（1-64 位）");
    }

    const disabled = await redemptionService.disableBatch(batchNo);

    await writeAudit({
      actorId: session.userId,
      tableName: "redemptions",
      recordId: batchNo,
      action: 2,
      changedFields: ["status"],
      newData: { batchNo, disabled },
      requestId: req.headers.get("x-request-id"),
    });

    return { batchNo, disabled };
  }
);

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../../../../_lib/method-not-allowed";
export const { GET, HEAD, PUT, PATCH, DELETE, OPTIONS } = methodNotAllowed(["POST"]);
