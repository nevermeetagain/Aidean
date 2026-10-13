/**
 * rebuild-admin-console-and-harden-auth 浏览器取证脚本（Phase 5 收官）。
 *
 * 用途（checklist 2-3 / 4-1 / 1-2 口径复核）：
 * 1) /admin 六管理域页浅色化截图（users/models/vendors/products/packages/redemptions）；
 * 2) PRO 徽章三态：匿名无徽章 / PRO「Pro」蓝徽章 / NORMAL「普通」灰徽章（Header 用户区）；
 * 3) 模型下架 SSR 即时消失验证（PATCH isActive=false → /models 不含 → 还原）。
 *
 * 前置：:3000 standalone 运行中；admin@aidean.com / Admin123!@# 有效；
 *       test@aidean.com / Test123!@# 有效（tier 会被临时改 PRO 再还原）。
 * 运行：pnpm exec node apps/web/scripts/_admin_evidence.cjs
 */
const { chromium } = require("@playwright/test");
const path = require("path");
const fs = require("fs");

const BASE = "http://localhost:3000";
const EV = path.resolve("docs/specs/rebuild-admin-console-and-harden-auth/evidence");
const ADMIN = { email: "admin@aidean.com", pass: "Admin123!@#" };
const TEST = { email: "test@aidean.com", pass: "Test123!@#" };

async function loginViaApi(ctx, cred) {
  // 走标准登录 API 拿 HttpOnly cookie（比表单交互更稳，避免未水合原生提交）
  const res = await ctx.request.post(`${BASE}/api/v1/auth/login`, {
    data: { email: cred.email, password: cred.pass },
  });
  const body = await res.json().catch(() => null);
  if (res.status() !== 200 || !body || body.code !== 0) {
    throw new Error(`login api failed ${res.status()} ${JSON.stringify(body)}`);
  }
}

async function logout(ctx) {
  await ctx.request.post(`${BASE}/api/v1/auth/logout`).catch(() => {});
  // 显式清掉 context 中的会话 cookie，避免跨态污染
  const cookies = await ctx.cookies();
  await ctx.clearCookies();
}

async function shot(page, name) {
  await page.waitForTimeout(800);
  const file = path.join(EV, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log("SHOT", file);
}

(async () => {
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "zh-CN" });
  const page = await ctx.newPage();

  // ============ 1. admin 登录 + 六管理域页截图 ============
  await loginViaApi(ctx, ADMIN);
  console.log("ADMIN LOGIN OK (api)");
  const adminPages = ["users", "models", "vendors", "products", "packages", "redemptions"];
  for (const p of adminPages) {
    await page.goto(`${BASE}/admin/${p}`, { waitUntil: "networkidle" });
    await shot(page, `admin-${p}`);
  }
  // 概览 + configs 一并取证（口径复核）
  await page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
  await shot(page, "admin-overview");
  await page.goto(`${BASE}/admin/configs`, { waitUntil: "networkidle" });
  await shot(page, "admin-configs");
  await page.goto(`${BASE}/admin/login`, { waitUntil: "networkidle" });
  await shot(page, "admin-login-page");

  // ============ 2. 模型下架 SSR 验证（2-3）============
  const modelsRes = await ctx.request.get(`${BASE}/api/v1/admin/models?page=1&pageSize=8`);
  const modelsData = await modelsRes.json();
  const target = modelsData.data.models.find((m) => m.isActive === true);
  if (!target) { console.log("NO ACTIVE MODEL FOUND, skip 2-3"); }
  else {
    console.log("2-3 target model:", target.modelCode);
    // 下架
    const down = await ctx.request.fetch(`${BASE}/api/v1/admin/models/${target.id}`, {
      method: "PATCH", data: { isActive: false },
    });
    console.log("PATCH down status:", down.status());
    // 访问 /models SSR 检查消失
    const modelsHtml = await (await ctx.request.get(`${BASE}/models`)).text();
    const gone = !modelsHtml.includes(target.modelCode);
    console.log("2-3 model gone from /models SSR:", gone);
    await page.goto(`${BASE}/models`, { waitUntil: "networkidle" });
    await shot(page, "models-after-unpublish");
    // 还原
    const up = await ctx.request.fetch(`${BASE}/api/v1/admin/models/${target.id}`, {
      method: "PATCH", data: { isActive: true },
    });
    console.log("PATCH restore status:", up.status());
    const html2 = await (await ctx.request.get(`${BASE}/models`)).text();
    console.log("2-3 model back on /models:", html2.includes(target.modelCode));
  }

  // ============ 3. PRO 徽章三态（4-1）============
  // 3a. 取 test 用户 id
  const usersRes = await ctx.request.get(`${BASE}/api/v1/admin/users?q=test&pageSize=5`);
  const usersData = await usersRes.json();
  const testUser = usersData.data.users.find((u) => u.email === TEST.email);
  if (!testUser) { console.log("TEST USER NOT FOUND, skip 4-1"); }
  else {
    console.log("test user id:", testUser.id, "tier:", testUser.tier);
    // 3b. 临时升 PRO
    const promote = await ctx.request.fetch(`${BASE}/api/v1/admin/users/${testUser.id}`, {
      method: "PATCH", data: { tier: "PRO" },
    });
    console.log("promote PRO status:", promote.status());
    // 3c. 登出 admin → 登录 test（PRO）→ 首页 Header 徽章
    await logout(ctx);
    await loginViaApi(ctx, TEST);
    await page.goto(`${BASE}/models`, { waitUntil: "networkidle" });
    await shot(page, "tier-pro-badge");
    // 3d. 改回 NORMAL → 再看（「普通」灰徽章）
    const demote = await ctx.request.fetch(`${BASE}/api/v1/admin/users/${testUser.id}`, {
      method: "PATCH", data: { tier: "NORMAL" },
    });
    console.log("demote NORMAL status:", demote.status());
    await logout(ctx);
    await loginViaApi(ctx, TEST);
    await page.goto(`${BASE}/models`, { waitUntil: "networkidle" });
    await shot(page, "tier-normal-badge");
    await logout(ctx);
    // 3e. 匿名态（新 context 无 cookie）→ 无徽章
    const anonCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const anonPage = await anonCtx.newPage();
    await anonPage.goto(`${BASE}/models`, { waitUntil: "networkidle" });
    await anonPage.screenshot({ path: path.join(EV, "tier-anon.png"), fullPage: false });
    console.log("SHOT", path.join(EV, "tier-anon.png"));
    await anonCtx.close();
  }

  await browser.close();
  console.log("EVIDENCE DONE");
})().catch((e) => { console.error("EVIDENCE FAILED:", e.message); process.exit(1); });
