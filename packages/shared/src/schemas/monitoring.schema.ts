// 模型源监控契约（REQ-M-001..016）—— 由 docs/任务规划V0.5.0/contracts/07-monitoring.contract.ts 经 TASK-056 原样落地。
// 落地映射（唯一源 = 本文件 + errors.ts，ADR-P001）：
//   ① API / ⑤ Events / ⑥ UX：本文件（字段名与枚举值逐字沿用契约，不得改）；
//   ② Errors：MONITOR_SOURCE_NOT_FOUND=20004 / MONITOR_SOURCE_CREDENTIAL_MISSING=50012 已并入 errors.ts ERROR_CODES（共 27 码），
//      本文件 MONITORING_ERROR_CODES 为其子集视图（值取自 ERROR_CODES，单一来源）。
//   ③ Identity：无新增权限码——读 admin:sync:read、写 admin:sync:write。
// 唯一偏差（落地适配，非语义变更）：契约自 01-api.contract.ts 引入 PageQuerySchema/paged，shared 尚无同名导出，
//   故在本文件内以逐字相同定义的模块私有常量承接（不导出，避免与 TASK-032 等后续契约的 barrel 同名冲突）。
// 价格一律「原币 + 单位」，本包不做汇率换算（U-15 未决）。
import { z } from "zod";
import { DEFAULT_STATUS_BY_CODE, ERROR_CODES } from "../errors";

// —— 01-api.contract.ts 全局分页口径（逐字同形，模块私有）——
const PageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});
function paged<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    items: z.array(item),
    total: z.number().int().min(0),
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1),
    totalPages: z.number().int().min(0),
  });
}

const Iso = z.string().datetime();
const PriceStr = z.string().regex(/^\d+(\.\d+)?$/); // 原币单价字符串（Decimal），单位见 priceUnit

// ---------------------------------------------------------------- 枚举
/** 源结构性风险分级（来自补充1，属结构分层而非实测 SLA）：S1 原厂 / S2 云厂商 / A 托管推理 / B 聚合路由 / C 中转 */
export const SOURCE_TIERS = ["S1", "S2", "A", "B", "C"] as const;
export const SourceTierSchema = z.enum(SOURCE_TIERS);
export const SOURCE_KINDS = ["official", "cloud", "hosted", "aggregator", "relay", "benchmark", "community"] as const;
export const SourceKindSchema = z.enum(SOURCE_KINDS);
/** 条款状态：allowed=已核验允许自动采集；attribution_required=需署名；pending=未核验（禁止对外展示）；forbidden=禁止 */
export const TosStatusSchema = z.enum(["allowed", "attribution_required", "pending", "forbidden"]);
export const RunStatusSchema = z.enum(["never", "ok", "partial", "failed", "credential_missing", "disabled"]);
export const PRICE_UNITS = ["usd_per_1m_tokens", "cny_per_1m_tokens", "usd_per_request", "ratio"] as const;
export const PriceUnitSchema = z.enum(PRICE_UNITS);

// ---------------------------------------------------------------- 实体 DTO（与 database/002_monitoring.sql 一一对应）
export const MonitoringSourceSchema = z.object({
  key: z.string().regex(/^[a-z0-9][a-z0-9-]{1,39}$/),
  label: z.string().min(1).max(80),
  tier: SourceTierSchema,
  kind: SourceKindSchema,
  endpoint: z.string().url(),
  docsUrl: z.string().url().nullable(),
  authRequired: z.boolean(),
  cadenceCron: z.string().min(9).max(64), // 5 段 cron
  tosStatus: TosStatusSchema,
  enabled: z.boolean(),
  mappedEntityType: z.enum(["ModelProvider", "APIStation"]).nullable(), // U-M5
  mappedEntityId: z.string().nullable(),
  lastRunAt: Iso.nullable(),
  lastStatus: RunStatusSchema,
  lastCount: z.number().int().min(0).nullable(),
  lastError: z.string().max(2000).nullable(),
});
export type MonitoringSource = z.infer<typeof MonitoringSourceSchema>;

export const CatalogSnapshotSchema = z.object({
  id: z.string().uuid(),
  sourceKey: z.string(),
  fetchedAt: Iso,
  itemCount: z.number().int().min(0),
  rawSha256: z.string().regex(/^[a-f0-9]{64}$/),
  rawBytes: z.number().int().min(0),
  rawSample: z.string().max(2048),
  sourceUrl: z.string().url(),
});

