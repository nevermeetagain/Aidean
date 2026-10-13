/**
 * /api/v1/admin/redemption-codes/[id] — 单码禁用（SubTask 3.3.1）。
 * PATCH {status:"DISABLED"} → redemptionService.disableCode；已用/已禁返回 changed=false。
 */
import { requireAdminApi } from "../../../../../../lib/features/auth/session";
import { ApiError, ERROR_CODES } from "../../../_lib/errors";
import { withApi, type RouteContext } from "../../../_lib/handler";
import { writeAudit } from "../../../_lib/audit";
import { redemptionService } from "../../../../../../lib/features/package/redemption/service";
import { prisma } from "../../../../../../lib/db/prisma";

export const dynamic = "force-dynamic";

export const PATCH = withApi(
  async (req: Request, ctx: RouteContext<{ id: string }>) => {
    const session = await requireAdminApi("admin.redemptions.write");
    const { id } = await ctx.params;

    const body = (await req.json().catch(() => null)) as { status?: unknown } | null;
    if (body?.status !== "DISABLED") {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, "仅支持 status=DISABLED（禁用兑换码）");
    }
    const changed = await redemptionService.disableCode(id);

    await writeAudit({
      actorId: session.userId,
      tableName: "redemptions",
      recordId: id,
      action: 2,
      changedFields: changed ? ["status"] : [],
      newData: { status: changed ? "DISABLED" : "unchanged" },
      requestId: req.headers.get("x-request-id"),
    });
    return { changed };
  }
);

/**
 * DELETE — 物理删除兑换码记录（须先禁用）。
 * 仅允许删除状态为 DISABLED/EXPIRED/USED 的码，防止误删可用码。
 */
export const DELETE = withApi(
  async (req: Request, ctx: RouteContext<{ id: string }>) => {
    const session = await requireAdminApi("admin.redemptions.write");
    const { id } = await ctx.params;

    const code = await prisma.redemption.findUnique({
      where: { id },
      select: { id: true, code: true, status: true },
    });
    if (!code) throw new ApiError(ERROR_CODES.MODEL_NOT_FOUND, "兑换码不存在");
    if (code.status === "ENABLED" || code.status === "ISSUED") {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, "仅可删除已禁用/已过期/已使用的兑换码");
    }

    await prisma.redemption.delete({ where: { id } });

    await writeAudit({
      actorId: session.userId,
      tableName: "redemptions",
      recordId: id,
      action: 3,
      changedFields: ["deleted"],
      oldData: { code: code.code, status: code.status },
      requestId: req.headers.get("x-request-id"),
    });
    return { deleted: true };
  }
);
