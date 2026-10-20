import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { expect, request as pwRequest, test, type APIRequestContext } from "@playwright/test";

import { calcCharge } from "../../packages/shared/src/utils/billing";
import { normalizeUnitPrice } from "../../packages/shared/src/utils/price-normalization";

/**
 * TASK-030 e2e promotion-billing：限时优惠价直接作用于网关计费（契约 EffectivePrice / PromotionPriceCreateSchema）。
 *
 * 口径（以 Hark 已推的核心实现为准）：
 *   - TASK-048（491481c，ADR-P005 v0.4）：网关只认「生效价归一到结算币种 CNY / 每百万 Token」；跨币种按当日汇率快照
 *     （fx_daily_rates，Asia/Shanghai 汇率日，缺失 fail-closed 跳过候选）；归一价输入输出均为 0 → 免费模型（U-23=B）：
 *     跳过余额校验与预扣，零扣费仍写 usage_log。
 *   - TASK-080（c697ba1）：cachedTokens>0 且有缓存价时缓存部分按缓存价计；本 spec 断言 mock 上游 cachedTokens=0，按输入价逐分复算。
 *   - API-009 POST / API-011 DELETE /api/v1/admin/prices/promotions：billing 三元组由当前价派生（Claude 3.7 Sonnet 为 USD）。
 *
 * 链路：
 *   1 admin 建优惠（priceInput=priceOutput=0，窗口 [now-1min, now+15min)）
 *   0 付费用户经管理端调账入账 ¥55.00（生产构建 mock-pay 不可用）
 *   2 零余额用户调网关 → 200（U-23 免费跳过余额校验）；充值用户调网关 → 200，余额不变，usage quotaMinor=0
 *   3 admin 删除优惠 → 充值用户再调 → 按原价扣费：quotaMinor = calcCharge(归一输入价, prompt) + calcCharge(归一输出价, completion)
 *     （× 站点计费规则 markupRate/tokenMultiplier），钱包/流水逐分一致；零余额用户再调 → 无可用付费路径（不再放行）
 *
 * 数据前提：seed「网关E2E Mock站」（AIDEAN_ENABLE_MOCK_UPSTREAM=1）+ Claude 3.7 Sonnet 当前价 $15/$75 每百万。
 * 若测试库无可用 USD→CNY 汇率快照（seed 不写 fx_daily_rates），本 spec 写入一条夹具快照并在结束时删除（见 EVD-030/deviation.md）。
 */

const ROOT = path.resolve(process.cwd());
const WEB_DIR = path.join(ROOT, "apps/web");
const requireFromWeb = createRequire(path.join(WEB_DIR, "package.json"));
const MODEL_CODE = "claude-3-7-sonnet";
const ADMIN = { email: "admin@aidean.com", password: "Admin123!@#" };
const NOTE = `e2e-promotion-billing-${Date.now()}`;
const BASE_URL = process.env.E2E_BASE_URL || "http://localhost:3000";

