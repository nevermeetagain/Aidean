/**
 * /api/v1/admin/roles/[id] — 角色改/删（restructure-admin-nav-rbac-cms S3.5 · A2+B2）。
 *
 * PATCH  ：requireAdminApi("admin.roles.write") → RolePatchSchema（name/description/permissions 白名单）
 *          → permissions 覆盖式重建（须全属注册表，禁 `*` 通配）→ audit action=2 → revalidateTag("admin-auth")。
 *          code 不可变；系统角色亦可编辑权限集（seed 会按注册表收敛覆盖，作为运行期临时调整）。
 * DELETE ：requireAdminApi("admin.roles.write") → isSystem 禁删；仍有用户绑定禁删（先解绑）
 *          → 硬删（cascade 清 role_permissions）→ audit action=3 → revalidateTag("admin-auth")。
 */
import { revalidateTagNow } from "../../../../../../lib/cache/revalidate-tag";

import { prisma } from "../../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../../lib/features/auth/session";
import { ApiError, ERROR_CODES, formatZodMessage } from "../../../_lib/errors";
import { withApi, type RouteContext } from "../../../_lib/handler";
import { writeAudit } from "../../../_lib/audit";
import { RolePatchSchema, ALL_PERMISSION_CODES } from "@aidean/shared";

export const dynamic = "force-dynamic";

const VALID_CODES = new Set(ALL_PERMISSION_CODES);

async function loadRole(id: string) {
  const role = await prisma.role.findUnique({
    where: { id },
    select: { id: true, code: true, name: true, description: true, isSystem: true },
  });
  if (!role) throw new ApiError(ERROR_CODES.BAD_REQUEST, "角色不存在");
  return role;
}

export const PATCH = withApi(async (req: Request, ctx: RouteContext<{ id: string }>) => {
  const session = await requireAdminApi("admin.roles.write");
  const { id } = await ctx.params;
  const existing = await loadRole(id);

  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = RolePatchSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, formatZodMessage(parsed.error.issues[0]));
  }
  const patch = parsed.data;

  if (patch.permissions !== undefined) {
    const bad = patch.permissions.filter((c) => !VALID_CODES.has(c));
    if (bad.length > 0) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, `非法权限码：${bad.slice(0, 3).join(", ")}`);
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (patch.name !== undefined || patch.description !== undefined) {
      await tx.role.update({
        where: { id },
        data: {
          ...(patch.name !== undefined ? { name: patch.name } : {}),
          ...(patch.description !== undefined ? { description: patch.description } : {}),
        },
      });
    }
    if (patch.permissions !== undefined) {
      await tx.rolePermission.deleteMany({ where: { roleId: id } });
      if (patch.permissions.length > 0) {
        const perms = await tx.permission.findMany({ where: { code: { in: patch.permissions } }, select: { id: true } });
        await tx.rolePermission.createMany({
          data: perms.map((p) => ({ roleId: id, permissionId: p.id })),
          skipDuplicates: true,
        });
      }
    }
    return tx.role.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        isSystem: true,
        permissions: { select: { permission: { select: { code: true } } } },
      },
    });
  });

  await writeAudit({
    actorId: session.userId,
    tableName: "roles",
    recordId: id,
    action: 2,
    changedFields: Object.keys(patch),
    oldData: { name: existing.name, description: existing.description },
    newData: {
      name: updated.name,
      description: updated.description,
      permissions: patch.permissions ?? undefined,
    },
    requestId: req.headers.get("x-request-id"),
  });

  revalidateTagNow("admin-auth");
  return {
    item: {
      id: updated.id,
      code: updated.code,
      name: updated.name,
      description: updated.description,
      isSystem: updated.isSystem,
      permissions: updated.permissions.map((p) => p.permission?.code).filter((c): c is string => !!c),
    },
  };
});

export const DELETE = withApi(async (req: Request, ctx: RouteContext<{ id: string }>) => {
  const session = await requireAdminApi("admin.roles.write");
  const { id } = await ctx.params;
  const existing = await loadRole(id);

  if (existing.isSystem) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, "系统内置角色不可删除");
  }
  const userCount = await prisma.userRoleAssignment.count({ where: { roleId: id } });
  if (userCount > 0) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, `该角色仍绑定 ${userCount} 个用户，请先解绑`);
  }

  await prisma.role.delete({ where: { id } });

  await writeAudit({
    actorId: session.userId,
    tableName: "roles",
    recordId: id,
    action: 3,
    changedFields: ["deleted"],
    oldData: { code: existing.code, name: existing.name },
    requestId: req.headers.get("x-request-id"),
  });

  revalidateTagNow("admin-auth");
  return { deleted: true, id };
});

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../../_lib/method-not-allowed";
export const { GET, HEAD, POST, PUT, OPTIONS } = methodNotAllowed(["PATCH", "DELETE"]);
