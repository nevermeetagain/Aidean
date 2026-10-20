/**
 * TASK-068 · 上架同步：监控观测（provider_model_observations）→ ProviderModelOffering。
 *
 * 裁决口径：
 *   - U-M5=A：监控源映射到 ModelProvider（模型服务提供商）；同一模型可被多家提供商上架（offerings 多对一）。
 *     mappedEntityType 必须为 'ModelProvider'；'APIStation' 或未映射的源一律跳过（不写 offering）。
 *   - U-24=A：monitoring_sources.mapped_entity_id 是 uuid 列，只存平台实体 id（不存 code）；
 *     联表口径 `mapped_entity_id::text = model_providers.id`（后者为 text 列，见 resolveSourceProvider）；非 uuid 值在写侧被拒（assertMappedEntityId）。
 *
 * 字段所有权（功能设计文档 五、字段所有权矩阵）：
 *   sync 所有：listedAt（= 观测 firstSeenAt）、isActive（= 观测 isListed）、priceInput/priceOutput/priceCache/priceUnit（原币）；
 *   人工所有（永不覆盖）：defaultMultiplier、discount*Min/Max、effectiveFrom/effectiveUntil（新建时 effectiveFrom = firstSeenAt 仅作初值）。
 * 价格只在观测币种 = 提供商标价币种（ModelProvider.priceCurrency）且单位可识别时写入；否则保留现值并在证据里注明。
 *
 * 模型对齐：仅 normalizedModelId 与 AiModel.modelCode **精确相等**（大小写敏感、不做模糊）才写 offering；
 *   未命中 → DiscoveryCandidate(candidateType='model', status='discovered') 待人工，按 (name, sourceUrl) 去重。
 * 每次实际写入（新建或字段有变化）在同一事务里留一条 EvidenceChain（evidenceType='change', source='observed'）；
 *   无变化不写（幂等，重跑不产生重复证据）。
 */
import type { Prisma, PrismaClient } from "@prisma/client";
import { splitObservedPriceUnit } from "@aidean/shared";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class MappedEntityIdError extends Error {
  constructor(value: unknown) {
    super(`mapped_entity_id 必须是平台实体 uuid（U-24=A，只存 id 不存 code）：${String(value)}`);
    this.name = "MappedEntityIdError";
  }
}

/** U-24=A 写侧校验：只接受 uuid（平台实体 id）；code、空串、其他格式一律拒绝 */
export function assertMappedEntityId(value: unknown): string {
  if (typeof value !== "string" || !UUID_RE.test(value.trim())) throw new MappedEntityIdError(value);
  return value.trim().toLowerCase();
}

/**
 * 源 → 提供商解析（Prisma 两步查询；业务代码禁用原生 SQL，见 check-docs-facts 的 queryraw-biz 断言）。
 * 等价 SQL：`JOIN model_providers p ON s.mapped_entity_id::text = p.id`——uuid 列经 Prisma 读出为小写规范文本，
 * 与 model_providers.id（Prisma uuid(7) 生成的小写文本）按字符串精确比较，即 `::text =` 口径。
 */
export async function resolveSourceProvider(client: OfferingSyncClient, sourceId: string): Promise<SourceProviderRow | null> {
  const s = await client.monitoringSource.findFirst({
    where: { id: sourceId, deletedAt: null, mappedEntityType: "ModelProvider", mappedEntityId: { not: null } },
    select: { id: true, key: true, endpoint: true, mappedEntityId: true },
  });
  if (!s?.mappedEntityId) return null;
  const p = await client.modelProvider.findFirst({
    where: { id: String(s.mappedEntityId).toLowerCase(), deletedAt: null },
    select: { id: true, code: true, priceCurrency: true },
  });
  if (!p) return null;
  return { sourceId: s.id, sourceKey: s.key, endpoint: s.endpoint, providerId: p.id, providerCode: p.code, priceCurrency: p.priceCurrency };
}

export interface SourceProviderRow {
  sourceId: string;
  sourceKey: string;
  endpoint: string;
  providerId: string;
  providerCode: string;
  priceCurrency: string;
}

export interface OfferingSyncResult {
  status: "ok" | "unmapped";
  created: number;
  updated: number;
  unchanged: number;
  candidates: number;
  /** 观测币种与提供商标价币种不一致或单位不可识别，价格未写入的条数 */
  priceSkipped: number;
}

type ObservationRow = {
  id: string;
  externalModelId: string;
  normalizedModelId: string;
  displayName: string | null;
  isListed: boolean;
  priceUnit: string | null;
  priceInput: unknown;
  priceOutput: unknown;
  priceCacheRead: unknown;
  firstSeenAt: Date;
};

type OfferingRow = {
  id: string;
  listedAt: Date | null;
  isActive: boolean;
  priceInput: unknown;
  priceOutput: unknown;
  priceCache: unknown;
  priceUnit: string;
};

const str = (v: unknown): string | null => (v === null || v === undefined ? null : String(v));
const sameDec = (a: unknown, b: unknown): boolean => {
  const x = str(a);
  const y = str(b);
  if (x === null || y === null) return x === y;
  return Number(x) === Number(y); // Decimal(19,6) 十进制串：0.5 与 0.500000 视为相等
};

/** 观测 → 本次 sync 所有字段的目标值（价格不可写时不含价格键） */
function targetFields(o: ObservationRow, providerCurrency: string): { fields: Record<string, unknown>; priceWritable: boolean } {
  const fields: Record<string, unknown> = { listedAt: o.firstSeenAt, isActive: o.isListed };
  const unit = splitObservedPriceUnit(o.priceUnit);
  const priceWritable = unit !== null && unit.currency === providerCurrency.trim().toUpperCase() && o.priceInput !== null && o.priceOutput !== null;
  if (priceWritable) {
    fields.priceInput = str(o.priceInput);
    fields.priceOutput = str(o.priceOutput);
    fields.priceCache = str(o.priceCacheRead);
    fields.priceUnit = "per_million_tokens";
  }
  return { fields, priceWritable };
}

