// > 版本: v0.2 | 更新: 2026-10-14 | 变更: V0.2.0 复核沿用 V0.1.0 冻结稿；①增补计价口径归一（PRICE_NORMALIZATION / EffectivePrice v0.2，TASK-047）
// ============================================================================
// 契约① API —— 本规划新增/变更端点的冻结稿。
// 落地映射（唯一源 = packages/shared/src/schemas/*，见 ADR-P001）：
//   SystemReady*        → packages/shared/src/schemas/system.schema.ts        （TASK-001）
//   FeatureFlag*        → packages/shared/src/schemas/feature-flags.schema.ts （TASK-014）
//   Favorite*           → packages/shared/src/schemas/favorites.schema.ts     （TASK-021）
//   Promotion*/Effective→ packages/shared/src/schemas/promotion.schema.ts     （TASK-026）
//   Search*             → packages/shared/src/schemas/search.schema.ts        （TASK-032）
//   ProductIntroShot*   → packages/shared/src/schemas/admin.schema.ts（扩展）  （TASK-044）
//
// 全局约定（全部来自现行代码，非新发明）：
//   - 信封：{code,message,data,requestId}（apps/web/app/api/v1/_lib/response.ts:12-17）；成功 code=0,message="ok"
//   - 请求追踪：x-request-id 头，入站透传否则生成（response.ts:24-26）
//   - 分页：查询 page(>=1,默认1)/pageSize(1..N)，响应 data={items,total,page,pageSize,totalPages}
//           （现行 3 处同形：grep "{ items, total, page, pageSize, totalPages" apps/web/app/api/v1）；不分页列表 data={items}
//   - 时间：ISO-8601 UTC 字符串（z.string().datetime()，同 admin.schema.ts:338）
//   - 金额：分(minor) 为存储口径；对外字符串元（fenToYuan，packages/shared/src/utils/money.ts:23）；单价为 Decimal→string ¥/M Tokens
//   - 幂等：写接口可选 body.idempotencyKey（8..64，同 admin.schema.ts:74）；本规划新端点幂等语义逐条注明
//   - 鉴权：USER=requireUserApi；ADMIN=requireAdminApi(code)；PUBLIC=无
// ============================================================================
import { z } from "zod";

const Iso = z.string().datetime();
const YuanStr = z.string().regex(/^-?\d+\.\d{2}$/);
const DecimalStr = z.string().regex(/^\d+(\.\d+)?$/);

export const PageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});
export function paged<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    items: z.array(item),
    total: z.number().int().min(0),
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1),
    totalPages: z.number().int().min(0),
  });
}

// ---------- S0 · readiness ----------
export const SystemReadySchema = z.object({
  status: z.enum(["ready"]),
  checks: z.object({ db: z.literal("ok"), redis: z.literal("ok") }),
  time: Iso,
});
// 失败时：HTTP 503 + 错误信封 code=50010，message 形如 "依赖不可用: db" / "依赖不可用: redis"

// ---------- S2 · 功能开关 ----------
/** 种子中已存在的 7 个开关码（apps/web/prisma/seed.ts:240-248），新增码须同步 seed + 本表 */
export const FEATURE_FLAG_CODES = [
  "ladder.model",
  "ladder.station",
  "gateway.chat",
  "favorites.enabled",
  "comparison.enabled",
  "evaluation.enabled",
  "chat.support",
] as const;
export const FeatureFlagCodeSchema = z.enum(FEATURE_FLAG_CODES);
/** 公开读：GET /api/v1/system/features → data = { flags: Record<code, boolean> }（只暴露开/关，不暴露 rollout/config） */
export const PublicFeaturesSchema = z.object({ flags: z.record(FeatureFlagCodeSchema, z.boolean()) });
/** 后台：GET /api/v1/admin/feature-flags → data = { items: AdminFeatureFlag[] } */
export const AdminFeatureFlagSchema = z.object({
  id: z.string(),
  flagCode: FeatureFlagCodeSchema,
  name: z.string(),
  nameCn: z.string().nullable(),
  description: z.string().nullable(),
  isEnabled: z.boolean(),
  category: z.string().nullable(),
  priority: z.number().int(),
  updatedAt: Iso,
});
/** 后台：PATCH /api/v1/admin/feature-flags/[id]（幂等：同值 PATCH 返回同一结果，仍写审计） */
export const AdminFeatureFlagPatchSchema = z
  .object({ isEnabled: z.boolean().optional(), description: z.string().max(500).nullable().optional() })
  .strict()
  .refine((v) => Object.keys(v).length > 0, "至少修改一个字段");
