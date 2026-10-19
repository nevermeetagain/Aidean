// TASK-060 目录 collector 单测：fixture（2026-10-19 真实响应截取 ≤20 条）→ 观测全部通过契约 schema；
// 关键换算断言；registry ↔ seed 一致性（E9-08）；safeFetch 封顶/非 2xx 抛错；不依赖任何 API Key。
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ProviderModelObservationSchema } from "@aidean/shared";
import { describe, expect, it, vi } from "vitest";
import { aihubmixCollector } from "../aihubmix";
import { openrouterCollector } from "../openrouter";
import { quanzilCollector, quanzilPrices } from "../quanzil";
import { CATALOG_COLLECTORS, getCatalogCollector } from "../registry";
import { collect, fetchCatalogText, normalizeModelId, shiftDecimal, toDecimalString } from "../types";

const fx = (name: string) => JSON.parse(readFileSync(fileURLToPath(new URL(`./fixtures/${name}.json`, import.meta.url)), "utf8"));
const ctx = { fetchedAt: new Date("2026-10-19T04:00:00.000Z") };

describe.each([
  ["openrouter", openrouterCollector],
  ["aihubmix", aihubmixCollector],
  ["quanzil", quanzilCollector],
] as const)("%s collector（fixture）", (name, collector) => {
  const raw = fx(name);
  const obs = collector.normalize(raw, ctx);
  it("每条 fixture 产出 1 条观测，且全部通过 ProviderModelObservationSchema.parse", () => {
    expect(obs.length).toBe(raw.data.length);
    expect(obs.length).toBeGreaterThan(10);
    for (const o of obs) expect(() => ProviderModelObservationSchema.parse(o)).not.toThrow();
  });
  it("sourceKey = 注册键；first/lastSeenAt = fetchedAt；normalizedModelId 小写无 vendor 前缀", () => {
    for (const o of obs) {
      expect(o.sourceKey).toBe(collector.key);
      expect(o.firstSeenAt).toBe(ctx.fetchedAt.toISOString());
      expect(o.normalizedModelId).toBe(o.normalizedModelId.toLowerCase());
      expect(o.normalizedModelId).not.toContain("/");
    }
  });
  it("响应缺 data[] → 抛错（由调度层记 last_error，不静默产出 0 条）", () => {
    expect(() => collector.normalize({ nope: 1 }, ctx)).toThrow();
  });
  it("单条脏数据（无 id）跳过而非整批失败", () => {
    const dirty = { ...raw, data: [{}, null, ...raw.data.slice(0, 1)] };
    expect(collector.normalize(dirty, ctx)).toHaveLength(1);
  });
});

describe("OpenRouter 换算", () => {
  const obs = openrouterCollector.normalize(fx("openrouter"), ctx);
  const by = (id: string) => obs.find((o) => o.externalModelId === id);
  it("openai/gpt-4：prompt=30、completion=60（USD/1M，精确无浮点误差），vendorHint=openai，normalized=gpt-4", () => {
    const g = by("openai/gpt-4")!;
    expect(g).toMatchObject({ priceUnit: "usd_per_1m_tokens", priceInput: "30", priceOutput: "60", vendorHint: "openai", normalizedModelId: "gpt-4" });
  });
  it(":free 模型价格 0 且 normalized 去后缀", () => {
    const f = obs.find((o) => o.externalModelId.endsWith(":free"))!;
    expect(f.priceInput).toBe("0");
    expect(f.normalizedModelId).not.toMatch(/:free$/);
  });
  it("负价（路由器动态价 -1）→ null，不当真实价格", () => {
    const raw = fx("openrouter");
    const neg = raw.data.find((m: { pricing: { prompt: string } }) => m.pricing.prompt.startsWith("-"));
    expect(neg).toBeTruthy();
    expect(by(neg.id)?.priceInput).toBeNull();
  });
  it("input_cache_read 映射为 priceCacheRead", () => {
    const raw = fx("openrouter");
    const m = raw.data.find((x: { pricing: Record<string, string> }) => x.pricing.input_cache_read && !x.pricing.input_cache_read.startsWith("-"));
    expect(by(m.id)?.priceCacheRead).toBe(shiftDecimal(m.pricing.input_cache_read, 6));
  });
});

