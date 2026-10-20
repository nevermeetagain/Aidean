// TASK-048（ADR-P005 v0.4）生效价归一：计费与展示同一口径（目标币种 / 每百万 Token），不可归一 fail-closed。
import { EffectivePriceSchema } from "@aidean/shared";
import { Prisma } from "@prisma/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  normalizePriceRow,
  pickEffectivePrice,
  resolveEffectivePrice,
  toEffectivePriceDto,
  type PriceRowLike,
} from "../effective-price";

vi.mock("../../../db/prisma", () => ({ prisma: {} }));

const dec = (s: string) => new Prisma.Decimal(s);
const FX = { date: "2026-11-02", usdCny: "7.1" };
const AT = new Date("2026-11-02T04:00:00.000Z");
const row = (o: Partial<PriceRowLike>): PriceRowLike => ({
  priceInput: dec("1"),
  priceOutput: dec("2"),
  priceCache: null,
  billingCurrency: "CNY",
  billingUnit: "per_million_tokens",
  isCurrent: true,
  sourceType: "OFFICIAL",
  effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
  effectiveUntil: null,
  ...o,
});

describe("normalizePriceRow（表驱动）", () => {
  const cases: [string, Partial<PriceRowLike>, "CNY" | "USD", string, string][] = [
    ["USD 1.00/M × fx 7.1 → 7.1 元/M", { billingCurrency: "USD", priceInput: dec("1.00"), priceOutput: dec("3") }, "CNY", "7.1", "21.3"],
    ["CNY per_1k 0.002 → 2 元/M", { billingUnit: "per_1k_tokens", priceInput: dec("0.002"), priceOutput: dec("0.008") }, "CNY", "2", "8"],
    ["USD per_token 0.0000025 → 17.75 元/M", { billingCurrency: "USD", billingUnit: "per_token", priceInput: dec("0.0000025"), priceOutput: dec("0") }, "CNY", "17.75", "0"],
    ["CNY 7.1/M → 展示 USD 1/M", { priceInput: dec("7.1"), priceOutput: dec("14.2") }, "USD", "1", "2"],
    ["per_1m_tokens 别名", { billingUnit: "per_1m_tokens", priceInput: dec("0.5"), priceOutput: dec("1.5") }, "CNY", "0.5", "1.5"],
  ];
  it.each(cases)("%s", (_n, o, target, inp, out) => {
    const n = normalizePriceRow(row(o), target, FX)!;
    expect(n.priceInput).toBe(inp);
    expect(n.priceOutput).toBe(out);
    expect(n.currency).toBe(target);
    expect(n.unit).toBe("per_million_tokens");
  });

  it("同币种不需要汇率：fxRate/fxDate 为 null，原值进 source*", () => {
    const n = normalizePriceRow(row({ priceCache: dec("0.25") }), "CNY", null)!;
    expect(n).toMatchObject({ fxRate: null, fxDate: null, sourceCurrency: "CNY", sourcePriceInput: "1", sourcePriceOutput: "2", priceCache: "0.25" });
  });

  it("缓存命中价同口径归一（USD 0.1/M → 0.71 元/M）", () => {
    expect(normalizePriceRow(row({ billingCurrency: "USD", priceCache: dec("0.1") }), "CNY", FX)!.priceCache).toBe("0.71");
  });

  it("fail-closed：未知币种 / 未知单位 / 跨币种缺汇率 → null（不按 0 或原值放行）", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(normalizePriceRow(row({ billingCurrency: "EUR" }), "CNY", FX)).toBeNull();
    expect(normalizePriceRow(row({ billingUnit: "per_request" }), "CNY", FX)).toBeNull();
    expect(normalizePriceRow(row({ billingCurrency: "USD" }), "CNY", null)).toBeNull();
    expect(warn).toHaveBeenCalledTimes(3);
    warn.mockRestore();
  });

  it("U-23：输入输出均为 0 → isFree=true；任一非 0 → false", () => {
    expect(normalizePriceRow(row({ priceInput: dec("0"), priceOutput: dec("0.000000") }), "CNY", null)!.isFree).toBe(true);
    expect(normalizePriceRow(row({ priceInput: dec("0"), priceOutput: dec("0.000001") }), "CNY", null)!.isFree).toBe(false);
  });

  it("缺省币种/单位按 schema 默认（CNY / per_million_tokens）", () => {
    const n = normalizePriceRow(row({ billingCurrency: null, billingUnit: null }), "CNY", null)!;
    expect(n).toMatchObject({ priceInput: "1", sourceCurrency: "CNY", sourceUnit: "per_million_tokens" });
  });
});

