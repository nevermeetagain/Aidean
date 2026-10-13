/**
 * /api/v1/admin/vendors/[id] — 厂商编辑/软删（SubTask 2.3.1）。
 *
 * PATCH：AdminVendorPatchSchema 白名单（name/nameCn/priority/isActive；code 不可改）。
 * DELETE：软删（deletedAt=now + isActive=false）——有模型引用时禁物理删除，语义沿软删；
 *         软删后 GET 列表不再返回。均写 AuditLog。
 */
import { prisma } from "../../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../../lib/features/auth/session";
import { ApiError, ERROR_CODES, formatZodMessage } from "../../../_lib/errors";
import { withApi, type RouteContext } from "../../../_lib/handler";
import { writeAudit } from "../../../_lib/audit";
import { AdminVendorPatchSchema } from "@aidean/shared";

export const dynamic = "force-dynamic";

async function loadVendor(id: string) {
  const vendor = await prisma.vendor.findUnique({
    where: { id },
    select: {
      id: true,
      code: true,
      name: true,
      nameCn: true,
      priority: true,
      isActive: true,
      deletedAt: true,
    },
  });
  if (!vendor || vendor.deletedAt) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, "厂商不存在");
  }
  return vendor;
}

export const PATCH = withApi(
  async (req: Request, ctx: RouteContext<{ id: string }>) => {
    const session = await requireAdminApi("admin.vendors.write");
    const { id } = await ctx.params;
    const before = await loadVendor(id);

    const body = (await req.json().catch(() => null)) as unknown;
    const parsed = AdminVendorPatchSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, formatZodMessage(parsed.error.issues[0]));
    }

    const vendor = await prisma.vendor.update({
      where: { id },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.nameCn !== undefined ? { nameCn: parsed.data.nameCn ?? null } : {}),
        ...(parsed.data.priority !== undefined ? { priority: parsed.data.priority } : {}),
        ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
      },
      select: { id: true, code: true, name: true, priority: true, isActive: true },
    });

    await writeAudit({
      actorId: session.userId,
      tableName: "vendors",
      recordId: id,
      action: 2,
      changedFields: Object.keys(parsed.data),
      oldData: before,
      newData: vendor,
      requestId: req.headers.get("x-request-id"),
    });
    return { vendor };
  }
);

export const DELETE = withApi(
  async (req: Request, ctx: RouteContext<{ id: string }>) => {
    const session = await requireAdminApi("admin.vendors.write");
    const { id } = await ctx.params;
    const before = await loadVendor(id);

    // 软删：deletedAt 置位 + 停用；模型引用不阻断（软删语义）
    const vendor = await prisma.vendor.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
      select: { id: true, code: true, deletedAt: true },
    });

    await writeAudit({
      actorId: session.userId,
      tableName: "vendors",
      recordId: id,
      action: 3,
      changedFields: ["deletedAt", "isActive"],
      oldData: before,
      newData: vendor,
      requestId: req.headers.get("x-request-id"),
    });
    return { deleted: true, code: vendor.code };
  }
);
