/**
 * /api/v1/admin/roles — 角色权限管理（restructure-admin-nav-rbac-cms S3.5 · A2+B2）。
 *
 * GET  ：requireAdminApi("admin.roles.read") → 列出全部角色（系统 + 自定义）及其权限码集合与绑定用户数。
 *        RBAC 域仅 SUPER_ADMIN 可达（ADMIN/MODERATOR 均不持有 admin.roles.*）。
 * POST ：requireAdminApi("admin.roles.write") → RoleCreateSchema
 *        → code 唯一（强制小写避免与系统大写码冲突）+ 权限码须全属注册表（禁注入 `*` 通配越权）
 *        → 事务建 role + role_permissions → audit_logs action=1 → revalidateTag("admin-auth")。
 */
import { revalidateTag } from "next/cache";
import type { Prisma } from "@prisma/client";

import { prisma } from "../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../lib/features/auth/session";
import { ApiError, ERROR_CODES, formatZodMessage } from "../../_lib/errors";
import { withApi } from "../../_lib/handler";
import { writeAudit } from "../../_lib/audit";
import { RoleCreateSchema, ALL_PERMISSION_CODES } from "@aidean/shared";

export const dynamic = "force-dynamic";

const VALID_CODES = new Set(ALL_PERMISSION_CODES);

const ROLE_SELECT = {
  id: true,
  code: true,
  name: true,
  description: true,
  isSystem: true,
  updatedAt: true,
  permissions: { select: { permission: { select: { code: true } } } },
  _count: { select: { users: true } },
} satisfies Prisma.RoleSelect;

type RoleRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  updatedAt: Date;
  permissions: { permission: { code: string } | null }[];
  _count: { users: number };
};

function toVM(r: RoleRow) {
  return {
    id: r.id,
    code: r.code,
    name: r.name,
    description: r.description,
    isSystem: r.isSystem,
    permissions: r.permissions.map((p) => p.permission?.code).filter((c): c is string => !!c),
    userCount: r._count.users,
    updatedAt: r.updatedAt.toISOString(),
  };
}

export const GET = withApi(async () => {
  await requireAdminApi("admin.roles.read");
  const roles = (await prisma.role.findMany({
    orderBy: [{ isSystem: "desc" }, { code: "asc" }],
    select: ROLE_SELECT,
  })) as RoleRow[];
  return { roles: roles.map(toVM) };
});

export const POST = withApi(async (req: Request) => {
  const session = await requireAdminApi("admin.roles.write");
  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = RoleCreateSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, formatZodMessage(parsed.error.issues[0]));
  }
  const { code, name, description, permissions } = parsed.data;

  const dup = await prisma.role.findUnique({ where: { code } });
  if (dup) throw new ApiError(ERROR_CODES.BAD_REQUEST, `角色编码 ${code} 已存在`);

  const bad = permissions.filter((c) => !VALID_CODES.has(c));
  if (bad.length > 0) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, `非法权限码：${bad.slice(0, 3).join(", ")}`);
  }

  const created = await prisma.$transaction(async (tx) => {
    const role = await tx.role.create({
      data: { code, name, description: description ?? null, isSystem: false },
    });
    if (permissions.length > 0) {
      const perms = await tx.permission.findMany({ where: { code: { in: permissions } }, select: { id: true } });
      await tx.rolePermission.createMany({
        data: perms.map((p) => ({ roleId: role.id, permissionId: p.id })),
        skipDuplicates: true,
      });
    }
    return role;
  });

  await writeAudit({
    actorId: session.userId,
    tableName: "roles",
    recordId: created.id,
    action: 1,
    changedFields: ["code", "name", "permissions"],
    newData: { code, name, permissions },
    requestId: req.headers.get("x-request-id"),
  });

  revalidateTag("admin-auth");
  return { item: created };
});

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../_lib/method-not-allowed";
export const { PUT, PATCH, DELETE, OPTIONS } = methodNotAllowed(["GET", "POST"]);
