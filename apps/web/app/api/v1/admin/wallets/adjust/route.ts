/**
 * /api/v1/admin/wallets/adjust — 管理端余额调账（SubTask 3.6.1）。
 *
 * POST：requireAdminApi + AdminWalletAdjustSchema（金额非 0、备注必填）
 * → billingService.adjust（ledger ADJUST 单录 + 乐观锁；幂等键 admin-adjust:{walletId}:{key}）
 * → 写 AuditLog(tableName="wallets", action=2)。
 */
import { prisma } from "../../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../../lib/features/auth/session";
import { billingService } from "../../../../../../lib/features/billing/service";
import { ApiError, ERROR_CODES, formatZodMessage } from "../../../_lib/errors";
import { withApi } from "../../../_lib/handler";
import { writeAudit } from "../../../_lib/audit";
import { AdminWalletAdjustSchema, fenToYuan } from "@aidean/shared";

export const dynamic = "force-dynamic";

export const POST = withApi(async (req: Request) => {
  const session = await requireAdminApi("admin.wallets.write");
  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = AdminWalletAdjustSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, formatZodMessage(parsed.error.issues[0]));
  }
  const d = parsed.data;

  const wallet = await prisma.wallet.findUnique({
    where: { id: d.walletId },
    select: { id: true, userId: true, balanceMinor: true },
  });
  if (!wallet) throw new ApiError(ERROR_CODES.BAD_REQUEST, "钱包不存在");

  const idempotencyKey = `admin-adjust:${d.walletId}:${d.idempotencyKey ?? crypto.randomUUID()}`;
  const result = await billingService.adjust({
    walletId: d.walletId,
    amountMinor: d.amountMinor,
    idempotencyKey,
  });

  await writeAudit({
    actorId: session.userId,
    tableName: "wallets",
    recordId: d.walletId,
    action: 2,
    changedFields: ["balanceMinor"],
    oldData: { balanceMinor: wallet.balanceMinor },
    newData: { balanceMinor: result.balanceMinor, amountMinor: d.amountMinor.toString(), note: d.note },
    requestId: req.headers.get("x-request-id"),
  });

  return {
    balanceYuan: fenToYuan(result.balanceMinor),
    idempotent: result.idempotent,
  };
});

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../../_lib/method-not-allowed";
export const { GET, HEAD, PUT, PATCH, DELETE, OPTIONS } = methodNotAllowed(["POST"]);
