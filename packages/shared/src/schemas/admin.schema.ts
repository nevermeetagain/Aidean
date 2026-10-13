import { z } from "zod";

// ==================================================================
// 管理端契约（rebuild-admin-console-and-harden-auth Phase 2/3）
// 约定：管理端写操作白名单由本文件 zod schema 收口（越权字段剔除），
//       金额一律 BigInt 分；列表查询分页 page≥1 / pageSize≤50。
// ==================================================================

/** 通用分页/搜索查询（API query string 经 coerce 进入） */
export const AdminPageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  q: z.string().trim().max(120).optional(),
});
export type AdminPageQuery = z.infer<typeof AdminPageQuerySchema>;

// ==================== 兑换码管理查询 ====================

/** 兑换码状态白名单（与 prisma RedemptionStatus 对齐） */
export const REDEMPTION_STATUSES = [
  "ENABLED",
  "ISSUED",
  "USED",
  "DISABLED",
  "EXPIRED",
] as const;

/** 兑换码列表查询：AdminPageQuery 扩展 batchNo 精确筛选与 status 枚举白名单（非法 → 40000） */
export const AdminRedemptionListQuerySchema = AdminPageQuerySchema.extend({
  batchNo: z.string().trim().max(64).optional(),
  status: z.enum(REDEMPTION_STATUSES).optional(),
});
export type AdminRedemptionListQuery = z.infer<typeof AdminRedemptionListQuerySchema>;

// ==================== 订单/流水只读查询 ====================

/** 只读台账类型：充值订单 / 套餐订单 / 账本流水（三表只读投影，禁写） */
export const ADMIN_ORDER_TYPES = ["RECHARGE", "PACKAGE_ORDER", "LEDGER"] as const;

/** 订单/流水只读查询：type 缺省 RECHARGE；userId 精确筛选（可空）；分页 page≥1/pageSize≤50 */
export const AdminOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  type: z.enum(ADMIN_ORDER_TYPES).default("RECHARGE"),
  userId: z.string().trim().max(64).optional(),
});
export type AdminOrdersQuery = z.infer<typeof AdminOrdersQuerySchema>;

// ==================== 套餐订单（S6.1 只读 + S6.2 处置） ====================

/** 套餐订单状态（与 Prisma PackageOrderStatus 枚举名对齐：1/2/3/4） */
export const ADMIN_PACKAGE_ORDER_STATUSES = ["PENDING", "ACTIVE", "EXPIRED", "CANCELLED"] as const;

/** 套餐订单只读查询：status/userId 可选精确筛选；page≥1/pageSize≤50（封顶） */
export const AdminPackageOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  status: z.enum(ADMIN_PACKAGE_ORDER_STATUSES).optional(),
  userId: z.string().trim().max(64).optional(),
});
export type AdminPackageOrdersQuery = z.infer<typeof AdminPackageOrdersQuerySchema>;

/**
 * 订单处置动作（S6.2 受控状态机，非自由 PATCH；账本类永不删除/改写）：
 * - CLOSE 关单：RechargeOrder PENDING→EXPIRED；PackageOrder PENDING|ACTIVE→CANCELLED。
 * - FLAG 标异常：RechargeOrder PENDING→FAILED；PackageOrder PENDING|ACTIVE→CANCELLED（撤销并标注）。
 * - REVERSE 冲正：仅 RechargeOrder PAID→REFUNDED，经 billingService 写 REVERSAL 反向分录（保留原分录，非删除）。
 */
export const ORDER_DISPOSITION_ACTIONS = ["CLOSE", "FLAG", "REVERSE"] as const;

export const AdminOrderDispositionSchema = z.object({
  action: z.enum(ORDER_DISPOSITION_ACTIONS),
  reason: z.string().trim().max(200).optional(),
  idempotencyKey: z.string().min(8).max(64).optional(),
});
export type AdminOrderDisposition = z.infer<typeof AdminOrderDispositionSchema>;

// ==================== 模型定价（S7.1 定价孤岛激活） ====================

/**
 * 定价只读查询（ModelPrice，与 /pricing 前台同源消费）：
 * - q 命中模型 nameDisplay/slug/modelCode（不区分大小写）；
 * - modelId 精确锁定某模型当前价；
 * - limit 封顶 200（仅取 isCurrent=true 行）。
 */
export const AdminPricesQuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  modelId: z.string().trim().max(64).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});
export type AdminPricesQuery = z.infer<typeof AdminPricesQuerySchema>;

