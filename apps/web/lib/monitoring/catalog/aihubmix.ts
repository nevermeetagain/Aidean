/**
 * TASK-060 · AIHubMix 目录 collector（公开，无 Key）。
 * 端点：GET https://aihubmix.com/api/v1/models → { data: [...], success, message }。
 * 字段映射（按 2026-10-19 实测 fixture）：model_id → externalModelId；model_name → displayName；
 *   vendor（如 "openai"）→ vendorHint（缺失时 null，不用 developer_id 数字猜）；context_length → contextLength。
 * 价格（USD / 1M tokens）取值优先级（V0.9.0 STEP-4 审查 M2，E9-16）：
 *   ① pricing_lines 中 unit=million_tokens 且为默认档（tier.default=true 或无 tier）的 prompt_tokens / completion_tokens / cached_tokens
 *      ——计费配置真源；实测 230 个带分档模型中约 18% 的顶层 pricing 与默认档不一致（如 doubao-seed-1-6 顶层 0.18 vs 默认档 0.10959），顶层更像旧值；
 *   ② 无 ① 时退回顶层 pricing.input / output / cache_read（顶层即基础档，pricing.tiers 只含更高档，不展开）。
 *   两者皆无（图像/按字符等非 token 计价，如 img_price_config）→ 价格全 null、priceUnit=null，不猜。
 * 下架（STEP-4 审查 M1）：retire_stage="retired"，或 retired_at 已到（≤ fetchedAt）→ isListed=false；
 *   retired_at 为未来日期 = 计划退役，仍在列（实测 gpt-4 等 10-23 才退役）；deprecated 仍在列。
 */
import type { ProviderModelObservation } from "@aidean/shared";
import { normalizeModelId, positiveIntOrNull, strOrNull, toDecimalString, type CatalogCollector } from "./types";

export interface AiHubMixModel {
  model_id?: unknown;
  model_name?: unknown;
  vendor?: unknown;
  context_length?: unknown;
  pricing?: { input?: unknown; output?: unknown; cache_read?: unknown } | null;
  pricing_lines?: { billable?: unknown; unit?: unknown; cost_usd?: unknown; tier?: { default?: unknown } | null }[] | null;
  retire_stage?: unknown;
  retired_at?: unknown;
}

/** pricing_lines 默认档取价（unit=million_tokens 且 tier.default=true 或无 tier）；无对应行 → undefined */
function defaultLine(m: AiHubMixModel, billable: string): string | null | undefined {
  const lines = Array.isArray(m.pricing_lines) ? m.pricing_lines : [];
  const hit = lines.find(
    (l) => l && l.billable === billable && l.unit === "million_tokens" && (!l.tier || l.tier.default === true),
  );
  return hit ? toDecimalString(hit.cost_usd) : undefined;
}

/** 导出供单测：AIHubMix 价格解析（优先 pricing_lines 默认档，退回顶层 pricing） */
export function aihubmixPrices(m: AiHubMixModel): { priceInput: string | null; priceOutput: string | null; priceCacheRead: string | null } {
  const lin = defaultLine(m, "prompt_tokens");
  const lout = defaultLine(m, "completion_tokens");
  if (lin !== undefined || lout !== undefined) {
    const lcache = defaultLine(m, "cached_tokens");
    return { priceInput: lin ?? null, priceOutput: lout ?? null, priceCacheRead: lcache ?? null };
  }
  const p = m.pricing && typeof m.pricing === "object" ? m.pricing : null;
  return {
    priceInput: p ? toDecimalString(p.input) : null,
    priceOutput: p ? toDecimalString(p.output) : null,
    priceCacheRead: p ? toDecimalString(p.cache_read) : null,
  };
}

/** 导出供单测：是否已下架（retired，或 retired_at ≤ at） */
export function aihubmixRetired(m: AiHubMixModel, at: Date): boolean {
  if (m.retire_stage === "retired") return true;
  if (typeof m.retired_at === "string" && m.retired_at) {
    const t = Date.parse(m.retired_at);
    return Number.isFinite(t) && t <= at.getTime();
  }
  return false;
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
      const { priceInput, priceOutput, priceCacheRead } = aihubmixPrices(m);
      const retired = aihubmixRetired(m, fetchedAt);
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