export const ProviderModelObservationSchema = z.object({
  sourceKey: z.string(),
  externalModelId: z.string().min(1).max(200),
  normalizedModelId: z.string().min(1).max(200), // 小写、去 vendor 前缀与 :free/:batch 等后缀（DESIGN-004 §4）
  displayName: z.string().max(200).nullable(),
  vendorHint: z.string().max(80).nullable(), // 源自报的开发商，仅作线索（MUST NOT 当身份证据，REQ-M-014）
  isListed: z.boolean(),
  priceUnit: PriceUnitSchema.nullable(),
  priceInput: PriceStr.nullable(),
  priceOutput: PriceStr.nullable(),
  priceCacheRead: PriceStr.nullable(),
  contextLength: z.number().int().positive().nullable(),
  firstSeenAt: Iso,
  lastSeenAt: Iso,
  delistedAt: Iso.nullable(),
});
export type ProviderModelObservation = z.infer<typeof ProviderModelObservationSchema>;

const ChangeBase = z.object({
  id: z.string().uuid(),
  sourceKey: z.string(),
  snapshotId: z.string().uuid(),
  externalModelId: z.string(),
  normalizedModelId: z.string(),
  detectedAt: Iso,
  sourceUrl: z.string().url(),
});
export const CatalogChangeEventSchema = z.discriminatedUnion("kind", [
  ChangeBase.extend({ kind: z.literal("listed") }),
  ChangeBase.extend({ kind: z.literal("delisted") }),
  ChangeBase.extend({ kind: z.literal("model_first_seen") }),
  ChangeBase.extend({
    kind: z.literal("price_changed"),
    priceUnit: PriceUnitSchema,
    before: z.object({ input: PriceStr.nullable(), output: PriceStr.nullable() }),
    after: z.object({ input: PriceStr.nullable(), output: PriceStr.nullable() }),
    deltaPct: z.number(), // |Δ| ≥ 1 才产生事件
  }),
]);
export type CatalogChangeEvent = z.infer<typeof CatalogChangeEventSchema>;
export const PRICE_CHANGE_THRESHOLD_PCT = 1;

export const AvailabilityProbeResultSchema = z.object({
  sourceKey: z.string(),
  model: z.string(),
  ok: z.boolean(),
  latencyMs: z.number().nonnegative().nullable(),
  identitySignal: z.enum(["verified_signature", "missing_signature", "not_applicable", "error"]),
  probedAt: Iso,
});

// ---------------------------------------------------------------- ① API
export const AdminMonitoringSourceListResponse = z.object({ items: z.array(MonitoringSourceSchema) });
export const AdminMonitoringSourcePatchBody = z
  .object({ enabled: z.boolean().optional(), cadenceCron: z.string().min(9).max(64).optional() })
  .strict()
  .refine((b) => b.enabled !== undefined || b.cadenceCron !== undefined, { message: "至少一个字段" });
export const AdminMonitoringRunResponse = z.object({ accepted: z.literal(true), sourceKey: z.string(), lockTtlSeconds: z.literal(300) });
export const AdminMonitoringChangeQuery = PageQuerySchema.extend({
  sourceKey: z.string().optional(),
  kind: z.enum(["listed", "delisted", "model_first_seen", "price_changed"]).optional(),
  since: Iso.optional(),
});
export const AdminMonitoringChangeListResponse = paged(CatalogChangeEventSchema);
export const ModelOfferingsResponse = z.object({
  items: z.array(
    z.object({
      sourceKey: z.string(),
      sourceLabel: z.string(),
      tier: SourceTierSchema,
      kind: SourceKindSchema,
      isListed: z.boolean(),
      identityVerified: z.boolean(), // kind=relay 恒 false（REQ-M-014）
      priceUnit: PriceUnitSchema.nullable(),
      priceInput: PriceStr.nullable(),
      priceOutput: PriceStr.nullable(),
      firstSeenAt: Iso,
      lastSeenAt: Iso,
      sourceUrl: z.string().url(),
      attribution: z.string().nullable(), // 如 "Artificial Analysis"（ADR-P007）
    }),
  ),
});

