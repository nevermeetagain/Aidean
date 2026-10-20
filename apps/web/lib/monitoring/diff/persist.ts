/**
 * TASK-061 · 变更事件持久化（写 catalog_change_events + 首见/合并证据链；REQ-M-005/008；DESIGN-004 §5）
 *
 * 沿用 TASK-059 写入器范式：monitoringSource.findFirst 解析 sourceKey→sourceId；$transaction 内逐条落库。
 * upsert 键 = DB 唯一 (snapshotId, normalizedModelId, kind)（cce_snapshot_model_kind_key）：
 *   重放或并发再次持久化命中同键 → 更新而非新建，绝不抛唯一键冲突（“不得因唯一键冲突整批失败”的落库侧兜底；
 *   detect 已保证同批内 (normalizedModelId, kind) 唯一，故本处 upsert 只会命中跨批次同快照的重放）。
 * EvidenceChain：
 *   · model_first_seen 必写 evidenceType='discovery', source='aggregator', sourceUrl（DESIGN-004 §5）；
 *   · 归一合并（mergedExternalModelIds.length>1）另记 evidenceType='change'，evidenceData 列全部 external id，避免折叠信息丢失。
 * 一批事件须同 sourceKey 与 snapshotId（detect 每快照调用天然满足）。价格直落 Decimal(19,6)（原币+单位，不做汇率换算）。
 */
import { prisma } from "../../db/prisma";
import type { CatalogChangeEvent } from "@aidean/shared";
import type { DetectedChange } from "./detect";

export interface PersistCatalogChangeResult {
  snapshotId: string;
  events: number;
  upserted: number;
  evidenceChains: number;
}

/** 落库行（与 catalog_change_events 列一一对应；非 price_changed 的价格列一律 null） */
interface ChangeEventRow {
  sourceId: string;
  snapshotId: string;
  kind: string;
  externalModelId: string;
  normalizedModelId: string;
  sourceUrl: string;
  detectedAt: Date;
  priceUnit: string | null;
  beforeInput: string | null;
  beforeOutput: string | null;
  afterInput: string | null;
  afterOutput: string | null;
  deltaPct: number | null;
}

function eventToRow(event: CatalogChangeEvent, sourceId: string): ChangeEventRow {
  const base = {
    sourceId,
    snapshotId: event.snapshotId,
    kind: event.kind,
    externalModelId: event.externalModelId,
    normalizedModelId: event.normalizedModelId,
    sourceUrl: event.sourceUrl,
    detectedAt: new Date(event.detectedAt),
  };
  if (event.kind !== "price_changed") {
    return { ...base, priceUnit: null, beforeInput: null, beforeOutput: null, afterInput: null, afterOutput: null, deltaPct: null };
  }
  return {
    ...base,
    priceUnit: event.priceUnit,
    beforeInput: event.before.input,
    beforeOutput: event.before.output,
    afterInput: event.after.input,
    afterOutput: event.after.output,
    deltaPct: event.deltaPct,
  };
}

const claimText = (event: CatalogChangeEvent, externalCount: number): string =>
  `TASK-061 ${event.kind}: ${event.normalizedModelId}（归一 ${externalCount} 个 external id，快照 ${event.snapshotId}）`;

export async function persistCatalogChangeEvents(
  changes: readonly DetectedChange[],
): Promise<PersistCatalogChangeResult> {
  if (changes.length === 0) return { snapshotId: "", events: 0, upserted: 0, evidenceChains: 0 };

  const { sourceKey, snapshotId } = changes[0].event;
  for (const c of changes) {
    if (c.event.sourceKey !== sourceKey || c.event.snapshotId !== snapshotId) {
      throw new Error("persistCatalogChangeEvents: 一批事件必须同 sourceKey 与 snapshotId");
    }
  }

  const source = await prisma.monitoringSource.findFirst({
    where: { key: sourceKey, deletedAt: null },
    select: { id: true },
  });
  if (!source) throw new Error(`persistCatalogChangeEvents: monitoring source not found: ${sourceKey}`);
  const sourceId = source.id;

  return prisma.$transaction(async (tx) => {
    let upserted = 0;
    let chains = 0;
    for (const { event, mergedExternalModelIds } of changes) {
      const row = eventToRow(event, sourceId);
      await tx.catalogChangeEvent.upsert({
        where: {
          snapshotId_normalizedModelId_kind: {
            snapshotId: event.snapshotId,
            normalizedModelId: event.normalizedModelId,
            kind: event.kind,
          },
        },
        create: { id: event.id, ...row },
        update: row,
      });
      upserted++;

      const needChain = event.kind === "model_first_seen" || mergedExternalModelIds.length > 1;
      if (!needChain) continue;
      await tx.evidenceChain.create({
        data: {
          evidenceType: event.kind === "model_first_seen" ? "discovery" : "change",
          claim: claimText(event, mergedExternalModelIds.length),
          source: "aggregator",
          sourceUrl: event.sourceUrl,
          confidence: 0.6,
          evidenceData: {
            snapshotId: event.snapshotId,
            sourceKey: event.sourceKey,
            normalizedModelId: event.normalizedModelId,
            kind: event.kind,
            externalModelIds: mergedExternalModelIds,
            ...(event.kind === "price_changed" ? { deltaPct: event.deltaPct } : {}),
          },
        },
      });
      chains++;
    }
    return { snapshotId, events: changes.length, upserted, evidenceChains: chains };
  });
}
