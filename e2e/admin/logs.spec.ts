/**
 * Admin 日志中心 e2e（S5 / change-id restructure-admin-nav-rbac-cms · 决策⑤记录体系）
 *
 * 前置：admin-setup 以 admin@aidean.com（SUPER_ADMIN，通配 *）登录 → storageState。
 * 断言点：
 *  1) 冷启动直访 /admin/logs：侧栏「日志中心」入口（种子 adm_logs）高亮；看板渲染四只读 Tab（UX-26 裁定 3：审计 Tab 已移除，审计唯一入口 /admin/audit-logs）。
 *  2) 切换到「安全事件」：TOKEN/CONSENT 双子视图切换器露出。
 *  3) 只读聚合 API：GET /api/v1/admin/logs/usage → 信封 code=0（分页投影）。
 *  4) 后端逐接口强制（未登录）：清 Cookie 后 GET usage → 401（认证层先拦）。
 */
import { test, expect } from "../fixtures";

const LOGS_LINK = 'nav[aria-label="管理导航"] a[href="/admin/logs"]';

test.describe("Admin 日志中心（S5 只读聚合）", () => {
  test("冷启动 /admin/logs：侧栏入口高亮 + 四 Tab 渲染（无审计 Tab）", async ({ page }) => {
    await page.goto("/admin/logs");
    await page.waitForLoadState("networkidle");

    const link = page.locator(LOGS_LINK).first();
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("aria-current", "page");

    await expect(page.getByRole("heading", { name: "日志中心" })).toBeVisible();
    for (const label of ["网关调用", "采集同步", "脚本执行", "安全事件"]) {
      await expect(page.getByRole("tab", { name: label })).toBeVisible();
    }
    await expect(page.getByRole("tab", { name: "审计", exact: true })).toHaveCount(0);
    // 默认「网关调用」Tab：展示分页计数条（共 N 条），只读无新增按钮
    await expect(page.getByText(/^共 \d+ 条$/).first()).toBeVisible();
  });

  test("切换「安全事件」：露出刷新令牌/授权同意子切换", async ({ page }) => {
    await page.goto("/admin/logs");
    await page.waitForLoadState("networkidle");
    await page.getByRole("tab", { name: "安全事件" }).click();
    await expect(page.getByRole("button", { name: "刷新令牌" })).toBeVisible();
    await expect(page.getByRole("button", { name: "授权同意" })).toBeVisible();
  });

  test("只读聚合 API：GET /api/v1/admin/logs/usage → code 0", async ({ page }) => {
    const res = await page.request.get("/api/v1/admin/logs/usage?page=1&pageSize=20");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(Array.isArray(body.data.items)).toBeTruthy();
  });

  test("后端逐接口强制：清 Cookie 后 GET usage → 401", async ({ context, page }) => {
    await context.clearCookies();
    const res = await page.request.get("/api/v1/admin/logs/usage");
    expect(res.status()).toBe(401);
  });
});
