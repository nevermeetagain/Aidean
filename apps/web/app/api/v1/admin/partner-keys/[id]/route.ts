/**
 * /api/v1/admin/partner-keys/[id] — 卡商密钥启停（SubTask 3.5.3）。
 * PATCH {isActive} → 停用后该 Key 取码 401。写 AuditLog。
 */
import { prisma } from "../../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../../lib/features/auth/session";
import { ApiError, ERROR_CODES } from "../../../_lib/errors";
import { withApi, type RouteContext } from "../../../_lib/handler";
import { writeAudit } from "../../../_lib/audit";

export const dynamic = "force-dynamic";

export const PATCH = withApi(
  async (req: Request, ctx: RouteContext<{ id: string }>) => {
    const session = await requireAdminApi("admin.partner-keys.write");
    const { id } = await ctx.params;

    const body = (await req.json().catch(() => null)) as { isActive?: unknown } | null;
    if (typeof body?.isActive !== "boolean") {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, "isActive 须为布尔值");
    }
    const before = await prisma.partnerKey.findUnique({ where: { id }, select: { id: true, name: true, isActive: true } });
    if (!before) throw new ApiError(ERROR_CODES.BAD_REQUEST, "密钥不存在");

    const key = await prisma.partnerKey.update({
      where: { id },
      data: { isActive: body.isActive },
      select: { id: true, name: true, isActive: true },
    });

    await writeAudit({
      actorId: session.userId,
      tableName: "partner_keys",
      recordId: id,
      action: 2,
      changedFields: ["isActive"],
      oldData: before,
      newData: key,
      requestId: req.headers.get("x-request-id"),
    });
    return { key };
  }
);

/**
 * DELETE — 物理删除卡商密钥（须先停用）。
 * 仅允许删除 isActive=false 的密钥，防止误删在线密钥。
 */
export const DELETE = withApi(
  async (req: Request, ctx: RouteContext<{ id: string }>) => {
    const session = await requireAdminApi("admin.partner-keys.write");
    const { id } = await ctx.params;

    const key = await prisma.partnerKey.findUnique({
      where: { id },
      select: { id: true, name: true, isActive: true, prefix: true },
    });
    if (!key) throw new ApiError(ERROR_CODES.BAD_REQUEST, "密钥不存在");
    if (key.isActive) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, "仅可删除已停用的密钥，请先停用");
    }

    await prisma.partnerKey.delete({ where: { id } });

    await writeAudit({
      actorId: session.userId,
      tableName: "partner_keys",
      recordId: id,
      action: 3,
      changedFields: ["deleted"],
      oldData: { name: key.name, prefix: key.prefix, isActive: key.isActive },
      requestId: req.headers.get("x-request-id"),
    });
    return { deleted: true };
  }
);
