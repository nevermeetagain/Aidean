/**
 * TASK-060 · Quanzil 目录 collector（公开 /api/pricing，无 Key；/v1/models 需 Key，不用）。
 * 在 lib/monitoring 内参照 lib/sync/adapters/quanzil.ts（QuanzilAdapter）重新实现换算纯函数——只读参考，不修改、不 import sync 适配器
 * （两条链路解耦：sync 写 AiModel/ModelPrice，monitoring 只写观测）。
 * 换算（New API 倍率体系，基准 model_ratio=1 ⇔ $2 / 1M tokens）：
 *   quota_type=0（按量）：input = model_ratio×2；output = model_ratio×completion_ratio×2；cacheRead = model_ratio×cache_ratio×2 → usd_per_1m_tokens
 *   quota_type=1（按次）：input = model_price（USD/次），output=null → usd_per_request
 *   以上为分组倍率=1 的挂牌价（group_ratio 因用户分组而异，不并入）；倍率缺失 → null，不推断。
 * vendor_id → vendors[] 查表得 vendorHint（仅线索，REQ-M-014）；available=false → isListed=false。
 */
import type { ProviderModelObservation } from "@aidean/shared";
import { normalizeModelId, strOrNull, toDecimalString, type CatalogCollector } from "./types";

/** 基准费率：model_ratio=1 ⇔ $0.002/1K tokens = $2/1M tokens（与 QuanzilAdapter BASE_RATE_USD_PER_M 同口径） */
export const QUANZIL_BASE_USD_PER_1M = 2;

interface QuanzilModel {
  model_name?: unknown;
  vendor_id?: unknown;
  quota_type?: unknown;
  model_ratio?: unknown;
  model_price?: unknown;
  completion_ratio?: unknown;
  cache_ratio?: unknown;
  available?: unknown;
}
interface QuanzilVendor {
  id?: unknown;
  name?: unknown;
}

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null);

/** 纯函数：Quanzil 倍率 → 原币价格（导出供单测） */
export function quanzilPrices(m: QuanzilModel): Pick<ProviderModelObservation, "priceUnit" | "priceInput" | "priceOutput" | "priceCacheRead"> {
  if (m.quota_type === 1) {
    const price = num(m.model_price);
    return { priceUnit: price === null ? null : "usd_per_request", priceInput: toDecimalString(price), priceOutput: null, priceCacheRead: null };
  }
  const ratio = num(m.model_ratio);
  if (ratio === null) return { priceUnit: null, priceInput: null, priceOutput: null, priceCacheRead: null };
  const comp = num(m.completion_ratio) ?? 1;
  const cache = num(m.cache_ratio);
  return {
    priceUnit: "usd_per_1m_tokens",
    priceInput: toDecimalString(ratio * QUANZIL_BASE_USD_PER_1M),
    priceOutput: toDecimalString(ratio * comp * QUANZIL_BASE_USD_PER_1M),
    priceCacheRead: cache === null ? null : toDecimalString(ratio * cache * QUANZIL_BASE_USD_PER_1M),
  };
}

export const quanzilCollector: CatalogCollector = {
  key: "quanzil",
  defaultEndpoint: "https://quanzil.com/api/pricing",
  normalize(raw, { fetchedAt }) {
    const body = raw as { data?: unknown; vendors?: unknown };
    if (!Array.isArray(body?.data)) throw new Error("quanzil: 响应缺少 data[]");
    const vendors = new Map<number, string>();
    for (const v of (Array.isArray(body.vendors) ? body.vendors : []) as QuanzilVendor[]) {
      if (typeof v?.id === "number" && typeof v.name === "string") vendors.set(v.id, v.name);
    }
    const at = fetchedAt.toISOString();
    const out: ProviderModelObservation[] = [];
    for (const m of body.data as QuanzilModel[]) {
      if (typeof m?.model_name !== "string" || !m.model_name.trim()) continue;
      const id = m.model_name.trim().slice(0, 200);
      const listed = m.available !== false;
      out.push({
        sourceKey: "quanzil",
        externalModelId: id,
        normalizedModelId: normalizeModelId(id),
        displayName: id,
        vendorHint: typeof m.vendor_id === "number" ? strOrNull(vendors.get(m.vendor_id), 80) : null,
        isListed: listed,
        ...quanzilPrices(m),
        contextLength: null, // /api/pricing 不提供上下文长度
        firstSeenAt: at,
        lastSeenAt: at,
        delistedAt: listed ? null : at,
      });
    }
    return out;
  },
};