describe("AIHubMix 映射", () => {
  const raw = fx("aihubmix");
  const obs = aihubmixCollector.normalize(raw, ctx);
  const by = (id: string) => obs.find((o) => o.externalModelId === id)!;
  it("pricing.input/output/cache_read 原样为 USD/1M（gpt-4o-mini-audio-preview 0.15/0.6）", () => {
    expect(by("gpt-4o-mini-audio-preview")).toMatchObject({ priceUnit: "usd_per_1m_tokens", priceInput: "0.15", priceOutput: "0.6", vendorHint: "openai" });
  });
  it("阶梯价只取基础档（gpt-6.1-sol input=2 output=10 cache=0.1）", () => {
    expect(by("gpt-6.1-sol")).toMatchObject({ priceInput: "2", priceOutput: "10", priceCacheRead: "0.1" });
  });
  it("pricing=null（图像按张计价）→ 价格与 priceUnit 全 null，不猜", () => {
    const ids = raw.data.filter((m: { pricing: unknown }) => m.pricing === null).map((m: { model_id: string }) => m.model_id);
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) expect(by(id)).toMatchObject({ priceUnit: null, priceInput: null, priceOutput: null });
  });
  it("retired_at 存在 → isListed=false 且 delistedAt=fetchedAt；无则在列", () => {
    for (const m of raw.data as { model_id: string; retired_at?: string | null; retire_stage?: string }[]) {
      const retired = m.retire_stage === "retired" || !!m.retired_at;
      expect(by(m.model_id).isListed).toBe(!retired);
    }
  });
  it("缺 vendor 字段 → vendorHint=null（不用 developer_id 数字猜）", () => {
    const m = raw.data.find((x: { vendor?: string }) => !x.vendor);
    expect(by(m.model_id).vendorHint).toBeNull();
  });
});

describe("Quanzil 倍率换算（参照 QuanzilAdapter 口径）", () => {
  it("按量：ratio=5、completion=5、cache=0.1 → 10 / 50 / 1 USD/1M", () => {
    expect(quanzilPrices({ quota_type: 0, model_ratio: 5, completion_ratio: 5, cache_ratio: 0.1 })).toEqual({
      priceUnit: "usd_per_1m_tokens",
      priceInput: "10",
      priceOutput: "50",
      priceCacheRead: "1",
    });
  });
  it("按次：model_price=0.12 → usd_per_request，输出 null", () => {
    expect(quanzilPrices({ quota_type: 1, model_price: 0.12 })).toEqual({ priceUnit: "usd_per_request", priceInput: "0.12", priceOutput: null, priceCacheRead: null });
  });
  it("倍率缺失/负数 → 全 null；completion 缺省按 1", () => {
    expect(quanzilPrices({ quota_type: 0 })).toMatchObject({ priceUnit: null, priceInput: null });
    expect(quanzilPrices({ quota_type: 0, model_ratio: -1 })).toMatchObject({ priceInput: null });
    expect(quanzilPrices({ quota_type: 0, model_ratio: 0.25 })).toMatchObject({ priceInput: "0.5", priceOutput: "0.5" });
  });
  it("fixture：vendor_id 查表得 vendorHint；浮点积按 6 位小数", () => {
    const raw = fx("quanzil");
    const obs = quanzilCollector.normalize(raw, ctx);
    const vend = new Map(raw.vendors.map((v: { id: number; name: string }) => [v.id, v.name]));
    obs.forEach((o, i) => {
      expect(o.vendorHint).toBe(vend.get(raw.data[i].vendor_id) ?? null);
      if (o.priceInput) expect(o.priceInput).toMatch(/^\d+(\.\d{1,6})?$/);
    });
    expect(obs.some((o) => o.priceUnit === "usd_per_request")).toBe(true);
  });
});

