/**
 * 管理端监控 DTO 序列化（TASK-063，私有目录不参与路由计数）。
 *
 * DB 行 → packages/shared/src/schemas/monitoring.schema.ts 契约 DTO：
 * - Date → ISO 字符串；Decimal → 原币十进制字符串（不做汇率换算）；
 * - CatalogChangeEvent 按 kind 分流：仅 price_changed 携带价格前后值与 deltaPct，
 *   其余 kind 不得带价格键（与 discriminatedUnion 逐字段对齐）。
 * - 未知 kind、price_changed 缺 priceUnit/deltaPct 属库内数据不一致，直接抛错由
 *   withApi 收敛为 50000（不伪造 0 或默认值冒充成功）。
 */
import type {
  CatalogChangeEvent,
  MonitoringPriceUnit,
  MonitoringSource,
} from "@aidean/shared";

/** GET /sources 与 PATCH /sources/{key} 共用投影（DTO 不外泄 id/时间戳等内部列） */
export const SOURCE_SELECT = {
  id: true,
  key: true,
  label: true,
  tier: true,
  kind: true,
  endpoint: true,
  docsUrl: true,
  authRequired: true,
  cadenceCron: true,
  tosStatus: true,
  enabled: true,
  mappedEntityType: true,
  mappedEntityId: true,
  lastRunAt: true,
  lastStatus: true,
  lastCount: true,
  lastError: true,
};

export interface MonitoringSourceRow {
  id: string;
  key: string;
  label: string;
  tier: string;
  kind: string;
  endpoint: string;
  docsUrl: string | null;
  authRequired: boolean;
  cadenceCron: string;
  tosStatus: string;
  enabled: boolean;
  mappedEntityType: string | null;
  mappedEntityId: string | null;
  lastRunAt: Date | null;
  lastStatus: string;
  lastCount: number | null;
  lastError: string | null;
}

/** 源行 → MonitoringSourceSchema（枚举列按契约窄化；值域已由 DB CHECK 约束） */
export function toSourceDto(row: MonitoringSourceRow): MonitoringSource {
  return {
    key: row.key,
    label: row.label,
    tier: row.tier as MonitoringSource["tier"],
    kind: row.kind as MonitoringSource["kind"],
    endpoint: row.endpoint,
    docsUrl: row.docsUrl,
    authRequired: row.authRequired,
    cadenceCron: row.cadenceCron,
    tosStatus: row.tosStatus as MonitoringSource["tosStatus"],
    enabled: row.enabled,
    mappedEntityType: row.mappedEntityType as MonitoringSource["mappedEntityType"],
    mappedEntityId: row.mappedEntityId,
    lastRunAt: row.lastRunAt ? row.lastRunAt.toISOString() : null,
    lastStatus: row.lastStatus as MonitoringSource["lastStatus"],
    lastCount: row.lastCount,
    lastError: row.lastError,
  };
}

/** GET /changes 投影（含 source.key 供 DTO 拍平为 sourceKey） */
export const CHANGE_SELECT = {
  id: true,
  kind: true,
  snapshotId: true,
  externalModelId: true,
  normalizedModelId: true,
  priceUnit: true,
  beforeInput: true,
  beforeOutput: true,
  afterInput: true,
  afterOutput: true,
  deltaPct: true,
  sourceUrl: true,
  detectedAt: true,
  source: { select: { key: true } },
};

interface DecimalLike {
  toString(): string;
}

export interface CatalogChangeRow {
  id: string;
  kind: string;
  snapshotId: string;
  externalModelId: string;
  normalizedModelId: string;
  priceUnit: string | null;
  beforeInput: DecimalLike | null;
  beforeOutput: DecimalLike | null;
  afterInput: DecimalLike | null;
  afterOutput: DecimalLike | null;
  deltaPct: number | null;
  sourceUrl: string;
  detectedAt: Date;
  source: { key: string };
}

const priceText = (v: DecimalLike | null): string | null => (v === null ? null : v.toString());

/** 变更行 → CatalogChangeEvent（discriminatedUnion 按 kind 收窄） */
export function toChangeDto(row: CatalogChangeRow): CatalogChangeEvent {
  const base = {
    id: row.id,
    sourceKey: row.source.key,
    snapshotId: row.snapshotId,
    externalModelId: row.externalModelId,
    normalizedModelId: row.normalizedModelId,
    detectedAt: row.detectedAt.toISOString(),
    sourceUrl: row.sourceUrl,
  };

  switch (row.kind) {
    case "listed":
    case "delisted":
    case "model_first_seen":
      return { ...base, kind: row.kind };
    case "price_changed": {
      if (row.priceUnit === null || row.deltaPct === null) {
        throw new Error(`catalog_change_events ${row.id}: price_changed 缺少 price_unit/delta_pct`);
      }
      return {
        ...base,
        kind: "price_changed",
        priceUnit: row.priceUnit as MonitoringPriceUnit,
        before: { input: priceText(row.beforeInput), output: priceText(row.beforeOutput) },
        after: { input: priceText(row.afterInput), output: priceText(row.afterOutput) },
        deltaPct: row.deltaPct,
      };
    }
    default:
      // DB CHECK 之外的脏数据：不猜测语义，交由上层 50000 暴露
      throw new Error(`catalog_change_events ${row.id}: 未知 kind=${row.kind}`);
  }
}
