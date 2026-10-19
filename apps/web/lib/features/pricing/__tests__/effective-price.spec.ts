// TASK-027 生效价解析单测（DESIGN-002 §4）：窗口前/中/边界(from 含、until 不含)/后、免费、无优惠、
// 多优惠取最新、过期回落、DTO 无敏感键、resolveEffectivePrice 查询形状、gateway 收敛形状。
import { EffectivePriceSchema } from "@aidean/shared";
import { Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import {
  effectivePriceWhere,
  isActivePromotion,
  pickEffectivePrice,
  resolveEffectivePrice,
  toEffectivePriceDto,
  type PriceRowLike,
} from "../effective-price";

const D = (s: string) => new Date(s);
const dec = (s: string) => new Prisma.Decimal(s);
const current: PriceRowLike = {
  priceInput: dec("2.000000"),
  priceOutput: dec("8.5"),
  priceCache: dec("0.5"),
  isCurrent: true,
  sourceType: "OFFICIAL",
  effectiveFrom: D("2026-01-01T00:00:00Z"),
  effectiveUntil: null,
};
const promo = (from: string, until: string | null, input = "1", output = "4"): PriceRowLike => ({
  priceInput: dec(input),
  priceOutput: dec(output),
  priceCache: null,
  isCurrent: false,
  sourceType: "PROMOTION",
  effectiveFrom: D(from),
  effectiveUntil: until ? D(until) : null,
});
const P1 = promo("2026-11-01T00:00:00Z", "2026-11-08T00:00:00Z");

describe("pickEffectivePrice（TASK-027）", () => {
  it("1 窗口前 → 当前价", () => {
    const r = pickEffectivePrice([current, P1], D("2026-10-31T23:59:59.999Z"));
    expect(r?.isPromotion).toBe(false);
    expect(r?.effective).toBe(current);
  });
  it("2 窗口起点（from 含）→ 优惠价", () => {
    const r = pickEffectivePrice([current, P1], D("2026-11-01T00:00:00Z"));
    expect(r?.isPromotion).toBe(true);
    expect(r?.effective).toBe(P1);
    expect(r?.base).toBe(current);
  });
  it("3 窗口中 → 优惠价", () => {
    expect(pickEffectivePrice([current, P1], D("2026-11-04T12:00:00Z"))?.effective).toBe(P1);
  });
  it("4 窗口终点（until 不含）→ 回落当前价", () => {
    const r = pickEffectivePrice([current, P1], D("2026-11-08T00:00:00Z"));
    expect(r?.isPromotion).toBe(false);
    expect(r?.effective).toBe(current);
  });
  it("5 过期后 → 回落当前价", () => {
    expect(pickEffectivePrice([current, P1], D("2026-12-01T00:00:00Z"))?.effective).toBe(current);
  });
  it("6 限时免费：优惠价 0 照常生效（计费为 0 由 service 乘出）", () => {
    const free = promo("2026-11-01T00:00:00Z", "2026-11-02T00:00:00Z", "0", "0");
    const r = pickEffectivePrice([current, free], D("2026-11-01T08:00:00Z"));
    expect(r?.effective).toBe(free);
    expect(String(r?.effective.priceInput)).toBe("0");
  });
  it("7 无优惠行 → 当前价；无任何行 → null", () => {
    expect(pickEffectivePrice([current], D("2026-11-04T00:00:00Z"))?.effective).toBe(current);
    expect(pickEffectivePrice([], D("2026-11-04T00:00:00Z"))).toBeNull();
  });
  it("8 多条窗口内优惠（脏数据重叠）→ 取 effectiveFrom 最新，与输入顺序无关", () => {
    const older = promo("2026-11-01T00:00:00Z", "2026-11-10T00:00:00Z", "1.2", "4");
    const newer = promo("2026-11-03T00:00:00Z", "2026-11-05T00:00:00Z", "0.9", "3");
    const at = D("2026-11-04T00:00:00Z");
    expect(pickEffectivePrice([older, newer, current], at)?.effective).toBe(newer);
    expect(pickEffectivePrice([current, newer, older], at)?.effective).toBe(newer);
  });
  it("9 effectiveUntil 为空的 PROMOTION 行视为无效（防脏数据永久生效）", () => {
    const bad = promo("2026-01-01T00:00:00Z", null);
    expect(isActivePromotion(bad, D("2026-11-04T00:00:00Z"))).toBe(false);
    expect(pickEffectivePrice([current, bad], D("2026-11-04T00:00:00Z"))?.effective).toBe(current);
  });
  it("10 只有优惠无当前价（新模型首发限免）→ 优惠价生效，base=null", () => {
    const r = pickEffectivePrice([P1], D("2026-11-02T00:00:00Z"));
    expect(r?.effective).toBe(P1);
    expect(r?.base).toBeNull();
  });
  it("11 非 PROMOTION 来源即使带窗口也不当优惠（OFFICIAL/CRAWLER 历史行不抢占）", () => {
    const crawler = { ...P1, sourceType: "CRAWLER" };
    expect(pickEffectivePrice([current, crawler], D("2026-11-02T00:00:00Z"))?.effective).toBe(current);
  });
});

describe("toEffectivePriceDto（TASK-027）", () => {
  it("优惠中：base* 为原价、promotionEndsAt=until；通过契约 EffectivePriceSchema（strict 解析无多余键）", () => {
    const dto = toEffectivePriceDto("m1", pickEffectivePrice([current, P1], D("2026-11-02T00:00:00Z"))!);
    expect(dto).toEqual({
      modelId: "m1",
      priceInput: "1",
      priceOutput: "4",
      priceCache: null,
      isPromotion: true,
      promotionEndsAt: "2026-11-08T00:00:00.000Z",
      basePriceInput: "2",
      basePriceOutput: "8.5",
    });
    expect(EffectivePriceSchema.strict().safeParse(dto).success).toBe(true);
  });
  it("非优惠：base*/promotionEndsAt 为 null；Decimal 精度经 toString 保留（不经 Number）", () => {
    const tiny = { ...current, priceInput: dec("0.000001"), priceOutput: dec("1234567890123.123456") };
    const dto = toEffectivePriceDto("m1", pickEffectivePrice([tiny], D("2026-11-02T00:00:00Z"))!);
    expect(dto.priceInput).toBe("0.000001");
    expect(dto.priceOutput).toBe("1234567890123.123456");
    expect(dto.priceCache).toBe("0.5");
    expect(dto.basePriceInput).toBeNull();
    expect(dto.promotionEndsAt).toBeNull();
    expect(EffectivePriceSchema.strict().safeParse(dto).success).toBe(true);
  });
  it("序列化不含 markup/multiplier（价格透明 · 敏感字段一票否决）", () => {
    const json = JSON.stringify(toEffectivePriceDto("m1", pickEffectivePrice([current, P1], D("2026-11-02T00:00:00Z"))!));
    expect(json).not.toMatch(/markup|multiplier/i);
  });
});

describe("resolveEffectivePrice（TASK-027 查询形状）", () => {
  it("where = modelId ∧ (isCurrent ∪ 窗口内 PROMOTION)，并解析为 DTO；无行 → null", async () => {
    const at = D("2026-11-02T00:00:00Z");
    const findMany = vi.fn().mockResolvedValueOnce([P1, current]).mockResolvedValueOnce([]);
    const client = { modelPrice: { findMany } };
    const dto = await resolveEffectivePrice("m1", at, client);
    expect(findMany.mock.calls[0][0].where).toEqual({ modelId: "m1", ...effectivePriceWhere(at) });
    expect(effectivePriceWhere(at).OR[1]).toEqual({ sourceType: "PROMOTION", effectiveFrom: { lte: at }, effectiveUntil: { gt: at } });
    expect(dto?.isPromotion).toBe(true);
    expect(await resolveEffectivePrice("m2", at, client)).toBeNull();
  });
});
