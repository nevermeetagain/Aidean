/**
 * TASK-066 · 模型「在哪里可调用」：按 AiModel ↔ ProviderModelObservation 关联多源上架信息（DESIGN-004 §6；契约 ModelOfferingsResponse）。
 *
 * 关联口径：normalizeModelId(AiModel.modelCode) 与 normalizeModelId(slug) 的并集 = observation.normalizedModelId
 *   （与采集器同一归一函数；只做展示关联，不自动合并实体——DESIGN-004 §4）。
 * 每源取 1 条：同源多个 externalModelId 归一到同一 id 时（E9-18 实测 OpenRouter 95 组），优先「仍在架」再按 lastSeenAt 新→旧。
 * 排序：在架优先 → 源分级 S1>S2>A>B>C → 源 label。
 * 身份：kind=relay 的源 identityVerified 恒 false（REQ-M-014：中转站自报模型名不是身份证据）。
 * 署名：tosStatus=attribution_required → attribution=源 label（ADR-P007，前台需显示署名链接）。
 * 已删除（deletedAt）或 tosStatus=forbidden 的源不对外展示。
 * 价格：原币原单位透传（priceUnit + 十进制字符串），不做汇率换算（U-15 未决）。
 */
import { ModelOfferingsResponse } from "@aidean/shared";
import type { z } from "zod";

import { normalizeModelId } from "./catalog/types";

export type ModelOfferings = z.infer<typeof ModelOfferingsResponse>;
type Item = ModelOfferings["items"][number];

const TIER_ORDER: Record<string, number> = { S1: 0, S2: 1, A: 2, B: 3, C: 4 };

/** 观测行（含源）最小形状：Prisma 查询结果的结构子集，便于单测注入 */
export interface ObservationRow {
  externalModelId: string;
  isListed: boolean;
  priceUnit: string | null;
  priceInput: { toString(): string } | null;
  priceOutput: { toString(): string } | null;
  firstSeenAt: Date;
  lastSeenAt: Date;
  source: {
    key: string;
    label: string;
    tier: string;
    kind: string;
    endpoint: string;
    docsUrl: string | null;
    tosStatus: string;
    deletedAt: Date | null;
  };
}

export function offeringKeys(model: { modelCode: string; slug: string }): string[] {
  return [...new Set([normalizeModelId(model.modelCode), normalizeModelId(model.slug)])];
}

const isHttpUrl = (u: string | null | undefined): u is string => !!u && /^https?:\/\/\S+$/.test(u);

/** Decimal → 契约 PriceStr；非法（负数/科学计数等）→ null，不让单条脏值拖垮整个响应 */
function priceStr(v: { toString(): string } | null): string | null {
  if (v === null) return null;
  const s = v.toString();
  return /^\d+(\.\d+)?$/.test(s) ? s : null;
}

export function buildOfferings(rows: readonly ObservationRow[]): ModelOfferings {
  const bySource = new Map<string, ObservationRow>();
  for (const r of rows) {
    if (r.source.deletedAt || r.source.tosStatus === "forbidden") continue;
    const prev = bySource.get(r.source.key);
    if (
      !prev ||
      (r.isListed && !prev.isListed) ||
      (r.isListed === prev.isListed && r.lastSeenAt.getTime() > prev.lastSeenAt.getTime())
    ) {
      bySource.set(r.source.key, r);
    }
  }
  const items: Item[] = [...bySource.values()].map((r) => {
    const s = r.source;
    const sourceUrl = isHttpUrl(s.docsUrl) ? s.docsUrl : isHttpUrl(s.endpoint) ? s.endpoint : null;
    return {
      sourceKey: s.key,
      sourceLabel: s.label,
      tier: s.tier as Item["tier"],
      kind: s.kind as Item["kind"],
      isListed: r.isListed,
      identityVerified: s.kind !== "relay",
      priceUnit: (r.priceUnit as Item["priceUnit"]) ?? null,
      priceInput: priceStr(r.priceInput),
      priceOutput: priceStr(r.priceOutput),
      firstSeenAt: r.firstSeenAt.toISOString(),
      lastSeenAt: r.lastSeenAt.toISOString(),
      sourceUrl: sourceUrl ?? "",
      attribution: s.tosStatus === "attribution_required" ? s.label : null,
    };
  });
  const valid = items.filter((i) => i.sourceUrl !== "");
  valid.sort(
    (a, b) =>
      Number(b.isListed) - Number(a.isListed) ||
      (TIER_ORDER[a.tier] ?? 9) - (TIER_ORDER[b.tier] ?? 9) ||
      a.sourceLabel.localeCompare(b.sourceLabel, "zh-CN"),
  );
  // 出口校验：形状不符即抛（由路由统一转 50000），绝不返回不合契约的数据
  return ModelOfferingsResponse.parse({ items: valid });
}

export const OFFERINGS_CACHE_TTL_SECONDS = 600;
export const offeringsCacheKey = (modelId: string) => `cache:model-offerings:${modelId}`;
