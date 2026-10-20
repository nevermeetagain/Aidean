/**
 * TASK-070 · SiliconFlow 公开定价页 collector（https://siliconflow.cn/pricing，无 Key）。
 *
 * 解析「对话模型」价格表：每行 = 模型（显示名 + 模型 ID）+ 输入/输出/缓存三列（CNY / 百万 Tokens）。
 * - 分时段（如 0点～2点/8点～24点 vs 2点～8点）与分上下文档多价：每列取最大值为准
 *   （高峰/标准档的上限价，口径见 EVD-070；不做平均/推断）。
 * - 「免费」与非 token 计价（“-”/按张/按字符）行跳过；生图/语音/视频段不进入对话观测。
 * - 页面价格表没有上下文长度列 → contextLength = null（不猜，不写 0）。
 * - 解析 0 条或页面结构变化 → ok:false，不以空列表冒充成功。
 */
import type { ProviderModelObservation } from "@aidean/shared";
import { normalizeModelId, strOrNull } from "../catalog/types";
import {
  blockedPageReason,
  maxDecimal,
  rowCells,
  sliceSection,
  tableRows,
  yuanAmounts,
  type PublicPricingCollector,
  type PublicPricingParseResult,
} from "./types";

/** 模型 ID：vendor/model 或 Pro/vendor/model（允许字母数字 . _ -） */
const MODEL_ID_RE = /([A-Za-z0-9][A-Za-z0-9._-]*\/[A-Za-z0-9][A-Za-z0-9._-]*(?:\/[A-Za-z0-9][A-Za-z0-9._-]*)?)/;

const SOURCE_KEY = "siliconflow-pricing";
const PRICE_UNIT = "cny_per_1m_tokens" as const;

export function parseSiliconflowPricing(text: string, fetchedAt: Date): PublicPricingParseResult {
  const blocked = blockedPageReason(text);
  if (blocked) return { ok: false, reason: blocked };

  const section = sliceSection(text, "对话模型", ["生图模型", "语音模型", "视频模型"]);
  if (!section) return { ok: false, reason: "未找到「对话模型」价格表（页面结构变化？）" };

  const at = fetchedAt.toISOString();
  const out: ProviderModelObservation[] = [];
  const seen = new Set<string>();

  for (const row of tableRows(section)) {
    const cells = rowCells(row);
    if (cells.length < 3) continue;
    // 模型 ID 可能在第 1 列（厂商 + 模型）或第 2 列（独立「模型」列）
    let idCell = -1;
    let id: string | null = null;
    for (let i = 0; i < Math.min(2, cells.length); i += 1) {
      const m = cells[i].match(MODEL_ID_RE);
      if (m) {
        id = m[1];
        idCell = i;
        break;
      }
    }
    if (!id || idCell < 0 || cells.length < idCell + 3) continue;
    const externalModelId = id.slice(0, 200);
    if (seen.has(externalModelId)) continue;

    const priceCells = cells.slice(idCell + 1, idCell + 4);
    const priceInput = maxDecimal(yuanAmounts(priceCells[0] ?? ""));
    const priceOutput = maxDecimal(yuanAmounts(priceCells[1] ?? ""));
    const priceCacheRead = maxDecimal(yuanAmounts(priceCells[2] ?? ""));
    if (priceInput === null && priceOutput === null && priceCacheRead === null) continue; // 免费/非 token 计价

    seen.add(externalModelId);
    const segments = externalModelId.split("/");
    const display = strOrNull(cells[idCell].replace(id, ""), 200) ?? strOrNull(segments[segments.length - 1], 200);
    out.push({
      sourceKey: SOURCE_KEY,
      externalModelId,
      normalizedModelId: normalizeModelId(externalModelId),
      displayName: display,
      vendorHint: strOrNull(segments.length >= 2 ? segments[segments.length - 2] : null, 80),
      isListed: true,
      priceUnit: PRICE_UNIT,
      priceInput,
      priceOutput,
      priceCacheRead,
      contextLength: null,
      firstSeenAt: at,
      lastSeenAt: at,
      delistedAt: null,
    });
  }

  if (out.length === 0) return { ok: false, reason: "未解析出任何对话模型价格（页面结构变化？）" };
  return { ok: true, observations: out };
}

export const siliconflowPricingCollector: PublicPricingCollector = {
  key: SOURCE_KEY,
  defaultEndpoint: "https://siliconflow.cn/pricing",
  priceUnit: PRICE_UNIT,
  parse: (text, ctx) => parseSiliconflowPricing(text, ctx.fetchedAt),
};