function databaseUrl(): string {
  const fromEnv = process.env.DATABASE_URL?.trim();
  if (fromEnv) return fromEnv;
  for (const file of [".env.local", ".env"]) {
    const full = path.join(WEB_DIR, file);
    if (!existsSync(full)) continue;
    const m = readFileSync(full, "utf8").match(/^\s*DATABASE_URL\s*=\s*["']?([^"'\r\n]+)/m);
    if (m) return m[1].trim();
  }
  throw new Error("缺少 DATABASE_URL：请与 next start 使用同一测试库");
}

/** Asia/Shanghai 自然日（与 shared fxDateOf 同口径） */
const shanghaiDay = (d = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

const ok = (body: { code: number }) => expect(body.code).toBe(0);

async function registerUser(ctx: APIRequestContext, tag: string): Promise<string> {
  const reg = await ctx.post("/api/v1/auth/register", {
    data: { email: `promo-billing-${tag}-${Date.now()}@aidean.test`, password: "PromoBill#2026", nickname: `优惠计费${tag}` },
  });
  expect(reg.status()).toBe(200);
  const body = await reg.json();
  ok(body);
  return body.data.user.id as string;
}

async function chat(ctx: APIRequestContext, requestId: string) {
  return ctx.post("/api/v1/gateway/chat", {
    headers: { "x-request-id": requestId },
    data: { model: MODEL_CODE, messages: [{ role: "user", content: "aidean-promo ".repeat(60) }], max_tokens: 64 },
  });
}

async function walletMinor(ctx: APIRequestContext): Promise<{ balance: number; held: number }> {
  const w = await (await ctx.get("/api/v1/billing/wallet")).json();
  ok(w);
  return { balance: Math.round(Number(w.data.balanceYuan) * 100), held: Math.round(Number(w.data.heldYuan) * 100) };
}

test.describe.configure({ mode: "serial" });

test.describe("promotion-billing · 限时优惠价直接影响网关计费（TASK-030）", () => {
  let prisma: any;
  let admin: APIRequestContext;
  let payer: APIRequestContext;
  let broke: APIRequestContext;
  let modelId = "";
  let promotionId: string | null = null;
  let fxFixtureId: string | null = null;
  let fx: { date: string; usdCny: string } | null = null;
  let balanceBefore = 0;

  test.beforeAll(async () => {
    const { PrismaClient } = requireFromWeb("@prisma/client") as { PrismaClient: new (opts: unknown) => any };
    prisma = new PrismaClient({ datasourceUrl: databaseUrl() });

    const model = await prisma.aiModel.findFirst({ where: { modelCode: MODEL_CODE, deletedAt: null }, select: { id: true } });
    if (!model) throw new Error(`测试库缺 seed 模型 ${MODEL_CODE}（先跑 pnpm db:seed）`);
    modelId = model.id;

    // 汇率快照：取服务端会用的那一行（rate_date ≤ 今日上海日的最近一行）；没有则写夹具（7.20000000）
    const today = shanghaiDay();
    let row = await prisma.fxDailyRate.findFirst({
      where: { base: "USD", quote: "CNY", rateDate: { lte: new Date(`${today}T00:00:00Z`) } },
      orderBy: { rateDate: "desc" },
    });
    if (!row || row.rateDate.toISOString().slice(0, 10) !== today) {
      if (!row) {
        row = await prisma.fxDailyRate.create({
          data: {
            rateDate: new Date(`${today}T00:00:00Z`), base: "USD", quote: "CNY", rate: "7.20000000",
            source: "e2e-fixture", sourceUrl: "https://example.com/e2e-fx-fixture", fetchedAt: new Date(),
          },
        });
        fxFixtureId = row.id;
      }
    }
    fx = { date: row.rateDate.toISOString().slice(0, 10), usdCny: row.rate.toString() };

    // 清理历史中断留下的 e2e 优惠行（窗口重叠会被写侧 40000 拒绝）
    await prisma.modelPrice.deleteMany({ where: { modelId, sourceType: "PROMOTION", notes: { startsWith: "e2e-promotion-billing-" } } });

    admin = await pwRequest.newContext({ baseURL: BASE_URL });
    const login = await admin.post("/api/v1/auth/login", { data: ADMIN });
    expect(login.status(), "admin 登录").toBe(200);
    payer = await pwRequest.newContext({ baseURL: BASE_URL });
    broke = await pwRequest.newContext({ baseURL: BASE_URL });
    const payerId = await registerUser(payer, "payer");
    await registerUser(broke, "broke");
    // 充值：生产构建下 mock-pay 渠道恒关（NODE_ENV=production 内联 →「支付渠道尚未接入」），
    // 改走管理端调账 API-wallets/adjust（billingService.adjust，ledger ADJUST 单录）为付费用户入账 ¥55.00
    const wallet = await prisma.wallet.findUnique({ where: { userId: payerId }, select: { id: true } });
    expect(wallet, "注册应建钱包").toBeTruthy();
    const adj = await admin.post("/api/v1/admin/wallets/adjust", {
      data: { walletId: wallet.id, amountMinor: "5500", note: `${NOTE} 充值夹具`, idempotencyKey: `${NOTE}-topup`.slice(0, 64) },
    });
    expect(adj.status(), await adj.text()).toBe(200);
    ok(await adj.json());
  });

  test.afterAll(async () => {
    if (promotionId) await admin?.delete(`/api/v1/admin/prices/promotions/${promotionId}`).catch(() => undefined);
    if (prisma) {
      await prisma.modelPrice.deleteMany({ where: { modelId, sourceType: "PROMOTION", notes: NOTE } }).catch(() => undefined);
      if (fxFixtureId) await prisma.fxDailyRate.delete({ where: { id: fxFixtureId } }).catch(() => undefined);
      await prisma.$disconnect().catch(() => undefined);
    }
    await Promise.all([admin?.dispose(), payer?.dispose(), broke?.dispose()]);
  });

  test("优惠价 0 → 免费（U-23）：零余额也可调用；充值用户余额不变且 usage quotaMinor=0", async () => {
    const now = Date.now();
    const create = await admin.post("/api/v1/admin/prices/promotions", {
      data: {
        modelId,
        priceInput: "0",
        priceOutput: "0",
        effectiveFrom: new Date(now - 60_000).toISOString(),
        effectiveUntil: new Date(now + 15 * 60_000).toISOString(),
        notes: NOTE,
      },
    });
    expect(create.status()).toBe(200);
    const created = await create.json();
    ok(created);
    const promo = created.data.promotion ?? created.data;
    promotionId = promo.id;
    expect(promo).toMatchObject({ sourceType: "PROMOTION", isCurrent: false, priceInput: expect.stringMatching(/^0(\.0+)?$/) });

    // U-23=B：免费模型任何人可用，不查额度——零余额用户直接 200
    const freeBroke = await chat(broke, `e2e-promo-free-broke-${now}`);
    expect(freeBroke.status(), await freeBroke.text()).toBe(200);
    expect(freeBroke.headers()["x-aidean-quota-minor"]).toBe("0");
    expect((await walletMinor(broke)).balance).toBe(0);

    const before = await walletMinor(payer);
    balanceBefore = before.balance;
    expect(balanceBefore).toBe(5500);
    const res = await chat(payer, `e2e-promo-free-payer-${now}`);
    expect(res.status(), await res.text()).toBe(200);
    expect(res.headers()["x-aidean-billing-path"]).toBe("PLATFORM");
    expect(res.headers()["x-aidean-quota-minor"]).toBe("0");

    const after = await walletMinor(payer);
    expect(after.balance).toBe(balanceBefore); // 余额逐分不变
    expect(after.held).toBe(0); // 免费不预扣

    const usage = await (await payer.get("/api/v1/user/usage?page=1&pageSize=20")).json();
    ok(usage);
    expect(usage.data.total).toBe(1);
    expect(usage.data.items[0]).toMatchObject({ model: MODEL_CODE, billingPath: "PLATFORM" });
    expect(Math.round(Number(usage.data.items[0].quotaYuan) * 100)).toBe(0);
    expect(usage.data.items[0].promptTokens).toBeGreaterThan(0);

    // DB 取证：usage_log 该条 quota_minor = 0
    const log = await prisma.usageLog.findFirst({ where: { requestId: `e2e-promo-free-payer-${now}` }, select: { quotaMinor: true } });
    expect(log, "usage_log 应落库").toBeTruthy();
    expect(String(log.quotaMinor)).toBe("0");

    const ledger = await (await payer.get("/api/v1/billing/ledger?page=1&pageSize=20")).json();
    ok(ledger);
    const entries = ledger.data.groups.flatMap((g: { entries: Array<{ entryType: string }> }) => g.entries);
    expect(entries.filter((e: { entryType: string }) => e.entryType === "CONSUME")).toHaveLength(0);
  });

  test("删除优惠 → 恢复原价：按归一原价逐分扣费，钱包/流水/usage 一致；零余额用户不再放行", async () => {
    expect(promotionId, "上一用例应已建优惠").toBeTruthy();
    const del = await admin.delete(`/api/v1/admin/prices/promotions/${promotionId}`);
    expect(del.status()).toBe(200);
    ok(await del.json());
    promotionId = null;

    const current = await prisma.modelPrice.findFirst({
      where: { modelId, isCurrent: true, sourceType: { not: "PROMOTION" } },
      orderBy: { effectiveFrom: "desc" },
      select: { priceInput: true, priceOutput: true, billingCurrency: true, billingUnit: true },
    });
    expect(current, "Claude 3.7 Sonnet 应有当前价").toBeTruthy();

    const requestId = `e2e-promo-paid-${Date.now()}`;
    const res = await chat(payer, requestId);
    expect(res.status(), await res.text()).toBe(200);
    expect(res.headers()["x-aidean-billing-path"]).toBe("PLATFORM");
    const quotaMinor = Number(res.headers()["x-aidean-quota-minor"]);
    expect(quotaMinor).toBeGreaterThan(0);

    // 逐分复算：原价（billing 原币原单位）→ 归一 CNY/百万 Token（当日汇率快照）→ calcCharge × 站点计费规则
    const log = await prisma.usageLog.findFirst({
      where: { requestId },
      select: { promptTokens: true, completionTokens: true, cachedTokens: true, quotaMinor: true, stationId: true },
    });
    expect(log, "usage_log 应落库").toBeTruthy();
    expect(Number(log.cachedTokens ?? 0)).toBe(0); // mock 上游无缓存命中 → TASK-080 缓存价分支不触发
    const rule = await prisma.stationBillingRule.findUnique({ where: { stationId: log.stationId } });
    const norm = (v: unknown) =>
      normalizeUnitPrice({
        value: String(v),
        sourceCurrency: String(current.billingCurrency ?? "CNY"),
        sourceUnit: String(current.billingUnit ?? "per_million_tokens"),
        targetCurrency: "CNY",
        fx,
      }).value;
    const markupRate = Number(rule?.markupRate ?? 1);
    const tokenMultiplier = Number(rule?.tokenMultiplier ?? 1);
    const expected =
      calcCharge({ pricePerMillionToken: Number(norm(current.priceInput)), tokens: Number(log.promptTokens), markupRate, tokenMultiplier }) +
      calcCharge({ pricePerMillionToken: Number(norm(current.priceOutput)), tokens: Number(log.completionTokens), markupRate, tokenMultiplier });
    expect(BigInt(quotaMinor)).toBe(expected);
    expect(String(log.quotaMinor)).toBe(String(expected));

    const after = await walletMinor(payer);
    expect(after.balance).toBe(balanceBefore - quotaMinor);
    expect(after.held).toBe(0);

    const usage = await (await payer.get("/api/v1/user/usage?page=1&pageSize=20")).json();
    ok(usage);
    expect(usage.data.total).toBe(2);
    const paid = usage.data.items.find((i: { quotaYuan: string }) => Math.round(Number(i.quotaYuan) * 100) > 0);
    expect(Math.round(Number(paid.quotaYuan) * 100)).toBe(quotaMinor);

    const ledger = await (await payer.get("/api/v1/billing/ledger?page=1&pageSize=20")).json();
    ok(ledger);
    const consumes = ledger.data.groups
      .flatMap((g: { entries: Array<{ entryType: string; amountYuan: string; direction: string }> }) => g.entries)
      .filter((e: { entryType: string }) => e.entryType === "CONSUME");
    expect(consumes).toHaveLength(1);
    expect(consumes[0].direction).toBe("DEBIT");
    expect(Math.round(Number(consumes[0].amountYuan) * 100)).toBe(quotaMinor);

    // 原价恢复后零余额用户无法再走 PLATFORM（余额不足 → 无可用付费路径，不再免费放行）
    const brokeRes = await chat(broke, `e2e-promo-paid-broke-${Date.now()}`);
    expect(brokeRes.status()).not.toBe(200);
    expect((await walletMinor(broke)).balance).toBe(0);
  });
});