/** 单价金额：非负有限数（Decimal 19,6 由 Prisma 侧接受 number/string） */
const priceAmount = z.coerce.number().finite().min(0).max(1_000_000);

/** 编辑当前价：input/output 必填非负；cache/perRequest 可空；计价粒度/币种/备注可选 */
export const AdminPricePatchSchema = z.object({
  priceInput: priceAmount,
  priceOutput: priceAmount,
  priceCache: priceAmount.nullable().optional(),
  pricePerRequest: priceAmount.nullable().optional(),
  billingUnit: z.string().trim().max(40).optional(),
  billingCurrency: z.string().trim().regex(/^[A-Za-z]{3}$/).optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});
export type AdminPricePatch = z.infer<typeof AdminPricePatchSchema>;

/** 为尚无当前价的模型新建当前价（已有当前价 → 服务端 400，改用编辑） */
export const AdminPriceCreateSchema = AdminPricePatchSchema.extend({
  modelId: z.string().trim().min(1).max(64),
  billingMode: z.enum(["PER_TOKEN", "PER_REQUEST", "PER_MINUTE", "FREE"]).default("PER_TOKEN"),
});
export type AdminPriceCreate = z.infer<typeof AdminPriceCreateSchema>;

// ==================== OIDC 客户端（S7.3 接入断链） ====================

/**
 * OIDC 客户端元数据编辑（不涉及 secret：secret 由 seed/env 供用，后台不发放/不改）。
 * - redirectUris 逐条 URL；scopes 非空字符串数组；logoutUri 可空；isActive 启停。
 * - 用于运营常用变更（加/改回调域、调 scope、停用），不暴露 clientSecretHash。
 */
export const AdminOidcClientPatchSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  redirectUris: z.array(z.string().trim().url().max(500)).max(20).optional(),
  logoutUri: z.string().trim().url().max(500).nullable().optional(),
  scopes: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
  isActive: z.boolean().optional(),
});
export type AdminOidcClientPatch = z.infer<typeof AdminOidcClientPatchSchema>;

// ==================== 站点配置（通用键值，白名单） ====================

/**
 * 管理端可在线编辑的 SystemConfig 白名单（P2 泛化 ladder/config 模式）。
 * 扩容规则（B-N7 立项）：① 键取自 seed systemConfigsData（seed 为真源，registry 仅作缺行兜底）；
 * ② 新键须先入 seed，再同步本常量 + 路由 CONFIG_REGISTRY + 三件套文档；
 * ③ 命名：存量 ladder_score_granularity 为下划线（兼容保留），新增键统一 dotted（site.*）。
 */
export const ADMIN_CONFIG_KEYS = [
  "ladder_score_granularity",
  "site.name",
  "site.description",
  "site.logoUrl",
  "site.title",
  "site.faviconUrl",
  "site.seo.keywords",
  "home.hero",
  "home.valuePoints",
  "home.modelEntries",
  "docs.articles",
  "pricing.evalPerModel",
  "pricing.currency",
  "security.accessTokenTtlMinutes",
  "security.refreshTokenTtlDays",
  "security.maxLoginAttempts",
  "about.contactEmail",
  "about.wechatQrUrl",
  "roadmap.milestones",
  "partners.marquee",
  "about.body",
  "partners.education",
  "partners.paper",
  "partners.research",
] as const;

/**
 * 配置写入：configKey 白名单枚举；configValue 支持 number/string。
 * 空串在此层不判非法——是否允许空由路由 CONFIG_REGISTRY 的 valueRule.allowEmpty 逐键决定
 * （如 site.title 允许空=回退站点名称，其余键空串→40000），避免"一刀切"误伤可空键。
 */
export const AdminConfigPutSchema = z.object({
  configKey: z.enum(ADMIN_CONFIG_KEYS),
  configValue: z.union([
    z.number().finite(),
    z.string().trim().max(10000),
  ]),
});
export type AdminConfigPut = z.infer<typeof AdminConfigPutSchema>;

// ==================== 用户管理 ====================

/** 用户新建（email 唯一；nickname 可空；tier 缺省 NORMAL） */
export const AdminUserCreateSchema = z.object({
  email: z.string().email().max(200),
  nickname: z.string().max(120).nullish(),
  tier: z.enum(["NORMAL", "PRO", "MAX"]).default("NORMAL"),
});
export type AdminUserCreate = z.infer<typeof AdminUserCreateSchema>;

