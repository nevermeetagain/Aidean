/**
 * /api/v1/admin/users/[id] — 用户 tier/status 管理 + 软删（T-2.2.4）。
 *
 * PATCH：requireAdminApi → AdminUserPatchSchema 白名单（tier / status ACTIVE|SUSPENDED）；
 *        封禁（→SUSPENDED）置 tokenVersion++（全端旧 access/refresh 失效）；
 *        解封（→ACTIVE）不回退 ver（旧令牌已失效，须重新登录）；
 *        每次变更写 AuditLog(tableName="users", action=2)。
 * DELETE：requireAdminApi → 软删（deletedAt = now()，status = SUSPENDED，tokenVersion++）；
 *        令牌全端失效，用户无法再登录；
 *        写 AuditLog(tableName="users", action=3)。
 */
import { prisma } from "../../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../../lib/features/auth/session";
import { ApiError, ERROR_CODES, formatZodMessage } from "../../../_lib/errors";
import { withApi, type RouteContext } from "../../../_lib/handler";
import { writeAudit } from "../../../_lib/audit";
import { AdminUserPatchSchema } from "@aidean/shared";

export const dynamic = "force-dynamic";

export const PATCH = withApi(
  async (req: Request, ctx: RouteContext<{ id: string }>) => {
    const session = await requireAdminApi("admin.users.write");
    const { id } = await ctx.params;

    const body = (await req.json().catch(() => null)) as unknown;
    const parsed = AdminUserPatchSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, formatZodMessage(parsed.error.issues[0]));
    }
    const patch = parsed.data;

    const before = await prisma.user.findUnique({
      where: { id },
      select: { id: true, tier: true, status: true, tokenVersion: true, deletedAt: true },
    });
    if (!before || before.deletedAt) {
      throw new ApiError(ERROR_CODES.USER_NOT_FOUND, "用户不存在");
    }

    // 白名单收口 data：封禁时 ver++（令牌代际推进，全端失效）
    const suspending = patch.status === "SUSPENDED" && before.status !== "SUSPENDED";
    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(patch.tier !== undefined ? { tier: patch.tier } : {}),
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(suspending ? { tokenVersion: { increment: 1 } } : {}),
      },
      select: { id: true, tier: true, status: true, tokenVersion: true },
    });

    await writeAudit({
      actorId: session.userId,
      tableName: "users",
      recordId: id,
      action: 2,
      changedFields: [
        ...(patch.tier !== undefined ? ["tier"] : []),
        ...(patch.status !== undefined ? ["status"] : []),
        ...(suspending ? ["tokenVersion"] : []),
      ],
      oldData: before,
      newData: user,
      requestId: req.headers.get("x-request-id"),
    });

    return { user: { id: user.id, tier: user.tier as string, status: user.status as string } };
  }
);

export const DELETE = withApi(
  async (req: Request, ctx: RouteContext<{ id: string }>) => {
    const session = await requireAdminApi("admin.users.write");
    const { id } = await ctx.params;

    const before = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        nickname: true,
        tier: true,
        status: true,
        tokenVersion: true,
        deletedAt: true,
      },
    });
    if (!before || before.deletedAt) {
      throw new ApiError(ERROR_CODES.USER_NOT_FOUND, "用户不存在");
    }

    // 软删：标记 deletedAt + 封禁 + 令牌代际推进（全端失效）
    const user = await prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: "SUSPENDED",
        tokenVersion: { increment: 1 },
      },
      select: { id: true, email: true, deletedAt: true, status: true, tokenVersion: true },
    });

    await writeAudit({
      actorId: session.userId,
      tableName: "users",
      recordId: id,
      action: 3, // DELETE
      changedFields: ["deletedAt", "status", "tokenVersion"],
      oldData: before,
      newData: user,
      requestId: req.headers.get("x-request-id"),
    });

    return {
      user: {
        id: user.id,
        deletedAt: user.deletedAt?.toISOString() ?? null,
      },
    };
  }
);

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../../_lib/method-not-allowed";
export const { GET, HEAD, POST, PUT, OPTIONS } = methodNotAllowed(["PATCH", "DELETE"]);
