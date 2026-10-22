// B11-02 价格分层取证探针（EVD-B11-02 随附副本；原件在 .scratch/，该目录被 gitignore 排除）
// 口径与 /pricing 读侧一致：orderBy priceInput asc → take 120
// 用法：cd <repo root> && node docs/任务规划V0.11.0/06_validation/evidence/EVD-B11-02/probe-db.mjs
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(path.join(process.cwd(), "apps/web/package.json"));
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const PROMO_TAG = "seed:pricing-tiers:promo";

try {
  const now = new Date();
  const total = await prisma.modelPrice.count();
  const zeroInput = await prisma.modelPrice.count({ where: { priceInput: 0 } });
  const zeroBoth = await prisma.modelPrice.count({
    where: { AND: [{ priceInput: 0 }, { priceOutput: 0 }] },
  });
  const originalNotNull = await prisma.modelPrice.count({
    where: { originalCurrency: { not: null } },
  });
  const crossCurrency = await prisma.modelPrice.count({
    where: { originalCurrency: "CNY", billingCurrency: "USD" },
  });

  const paidUsd = await prisma.modelPrice.count({
    where: { isCurrent: true, billingCurrency: "USD", priceInput: { gt: 0 } },
  });
  const paidCny = await prisma.modelPrice.count({
    where: { isCurrent: true, billingCurrency: "CNY", priceInput: { gt: 0 } },
  });

  const bySource = await prisma.modelPrice.groupBy({ by: ["sourceType"], _count: true });

  const promos = await prisma.modelPrice.findMany({
    where: { sourceType: "PROMOTION" },
    select: {
      modelId: true, priceInput: true, priceOutput: true, isCurrent: true,
      effectiveFrom: true, effectiveUntil: true, billingCurrency: true, billingUnit: true, notes: true,
      model: { select: { modelCode: true } },
    },
  });
  const activePromos = promos.filter(
    (p) => p.effectiveUntil && p.effectiveFrom <= now && now < p.effectiveUntil,
  );

  // 模拟 /pricing 的 topCurrent 查询（120 条窗口）
  const window = await prisma.modelPrice.findMany({
    where: { isCurrent: true, billingMode: "PER_TOKEN", sourceType: { not: "PROMOTION" } },
    orderBy: [{ priceInput: "asc" }, { priceOutput: "asc" }],
    take: 120,
    select: {
      priceInput: true, priceOutput: true, billingCurrency: true, billingUnit: true, sourceType: true,
      model: { select: { modelCode: true } },
    },
  });
  const windowFree = window.filter((r) => String(r.priceInput) === "0" && String(r.priceOutput) === "0").length;
  const windowUsdPaid = window.filter((r) => r.billingCurrency === "USD" && String(r.priceInput) !== "0").length;
  const windowCnyPaid = window.filter((r) => r.billingCurrency === "CNY" && String(r.priceInput) !== "0").length;

  const out = {
    at: now.toISOString(),
    total,
    zeroInput,
    zeroInputRatio: `${zeroInput}/${total}`,
    zeroBoth,
    originalNotNull,
    crossCurrencyRows: crossCurrency,
    paidUsdCurrent: paidUsd,
    paidCnyCurrent: paidCny,
    bySource,
    promos: promos.map((p) => ({
      code: p.model.modelCode, input: String(p.priceInput), output: String(p.priceOutput),
      isCurrent: p.isCurrent, from: p.effectiveFrom.toISOString(), until: p.effectiveUntil?.toISOString(),
      currency: p.billingCurrency, unit: p.billingUnit, notes: p.notes, active: activePromos.includes(p),
    })),
    pricingWindow120: {
      rows: window.length,
      free: windowFree,
      usdPaid: windowUsdPaid,
      cnyPaid: windowCnyPaid,
      firstPaid: window.find((r) => String(r.priceInput) !== "0")?.model.modelCode ?? null,
      firstUsdPaid: window.find((r) => r.billingCurrency === "USD" && String(r.priceInput) !== "0")?.model.modelCode ?? null,
      firstCnyPaid: window.find((r) => r.billingCurrency === "CNY" && String(r.priceInput) !== "0")?.model.modelCode ?? null,
    },
  };
  console.log(JSON.stringify(out, null, 2));
} catch (e) {
  console.error("ERR", e.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
