// TASK-070 公开定价页 collector 单测：fixture（2026-10-20 公开页价格表节选）→ 观测全部通过契约 schema；
// fetch 由调用方注入（单测不联网）；解析 0 条/结构变化 → ok:false；缺缓存价/上下文 → null 而非 0。
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ProviderModelObservationSchema } from "@aidean/shared";
import { describe, expect, it } from "vitest";
import { deepseekPricingCollector, parseDeepseekPricing } from "../deepseek";
import { siliconflowPricingCollector, parseSiliconflowPricing } from "../siliconflow";
import { collectPublicPricing } from "../types";

const fx = (name: string) => readFileSync(fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url)), "utf8");
const at = new Date("2026-10-20T04:00:00.000Z");

describe("SiliconFlow 公开定价页（TASK-070）", () => {
  const parsed = parseSiliconflowPricing(fx("siliconflow-pricing.html"), at);
  const obs = parsed.ok ? parsed.observations : [];
  const by = (id: string) => obs.find((o) => o.externalModelId === id);

  it("正常解析：9 个 CNY/百万 Token 模型，全部通过 ProviderModelObservationSchema.parse", () => {
    expect(parsed.ok).toBe(true);
    expect(obs).toHaveLength(9);
    for (const o of obs) {
      expect(() => ProviderModelObservationSchema.parse(o)).not.toThrow();
      expect(o.sourceKey).toBe("siliconflow-pricing");
      expect(o.priceUnit).toBe("cny_per_1m_tokens");
      expect(o.firstSeenAt).toBe(at.toISOString());
      expect(o.lastSeenAt).toBe(at.toISOString());
    }
  });

  it("分时段多价取高峰/标准档上限（与页面顺序无关）：V4.1-Flash 2/8/0.04，V4-Flash 3/9/0.3", () => {
    expect(by("deepseek-ai/DeepSeek-V4.1-Flash")).toMatchObject({
      priceInput: "2",
      priceOutput: "8",
      priceCacheRead: "0.04",
      vendorHint: "deepseek-ai",
      normalizedModelId: "deepseek-v4.1-flash",
    });
    expect(by("deepseek-ai/DeepSeek-V4-Flash")).toMatchObject({
      priceInput: "3",
      priceOutput: "9",
      priceCacheRead: "0.3",
    });
  });

  it("缺缓存价/上下文 → null 而非 0（GLM-4.5V；长上下文档取上限 2/16）", () => {
    const glm = by("zai-org/GLM-4.5V");
    expect(glm?.priceCacheRead).toBeNull();
    expect(glm?.contextLength).toBeNull();
    expect(by("Qwen/Qwen3.5-122B-A10B")).toMatchObject({
      priceInput: "2",
      priceOutput: "16",
      priceCacheRead: null,
    });
  });

  it("免费/非 token 计价行跳过，生图段不进入对话观测", () => {
    const ids = obs.map((o) => o.externalModelId);
    expect(ids).not.toContain("tencent/Hunyuan-MT-7B");
    expect(ids).not.toContain("BAAI/bge-m3");
    expect(ids).not.toContain("Tongyi-MAI/Z-Image-Turbo");
  });

  it("页面结构变化（无价格行/无对话模型段）→ ok:false，不以空列表冒充成功", () => {
    const noRows = parseSiliconflowPricing("<h2>对话模型</h2><p>价格调整中，请稍后再试</p><h2>生图模型</h2>", at);
    expect(noRows.ok).toBe(false);
    if (!noRows.ok) expect(noRows.reason).toMatch(/结构变化|未找到|未解析出/);

    const noSection = parseSiliconflowPricing("<html><body><h1>维护中</h1></body></html>", at);
    expect(noSection.ok).toBe(false);
  });

  it("命中登录/反爬标记 → 该源停止（ok:false），不产出观测", () => {
    const blocked = parseSiliconflowPricing("<h2>对话模型</h2><p>请先登录后查看价格</p>", at);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.reason).toContain("blocked_or_login_required");
  });
});

