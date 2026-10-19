/**
 * TASK-073 · llmtest 观测入时序：composite 项 → ReliabilityObservation 写入载荷（纯函数，无网络 / 无 prisma）。
 *
 * 背景：llmtest 采集此前仅把观测指标塞进候选 description（供人工审核溯源）。本模块补上「结构化落表」一侧——
 * 把 score/isAlive/total_checks/pass_count/last_alive_at 映射为 reliability_observations 的写入行，
 * 供持久化按 (entityType, entityId, windowStart) upsert（DB 级跨批幂等归写入方，本模块只做纯映射）。
 *
 * 既有候选发现行为（mapLlmtestItemToCandidate / discoverFromCrawl）保持不变——本文件只新增观测映射，不改候选路径。
 *
 * 字段落位受限于现有列（M-002 禁在本卡新增迁移）：
 *   pass_count → successCount；max(0, total_checks - pass_count) → failureCount；
 *   score → uptimePercent（缺 score 时按通过率派生；均无 → null）；
 *   isAlive=false → errorRate=1，否则按失败率（有检查时；无检查 → null）；
 *   窗口 = 采集日 [dayStart, dayEnd)；last_alive_at 落在采集日内则记为 windowEnd（否则回落 dayEnd）。
 * entityType='station'，entityId=规范化域名（采集时点尚未解析出 stationId，按「candidate 关联」用域名作键）。
 */
import { extractLlmtestDomain, type LlmtestLeaderboardItem } from './llmtest';

/** 观测实体类型（reliability_observations.entity_type：provider | station；llmtest 站点归 station）。 */
export type ReliabilityEntityType = 'station';

/** ReliabilityObservation 写入载荷（仅现有列；id/createdAt 由 DB 默认值填充，不在此产出）。 */
export interface LlmtestObservationCreate {
  entityType: ReliabilityEntityType;
  entityId: string;
  uptimePercent: number | null;
  errorRate: number | null;
  successCount: number;
  failureCount: number;
  windowStart: Date;
  windowEnd: Date;
}

const asNumber = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) ? v : undefined;

const asBoolean = (v: unknown): boolean | undefined => (typeof v === 'boolean' ? v : undefined);

/** 容错解析时间：Date / ISO 字符串 / epoch 毫秒；无效 → undefined。 */
const asDate = (v: unknown): Date | undefined => {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v;
  if (typeof v === 'string' || typeof v === 'number') {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
  return undefined;
};

const clampPct = (n: number): number => (n < 0 ? 0 : n > 100 ? 100 : n);

const DAY_MS = 24 * 60 * 60 * 1000;

/** 采集日 UTC 00:00（窗口起点）。 */
function dayStartUtc(at: Date): Date {
  return new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()));
}

/**
 * 单项 → ReliabilityObservation 写入载荷；无有效域名 → null（跳过，与候选映射同口径）。
 * @param opts.at 采集时刻（默认当前时间）；决定「窗口=采集日」的起止。
 */
export function mapLlmtestItemToObservation(
  item: LlmtestLeaderboardItem,
  opts: { at?: Date } = {},
): LlmtestObservationCreate | null {
  const entityId = extractLlmtestDomain(item.url);
  if (!entityId) return null;

  const at = opts.at ?? new Date();
  const windowStart = dayStartUtc(at);
  const dayEnd = new Date(windowStart.getTime() + DAY_MS);

  const score = asNumber(item.score);
  const isAlive = asBoolean(item.isAlive);
  const total = asNumber(item.total_checks);
  const pass = asNumber(item.pass_count);
  const lastAlive = asDate(item.last_alive_at);

  const successCount = pass !== undefined ? Math.max(0, Math.trunc(pass)) : 0;
  // 缺 total_checks 时以 pass_count 作已观测数（不推断未观测项），保证 failureCount>=0。
  const totalChecks = total !== undefined ? Math.max(successCount, Math.trunc(total)) : successCount;
  const failureCount = Math.max(0, totalChecks - successCount);

  let uptimePercent: number | null;
  if (score !== undefined) uptimePercent = clampPct(score);
  else if (totalChecks > 0) uptimePercent = clampPct((successCount / totalChecks) * 100);
  else uptimePercent = null;

  let errorRate: number | null;
  if (isAlive === false) errorRate = 1;
  else if (totalChecks > 0) errorRate = failureCount / totalChecks;
  else errorRate = null;

  const windowEnd =
    lastAlive && lastAlive >= windowStart && lastAlive < dayEnd ? lastAlive : dayEnd;

  return {
    entityType: 'station',
    entityId,
    uptimePercent,
    errorRate,
    successCount,
    failureCount,
    windowStart,
    windowEnd,
  };
}

/**
 * 批量映射 + 按 entityId(域名) 去重（同批）。重复采集：保留 windowEnd 更新的一条（last_alive_at 更晚优先）。
 * 跨批次幂等由持久化按 (entityType, entityId, windowStart) upsert 负责，不属本纯映射职责。
 */
export function mapLlmtestItemsToObservations(
  items: LlmtestLeaderboardItem[],
  opts: { at?: Date } = {},
): LlmtestObservationCreate[] {
  const byId = new Map<string, LlmtestObservationCreate>();
  for (const item of items) {
    const obs = mapLlmtestItemToObservation(item, opts);
    if (!obs) continue;
    const prev = byId.get(obs.entityId);
    if (!prev || obs.windowEnd.getTime() >= prev.windowEnd.getTime()) byId.set(obs.entityId, obs);
  }
  return Array.from(byId.values());
}
