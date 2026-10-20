/**
 * TASK-061 · detect(prev, curr, ctx) 纯函数单测（DESIGN-004 §5；契约 CatalogChangeEventSchema）
 *
 * 覆盖卡面验收：① 4 类事件；② 阈值边界 0.99%/1%；③ 单位不同不比较；
 * ④ 同快照多 external 归一到同一 normalized → 按 (snapshotId, normalizedModelId, kind) 合并为一条，
 *    证据列全部 external id，整批不撞唯一键（E9-18 OpenRouter 95 组范式）。
 * 全部事件均须 CatalogChangeEventSchema.parse 通过。
 */
import { describe, it, expect } from "vitest";
import { CatalogChangeEventSchema } from "@aidean/shared";

import { detect, type ObsIn, type DetectContext } from "../detect";

const SNAP = "11111111-1111-4111-8111-111111111111";
const SRC_URL = "https://openrouter.ai/api/v1/models?output_modalities=all";
const AT = new Date("2026-10-20T00:00:00Z");

/** 确定性 uuid 生成器（version=4 / variant=8，过 z.string().uuid()） */
const makeIds = () => {
  let n = 0;
  return () => `22222222-2222-4222-8222-${String(++n).padStart(12, "0")}`;
};

/** 观测最小形状（缺省即“在列、无价、lastSeen=AT”，normalized 默认取 external） */
const obs = (over: Partial<ObsIn> & { externalModelId: string }): ObsIn => ({
  normalizedModelId: over.externalModelId,
  isListed: true,
  priceUnit: null,
  priceInput: null,
  priceOutput: null,
  lastSeenAt: AT,
  ...over,
});

const CTX = (over: Partial<DetectContext> = {}): DetectContext => ({
  sourceKey: "openrouter",
  snapshotId: SNAP,
  sourceUrl: SRC_URL,
  detectedAt: AT,
  seenNormalizedBefore: new Set<string>(),
  idFactory: makeIds(),
  ...over,
});