/** 用户 PATCH 白名单：tier 与 status（封禁/解封）；其余字段一律剔除拒绝 */
export const AdminUserPatchSchema = z
  .object({
    tier: z.enum(["NORMAL", "PRO", "MAX"]).optional(),
    status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
  })
  .refine((v) => v.tier !== undefined || v.status !== undefined, {
    message: "无可变更字段（仅允许 tier/status）",
  });
export type AdminUserPatch = z.infer<typeof AdminUserPatchSchema>;

// ==================== 模型管理 ====================

/** 模型新建（modelCode/slug 唯一；vendorId 必须存在于 vendors 表；modelType 枚举与 Prisma 对齐） */
export const AdminModelCreateSchema = z.object({
  modelCode: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-zA-Z0-9._-]+$/, "modelCode 须为字母/数字/点/下划线/连字符"),
  nameDisplay: z.string().min(1).max(120),
  nameCn: z.string().max(120).nullish(),
  nameEn: z.string().max(120).nullish(),
  slug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9][a-z0-9-]*$/, "slug 须为小写字母/数字/连字符"),
  vendorId: z.string().min(1).max(64),
  modelType: z.enum(["CHAT", "REASONING", "MULTIMODAL", "CODE", "VISION"]),
  protocol: z.enum(["OPENAI", "ANTHROPIC", "GOOGLE", "CUSTOM", "RESPONSES"]).default("OPENAI"),
  contextLength: z.number().int().min(1).max(2_000_000).nullish(),
  parameterCount: z.string().max(60).nullish(),
  isOpenSource: z.boolean().default(false),
  isMultiModal: z.boolean().default(false),
  isReasoning: z.boolean().default(false),
  isCodingOptimized: z.boolean().default(false),
  officialUrl: z.string().url().nullish(),
  docsUrl: z.string().url().nullish(),
  isActive: z.boolean().default(true),
  visibility: z.enum(["PUBLIC", "LOGIN_ONLY", "PAID_ONLY", "HIDDEN"]).default("PUBLIC"),
  sortOrder: z.number().int().min(0).max(9999).default(0),
});
export type AdminModelCreate = z.infer<typeof AdminModelCreateSchema>;

/** 模型 PATCH 白名单：nameDisplay/isActive/visibility/isFeatured/sortOrder */
export const AdminModelPatchSchema = z
  .object({
    nameDisplay: z.string().min(1).max(120).optional(),
    isActive: z.boolean().optional(),
    visibility: z.enum(["PUBLIC", "LOGIN_ONLY", "PAID_ONLY", "HIDDEN"]).optional(),
    isFeatured: z.boolean().optional(),
    sortOrder: z.number().int().min(0).max(9999).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "无可变更字段" });
export type AdminModelPatch = z.infer<typeof AdminModelPatchSchema>;

// ==================== 提供商管理 ====================

/** 提供商新建（code 唯一小写串；priority 1-99 越小越优先） */
export const AdminVendorCreateSchema = z.object({
  code: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9][a-z0-9-]*$/, "code 须为小写字母/数字/连字符"),
  name: z.string().min(1).max(120),
  nameCn: z.string().max(120).nullish(),
  priority: z.number().int().min(1).max(99).default(50),
  isActive: z.boolean().default(true),
});
export type AdminVendorCreate = z.infer<typeof AdminVendorCreateSchema>;

/** 提供商编辑白名单（code 创建后不可改） */
export const AdminVendorPatchSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    nameCn: z.string().max(120).nullish(),
    priority: z.number().int().min(1).max(99).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "无可变更字段" });
export type AdminVendorPatch = z.infer<typeof AdminVendorPatchSchema>;

// ==================== 模型提供商管理（ModelProvider） ====================

/** 模型提供商新建（code 唯一小写串；rechargeRatio 充值比例 1元=N外币） */
export const AdminProviderCreateSchema = z.object({
  code: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9][a-z0-9-]*$/, "code 须为小写字母/数字/连字符"),
  name: z.string().min(1).max(120),
  nameCn: z.string().max(120).nullish(),
  nameEn: z.string().max(120).nullish(),
  logoUrl: z.string().url().nullish(),
  brandColor: z.string().max(20).nullish(),
  website: z.string().url().nullish(),
  apiUrl: z.string().url().nullish(),
  description: z.string().max(2000).nullish(),
  descriptionCn: z.string().max(2000).nullish(),
  rechargeRatio: z.coerce.number().min(0.0001).max(9999),
  priceCurrency: z.string().min(1).max(10).default("USD"),
  rechargeCurrency: z.string().min(1).max(10).default("CNY"),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(9999).default(0),
});
export type AdminProviderCreate = z.infer<typeof AdminProviderCreateSchema>;

