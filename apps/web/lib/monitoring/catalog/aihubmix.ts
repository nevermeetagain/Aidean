/**
 * TASK-060 · AIHubMix 目录 collector（公开，无 Key）。
 * 端点：GET https://aihubmix.com/api/v1/models → { data: [...], success, message }。
 * 字段映射（按 2026-10-19 实测 fixture）：model_id → externalModelId；model_name → displayName；
 *   vendor（如 "openai"）→ vendorHint（缺失时 null，不用 developer_id 数字猜）；context_length → contextLength。
 * 价格：pricing.input / output / cache_read 为 USD / 1M tokens（与 pricing_lines[].unit=million_tokens、cost_usd 互证）。
 *   pricing 为 null（图像/按字符计价等非 token 计价，如 img_price_config）→ 价格全 null、priceUnit=null，不猜。
 *   阶梯价 pricing.tiers 只取基础档（首档），不展开。
 * 下架：retire_stage="retired" 或存在 retired_at → isListed=false；deprecated 仍在列。
 */
import type { ProviderModelObservation } from "@aidean/shared";
import { normalizeModelId, positiveIntOrNull, strOrNull, toDecimalString, type CatalogCollector } from "./types";

interface AiHubMixModel {
  model_id?: unknown;
  model_name?: unknown;
  vendor?: unknown;
  context_length?: unknown;
  pricing?: { input?: unknown; output?: unknown; cache_read?: unknown } | null;
  retire_stage?: unknown;
  retired_at?: unknown;
}

export const aihubmixCollector: CatalogCollector = {
  key: "aihubmix",
  defaultEndpoint: "https://aihubmix.com/api/v1/models",
  normalize(raw, { fetchedAt }) {
    const list = (raw as { data?: unknown })?.data;
    if (!Array.isArray(list)) throw new Error("aihubmix: 响应缺少 data[]");
    const at = fetchedAt.toISOString();
    const out: ProviderModelObservation[] = [];
    for (const m of list as AiHubMixModel[]) {
      if (typeof m?.model_id !== "string" || !m.model_id.trim()) continue;
      const id = m.model_id.trim().slice(0, 200);
      const p = m.pricing && typeof m.pricing === "object" ? m.pricing : null;
      const priceInput = p ? toDecimalString(p.input) : null;
      const priceOutput = p ? toDecimalString(p.output) : null;
      const priceCacheRead = p ? toDecimalString(p.cache_read) : null;
      const retired = m.retire_stage === "retired" || (typeof m.retired_at === "string" && m.retired_at.length > 0);
      out.push({
        sourceKey: "aihubmix",
        externalModelId: id,
        normalizedModelId: normalizeModelId(id),
        displayName: strOrNull(m.model_name, 200),
        vendorHint: strOrNull(m.vendor, 80),
        isListed: !retired,
        priceUnit: priceInput !== null || priceOutput !== null ? "usd_per_1m_tokens" : null,
        priceInput,
        priceOutput,
        priceCacheRead,
        contextLength: positiveIntOrNull(m.context_length),
        firstSeenAt: at,
        lastSeenAt: at,
        delistedAt: retired ? at : null,
      });
    }
    return out;
  },
};
