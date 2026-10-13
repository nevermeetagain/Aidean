import { describe, it, expect } from "vitest";
import {
  calcDiscountPrice,
  normalizeToMillionTokens,
  millionToK,
  kToMillion,
  formatPrice,
  formatListedPrice,
  formatDiscountPrice,
  calcDiscountRange,
  formatDiscountRange,
} from "../utils/provider-pricing";

describe("provider-pricing", () => {
  describe("normalizeToMillionTokens", () => {
    it("keeps M tokens as-is", () => {
      expect(normalizeToMillionTokens(100, "per_million_tokens")).toBe(100);
    });
    it("converts K tokens to M tokens (×1000)", () => {
      expect(normalizeToMillionTokens(10, "per_1k_tokens")).toBe(10000);
    });
    it("accepts string input", () => {
      expect(normalizeToMillionTokens("10.5", "per_1k_tokens")).toBe(10500);
    });
    it("throws on negative", () => {
      expect(() => normalizeToMillionTokens(-1, "per_million_tokens")).toThrow();
    });
  });

  describe("calcDiscountPrice", () => {
    // 用户示例: 充值比例=20, 标价=$10/K tokens, 倍率=1 → 500元/M tokens
    it("matches user example: $10/K, ratio=20, mult=1 → 500元/M", () => {
      expect(calcDiscountPrice(10, "per_1k_tokens", 20, 1)).toBe(500);
    });
    it("works with M tokens unit", () => {
      // $10000/M, ratio=20, mult=1 → 500元/M
      expect(calcDiscountPrice(10000, "per_million_tokens", 20, 1)).toBe(500);
    });
    it("applies multiplier", () => {
      // $10/K, ratio=20, mult=2 → 1000元/M (倍率翻倍 → 折扣价翻倍)
      // Wait: 10×1000/(20×2) = 10000/40 = 250
      expect(calcDiscountPrice(10, "per_1k_tokens", 20, 2)).toBe(250);
    });
    it("default multiplier is 1.0", () => {
      expect(calcDiscountPrice(10, "per_1k_tokens", 20)).toBe(500);
    });
    it("throws on zero recharge ratio", () => {
      expect(() => calcDiscountPrice(10, "per_1k_tokens", 0)).toThrow();
    });
    it("throws on negative multiplier", () => {
      expect(() => calcDiscountPrice(10, "per_1k_tokens", 20, -1)).toThrow();
    });
  });

  describe("millionToK / kToMillion", () => {
    it("500元/M → 0.5元/K", () => {
      expect(millionToK(500)).toBe(0.5);
    });
    it("0.5元/K → 500元/M", () => {
      expect(kToMillion(0.5)).toBe(500);
    });
  });

  describe("formatPrice", () => {
    it("500 → '500'", () => {
      expect(formatPrice(500)).toBe("500");
    });
    it("0.5 → '0.5'", () => {
      expect(formatPrice(0.5)).toBe("0.5");
    });
    it("0.0025 → '0.0025'", () => {
      expect(formatPrice(0.0025)).toBe("0.0025");
    });
    it("NaN → '—'", () => {
      expect(formatPrice(NaN)).toBe("—");
    });
  });

  describe("formatListedPrice", () => {
    it("formats with K unit", () => {
      expect(formatListedPrice(10, "$", "per_1k_tokens")).toBe("$10/K");
    });
    it("formats with M unit", () => {
      expect(formatListedPrice(10000, "$", "per_million_tokens")).toBe("$10000/M");
    });
    it("null → '未公开'", () => {
      expect(formatListedPrice(null, "$", "per_million_tokens")).toBe("未公开");
    });
  });

  describe("formatDiscountPrice", () => {
    it("500元/M", () => {
      expect(formatDiscountPrice(500, "M")).toBe("500/元·M");
    });
    it("0.5元/K", () => {
      expect(formatDiscountPrice(500, "K")).toBe("0.5/元·K");
    });
    it("null → '—'", () => {
      expect(formatDiscountPrice(null, "M")).toBe("—");
    });
  });

  describe("calcDiscountRange", () => {
    it("single value → [v, v]", () => {
      const [min, max] = calcDiscountRange(10, 10, "per_1k_tokens", 20, 1);
      expect(min).toBe(500);
      expect(max).toBe(500);
    });
    it("range → [min, max]", () => {
      const [min, max] = calcDiscountRange(8, 12, "per_1k_tokens", 20, 1);
      expect(min).toBe(400);
      expect(max).toBe(600);
    });
    it("null inputs → [null, null]", () => {
      const [min, max] = calcDiscountRange(null, null, "per_1k_tokens", 20, 1);
      expect(min).toBeNull();
      expect(max).toBeNull();
    });
  });

  describe("formatDiscountRange", () => {
    it("single value", () => {
      expect(formatDiscountRange(500, 500, "M")).toBe("500/元·M");
    });
    it("range", () => {
      expect(formatDiscountRange(400, 600, "M")).toBe("400~600/元·M");
    });
    it("both null", () => {
      expect(formatDiscountRange(null, null, "M")).toBe("—");
    });
    it("K unit range", () => {
      expect(formatDiscountRange(400, 600, "K")).toBe("0.4~0.6/元·K");
    });
  });
});