/** 模型提供商编辑白名单（code 创建后不可改） */
export const AdminProviderPatchSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    nameCn: z.string().max(120).nullish(),
    nameEn: z.string().max(120).nullish(),
    logoUrl: z.string().url().nullish(),
    brandColor: z.string().max(20).nullish(),
    website: z.string().url().nullish(),
    apiUrl: z.string().url().nullish(),
    description: z.string().max(2000).nullish(),
    descriptionCn: z.string().max(2000).nullish(),
    rechargeRatio: z.coerce.number().min(0.0001).max(9999).optional(),
    priceCurrency: z.string().min(1).max(10).optional(),
    rechargeCurrency: z.string().min(1).max(10).optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().min(0).max(9999).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "无可变更字段" });
export type AdminProviderPatch = z.infer<typeof AdminProviderPatchSchema>;

// ==================== 提供商模型挂载（ProviderModelOffering） ====================

/** 提供商模型挂载 upsert（providerId × modelId 唯一键） */
export const AdminOfferingUpsertSchema = z.object({
  modelId: z.string().min(1).max(64),
  listedAt: z.string().datetime().nullish(),
  defaultMultiplier: z.coerce.number().min(0.0001).max(999).default(1.0),
  priceInput: z.coerce.number().min(0).nullish(),
  priceOutput: z.coerce.number().min(0).nullish(),
  priceCache: z.coerce.number().min(0).nullish(),
  priceUnit: z.enum(["per_million_tokens", "per_1k_tokens"]).default("per_million_tokens"),
  discountInputMin: z.coerce.number().min(0).nullish(),
  discountInputMax: z.coerce.number().min(0).nullish(),
  discountOutputMin: z.coerce.number().min(0).nullish(),
  discountOutputMax: z.coerce.number().min(0).nullish(),
  discountCacheMin: z.coerce.number().min(0).nullish(),
  discountCacheMax: z.coerce.number().min(0).nullish(),
  effectiveFrom: z.string().datetime(),
  effectiveUntil: z.string().datetime().nullish(),
  isActive: z.boolean().default(true),
});
export type AdminOfferingUpsert = z.infer<typeof AdminOfferingUpsertSchema>;