describe("detect（TASK-061）", () => {
  it("① listed：本次在列、上次缺席", () => {
    const curr = [obs({ externalModelId: "openai/gpt-4o", normalizedModelId: "gpt-4o" })];
    const ev = detect([], curr, CTX({ seenNormalizedBefore: new Set(["gpt-4o"]) }));
    expect(ev).toHaveLength(1);
    expect(ev[0].event.kind).toBe("listed");
    expect(ev[0].event.externalModelId).toBe("openai/gpt-4o");
    expect(() => CatalogChangeEventSchema.parse(ev[0].event)).not.toThrow();
  });

  it("① delisted：上次在列、本次缺席", () => {
    const prev = [obs({ externalModelId: "openai/gpt-4o", normalizedModelId: "gpt-4o" })];
    const ev = detect(prev, [], CTX({ seenNormalizedBefore: new Set(["gpt-4o"]) }));
    expect(ev).toHaveLength(1);
    expect(ev[0].event.kind).toBe("delisted");
    expect(ev[0].event.externalModelId).toBe("openai/gpt-4o");
  });

  it("① model_first_seen：prev 已列但全目录首见 → 只产首见（不重复产 listed）", () => {
    const row = obs({ externalModelId: "openai/gpt-4o", normalizedModelId: "gpt-4o" });
    const ev = detect([row], [row], CTX({ seenNormalizedBefore: new Set() }));
    expect(ev.map((e) => e.event.kind)).toEqual(["model_first_seen"]);
    expect(CatalogChangeEventSchema.safeParse(ev[0].event).success).toBe(true);
  });

  it("全新模型：prev 空且全局未见 → 同时产 listed 与 model_first_seen（各一条）", () => {
    const curr = [obs({ externalModelId: "vendor/new-model", normalizedModelId: "new-model" })];
    const ev = detect([], curr, CTX({ seenNormalizedBefore: new Set() }));
    expect(ev.map((e) => e.event.kind).sort()).toEqual(["listed", "model_first_seen"]);
  });

  it("② price_changed：输入 +1%（=阈值）越界，产出前后价与 deltaPct", () => {
    const prev = [obs({ externalModelId: "g", normalizedModelId: "g", priceUnit: "usd_per_1m_tokens", priceInput: "100", priceOutput: "300" })];
    const curr = [obs({ externalModelId: "g", normalizedModelId: "g", priceUnit: "usd_per_1m_tokens", priceInput: "101", priceOutput: "300" })];
    const ev = detect(prev, curr, CTX({ seenNormalizedBefore: new Set(["g"]) }));
    expect(ev).toHaveLength(1);
    const e = ev[0].event;
    expect(e.kind).toBe("price_changed");
    if (e.kind === "price_changed") {
      expect(e.deltaPct).toBe(1);
      expect(e.priceUnit).toBe("usd_per_1m_tokens");
      expect(e.before).toEqual({ input: "100", output: "300" });
      expect(e.after).toEqual({ input: "101", output: "300" });
    }
    expect(() => CatalogChangeEventSchema.parse(e)).not.toThrow();
  });

  it("② 阈值边界 0.99%（<1%）→ 不产任何事件", () => {
    const prev = [obs({ externalModelId: "g", normalizedModelId: "g", priceUnit: "usd_per_1m_tokens", priceInput: "10000", priceOutput: "0" })];
    const curr = [obs({ externalModelId: "g", normalizedModelId: "g", priceUnit: "usd_per_1m_tokens", priceInput: "10099", priceOutput: "0" })];
    const ev = detect(prev, curr, CTX({ seenNormalizedBefore: new Set(["g"]) }));
    expect(ev.filter((e) => e.event.kind === "price_changed")).toHaveLength(0);
    expect(ev).toHaveLength(0);
  });

  it("② 阈值边界恰好 1%（10000→10100）→ 产 price_changed", () => {
    const prev = [obs({ externalModelId: "g", normalizedModelId: "g", priceUnit: "usd_per_1m_tokens", priceInput: "10000" })];
    const curr = [obs({ externalModelId: "g", normalizedModelId: "g", priceUnit: "usd_per_1m_tokens", priceInput: "10100" })];
    const ev = detect(prev, curr, CTX({ seenNormalizedBefore: new Set(["g"]) }));
    expect(ev.filter((e) => e.event.kind === "price_changed")).toHaveLength(1);
  });

  it("③ 单位不同不比较：usd→cny 且数值巨变更，也不产 price_changed", () => {
    const prev = [obs({ externalModelId: "g", normalizedModelId: "g", priceUnit: "usd_per_1m_tokens", priceInput: "100" })];
    const curr = [obs({ externalModelId: "g", normalizedModelId: "g", priceUnit: "cny_per_1m_tokens", priceInput: "720" })];
    const ev = detect(prev, curr, CTX({ seenNormalizedBefore: new Set(["g"]) }));
    expect(ev.filter((e) => e.event.kind === "price_changed")).toHaveLength(0);
    expect(ev).toHaveLength(0);
  });

  it("④ 归一合并：两 external → 同一 normalized → listed/first_seen 各仅一条，证据列全部 external id，唯一键不撞", () => {
    const curr = [
      obs({ externalModelId: "openai/gpt-4o", normalizedModelId: "gpt-4o" }),
      obs({ externalModelId: "openai/gpt-4o:free", normalizedModelId: "gpt-4o", priceUnit: "usd_per_1m_tokens", priceInput: "0", priceOutput: "0" }),
    ];
    const ev = detect([], curr, CTX({ seenNormalizedBefore: new Set() }));
    const listed = ev.filter((e) => e.event.kind === "listed");
    const first = ev.filter((e) => e.event.kind === "model_first_seen");
    expect(listed).toHaveLength(1);
    expect(first).toHaveLength(1);
    expect(listed[0].mergedExternalModelIds).toEqual(["openai/gpt-4o", "openai/gpt-4o:free"]);
    expect(listed[0].event.externalModelId).toBe("openai/gpt-4o"); // 主变体优先作代表
    // 落库唯一键 (snapshotId, normalizedModelId, kind) 全批唯一 → 不撞
    const keys = ev.map((e) => `${e.event.snapshotId}|${e.event.normalizedModelId}|${e.event.kind}`);
    expect(new Set(keys).size).toBe(keys.length);
    // 每条事件均可 parse
    expect(ev.every((e) => CatalogChangeEventSchema.safeParse(e.event).success)).toBe(true);
  });

  it("④ price_changed 也归一为一条：代表取越阈成员，证据仍列全部 external id（含未变动者）", () => {
    const prev = [
      obs({ externalModelId: "m/aa", normalizedModelId: "aa", priceUnit: "usd_per_1m_tokens", priceInput: "100" }),
      obs({ externalModelId: "m/aa:free", normalizedModelId: "aa", priceUnit: "usd_per_1m_tokens", priceInput: "0" }),
    ];
    const curr = [
      obs({ externalModelId: "m/aa", normalizedModelId: "aa", priceUnit: "usd_per_1m_tokens", priceInput: "101" }),
      obs({ externalModelId: "m/aa:free", normalizedModelId: "aa", priceUnit: "usd_per_1m_tokens", priceInput: "0" }),
    ];
    const ev = detect(prev, curr, CTX({ seenNormalizedBefore: new Set(["aa"]) }));
    const price = ev.filter((e) => e.event.kind === "price_changed");
    expect(price).toHaveLength(1);
    expect(price[0].event.externalModelId).toBe("m/aa");
    if (price[0].event.kind === "price_changed") expect(price[0].event.deltaPct).toBe(1);
    expect(price[0].mergedExternalModelIds).toEqual(["m/aa", "m/aa:free"]);
  });

  it("idFactory 注入确定性 id：同批事件 id 互异且为合法 uuid", () => {
    const curr = [
      obs({ externalModelId: "a/one", normalizedModelId: "one" }),
      obs({ externalModelId: "a/two", normalizedModelId: "two" }),
    ];
    const ev = detect([], curr, CTX({ seenNormalizedBefore: new Set(["one", "two"]), idFactory: makeIds() }));
    const ids = ev.map((e) => e.event.id);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    expect(ids[0]).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it("空快照：prev/curr 皆空 → 无事件", () => {
    expect(detect([], [], CTX())).toHaveLength(0);
  });
});
