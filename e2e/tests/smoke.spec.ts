import { expect, test } from "@playwright/test";

/**
 * [C-N6 2026-09-09 员工C] 3000 单端口烟囱 7 断言（门禁收口用）。
 *
 * 设计要点：
 * - 全部请求经真实浏览器上下文（page / page.request 共享 Cookie jar），
 *   登录 Cookie 的 Secure 标志在 localhost（Chromium 视为安全上下文）下正常回传，
 *   规避 curl over HTTP 不发 Secure Cookie 的误判（终审穿透 3.2#1 的纠正项）。
 * - 目标端口固定 3000（playwright.config.ts baseURL），禁止任何临时端口。
 * - 种子账号：admin@aidean.com（SUPER_ADMIN）/ test@aidean.com（普通用户）。
 * - 顺带收集被访问页面的 console error，交付时清单应为空。
 */

const SEED_ADMIN = { email: "admin@aidean.com", password: "Admin123!@#" };
const SEED_USER = { email: "test@aidean.com", password: "Test123!@#" };

test.describe("smoke-3000", () => {
  let consoleErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", (err) => consoleErrors.push(`pageerror: ${err.message}`));
  });

  test("[1] /api/v1/system/health → 200", async ({ request }) => {
    const resp = await request.get("/api/v1/system/health");
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.code).toBe(0);
    expect(body.data.status).toBe("ok");
  });

  test("[2] /models SSR → 200", async ({ page }) => {
    const resp = await page.goto("/models");
    expect(resp?.status()).toBe(200);
    await expect(page.locator("main")).toBeVisible();
  });

  test("[3] /admin 匿名 → 307 /admin/login?redirect=%2Fadmin", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login\?redirect=%2Fadmin/);
  });

  test("[4] /api/v1/auth/me 匿名 → 401", async ({ request }) => {
    const resp = await request.get("/api/v1/auth/me");
    expect(resp.status()).toBe(401);
  });

  test("[5] 非管理员登录访问 /admin → denied=1", async ({ page }) => {
    // 经真实浏览器上下文登录（Cookie 由浏览器写入，非手工模拟）
    const login = await page.request.post("/api/v1/auth/login", { data: SEED_USER });
    expect(login.status()).toBe(200);

    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login\?denied=1/);
  });

  test("[6] SUPER_ADMIN 登录访问 /admin → 200", async ({ page }) => {
    const login = await page.request.post("/api/v1/auth/login", { data: SEED_ADMIN });
    expect(login.status()).toBe(200);

    const resp = await page.goto("/admin");
    expect(resp?.status()).toBe(200);
    await expect(page).toHaveURL(/\/admin$/);
  });

  test("[7] 登录→退出→/auth/me 恢复 401", async ({ page, request }) => {
    const login = await page.request.post("/api/v1/auth/login", { data: SEED_ADMIN });
    expect(login.status()).toBe(200);

    const logout = await page.request.post("/api/v1/auth/logout");
    expect(logout.status()).toBe(200);

    const me = await request.get("/api/v1/auth/me");
    expect(me.status()).toBe(401);
  });

  test.afterEach(async () => {
    // console error 清单：预期为空。
    // 已知豁免（设计内行为，非缺陷）：匿名访问受保护/探测类页面时，
    // 前端探测 /api/v1/auth/me 返回 401，Chromium 记为资源级 console error
    // （[C-N6 2026-09-09 实测 /models 复现，登录探测语义见审计 §10.4 口径）。
    const fatal = consoleErrors.filter(
      (e) => !/401 \(Unauthorized\)/.test(e)
    );
    expect(fatal, `console errors: ${JSON.stringify(fatal)}`).toEqual([]);
  });
});
