/**
 * Admin 订单与流水处置 e2e（S6 财务全链 · 决策⑤记录体系延伸）
 *
 * 前置：admin-setup 以 admin@aidean.com（SUPER_ADMIN，通配 *，含 admin.orders.write）登录 → storageState。
 * 断言点（只读/呈现，绝不实际改单，避免污染 dev 账本夹具）：
 *  1) /admin/orders：标题 + 三类型 Tab；充值/套餐 Tab 下露出「处置」列表头（canWrite 生效）。
 *  2) 切到「账本流水」Tab：LedgerEntry 不可变 → 不出现「处置」列。
 *  3) 只读聚合 API：GET /api/v1/admin/package-orders → 信封 code=0（分页投影）。
 *  4) 后端逐接口强制（未登录）：清 Cookie 后 GET package-orders → 401。
 */
import { test, expect } from "../fixtures";

test.describe("Admin 订单与流水处置（S6）", () => {
  test("冷启动 /admin/orders：三类型 Tab + 可写露出「处置」列", async ({ page }) => {
    await page.goto("/admin/orders");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: "订单与流水" })).toBeVisible();
    for (const label of ["充值订单", "套餐订单", "账本流水"]) {
      await expect(page.getByRole("button", { name: label })).toBeVisible();
    }
    // 默认充值 Tab（SUPER_ADMIN 含 orders.write）：处置列表头存在
    await expect(page.getByRole("columnheader", { name: "处置" })).toBeVisible();
  });

  test("账本流水 Tab 不可处置：无「处置」列（LedgerEntry 只读）", async ({ page }) => {
    await page.goto("/admin/orders");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "账本流水" }).click();
    await expect(page.getByRole("columnheader", { name: "处置" })).toHaveCount(0);
  });

  test("只读聚合 API：GET /api/v1/admin/package-orders → code 0", async ({ page }) => {
    const res = await page.request.get("/api/v1/admin/package-orders?page=1&pageSize=20");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(Array.isArray(body.data.items)).toBeTruthy();
  });

  test("后端逐接口强制：清 Cookie 后 GET package-orders → 401", async ({ context, page }) => {
    await context.clearCookies();
    const res = await page.request.get("/api/v1/admin/package-orders");
    expect(res.status()).toBe(401);
  });
});
