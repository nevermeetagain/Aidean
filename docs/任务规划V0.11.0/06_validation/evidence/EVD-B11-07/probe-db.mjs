// B11-07 取证探针（EVD-B11-07 随附副本；原件在 .scratch/，该目录被 gitignore 排除）
// 用法：cd <repo root> && node docs/任务规划V0.11.0/06_validation/evidence/EVD-B11-07/probe-db.mjs
// 口径：catalog_snapshot / catalog_change_event / monitoring_source / offerings 覆盖 / 价格同源 / 观测命中
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(path.join(process.cwd(), "apps/web/package.json"));
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const text = (v) => (v === null || v === undefined ? null : String(v));

try {
  // ---- 验收①：目录快照 > 0，且逐源可追溯
  const catalogSnapshot = await prisma.catalogSnapshot.count();
  const snapshots = await prisma.catalogSnapshot.findMany({
    orderBy: { fetchedAt: "desc" },
    take: 10,
    select: { id: true, sourceId: true, fetchedAt: true, itemCount: true, rawBytes: true, rawSha256: true },
  });
  const sourceById = new Map(
    (await prisma.monitoringSource.findMany({ select: { id: true, key: true } })).map((s) => [s.id, s.key]),
  );

  // ---- 变更流（diff 产物）
  const changeEvents = await prisma.catalogChangeEvent.count();
  const changeByKind = await prisma.catalogChangeEvent.groupBy({ by: ["kind"], _count: true });

  // ---- 验收②：源可达性三态（ok / failed 带 lastError / never）
  const monitoringSources = await prisma.monitoringSource.findMany({
    select: {
      key: true, label: true, tier: true, kind: true, endpoint: true,
      enabled: true, authRequired: true,
      lastStatus: true, lastCount: true, lastError: true,
      mappedEntityType: true, mappedEntityId: true,
    },
  });

  // ---- 验收③：offerings 覆盖
  const providerModelOffering = await prisma.providerModelOffering.count();
  const offeringsByProvider = await prisma.providerModelOffering.groupBy({ by: ["providerId"], _count: true });
  const offeringDistinctModels = (await prisma.providerModelOffering.groupBy({ by: ["modelId"], _count: true })).length;
  const offerings = await prisma.providerModelOffering.findMany({
    select: {
      providerId: true, modelId: true, priceInput: true, priceOutput: true,
      priceUnit: true, effectiveFrom: true, isActive: true, defaultMultiplier: true,
    },
    orderBy: { modelId: "asc" },
  });
  const modelIds = [...new Set(offerings.map((o) => o.modelId))];
  const models = await prisma.aiModel.findMany({
    where: { id: { in: modelIds } },
    select: { id: true, modelCode: true, nameDisplay: true },
  });
  const modelById = new Map(models.map((m) => [m.id, m]));
  const providers = await prisma.modelProvider.findMany({ select: { id: true, code: true, priceCurrency: true } });
  const providerById = new Map(providers.map((p) => [p.id, p]));

  // ---- 价格同源校验：offering.priceInput/Output 是否与当前 USD per_million ModelPrice 一致
  const priceRows = await prisma.modelPrice.findMany({
    where: { modelId: { in: modelIds }, isCurrent: true, billingCurrency: "USD", billingUnit: "per_million_tokens" },
    select: { modelId: true, priceInput: true, priceOutput: true },
  });
  const priceByModel = new Map(priceRows.map((p) => [p.modelId, p]));
  const priceMismatches = offerings.filter((o) => {
    const p = priceByModel.get(o.modelId);
    if (!p) return true;
    return Number(p.priceInput) !== Number(o.priceInput) || Number(p.priceOutput) !== Number(o.priceOutput);
  }).length;

  // ---- 真实链路两断点：观测 normalizedModelId 与 aiModel.modelCode 命中数
  const observations = await prisma.providerModelObservation.count();
  const aiModels = await prisma.aiModel.count({ where: { deletedAt: null } });
  const obsIds = await prisma.providerModelObservation.findMany({ select: { normalizedModelId: true } });
  const modelCodes = new Set(
    (await prisma.aiModel.findMany({ where: { deletedAt: null }, select: { modelCode: true } })).map((m) => m.modelCode),
  );
  const directHit = obsIds.filter((o) => modelCodes.has(o.normalizedModelId)).length;
  const discoveryCandidates = await prisma.discoveryCandidate.count();

  console.log(JSON.stringify({
    catalogSnapshot,
    snapshots: snapshots.map((s) => ({ ...s, sourceKey: sourceById.get(s.sourceId) ?? null, rawSha256: text(s.rawSha256)?.slice(0, 12) })),
    changeEvents,
    changeByKind: changeByKind.map((k) => `${k.kind}:${k._count}`),
    monitoringSources,
    providerModelOffering,
    offeringDistinctModels,
    offeringsByProvider: offeringsByProvider.map((p) => `${providerById.get(p.providerId)?.code ?? p.providerId}:${p._count}`),
    offeringSamples: offerings.slice(0, 3).map((o) => ({
      modelCode: modelById.get(o.modelId)?.modelCode,
      provider: providerById.get(o.providerId)?.code,
      priceInput: text(o.priceInput), priceOutput: text(o.priceOutput),
      priceUnit: o.priceUnit, effectiveFrom: o.effectiveFrom, isActive: o.isActive,
    })),
    offeringTail: offerings.slice(-2).map((o) => ({
      modelCode: modelById.get(o.modelId)?.modelCode,
      provider: providerById.get(o.providerId)?.code,
      priceInput: text(o.priceInput), priceOutput: text(o.priceOutput),
    })),
    priceMismatches,
    observations,
    aiModels,
    directHit,
    discoveryCandidates,
  }, null, 1));
} catch (e) {
  console.error("ERR", e.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
