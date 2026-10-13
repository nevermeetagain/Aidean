/**
 * /api/v1/admin/package-orders — 套餐订单只读查询（S6.1 财务全链·记录可见）。
 *
 * GET：requireAdminApi("admin.orders.read") → AdminPackageOrdersQuerySchema
 *      （status/userId 可选精确筛选；page≥1/pageSize≤50 封顶）→ PackageOrder 分页投影。
 *      套餐单价取关联 Package.priceMinor（BigInt→string + fenToYuan 元口径，规避 JSON 抛错）。
 *      本端点只读，禁写；处置动作走 /admin/package-orders/[id]（受控状态机）。
 */
import { prisma } from "../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../lib/features/auth/session";
import { ApiError, ERROR_CODES, formatZodMessage } from "../../_lib/errors";
import { withApi } from "../../_lib/handler";
import { AdminPackageOrdersQuerySchema, fenToYuan } from "@aidean/shared";

export const dynamic = "force-dynamic";

export const GET = withApi(async (req: Request) => {
  await requireAdminApi("admin.orders.read");
  const url = new URL(req.url);
  const parsed = AdminPackageOrdersQuerySchema.safeParse({
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    userId: url.searchParams.get("userId") ?? undefined,
  });
  if (!parsed.success) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, formatZodMessage(parsed.error.issues[0]));
  }
  const { page, pageSize, status, userId } = parsed.data;
  const skip = (page - 1) * pageSize;
  const where = {
    ...(status ? { status } : {}),
    ...(userId ? { userId } : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.packageOrder.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      include: {
        user: { select: { email: true } },
        package: { select: { title: true, priceMinor: true } },
      },
    }),
    prisma.packageOrder.count({ where }),
  ]);
  return {
    items: rows.map((o) => ({
      id: o.id,
      userEmail: o.user.email,
      packageTitle: o.package.title,
      priceMinor: o.package.priceMinor.toString(),
      priceYuan: fenToYuan(o.package.priceMinor),
      status: o.status as string,
      redeemedAt: o.redeemedAt.toISOString(),
      expiresAt: o.expiresAt ? o.expiresAt.toISOString() : null,
      createdAt: o.createdAt.toISOString(),
    })),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
});