function diffFields(cur: OfferingRow, target: Record<string, unknown>): Record<string, { from: unknown; to: unknown }> {
  const out: Record<string, { from: unknown; to: unknown }> = {};
  for (const [k, to] of Object.entries(target)) {
    const from = (cur as unknown as Record<string, unknown>)[k];
    const same =
      k === "listedAt"
        ? (from as Date | null)?.getTime() === (to as Date).getTime()
        : k === "isActive" || k === "priceUnit"
          ? from === to
          : sameDec(from, to);
    if (!same) out[k] = { from: from instanceof Date ? from.toISOString() : str(from) ?? from, to: to instanceof Date ? to.toISOString() : to };
  }
  return out;
}

export type OfferingSyncClient = Pick<PrismaClient, "monitoringSource" | "modelProvider" | "$transaction" | "providerModelObservation" | "aiModel" | "providerModelOffering" | "discoveryCandidate" | "evidenceChain">;

export async function syncOfferingsForSource(
  client: OfferingSyncClient,
  sourceId: string,
  opts: { now?: Date } = {},
): Promise<OfferingSyncResult> {
  const now = opts.now ?? new Date();
  const result: OfferingSyncResult = { status: "ok", created: 0, updated: 0, unchanged: 0, candidates: 0, priceSkipped: 0 };
  const src = await resolveSourceProvider(client, sourceId);
  if (!src) return { ...result, status: "unmapped" };

  const observations = (await client.providerModelObservation.findMany({
    where: { sourceId },
    select: {
      id: true,
      externalModelId: true,
      normalizedModelId: true,
      displayName: true,
      isListed: true,
      priceUnit: true,
      priceInput: true,
      priceOutput: true,
      priceCacheRead: true,
      firstSeenAt: true,
    },
    orderBy: { externalModelId: "asc" },
  })) as ObservationRow[];
  if (observations.length === 0) return result;

  const codes = [...new Set(observations.map((o) => o.normalizedModelId))];
  const models = await client.aiModel.findMany({ where: { modelCode: { in: codes }, deletedAt: null }, select: { id: true, modelCode: true } });
  const modelByCode = new Map(models.map((m) => [m.modelCode, m.id]));

  for (const o of observations) {
    const modelId = modelByCode.get(o.normalizedModelId);
    if (!modelId) {
      // 未命中：进发现候选待人工（不写 offering）
      const exists = await client.discoveryCandidate.findFirst({
        where: { candidateType: "model", name: o.normalizedModelId, sourceUrl: src.endpoint },
        select: { id: true },
      });
      if (!exists) {
        await client.discoveryCandidate.create({
          data: {
            candidateType: "model",
            name: o.normalizedModelId,
            sourceType: "crawl",
            sourceUrl: src.endpoint,
            description: o.displayName ?? null,
            status: "discovered",
            fingerprint: { sourceKey: src.sourceKey, providerId: src.providerId, externalModelId: o.externalModelId, observationId: o.id },
          },
        });
        result.candidates += 1;
      }
      continue;
    }

    const { fields, priceWritable } = targetFields(o, src.priceCurrency);
    if (!priceWritable && o.priceUnit !== null) result.priceSkipped += 1;

    await client.$transaction(async (tx: Prisma.TransactionClient) => {
      const cur = (await tx.providerModelOffering.findUnique({
        where: { providerId_modelId: { providerId: src.providerId, modelId } },
        select: { id: true, listedAt: true, isActive: true, priceInput: true, priceOutput: true, priceCache: true, priceUnit: true },
      })) as OfferingRow | null;

      let changed: Record<string, { from: unknown; to: unknown }>;
      let action: "created" | "updated";
      if (!cur) {
        await tx.providerModelOffering.create({
          data: { providerId: src.providerId, modelId, effectiveFrom: o.firstSeenAt, ...(fields as object) } as Prisma.ProviderModelOfferingUncheckedCreateInput,
        });
        changed = Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, { from: null, to: v instanceof Date ? v.toISOString() : v }]));
        action = "created";
      } else {
        changed = diffFields(cur, fields);
        if (Object.keys(changed).length === 0) {
          result.unchanged += 1;
          return;
        }
        // 只写有变化的 sync 所有字段；人工字段不在 data 里，物理上不可能被覆盖
        const data = Object.fromEntries(Object.keys(changed).map((k) => [k, fields[k]]));
        await tx.providerModelOffering.update({ where: { id: cur.id }, data });
        action = "updated";
      }
      await tx.evidenceChain.create({
        data: {
          providerId: src.providerId,
          modelId,
          evidenceType: "change",
          claim: `offering ${action}：${src.providerCode} × ${o.normalizedModelId}（${Object.keys(changed).join(", ")}）`,
          source: "observed",
          sourceUrl: src.endpoint,
          confidence: 0.9,
          collectedAt: now,
          evidenceData: {
            task: "TASK-068",
            sourceKey: src.sourceKey,
            observationId: o.id,
            externalModelId: o.externalModelId,
            action,
            changed,
            priceWritten: priceWritable,
            ...(priceWritable ? {} : { priceSkipReason: o.priceUnit === null ? "no_price" : "currency_or_unit_mismatch", observedUnit: o.priceUnit, providerCurrency: src.priceCurrency }),
          } as Prisma.InputJsonValue,
        },
      });
      result[action] += 1;
    });
  }
  return result;
}