/** 提供商模型挂载编辑白名单 */
export const AdminOfferingPatchSchema = z
  .object({
    listedAt: z.string().datetime().nullish(),
    defaultMultiplier: z.coerce.number().min(0.0001).max(999).optional(),
    priceInput: z.coerce.number().min(0).nullish(),
    priceOutput: z.coerce.number().min(0).nullish(),
    priceCache: z.coerce.number().min(0).nullish(),
    priceUnit: z.enum(["per_million_tokens", "per_1k_tokens"]).optional(),
    discountInputMin: z.coerce.number().min(0).nullish(),
    discountInputMax: z.coerce.number().min(0).nullish(),
    discountOutputMin: z.coerce.number().min(0).nullish(),
    discountOutputMax: z.coerce.number().min(0).nullish(),
    discountCacheMin: z.coerce.number().min(0).nullish(),
    discountCacheMax: z.coerce.number().min(0).nullish(),
    effectiveFrom: z.string().datetime().optional(),
    effectiveUntil: z.string().datetime().nullish(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "无可变更字段" });
export type AdminOfferingPatch = z.infer<typeof AdminOfferingPatchSchema>;

// ==================== 产品管理 ====================

// ---------- 产品介绍块（add-subplatform-showcase-pages，intro Json 列的写侧强校验真源） ----------

/** URL 协议白名单：仅 http/https（防 javascript:/data: 混入前台 href） */
const introHttpUrl = z
  .string()
  .max(500)
  .url("须为合法 URL")
  .refine((u) => /^https?:\/\//i.test(u), "仅允许 http/https 协议");

/** 介绍页链接（后台可配置；kind 决定前台 CTA 语义：product=主按钮，其余 outline） */
export const ProductIntroLinkSchema = z.object({
  label: z.string().min(1).max(20),
  url: introHttpUrl,
  kind: z.enum(["product", "repo", "docs", "other"]).default("other"),
});

/** 信息条目分组（前台按组渲染信息表卡片） */
export const ProductIntroFactSchema = z.object({
  group: z.string().min(1).max(20),
  items: z
    .array(z.object({ label: z.string().min(1).max(20), value: z.string().min(1).max(120) }))
    .min(1)
    .max(12),
});

/** 价值层「解决什么问题」：痛点 → 解法 对照（enrich-subplatform-intro-pages） */
export const ProductIntroProblemSchema = z.object({
  problem: z.string().min(1).max(80),
  solution: z.string().min(1).max(200),
});

/** 流程层「如何使用」：编号步骤序列（同上；title 用于步骤区引导语） */
export const ProductIntroWorkflowSchema = z.object({
  title: z.string().min(1).max(40),
  steps: z.array(z.string().min(1).max(120)).min(1).max(8),
});

/**
 * 产品介绍块 v2：v1（links+facts）逐字保留 + 三层介绍模型可选区块。
 * v2 区块全 optional：缺省即前台零渲染（无空壳区块契约不变）；
 * version 接受 1/2 —— v1 存量 JSON 在新契约下照常解析，零迁移平滑兼容。
 */
export const ProductIntroSchema = z.object({
  version: z.union([z.literal(1), z.literal(2)]).default(1),
  links: z.array(ProductIntroLinkSchema).max(6).default([]),
  facts: z.array(ProductIntroFactSchema).max(6).default([]),
  // —— v2 三层区块（身份 / 价值 / 流程 / 决策）——
  audience: z.string().min(1).max(80).optional(),
  problems: z.array(ProductIntroProblemSchema).max(4).optional(),
  workflow: ProductIntroWorkflowSchema.optional(),
  promises: z.array(z.string().min(1).max(120)).min(1).max(4).optional(),
  ecosystem: z.array(z.string().min(1).max(120)).min(1).max(4).optional(),
});
export type ProductIntro = z.infer<typeof ProductIntroSchema>;
export type ProductIntroLink = z.infer<typeof ProductIntroLinkSchema>;
export type ProductIntroFact = z.infer<typeof ProductIntroFactSchema>;
export type ProductIntroProblem = z.infer<typeof ProductIntroProblemSchema>;
export type ProductIntroWorkflow = z.infer<typeof ProductIntroWorkflowSchema>;

/** 产品新建（slug 唯一；benefits 为权益条目字符串数组；intro 为结构化介绍块） */
export const AdminProductCreateSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9][a-z0-9-]*$/, "slug 须为小写字母/数字/连字符"),
  name: z.string().min(1).max(120),
  displayName: z.string().max(40).nullish(),
  category: z.enum(["OFFERING", "OPEN_SOURCE", "PARTNER"]).nullish(),
  tagline: z.string().max(200).nullish(),
  description: z.string().max(2000).nullish(),
  badge: z.string().max(30).nullish(),
  benefits: z.array(z.string().max(200)).max(12).optional(),
  intro: ProductIntroSchema.nullish(),
  status: z.enum(["ACTIVE", "DISABLED"]).default("ACTIVE"),
  sortOrder: z.number().int().min(0).max(999).default(0),
});
export type AdminProductCreate = z.infer<typeof AdminProductCreateSchema>;

/** 产品编辑白名单（slug 不可改） */
export const AdminProductPatchSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    displayName: z.string().max(40).nullish(),
    category: z.enum(["OFFERING", "OPEN_SOURCE", "PARTNER"]).nullish(),
    tagline: z.string().max(200).nullish(),
    description: z.string().max(2000).nullish(),
    badge: z.string().max(30).nullish(),
    benefits: z.array(z.string().max(200)).max(12).optional(),
    intro: ProductIntroSchema.nullish(),
    status: z.enum(["ACTIVE", "DISABLED"]).optional(),
    sortOrder: z.number().int().min(0).max(999).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "无可变更字段" });
export type AdminProductPatch = z.infer<typeof AdminProductPatchSchema>;

// ==================== 套餐管理 ====================

/** 套餐新建（priceMinor 为分 BigInt；stationId 空表示平台通用套餐） */
export const AdminPackageCreateSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(500).nullish(),
  priceMinor: z.coerce.bigint().min(0n),
  durationHours: z.number().int().min(1).max(87600).nullish(),
  benefits: z.array(z.string().max(200)).max(20).optional(),
  status: z.enum(["ACTIVE", "DISABLED"]).default("ACTIVE"),
  sortOrder: z.number().int().min(0).max(999).default(0),
});
export type AdminPackageCreate = z.infer<typeof AdminPackageCreateSchema>;

