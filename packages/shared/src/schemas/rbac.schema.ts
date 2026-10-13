import { z } from "zod";

// ==================================================================
// S3 RBAC 管理契约（restructure-admin-nav-rbac-cms · A2+B2）
// - 角色 CRUD：自定义角色（isSystem=false）可增删改；系统角色权限集由 seed 收敛，UI 只读其权限。
// - 用户角色分配：全量覆盖式 PATCH（提交目标角色码集合，后端 diff 落库 + revalidateTag("admin-auth")）。
// - 权限码只能取自 permissions.ts 注册表（requireAdminApi 逐路由引用同集合）。
// ==================================================================

/** 角色编码：小写字母/数字/下划线，2-40 位（自定义角色创建；强制小写以避免与系统大写码冲突）。 */
export const ROLE_CODE_REGEX = /^[a-z0-9_]{2,40}$/;

/** 角色编码引用格式（用于用户角色分配/删除等指向**既有**角色的场景）：
 *  须兼容系统角色大写码（SUPER_ADMIN/ADMIN/MODERATOR）与自定义小写码。 */
export const ROLE_CODE_REF_REGEX = /^[A-Za-z0-9_]{2,40}$/;

/** 自定义角色创建。 */
export const RoleCreateSchema = z
  .object({
    code: z.string().regex(ROLE_CODE_REGEX, "角色编码仅允许小写字母/数字/下划线，2-40 位"),
    name: z.string().trim().min(1).max(40),
    description: z.string().trim().max(200).optional(),
    permissions: z.array(z.string().min(3)).max(300).default([]),
  })
  .strict();
export type RoleCreate = z.infer<typeof RoleCreateSchema>;

/** 角色更新（code 不可变）。系统角色禁改 code，权限集可被 seed 覆盖，UI 允许改 name/description/permissions。 */
export const RolePatchSchema = z
  .object({
    name: z.string().trim().min(1).max(40).optional(),
    description: z.string().trim().max(200).nullable().optional(),
    permissions: z.array(z.string().min(3)).max(300).optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: "至少提供一个待更新字段" });
export type RolePatch = z.infer<typeof RolePatchSchema>;

/** 用户角色分配（全量覆盖）：传目标角色 code 集合（含系统/自定义码），空数组=清空。 */
export const UserRolesPatchSchema = z
  .object({
    roleCodes: z.array(z.string().regex(ROLE_CODE_REF_REGEX)).max(50),
  })
  .strict();
export type UserRolesPatch = z.infer<typeof UserRolesPatchSchema>;