describe("DeepSeek 公开定价文档（TASK-070）", () => {
  const parsed = parseDeepseekPricing(fx("deepseek-pricing.html"), at);
  const obs = parsed.ok ? parsed.observations : [];
  const by = (id: string) => obs.find((o) => o.externalModelId === id);

  it("正常解析：2 个模型，CNY/百万 Token；缓存命中 → priceCacheRead，高峰档上限", () => {
    expect(parsed.ok).toBe(true);
    expect(obs).toHaveLength(2);
    for (const o of obs) expect(() => ProviderModelObservationSchema.parse(o)).not.toThrow();
    expect(by("deepseek-flash")).toMatchObject({
      priceUnit: "cny_per_1m_tokens",
      priceCacheRead: "0.04",
      priceInput: "2",
      priceOutput: "8",
      contextLength: 1024 * 1024,
      vendorHint: "deepseek",
      sourceKey: "deepseek-pricing",
    });
    expect(by("deepseek-v4-pro")).toMatchObject({
      priceCacheRead: "0.3",
      priceInput: "9",
      priceOutput: "27",
      contextLength: 1024 * 1024,
    });
  });

  it("同页 CNY+USD 时取 CNY（USD 表在前也不选，缓存命中价不串币种）", () => {
    const usd = [
      "<table><thead><tr><th>Model</th><th>deepseek-flash</th><th>deepseek-v4-pro</th></tr></thead><tbody>",
      "<tr><th>Context Length</th><td>1M</td><td>1M</td></tr>",
      "<tr><th>Input (Cache Hit)</th><td>$0.01</td><td>$0.05</td></tr>",
      "<tr><th>Input (Cache Miss)</th><td>$0.5</td><td>$2.0</td></tr>",
      "<tr><th>Output</th><td>$1.0</td><td>$3.0</td></tr>",
      "</tbody></table>",
    ].join("");
    const res = parseDeepseekPricing(usd + fx("deepseek-pricing.html"), at);
    expect(res.ok).toBe(true);
    if (res.ok) {
      const flash = res.observations.find((o) => o.externalModelId === "deepseek-flash");
      expect(flash).toMatchObject({ priceCacheRead: "0.04", priceInput: "2", priceOutput: "8" });
    }
  });

  it("缺缓存命中价/上下文长度 → null 而非 0", () => {
    const minimal = [
      "<table><thead><tr><th>模型</th><th>deepseek-x</th></tr></thead><tbody>",
      "<tr><th>百万tokens输入（缓存未命中）</th><td>2元</td></tr>",
      "<tr><th>百万tokens输出</th><td>3元</td></tr>",
      "</tbody></table>",
    ].join("");
    const res = parseDeepseekPricing(minimal, at);
    expect(res.ok).toBe(true);
    if (res.ok) {
      const x = res.observations[0];
      expect(x.priceInput).toBe("2");
      expect(x.priceOutput).toBe("3");
      expect(x.priceCacheRead).toBeNull();
      expect(x.contextLength).toBeNull();
    }
  });

  it("页面结构变化（无价格表/无模型表头）→ ok:false", () => {
    expect(parseDeepseekPricing("<p>价格调整中</p>", at).ok).toBe(false);
    const noHeader = "<table><tbody><tr><td>价格调整中</td><td>请稍后再试</td></tr></tbody></table>";
    expect(parseDeepseekPricing(noHeader, at).ok).toBe(false);
  });

  it("命中登录/反爬标记 → 该源停止（ok:false）", () => {
    const blocked = parseDeepseekPricing("<table><tr><td>模型</td><td>captcha challenge</td></tr></table>", at);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.reason).toContain("blocked_or_login_required");
  });
});

describe("collectPublicPricing（注入 fetch，不联网）", () => {
  it("默认端点被调用一次，观测透传", async () => {
    const calls: string[] = [];
    const res = await collectPublicPricing(deepseekPricingCollector, undefined, {
      fetchText: async (url) => {
        calls.push(url);
        return fx("deepseek-pricing.html");
      },
      now: at,
    });
    expect(calls).toEqual([deepseekPricingCollector.defaultEndpoint]);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.observations).toHaveLength(2);
  });

  it("fetch 抛错 → ok:false + fetch_failed（不抛出、不以空列表成功）", async () => {
    const res = await collectPublicPricing(siliconflowPricingCollector, "https://siliconflow.cn/pricing", {
      fetchText: async () => {
        throw new Error("HTTP 403");
      },
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.reason).toContain("fetch_failed");
      expect(res.reason).toContain("HTTP 403");
      expect(res.endpoint).toBe("https://siliconflow.cn/pricing");
    }
  });
});