describe("toEffectivePriceDto v0.2（归一字段）", () => {
  it("R9-04：USD 优惠行与 CNY 当前价一律归一后输出；通过契约 strict 解析", () => {
    const current = row({ priceInput: dec("14.2"), priceOutput: dec("28.4") });
    const promo = row({
      billingCurrency: "USD",
      priceInput: dec("1"),
      priceOutput: dec("2"),
      isCurrent: false,
      sourceType: "PROMOTION",
      effectiveFrom: new Date("2026-11-01T00:00:00.000Z"),
      effectiveUntil: new Date("2026-11-08T00:00:00.000Z"),
    });
    const dto = toEffectivePriceDto("m1", pickEffectivePrice([current, promo], AT)!, "CNY", FX)!;
    expect(dto).toMatchObject({
      priceInput: "7.1",
      priceOutput: "14.2",
      basePriceInput: "14.2",
      basePriceOutput: "28.4",
      currency: "CNY",
      sourceCurrency: "USD",
      sourcePriceInput: "1",
      fxRate: "7.1",
      fxDate: "2026-11-02",
      isPromotion: true,
    });
    expect(EffectivePriceSchema.strict().safeParse(dto).success).toBe(true);
  });

  it("生效行不可归一 → DTO 为 null（读侧显示待核，不显示错价）", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(toEffectivePriceDto("m1", pickEffectivePrice([row({ billingCurrency: "USD" })], AT)!, "CNY", null)).toBeNull();
  });
});

describe("resolveEffectivePrice（读侧，注入汇率）", () => {
  afterEach(() => vi.restoreAllMocks());
  const client = (rows: PriceRowLike[]) => ({ modelPrice: { findMany: vi.fn().mockResolvedValue(rows) } });

  it("跨币种才读汇率；select 含 billingCurrency/billingUnit", async () => {
    const loadFx = vi.fn().mockResolvedValue(FX);
    const c = client([row({ billingCurrency: "USD" })]);
    const dto = await resolveEffectivePrice("m1", AT, c, { loadFx });
    expect(dto?.priceInput).toBe("7.1");
    expect(loadFx).toHaveBeenCalledWith(AT);
    const args = c.modelPrice.findMany.mock.calls[0][0];
    expect(args.select).toMatchObject({ billingCurrency: true, billingUnit: true, priceCache: true });
  });

  it("同币种不读汇率；展示币种 USD 时读汇率换算", async () => {
    const loadFx = vi.fn().mockResolvedValue(FX);
    expect((await resolveEffectivePrice("m1", AT, client([row({})]), { loadFx }))?.priceInput).toBe("1");
    expect(loadFx).not.toHaveBeenCalled();
    const usd = await resolveEffectivePrice("m1", AT, client([row({ priceInput: dec("7.1") })]), { loadFx, currency: "USD" });
    expect(usd).toMatchObject({ priceInput: "1", currency: "USD", sourceCurrency: "CNY" });
  });

  it("当日汇率缺失（loadFx → null）→ USD 行读侧返回 null", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(await resolveEffectivePrice("m1", AT, client([row({ billingCurrency: "USD" })]), { loadFx: async () => null })).toBeNull();
  });
});
