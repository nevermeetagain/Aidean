/**
 * TASK-027 · 生效价 PG16 真库集成测试（DESIGN-002 / REQ-F-038 / REQ-F-063）
 *
 * 覆盖：① resolveEffectivePrice 真库 where（OR + 窗口）与部分唯一索引（M-001：优惠行 is_current=false 可多条）共存；
 *       ② gatewayRepository.findModelByCode / findModelsByIds 收敛后 prices[0] 即生效价（计费基准价），窗口外回落；
 *       ③ 采集写入新当前价后，生效价解析结果随之更新（REQ-F-063 前台展示价与采集同步）。
 * 门控（同 TASK-089）：RUN_DB_TESTS=1 ∧ DATABASE_URL 才执行；默认/CI 占位串一律 skip。
 *   RUN_DB_TESTS=1 DATABASE_URL=postgresql://... pnpm --filter web exec vitest run lib/features/pricing/__tests__/effective-price.int.spec.ts
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const DB_ENABLED = process.env.RUN_DB_TESTS === "1" && !!process.env.DATABASE_URL;
const suite = DB_ENABLED ? describe : describe.skip;

suite("生效价真库解析（TASK-027）", () => {
  let prisma: any;
  let resolveEffectivePrice: typeof import("../effective-price").resolveEffectivePrice;
  let gatewayRepository: typeof import("../../gateway/repository").gatewayRepository;
  const stamp = Date.now();
  const code = `it-027-m-${stamp}`;
  let vendorId: string;
  let modelId: string;

  const from = new Date("2026-11-01T00:00:00.000Z");
  const until = new Date("2026-11-08T00:00:00.000Z");
  const inWindow = new Date("2026-11-03T00:00:00.000Z");
  const after = new Date("2026-11-08T00:00:00.000Z"); // until 不含

  beforeAll(async () => {
    prisma = (await import("../../../db/prisma")).prisma;
    resolveEffectivePrice = (await import("../effective-price")).resolveEffectivePrice;
    gatewayRepository = (await import("../../gateway/repository")).gatewayRepository;
    vendorId = (await prisma.vendor.create({ data: { code: `it-027-v-${stamp}`, name: "IT 027 Vendor" }, select: { id: true } })).id;
    modelId = (
      await prisma.aiModel.create({
        data: { modelCode: code, nameDisplay: code, slug: code, vendorId, modelType: "CHAT", protocol: "OPENAI", status: "ACTIVE", isActive: true },
        select: { id: true },
      })
    ).id;
    await prisma.modelPrice.create({
      data: { modelId, priceInput: "2.5", priceOutput: "10", billingCurrency: "CNY", isCurrent: true, sourceType: "OFFICIAL", effectiveFrom: new Date("2026-01-01T00:00:00.000Z") },
    });
    // 已过期优惠 + 窗口内限免：均 is_current=false（部分唯一索引允许多条）
    await prisma.modelPrice.createMany({
      data: [
        { modelId, priceInput: "1", priceOutput: "4", isCurrent: false, sourceType: "PROMOTION", effectiveFrom: new Date("2026-10-01T00:00:00.000Z"), effectiveUntil: new Date("2026-10-08T00:00:00.000Z") },
        { modelId, priceInput: "0", priceOutput: "0", isCurrent: false, sourceType: "PROMOTION", effectiveFrom: from, effectiveUntil: until },
      ],
    });
  });

  afterAll(async () => {
    if (!prisma) return;
    try { await prisma.modelPrice.deleteMany({ where: { modelId } }); } catch { /* noop */ }
    try { await prisma.aiModel.delete({ where: { id: modelId } }); } catch { /* noop */ }
    try { await prisma.vendor.delete({ where: { id: vendorId } }); } catch { /* noop */ }
  });

  it("窗口内 → 限免优惠价，原价供划线；窗口终点（不含）→ 回落当前价", async () => {
    const p = await resolveEffectivePrice(modelId, inWindow);
    expect(p).toMatchObject({ priceInput: "0", priceOutput: "0", isPromotion: true, basePriceInput: "2.5", basePriceOutput: "10" });
    expect(p?.promotionEndsAt).toBe(until.toISOString());
    const q = await resolveEffectivePrice(modelId, after);
    expect(q).toMatchObject({ priceInput: "2.5", priceOutput: "10", isPromotion: false, basePriceInput: null });
  });

  it("网关取价：findModelByCode / findModelsByIds 的 prices 收敛为 1 条生效价（Decimal 原样）", async () => {
    const m = await gatewayRepository.findModelByCode(prisma, code, inWindow);
    expect(m?.prices).toHaveLength(1);
    expect(String(m?.prices[0].priceInput)).toBe("0");
    expect(m?.prices[0].billingCurrency).toBe("CNY");
    const out = await gatewayRepository.findModelByCode(prisma, code, after);
    expect(String(out?.prices[0].priceInput)).toBe("2.5");
    const map = await gatewayRepository.findModelsByIds(prisma, [modelId], inWindow);
    expect(String(map.get(modelId)?.prices[0].priceOutput)).toBe("0");
    // 契约 GatewayEffectivePrice（gateway/repository.ts:30-38，491481c 起 3 键 → 5 键）：
    // 原 3 字段值校验不删除、不放宽，另显式钉住新增两字段的口径与键集恰好 5 个。
    const gatewayPrice = map.get(modelId)!.prices[0];
    expect(gatewayPrice).toMatchObject({ priceInput: "0", priceOutput: "0", billingCurrency: "CNY" });
    expect(Object.keys(gatewayPrice).sort()).toEqual([
      "billingCurrency",
      "isFree",
      "priceCache",
      "priceInput",
      "priceOutput",
    ]);
    expect(typeof gatewayPrice.isFree).toBe("boolean");
    expect(gatewayPrice.isFree).toBe(true); // 归一后 0/0 → 免费（effective-price.ts:131）
    expect(gatewayPrice.priceCache).toBeNull(); // 价格行无缓存价 → null（effective-price.ts:118,122）
  });

  it("采集写入新当前价后，窗口外生效价随之更新；窗口内仍为优惠（REQ-F-063）", async () => {
    await prisma.$transaction([
      prisma.modelPrice.updateMany({ where: { modelId, isCurrent: true }, data: { isCurrent: false } }),
      prisma.modelPrice.create({ data: { modelId, priceInput: "3", priceOutput: "12", isCurrent: true, sourceType: "CRAWLER", effectiveFrom: new Date("2026-10-15T00:00:00.000Z") } }),
    ]);
    expect((await resolveEffectivePrice(modelId, after))?.priceInput).toBe("3");
    const p = await resolveEffectivePrice(modelId, inWindow);
    expect(p).toMatchObject({ isPromotion: true, priceInput: "0", basePriceInput: "3" });
  });
});
