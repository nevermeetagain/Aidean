/**
 * TASK-059 · 目录快照与观测写入器（REQ-M-003/004/005；DESIGN-004 / ADR-P007）
 *
 * persistCatalogSnapshot：幂等落「目录快照」+ 按源观测 upsert + 本轮未出现者置下架。
 * - 幂等键：(sourceId, rawSha256)（catalog_snapshots_source_sha_key）。
 *   同哈希 → 直接返回既有快照，不新建、不改观测、不产生事件（DESIGN-004：同哈希→直接返回）。
 * - 观测 upsert 键：(sourceId, externalModelId)（pmo_source_external_key）。
 *   命中 → 保 firstSeenAt 不变、刷新 lastSeenAt/价格/isListed=true 并清 delistedAt（覆盖「重新上架」）；
 *   未命中 → 新建，firstSeenAt=lastSeenAt=fetchedAt、isListed=true。
 * - 下架：本轮未出现且当前 isListed=true 的观测 → updateMany 置 isListed=false + delistedAt=fetchedAt。
 * - 原始响应体不落库：仅 rawSha256 + rawBytes + ≤2KB rawSample（schema raw_sample VarChar(2048)）。
 *
 * 变更事件 CatalogChangeEvent（model_first_seen/listed/delisted/price_changed）由 detect()（TASK-061）
 * 产出，非本写入器职责；本写入器只维护 snapshot 与 per-source observation 的当前态。
 *
 * 契约 DTO（CatalogSnapshotSchema/ProviderModelObservationSchema）以 sourceKey 表述，
 * schema 以 sourceId 落库——本写入器按 MonitoringSource.key（未软删）解析出 sourceId。
 * 价格一律「原币 + 单位」直落 Decimal（不在包内做汇率换算；展示换算见 U-15 日汇率快照）。
 *
 * TASK-098 加固（R10-05 / review-step3）：
 * - 空目录守卫：items 为空 → 不写快照、不下架，返回 skipped（源临时返回空列表不得把整源观测打成下架）。
 * - 同源串行：事务内先对 MonitoringSource 行做无副作用 UPDATE（lastCount += 0）取行锁，
 *   同一源的两次采集（同哈希或不同哈希）不会交错执行「upsert → 下架」，避免用旧轮 items 下架新轮观测。
 * - 观测 upsert 每批 200 条；交互事务显式 timeout 60s / maxWait 10s（千级目录不撞 Prisma 默认 5s）。
 * - 同 (sourceId, rawSha256) 并发：事务内 create 撞 P2002 会使整个事务失效，故在事务外捕获，
 *   回读既有快照并返回 idempotent=true（不抛、不重复写观测）。
 */
import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";

/** 单条观测输入（已 normalize 的目录项；时间戳与 isListed 由写入器维护，不由调用方提供）。 */
export interface CatalogSnapshotItem {
  externalModelId: string;
  normalizedModelId: string;
  displayName?: string | null;
  vendorHint?: string | null;
  priceUnit?: string | null;
  priceInput?: string | number | null;
  priceOutput?: string | number | null;
  priceCacheRead?: string | number | null;
  contextLength?: number | null;
}

/** 原始响应元信息（不落原始体，仅哈希之外的字节数/采样/来源 URL）。 */
export interface CatalogRawMeta {
  /** 原始响应字节数（schema raw_bytes NOT NULL，无默认，必须显式提供）。 */
  rawBytes: number;
  /** 原始响应前 ≤2KB 采样（截断至 2048）；缺省存空串（schema 默认 ""）。 */
  rawSample?: string;
  /** 来源 URL；缺省回退到 MonitoringSource.endpoint（schema source_url NOT NULL）。 */
  sourceUrl?: string;
}

export interface PersistCatalogSnapshotResult {
  snapshotId: string;
  sourceId: string;
  /** false = 命中同 (sourceId, rawSha256) 既有快照，直接返回未产生新快照。 */
  created: boolean;
  itemCount: number;
  upserted: number;
  delisted: number;
  /** true = 命中既有快照（同哈希重放或并发撞唯一键后回读），本次未写观测。 */
  idempotent: boolean;
  /** 仅空目录守卫命中时出现。 */
  skipped?: true;
  reason?: "empty";
}

const RAW_SAMPLE_MAX = 2048;
export const OBSERVATION_BATCH_SIZE = 200;
const TX_OPTIONS = { timeout: 60_000, maxWait: 10_000 } as const;

const isSnapshotShaConflict = (e: unknown): boolean =>
  e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

