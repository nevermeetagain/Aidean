/**
 * /api/v1/admin/holds — 在途冻结款（BalanceHold）只读分页查询（S5 / M6 / G3）。
 *
 * GET：requireAdminApi("admin.wallets.read") → AdminHoldsQuerySchema（page≥1/pageSize≤100 +
 *      status/userId/from/to 筛选）→ BalanceHold 只读分页投影。
 *      userId 经所属 Wallet 关联过滤（BalanceHold 无直接 userId）；currency 取自所属 Wallet。
 *      金额 amountMinor/capturedMinor 一律 BigInt→string（分）并附 fenToYuan 元口径，规避 JSON 抛错。
 *      本端点只读，禁写/禁删；释放/捕获资金走既有 billing capture/reverse 链，不在此新造。
 *
 * 索引依据（spec §5 零迁移默认 + N-1 假设）：BalanceHold 已建 @@index([status, expiresAt]) 与
 *      @@index([walletId])。按 status 过滤 + createdAt 倒序分页在常见运营数据量下可接受；
 *      若生产 EXPLAIN 证实排序走不到索引，再补 @@index([status, createdAt]) 并入唯一迁移。
 */
import { Prisma } from "@prisma/client";
import { prisma } from "../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../lib/features/auth/session";
import { ApiError, ERROR_CODES, formatZodMessage } from "../../_lib/errors";
import { withApi } from "../../_lib/handler";
import { AdminHoldsQuerySchema, fenToYuan } from "@aidean/shared";

export const dynamic = "force-dynamic";

/** 日期筛选：date-only 视为当日末（含），带时间戳原样解析（对齐日志中心口径）。 */
function toRangeEnd(v: string): Date {
  return v.length === 10 ? new Date(`${v}T23:59:59.999Z`) : new Date(v);
}

export const GET = withApi(async (req: Request) => {
  await requireAdminApi("admin.wallets.read");

  const url = new URL(req.url);
  const parsed = AdminHoldsQuerySchema.safeParse({
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    userId: url.searchParams.get("userId") ?? undefined,
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
  });
  if (!parsed.success) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, formatZodMessage(parsed.error.issues[0]));
  }
  const { page, pageSize, status, userId, from, to } = parsed.data;
  const skip = (page - 1) * pageSize;

  const where: Prisma.BalanceHoldWhereInput = {};
  if (status) where.status = status;
  if (userId) where.wallet = { is: { userId } };
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: toRangeEnd(to) } : {}),
    };
  }

  const [rows, total] = await Promise.all([
    prisma.balanceHold.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      include: { wallet: { select: { userId: true, currency: true } } },
    }),
    prisma.balanceHold.count({ where }),
  ]);

  return {
    items: rows.map((h) => ({
      id: h.id,
      userId: h.wallet.userId,
      currency: h.wallet.currency,
      amountMinor: h.amountMinor.toString(),
      amountYuan: fenToYuan(h.amountMinor),
      capturedMinor: h.capturedMinor.toString(),
      status: h.status as string,
      createdAt: h.createdAt.toISOString(),
      expiresAt: h.expiresAt.toISOString(),
    })),
    total,
    page,
    pageSize,
  };
});

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../_lib/method-not-allowed";
export const { POST, PUT, PATCH, DELETE, OPTIONS } = methodNotAllowed(["GET"]);
