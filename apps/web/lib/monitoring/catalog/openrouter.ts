/**
 * TASK-060 · OpenRouter 目录 collector（公开，无 Key）。
 * 端点：GET https://openrouter.ai/api/v1/models?output_modalities=all（实测默认仅 text 视图，all 视图更全）。
 * 价格：pricing.prompt / completion / input_cache_read 为 USD/token 十进制字符串 → 精确 ×1e6 → usd_per_1m_tokens。
 * 负价（如 openrouter/auto 等路由器的 "-1" 动态价）与缺失字段 → null（不推断）。
 */
import type { ProviderModelObservation } from "@aidean/shared";
import { normalizeModelId, positiveIntOrNull, shiftDecimal, strOrNull, type CatalogCollector } from "./types";

interface OpenRouterModel {
  id?: unknown;
  name?: unknown;
  context_length?: unknown;
  pricing?: { prompt?: unknown; completion?: unknown; input_cache_read?: unknown } | null;
}

export const openrouterCollector: CatalogCollector = {
  key: "openrouter",
  defaultEndpoint: "https://openrouter.ai/api/v1/models?output_modalities=all",
  normalize(raw, { fetchedAt }) {
    const list = (raw as { data?: unknown })?.data;
    if (!Array.isArray(list)) throw new Error("openrouter: 响应缺少 data[]");
    const at = fetchedAt.toISOString();
    const out: ProviderModelObservation[] = [];
    for (const m of list as OpenRouterModel[]) {
      if (typeof m?.id !== "string" || !m.id.trim()) continue;
      const id = m.id.trim().slice(0, 200);
      const p = m.pricing ?? {};
      const priceInput = shiftDecimal(p.prompt, 6);
      const priceOutput = shiftDecimal(p.completion, 6);
      const priceCacheRead = shiftDecimal(p.input_cache_read, 6);
      const slash = id.indexOf("/");
      out.push({
        sourceKey: "openrouter",
        externalModelId: id,
        normalizedModelId: normalizeModelId(id),
        displayName: strOrNull(m.name, 200),
        vendorHint: slash > 0 ? id.slice(0, slash).slice(0, 80) : null,
        isListed: true,
        priceUnit: priceInput !== null || priceOutput !== null ? "usd_per_1m_tokens" : null,
        priceInput,
        priceOutput,
        priceCacheRead,
        contextLength: positiveIntOrNull(m.context_length),
        firstSeenAt: at,
        lastSeenAt: at,
        delistedAt: null,
      });
    }
    return out;
  },
};
