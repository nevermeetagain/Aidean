/**
 * /api/v1/admin/products/[id] — 产品编辑/软删（SubTask 2.4.2 + add-subplatform-showcase-pages intro 透传）。
 *
 * PATCH：AdminProductPatchSchema 白名单；变更后 revalidatePath("/products") 与 /products/<slug>
 * （前台读库即时生效；intro 置 null 时以 Prisma.DbNull 显式清空 Json 列）。
 * DELETE：软删（deletedAt），同样 revalidatePath。均写 AuditLog。
 */
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { prisma } from "../../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../../lib/features/auth/session";
import { ApiError, ERROR_CODES, formatZodMessage } from "../../../_lib/errors";
import { withApi, type RouteContext } from "../../../_lib/handler";
import { writeAudit } from "../../../_lib/audit";
import { AdminProductPatchSchema } from "@aidean/shared";

export const dynamic = "force-dynamic";

export const PATCH = withApi(
  async (req: Request, ctx: RouteContext<{ id: string }>) => {
    const session = await requireAdminApi("admin.products.write");
    const { id } = await ctx.params;

    const before = await prisma.product.findUnique({ where: { id } });
    if (!before || before.deletedAt) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, "产品不存在");
    }

    const body = (await req.json().catch(() => null)) as unknown;
    const parsed = AdminProductPatchSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, formatZodMessage(parsed.error.issues[0]));
    }
    const d = parsed.data;

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(d.name !== undefined ? { name: d.name } : {}),
        ...(d.displayName !== undefined ? { displayName: d.displayName ?? null } : {}),
        ...(d.category !== undefined ? { category: d.category ?? null } : {}),
        ...(d.tagline !== undefined ? { tagline: d.tagline ?? null } : {}),
        ...(d.description !== undefined ? { description: d.description ?? null } : {}),
        ...(d.badge !== undefined ? { badge: d.badge ?? null } : {}),
        ...(d.benefits !== undefined ? { benefits: d.benefits } : {}),
        ...(d.intro !== undefined ? { intro: d.intro ?? Prisma.DbNull } : {}),
        ...(d.status !== undefined ? { status: d.status } : {}),
        ...(d.sortOrder !== undefined ? { sortOrder: d.sortOrder } : {}),
      },
      select: { id: true, slug: true, name: true, displayName: true, category: true, status: true },
    });

    revalidatePath("/");
    revalidatePath("/products");
    revalidatePath(`/products/${before.slug}`);
    await writeAudit({
      actorId: session.userId,
      tableName: "products",
      recordId: id,
      action: 2,
      changedFields: Object.keys(d),
      oldData: before,
      newData: product,
      requestId: req.headers.get("x-request-id"),
    });
    return { product };
  }
);

export const DELETE = withApi(
  async (req: Request, ctx: RouteContext<{ id: string }>) => {
    const session = await requireAdminApi("admin.products.write");
    const { id } = await ctx.params;

    const before = await prisma.product.findUnique({ where: { id } });
    if (!before || before.deletedAt) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, "产品不存在");
    }
    const product = await prisma.product.update({
      where: { id },
      data: { deletedAt: new Date(), status: "DISABLED" },
      select: { id: true, slug: true, deletedAt: true },
    });

    revalidatePath("/");
    revalidatePath("/products");
    revalidatePath(`/products/${before.slug}`);
    await writeAudit({
      actorId: session.userId,
      tableName: "products",
      recordId: id,
      action: 3,
      changedFields: ["deletedAt", "status"],
      oldData: before,
      newData: product,
      requestId: req.headers.get("x-request-id"),
    });
    return { deleted: true, slug: product.slug };
  }
);
