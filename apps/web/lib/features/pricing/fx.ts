/**
 * TASK-047（ADR-P005 v0.3，U-15）· 日汇率快照读取——计费与展示共用的唯一汇率来源。
 *
 * 口径：汇率日 = fxDateOf(at)（Asia/Shanghai 自然日）；取 rate_date ≤ 汇率日的最近一行（USD→CNY）。
 *   - 当日快照存在 → stale=false；
 *   - 当日缺失但最近一行在 PRICE_NORMALIZATION.fxMaxStaleDays 天内 → 用它，stale=true（采集晚到不致全站无价）；
 *   - 无行或超过陈旧上限 → null：调用方按 fail-closed 处理（网关跳过跨币种候选，读侧显示「价格待核」）。
 * 同一汇率日在进程内缓存 10 分钟，保证一次请求链路内计费与展示读到同一个值；不写库。
 */
import { PRICE_NORMALIZATION, fxDateOf, type FxRates } from "@aidean/shared";
import { prisma } from "../../db/prisma";

export interface DailyFx extends FxRates {
  /** 实际所用快照日期是否早于汇率日 */
  stale: boolean;
  /** 被查询的汇率日 */
  forDate: string;
}

const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { at: number; value: DailyFx | null }>();

const DAY_MS = 24 * 60 * 60 * 1000;
const dayDiff = (a: string, b: string): number => Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / DAY_MS);

export async function getDailyFx(at: Date = new Date(), now: () => number = Date.now): Promise<DailyFx | null> {
  const forDate = fxDateOf(at);
  const hit = cache.get(forDate);
  if (hit && now() - hit.at < CACHE_TTL_MS) return hit.value;

  const row = await prisma.fxDailyRate.findFirst({
    where: { base: "USD", quote: "CNY", rateDate: { lte: new Date(`${forDate}T00:00:00Z`) } },
    orderBy: { rateDate: "desc" },
    select: { rateDate: true, rate: true },
  });

  let value: DailyFx | null = null;
  if (row) {
    const date = row.rateDate.toISOString().slice(0, 10);
    const age = dayDiff(forDate, date);
    if (age <= PRICE_NORMALIZATION.fxMaxStaleDays) {
      value = { date, usdCny: row.rate.toString(), stale: age > 0, forDate };
    }
  }
  cache.set(forDate, { at: now(), value });
  return value;
}

/** 测试与采集写入后使用：清空进程内缓存 */
export function clearDailyFxCache(): void {
  cache.clear();
}
