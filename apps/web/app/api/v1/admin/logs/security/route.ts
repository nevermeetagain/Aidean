/**
 * /api/v1/admin/logs/security — 安全事件只读查询（S5 日志中心）。
 *
 * GET：requireAdminApi("admin.logs.read") → AdminSecurityLogsQuerySchema（kind=TOKEN|CONSENT）
 *   · TOKEN：RefreshToken 会话/轮换链视图，派生状态（ACTIVE/ROTATED/REVOKED/EXPIRED）+ 筛选。
 *   · CONSENT：OidcUserConsent 用户对第三方 client 的授权同意记录。
 *   仅读侧，不返回 jti 原文以外的敏感串；令牌本身不可经此端点撤销/删除（撤销走认证流程）。
 */
import { Prisma } from "@prisma/client";
import { prisma } from "../../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../../lib/features/auth/session";
import { ApiError, ERROR_CODES, formatZodMessage } from "../../../_lib/errors";
import { withApi } from "../../../_lib/handler";
import { AdminSecurityLogsQuerySchema } from "@aidean/shared";

export const dynamic = "force-dynamic";

/** 由时间戳派生令牌展示态（互斥优先级：撤销 > 轮换 > 过期 > 有效）。 */
function tokenStatus(t: { revokedAt: Date | null; rotatedAt: Date | null; expiresAt: Date }, now: number): string {
  if (t.revokedAt) return "REVOKED";
  if (t.rotatedAt) return "ROTATED";
  if (t.expiresAt.getTime() < now) return "EXPIRED";
  return "ACTIVE";
}

export const GET = withApi(async (req: Request) => {
  await requireAdminApi("admin.logs.read");

  const url = new URL(req.url);
  const parsed = AdminSecurityLogsQuerySchema.safeParse({
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
    kind: url.searchParams.get("kind") ?? undefined,
    userId: url.searchParams.get("userId") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
  });
  if (!parsed.success) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, formatZodMessage(parsed.error.issues[0]));
  }
  const { page, pageSize, kind, userId, status } = parsed.data;
  const skip = (page - 1) * pageSize;

  if (kind === "CONSENT") {
    const where: Prisma.OidcUserConsentWhereInput = userId ? { userId } : {};
    const [rows, total] = await Promise.all([
      prisma.oidcUserConsent.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
        select: {
          id: true,
          clientId: true,
          scopes: true,
          createdAt: true,
          user: { select: { email: true } },
          client: { select: { name: true } },
        },
      }),
      prisma.oidcUserConsent.count({ where }),
    ]);
    return {
      kind,
      items: rows.map((c) => ({
        id: c.id,
        userEmail: c.user.email,
        clientId: c.clientId,
        clientName: c.client.name,
        scopes: c.scopes,
        createdAt: c.createdAt.toISOString(),
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // TOKEN：RefreshToken。status 为派生态，须在内存过滤，故取一窗口后再分页。
  const where: Prisma.RefreshTokenWhereInput = userId ? { userId } : {};
  const now = Date.now();
  const raw = await prisma.refreshToken.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: Math.min(1000, (page) * pageSize + (status ? pageSize * 4 : 0)),
    select: {
      id: true,
      jti: true,
      chainId: true,
      clientId: true,
      rotatedAt: true,
      revokedAt: true,
      expiresAt: true,
      createdAt: true,
      userAgent: true,
      ip: true,
      user: { select: { email: true } },
    },
  });
  const all = raw.map((t) => ({
    id: t.id,
    jtiPrefix: t.jti.slice(0, 8),
    chainPrefix: t.chainId.slice(0, 8),
    clientId: t.clientId,
    userEmail: t.user.email,
    ip: t.ip,
    userAgent: t.userAgent,
    status: tokenStatus(t, now),
    createdAt: t.createdAt.toISOString(),
    expiresAt: t.expiresAt.toISOString(),
  }));
  const filtered = status ? all.filter((t) => t.status === status) : all;
  const total = filtered.length;
  return {
    kind,
    items: filtered.slice(skip, skip + pageSize),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
});

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../../_lib/method-not-allowed";
export const { POST, PUT, PATCH, DELETE, OPTIONS } = methodNotAllowed(["GET"]);
