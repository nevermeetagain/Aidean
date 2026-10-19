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

import { ladderPriceWhere, ladderRepository } from "../repository";
import { LADDER_CACHE_TTL_SECONDS, ladderService, ttlUntilBoundary } from "../service";

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
  it("窗口内 → 显示优惠价，且 where = ladderPriceWhere(at) + effectiveFrom desc（TASK-097）", async () => {
    const at = D("2026-11-04T00:00:00Z");
    const findMany = vi.fn().mockResolvedValue([matrixModel([CURRENT(), PROMO()])]);
    const client = { aiModel: { findMany } } as never;

    const [item] = await ladderRepository.getModelsForMatrix(client, at);
    expect(item.price.priceInput).toBe(Number(PROMO_IN));
    const arg = findMany.mock.calls[0][0] as { include: { prices: { where: unknown } } };
    expect(arg.include.prices.where).toEqual(ladderPriceWhere(at));
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
    expect(arg.include.prices.where).toEqual(ladderPriceWhere(at));
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

describe("TASK-097 天梯读侧加固 + 缓存 TTL 对齐（review-ext12 D4/D5）", () => {
  it("ladderPriceWhere：当前价分支排除 PROMOTION（误标 isCurrent 的优惠脏行不进候选）", () => {
    const at = D("2026-11-04T00:00:00Z");
    const w = ladderPriceWhere(at) as { OR: Array<Record<string, unknown>> };
    expect(w.OR[0]).toEqual({ isCurrent: true, sourceType: { not: "PROMOTION" } });
    expect(w.OR[1]).toEqual({ sourceType: "PROMOTION", effectiveFrom: { lte: at }, effectiveUntil: { gt: at } });
  });

  it("脏行（过期 PROMOTION 且 isCurrent=true）即使混入候选，也不会被当作当前价", async () => {
    const at = D("Mon 2026-11-09 8:00 AM CST (UTC+08:00)");
    const dirty = mrow("0", "PROMOTION", true, "Sun 2026-11-01 8:00 AM CST (UTC+08:00)", "Sun 2026-11-08 8:00 AM CST (UTC+08:00)");
    const findMany = vi.fn().mockResolvedValue([matrixModel([dirty, CURRENT()])]);
    const [item] = await ladderRepository.getModelsForMatrix({ aiModel: { findMany } } as never, at);
    expect(item.price.priceInput).toBe(Number(CUR_IN));
  });

  it("getNextPriceBoundary：取 at 之后最近的优惠开始/结束时刻", async () => {
    const at = D("2026-11-04T00:00:00Z");
    const findFirst = vi
      .fn()
      .mockResolvedValueOnce({ effectiveFrom: D("2026-11-20T00:00:00Z") }) // 下一个开始
      .mockResolvedValueOnce({ effectiveUntil: D("2026-11-08T00:00:00Z") }); // 下一个结束
    const b = await ladderRepository.getNextPriceBoundary({ modelPrice: { findFirst } } as never, at);
    expect(b).toEqual(D("2026-11-08T00:00:00Z"));
    expect(findFirst.mock.calls[0][0]).toMatchObject({ where: { sourceType: "PROMOTION", effectiveFrom: { gt: at } }, orderBy: { effectiveFrom: "asc" } });
    expect(findFirst.mock.calls[1][0]).toMatchObject({ where: { sourceType: "PROMOTION", effectiveUntil: { gt: at } }, orderBy: { effectiveUntil: "asc" } });
  });

  it("getNextPriceBoundary：无优惠 → null", async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    expect(await ladderRepository.getNextPriceBoundary({ modelPrice: { findFirst } } as never, D("2026-11-04T00:00:00Z"))).toBeNull();
  });

  it("ttlUntilBoundary：对齐边界、上限 3600、下限 1", () => {
    const now = D("2026-11-04T00:00:00Z");
    expect(ttlUntilBoundary(null, now)).toBe(LADDER_CACHE_TTL_SECONDS);
    expect(ttlUntilBoundary(D("2026-11-04T00:10:00.200Z"), now)).toBe(601);
    expect(ttlUntilBoundary(D("2026-11-05T00:00:00Z"), now)).toBe(LADDER_CACHE_TTL_SECONDS);
    expect(ttlUntilBoundary(D("2026-11-03T00:00:00Z"), now)).toBe(1);
  });

  it("getRanking(models)：缓存 TTL 对齐到下一个价格边界；边界查询抛错 → 固定 TTL", async () => {
    const setCalls: number[] = [];
    const cache = { get: vi.fn(async () => null), set: vi.fn(async (_k: string, _v: string, _m: string, ttl: number) => { setCalls.push(ttl); return "OK"; }) };
    const soon = new Date(Date.now() + 120_000);
    const repo = { getModelsForMatrix: vi.fn(async () => []), getStationsForMatrix: vi.fn(async () => []), getNextPriceBoundary: vi.fn(async () => soon) };
    await ladderService.getRanking({ type: "models" }, { repository: repo, cache } as never);
    expect(setCalls[0]).toBeGreaterThan(100);
    expect(setCalls[0]).toBeLessThanOrEqual(120);

    repo.getNextPriceBoundary.mockRejectedValueOnce(new Error("db down"));
    await ladderService.getRanking({ type: "models", limit: 5 }, { repository: repo, cache } as never);
    expect(setCalls[1]).toBe(LADDER_CACHE_TTL_SECONDS);
  });

  it("getRanking(stations)：不查价格边界，TTL 固定", async () => {
    const setCalls: number[] = [];
    const cache = { get: vi.fn(async () => null), set: vi.fn(async (_k: string, _v: string, _m: string, ttl: number) => { setCalls.push(ttl); return "OK"; }) };
    const repo = { getModelsForMatrix: vi.fn(async () => []), getStationsForMatrix: vi.fn(async () => []), getNextPriceBoundary: vi.fn() };
    await ladderService.getRanking({ type: "stations" }, { repository: repo, cache } as never);
    expect(repo.getNextPriceBoundary).not.toHaveBeenCalled();
    expect(setCalls[0]).toBe(LADDER_CACHE_TTL_SECONDS);
  });
});
