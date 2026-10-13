/**
 * Admin OIDC 客户端 e2e（S7.3 接入断链）
 *
 * 前置：admin-setup 以 admin@aidean.com（SUPER_ADMIN，含 admin.configs.write）登录 → storageState。
 * 断言点（只读呈现，绝不实际改客户端，避免影响 dev 环境 SSO 登录夹具）：
 *  1) /admin/oidc-clients：标题 + 可写露出「操作」列。
 *  2) GET /api/v1/admin/oidc-clients → 信封 code=0，且投影绝不含 clientSecretHash。
 *  3) 后端逐接口强制（未登录）：清 Cookie 后 GET → 401。
 */
import { test, expect } from "../fixtures";

test.describe("Admin OIDC 客户端（S7.3）", () => {
  test("冷启动 /admin/oidc-clients：标题 + 可写露出「操作」列", async ({ page }) => {
    await page.goto("/admin/oidc-clients");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: "OIDC 客户端" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "操作" })).toBeVisible();
  });

  test("只读 API：GET oidc-clients → code 0，投影不含 clientSecretHash", async ({ page }) => {
    const res = await page.request.get("/api/v1/admin/oidc-clients");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(Array.isArray(body.data.clients)).toBeTruthy();
    for (const c of body.data.clients) {
      expect("clientSecretHash" in c).toBe(false);
    }
  });

  test("后端逐接口强制：清 Cookie 后 GET oidc-clients → 401", async ({ context, page }) => {
    await context.clearCookies();
    const res = await page.request.get("/api/v1/admin/oidc-clients");
    expect(res.status()).toBe(401);
  });
});
