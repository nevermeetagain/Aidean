/**
 * TASK-066：GET /api/v1/models/[id]/offerings 路由 + buildOfferings 单测。
 * 覆盖：20001、无观测空数组、relay identityVerified=false、同源多 external 去重（在架优先/最新）、forbidden/已删源不出、
 *       署名、排序（在架→tier）、非法价格置 null、契约 parse、Redis 读穿/回写（600s）、slug 与 normalizeModelId 并集查询。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ModelOfferingsResponse } from "@aidean/shared";

const prismaState = vi.hoisted(() => ({
  aiModel: { findFirst: vi.fn() },
  providerModelObservation: { findMany: vi.fn() },
}));
const redisState = vi.hoisted(() => ({ client: null as null | { get: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn> } }));
vi.mock("../../db/prisma", () => ({ prisma: prismaState }));
vi.mock("../../db/redis", () => ({ getRedis: () => redisState.client }));

import { buildOfferings, offeringKeys, type ObservationRow } from "../offerings";

const route = await import("../../../app/api/v1/models/[id]/offerings/route");
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const req = () => new Request("http://localhost/api/v1/models/x/offerings");
const dec = (s: string) => ({ toString: () => s });

function src(over: Partial<ObservationRow["source"]> = {}): ObservationRow["source"] {
  return { key: "openrouter", label: "OpenRouter", tier: "S2", kind: "aggregator", endpoint: "https://openrouter.ai/api/v1/models", docsUrl: "https://openrouter.ai/models", tosStatus: "allowed", deletedAt: null, ...over };
}
function obs(over: Partial<ObservationRow> = {}): ObservationRow {
  return {
    externalModelId: "openai/gpt-4o",
    isListed: true,
    priceUnit: "usd_per_1m_tokens",
    priceInput: dec("2.5"),
    priceOutput: dec("10"),
    firstSeenAt: new Date("2026-10-01T00:00:00Z"),
    lastSeenAt: new Date("2026-10-19T00:00:00Z"),
    source: src(),
    ...over,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  redisState.client = null;
});

describe("buildOfferings", () => {
  it("relay 源 identityVerified=false，其余 true；契约 parse 通过", () => {
    const out = buildOfferings([obs(), obs({ source: src({ key: "quanzil", label: "Quanzil", tier: "C", kind: "relay", docsUrl: null, endpoint: "https://quanzil.com/api/pricing" }) })]);
    expect(ModelOfferingsResponse.safeParse(out).success).toBe(true);
    expect(out.items.find((i) => i.sourceKey === "quanzil")?.identityVerified).toBe(false);
    expect(out.items.find((i) => i.sourceKey === "openrouter")?.identityVerified).toBe(true);
    expect(out.items.find((i) => i.sourceKey === "quanzil")?.sourceUrl).toBe("https://quanzil.com/api/pricing");
  });

  it("同源多个 external 归一到同一模型：在架优先 → 主变体优先（:nitro 等后缀变体即使更新也让位）", () => {
    const out = buildOfferings([
      obs({ externalModelId: "openai/gpt-4o:extended", isListed: false, lastSeenAt: new Date("2026-10-20T00:00:00Z") }),
      obs({ externalModelId: "openai/gpt-4o", isListed: true, lastSeenAt: new Date("2026-10-18T00:00:00Z"), priceInput: dec("2.5") }),
      obs({ externalModelId: "openai/gpt-4o:nitro", isListed: true, lastSeenAt: new Date("2026-10-19T00:00:00Z"), priceInput: dec("3") }),
    ]);
    expect(out.items).toHaveLength(1);
    expect(out.items[0]).toMatchObject({ isListed: true, priceInput: "2.5" });
  });

  it("同源 x 与 x:free 同时在架、同一 lastSeenAt：确定性取主变体（不让 :free 冒充该源价格），与输入顺序无关", () => {
    const t = new Date("2026-10-19T00:00:00Z");
    const main = obs({ externalModelId: "openai/gpt-4o", lastSeenAt: t, priceInput: dec("2.5") });
    const free = obs({ externalModelId: "openai/gpt-4o:free", lastSeenAt: t, priceInput: dec("0"), priceOutput: dec("0") });
    expect(buildOfferings([free, main]).items[0].priceInput).toBe("2.5");
    expect(buildOfferings([main, free]).items[0].priceInput).toBe("2.5");
  });

  it("缓存命中但形状不合契约 → 按 MISS 重算", async () => {
    const store = new Map<string, string>([["cache:model-offerings:m1", JSON.stringify({ items: [{ bogus: 1 }] })]]);
    redisState.client = { get: vi.fn(async (k: string) => store.get(k) ?? null), set: vi.fn(async () => "OK") };
    prismaState.aiModel.findFirst.mockResolvedValueOnce({ id: "m1", modelCode: "gpt-4o", slug: "gpt-4o" });
    prismaState.providerModelObservation.findMany.mockResolvedValueOnce([obs()]);
    const res = await route.GET(req(), ctx("gpt-4o"));
    expect((await res.json()).data.items).toHaveLength(1);
    expect(prismaState.providerModelObservation.findMany).toHaveBeenCalledTimes(1);
  });

  it("pending（未核验）/ forbidden / 已删除源均不出；attribution_required 带署名", () => {
    const out = buildOfferings([
      obs({ source: src({ key: "pend", tosStatus: "pending" }) }),
      obs({ source: src({ key: "bad", tosStatus: "forbidden" }) }),
      obs({ source: src({ key: "gone", deletedAt: new Date() }) }),
      obs({ source: src({ key: "aa", label: "Artificial Analysis", tier: "A", kind: "benchmark", tosStatus: "attribution_required" }) }),
    ]);
    expect(out.items.map((i) => i.sourceKey)).toEqual(["aa"]);
    expect(out.items[0].attribution).toBe("Artificial Analysis");
  });

  it("排序：在架优先，再按 tier S1>S2>A>B>C", () => {
    const out = buildOfferings([
      obs({ source: src({ key: "c", label: "C源", tier: "C" }) }),
      obs({ isListed: false, source: src({ key: "s1off", label: "官方", tier: "S1", kind: "official" }) }),
      obs({ source: src({ key: "a", label: "A源", tier: "A" }) }),
    ]);
    expect(out.items.map((i) => i.sourceKey)).toEqual(["a", "c", "s1off"]);
  });

  it("非法价格（负数/科学计数）置 null，单位缺省 null；无可用 URL 的源丢弃", () => {
    const out = buildOfferings([
      obs({ priceInput: dec("-1"), priceOutput: dec("1e-7"), priceUnit: null }),
      obs({ source: src({ key: "nourl", docsUrl: null, endpoint: "not a url" }) }),
    ]);
    expect(out.items).toHaveLength(1);
    expect(out.items[0]).toMatchObject({ priceInput: null, priceOutput: null, priceUnit: null });
  });

  it("offeringKeys：modelCode 与 slug 的归一并集（去重）", () => {
    expect(offeringKeys({ modelCode: "GPT-4o", slug: "gpt-4o" })).toEqual(["gpt-4o"]);
    expect(offeringKeys({ modelCode: "openai/gpt-4o-mini:free", slug: "gpt4o-mini" })).toEqual(["gpt-4o-mini", "gpt4o-mini"]);
  });
});

describe("GET /api/v1/models/[id]/offerings", () => {
  it("模型不存在 → 20001（HTTP 映射以 shared errors 为准），不查观测", async () => {
    prismaState.aiModel.findFirst.mockResolvedValueOnce(null);
    const res = await route.GET(req(), ctx("nope"));
    expect(res.status).toBe(400); // ERROR_HTTP_STATUS[20001]=400（项目既有口径）
    expect((await res.json()).code).toBe(20001);
    expect(prismaState.providerModelObservation.findMany).not.toHaveBeenCalled();
  });

  it("无观测 → { items: [] }；查询用归一键集合且排除已删源", async () => {
    prismaState.aiModel.findFirst.mockResolvedValueOnce({ id: "m1", modelCode: "openai/gpt-4o", slug: "gpt-4o" });
    prismaState.providerModelObservation.findMany.mockResolvedValueOnce([]);
    const res = await route.GET(req(), ctx("gpt-4o"));
    expect(res.status).toBe(200);
    expect((await res.json()).data).toEqual({ items: [] });
    const arg = prismaState.providerModelObservation.findMany.mock.calls[0][0] as { where: Record<string, unknown> };
    expect(arg.where).toEqual({ normalizedModelId: { in: ["gpt-4o"] }, source: { deletedAt: null, tosStatus: { in: ["allowed", "attribution_required"] } } });
  });

  it("有观测 → 契约形状；Redis 可用时回写 600s，二次请求命中缓存不查库", async () => {
    const store = new Map<string, string>();
    redisState.client = {
      get: vi.fn(async (k: string) => store.get(k) ?? null),
      set: vi.fn(async (k: string, v: string, _m: string, ttl: number) => {
        expect(ttl).toBe(600);
        store.set(k, v);
        return "OK";
      }),
    };
    prismaState.aiModel.findFirst.mockResolvedValue({ id: "m1", modelCode: "gpt-4o", slug: "gpt-4o" });
    prismaState.providerModelObservation.findMany.mockResolvedValueOnce([obs()]);

    const first = await (await route.GET(req(), ctx("gpt-4o"))).json();
    expect(ModelOfferingsResponse.safeParse(first.data).success).toBe(true);
    expect(store.has("cache:model-offerings:m1")).toBe(true);

    const second = await (await route.GET(req(), ctx("m1"))).json();
    expect(second.data).toEqual(first.data);
    expect(prismaState.providerModelObservation.findMany).toHaveBeenCalledTimes(1);
  });

  it("Redis 读取抛错 → 静默直查", async () => {
    redisState.client = { get: vi.fn(async () => { throw new Error("down"); }), set: vi.fn(async () => { throw new Error("down"); }) };
    prismaState.aiModel.findFirst.mockResolvedValueOnce({ id: "m1", modelCode: "gpt-4o", slug: "gpt-4o" });
    prismaState.providerModelObservation.findMany.mockResolvedValueOnce([obs()]);
    const res = await route.GET(req(), ctx("gpt-4o"));
    expect(res.status).toBe(200);
    expect((await res.json()).data.items).toHaveLength(1);
  });
});
