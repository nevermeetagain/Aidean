// B11-06 运行态网络失败计数探针（Playwright library，headless chromium）。
// 用法：BASE=http://localhost:3061 node netfail-probe.mjs
// 场景：
//   guest      —— 游客整页访问 / /models /pricing /ladder（验收 1：401 计数 = 0）
//   guest-spa  —— 游客首页起，经头部导航客户端跳转（SPA 内不重探）
//   stale      —— 正控：携带无效 aidean_token（模拟失效会话）→ 证明计数器能数到 401（防工具假零）
//   authed     —— 真登录（test@aidean.com）后访问四页：auth/me 每次整页加载 ≤1、favorites 200、401=0
//   logout     —— 登录后经 UserMenu 退出 → 回首页后 auth/me/favorites 零请求、显示「登录」
import { chromium } from "@playwright/test";

const BASE = process.env.BASE ?? "http://localhost:3061";
const PAGES = ["/", "/models", "/pricing", "/ladder"];
const out = [];
const log = (o) => {
  out.push(o);
  console.log(JSON.stringify(o));
};

function instrument(page, bucket) {
  page.on("response", (res) => {
    const u = new URL(res.url());
    if (!u.pathname.startsWith("/api/")) return;
    bucket.api.push({ path: u.pathname + u.search, status: res.status() });
    if (res.status() >= 400) bucket.fail.push(`${res.status()} ${res.request().method()} ${u.pathname}${u.search}`);
  });
  page.on("requestfailed", (req) => {
    const u = new URL(req.url());
    const rsc = u.searchParams.has("_rsc") || req.headers()["rsc"] === "1" ? " [rsc]" : "";
    const pf = req.headers()["next-router-prefetch"] ? " [prefetch]" : "";
    bucket.fail.push(`FAILED(${req.failure()?.errorText}) ${req.method()} ${u.pathname}${rsc}${pf}`);
  });
  page.on("console", (m) => {
    if (m.type() === "error") bucket.console.push(m.text().slice(0, 200));
  });
}
const newBucket = () => ({ api: [], fail: [], console: [] });
const count = (b, p) => b.api.filter((a) => a.path.startsWith(p)).length;
const c401 = (b) => b.fail.filter((f) => f.startsWith("401")).length;

async function settle(page) {
  await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => undefined);
  await page.waitForTimeout(1500);
}