export const MONITORING_ENDPOINTS = [
  { method: "GET", path: "/api/v1/admin/monitoring/sources", auth: "ADMIN:admin:sync:read", res: "AdminMonitoringSourceListResponse", idempotent: true, task: "TASK-063" },
  { method: "PATCH", path: "/api/v1/admin/monitoring/sources/{key}", auth: "ADMIN:admin:sync:write", req: "AdminMonitoringSourcePatchBody", res: "MonitoringSourceSchema", idempotent: true, task: "TASK-063" },
  { method: "POST", path: "/api/v1/admin/monitoring/sources/{key}/run", auth: "ADMIN:admin:sync:write", res: "AdminMonitoringRunResponse(202)", idempotent: "Redis 锁 lock:monitor:run:{key} TTL300；锁内重复调用→10006", task: "TASK-063" },
  { method: "GET", path: "/api/v1/admin/monitoring/changes", auth: "ADMIN:admin:sync:read", req: "AdminMonitoringChangeQuery", res: "AdminMonitoringChangeListResponse", idempotent: true, task: "TASK-063" },
  { method: "GET", path: "/api/v1/models/{id}/offerings", auth: "PUBLIC", res: "ModelOfferingsResponse", idempotent: true, cache: "cache:model-offerings:{id} 600s", task: "TASK-066" },
] as const;

// ---------------------------------------------------------------- ② Errors（增量；码值唯一源在 errors.ts）
export const MONITORING_ERROR_CODES = {
  /** 监控源 key 不存在（PATCH/run 路径参数） */
  MONITOR_SOURCE_NOT_FOUND: ERROR_CODES.MONITOR_SOURCE_NOT_FOUND,
  /** 源需要 API Key 但未配置（run 或 keyed collector） */
  MONITOR_SOURCE_CREDENTIAL_MISSING: ERROR_CODES.MONITOR_SOURCE_CREDENTIAL_MISSING,
} as const;
export const MONITORING_STATUS_BY_CODE = {
  20004: DEFAULT_STATUS_BY_CODE[20004] as 404,
  50012: DEFAULT_STATUS_BY_CODE[50012] as 503,
} as const;
export const MONITORING_FAILURE_PATHS = [
  { path: "PATCH/run 的 {key} 未注册", code: "MONITOR_SOURCE_NOT_FOUND" },
  { path: "run authRequired 源但 env MONITOR_KEY_<SOURCE> 缺失", code: "MONITOR_SOURCE_CREDENTIAL_MISSING" },
  { path: "run 锁内重复触发", code: "TOO_MANY_REQUESTS" },
  { path: "PATCH body 空或含非白名单字段", code: "BAD_REQUEST" },
  { path: "无 admin:sync:* 权限", code: "FORBIDDEN" },
  { path: "offerings 的 {id} 不存在", code: "MODEL_NOT_FOUND" },
] as const;
export const MONITORING_PRESENTATION = {
  20004: { ui: "toast", message: "监控源不存在或已删除" },
  50012: { ui: "inline", message: "该源需要 API Key，请先在部署环境配置" },
} as const;

// ---------------------------------------------------------------- ⑤ Events
export const MONITORING_EVENTS = [
  { name: "catalog.snapshot.created", payload: "CatalogSnapshotSchema", trigger: "persistCatalogSnapshot 成功（非重复哈希）", idempotencyKey: "sourceKey + rawSha256" },
  { name: "catalog.change.detected", payload: "CatalogChangeEventSchema", trigger: "diff 产出事件", idempotencyKey: "snapshotId + normalizedModelId + kind" },
] as const;

// ---------------------------------------------------------------- ⑥ UX States
export const MONITORING_UX_STATES = {
  adminMonitoring: {
    route: "/admin/monitoring",
    empty: { testid: "monitoring-empty", copy: "尚未注册监控源或尚无变更" },
    loading: { testid: "monitoring-loading" },
    error: { testid: "monitoring-error", copy: "加载失败，可重试" },
    forbidden: { testid: "monitoring-forbidden", copy: "无权限查看模型源监控" },
    ready: { testid: "monitoring-ready" },
  },
  modelOfferings: {
    route: "/models/[slug]#offerings",
    empty: { testid: "offerings-empty", copy: "暂无多源上架数据" },
    loading: { testid: "offerings-loading" },
    error: { testid: "offerings-error" },
    forbidden: { testid: "offerings-forbidden", copy: "（公开区块，不出现）" },
    ready: { testid: "offerings-ready" },
  },
} as const;

export type CatalogSnapshot = z.infer<typeof CatalogSnapshotSchema>;
export type AvailabilityProbeResult = z.infer<typeof AvailabilityProbeResultSchema>;
export type SourceTier = z.infer<typeof SourceTierSchema>;
export type SourceKind = z.infer<typeof SourceKindSchema>;
export type TosStatus = z.infer<typeof TosStatusSchema>;
export type RunStatus = z.infer<typeof RunStatusSchema>;
export type MonitoringPriceUnit = z.infer<typeof PriceUnitSchema>; // 避开 types/ 既有 PriceUnit 同名
