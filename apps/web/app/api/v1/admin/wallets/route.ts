/**
 * /api/v1/admin/wallets — 钱包管理（T-2.4.2）。
 *
 * GET：分页列表 + status 过滤；BigInt → string 序列化。
 * PATCH：冻结/解冻钱包（status: ACTIVE | FROZEN）。
 */

import { prisma } from "../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../lib/features/auth/session";
import { ApiError, ERROR_CODES, formatZodMessage } from "../../_lib/errors";
import { withApi, type RouteContext } from "../../_lib/handler";
import { writeAudit } from "../../_lib/audit";
import { z } from "zod";

export const dynamic = "force-dynamic";

const WalletListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["ACTIVE", "FROZEN", "CLOSED"]).optional(),
});

const WalletPatchSchema = z.object({
  status: z.enum(["ACTIVE", "FROZEN"]),
});

export const GET = withApi(async (req: Request) => {
  await requireAdminApi("admin.wallets.read");

  const url = new URL(req.url);
  const parsed = WalletListQuerySchema.safeParse({
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
  });
  if (!parsed.success) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, formatZodMessage(parsed.error.issues[0]));
  }
  const { page, pageSize, status } = parsed.data;

  const where = status ? { status } : {};
  const [items, total] = await Promise.all([
    prisma.wallet.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: { select: { email: true, nickname: true } },
      },
    }),
    prisma.wallet.count({ where }),
  ]);

  return {
    items: items.map((w) => ({
      id: w.id,
      userId: w.userId,
      userEmail: w.user.email,
      userName: w.user.nickname,
      currency: w.currency,
      balanceMinor: w.balanceMinor.toString(),
      heldMinor: w.heldMinor.toString(),
      postedDebitsMinor: w.postedDebitsMinor.toString(),
      postedCreditsMinor: w.postedCreditsMinor.toString(),
      status: w.status as string,
      lockVersion: w.lockVersion,
      createdAt: w.createdAt.toISOString(),
    })),
    total,
    page,
    pageSize,
  };
});

export const PATCH = withApi(async (req: Request, ctx: RouteContext) => {
  const session = await requireAdminApi("admin.wallets.write");
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, "缺少 userId 参数");
  }

  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = WalletPatchSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, formatZodMessage(parsed.error.issues[0]));
  }
  const { status } = parsed.data;

  const before = await prisma.wallet.findUnique({
    where: { userId },
    select: { id: true, status: true, userId: true },
  });
  if (!before) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, "钱包不存在");
  }

  const updated = await prisma.wallet.update({
    where: { userId },
    data: { status },
    select: { id: true, status: true },
  });

  await writeAudit({
    actorId: session.userId,
    tableName: "wallets",
    recordId: before.id,
    action: 2,
    changedFields: ["status"],
    oldData: { status: before.status },
    newData: { status: updated.status },
    requestId: req.headers.get("x-request-id"),
  });

  return { wallet: updated };
});
