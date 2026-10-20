/**
 * TASK-070 · 公开定价页 collector 出口（供 TASK-062 调度装配）。
 * 无 API Key、无凭证分支；抓取由调用方注入（collectPublicPricing 的 fetchText）。
 */
export {
  allTables,
  blockedPageReason,
  collectPublicPricing,
  htmlToText,
  maxDecimal,
  normalizeDecimalString,
  parseTokenCount,
  rowCells,
  sliceSection,
  stripFootnote,
  tableRows,
  yuanAmounts,
} from "./types";
export type {
  PublicPricingCollectResult,
  PublicPricingCollector,
  PublicPricingParseContext,
  PublicPricingParseResult,
  TextFetcher,
} from "./types";
export { deepseekPricingCollector, parseDeepseekPricing } from "./deepseek";
export { parseSiliconflowPricing, siliconflowPricingCollector } from "./siliconflow";

import { deepseekPricingCollector } from "./deepseek";
import { siliconflowPricingCollector } from "./siliconflow";
import type { PublicPricingCollector } from "./types";

/** key → collector（与 monitoring_sources.key 对齐；调度层按 DB 行取用） */
export const PUBLIC_PRICING_COLLECTORS: Readonly<Record<string, PublicPricingCollector>> = Object.freeze({
  [siliconflowPricingCollector.key]: siliconflowPricingCollector,
  [deepseekPricingCollector.key]: deepseekPricingCollector,
});

export function getPublicPricingCollector(key: string): PublicPricingCollector | undefined {
  return Object.prototype.hasOwnProperty.call(PUBLIC_PRICING_COLLECTORS, key)
    ? PUBLIC_PRICING_COLLECTORS[key]
    : undefined;
}
