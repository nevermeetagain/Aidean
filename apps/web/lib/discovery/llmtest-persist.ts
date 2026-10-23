/**
 * T120-13 · llmtest 可靠性观测落库（reliability_observations）。
 *
 * - 映射真源：./llmtest-observations.ts（纯函数，上海自然日窗口，entityId=站点 id）。
 * - 站点 id 解析：APIStation（未软删）的 website / baseUrl 经 extractLlmtestDomain 规范化 → Map<域名, 站点 id>；
 *   同域多站点取最早创建者（确定性）。
 * - 幂等：DB 唯一键 (entity_type, entity_id, window_start)（迁移 20261024020000_reliability_obs_unique）；
 *   逐键 upsert（批 100，一批一事务）——同站点同上海日重复运行只更新指标，不新增行。
 * - 返回 written（upsert 行数）与 skipped（{domain, reason}），由 crawl_llmtest 打印进 ScriptExecution.output。
 */
import type { PrismaClient } from '@prisma/client';

import { extractLlmtestDomain, type LlmtestLeaderboardItem } from './llmtest';
import { mapLlmtestItemsToObservations, type LlmtestObservationCreate } from './llmtest-observations';

export const RELIABILITY_UPSERT_BATCH = 100;

export type LlmtestSkipReason = 'no_station_mapping';

export interface LlmtestPersistResult {
  written: number;
  skipped: Array<{ domain: string; reason: LlmtestSkipReason }>;
}

type Db = Pick<PrismaClient, 'aPIStation' | 'reliabilityObservation' | '$transaction'>;

/** APIStation（未软删）→ Map<规范化域名, 站点 id>；website 优先于 baseUrl，同域取最早创建者。 */
export async function buildStationIdByDomain(db: Pick<PrismaClient, 'aPIStation'>): Promise<Map<string, string>> {
  const stations = await db.aPIStation.findMany({
    where: { deletedAt: null },
    select: { id: true, website: true, baseUrl: true },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  });
  const map = new Map<string, string>();
  for (const s of stations) {
    for (const url of [s.website, s.baseUrl]) {
      const domain = extractLlmtestDomain(url);
      if (domain && !map.has(domain)) map.set(domain, s.id);
    }
  }
  return map;
}

/** 逐键 upsert（批 100，一批一事务）；返回写入行数。 */
export async function upsertReliabilityObservations(
  db: Pick<PrismaClient, 'reliabilityObservation' | '$transaction'>,
  observations: LlmtestObservationCreate[],
  batchSize = RELIABILITY_UPSERT_BATCH,
): Promise<number> {
  let written = 0;
  for (let i = 0; i < observations.length; i += batchSize) {
    const batch = observations.slice(i, i + batchSize);
    await db.$transaction(
      batch.map((o) =>
        db.reliabilityObservation.upsert({
          where: {
            entityType_entityId_windowStart: {
              entityType: o.entityType,
              entityId: o.entityId,
              windowStart: o.windowStart,
            },
          },
          create: o,
          update: {
            uptimePercent: o.uptimePercent,
            errorRate: o.errorRate,
            successCount: o.successCount,
            failureCount: o.failureCount,
            windowEnd: o.windowEnd,
          },
        }),
      ),
    );
    written += batch.length;
  }
  return written;
}

/** composite 项 → 映射 → upsert；无站点映射的域名计入 skipped（reason=no_station_mapping）。 */
export async function persistLlmtestObservations(
  db: Db,
  items: LlmtestLeaderboardItem[],
  opts: { at?: Date } = {},
): Promise<LlmtestPersistResult> {
  const stationIdByDomain = await buildStationIdByDomain(db);
  const { observations, skipped } = mapLlmtestItemsToObservations(items, { at: opts.at, stationIdByDomain });
  const written = await upsertReliabilityObservations(db, observations);
  return { written, skipped: skipped.map((domain) => ({ domain, reason: 'no_station_mapping' as const })) };
}
