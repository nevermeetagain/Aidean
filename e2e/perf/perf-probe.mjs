// 性能探针（非 e2e spec，不计入基线）——真实 Chromium 访问 :3000，记录：
//  A. 页面首响：TTFB（requestStart→responseStart）/ dcl / load / FCP / LCP
//  B. 交互模块首次响应：从「点击动作」到「对应 API 响应到达」或「面板/图表可见」的毫秒数
//  C. 冷/热对比：每轮新 context（冷）；同 context 二次访问（热）
// 用法：node e2e/perf/perf-probe.mjs [iterations=3] [label=baseline]
// 输出：stdout 聚合表（中位/最小/最大） + e2e/perf/results/<label>-<ts>.json
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const BASE = process.env.PERF_BASE || "http://127.0.0.1:3000";
const ITER = Number(process.argv[2] || 3);
const LABEL = process.argv[3] || "baseline";
const USER = { email: "test@aidean.com", password: "Test123!@#", admin: "admin@aidean.com", adminPass: "Admin123!@#" };
const HERE = dirname(fileURLToPath(import.meta.url));

const samples = []; // {key, iter, ms|fields...}
const push = (key, iter, val) => samples.push({ key, iter, ...val });

const LCP_INIT = `window.__lcp=0;try{new PerformanceObserver(l=>{const e=l.getEntries();window.__lcp=e[e.length-1].startTime}).observe({type:'largest-contentful-paint',buffered:true})}catch(e){}`;

/** 页面首响度量：goto→load，采集 navigation timing + FCP/LCP */
async function navMetric(ctx, url, key, iter, opts = {}) {
  const page = opts.page || (await ctx.newPage());
  await page.addInitScript(LCP_INIT);
  const t0 = Date.now();
  const resp = await page.goto(`${BASE}${url}`, { waitUntil: "domcontentloaded", timeout: 30000 });
  const dcl = Date.now() - t0;
  let load = null;
  try { await page.waitForLoadState("load", { timeout: 20000 }); load = Date.now() - t0; } catch {}
  const perf = await page.evaluate(() => {
    const n = performance.getEntriesByType("navigation")[0] || {};
    const fcp = performance.getEntriesByName("first-contentful-paint")[0];
    return {
      ttfb: n.responseStart && n.requestStart ? Math.round(n.responseStart - n.requestStart) : null,
      server: n.responseStart && n.fetchStart ? Math.round(n.responseStart - n.fetchStart) : null,
      fcp: fcp ? Math.round(fcp.startTime) : null,
      lcp: Math.round(window.__lcp || 0) || null,
    };
  });
  push(key, iter, { type: "nav", status: resp ? resp.status() : null, dcl, load, ...perf, wall: Date.now() - t0 });
  if (opts.keepPage) return page;
  if (!opts.reusePage) await page.close();
  return page;
}

/** 交互首次响应：注册等待 → 动作 → 等结果，计毫秒 */
async function act(page, key, iter, action, waiter, label2) {
  const t0 = Date.now();
  const wp = waiter ? waiter() : null;
  await action();
  let ok = true;
  if (wp) { try { await wp; } catch { ok = false; } }
  push(`act:${key}${label2 ? `/${label2}` : ""}`, iter, { type: "act", ms: Date.now() - t0, ok });
}

// 全局响应收集器：面板可能在页面加载时就发起 API（keep-mounted 设计），
// 不能只靠「点击后 waitForResponse」——记录每个关键 API 的完成时刻，事后按真实锚点计时。
const WATCH = ["/api/v1/user/api-keys", "/api/v1/user/station-keys", "/api/v1/user/custom-channels", "/api/v1/user/usage/stats", "/api/v1/user/quota-usage"];
function attachCollector(page, store) {
  page.on("response", (r) => {
    const u = r.url();
    for (const k of WATCH) if (u.includes(k) && !store[k]) store[k] = { end: Date.now(), status: r.status() }; // 只记首次
  });
}

