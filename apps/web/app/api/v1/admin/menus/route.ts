/**
 * /api/v1/admin/menus — 管理端「可配置菜单」真源读写（restructure-admin-nav-rbac-cms S2.5）。
 *
 * GET  ：requireAdminApi → 列出全部 scope=ADMIN 菜单（含隐藏项，供管理面板编辑），level/sortOrder 升序。
 * POST ：requireAdminApi → AdminMenuCreateSchema（一级分组 / 二级叶子判别联合）
 *        → menuCode 唯一校验 + 二级须归属现存 level1 分组 → create → audit_logs action=1 → revalidateTag("admin-nav")。
 *
 * ⚠️ 只维护 scope=ADMIN；前台 SITE 导航不在本面板范围。侧边栏缓存 tag 见 lib/admin-navigation.ts。
 */
import { revalidateTagNow } from "../../../../../lib/cache/revalidate-tag";
import { NavScope, LinkType, type Prisma } from "@prisma/client";

import { prisma } from "../../../../../lib/db/prisma";
import { requireAdminApi } from "../../../../../lib/features/auth/session";
import { ApiError, ERROR_CODES, formatZodMessage } from "../../_lib/errors";
import { withApi } from "../../_lib/handler";
import { writeAudit } from "../../_lib/audit";
import { AdminMenuCreateSchema } from "@aidean/shared";

export const dynamic = "force-dynamic";

const LIST_SELECT = {
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

export const GET = withApi(async () => {
  await requireAdminApi("admin.menus.read");
  const items = await prisma.navigationMenu.findMany({
    where: { scope: NavScope.ADMIN },
    select: LIST_SELECT,
    orderBy: [{ level: "asc" }, { sortOrder: "asc" }, { menuCode: "asc" }],
  });
  return { items };
});

export const POST = withApi(async (req: Request) => {
  const session = await requireAdminApi("admin.menus.write");
  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = AdminMenuCreateSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, formatZodMessage(parsed.error.issues[0]));
  }
  const data = parsed.data;

  // menuCode 唯一（创建前显式校验，给出中文语义而非底层 P2002）
  const dup = await prisma.navigationMenu.findUnique({ where: { menuCode: data.menuCode } });
  if (dup) {
    throw new ApiError(ERROR_CODES.BAD_REQUEST, `菜单编码 ${data.menuCode} 已存在`);
  }

  // 二级叶子：parentCode 必须是现存 level1 分组（scope=ADMIN）
  if (data.level === 2) {
    const parent = await prisma.navigationMenu.findUnique({ where: { menuCode: data.parentCode } });
    if (!parent || parent.level !== 1 || parent.scope !== NavScope.ADMIN) {
      throw new ApiError(ERROR_CODES.BAD_REQUEST, "所属分组不存在或非管理端一级菜单");
    }
  }

  const created = await prisma.navigationMenu.create({
    data: {
      menuCode: data.menuCode,
      name: data.name,
      nameEn: data.nameEn ?? null,
      level: data.level,
      scope: NavScope.ADMIN,
      path: data.level === 2 ? data.path ?? null : null,
      icon: data.icon ?? null,
      parentCode: data.level === 2 ? data.parentCode : null,
      isDropdown: data.level === 1,
      isVisible: data.isVisible,
      isActive: true,
      linkType: data.linkType === "EXTERNAL" ? LinkType.EXTERNAL : data.linkType === "DROPDOWN" ? LinkType.DROPDOWN : LinkType.INTERNAL,
      showInHeader: false,
      sortOrder: data.sortOrder,
    },
    select: LIST_SELECT,
  });

  await writeAudit({
    actorId: session.userId,
    tableName: "navigation_menus",
    recordId: created.id,
    action: 1,
    changedFields: ["menuCode", "name", "level", "parentCode", "path"],
    newData: { menuCode: created.menuCode, name: created.name, level: created.level, parentCode: created.parentCode, path: created.path },
    requestId: req.headers.get("x-request-id"),
  });

  revalidateTagNow("admin-nav");
  return { item: created };
});

// B11-10：未实现的方法统一返回 405 信封（含 Allow 头）。由 scripts/guard/api-method-coverage.mjs --fix 生成，勿手改列表。
import { methodNotAllowed } from "../../_lib/method-not-allowed";
export const { PUT, PATCH, DELETE, OPTIONS } = methodNotAllowed(["GET", "POST"]);
