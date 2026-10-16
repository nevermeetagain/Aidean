// > 版本: v0.2 | 更新: 2026-10-14 | 变更: V0.2.0 复核沿用 V0.1.0 冻结稿
// ============================================================================
// 契约③ Identity —— 冻结稿。本规划【不新增】身份字段/角色/权限域；本文件把现行事实固化为
// 机器可校验形态，供 TASK-004 契约测试生成器断言「代码 == 契约」。
//
// 事实证据：
//   - 用户 ID：apps/web/prisma/schema.prisma User.id @default(uuid(7))（UUIDv7 字符串）
//   - 角色：schema.prisma:232-238 enum UserRole GUEST/USER/MODERATOR/ADMIN/SUPER_ADMIN
//   - 等级：schema.prisma:248-252 enum AccountTier NORMAL/PRO/MAX
//   - JWT：apps/web/lib/features/auth/tokens.ts:23-40（RS256；access 载荷 tier/ver/jti/clientId?；refresh 载荷 typ=refresh/ver/jti/clientId?）
//   - TTL：apps/web/lib/features/auth/constants.ts:59-80（access 默认 15 分钟 [5,60] 可配；refresh 默认 7 天 [1,30] 可配）
//   - Cookie：constants.ts:12-14 aidean_token / aidean_refresh
//   - 后台守卫：apps/web/lib/features/auth/session.ts:83-104 requireAdminApi(permission?)
//   - 权限注册表：packages/shared/src/permissions.ts（ADMIN_DOMAINS 30 域 × read/write）
// ============================================================================
import { z } from "zod";

export const UserIdSchema = z.string().uuid(); // uuid v7 文本
export const USER_ROLES = ["GUEST", "USER", "MODERATOR", "ADMIN", "SUPER_ADMIN"] as const;
export const ACCOUNT_TIERS = ["NORMAL", "PRO", "MAX"] as const;
export const STAFF_ROLES = ["MODERATOR", "ADMIN", "SUPER_ADMIN"] as const; // isStaff 入场总闸（session.ts:73-77 注释）

export const JWT_ALG = "RS256" as const;
export const COOKIE_ACCESS = "aidean_token" as const;
export const COOKIE_REFRESH = "aidean_refresh" as const;

/** access 令牌声明（sub=userId；iss=NEXT_PUBLIC_SITE_URL；aud=aidean-web 或 OidcClient.clientId） */
export const AccessClaimsSchema = z.object({
  sub: UserIdSchema,
  tier: z.enum(ACCOUNT_TIERS),
  ver: z.number().int().nonnegative(), // = User.tokenVersion，改密/封号全端失效比对位
  jti: z.string().min(1),
  clientId: z.string().optional(),
  iss: z.string().url(),
  aud: z.union([z.string(), z.array(z.string())]),
  iat: z.number().int(),
  exp: z.number().int(),
});

export const RefreshClaimsSchema = z.object({
  sub: UserIdSchema,
  typ: z.literal("refresh"),
  ver: z.number().int().nonnegative(),
  jti: z.string().min(1),
  clientId: z.string().optional(),
});

/** TTL 合法域（与 constants.ts 夹紧逻辑一致）。注意：需求文档 §3.5 写「JWT 24h」与代码 15min 冲突 → 见 03_需求基线复核 C-3 */
export const TOKEN_TTL = {
  accessMinutes: { min: 5, max: 60, default: 15 },
  refreshDays: { min: 1, max: 30, default: 7 },
} as const;

/** 权限码形：admin.<domain>.<read|write>；SUPER_ADMIN 持通配 "*"（解析层注入，不落库） */
export const PermissionCodeSchema = z.string().regex(/^admin\.[a-z-]+\.(read|write)$/);

/**
 * 管理端/用户端权限边界（禁止清单，机器口径）。每条均须有对应自动化测试（TASK-004 生成 + 各切片 e2e）。
 * deny = 必须返回的错误码。
 */
export const AUTHZ_BOUNDARY: ReadonlyArray<{ actor: string; target: string; deny: number; evidence: string }> = [
  { actor: "匿名", target: "/api/v1/user/**", deny: 10004, evidence: "session.ts:53-56 requireUserApi" },
  { actor: "匿名", target: "/api/v1/admin/**", deny: 10004, evidence: "session.ts:84-87" },
  { actor: "USER（非 staff）", target: "/api/v1/admin/**", deny: 10008, evidence: "session.ts:95-97 !isStaff" },
  { actor: "MODERATOR", target: "admin.roles.* / admin.reports.* 端点", deny: 10008, evidence: "permissions.ts:96-99 MODERATOR_READ 排除" },
  { actor: "staff 缺目标权限码", target: "requireAdminApi(code) 端点", deny: 10008, evidence: "session.ts:98-100" },
  { actor: "SUPER_ADMIN", target: "/users/[id]/roles 修改自身分配 / 移除末位超管", deny: 40000, evidence: "CHANGELOG S3 三重护栏" },
  { actor: "USER", target: "他人收藏（DELETE /user/favorites/[id] 非本人）", deny: 40000, evidence: "本规划 S3 契约：0 行即 40000 防枚举" },
  { actor: "任意 USER 端响应", target: "markup_rate / token_multiplier / clientSecretHash 字段", deny: -1, evidence: "开发流程.md §五.3 一票否决；-1 表示须由序列化白名单剔除而非错误码" },
  { actor: "后台功能开关管理", target: "PATCH /api/v1/admin/feature-flags/[id]", deny: 10008, evidence: "本规划 S2：复用 admin.configs.write（无新增权限域）" },
  { actor: "后台限时优惠管理", target: "POST/PATCH/DELETE /api/v1/admin/prices/promotions", deny: 10008, evidence: "本规划 S4：复用 admin.models.write（与 S7 prices 同口径）" },
];
