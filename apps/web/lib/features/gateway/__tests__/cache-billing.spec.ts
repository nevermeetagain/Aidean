// TASK-080 缓存命中 token 计价：有缓存价 / 无缓存价回退输入价 / cachedTokens=0；OpenAI 与 Anthropic usage 口径差异。
import { describe, expect, it, vi } from "vitest";

vi.mock("../../db/prisma", () => ({ prisma: {} }));

import { chargeUsageMinor } from "../service";

// 元/百万 Token：输入 2、输出 8、缓存 0.5（分 = 价 × tokens / 1e4）
const withCache = { priceInput: "2", priceOutput: "8", priceCache: "0.5" };
const noCache = { priceInput: "2", priceOutput: "8", priceCache: null };

describe("chargeUsageMinor（TASK-080）", () => {
  it("OpenAI：有缓存价 → 未命中 60 万×2 + 命中 40 万×0.5 + 输出 10 万×8 = 120+20+80 = 220 分", () => {
    expect(chargeUsageMinor(withCache, { promptTokens: 1_000_000, completionTokens: 100_000, cachedTokens: 400_000 }, null, "openai")).toBe(220n);
  });

  it("OpenAI：无缓存价 → 命中部分回退输入价（与不拆分等价）= 200+80 = 280 分，并记 info", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    expect(chargeUsageMinor(noCache, { promptTokens: 1_000_000, completionTokens: 100_000, cachedTokens: 400_000 }, null, "openai")).toBe(280n);
    expect(info).toHaveBeenCalledOnce();
    info.mockRestore();
  });

  it("cachedTokens=0 / 缺省 → 与旧口径一致（全量按输入价）", () => {
    const u = { promptTokens: 1_000_000, completionTokens: 100_000 };
    expect(chargeUsageMinor(withCache, { ...u, cachedTokens: 0 }, null, "openai")).toBe(280n);
    expect(chargeUsageMinor(withCache, u, null, "openai")).toBe(280n);
  });

  it("Anthropic：input_tokens 不含缓存读取 → 缓存读取另计（60 万×2 + 40 万×0.5 + 输出 80 = 220 分）", () => {
    expect(chargeUsageMinor(withCache, { promptTokens: 600_000, completionTokens: 100_000, cachedTokens: 400_000 }, null, "anthropic")).toBe(220n);
  });

  it("Anthropic 无缓存价：缓存读取按输入价补计（不再漏计）= 200+80 = 280 分", () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    expect(chargeUsageMinor(noCache, { promptTokens: 600_000, completionTokens: 100_000, cachedTokens: 400_000 }, null, "anthropic")).toBe(280n);
  });

  it("OpenAI 脏数据 cached > prompt → 截断到 prompt（不产生负的未命中部分）", () => {
    expect(chargeUsageMinor(withCache, { promptTokens: 100_000, completionTokens: 0, cachedTokens: 900_000 }, null, "openai")).toBe(5n);
  });

  it("加价率与倍率作用于缓存部分：×1.5 ×2 → 220 × 3 = 660 分", () => {
    expect(
      chargeUsageMinor(withCache, { promptTokens: 1_000_000, completionTokens: 100_000, cachedTokens: 400_000 }, { markupRate: "1.5", tokenMultiplier: "2" }, "openai"),
    ).toBe(660n);
  });

  it("免费价（全 0）→ 0 分", () => {
    expect(chargeUsageMinor({ priceInput: "0", priceOutput: "0", priceCache: "0" }, { promptTokens: 5, completionTokens: 5, cachedTokens: 5 }, null, "openai")).toBe(0n);
  });
});
