// TASK-056 模型源监控契约单测：枚举逐字 / 码值全局唯一（27）/ HTTP 映射 / 判别联合 4 kind / DTO 样例 / 与冻结契约逐字对齐
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  AdminMonitoringChangeQuery,
  AdminMonitoringSourcePatchBody,
  CatalogChangeEventSchema,
  DEFAULT_STATUS_BY_CODE,
  ERROR_CODES,
  ERROR_PRESENTATION,
  MONITORING_ENDPOINTS,
  MONITORING_ERROR_CODES,
  MONITORING_STATUS_BY_CODE,
  MONITORING_UX_STATES,
  MonitoringSourceSchema,
  ModelOfferingsResponse,
  PRICE_CHANGE_THRESHOLD_PCT,
  PRICE_UNITS,
  ProviderModelObservationSchema,
  SOURCE_KINDS,
  SOURCE_TIERS,
  httpStatusOf,
} from "../index";

const base = {
  id: "0192f1a4-7c1e-7d2b-9a51-3c5f0b7e8d21",
  sourceKey: "openrouter",
  snapshotId: "0192f1a4-7c1e-7d2b-9a51-3c5f0b7e8d22",
  externalModelId: "openai/gpt-4",
  normalizedModelId: "gpt-4",
  detectedAt: "2026-10-19T00:00:00.000Z",
  sourceUrl: "https://openrouter.ai/api/v1/models",
};

describe("monitoring 枚举（TASK-056）", () => {
  it("SOURCE_TIERS = [S1,S2,A,B,C]；SOURCE_KINDS 7 种；PRICE_UNITS 4 种；阈值 1%", () => {
    expect([...SOURCE_TIERS]).toEqual(["S1", "S2", "A", "B", "C"]);
    expect(SOURCE_KINDS).toHaveLength(7);
    expect([...PRICE_UNITS]).toEqual(["usd_per_1m_tokens", "cny_per_1m_tokens", "usd_per_request", "ratio"]);
    expect(PRICE_CHANGE_THRESHOLD_PCT).toBe(1);
  });
});

describe("monitoring 错误码（TASK-056）", () => {
  it("20004/50012 已并入 ERROR_CODES；去重后共 27 码、无碰撞", () => {
    expect(MONITORING_ERROR_CODES).toEqual({ MONITOR_SOURCE_NOT_FOUND: 20004, MONITOR_SOURCE_CREDENTIAL_MISSING: 50012 });
    const vals = Object.values(ERROR_CODES) as number[];
    expect(new Set(vals).size).toBe(27);
    expect(vals.length).toBe(27);
  });
  it("HTTP 映射 20004→404、50012→503；展示策略 toast/inline", () => {
    expect(DEFAULT_STATUS_BY_CODE[20004]).toBe(404);
    expect(DEFAULT_STATUS_BY_CODE[50012]).toBe(503);
    expect(httpStatusOf(20004)).toBe(404);
    expect(httpStatusOf(50012)).toBe(503);
    expect(MONITORING_STATUS_BY_CODE).toEqual({ 20004: 404, 50012: 503 });
    expect(ERROR_PRESENTATION.MONITOR_SOURCE_NOT_FOUND).toBe("toast");
    expect(ERROR_PRESENTATION.MONITOR_SOURCE_CREDENTIAL_MISSING).toBe("inline");
  });
});

describe("CatalogChangeEventSchema 判别联合（TASK-056）", () => {
  it.each(["listed", "delisted", "model_first_seen"] as const)("kind=%s 样例可解析", (kind) => {
    expect(CatalogChangeEventSchema.safeParse({ ...base, kind }).success).toBe(true);
  });
  it("kind=price_changed 需 before/after/deltaPct/priceUnit", () => {
    const ok = { ...base, kind: "price_changed", priceUnit: "usd_per_1m_tokens", before: { input: "30", output: "60" }, after: { input: "10", output: "30" }, deltaPct: -66.67 };
    expect(CatalogChangeEventSchema.safeParse(ok).success).toBe(true);
    expect(CatalogChangeEventSchema.safeParse({ ...base, kind: "price_changed" }).success).toBe(false);
  });
  it("未知 kind 拒绝", () => {
    expect(CatalogChangeEventSchema.safeParse({ ...base, kind: "renamed" }).success).toBe(false);
  });
});

