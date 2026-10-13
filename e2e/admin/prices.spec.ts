/**
 * Admin 模型定价 e2e（S7.1 CRUD 孤岛激活）
 *
 * 前置：admin-setup 以 admin@aidean.com（SUPER_ADMIN，通配 *，含 admin.models.write）登录 → storageState。
 * 断言点（只读呈现，绝不实际改价，避免污染爬虫/前台定价夹具）：
 *  1) /admin/prices：标题 + 列表表头；SUPER_ADMIN 可写 → 露出「操作」列。
 *  2) GET /api/v1/admin/prices → 信封 code=0（当前价投影）。
 *  3) 后端逐接口强制（未登录）：清 Cookie 后 GET → 401。
 */
import { test, expect } from "../fixtures";

test.describe("Admin 模型定价（S7.1）", () => {
  test("冷启动 /admin/prices：表头齐全 + 可写露出「操作」列", async ({ page }) => {
    await page.goto("/admin/prices");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: "模型定价" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "模型" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "操作" })).toBeVisible();
  });

  test("只读 API：GET /api/v1/admin/prices → code 0", async ({ page }) => {
    const res = await page.request.get("/api/v1/admin/prices?limit=20");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(Array.isArray(body.data.items)).toBeTruthy();
  });

  test("后端逐接口强制：清 Cookie 后 GET prices → 401", async ({ context, page }) => {
    await context.clearCookies();
    const res = await page.request.get("/api/v1/admin/prices");
    expect(res.status()).toBe(401);
  });
});
