/**
 * TASK-070 · DeepSeek 公开定价文档 collector（https://api-docs.deepseek.com/zh-cn/quick_start/pricing，无 Key）。
 *
 * 页面「模型细节」为「属性行 × 模型列」表格：
 *   模型 / 上下文长度 / 百万tokens输入（缓存命中）/ 百万tokens输入（缓存未命中）/ 百万tokens输出。
 * - 币种：同页给出 CNY 与 USD 时取 CNY（优先含「元」/¥/CNY 的价格表，USD 表忽略）。
 * - 缓存命中价 → priceCacheRead；缓存未命中输入价 → priceInput；输出价 → priceOutput。
 * - 分时段（空闲/高峰）多价：每格取最大值（高峰档上限价，口径见 EVD-070）。
 * - 缺缓存命中价或上下文长度 → null，不写 0；上下文 1M/128K 按 1024 进制展开（上下文窗口惯例），
 *   仅此处做计数换算，价格不做任何换算。
 * - 解析 0 条或页面结构变化 → ok:false，不以空列表冒充成功。
 */
import type { ProviderModelObservation } from "@aidean/shared";
import { normalizeModelId, strOrNull } from "../catalog/types";
import {
  allTables,
  blockedPageReason,
  htmlToText,
  maxDecimal,
  parseTokenCount,
  rowCells,
  stripFootnote,
  tableRows,
  yuanAmounts,
  type PublicPricingCollector,
  type PublicPricingParseResult,
} from "./types";

const SOURCE_KEY = "deepseek-pricing";
const PRICE_UNIT = "cny_per_1m_tokens" as const;

export function parseDeepseekPricing(text: string, fetchedAt: Date): PublicPricingParseResult {
  const blocked = blockedPageReason(text);
  if (blocked) return { ok: false, reason: blocked };

  const cnyTable = allTables(text).find((t) => {
    const visible = htmlToText(t);
    const hasCnyAmount = visible.includes("元") || /[¥￥]|CNY/.test(visible);
    const hasTokenPriceRow = visible.includes("缓存命中") || visible.includes("缓存未命中") || visible.includes("百万tokens");
    return hasCnyAmount && hasTokenPriceRow;
  });
  if (!cnyTable) return { ok: false, reason: "未找到 CNY 价格表（页面结构变化或仅提供 USD？）" };

  const rows = tableRows(cnyTable)
    .map((r) => rowCells(r))
    .filter((cells) => cells.length >= 2);
  const headerIdx = rows.findIndex((cells) => cells[0].includes("模型"));
  if (headerIdx < 0) return { ok: false, reason: "未找到模型表头（页面结构变化？）" };

  const models = rows[headerIdx]
    .slice(1)
    .map((s) => stripFootnote(s))
    .filter((s) => s.length > 0 && s.length <= 200);
  if (models.length === 0) return { ok: false, reason: "模型列为空（页面结构变化？）" };

  const contextLength: (number | null)[] = models.map(() => null);
  const priceInput: (string | null)[] = models.map(() => null);
  const priceOutput: (string | null)[] = models.map(() => null);
  const priceCacheRead: (string | null)[] = models.map(() => null);

  for (const cells of rows.slice(headerIdx + 1)) {
    const label = cells[0];
    const values = models.map((_, i) => cells[i + 1] ?? "");
    if (label.includes("上下文长度")) {
      values.forEach((v, i) => {
        contextLength[i] = parseTokenCount(v);
      });
    } else if (label.includes("缓存命中")) {
      values.forEach((v, i) => {
        priceCacheRead[i] = maxDecimal(yuanAmounts(v));
      });
    } else if (label.includes("缓存未命中")) {
      values.forEach((v, i) => {
        priceInput[i] = maxDecimal(yuanAmounts(v));
      });
    } else if (label.includes("输出") && !label.includes("长度")) {
      values.forEach((v, i) => {
        priceOutput[i] = maxDecimal(yuanAmounts(v));
      });
    }
  }

  const at = fetchedAt.toISOString();
  const out: ProviderModelObservation[] = [];
  const seen = new Set<string>();
  models.forEach((model, i) => {
    if (priceInput[i] === null && priceOutput[i] === null && priceCacheRead[i] === null) return;
    if (seen.has(model)) return;
    seen.add(model);
    out.push({
      sourceKey: SOURCE_KEY,
      externalModelId: model,
      normalizedModelId: normalizeModelId(model),
      displayName: strOrNull(model, 200),
      vendorHint: "deepseek",
      isListed: true,
      priceUnit: PRICE_UNIT,
      priceInput: priceInput[i],
      priceOutput: priceOutput[i],
      priceCacheRead: priceCacheRead[i],
      contextLength: contextLength[i],
      firstSeenAt: at,
      lastSeenAt: at,
      delistedAt: null,
    });
  });

  if (out.length === 0) return { ok: false, reason: "未解析出任何模型价格（页面结构变化？）" };
  return { ok: true, observations: out };
}

export const deepseekPricingCollector: PublicPricingCollector = {
  key: SOURCE_KEY,
  defaultEndpoint: "https://api-docs.deepseek.com/zh-cn/quick_start/pricing",
  priceUnit: PRICE_UNIT,
  parse: (text, ctx) => parseDeepseekPricing(text, ctx.fetchedAt),
};
