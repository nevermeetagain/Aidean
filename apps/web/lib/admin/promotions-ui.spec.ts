/**
 * TASK-029：限时优惠 UI 纯逻辑与前台价格徽标渲染单测。
 *   - PromotionsPanel 辅助：价格校验（与服务端 assertPriceDecimal 同口径）、北京时间 ↔ ISO、状态判定；
 *   - PriceTag：0→免费、优惠划线 + 徽标（price-promo-badge）、限时免费、截止时间按 Asia/Shanghai、无优惠不渲染徽标。
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { isoToShanghaiLocal, promoStatus, shanghaiLocalToIso, validatePrice } from "../../components/admin/PromotionsPanel";
import { formatPriceValue, formatPromoDeadline, PriceTag } from "../../components/common/PriceTag";

describe("PromotionsPanel 辅助", () => {
  it("validatePrice：必填/非负十进制/≤6 位小数/≤13 位整数（前导零不计）", () => {
    expect(validatePrice("输入价", "", true)).toBe("输入价必填");
    expect(validatePrice("缓存价", "  ", false)).toBeNull();
    expect(validatePrice("输入价", "-1", true)).toMatch(/非负数字/);
    expect(validatePrice("输入价", "1e3", true)).toMatch(/非负数字/);
    expect(validatePrice("输入价", "0.1234567", true)).toMatch(/小数位/);
    expect(validatePrice("输入价", "12345678901234", true)).toMatch(/整数位/);
    expect(validatePrice("输入价", "0001234567890123.5", true)).toBeNull();
    expect(validatePrice("输入价", "0", true)).toBeNull();
  });

  it("北京时间 datetime-local ↔ ISO UTC 往返一致（UTC+8）", () => {
    expect(shanghaiLocalToIso("2026-11-01T00:00")).toBe("2026-10-31T16:00:00.000Z");
    expect(isoToShanghaiLocal("2026-10-31T16:00:00.000Z")).toBe("2026-11-01T00:00");
    expect(isoToShanghaiLocal(shanghaiLocalToIso("2026-12-31T23:59")!)).toBe("2026-12-31T23:59");
    expect(shanghaiLocalToIso("2026-11-01")).toBeNull();
    expect(isoToShanghaiLocal(null)).toBe("");
  });

  it("promoStatus：未开始 / 进行中 / 已结束（结束时刻不含）/ 缺结束时间", () => {
    const row = { effectiveFrom: "2026-11-01T00:00:00Z", effectiveUntil: "2026-11-08T00:00:00Z" };
    expect(promoStatus(row, Date.parse("2026-10-31T23:59:59Z"))).toBe("upcoming");
    expect(promoStatus(row, Date.parse("2026-11-01T00:00:00Z"))).toBe("running");
    expect(promoStatus(row, Date.parse("2026-11-08T00:00:00Z"))).toBe("ended");
    expect(promoStatus({ ...row, effectiveUntil: null }, Date.parse("2026-11-02T00:00:00Z"))).toBe("invalid");
  });
});

describe("PriceTag 前台价格徽标（契约⑥）", () => {
  const html = (props: Parameters<typeof PriceTag>[0]) => renderToStaticMarkup(createElement(PriceTag, props));

  it("formatPriceValue：0→免费、null→未公开、量级位数、币种符号", () => {
    expect(formatPriceValue(0)).toBe("免费");
    expect(formatPriceValue(null)).toBe("未公开");
    expect(formatPriceValue("2.5")).toBe("¥2.50");
    expect(formatPriceValue(0.05, "USD")).toBe("$0.050");
    expect(formatPriceValue(0.0012)).toBe("¥0.0012");
    expect(formatPriceValue(3, "JPY")).toBe("JPY 3.00");
  });

  it("formatPromoDeadline 按 Asia/Shanghai 展示（与服务器时区无关）", () => {
    expect(formatPromoDeadline("2026-11-07T16:00:00.000Z")).toMatch(/11\/08\s*00:00/);
    expect(formatPromoDeadline("not-a-date")).toBeNull();
  });

  it("无优惠：不渲染徽标与划线（empty 态）", () => {
    const out = html({ value: "2", currency: "CNY" });
    expect(out).toContain("¥2.00");
    expect(out).not.toContain("price-promo-badge");
    expect(out).not.toContain('data-testid="price-base"');
  });

  it("优惠中：优惠价 + 原价划线 + 「限时优惠 · 截至」徽标", () => {
    const out = html({ value: "0.5", basePrice: "2", isPromotion: true, promotionEndsAt: "2026-11-07T16:00:00.000Z" });
    expect(out).toContain("¥0.500");
    expect(out).toMatch(/data-testid="price-base"[^>]*>¥2\.00<\/s>/);
    expect(out).toContain('data-testid="price-promo-badge"');
    expect(out).toContain("限时优惠");
    expect(out).toMatch(/截至 11\/08\s*00:00/);
  });

  it("优惠价为 0：显示「免费」+ 徽标「限时免费」", () => {
    const out = html({ value: "0", basePrice: "2", isPromotion: true, promotionEndsAt: "2026-11-07T16:00:00.000Z" });
    expect(out).toContain("免费");
    expect(out).toContain("限时免费");
  });

  it("showBadge=false：同一行第二个价格不重复徽标，仍划线", () => {
    const out = html({ value: "1", basePrice: "4", isPromotion: true, showBadge: false });
    expect(out).not.toContain("price-promo-badge");
    expect(out).toContain('data-testid="price-base"');
  });
});
