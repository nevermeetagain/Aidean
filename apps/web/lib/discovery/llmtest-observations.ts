/**
 * TASK-073 / TASK-099 · llmtest 观测入时序：composite 项 → ReliabilityObservation 写入载荷（纯函数，无网络 / 无 prisma）。
 *
 * 背景：llmtest 采集此前仅把观测指标塞进候选 description（供人工审核溯源）。本模块补上「结构化落表」一侧——
 * 把 score/isAlive/total_checks/pass_count/last_alive_at 映射为 reliability_observations 的写入行，
 * 供持久化按 (entityType, entityId, windowStart) upsert（DB 级跨批幂等归写入方，本模块只做纯映射）。
 *
 * 既有候选发现行为（mapLlmtestItemToCandidate / discoverFromCrawl）保持不变——本文件只涉及观测映射。
 *
 * —— TASK-099 口径修正（review-ext12 D8/D12）——
 *   1) entityId 只用「站点 id」（APIStation.id，uuid 文本），不再用域名。映射层不引 prisma，
 *      站点 id 由调用方注入 `stationIdByDomain: Map<规范化域名, 站点 id>`（域名→站点 id 的解析发生在调用方/调度脚本）。
 *   2) 有效域名但 stationIdByDomain 无对应站点 id 者 → 跳过并计入返回 `skipped[]`
 *      （ReliabilityObservation 无 meta 列，域名不入库，只回报以便对账 / 补映射）。
 *   3) 观测窗口按 Asia/Shanghai 自然日（UTC+8，无夏令时）：
 *      windowStart = 上海日 00:00（= UTC 前一日 16:00），windowEnd = 次上海日 00:00。
 *   4) 落库幂等键 (entityType, entityId, windowStart) 在 DB 侧缺唯一索引——本卡「不建迁移」（M-002：仅 Hark 改库），
 *      登记为 Hark 数据库线待补（原 TASK-071 前置；071 已按 U-M3 取消 → 移交 Hark）。
 *
 * 字段落位（受限于现有列，M-002 禁在本卡新增迁移）沿用 TASK-073：
 *   pass_count → successCount；max(0, total_checks - pass_count) → failureCount；
 *   score → uptimePercent（缺 score 时按通过率派生；均无 → null）；
 *   isAlive=false → errorRate=1，否则按失败率（有检查时；无检查 → null）；
 *   last_alive_at 落在上海日 [windowStart, windowEnd) 内则记为 windowEnd（否则回落 windowEnd）。
 */
import { extractLlmtestDomain, type LlmtestLeaderboardItem } from './llmtest';

/** 观测实体类型（reliability_observations.entity_type：provider | station；llmtest 站点归 station）。 */
export type ReliabilityEntityType = 'station';

/** ReliabilityObservation 写入载荷（仅现有列；id/createdAt 由 DB 默认值填充，不在此产出）。 */
export interface LlmtestObservationCreate {
  entityType: ReliabilityEntityType;
  /** TASK-099：站点 id（APIStation.id，uuid 文本）；不再是域名。 */
  entityId: string;
  uptimePercent: number | null;
  errorRate: number | null;
  successCount: number;
  failureCount: number;
  windowStart: Date;
  windowEnd: Date;
}

/** 批量映射结果：observations 可直接落库；skipped 为「有效域名但无站点 id 映射」的域名列表（去重）。 */
export interface LlmtestObservationMappingResult {
  observations: LlmtestObservationCreate[];
  skipped: string[];
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
/** Asia/Shanghai = UTC+8，自 1991 年起无夏令时（TASK-099 窗口口径）。 */
const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000;

/**
 * 上海自然日起止：把 at 的「上海墙上时间」投影到 UTC 轴取当日 00:00，再折回真实 UTC 瞬间。
 * 例：at=2026-10-19T13:45Z（上海 21:45）→ start=2026-10-18T16:00Z（上海 10-19 00:00），end=2026-10-19T16:00Z。
 */
function shanghaiDay(at: Date): { start: Date; end: Date } {
  const shifted = at.getTime() + SHANGHAI_OFFSET_MS;
  const dayStartShifted = Math.floor(shifted / DAY_MS) * DAY_MS;
  const start = new Date(dayStartShifted - SHANGHAI_OFFSET_MS);
  const end = new Date(dayStartShifted - SHANGHAI_OFFSET_MS + DAY_MS);
  return { start, end };
}

/** 内部：给定站点 id 与采集时刻，产出观测载荷（metric 字段落位同 TASK-073；entityId 用站点 id）。 */
function buildObservation(
  item: LlmtestLeaderboardItem,
  stationId: string,
  at: Date,
): LlmtestObservationCreate {
  const { start: windowStart, end: dayEnd } = shanghaiDay(at);

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
    entityId: stationId,
    uptimePercent,
    errorRate,
    successCount,
    failureCount,
    windowStart,
    windowEnd,
  };
}

/**
 * 单项 → ReliabilityObservation 写入载荷。
 * 无有效域名 → null；有效域名但未注入对应站点 id（stationId 缺省）→ null（skipped 由批量函数记录）。
 * @param opts.at 采集时刻（默认当前时间）；决定「上海自然日」窗口起止。
 * @param opts.stationId 该域名对应的站点 id（entityId 只用它，TASK-099）。
 */
export function mapLlmtestItemToObservation(
  item: LlmtestLeaderboardItem,
  opts: { at?: Date; stationId?: string } = {},
): LlmtestObservationCreate | null {
  const domain = extractLlmtestDomain(item.url);
  if (!domain) return null;
  const stationId = opts.stationId;
  if (!stationId) return null;
  return buildObservation(item, stationId, opts.at ?? new Date());
}

/**
 * 批量映射 + 站点 id 解析：域名经 stationIdByDomain 映射为 entityId（站点 id）。
 * 有效域名但无站点 id 映射 → 跳过并计入 `skipped[]`（去重）；无 url/非法域名 → 静默跳过（非映射缺口，不入 skipped）。
 * 同批按 entityId(站点 id) 去重，重复采集保留 windowEnd 更晚（last_alive_at 更新）的一条。
 * 跨批次幂等（DB upsert）由写入方按 (entityType, entityId, windowStart) 负责；唯一索引缺失见文件头 §4（待 Hark 补）。
 */
export function mapLlmtestItemsToObservations(
  items: LlmtestLeaderboardItem[],
  opts: { at?: Date; stationIdByDomain: ReadonlyMap<string, string> },
): LlmtestObservationMappingResult {
  const at = opts.at ?? new Date();
  const skipped: string[] = [];
  const seenSkip = new Set<string>();
  const byId = new Map<string, LlmtestObservationCreate>();
  for (const item of items) {
    const domain = extractLlmtestDomain(item.url);
    if (!domain) continue;
    const stationId = opts.stationIdByDomain.get(domain);
    if (!stationId) {
      if (!seenSkip.has(domain)) {
        seenSkip.add(domain);
        skipped.push(domain);
      }
      continue;
    }
    const obs = buildObservation(item, stationId, at);
    const prev = byId.get(obs.entityId);
    if (!prev || obs.windowEnd.getTime() >= prev.windowEnd.getTime()) byId.set(obs.entityId, obs);
  }
  return { observations: Array.from(byId.values()), skipped };
}
