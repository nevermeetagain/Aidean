/**
 * TASK-093 · ladder 读侧生效价单测（DESIGN-002 §2 接入点）
 *
 * 验证 getModelsForMatrix / findModelByIdentifier 两处价格读取从 isCurrent 改走生效价：
 *   窗口内 PROMOTION 优先 → 显示优惠价；窗口外/过期 → 回落 isCurrent 当前价；无价 → null；
 *   且透传给 Prisma 的嵌套 where === effectivePriceWhere(at)（与 027 单一口径对齐）。
 * 策略：注入假 client（{aiModel:{findMany/findFirst}}），不触库；Decimal 用 Prisma.Decimal 忠实还原。
 */
import { Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { ladderRepository } from "../repository";
import { effectivePriceWhere } from "../../pricing/effective-price";

const D = (s: string) => new Date(s);
const dec = (s: string) => new Prisma.Decimal(s);

const CUR_IN = "2";
const PROMO_IN = "0.5";

/** 矩阵候选价行（对应 getModelsForMatrix 的 select 字段面）。 */
function mrow(input: string, sourceType: string, isCurrent: boolean, from: string, until: string | null) {
  return {
    priceInput: dec(input),
    priceOutput: dec("4"),
    isCurrent,
    sourceType,
    effectiveFrom: D(from),
    effectiveUntil: until ? D(until) : null,
  };
}

function matrixModel(prices: unknown[]) {
  return {
    id: "m1",
    nameDisplay: "Model One",
    slug: "model-one",
    vendorId: "v1",
    vendor: { code: "v", name: "Vendor", tierLevel: 1, brandColor: null, country: null, priority: 50 },
    scores: [{ compositeScore: dec("90"), officialScore: null, actualScore: null, reviewScore: null, selfTestScore: null }],
    prices,
    modelType: "CHAT",
    protocol: "OPENAI",
    publishedAt: null,
    isOpenSource: false,
    contextLength: 8000,
  };
}

/** 详情全价行（对应 findModelByIdentifier 的 include 全字段）。 */
function prow(input: string, sourceType: string, isCurrent: boolean, from: string, until: string | null) {
  return {
    id: "p-" + sourceType,
    modelId: "m1",
    priceInput: dec(input),
    priceOutput: dec("4"),
    priceCache: null,
    billingMode: "PER_TOKEN",
    billingCurrency: "CNY",
    billingUnit: "per_1m_tokens",
    isCurrent,
    sourceType,
    effectiveFrom: D(from),
    effectiveUntil: until ? D(until) : null,
  };
}

const CURRENT = () => mrow(CUR_IN, "OFFICIAL", true, "2026-01-01T00:00:00Z", null);
const PROMO = () => mrow(PROMO_IN, "PROMOTION", false, "2026-11-01T00:00:00Z", "2026-11-08T00:00:00Z");

describe("getModelsForMatrix 生效价（TASK-093）", () => {
  it("窗口内 → 显示优惠价，且 where 透传 effectivePriceWhere(at)", async () => {
    const at = D("2026-11-04T00:00:00Z");
    const findMany = vi.fn().mockResolvedValue([matrixModel([CURRENT(), PROMO()])]);
    const client = { aiModel: { findMany } } as never;

    const [item] = await ladderRepository.getModelsForMatrix(client, at);
    expect(item.price.priceInput).toBe(Number(PROMO_IN));
    const arg = findMany.mock.calls[0][0] as { include: { prices: { where: unknown } } };
    expect(arg.include.prices.where).toEqual(effectivePriceWhere(at));
  });

  it("窗口外（过期）→ 回落当前价", async () => {
    const at = D("2026-11-09T00:00:00Z");
    const findMany = vi.fn().mockResolvedValue([matrixModel([CURRENT(), PROMO()])]);
    const client = { aiModel: { findMany } } as never;

    const [item] = await ladderRepository.getModelsForMatrix(client, at);
    expect(item.price.priceInput).toBe(Number(CUR_IN));
  });

  it("无任何价格行 → price 两值均为 null", async () => {
    const at = D("2026-11-04T00:00:00Z");
    const findMany = vi.fn().mockResolvedValue([matrixModel([])]);
    const client = { aiModel: { findMany } } as never;

    const [item] = await ladderRepository.getModelsForMatrix(client, at);
    expect(item.price).toEqual({ priceInput: null, priceOutput: null });
  });
});

describe("findModelByIdentifier 生效价收敛（TASK-093）", () => {
  it("窗口内 → prices 收敛为 1 条优惠行，保留 billing 全字段；where 透传", async () => {
    const at = D("2026-11-04T00:00:00Z");
    const model = {
      id: "m1",
      slug: "model-one",
      nameDisplay: "Model One",
      vendor: { code: "v", name: "Vendor", brandColor: null, tierLevel: 1 },
      prices: [
        prow(CUR_IN, "OFFICIAL", true, "2026-01-01T00:00:00Z", null),
        prow(PROMO_IN, "PROMOTION", false, "2026-11-01T00:00:00Z", "2026-11-08T00:00:00Z"),
      ],
      scores: [],
      benchmarks: [],
      offerings: [],
    };
    const findFirst = vi.fn().mockResolvedValue(model);
    const client = { aiModel: { findFirst } } as never;

    const m = await ladderRepository.findModelByIdentifier(client, "model-one", at);
    expect(m?.prices).toHaveLength(1);
    expect(m?.prices[0].sourceType).toBe("PROMOTION");
    expect(m?.prices[0].billingCurrency).toBe("CNY"); // 消费方 prices[0].billingCurrency 仍可得
    expect(Number(m?.prices[0].priceInput)).toBe(Number(PROMO_IN));
    const arg = findFirst.mock.calls[0][0] as { include: { prices: { where: unknown } } };
    expect(arg.include.prices.where).toEqual(effectivePriceWhere(at));
  });

  it("窗口外 → prices[0] 为当前价", async () => {
    const at = D("2026-11-09T00:00:00Z");
    const model = {
      id: "m1",
      slug: "model-one",
      nameDisplay: "Model One",
      vendor: { code: "v", name: "Vendor", brandColor: null, tierLevel: 1 },
      prices: [
        prow(CUR_IN, "OFFICIAL", true, "2026-01-01T00:00:00Z", null),
        prow(PROMO_IN, "PROMOTION", false, "2026-11-01T00:00:00Z", "2026-11-08T00:00:00Z"),
      ],
      scores: [],
      benchmarks: [],
      offerings: [],
    };
    const findFirst = vi.fn().mockResolvedValue(model);
    const client = { aiModel: { findFirst } } as never;

    const m = await ladderRepository.findModelByIdentifier(client, "model-one", at);
    expect(m?.prices).toHaveLength(1);
    expect(m?.prices[0].sourceType).toBe("OFFICIAL");
    expect(Number(m?.prices[0].priceInput)).toBe(Number(CUR_IN));
  });

  it("记录不存在 → null", async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const client = { aiModel: { findFirst } } as never;
    expect(await ladderRepository.findModelByIdentifier(client, "nope", D("2026-11-04T00:00:00Z"))).toBeNull();
  });
});