describe("归一工具（DESIGN-004 §4）", () => {
  it.each([
    ["openai/GPT-4o", "gpt-4o"],
    ["meta-llama/llama-3.3-70b-instruct:free", "llama-3.3-70b-instruct"],
    ["deepseek/deepseek-r1:thinking:free", "deepseek-r1"],
    ["Claude Opus 5", "claude-opus-5"],
    ["gpt-6-astra", "gpt-6-astra"],
  ])("normalizeModelId(%j) = %j", (a, b) => expect(normalizeModelId(a)).toBe(b));
  it("shiftDecimal 精确：0.00003→30、0.0000001→0.1、'0'→0、-1/abc/1e-7 → null", () => {
    expect(shiftDecimal("0.00003", 6)).toBe("30");
    expect(shiftDecimal("0.0000001", 6)).toBe("0.1");
    expect(shiftDecimal("0", 6)).toBe("0");
    expect(shiftDecimal("-1", 6)).toBeNull();
    expect(shiftDecimal("abc", 6)).toBeNull();
    expect(shiftDecimal(1e-7, 6)).toBe("0.1");
  });
  it("toDecimalString：6 位小数、去尾 0、负/非有限 → null", () => {
    expect(toDecimalString(0.30000000000000004)).toBe("0.3");
    expect(toDecimalString(10)).toBe("10");
    expect(toDecimalString(-1)).toBeNull();
    expect(toDecimalString(Number.NaN)).toBeNull();
  });
});

describe("registry ↔ seed 一致性（E9-08）", () => {
  const seed = readFileSync(fileURLToPath(new URL("../../../../prisma/seed.ts", import.meta.url)), "utf8");
  const block = seed.slice(seed.indexOf("const monitoringSourcesData"), seed.indexOf("] as const", seed.indexOf("const monitoringSourcesData")));
  const rows = [...block.matchAll(/key: '([^']+)'.*?endpoint: '([^']+)'.*?enabled: (true|false)/g)].map((m) => ({ key: m[1], endpoint: m[2], enabled: m[3] === "true" }));
  it("seed 解析出 5 源", () => expect(rows.map((r) => r.key).sort()).toEqual(["aihubmix", "huggingface", "llmtest", "openrouter", "quanzil"]));
  it("registry 键 ⊆ seed 键，且 defaultEndpoint 与 seed endpoint 一致", () => {
    for (const [k, c] of Object.entries(CATALOG_COLLECTORS)) {
      const r = rows.find((x) => x.key === k);
      expect(r, `registry ${k} 未在 seed 登记`).toBeTruthy();
      expect(c.defaultEndpoint).toBe(r!.endpoint);
      expect(c.key).toBe(k);
    }
  });
  it("seed 中 enabled=true 的源 ⊆ registry（调度不空跑）", () => {
    for (const r of rows.filter((x) => x.enabled)) expect(getCatalogCollector(r.key), r.key).toBeTruthy();
    expect(getCatalogCollector("toString")).toBeUndefined();
  });
});

describe("fetchCatalogText / collect（注入 fetch，不外连）", () => {
  const ok = (body: string, status = 200) => vi.fn().mockResolvedValue(new Response(body, { status, headers: { "content-type": "application/json" } }));
  it("2xx：返回文本与字节数；collect 解析并归一", async () => {
    const body = JSON.stringify({ data: [{ id: "openai/gpt-4", pricing: { prompt: "0.00003", completion: "0.00006" } }] });
    const fetchImpl = ok(body);
    const r = await collect(openrouterCollector, undefined, { fetchImpl, now: ctx.fetchedAt });
    expect(fetchImpl.mock.calls[0][0]).toBe(openrouterCollector.defaultEndpoint);
    expect(r.fetch.bytes).toBe(Buffer.byteLength(body));
    expect(r.observations[0].priceInput).toBe("30");
  });
  it("非 2xx → 抛错", async () => {
    await expect(fetchCatalogText("https://example.com/x", { fetchImpl: ok("{}", 503) })).rejects.toThrow(/503/);
  });
  it("超出封顶 → 抛错（ResponseTooLargeError）", async () => {
    await expect(fetchCatalogText("https://example.com/x", { fetchImpl: ok("x".repeat(2048)), maxBytes: 1024 })).rejects.toThrow();
  });
});
