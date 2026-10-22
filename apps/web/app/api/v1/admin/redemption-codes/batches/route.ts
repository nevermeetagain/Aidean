/**
 * /api/v1/admin/redemption-codes/batches — 批次生成（SubTask 3.3.1）。
 *
 * POST：AdminRedemptionBatchCreateSchema → redemptionService.generateBatch；
 *       响应一次性返回明文码数组（前端渲染 CSV 导出，服务端不另存副本）。
 *       写 AuditLog(tableName="redemptions", action=1, recordId=batchNo)。
 */
import { requireAdminApi } from "../../../../../../lib/features/auth/session";
import { ApiError, ERROR_CODES, formatZodMessage } from "../../../_lib/errors";
import { withApi } from "../../../_lib/handler";
import { writeAudit } from "../../../_lib/audit";
import { redemptionService } from "../../../../../../lib/features/package/redemption/service";
import { AdminRedemptionBatchCreateSchema } from "@aidean/shared";

export const dynamic = "force-dynamic";

export const POST = withApi(async (req: Request) => {
  const session = await requireAdminApi("admin.redemptions.write");
  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = AdminRedemptionBatchCreateSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, formatZodMessage(parsed.error.issues[0]));
  }
  const d = parsed.data;

  const { batchNo, codes } = await redemptionService.generateBatch({
    name: d.name ?? null,
    targetType: d.targetType,
    balanceMinor: d.balanceMinor,
    packageId: d.packageId,
    count: d.count,
    prefix: d.prefix,
    expiresAt: d.expiresAt ?? null,
  });

  await writeAudit({
    actorId: session.userId,
    tableName: "redemptions",
    recordId: batchNo,
    action: 1,
    changedFields: ["batchNo", "targetType", "count", "prefix"],
    newData: { batchNo, count: d.count, targetType: d.targetType, balanceMinor: d.balanceMinor?.toString() },
    requestId: req.headers.get("x-request-id"),
  });

  return { batchNo, codes, count: codes.length };
});

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../../_lib/method-not-allowed";
export const { GET, HEAD, PUT, PATCH, DELETE, OPTIONS } = methodNotAllowed(["POST"]);
