/**
 * /api/v1/admin/products — 产品管理（SubTask 2.4.2）。
 *
 * GET：requireAdminApi → 全量（含 DISABLED，按 sortOrder 升序），benefits Json 还原为数组。
 * POST：AdminProductCreateSchema 新建（slug 唯一冲突 400）；写 AuditLog(action=1)。
 */
import { Prisma } from "@prisma/client";

import { prisma } from "../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../lib/features/auth/session";
import { ApiError, ERROR_CODES, formatZodMessage } from "../../_lib/errors";
import { withApi } from "../../_lib/handler";
import { writeAudit } from "../../_lib/audit";
import { AdminProductCreateSchema } from "@aidean/shared";

export const dynamic = "force-dynamic";

function benefitsOf(v: unknown): string[] {
  return Array.isArray(v) ? (v.filter((x): x is string => typeof x === "string") as string[]) : [];
}

export const GET = withApi(async () => {
  await requireAdminApi("admin.products.read");
  const rows = await prisma.product.findMany({
    where: { deletedAt: null },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
  return {
    products: rows.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      displayName: p.displayName,
      category: p.category,
      tagline: p.tagline,
      description: p.description,
      badge: p.badge,
      benefits: benefitsOf(p.benefits),
      intro: p.intro ?? null,
      status: p.status as string,
      sortOrder: p.sortOrder,
    })),
  };
});

export const POST = withApi(async (req: Request) => {
  const session = await requireAdminApi("admin.products.write");
  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = AdminProductCreateSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, formatZodMessage(parsed.error.issues[0]));
  }
  const data = parsed.data;
  try {
    const product = await prisma.product.create({
      data: {
        slug: data.slug,
        name: data.name,
        displayName: data.displayName ?? null,
        category: data.category ?? null,
        tagline: data.tagline ?? null,
        description: data.description ?? null,
        badge: data.badge ?? null,
        benefits: data.benefits ?? [],
        intro: data.intro ?? undefined,
        status: data.status,
        sortOrder: data.sortOrder,
      },
      select: { id: true, slug: true, name: true },
    });
    await writeAudit({
      actorId: session.userId,
      tableName: "products",
      recordId: product.id,
      action: 1,
      changedFields: Object.keys(data),
      newData: product,
      requestId: req.headers.get("x-request-id"),
    });
    return { product };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, "产品 slug 已存在");
    }
    throw err;
  }
});

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../_lib/method-not-allowed";
export const { PUT, PATCH, DELETE, OPTIONS } = methodNotAllowed(["GET", "POST"]);
