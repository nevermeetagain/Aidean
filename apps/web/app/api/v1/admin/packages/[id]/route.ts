/**
 * /api/v1/admin/packages/[id] — 套餐编辑/软删（SubTask 3.2.1）。
 *
 * PATCH：AdminPackagePatchSchema 白名单。
 * DELETE：软删；已被兑换码引用（redemptions 非空）时仅置 DISABLED（不出新码）。
 */
import { prisma } from "../../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../../lib/features/auth/session";
import { ApiError, ERROR_CODES, formatZodMessage } from "../../../_lib/errors";
import { withApi, type RouteContext } from "../../../_lib/handler";
import { writeAudit } from "../../../_lib/audit";
import { AdminPackagePatchSchema } from "@aidean/shared";

export const dynamic = "force-dynamic";

export const PATCH = withApi(
  async (req: Request, ctx: RouteContext<{ id: string }>) => {
    const session = await requireAdminApi("admin.packages.write");
    const { id } = await ctx.params;

    const before = await prisma.package.findUnique({ where: { id } });
    if (!before || before.deletedAt) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, "套餐不存在");
    }
    const body = (await req.json().catch(() => null)) as unknown;
    const parsed = AdminPackagePatchSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, formatZodMessage(parsed.error.issues[0]));
    }
    const d = parsed.data;

    const pkg = await prisma.package.update({
      where: { id },
      data: {
        ...(d.title !== undefined ? { title: d.title } : {}),
        ...(d.description !== undefined ? { description: d.description ?? null } : {}),
        ...(d.priceMinor !== undefined ? { priceMinor: d.priceMinor } : {}),
        ...(d.durationHours !== undefined ? { durationHours: d.durationHours ?? null } : {}),
        ...(d.benefits !== undefined ? { benefits: d.benefits } : {}),
        ...(d.status !== undefined ? { status: d.status } : {}),
        ...(d.sortOrder !== undefined ? { sortOrder: d.sortOrder } : {}),
      },
      select: { id: true, title: true, status: true },
    });

    await writeAudit({
      actorId: session.userId,
      tableName: "packages",
      recordId: id,
      action: 2,
      changedFields: Object.keys(d),
      oldData: before,
      newData: pkg,
      requestId: req.headers.get("x-request-id"),
    });
    return { package: pkg };
  }
);

export const DELETE = withApi(
  async (req: Request, ctx: RouteContext<{ id: string }>) => {
    const session = await requireAdminApi("admin.packages.write");
    const { id } = await ctx.params;

    const before = await prisma.package.findUnique({
      where: { id },
      include: { _count: { select: { redemptions: true } } },
    });
    if (!before || before.deletedAt) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, "套餐不存在");
    }

    // 有码引用：仅停用（保持码可对账）；无引用：软删
    const pkg =
      before._count.redemptions > 0
        ? await prisma.package.update({
            where: { id },
            data: { status: "DISABLED" },
            select: { id: true, title: true, status: true, deletedAt: true },
          })
        : await prisma.package.update({
            where: { id },
            data: { deletedAt: new Date(), status: "DISABLED" },
            select: { id: true, title: true, status: true, deletedAt: true },
          });

    await writeAudit({
      actorId: session.userId,
      tableName: "packages",
      recordId: id,
      action: 3,
      changedFields: before._count.redemptions > 0 ? ["status"] : ["deletedAt", "status"],
      oldData: before,
      newData: pkg,
      requestId: req.headers.get("x-request-id"),
    });
    return { deleted: before._count.redemptions === 0, disabled: before._count.redemptions > 0 };
  }
);

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../../_lib/method-not-allowed";
export const { GET, HEAD, POST, PUT, OPTIONS } = methodNotAllowed(["PATCH", "DELETE"]);