/** 开关 → 受控面映射（关闭时：入口隐藏 + 页面 403 态 + API 50011）。仅登记有消费面的码 */
export const FEATURE_GATES: Readonly<Partial<Record<(typeof FEATURE_FLAG_CODES)[number], { api: string[]; pages: string[] }>>> = {
  "ladder.station": { api: ["GET /api/v1/ladder?type=stations"], pages: ["/providers"] },
  "gateway.chat": { api: ["POST /api/v1/gateway/chat"], pages: [] },
  "evaluation.enabled": { api: ["POST /api/v1/evaluations"], pages: ["/evaluations/new"] },
  "favorites.enabled": { api: ["GET|POST /api/v1/user/favorites", "DELETE /api/v1/user/favorites/[id]"], pages: [] },
  "ladder.model": { api: ["GET /api/v1/ladder?type=models"], pages: ["/models", "/ladder"] },
};

// ---------- S3 · 收藏 ----------
export const FAVORITE_TYPES = ["MODEL", "API_STATION"] as const; // schema.prisma enum FavoriteType
export const FavoriteCreateSchema = z.object({
  refType: z.enum(FAVORITE_TYPES),
  refId: z.string().min(1).max(64),
  note: z.string().max(200).optional(),
});
export const FavoriteListQuerySchema = PageQuerySchema.extend({ refType: z.enum(FAVORITE_TYPES).optional() });
export const FavoriteItemSchema = z.object({
  id: z.string(),
  refType: z.enum(FAVORITE_TYPES),
  refId: z.string(),
  note: z.string().nullable(),
  createdAt: Iso,
  target: z.object({ name: z.string(), href: z.string(), slug: z.string().nullable() }).nullable(), // 目标已下线时为 null
});
export const FavoriteListResponseSchema = paged(FavoriteItemSchema);
// POST /api/v1/user/favorites：幂等（@@unique(userId,refType,refId)），重复收藏返回既有记录 HTTP 200
// DELETE /api/v1/user/favorites/[id]：物理删除本人记录；0 行（不存在/非本人）→ 40000（防枚举，沿用 api-keys DELETE 口径）
export const FavoriteDeleteResponseSchema = z.object({ deleted: z.literal(true) });

// ---------- S4 · 限时优惠 ----------
export const PromotionPriceCreateSchema = z
  .object({
    modelId: z.string().min(1),
    priceInput: DecimalStr, // ¥/M Tokens；"0" = 免费
    priceOutput: DecimalStr,
    priceCache: DecimalStr.nullish(),
    effectiveFrom: Iso,
    effectiveUntil: Iso, // 必填：限时优惠必须有结束时间
    notes: z.string().max(200).nullish(),
    idempotencyKey: z.string().min(8).max(64).optional(),
  })
  .refine((v) => new Date(v.effectiveUntil) > new Date(v.effectiveFrom), "effectiveUntil 必须晚于 effectiveFrom");
export const PromotionPricePatchSchema = z
  .object({
    priceInput: DecimalStr.optional(),
    priceOutput: DecimalStr.optional(),
    priceCache: DecimalStr.nullish(),
    effectiveFrom: Iso.optional(),
    effectiveUntil: Iso.optional(),
    notes: z.string().max(200).nullish(),
  })
  .strict();
/** 公开展示与计费共用的「生效价」DTO（不含任何加价率/倍率字段——开发流程.md §五.3） */
export const EffectivePriceSchema = z.object({
  modelId: z.string(),
  priceInput: DecimalStr,
  priceOutput: DecimalStr,
  priceCache: DecimalStr.nullable(),
  isPromotion: z.boolean(),
  promotionEndsAt: Iso.nullable(),
  basePriceInput: DecimalStr.nullable(), // 优惠生效时的原价，供前台划线展示；非优惠时 null
  basePriceOutput: DecimalStr.nullable(),
  // —— v0.2 增补（TASK-047，ADR-P005）：生效价一律归一为 CNY / 每百万 Token ——
  currency: z.literal("CNY"),
  unit: z.literal("per_million_tokens"),
  sourceCurrency: z.string().length(3), // 官方原币（如 USD），前台用于「官方 $y / M」注记
  sourceUnit: z.enum(["per_million_tokens", "per_1k_tokens"]),
  sourcePriceInput: DecimalStr, // 官方原价（原币、原单位）——满足「展示价与官方一致」：原价必须可见
  sourcePriceOutput: DecimalStr,
  fxRate: DecimalStr.nullable(), // sourceCurrency=CNY 时 null
});
/** 计价口径归一（v0.2，TASK-047/048）。汇率数值【不在契约中写死】：取 SystemConfig[FX_CONFIG_KEY]，值由 U-15 裁决。 */
export const PRICE_NORMALIZATION = {
  targetCurrency: "CNY",
  targetUnit: "per_million_tokens",
  supportedSourceCurrencies: ["CNY", "USD"] as const,
  unitFactorToMillion: { per_million_tokens: 1, per_1k_tokens: 1000 } as const,
  FX_CONFIG_KEY: "pricing.fxUsdCny",
  /** 汇率缺失/非正数/未知币种：该价格行不可归一 → 网关跳过该候选（降级链继续，最终 30002），读侧显示「价格待核」 */
  onUnnormalizable: "skip-candidate",
} as const;
export const FxConfigSchema = z.object({ key: z.literal("pricing.fxUsdCny"), value: DecimalStr.refine((v) => Number(v) > 0, "汇率必须为正") });
// 归一规则（v0.2）：normalized = sourcePrice × unitFactorToMillion[sourceUnit] × (sourceCurrency==='USD' ? fx : 1)；计费与展示共用同一归一结果。
// 生效规则（单一口径）：at 时刻存在 sourceType=PROMOTION 且 effectiveFrom<=at<effectiveUntil 的行 → 用之；否则 isCurrent=true 行。
// 同一模型优惠窗口不得重叠（写侧校验 → 40000）。

