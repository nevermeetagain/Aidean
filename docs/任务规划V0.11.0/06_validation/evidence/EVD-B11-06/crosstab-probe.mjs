// B11-06 运行态跨标签同步探针：同一浏览器上下文两个标签页，A 登出 → B 不刷新即切为「登录」入口且零 auth/me 请求
import { chromium } from "@playwright/test";
const BASE = process.env.BASE ?? "http://localhost:3061";
const browser = await chromium.launch();
try {
  const ctx = await browser.newContext();
  const login = await ctx.request.post(`${BASE}/api/v1/auth/login`, { data: { email: "test@aidean.com", password: "Test123!@#" } });
  console.log(JSON.stringify({ step: "api-login", status: login.status() }));
  const a = await ctx.newPage();
  const b = await ctx.newPage();
  await a.goto(BASE + "/pricing", { waitUntil: "networkidle" });
  await b.goto(BASE + "/models", { waitUntil: "networkidle" });
  const bMenuBefore = await b.locator('summary[aria-label="用户菜单"]').count();
  const bApi = [];
  b.on("request", (r) => { const p = new URL(r.url()).pathname; if (p.startsWith("/api/")) bApi.push(p); });
  await a.locator('summary[aria-label="用户菜单"]').click();
  await a.getByRole("button", { name: "退出登录" }).click();
  await a.waitForURL((u) => u.pathname === "/", { timeout: 30000 }).catch(() => undefined);
  await b.locator('header a[href="/login"]').first().waitFor({ timeout: 10000 }).catch(() => undefined);
  console.log(JSON.stringify({
    step: "crosstab-logout",
    bUserMenuBefore: bMenuBefore,
    bUserMenuAfter: await b.locator('summary[aria-label="用户菜单"]').count(),
    bLoginLinkAfter: await b.locator('header a[href="/login"]').count(),
    bAuthMeRequestsAfterLogout: bApi.filter((p) => p === "/api/v1/auth/me").length,
    bFavoritesRequestsAfterLogout: bApi.filter((p) => p.startsWith("/api/v1/user/favorites")).length,
    bReloaded: false,
  }));
} finally {
  await browser.close();
}