async function run() {
  const browser = await chromium.launch();
  for (let it = 1; it <= ITER; it++) {
    // ---- 用户视角 ----
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.addInitScript(LCP_INIT);

    await navMetric(ctx, "/login", "nav:/login", it, { reusePage: true, page });
    // 登录：hydration 就绪后点击，锚定 auth API（e2e 教训同款）
    await page.waitForSelector('input[name="email"]');
    await page.locator('input[name="email"]').fill(USER.email);
    await page.locator('input[name="password"]').fill(USER.password);
    const btn = page.getByRole("button", { name: /登\s*录/ });
    await btn.waitFor({ state: "visible" });
    await act(page, "登录提交→auth响应", it,
      () => btn.click(),
      () => page.waitForResponse((r) => r.url().includes("/api/v1/auth/login"), { timeout: 15000 }));

    const respStore = {};
    attachCollector(page, respStore);
    const consoleT0 = Date.now();
    await navMetric(ctx, "/user/console", "nav:/user/console", it, { reusePage: true, page });

    // 七个 tab 首次激活（懒挂载）：RSC 面板计「点击→可见」，client 取数面板另计 API 首响
    const tabs = [
      ["模型配置", "console-panel-config", null],
      ["免费额度", "console-panel-quotas", null],
      ["平台密钥", "console-panel-platformKeys", "/api/v1/user/api-keys"],
      ["自有密钥", "console-panel-stationKeys", "/api/v1/user/station-keys"],
      ["调用测试台", "console-panel-playground", null],
      ["统计报表", "console-panel-stats", "/api/v1/user/usage/stats"],
      ["自定义渠道", "console-panel-channels", "/api/v1/user/custom-channels"],
    ];
    const clickMap = {};
    for (const [tab, testid, api] of tabs) {
      const sel = page.locator(`[data-testid="${testid}"]`);
      await act(page, `tab→${tab}可见`, it,
        () => { clickMap[tab] = Date.now(); return page.getByRole("tab", { name: tab }).click(); },
        () => sel.waitFor({ state: "visible", timeout: 20000 }));
      if (testid === "console-panel-stats") {
        // echarts 懒加载 + 首渲（dynamic import 首访最贵）
        await act(page, "tab→统计图表canvas", it, async () => {},
          () => page.locator('[data-testid="usage-stats-panel"] canvas').first().waitFor({ state: "visible", timeout: 20000 }), "chart");
        // range 切换（swr 换 key 取新数）
        await act(page, "stats切7d→api", it,
          () => page.getByRole("button", { name: "近 7 日" }).click(),
          () => page.waitForResponse((r) => r.url().includes("usage/stats?range=7d"), { timeout: 20000 }));
        await act(page, "stats切90d→api", it,
          () => page.getByRole("button", { name: "近 90 日" }).click(),
          () => page.waitForResponse((r) => r.url().includes("usage/stats?range=90d"), { timeout: 20000 }));
      }
    }
    // API 首响按真实锚点计时：完成时刻晚于该 tab 点击 → 锚=点击（挂载即取数）；
    // 早于点击 → 该面板 API 在控制台页面加载阶段已发出（keep-mounted 预取），锚=页面加载。
    for (const [tab, testid, api] of tabs) {
      if (!api) continue;
      const rec = respStore[api];
      const short = api.split("/").pop();
      if (!rec) { push(`api首响:${short}`, it, { type: "api", ms: null, ok: false }); continue; }
      const clickedAt = clickMap[tab];
      const anchor = clickedAt && rec.end >= clickedAt ? clickedAt : consoleT0;
      push(`api首响:${short}${anchor === consoleT0 ? "(加载期预取)" : ""}`, it, { type: "api", ms: rec.end - anchor, ok: rec.status < 400, status: rec.status });
    }

    // 热访问：同 context 二访（chunk 已缓存、swr 已缓存、服务端 RSC/DB 热）
    await navMetric(ctx, "/user/console", "warm:nav:/user/console", it, { reusePage: true, page });
    await navMetric(ctx, "/user/balance", "nav:/user/balance", it, { reusePage: true, page });
    await navMetric(ctx, "/user/balance", "warm:nav:/user/balance", it, { reusePage: true, page });
    await navMetric(ctx, "/models", "nav:/models(天梯)", it, { reusePage: true, page });
    await navMetric(ctx, "/models", "warm:nav:/models(天梯)", it, { reusePage: true, page });
    await navMetric(ctx, "/", "nav:/(首页)", it, { reusePage: true, page });
    await ctx.close();

    // ---- 管理端视角（新 context）----
    const actx = await browser.newContext();
    const apage = await actx.newPage();
    await apage.addInitScript(LCP_INIT);
    await navMetric(actx, "/admin/login", "nav:/admin/login", it, { reusePage: true, page: apage });
    await apage.waitForSelector('input[name="email"]');
    await apage.locator('input[name="email"]').fill(USER.admin);
    await apage.locator('input[name="password"]').fill(USER.adminPass);
    const abtn = apage.getByRole("button", { name: /登\s*录/ });
    await abtn.waitFor({ state: "visible" });
    await act(apage, "admin登录提交→auth响应", it,
      () => abtn.click(),
      () => apage.waitForResponse((r) => r.url().includes("/auth/login"), { timeout: 15000 }));
    const tA = Date.now();
    const aRespP = apage.waitForResponse((r) => /\/api\/v1\/admin\/users/.test(r.url()), { timeout: 25000 }).catch(() => null);
    await apage.goto(`${BASE}/admin/users`, { waitUntil: "domcontentloaded", timeout: 30000 });
    let loadA = null; const tl = Date.now();
    try { await apage.waitForLoadState("load", { timeout: 20000 }); loadA = Date.now() - tl; } catch {}
    const aRows = await aRespP;
    push("nav:/admin/users", it, { type: "nav", dcl: Date.now() - tA, load: loadA, listApiMs: aRows ? Date.now() - tA : null, apiOk: !!aRows });
    await navMetric(actx, "/admin/users", "warm:nav:/admin/users", it, { reusePage: true, page: apage });

    await navMetric(actx, "/admin/users", "warm:nav:/admin/users", it, { reusePage: true, page: apage });

    // ---- 管理端软导航（侧边栏 <Link> 点击 → 目标页 <h1> 可见）----
    // 这是用户抱怨的核心场景：点击 admin 侧边栏菜单，页面切换延迟。
    // 先回到 /admin 概览页，再逐个点击侧边栏链接测软导航。
    await apage.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await apage.waitForLoadState("load", { timeout: 20000 }).catch(() => {});

    // admin 侧边栏导航测试（h1 文本与路由映射）
    const adminSoftNavs = [
      { href: "/admin/users", h1: "用户管理" },
      { href: "/admin/models", h1: "模型管理" },
      { href: "/admin/vendors", h1: "厂商" },
      { href: "/admin/orders", h1: "订单" },
      { href: "/admin/redemptions", h1: "兑换码" },
    ];
    for (const { href, h1 } of adminSoftNavs) {
      try {
        await softNavSegmented(apage, `a[href="${href}"]`, h1, `softnav:${href}`, it);
      } catch {
        push(`softnav:${href}`, it, { type: "softnav-seg", skeletonMs: null, contentMs: null, error: true });
      }
    }

    // ---- 前台软导航（SiteHeader <Link> 点击 → 目标页 <h1> 可见）----
    // 切回前台 context 测站点导航
    const sctx = await browser.newContext();
    const spage = await sctx.newPage();
    await spage.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await spage.waitForLoadState("load", { timeout: 20000 }).catch(() => {});

    const siteSoftNavs = [
      { href: "/models", h1: "模型天梯" },
      { href: "/ladder", h1: "天梯榜" },
      { href: "/pricing", h1: "定价" },
      { href: "/providers", h1: "供应商" },
      { href: "/news", h1: "资讯" },
    ];
    for (const { href, h1 } of siteSoftNavs) {
      try {
        await softNavSegmented(spage, `a[href="${href}"]`, h1, `softnav:${href}`, it);
      } catch {
        push(`softnav:${href}`, it, { type: "softnav-seg", skeletonMs: null, contentMs: null, error: true });
      }
    }
    await sctx.close();

    await actx.close();
  }
  await browser.close();

  // ---- 聚合 ----
  const byKey = {};
  for (const s of samples) (byKey[s.key] ||= []).push(s);
  const med = (a) => { const b = [...a].sort((x, y) => x - y); return b.length ? (b.length % 2 ? b[(b.length - 1) / 2] : Math.round((b[b.length / 2 - 1] + b[b.length / 2]) / 2)) : null; };
  const agg = {};
  for (const [k, arr] of Object.entries(byKey)) {
    const row = { n: arr.length };
    for (const f of ["ttfb", "server", "dcl", "load", "fcp", "lcp", "ms", "listApiMs"]) {
      const vals = arr.map((a) => a[f]).filter((v) => typeof v === "number" && v > 0);
      if (vals.length) row[f] = { med: med(vals), min: Math.min(...vals), max: Math.max(...vals) };
    }
    agg[k] = row;
  }
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  mkdirSync(join(HERE, "results"), { recursive: true });
  writeFileSync(join(HERE, "results", `${LABEL}-${ts}.json`), JSON.stringify({ label: LABEL, iter: ITER, base: BASE, ts, samples, agg }, null, 2));
  console.log(`\n===== ${LABEL} (${ITER} iter, base=${BASE}) =====`);
  console.log("key".padEnd(34), Object.keys(agg).length ? ["ttfb", "server", "dcl", "load", "fcp", "lcp", "ms", "listApiMs"].map((f) => f.padEnd(14)).join(" ") : "");
  for (const [k, row] of Object.entries(agg)) {
    const cells = ["ttfb", "server", "dcl", "load", "fcp", "lcp", "ms", "listApiMs"].map((f) => (row[f] ? `${row[f].med}/${row[f].min}-${row[f].max}`.padEnd(14) : "-".padEnd(14)));
    console.log(k.padEnd(34), cells.join(" "));
  }
  console.log(`\nJSON: results/${LABEL}-${ts}.json`);
}

