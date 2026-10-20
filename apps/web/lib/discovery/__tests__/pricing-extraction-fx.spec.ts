/**
 * TASK-069 · 发现引擎汇率统一：pricing-extraction 不再硬编码汇率，改读当日汇率快照（getDailyFx）。
 * 覆盖：toMinorCny fx=5 / fx=7.2 两组、缺汇率 fail-closed；extractPricing 注入 fx / 缺 fx 跳过 USD 不写库；
 * 批量只读一次快照；仅 CNY 价时不读快照。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const priceRuleCreate = vi.fn();
const evidenceCreate = vi.fn();
vi.mock("../../db/prisma", () => ({
  prisma: {
    priceRule: { create: (...a: unknown[]) => priceRuleCreate(...a) },
    evidenceChain: { create: (...a: unknown[]) => evidenceCreate(...a) },
  },
}));

const getDailyFxMock = vi.fn();
vi.mock("../../features/pricing/fx", () => ({
  getDailyFx: (...a: unknown[]) => getDailyFxMock(...a),
}));

import { PriceNormalizationError } from "@aidean/shared";

import { extractPricing, extractPricingBatch, toMinorCny } from "../pricing-extraction";

const FX5 = { date: "2026-10-20", usdCny: "5" };
const FX72 = { date: "2026-10-20", usdCny: "7.2" };
const PUBLIC_IP = "http://93.184.216.34";

/** /pricing 返回给定 HTML，其余路径 404 */
function stubSite(html: string) {
  const fetchMock = vi.fn(async (url: string | URL) => {
    const u = String(url);
    if (new URL(u).pathname === "/pricing") return new Response(html, { status: 200, headers: { "content-type": "text/html" } });
    return new Response("not found", { status: 404 });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => {
  priceRuleCreate.mockReset().mockResolvedValue({});
  evidenceCreate.mockReset().mockResolvedValue({});
  getDailyFxMock.mockReset();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("toMinorCny（CNY 分 / 每百万 Token）", () => {
  it("fx=5：$2/M → 1000 分；$0.002/1k → 1000 分", () => {
    expect(toMinorCny("2", "USD", "per_million_tokens", FX5)).toBe(1000n);
    expect(toMinorCny("0.002", "USD", "per_1k_tokens", FX5)).toBe(1000n);
  });

  it("fx=7.2：$2/M → 1440 分；$2.5/M → 1800 分；半入 $0.0001/M → 0 分、$0.0007/M → 1 分", () => {
    expect(toMinorCny("2", "USD", "per_million_tokens", FX72)).toBe(1440n);
    expect(toMinorCny("2.5", "USD", "per_million_tokens", FX72)).toBe(1800n);
    expect(toMinorCny("0.0001", "USD", "per_million_tokens", FX72)).toBe(0n); // 0.072 分
    expect(toMinorCny("0.0007", "USD", "per_million_tokens", FX72)).toBe(1n); // 0.504 分 → 1
  });

  it("汇率不同结果不同（证明无硬编码汇率）", () => {
    expect(toMinorCny("3", "USD", "per_million_tokens", FX5)).toBe(1500n);
    expect(toMinorCny("3", "USD", "per_million_tokens", FX72)).toBe(2160n);
    expect(toMinorCny("3", "USD", "per_million_tokens", { date: "2026-10-20", usdCny: "6.6761" })).toBe(2003n);
  });

  it("CNY 价无需汇率：¥12.5/M → 1250 分", () => {
    expect(toMinorCny("12.5", "CNY", "per_million_tokens", null)).toBe(1250n);
  });

  it("缺汇率：USD 价抛 PriceNormalizationError(fx_missing)，不回退固定汇率", () => {
    let err: unknown;
    try {
      toMinorCny("2", "USD", "per_million_tokens", null);
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(PriceNormalizationError);
    expect((err as PriceNormalizationError).reason).toBe("fx_missing");
  });

  it("容忍解析残留的尾点：'3.' 视为 3", () => {
    expect(toMinorCny("3.", "USD", "per_million_tokens", FX5)).toBe(1500n);
  });
});

describe("extractPricing 汇率注入与 fail-closed", () => {
  const HTML = "<p>GPT: $2 / 1M tokens</p><p>国产：¥10 / 百万 tokens</p>";

  it("注入 fx=5：USD 与 CNY 两条均写入，USD 按 fx 折算", async () => {
    stubSite(HTML);
    const fxProvider = vi.fn(async () => FX5);
    const res = await extractPricing("cand-fx5", undefined, PUBLIC_IP, { fxProvider });
    expect(res.map((r) => r.inputPriceMinor)).toEqual([1000n, 1000n]);
    expect(priceRuleCreate).toHaveBeenCalledTimes(2);
    expect(fxProvider).toHaveBeenCalledTimes(1);
  });

  it("注入 fx=7.2：USD 条目 1440 分", async () => {
    stubSite(HTML);
    const res = await extractPricing("cand-fx72", undefined, PUBLIC_IP, { fxProvider: async () => FX72 });
    expect(res.map((r) => r.inputPriceMinor)).toEqual([1440n, 1000n]);
  });

  it("缺汇率：跳过 USD 条目不写库，CNY 条目照常写入", async () => {
    stubSite(HTML);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const res = await extractPricing("cand-nofx", undefined, PUBLIC_IP, { fxProvider: async () => null });
    expect(res).toHaveLength(1);
    expect(res[0].inputPriceMinor).toBe(1000n);
    expect(priceRuleCreate).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("跳过 1 条 USD"));
  });

  it("仅 CNY 价时不读汇率快照", async () => {
    stubSite("<p>¥8 / 百万 tokens</p>");
    const fxProvider = vi.fn(async () => FX5);
    const res = await extractPricing("cand-cny", undefined, PUBLIC_IP, { fxProvider });
    expect(res.map((r) => r.inputPriceMinor)).toEqual([800n]);
    expect(fxProvider).not.toHaveBeenCalled();
  });

  it("缺省读 getDailyFx；快照读取异常按缺汇率处理（fail-closed，不抛）", async () => {
    stubSite("<p>$2 / 1M tokens</p>");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    getDailyFxMock.mockRejectedValueOnce(new Error("db down"));
    const res = await extractPricing("cand-dberr", undefined, PUBLIC_IP);
    expect(res).toEqual([]);
    expect(priceRuleCreate).not.toHaveBeenCalled();
    expect(getDailyFxMock).toHaveBeenCalledTimes(1);
  });
});

describe("extractPricingBatch", () => {
  it("同一批次只读一次当日快照，全部候选用同一汇率", async () => {
    stubSite("<p>$1 / 1M tokens</p>");
    getDailyFxMock.mockResolvedValue({ ...FX72, stale: false, forDate: "2026-10-20" });
    const r = await extractPricingBatch([
      { id: "c1", apiBase: PUBLIC_IP },
      { id: "c2", apiBase: PUBLIC_IP },
    ]);
    expect(r).toEqual({ processed: 2, rulesExtracted: 2 });
    expect(getDailyFxMock).toHaveBeenCalledTimes(1);
    const minors = priceRuleCreate.mock.calls.map((c) => (c[0] as { data: { inputPriceMinor: bigint } }).data.inputPriceMinor);
    expect(minors).toEqual([720n, 720n]);
  });
});
