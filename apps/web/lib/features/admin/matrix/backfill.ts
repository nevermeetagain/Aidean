/**
 * 矩阵回填（B11-03a 数据写入路径）：由 ai_models 的真实字段派生协议兼容/能力矩阵初始行。
 *
 * 派生口径（只写"有证据"的行，不臆造否定结论）：
 *   协议矩阵
 *     - entityType=model ：每个未软删模型 1 行（protocol=ai_models.protocol，supported=true）
 *       → 行分布与 ai_models.protocol 分布逐值一致（基线 OPENAI 971/CUSTOM 15/ANTHROPIC 6/GOOGLE 6/RESPONSES 2）
 *     - entityType=vendor：厂商 × 其旗下模型出现过的协议去重，各 1 行（supported=true）
 *     probeMethod="backfill"、confidence=0.6、probeResult={ derivedFrom, … } 标明来源，可与人工/探针行区分。
 *   能力矩阵（source="official"——取自目录登记字段）
 *     - reasoning   ：is_reasoning=true 或 model_type=REASONING → supported=true
 *     - vision      ：is_multi_modal=true 或 model_type∈{VISION,MULTIMODAL} → supported=true
 *     - long_context：context_length 非空 → supported=(≥128K)，maxContextLength=context_length
 * 幂等与不覆盖：落库走 createMany({ skipDuplicates:true })（ON CONFLICT DO NOTHING），
 *   重复执行 0 新增，且**永不覆盖**后台人工编辑过的行；分块 500 行/批，千级模型 O(n) 单趟。
 */
import type { PrismaClient } from "@prisma/client";
import { LONG_CONTEXT_THRESHOLD, type MatrixCapability, type MatrixProtocol } from "./constants";

export interface BackfillModel {
  id: string;
  vendorId: string;
  protocol: MatrixProtocol;
  modelType: string;
  isReasoning: boolean;
  isMultiModal: boolean;
  contextLength: number | null;
}

export interface ProtocolSeedRow {
  entityType: "model" | "vendor";
  entityId: string;
  protocol: MatrixProtocol;
  supported: boolean;
  probeMethod: "backfill";
  confidence: number;
  probeResult: { derivedFrom: string; modelCount?: number };
}

export interface CapabilitySeedRow {
  modelId: string;
  capability: MatrixCapability;
  supported: boolean;
  source: "official";
  confidence: number;
  maxContextLength: number | null;
  detail: { derivedFrom: string };
}

export const BACKFILL_CONFIDENCE = 0.6;

export function deriveProtocolRows(models: readonly BackfillModel[]): ProtocolSeedRow[] {
  const rows: ProtocolSeedRow[] = [];
  const vendorProto = new Map<string, number>(); // `${vendorId}\u0000${protocol}` → count
  for (const m of models) {
    rows.push({
      entityType: "model",
      entityId: m.id,
      protocol: m.protocol,
      supported: true,
      probeMethod: "backfill",
      confidence: BACKFILL_CONFIDENCE,
      probeResult: { derivedFrom: "ai_models.protocol" },
    });
    const k = `${m.vendorId}\u0000${m.protocol}`;
    vendorProto.set(k, (vendorProto.get(k) ?? 0) + 1);
  }
  for (const [k, count] of vendorProto) {
    const [vendorId, protocol] = k.split("\u0000") as [string, MatrixProtocol];
    rows.push({
      entityType: "vendor",
      entityId: vendorId,
      protocol,
      supported: true,
      probeMethod: "backfill",
      confidence: BACKFILL_CONFIDENCE,
      probeResult: { derivedFrom: "ai_models.protocol@vendor", modelCount: count },
    });
  }
  return rows;
}

export function deriveCapabilityRows(models: readonly BackfillModel[]): CapabilitySeedRow[] {
  const rows: CapabilitySeedRow[] = [];
  const base = { source: "official" as const, confidence: BACKFILL_CONFIDENCE };
  for (const m of models) {
    if (m.isReasoning || m.modelType === "REASONING") {
      rows.push({ ...base, modelId: m.id, capability: "reasoning", supported: true, maxContextLength: null, detail: { derivedFrom: "ai_models.is_reasoning|model_type" } });
    }
    if (m.isMultiModal || m.modelType === "VISION" || m.modelType === "MULTIMODAL") {
      rows.push({ ...base, modelId: m.id, capability: "vision", supported: true, maxContextLength: null, detail: { derivedFrom: "ai_models.is_multi_modal|model_type" } });
    }
    if (m.contextLength != null && m.contextLength > 0) {
      rows.push({
        ...base,
        modelId: m.id,
        capability: "long_context",
        supported: m.contextLength >= LONG_CONTEXT_THRESHOLD,
        maxContextLength: m.contextLength,
        detail: { derivedFrom: "ai_models.context_length" },
      });
    }
  }
  return rows;
}

export function chunk<T>(arr: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export interface BackfillResult {
  models: number;
  protocolDerived: number;
  protocolInserted: number;
  capabilityDerived: number;
  capabilityInserted: number;
  protocolDistribution: Record<string, number>;
  dryRun: boolean;
}

type BackfillDb = Pick<PrismaClient, "aiModel" | "protocolCompatibility" | "capabilityMatrix">;

export async function backfillMatrices(db: BackfillDb, opts: { dryRun?: boolean; batchSize?: number } = {}): Promise<BackfillResult> {
  const batchSize = opts.batchSize ?? 500;
  const models = (await db.aiModel.findMany({
    where: { deletedAt: null },
    select: { id: true, vendorId: true, protocol: true, modelType: true, isReasoning: true, isMultiModal: true, contextLength: true },
    orderBy: { id: "asc" },
  })) as BackfillModel[];

  const protocolRows = deriveProtocolRows(models);
  const capabilityRows = deriveCapabilityRows(models);
  const protocolDistribution: Record<string, number> = {};
  for (const m of models) protocolDistribution[m.protocol] = (protocolDistribution[m.protocol] ?? 0) + 1;

  let protocolInserted = 0;
  let capabilityInserted = 0;
  if (!opts.dryRun) {
    for (const part of chunk(protocolRows, batchSize)) {
      protocolInserted += (await db.protocolCompatibility.createMany({ data: part, skipDuplicates: true })).count;
    }
    for (const part of chunk(capabilityRows, batchSize)) {
      capabilityInserted += (await db.capabilityMatrix.createMany({ data: part, skipDuplicates: true })).count;
    }
  }
  return {
    models: models.length,
    protocolDerived: protocolRows.length,
    protocolInserted,
    capabilityDerived: capabilityRows.length,
    capabilityInserted,
    protocolDistribution,
    dryRun: Boolean(opts.dryRun),
  };
}
