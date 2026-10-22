/**
 * /api/v1/admin/orders — 订单/流水只读查询（P0，蓝图 §8.5 订单与流水只读）。
 *
 * GET：requireAdminApi → AdminOrdersQuerySchema（type=RECHARGE|PACKAGE_ORDER|LEDGER 缺省 RECHARGE；
 *      userId 可选精确筛选；page≥1/pageSize≤50）→ 单表只读分页投影。
 *     金额一律 BigInt→string（minor）并附 fenToYuan 元口径，规避 JSON.stringify 抛错。
 *     本端点只读，禁写；写操作走既有业务端点。
 */
import { prisma } from "../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../lib/features/auth/session";
import { ApiError, ERROR_CODES, formatZodMessage } from "../../_lib/errors";
import { withApi } from "../../_lib/handler";
import { AdminOrdersQuerySchema, fenToYuan } from "@aidean/shared";

export const dynamic = "force-dynamic";

export const GET = withApi(async (req: Request) => {
  await requireAdminApi("admin.orders.read");
  const url = new URL(req.url);
  const parsed = AdminOrdersQuerySchema.safeParse({
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
    type: url.searchParams.get("type") ?? undefined,
    userId: url.searchParams.get("userId") ?? undefined,
  });
  if (!parsed.success) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, formatZodMessage(parsed.error.issues[0]));
  }
  const { page, pageSize, type, userId } = parsed.data;
  const skip = (page - 1) * pageSize;

  if (type === "RECHARGE") {
    const where = userId ? { userId } : {};
    const [rows, total] = await prisma.$transaction([
      prisma.rechargeOrder.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
        include: { user: { select: { email: true } } },
      }),
      prisma.rechargeOrder.count({ where }),
    ]);
    return {
      type,
      orders: rows.map((o) => ({
        id: o.id,
        userEmail: o.user.email,
        amountMinor: o.amountMinor.toString(),
        amountYuan: fenToYuan(o.amountMinor),
        bonusAmountMinor: o.bonusAmountMinor.toString(),
        totalAmountMinor: o.totalAmountMinor.toString(),
        totalYuan: fenToYuan(o.totalAmountMinor),
        payMethod: o.payMethod as string,
        status: o.status as string,
        externalTradeNo: o.externalTradeNo,
        paidAt: o.paidAt ? o.paidAt.toISOString() : null,
        createdAt: o.createdAt.toISOString(),
      })),
      total,
      page,
      pageSize,
    };
  }

  if (type === "PACKAGE_ORDER") {
    const where = userId ? { userId } : {};
    const [rows, total] = await prisma.$transaction([
      prisma.packageOrder.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
        include: { user: { select: { email: true } }, package: { select: { title: true } } },
      }),
      prisma.packageOrder.count({ where }),
    ]);
    return {
      type,
      orders: rows.map((o) => ({
        id: o.id,
        userEmail: o.user.email,
        packageTitle: o.package.title,
        status: o.status as string,
        redeemedAt: o.redeemedAt.toISOString(),
        expiresAt: o.expiresAt ? o.expiresAt.toISOString() : null,
        createdAt: o.createdAt.toISOString(),
      })),
      total,
      page,
      pageSize,
    };
  }

  // LEDGER：只读账本流水（不可变表，绝不 UPDATE/DELETE）
  const where = userId ? { wallet: { is: { userId } } } : {};
  const [rows, total] = await prisma.$transaction([
    prisma.ledgerEntry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      include: { wallet: { select: { userId: true, user: { select: { email: true } } } } },
    }),
    prisma.ledgerEntry.count({ where }),
  ]);
  return {
    type,
    entries: rows.map((e) => ({
      id: e.id,
      walletId: e.walletId,
      userEmail: e.wallet.user.email,
      direction: e.direction as string,
      amountMinor: e.amountMinor.toString(),
      amountYuan: fenToYuan(e.direction === "DEBIT" ? -e.amountMinor : e.amountMinor),
      entryType: e.entryType as string,
      status: e.status as string,
      sourceType: e.sourceType,
      sourceId: e.sourceId,
      effectiveAt: e.effectiveAt.toISOString(),
      createdAt: e.createdAt.toISOString(),
    })),
    total,
    page,
    pageSize,
  };
});

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../_lib/method-not-allowed";
export const { POST, PUT, PATCH, DELETE, OPTIONS } = methodNotAllowed(["GET"]);
