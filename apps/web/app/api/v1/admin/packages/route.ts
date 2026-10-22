/**
 * /api/v1/admin/packages — 套餐管理（SubTask 3.2.1）。
 *
 * GET：套餐全量（含 DISABLED）+ 已兑换订单计数；priceMinor 转字符串。
 * POST：AdminPackageCreateSchema 新建；写 AuditLog(action=1)。
 */
import { prisma } from "../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../lib/features/auth/session";
import { ApiError, ERROR_CODES, formatZodMessage } from "../../_lib/errors";
import { withApi } from "../../_lib/handler";
import { writeAudit } from "../../_lib/audit";
import { AdminPackageCreateSchema } from "@aidean/shared";

export const dynamic = "force-dynamic";

export const GET = withApi(async () => {
  await requireAdminApi("admin.packages.read");
  const [rows, orders] = await prisma.$transaction([
    prisma.package.findMany({
      where: { deletedAt: null },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      include: { _count: { select: { orders: true } } },
    }),
    prisma.packageOrder.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        status: true,
        redeemedAt: true,
        expiresAt: true,
        user: { select: { email: true } },
        package: { select: { title: true } },
      },
    }),
  ]);
  return {
    packages: rows.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      priceMinor: p.priceMinor.toString(),
      durationHours: p.durationHours,
      benefits: Array.isArray(p.benefits)
        ? (p.benefits.filter((x): x is string => typeof x === "string") as string[])
        : [],
      status: p.status as string,
      sortOrder: p.sortOrder,
      redeemedCount: p._count.orders,
    })),
    orders: orders.map((o) => ({
      id: o.id,
      userEmail: o.user.email,
      packageTitle: o.package.title,
      status: o.status as string,
      redeemedAt: o.redeemedAt.toISOString(),
      expiresAt: o.expiresAt ? o.expiresAt.toISOString() : null,
    })),
  };
});

export const POST = withApi(async (req: Request) => {
  const session = await requireAdminApi("admin.packages.write");
  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = AdminPackageCreateSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, formatZodMessage(parsed.error.issues[0]));
  }
  const d = parsed.data;
  // 注：Package 模型无任何唯一约束（除自增主键），create 不可能触发 P2002——
  // 此前的「套餐已存在」catch 分支为死代码，已移除；唯一性/停用语义由管理页 + DELETE 约束。
  const pkg = await prisma.package.create({
    data: {
      title: d.title,
      description: d.description ?? null,
      priceMinor: d.priceMinor,
      durationHours: d.durationHours ?? null,
      benefits: d.benefits ?? [],
      status: d.status,
      sortOrder: d.sortOrder,
    },
    select: { id: true, title: true },
  });

  await writeAudit({
    actorId: session.userId,
    tableName: "packages",
    recordId: pkg.id,
    action: 1,
    changedFields: Object.keys(d),
    newData: { ...pkg, priceMinor: d.priceMinor.toString() },
    requestId: req.headers.get("x-request-id"),
  });
  return { package: pkg };
});

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../_lib/method-not-allowed";
export const { PUT, PATCH, DELETE, OPTIONS } = methodNotAllowed(["GET", "POST"]);
