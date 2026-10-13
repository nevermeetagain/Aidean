/**
 * Admin 报表看板 e2e（S8.1 / change-id restructure-admin-nav-rbac-cms · WC#7）
 *
 * 前置：admin-setup 以 admin@aidean.com（SUPER_ADMIN，通配 *）登录 → storageState。
 * 断言点：
 *  1) /admin 概览露出「运营报表」区与区间切换（近 7/30/90 天）。
 *  1b) /admin/reports 独立页：完整看板（含模型排行）+ 区间切换（S2r / B1 裁决）。
 *  2) 只读聚合 API：GET /api/v1/admin/reports/overview?days=30 → 信封 code=0 + daily/totals 结构。
 *  3) 入参封顶：days=3（< 下限 7）→ 400。
 *  4) 后端强制：清 Cookie 后 GET → 401（认证层先拦）。
 */
import { test, expect } from "../fixtures";

test.describe("Admin 报表看板（S8.1 二维图 + 只读聚合）", () => {
  test("/admin 概览露出运营报表与区间切换", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: "运营报表" })).toBeVisible();
    for (const days of [7, 30, 90]) {
      await expect(page.getByTestId(`reports-range-${days}`)).toBeVisible();
    }
  });

  test("/admin/reports 独立页：完整看板含区间切换与模型排行（S2r）", async ({ page }) => {
    await page.goto("/admin/reports");
    await page.waitForLoadState("networkidle");
    for (const days of [7, 30, 90]) {
      await expect(page.getByTestId(`reports-range-${days}`)).toBeVisible();
    }
    await expect(page.getByText("模型调用 Top")).toBeVisible();
  });

  test("只读聚合 API：GET reports/overview?days=30 → code 0 + 结构", async ({ page }) => {
    const res = await page.request.get("/api/v1/admin/reports/overview?days=30");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(body.data.range.days).toBe(30);
    expect(Array.isArray(body.data.daily)).toBeTruthy();
    expect(body.data.daily.length).toBe(30); // 零填充完整日序列
    expect(typeof body.data.totals.calls).toBe("number");
    expect(typeof body.data.totals.quotaYuan).toBe("string");
  });

  test("入参封顶：days=3（< 下限 7）→ 400", async ({ page }) => {
    const res = await page.request.get("/api/v1/admin/reports/overview?days=3");
    expect(res.status()).toBe(400);
  });

  test("后端强制：清 Cookie 后 GET overview → 401", async ({ context, page }) => {
    await context.clearCookies();
    const res = await page.request.get("/api/v1/admin/reports/overview");
    expect(res.status()).toBe(401);
  });
});
