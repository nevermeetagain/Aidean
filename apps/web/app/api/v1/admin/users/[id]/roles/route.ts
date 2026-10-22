/**
 * /api/v1/admin/users/[id]/roles — 用户角色分配（B2 多对多；restructure-admin-nav-rbac-cms S3.5）。
 *
 * GET  ：requireAdminApi("admin.users.read") → 该用户当前角色码集合（供 users 面板角色编辑器回填）。
 * PATCH：requireAdminApi("admin.roles.write") → UserRolesPatchSchema {roleCodes}（全量覆盖）
 *        → 三重护栏：① 禁改自身分配（防自锁）；② 禁移除最后一个超级管理员；③ 角色码须存在。
 *        → 差异覆盖 user_role_assignments → audit action=2 → revalidateTag("admin-auth")（守卫即时生效）。
 *
 * 说明：admin.roles.write 实际仅 SUPER_ADMIN 持有（ADMIN 排除全部 roles.*，MODERATOR 亦然），
 *       故“仅 SUPER_ADMIN 可分配角色”由权限码天然保证（A2 后端强制，不靠前端）。
 *       User.role 枚举保留为遗留缓存：isStaff 由「枚举或任一角色分配」并集决定（见 permissions.ts）。
 */
import { revalidateTag } from "next/cache";

import { prisma } from "../../../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../../../lib/features/auth/session";
import { ApiError, ERROR_CODES, formatZodMessage } from "../../../../_lib/errors";
import { withApi, type RouteContext } from "../../../../_lib/handler";
import { writeAudit } from "../../../../_lib/audit";
import { UserRolesPatchSchema } from "@aidean/shared";

export const dynamic = "force-dynamic";

export const GET = withApi(async (_req: Request, ctx: RouteContext<{ id: string }>) => {
  await requireAdminApi("admin.users.read");
  const { id } = await ctx.params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { roleAssignments: { select: { role: { select: { code: true } } } } },
  });
  if (!user) throw new ApiError(ERROR_CODES.BAD_REQUEST, "用户不存在");
  return {
    roleCodes: user.roleAssignments.map((a) => a.role?.code).filter((c): c is string => !!c),
  };
});

export const PATCH = withApi(async (req: Request, ctx: RouteContext<{ id: string }>) => {
  const session = await requireAdminApi("admin.roles.write");
  const { id } = await ctx.params;

  // 护栏①：禁改自身角色分配（防超管误将自己降级导致全站锁死）。
  if (id === session.userId) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, "不能修改自己的角色分配");
  }

  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = UserRolesPatchSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, formatZodMessage(parsed.error.issues[0]));
  }
  const roleCodes = [...new Set(parsed.data.roleCodes)];

  const target = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      role: true,
      deletedAt: true,
      roleAssignments: { select: { roleId: true, role: { select: { code: true } } } },
    },
  });
  if (!target || target.deletedAt) throw new ApiError(ERROR_CODES.BAD_REQUEST, "用户不存在");

  // 护栏③：角色码须存在（大小写敏感，系统码大写 / 自定义码小写）。
  const roles = roleCodes.length
    ? await prisma.role.findMany({ where: { code: { in: roleCodes } }, select: { id: true, code: true } })
    : [];
  const foundCodes = new Set(roles.map((r) => r.code));
  const missing = roleCodes.filter((c) => !foundCodes.has(c));
  if (missing.length > 0) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, `角色不存在：${missing.slice(0, 3).join(", ")}`);
  }
  const targetRoleIds = roles.map((r) => r.id);

  // 护栏②：移除 SUPER_ADMIN 时，若目标是最后一个超级管理员则拒绝（枚举或分配任一即视为超管持有者）。
  const willHaveSuper = roleCodes.includes("SUPER_ADMIN");
  const hadSuper =
    target.role === "SUPER_ADMIN" || target.roleAssignments.some((a) => a.role?.code === "SUPER_ADMIN");
  if (hadSuper && !willHaveSuper) {
    const holders = await prisma.user.count({
      where: {
        deletedAt: null,
        OR: [{ role: "SUPER_ADMIN" }, { roleAssignments: { some: { role: { code: "SUPER_ADMIN" } } } }],
      },
    });
    if (holders <= 1) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, "不能移除最后一个超级管理员的角色");
    }
  }

  const oldCodes = target.roleAssignments.map((a) => a.role?.code).filter((c): c is string => !!c);

  await prisma.$transaction(async (tx) => {
    const currentIds = target.roleAssignments.map((a) => a.roleId);
    const toRemove = currentIds.filter((rid) => !targetRoleIds.includes(rid));
    const toAdd = targetRoleIds.filter((rid) => !currentIds.includes(rid));
    if (toRemove.length > 0) {
      await tx.userRoleAssignment.deleteMany({ where: { userId: id, roleId: { in: toRemove } } });
    }
    if (toAdd.length > 0) {
      await tx.userRoleAssignment.createMany({ data: toAdd.map((roleId) => ({ userId: id, roleId })), skipDuplicates: true });
    }
  });

  await writeAudit({
    actorId: session.userId,
    tableName: "user_role_assignments",
    recordId: id,
    action: 2,
    changedFields: ["roleCodes"],
    oldData: { roleCodes: oldCodes },
    newData: { roleCodes },
    requestId: req.headers.get("x-request-id"),
  });

  revalidateTag("admin-auth");
  return { userId: id, roleCodes };
});

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../../../_lib/method-not-allowed";
export const { POST, PUT, DELETE, OPTIONS } = methodNotAllowed(["GET", "PATCH"]);
