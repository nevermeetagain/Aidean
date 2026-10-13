import { z } from "zod";

// ==================================================================
// S5 日志中心（restructure-admin-nav-rbac-cms）——只读聚合查询契约。
// 约定：全部端点只读，禁写；分页 page≥1 / pageSize≤100（记录类量大，封顶放宽）。
//       金额 BigInt 分口径在路由层转 string + fenToYuan，本文件只管入参校验。
// ==================================================================

/** 日志中心通用分页基（放宽至 pageSize≤100）。 */
const LogPage = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
};

/** ISO 日期时间（可空），用于时间范围筛选。 */
const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}(T.*)?$/, "日期格式须为 YYYY-MM-DD 或 ISO8601");

/** 计费路径（与 prisma UsageBillingPath 对齐）。 */
export const USAGE_BILLING_PATHS = [
  "PLATFORM",
  "UPSTREAM",
  "PACKAGE",
  "FREE_PROXY",
  "FREE_QUOTA",
] as const;

/** 网关调用日志查询：按用户/模型/站点/计费路径/仅错误/时间范围筛选。 */
export const AdminUsageLogsQuerySchema = z.object({
  ...LogPage,
  userId: z.string().trim().max(64).optional(),
  model: z.string().trim().max(80).optional(),
  stationId: z.string().trim().max(64).optional(),
  billingPath: z.enum(USAGE_BILLING_PATHS).optional(),
  onlyErrors: z
    .union([z.literal("true"), z.literal("1"), z.boolean()])
    .optional()
    .transform((v) => v === "true" || v === "1" || v === true),
  from: isoDate.optional(),
  to: isoDate.optional(),
});
export type AdminUsageLogsQuery = z.infer<typeof AdminUsageLogsQuerySchema>;

/** 安全记录子类型：刷新令牌 / SSO 授权同意。 */
export const SECURITY_KINDS = ["TOKEN", "CONSENT"] as const;

/** 刷新令牌状态视图（派生态，非落库字段）。 */
export const TOKEN_STATUSES = ["ACTIVE", "ROTATED", "REVOKED", "EXPIRED"] as const;

/** 安全事件查询：kind 选数据源，status 仅对 TOKEN 生效。 */
export const AdminSecurityLogsQuerySchema = z.object({
  ...LogPage,
  kind: z.enum(SECURITY_KINDS).default("TOKEN"),
  userId: z.string().trim().max(64).optional(),
  status: z.enum(TOKEN_STATUSES).optional(),
});
export type AdminSecurityLogsQuery = z.infer<typeof AdminSecurityLogsQuerySchema>;

/** 脚本执行状态（与 prisma ScriptExecution.status 对齐：0 执行中 / 1 成功 / 2 失败）。 */
export const AdminScriptLogsQuerySchema = z.object({
  ...LogPage,
  scriptId: z.string().trim().max(64).optional(),
  status: z.coerce.number().int().min(0).max(2).optional(),
});
export type AdminScriptLogsQuery = z.infer<typeof AdminScriptLogsQuerySchema>;
