/**
 * /api/v1/admin/users — 用户管理列表 + 手工建档（T-2.2.3）。
 *
 * GET：requireAdminApi → 分页（page/pageSize≤50）+ email 模糊搜索；
 *      返回 id/email/nickname/tier/status/role/createdAt/lastLoginAt/钱包余额
 *      （BigInt 分经 fenToYuan 转元字符串，规避 JSON.stringify 抛错）。
 * POST：requireAdminApi → AdminUserCreateSchema → bcrypt 哈希密码 →
 *       事务创建 User + Wallet（余额 0）→ 写 AuditLog(tableName="users", action=1)。
 *       密码由 admin 指定（临时密码），用户首次登录后可自行修改。
 */
import { hashPassword } from "../../../../../lib/features/auth/password";

import { fenToYuan } from "@aidean/shared";

import { prisma } from "../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../lib/features/auth/session";
import { SALT_ROUNDS } from "../../../../../lib/features/auth/service";
import { ApiError, ERROR_CODES, formatZodMessage } from "../../_lib/errors";
import { withApi } from "../../_lib/handler";
import { writeAudit } from "../../_lib/audit";
import { AdminPageQuerySchema, AdminUserCreateSchema } from "@aidean/shared";

export const dynamic = "force-dynamic";

export const GET = withApi(async (req: Request) => {
  await requireAdminApi("admin.users.read");
  const url = new URL(req.url);
  const parsed = AdminPageQuerySchema.safeParse({
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
    q: url.searchParams.get("q") ?? undefined,
  });
  if (!parsed.success) throw new ApiError(ERROR_CODES.BAD_REQUEST, "分页参数非法");
  const { page, pageSize, q } = parsed.data;

  const where = {
    deletedAt: null,
    ...(q ? { email: { contains: q, mode: "insensitive" as const } } : {}),
  };
  const [rows, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        email: true,
        nickname: true,
        tier: true,
        status: true,
        role: true,
        createdAt: true,
        lastLoginAt: true,
        wallet: { select: { id: true, balanceMinor: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users: rows.map((u) => ({
      id: u.id,
      email: u.email,
      nickname: u.nickname,
      tier: u.tier as string,
      status: u.status as string,
      role: u.role as string,
      createdAt: u.createdAt.toISOString(),
      lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
      balanceYuan: fenToYuan(u.wallet?.balanceMinor ?? 0n),
      walletId: u.wallet?.id ?? null,
    })),
    total,
    page,
    pageSize,
  };
});

export const POST = withApi(async (req: Request) => {
  const session = await requireAdminApi("admin.users.write");

  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = AdminUserCreateSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, formatZodMessage(parsed.error.issues[0]));
  }
  const data = parsed.data;

  // 生成临时密码（admin 不接触明文密码；用户通过邮箱验证后自行设置）
  // 12 位随机字母数字组合
  const tempPassword =
    Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
  const passwordHash = await hashPassword(tempPassword, SALT_ROUNDS);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          password: passwordHash,
          nickname: data.nickname ?? null,
          tier: data.tier,
        },
        select: {
          id: true,
          email: true,
          nickname: true,
          tier: true,
          status: true,
          createdAt: true,
        },
      });
      await tx.wallet.create({
        data: { userId: user.id, balanceMinor: 0n },
      });
      return user;
    });

    await writeAudit({
      actorId: session.userId,
      tableName: "users",
      recordId: result.id,
      action: 1, // INSERT
      changedFields: ["email", "nickname", "tier", "wallet"],
      oldData: null,
      newData: { id: result.id, email: result.email, tier: result.tier },
      requestId: req.headers.get("x-request-id"),
    });

    // 临时密码仅在响应中返回一次（不入库明文、不记日志）
    return { user: result, tempPassword };
  } catch (err) {
    // Prisma unique constraint violation on email
    if (err instanceof Error && err.message.includes("P2002")) {
      throw new ApiError(ERROR_CODES.EMAIL_DUPLICATED, "邮箱已被注册");
    }
    throw err;
  }
});

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../_lib/method-not-allowed";
export const { PUT, PATCH, DELETE, OPTIONS } = methodNotAllowed(["GET", "POST"]);
