import { z } from "zod";

// ==================================================================
// 管理端「可配置菜单」契约（restructure-admin-nav-rbac-cms S2.5）
// 真源：NavigationMenu(scope=ADMIN)。本文件收口写操作白名单（越权字段剔除）。
// 约束：menuCode 不可变（创建后禁改，作父子引用稳定键）；scope 恒为 ADMIN（后台面板只维护管理端）。
// ==================================================================

/** 链接类型：与 prisma LinkType 对齐（INTERNAL=内部路由 / EXTERNAL=外链 / DROPDOWN=分组容器） */
export const MENU_LINK_TYPES = ["INTERNAL", "EXTERNAL", "DROPDOWN"] as const;

/** menuCode 稳定键规则：小写字母/数字/下划线，2-64 位；用作父子 parentCode 引用与去重 */
export const MENU_CODE_REGEX = /^[a-z0-9_]{2,64}$/;

/** 创建一级分组：isDropdown 必为真、无 path（容器不导航） */
export const AdminMenuGroupCreateSchema = z
  .object({
    menuCode: z.string().regex(MENU_CODE_REGEX, "menuCode 仅允许小写字母/数字/下划线，2-64 位"),
    name: z.string().trim().min(1).max(50),
    nameEn: z.string().trim().max(50).optional(),
    level: z.literal(1),
    isDropdown: z.literal(true).default(true),
    path: z.null().optional(),
    icon: z.string().trim().max(2000).nullish(),
    sortOrder: z.coerce.number().int().default(0),
    isVisible: z.boolean().default(true),
    linkType: z.enum(MENU_LINK_TYPES).default("DROPDOWN"),
    scope: z.literal("ADMIN").default("ADMIN"),
  })
  .strict();

/** 创建二级叶子：须有 path（/admin 前缀）、归属某 level1 分组 parentCode */
export const AdminMenuLeafCreateSchema = z
  .object({
    menuCode: z.string().regex(MENU_CODE_REGEX, "menuCode 仅允许小写字母/数字/下划线，2-64 位"),
    name: z.string().trim().min(1).max(50),
    nameEn: z.string().trim().max(50).optional(),
    level: z.literal(2),
    parentCode: z.string().regex(MENU_CODE_REGEX),
    path: z.string().trim().startsWith("/admin", "后台菜单 path 须以 /admin 开头").max(200),
    icon: z.string().trim().max(2000).nullish(),
    sortOrder: z.coerce.number().int().default(0),
    isVisible: z.boolean().default(true),
    linkType: z.enum(MENU_LINK_TYPES).default("INTERNAL"),
    scope: z.literal("ADMIN").default("ADMIN"),
  })
  .strict();

/** 创建请求体：一级分组 或 二级叶子（判别联合，按 level 分流） */
export const AdminMenuCreateSchema = z.discriminatedUnion("level", [
  AdminMenuGroupCreateSchema,
  AdminMenuLeafCreateSchema,
]);
export type AdminMenuCreate = z.infer<typeof AdminMenuCreateSchema>;

/** 更新请求体：menuCode/scope/level 不可变；仅改显示名/路径/图标/归属/排序/可见性 */
export const AdminMenuUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(50).optional(),
    nameEn: z.string().trim().max(50).nullable().optional(),
    path: z.string().trim().max(200).nullable().optional(),
    icon: z.string().trim().max(2000).nullable().optional(),
    parentCode: z.string().regex(MENU_CODE_REGEX).nullable().optional(),
    sortOrder: z.coerce.number().int().optional(),
    isVisible: z.boolean().optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: "至少提供一个待更新字段" });
export type AdminMenuUpdate = z.infer<typeof AdminMenuUpdateSchema>;

/** 批量排序：按数组顺序回写同级 sortOrder（面板拖拽/上下移后一次性提交） */
export const AdminMenuReorderItemSchema = z.object({
  menuCode: z.string().regex(MENU_CODE_REGEX),
  sortOrder: z.coerce.number().int(),
  parentCode: z.string().regex(MENU_CODE_REGEX).nullable().optional(),
});
export const AdminMenuReorderSchema = z.object({
  items: z.array(AdminMenuReorderItemSchema).min(1).max(200),
});
export type AdminMenuReorder = z.infer<typeof AdminMenuReorderSchema>;