// ---------- S5 · 全局搜索 ----------
export const SEARCH_TYPES = ["model", "product", "news"] as const;
export const SearchQuerySchema = z.object({
  q: z.string().trim().min(1).max(50),
  types: z
    .string()
    .optional()
    .transform((s) => (s ? s.split(",") : [...SEARCH_TYPES]))
    .pipe(z.array(z.enum(SEARCH_TYPES)).min(1)),
  limit: z.coerce.number().int().min(1).max(10).default(5), // 每类上限
});
export const SearchHitSchema = z.object({
  type: z.enum(SEARCH_TYPES),
  id: z.string(),
  title: z.string(),
  subtitle: z.string().nullable(),
  href: z.string().startsWith("/"),
});
export const SearchResponseSchema = z.object({ q: z.string(), hits: z.array(SearchHitSchema), tookMs: z.number().int().min(0) });

// ---------- S9 · 子平台介绍页截图（条件：U-4 素材到位） ----------
export const ProductIntroScreenshotSchema = z.object({
  url: z.string().url().refine((u) => /^https?:\/\//.test(u) || u.startsWith("/"), "仅 http/https 或站内绝对路径"),
  alt: z.string().min(1).max(60),
  caption: z.string().max(120).optional(),
});

// ---------- 端点注册表（契约测试与文档登记的机器口径） ----------
export const ENDPOINTS = [
  { id: "API-001", method: "GET", path: "/api/v1/system/ready", auth: "PUBLIC", req: null, res: "SystemReadySchema", idempotent: true, task: "TASK-003" },
  { id: "API-002", method: "GET", path: "/api/v1/system/features", auth: "PUBLIC", req: null, res: "PublicFeaturesSchema", idempotent: true, task: "TASK-015" },
  { id: "API-003", method: "GET", path: "/api/v1/admin/feature-flags", auth: "ADMIN:admin.configs.read", req: null, res: "{items: AdminFeatureFlagSchema[]}", idempotent: true, task: "TASK-016" },
  { id: "API-004", method: "PATCH", path: "/api/v1/admin/feature-flags/[id]", auth: "ADMIN:admin.configs.write", req: "AdminFeatureFlagPatchSchema", res: "AdminFeatureFlagSchema", idempotent: true, task: "TASK-016" },
  { id: "API-005", method: "GET", path: "/api/v1/user/favorites", auth: "USER", req: "FavoriteListQuerySchema", res: "FavoriteListResponseSchema", idempotent: true, task: "TASK-022" },
  { id: "API-006", method: "POST", path: "/api/v1/user/favorites", auth: "USER", req: "FavoriteCreateSchema", res: "FavoriteItemSchema", idempotent: true, task: "TASK-022" },
  { id: "API-007", method: "DELETE", path: "/api/v1/user/favorites/[id]", auth: "USER", req: null, res: "FavoriteDeleteResponseSchema", idempotent: false, task: "TASK-022" },
  { id: "API-008", method: "GET", path: "/api/v1/admin/prices/promotions", auth: "ADMIN:admin.models.read", req: "PageQuerySchema & {modelId?}", res: "paged(Promotion)", idempotent: true, task: "TASK-028" },
  { id: "API-009", method: "POST", path: "/api/v1/admin/prices/promotions", auth: "ADMIN:admin.models.write", req: "PromotionPriceCreateSchema", res: "Promotion", idempotent: true, task: "TASK-028" },
  { id: "API-010", method: "PATCH", path: "/api/v1/admin/prices/promotions/[id]", auth: "ADMIN:admin.models.write", req: "PromotionPricePatchSchema", res: "Promotion", idempotent: true, task: "TASK-028" },
  { id: "API-011", method: "DELETE", path: "/api/v1/admin/prices/promotions/[id]", auth: "ADMIN:admin.models.write", req: null, res: "{deleted:true}", idempotent: false, task: "TASK-028" },
  { id: "API-012", method: "GET", path: "/api/v1/search", auth: "PUBLIC", req: "SearchQuerySchema", res: "SearchResponseSchema", idempotent: true, task: "TASK-033" },
] as const;