const browser = await chromium.launch();
try {
  // ---- guest ----
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    let total401 = 0;
    for (const p of PAGES) {
      const b = newBucket();
      instrument(page, b);
      const resp = await page.goto(BASE + p, { waitUntil: "load", timeout: 90_000 });
      await settle(page);
      page.removeAllListeners("response");
      page.removeAllListeners("requestfailed");
      page.removeAllListeners("console");
      const hint = (await ctx.cookies()).some((c) => c.name === "aidean_session_hint");
      const loginLink = await page.locator('header a[href="/login"]').count();
      total401 += c401(b);
      log({
        scenario: "guest",
        page: p,
        http: resp?.status(),
        authMe: count(b, "/api/v1/auth/me"),
        favorites: count(b, "/api/v1/user/favorites"),
        net401: c401(b),
        netFailures: b.fail,
        consoleErrors: b.console.length,
        hintCookie: hint,
        loginLinkVisible: loginLink,
      });
    }
    log({ scenario: "guest", summary: true, total401 });
    await ctx.close();
  }

  // ---- guest-spa ----
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const b = newBucket();
    instrument(page, b);
    await page.goto(BASE + "/", { waitUntil: "load", timeout: 90_000 });
    await settle(page);
    const visited = [];
    for (const p of ["/models", "/pricing", "/ladder"]) {
      const link = page.locator(`header a[href="${p}"]`).first();
      if ((await link.count()) === 0) {
        visited.push(`${p}:no-link`);
        continue;
      }
      // 头部导航项位于下拉/被首页 hero 覆盖时 pointer 点击会被拦截：直接派发 click 事件（React/Next Link 根委托照常接管为客户端跳转）
      await link.dispatchEvent("click");
      await page.waitForURL((u) => u.pathname === p, { timeout: 60_000 }).catch(() => undefined);
      await settle(page);
      visited.push(new URL(page.url()).pathname);
    }
    log({
      scenario: "guest-spa",
      visited,
      authMe: count(b, "/api/v1/auth/me"),
      favorites: count(b, "/api/v1/user/favorites"),
      net401: c401(b),
      netFailures: b.fail,
    });
    await ctx.close();
  }

  // ---- stale (positive control) ----
  {
    const ctx = await browser.newContext();
    await ctx.addCookies([{ name: "aidean_token", value: "not-a-jwt", url: BASE }]);
    const page = await ctx.newPage();
    const b = newBucket();
    instrument(page, b);
    for (const p of PAGES) {
      await page.goto(BASE + p, { waitUntil: "load", timeout: 90_000 });
      await settle(page);
    }
    log({
      scenario: "stale-cookie(positive-control)",
      pages: PAGES.length,
      authMe: count(b, "/api/v1/auth/me"),
      refresh: count(b, "/api/v1/auth/refresh"),
      favorites: count(b, "/api/v1/user/favorites"),
      net401: c401(b),
      netFailures: b.fail,
    });
    await ctx.close();
  }

  // ---- authed + logout ----
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const lb = newBucket();
    instrument(page, lb);
    await page.goto(BASE + "/login", { waitUntil: "load", timeout: 90_000 });
    await settle(page);
    await page.fill('input[name="email"]', "test@aidean.com");
    await page.fill('input[name="password"]', "Test123!@#");
    await Promise.all([
      page.waitForURL((u) => u.pathname.startsWith("/user/console"), { timeout: 90_000 }).catch(() => undefined),
      page.locator('[data-testid="auth-form"] button[type="submit"]').click(),
    ]);
    await settle(page);
    page.removeAllListeners("response");
    page.removeAllListeners("requestfailed");
    page.removeAllListeners("console");
    log({ scenario: "login", landed: new URL(page.url()).pathname, net401: c401(lb), netFailures: lb.fail });

    let total401 = 0;
    for (const p of PAGES) {
      const b = newBucket();
      instrument(page, b);
      await page.goto(BASE + p, { waitUntil: "load", timeout: 90_000 });
      await settle(page);
      page.removeAllListeners("response");
      page.removeAllListeners("requestfailed");
      page.removeAllListeners("console");
      total401 += c401(b);
      const fav = b.api.filter((a) => a.path.startsWith("/api/v1/user/favorites")).map((a) => a.status);
      const me = b.api.filter((a) => a.path.startsWith("/api/v1/auth/me")).map((a) => a.status);
      log({
        scenario: "authed",
        page: p,
        authMeStatuses: me,
        favoritesStatuses: fav,
        net401: c401(b),
        netFailures: b.fail,
        userMenu: await page.locator('summary[aria-label="用户菜单"]').count(),
      });
    }
    log({ scenario: "authed", summary: true, total401 });

    // logout via UserMenu
    const b = newBucket();
    await page.locator('summary[aria-label="用户菜单"]').click();
    instrument(page, b);
    await Promise.all([
      page.waitForURL((u) => u.pathname === "/", { timeout: 60_000 }).catch(() => undefined),
      page.getByRole("button", { name: "退出登录" }).click(),
    ]);
    await page.waitForTimeout(500);
    await settle(page);
    const hint = (await ctx.cookies()).some((c) => c.name === "aidean_session_hint");
    log({
      scenario: "logout",
      landed: new URL(page.url()).pathname,
      authMeAfterLogout: count(b, "/api/v1/auth/me"),
      favoritesAfterLogout: count(b, "/api/v1/user/favorites"),
      net401: c401(b),
      netFailures: b.fail,
      hintCookie: hint,
      loginLinkVisible: await page.locator('header a[href="/login"]').count(),
    });
    await ctx.close();
  }
} finally {
  await browser.close();
}
