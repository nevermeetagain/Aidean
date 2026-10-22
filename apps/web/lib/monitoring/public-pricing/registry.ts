/**
 * TASK-070 · 公开定价页 collector 注册表（key → collector，供 TASK-062 调度层按 monitoring_sources.key 取用）。
 *
 * 由原 public-pricing barrel（index.ts）拆分而来（ADR-0002 / 目录结构文档 §六「业务代码禁 barrel file」）：
 * - 解析与抓取实现见 ./types（collectPublicPricing 等）、./deepseek、./siliconflow；
 * - 本文件**只保留注册表与取用函数**，不再汇出其它模块的符号，消费点直接引用上述具体文件。
 */
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
