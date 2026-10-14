// > 版本: v0.4 | 更新: 2026-10-14 | 变更: V0.4.0 新增——监控契约自检（码冲突 / 样例可解析 / 端点数）
import { monitoringCodeCollisions, CatalogChangeEventSchema, MonitoringSourceSchema, MONITORING_ENDPOINTS, SOURCE_TIERS } from "./07-monitoring.contract";

const collisions = monitoringCodeCollisions();
const ev = CatalogChangeEventSchema.safeParse({
  id: "0191f1e2-0000-7000-8000-000000000001", sourceKey: "openrouter", snapshotId: "0191f1e2-0000-7000-8000-000000000002",
  externalModelId: "openai/gpt-4", normalizedModelId: "gpt-4", detectedAt: "2026-10-14T07:00:00.000Z",
  sourceUrl: "https://openrouter.ai/api/v1/models", kind: "price_changed", priceUnit: "usd_per_1m_tokens",
  before: { input: "30", output: "60" }, after: { input: "25", output: "60" }, deltaPct: -16.67,
});
const src = MonitoringSourceSchema.safeParse({
  key: "openrouter", label: "OpenRouter", tier: "B", kind: "aggregator", endpoint: "https://openrouter.ai/api/v1/models",
  docsUrl: "https://openrouter.ai/docs/api/api-reference/models/get-models", authRequired: false, cadenceCron: "15 2 * * *",
  tosStatus: "pending", enabled: true, mappedEntityType: null, mappedEntityId: null, lastRunAt: null, lastStatus: "never", lastCount: null, lastError: null,
});
console.log(JSON.stringify({ collisions, tiers: SOURCE_TIERS.length, endpoints: MONITORING_ENDPOINTS.length, eventSampleOk: ev.success, sourceSampleOk: src.success }));
declare const process: { exit(code: number): never };
if (collisions.length || !ev.success || !src.success) process.exit(1);
