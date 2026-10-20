/**
 * TASK-061 · 变更事件持久化（写 catalog_change_events + 首见/合并证据链；REQ-M-005/008；DESIGN-004 §5）
 *
 * 沿用 TASK-059 写入器范式：monitoringSource.findFirst 解析 sourceKey→sourceId。
 * 幂等与并发（Hark 核心审查 review-061 M1/M2 修订）：
 *   · 事务内先对快照行做无副作用 UPDATE 取行锁，同一快照的并发持久化串行化（快照不存在即抛，事务回滚）；
 *   · 再读该快照已存在的 (normalizedModelId, kind)：新键 createMany（分批 ≤500，skipDuplicates 兜底），
 *     已存在键只 update 不新建——重放或并发绝不抛唯一键冲突（DB 唯一 cce_snapshot_model_kind_key）；
 *   · EvidenceChain 只为「本次新建」的事件写，重放不产生重复证据链（修 M1：原实现每次重放都 create 证据链）；
 *   · 交互事务显式 timeout 60s（修 M2：首个快照数百事件逐条 upsert 会撞 Prisma 默认 5s 超时）。
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

const CHUNK = 500;
const TX_OPTIONS = { timeout: 60_000, maxWait: 10_000 } as const;
const keyOf = (normalizedModelId: string, kind: string): string => `${kind}\u0000${normalizedModelId}`;

function chunks<T>(xs: readonly T[], n = CHUNK): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += n) out.push(xs.slice(i, i + n));
  return out;
}

function chainOf(event: CatalogChangeEvent, mergedExternalModelIds: readonly string[]) {
  return {
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
      externalModelIds: [...mergedExternalModelIds],
      ...(event.kind === "price_changed" ? { deltaPct: event.deltaPct } : {}),
    },
  };
}

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
    // 快照行级锁：对该快照行做一次无副作用 UPDATE（itemCount += 0），同一快照的并发持久化在此串行（不用原生 SQL，守 queryraw-biz=0）
    await tx.catalogSnapshot.update({ where: { id: snapshotId }, data: { itemCount: { increment: 0 } }, select: { id: true } });

    const existing = await tx.catalogChangeEvent.findMany({
      where: { snapshotId },
      select: { normalizedModelId: true, kind: true },
    });
    const seen = new Set(existing.map((e) => keyOf(e.normalizedModelId, e.kind)));

    const fresh: DetectedChange[] = [];
    const replay: DetectedChange[] = [];
    for (const c of changes) {
      const k = keyOf(c.event.normalizedModelId, c.event.kind);
      if (seen.has(k)) replay.push(c);
      else {
        seen.add(k);
        fresh.push(c);
      }
    }

    for (const part of chunks(fresh)) {
      await tx.catalogChangeEvent.createMany({
        data: part.map(({ event }) => ({ id: event.id, ...eventToRow(event, sourceId) })),
        skipDuplicates: true,
      });
    }
    for (const { event } of replay) {
      await tx.catalogChangeEvent.update({
        where: {
          snapshotId_normalizedModelId_kind: {
            snapshotId: event.snapshotId,
            normalizedModelId: event.normalizedModelId,
            kind: event.kind,
          },
        },
        data: eventToRow(event, sourceId),
      });
    }

    const chainRows = fresh
      .filter(({ event, mergedExternalModelIds }) => event.kind === "model_first_seen" || mergedExternalModelIds.length > 1)
      .map(({ event, mergedExternalModelIds }) => chainOf(event, mergedExternalModelIds));
    for (const part of chunks(chainRows)) {
      await tx.evidenceChain.createMany({ data: part });
    }

    return { snapshotId, events: changes.length, upserted: fresh.length + replay.length, evidenceChains: chainRows.length };
  }, TX_OPTIONS);
}
