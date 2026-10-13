// S3.2 权限解析（A2）：联合「用户角色 → 角色权限」得有效权限集，SUPER_ADMIN 通配绕过。
// - 缓存 tag = admin-auth（与 (admin)/layout 角色复核同 tag）；角色/授权变更后 revalidateTag("admin-auth") 即时生效。
// - isStaff：能否进入后台（User.role ∈ ADMIN/SUPER_ADMIN/MODERATOR 或持有任一角色分配）；MODERATOR 由此可用。
// - 口径：User.role=SUPER_ADMIN 直接通配；ADMIN 由 seed 回绑的 ADMIN 系统角色授予「除 roles 外全部」。
import { unstable_cache } from "next/cache";
import { prisma } from "../../db/prisma";
import { PERMISSION_WILDCARD } from "@aidean/shared";

export interface AdminPermissions {
  /** SUPER_ADMIN：逐接口校验命中即绕过。 */
  wildcard: boolean;
  /** 有效权限码集合（并集去重）。 */
  codes: string[];
  /** 是否允许进入后台（入场总闸）。 */
  isStaff: boolean;
}

/** 纯解析（不含缓存）：联合用户角色→角色权限得有效权限集；导出以便单测在无 Next 缓存上下文注入 mock prisma。 */
export async function loadAdminPermissions(userId: string): Promise<AdminPermissions> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      roleAssignments: {
        select: {
          role: {
            select: {
              code: true,
              permissions: { select: { permission: { select: { code: true } } } },
            },
          },
        },
      },
    },
  });

  if (!user) return { wildcard: false, codes: [], isStaff: false };

  const codes = new Set<string>();
  let wildcard = user.role === "SUPER_ADMIN";
  const assignedCodes: string[] = [];

  for (const a of user.roleAssignments) {
    if (!a.role) continue;
    assignedCodes.push(a.role.code);
    if (a.role.code === "SUPER_ADMIN") wildcard = true;
    for (const rp of a.role.permissions) {
      if (rp.permission && rp.permission.code !== PERMISSION_WILDCARD) codes.add(rp.permission.code);
    }
  }

  const isStaff =
    user.role === "ADMIN" ||
    user.role === "SUPER_ADMIN" ||
    user.role === "MODERATOR" ||
    assignedCodes.length > 0;

  return { wildcard, codes: [...codes], isStaff };
}

/** 缓存版有效权限解析（同用户 60s 内命中缓存免 DB；授权变更 revalidateTag("admin-auth") 失效）。 */
export const getAdminPermissions = unstable_cache(loadAdminPermissions, ["admin-perms"], {
  revalidate: 60,
  tags: ["admin-auth"],
});

/** 判定：持有某权限码 = 通配 或 码在集合内。 */
export function hasPermission(perms: AdminPermissions, code: string): boolean {
  return perms.wildcard || perms.codes.includes(code);
}