run().catch((e) => { console.error(e); process.exit(1); });

/** 软导航度量：点击 <Link> → 目标页 <h1> 可见，计毫秒。
 *  与 navMetric（page.goto 硬导航）互补——用户抱怨的「点菜单卡」就是软导航。 */
async function softNav(page, linkSelector, h1Text, key, iter) {
  const t0 = Date.now();
  await page.locator(linkSelector).click();
  await page.locator("h1", { hasText: h1Text }).first().waitFor({ state: "visible", timeout: 20000 });
  const ms = Date.now() - t0;
  push(key, iter, { type: "softnav", ms });
  return ms;
}

/** 软导航分段：skeleton 出现 → h1 可见（内容替换），分别计时 */
async function softNavSegmented(page, linkSelector, h1Text, key, iter) {
  // 预先注册 skeleton 观察
  const skeletonSeen = { time: null };
  const observer = await page.evaluateHandle(() => {
    const seen = { time: null };
    const obs = new MutationObserver(() => {
      const sk = document.querySelector('[aria-busy="true"], .animate-pulse');
      if (sk && seen.time === null) seen.time = Date.now();
    });
    obs.observe(document.body, { childList: true, subtree: true });
    return seen;
  });

  const t0 = Date.now();
  await page.locator(linkSelector).click();
  // 等 h1 可见
  await page.locator("h1", { hasText: h1Text }).first().waitFor({ state: "visible", timeout: 20000 });
  const contentMs = Date.now() - t0;
  const skTime = await page.evaluate((s) => s.time, observer);
  const skeletonMs = skTime ? skTime - t0 : null;
  push(key, iter, { type: "softnav-seg", skeletonMs, contentMs });
  return { skeletonMs, contentMs };
}
