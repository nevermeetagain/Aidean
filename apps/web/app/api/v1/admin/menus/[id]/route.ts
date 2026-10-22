/**
 * /api/v1/admin/menus/[id] — 管理端菜单项 改/删（restructure-admin-nav-rbac-cms S2.5）。
 *
 * PATCH  ：requireAdminApi → AdminMenuUpdateSchema（白名单：name/nameEn/path/icon/parentCode/sortOrder/isVisible/isActive）
 *          → 守护：一级分组不可挂 parentCode；二级 parentCode 须指向现存 level1 分组且非自环
 *          → update → audit_logs action=2 → revalidateTag("admin-nav")。
 * DELETE ：requireAdminApi → 一级分组若有子项则拒删（先移走子项）→ 硬删 → audit_logs action=3 → revalidateTag("admin-nav")。
 *
 * menuCode/scope/level 不可变（稳定键）。隐藏某入口用 PATCH isVisible=false，而非删除。
 */
import { revalidateTag } from "next/cache";
import { NavScope, type Prisma } from "@prisma/client";

import { prisma } from "../../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../../lib/features/auth/session";
import { ApiError, ERROR_CODES, formatZodMessage } from "../../../_lib/errors";
import { withApi, type RouteContext } from "../../../_lib/handler";
import { writeAudit } from "../../../_lib/audit";
import { AdminMenuUpdateSchema } from "@aidean/shared";

export const dynamic = "force-dynamic";

const SELECT = {
  id: true,
  menuCode: true,
  name: true,
  nameEn: true,
  level: true,
  path: true,
  icon: true,
  parentCode: true,
  isDropdown: true,
  isVisible: true,
  isActive: true,
  linkType: true,
  sortOrder: true,
  requiredPermissions: true,
  updatedAt: true,
} satisfies Prisma.NavigationMenuSelect;

async function loadAdminMenu(id: string) {
  const row = await prisma.navigationMenu.findUnique({ where: { id } });
  if (!row || row.scope !== NavScope.ADMIN) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, "菜单项不存在");
  }
  return row;
}

export const PATCH = withApi(async (req: Request, ctx: RouteContext<{ id: string }>) => {
  const session = await requireAdminApi("admin.menus.write");
  const { id } = await ctx.params;
  const existing = await loadAdminMenu(id);

  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = AdminMenuUpdateSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, formatZodMessage(parsed.error.issues[0]));
  }
  const patch = parsed.data;

  // 归属校验：一级分组不可挂父；二级改父须指向现存 level1 分组、且非自环
  if (patch.parentCode !== undefined) {
    if (existing.level === 1) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, "一级分组不能设置上级");
    }
    if (patch.parentCode !== null) {
      if (patch.parentCode === existing.menuCode) {
        throw new ApiError(ERROR_CODES.BAD_REQUEST, "上级不能是自身");
      }
      const parent = await prisma.navigationMenu.findUnique({ where: { menuCode: patch.parentCode } });
      if (!parent || parent.level !== 1 || parent.scope !== NavScope.ADMIN) {
        throw new ApiError(ERROR_CODES.BAD_REQUEST, "所属分组不存在或非管理端一级菜单");
      }
    }
  }

  const updated = await prisma.navigationMenu.update({
    where: { id },
    data: {
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.nameEn !== undefined ? { nameEn: patch.nameEn } : {}),
      ...(patch.path !== undefined ? { path: patch.path } : {}),
      ...(patch.icon !== undefined ? { icon: patch.icon } : {}),
      ...(patch.parentCode !== undefined ? { parentCode: patch.parentCode } : {}),
      ...(patch.sortOrder !== undefined ? { sortOrder: patch.sortOrder } : {}),
      ...(patch.isVisible !== undefined ? { isVisible: patch.isVisible } : {}),
      ...(patch.isActive !== undefined ? { isActive: patch.isActive } : {}),
    },
    select: SELECT,
  });

  await writeAudit({
    actorId: session.userId,
    tableName: "navigation_menus",
    recordId: id,
    action: 2,
    changedFields: Object.keys(patch),
    oldData: { name: existing.name, path: existing.path, parentCode: existing.parentCode, sortOrder: existing.sortOrder, isVisible: existing.isVisible },
    newData: { name: updated.name, path: updated.path, parentCode: updated.parentCode, sortOrder: updated.sortOrder, isVisible: updated.isVisible },
    requestId: req.headers.get("x-request-id"),
  });

  revalidateTag("admin-nav");
  return { item: updated };
});

export const DELETE = withApi(async (req: Request, ctx: RouteContext<{ id: string }>) => {
  const session = await requireAdminApi("admin.menus.write");
  const { id } = await ctx.params;
  const existing = await loadAdminMenu(id);

  // 一级分组：仍有子项挂在其下则拒删（避免孤儿；先移走/删除子项）
  if (existing.level === 1) {
    const childCount = await prisma.navigationMenu.count({
      where: { parentCode: existing.menuCode, scope: NavScope.ADMIN },
    });
    if (childCount > 0) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, `该分组下还有 ${childCount} 个子项，请先移除`);
    }
  }

  await prisma.navigationMenu.delete({ where: { id } });

  await writeAudit({
    actorId: session.userId,
    tableName: "navigation_menus",
    recordId: id,
    action: 3,
    changedFields: ["deleted"],
    oldData: { menuCode: existing.menuCode, name: existing.name, level: existing.level, path: existing.path },
    requestId: req.headers.get("x-request-id"),
  });

  revalidateTag("admin-nav");
  return { deleted: true, id };
});

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../../_lib/method-not-allowed";
export const { GET, HEAD, POST, PUT, OPTIONS } = methodNotAllowed(["PATCH", "DELETE"]);