export async function persistCatalogSnapshot(
  sourceKey: string,
  fetchedAt: Date,
  items: CatalogSnapshotItem[],
  rawSha256: string,
  meta: CatalogRawMeta,
): Promise<PersistCatalogSnapshotResult> {
  if (items.length === 0) {
    return { snapshotId: "", sourceId: "", created: false, itemCount: 0, upserted: 0, delisted: 0, idempotent: false, skipped: true, reason: "empty" };
  }

  const source = await prisma.monitoringSource.findFirst({
    where: { key: sourceKey, deletedAt: null },
    select: { id: true, endpoint: true },
  });
  if (!source) {
    throw new Error(`persistCatalogSnapshot: monitoring source not found: ${sourceKey}`);
  }
  const sourceId = source.id;
  const rawSample = typeof meta.rawSample === "string" ? meta.rawSample.slice(0, RAW_SAMPLE_MAX) : "";
  const sourceUrl = meta.sourceUrl ?? source.endpoint;

  const readExisting = async (): Promise<PersistCatalogSnapshotResult | null> => {
    const existing = await prisma.catalogSnapshot.findUnique({
      where: { sourceId_rawSha256: { sourceId, rawSha256 } },
      select: { id: true },
    });
    return existing
      ? { snapshotId: existing.id, sourceId, created: false, itemCount: items.length, upserted: 0, delisted: 0, idempotent: true }
      : null;
  };

  try {
    return await prisma.$transaction(async (tx) => {
      // 同源串行：行锁持有至事务结束。
      await tx.monitoringSource.update({ where: { id: sourceId }, data: { lastCount: { increment: 0 } }, select: { id: true } });

      // 幂等：同 (sourceId, rawSha256) 已有快照 → 直接返回，不改观测、不产生事件。
      const existing = await tx.catalogSnapshot.findUnique({
        where: { sourceId_rawSha256: { sourceId, rawSha256 } },
        select: { id: true },
      });
      if (existing) {
        return { snapshotId: existing.id, sourceId, created: false, itemCount: items.length, upserted: 0, delisted: 0, idempotent: true };
      }

      const snapshot = await tx.catalogSnapshot.create({
        data: { sourceId, fetchedAt, itemCount: items.length, rawSha256, rawBytes: meta.rawBytes, rawSample, sourceUrl },
      });

      const presentExternalIds = [...new Set(items.map((it) => it.externalModelId))];
      let upserted = 0;
      for (let i = 0; i < items.length; i += OBSERVATION_BATCH_SIZE) {
        const batch = items.slice(i, i + OBSERVATION_BATCH_SIZE);
        await Promise.all(
          batch.map((it) => {
            // 命中/新建共用的可变字段（不含 firstSeenAt，不含唯一键 sourceId/externalModelId）。
            const mutable = {
              normalizedModelId: it.normalizedModelId,
              displayName: it.displayName ?? null,
              vendorHint: it.vendorHint ?? null,
              priceUnit: it.priceUnit ?? null,
              priceInput: it.priceInput ?? null,
              priceOutput: it.priceOutput ?? null,
              priceCacheRead: it.priceCacheRead ?? null,
              contextLength: it.contextLength ?? null,
              isListed: true,
              lastSeenAt: fetchedAt,
              lastSnapshotId: snapshot.id,
            };
            return tx.providerModelObservation.upsert({
              where: { sourceId_externalModelId: { sourceId, externalModelId: it.externalModelId } },
              create: { ...mutable, sourceId, externalModelId: it.externalModelId, firstSeenAt: fetchedAt, delistedAt: null },
              // 重新上架：保 firstSeenAt 不变，清 delistedAt，刷新 lastSeenAt/价格/isListed。
              update: { ...mutable, delistedAt: null },
            });
          }),
        );
        upserted += batch.length;
      }

      // 下架：本轮未出现、且当前在架的观测置 isListed=false + delistedAt（不动 first/lastSeenAt）。
      const delist = await tx.providerModelObservation.updateMany({
        where: { sourceId, isListed: true, externalModelId: { notIn: presentExternalIds } },
        data: { isListed: false, delistedAt: fetchedAt },
      });

      return { snapshotId: snapshot.id, sourceId, created: true, itemCount: items.length, upserted, delisted: delist.count, idempotent: false };
    }, TX_OPTIONS);
  } catch (e) {
    if (!isSnapshotShaConflict(e)) throw e;
    const hit = await readExisting();
    if (!hit) throw e;
    return hit;
  }
}