/** 套餐编辑白名单（price/status/benefits 等可改；title 可改） */
export const AdminPackagePatchSchema = z
  .object({
    title: z.string().min(1).max(120).optional(),
    description: z.string().max(500).nullish(),
    priceMinor: z.coerce.bigint().min(0n).optional(),
    durationHours: z.number().int().min(1).max(87600).nullish(),
    benefits: z.array(z.string().max(200)).max(20).optional(),
    status: z.enum(["ACTIVE", "DISABLED"]).optional(),
    sortOrder: z.number().int().min(0).max(999).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "无可变更字段" });
export type AdminPackagePatch = z.infer<typeof AdminPackagePatchSchema>;

// ==================== 兑换码批次 ====================

/** 兑换码批次生成入参：面额/数量≤500/前缀≤8/有效期须未来；余额码须带 balanceMinor（≤1e8 分），套餐码须带 packageId */
export const AdminRedemptionBatchCreateSchema = z
  .object({
    name: z.string().max(60).nullish(),
    targetType: z.enum(["BALANCE", "PACKAGE"]),
    balanceMinor: z.coerce.bigint().positive().max(100_000_000n, "单码面额超上限（≤1e8 分 / ¥100 万）").optional(),
    packageId: z.string().min(1).optional(),
    count: z.number().int().min(1).max(500),
    prefix: z
      .string()
      .regex(/^[A-Za-z0-9]{0,8}$/, "前缀须为 0-8 位字母数字")
      .default(""),
    expiresAt: z.coerce
      .date()
      .nullish()
      .refine((v) => v == null || v.getTime() > Date.now(), { message: "有效期须为未来时间" }),
  })
  .refine(
    (v) => (v.targetType === "BALANCE" ? v.balanceMinor !== undefined : v.packageId !== undefined),
    { message: "余额码须带 balanceMinor；套餐码须带 packageId" }
  );
export type AdminRedemptionBatchCreate = z.infer<typeof AdminRedemptionBatchCreateSchema>;

// ==================== 在途冻结款（S5 holds 只读分页 / M6 / G3） ====================

/** 冻结款状态白名单（与 Prisma HoldStatus 枚举名对齐：AUTHORIZED/CAPTURED/VOIDED/EXPIRED） */
export const ADMIN_HOLD_STATUSES = ["AUTHORIZED", "CAPTURED", "VOIDED", "EXPIRED"] as const;

/** 日期筛选入参：YYYY-MM-DD 或 ISO8601（与日志中心同口径，路由层再解析为 Date）。 */
const holdIsoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}(T.*)?$/, "日期格式须为 YYYY-MM-DD 或 ISO8601");

/**
 * 在途冻结款只读查询（BalanceHold，无写侧）：
 * status/userId/from/to 均可选精确筛选；page≥1 / pageSize≤100（记录类量大，封顶放宽）。
 * userId 经所属 Wallet 关联过滤（BalanceHold 本身不存 userId）。
 */
export const AdminHoldsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(ADMIN_HOLD_STATUSES).optional(),
  userId: z.string().trim().max(64).optional(),
  from: holdIsoDate.optional(),
  to: holdIsoDate.optional(),
});
export type AdminHoldsQuery = z.infer<typeof AdminHoldsQuerySchema>;

// ==================== 钱包调账 ====================

/** 管理端调账入参：金额可负（恒非 0）、备注必填；idempotencyKey 缺省由服务端生成 */
export const AdminWalletAdjustSchema = z.object({
  walletId: z.string().min(1),
  amountMinor: z.coerce.bigint().refine((v) => v !== 0n, "调整金额不可为 0"),
  note: z.string().min(1).max(200),
  idempotencyKey: z.string().min(8).max(64).optional(),
});
export type AdminWalletAdjust = z.infer<typeof AdminWalletAdjustSchema>;

// ==================== 卡商密钥 ====================

/** PartnerKey 新建（明文仅创建响应一次性返回，库内只存 SHA-256） */
export const AdminPartnerKeyCreateSchema = z.object({
  name: z.string().min(1).max(60),
});
export type AdminPartnerKeyCreate = z.infer<typeof AdminPartnerKeyCreateSchema>;