describe("实体与 API DTO（TASK-056）", () => {
  const src = {
    key: "openrouter",
    label: "OpenRouter",
    tier: "B",
    kind: "aggregator",
    endpoint: "https://openrouter.ai/api/v1/models",
    docsUrl: null,
    authRequired: false,
    cadenceCron: "0 */6 * * *",
    tosStatus: "pending",
    enabled: true,
    mappedEntityType: null,
    mappedEntityId: null,
    lastRunAt: null,
    lastStatus: "never",
    lastCount: null,
    lastError: null,
  };
  it("MonitoringSource 样例通过；key 非法（大写/过长）拒绝", () => {
    expect(MonitoringSourceSchema.safeParse(src).success).toBe(true);
    expect(MonitoringSourceSchema.safeParse({ ...src, key: "OpenRouter" }).success).toBe(false);
    expect(MonitoringSourceSchema.safeParse({ ...src, key: "a".repeat(41) }).success).toBe(false);
  });
  it("Observation：价格为原币十进制字符串或 null", () => {
    const o = {
      sourceKey: "openrouter",
      externalModelId: "openai/gpt-4",
      normalizedModelId: "gpt-4",
      displayName: "GPT-4",
      vendorHint: "openai",
      isListed: true,
      priceUnit: "usd_per_1m_tokens",
      priceInput: "30",
      priceOutput: "60",
      priceCacheRead: null,
      contextLength: 8191,
      firstSeenAt: "2026-10-19T00:00:00.000Z",
      lastSeenAt: "2026-10-19T00:00:00.000Z",
      delistedAt: null,
    };
    expect(ProviderModelObservationSchema.safeParse(o).success).toBe(true);
    expect(ProviderModelObservationSchema.safeParse({ ...o, priceInput: 30 }).success).toBe(false);
  });
  it("PATCH 体 strict 且至少一个字段；changes 查询分页默认 1/20、pageSize≤50", () => {
    expect(AdminMonitoringSourcePatchBody.safeParse({}).success).toBe(false);
    expect(AdminMonitoringSourcePatchBody.safeParse({ enabled: false }).success).toBe(true);
    expect(AdminMonitoringSourcePatchBody.safeParse({ enabled: false, tier: "A" }).success).toBe(false);
    expect(AdminMonitoringChangeQuery.parse({})).toMatchObject({ page: 1, pageSize: 20 });
    expect(AdminMonitoringChangeQuery.safeParse({ pageSize: 51 }).success).toBe(false);
  });
  it("offerings 响应空列表可解析；端点 5 个；UX 两组五态", () => {
    expect(ModelOfferingsResponse.safeParse({ items: [] }).success).toBe(true);
    expect(MONITORING_ENDPOINTS).toHaveLength(5);
    for (const g of Object.values(MONITORING_UX_STATES)) {
      expect(Object.keys(g).sort()).toEqual(["empty", "error", "forbidden", "loading", "ready", "route"]);
    }
  });
});

describe("与冻结契约逐字对齐（防双源漂移）", () => {
  const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");
  const contract = read("../../../../docs/任务规划V0.5.0/contracts/07-monitoring.contract.ts");
  const shared = read("../schemas/monitoring.schema.ts");
  const slice = (s: string, from: string, to: string) => s.slice(s.indexOf(from), s.indexOf(to));
  it("「枚举 → ① API 端点表」区段与契约逐字一致", () => {
    const a = slice(contract, "export const SOURCE_TIERS", "// ---------------------------------------------------------------- ② Errors");
    const b = slice(shared, "export const SOURCE_TIERS", "// ---------------------------------------------------------------- ② Errors");
    expect(a.length).toBeGreaterThan(1000);
    expect(b).toBe(a);
  });
  it("⑤ Events + ⑥ UX 区段与契约逐字一致", () => {
    const a = contract.slice(contract.indexOf("// ---------------------------------------------------------------- ⑤ Events"));
    const b = slice(shared, "// ---------------------------------------------------------------- ⑤ Events", "\nexport type CatalogSnapshot");
    expect(b.trimEnd()).toBe(a.trimEnd());
  });
});
