/**
 * Admin 移动端响应式抽屉 e2e（S8.2 / change-id restructure-admin-nav-rbac-cms）
 *
 * 视口 390×844（< Tailwind md=768）：桌面常驻侧栏（hidden md:block）隐藏，汉堡按钮（md:hidden）露出。
 * 断言点：
 *  1) 小屏冷启动深层页：汉堡按钮可见、桌面侧栏隐藏。
 *  2) 点击汉堡 → 抽屉 data-open=1，抽屉内导航链接可见。
 *  3) 点击抽屉内链接 → 跳转目标页并自动关闭（data-open=0，路由 effect 驱动）。
 */
import { test, expect } from "../fixtures";

test.use({ viewport: { width: 390, height: 844 } });

test.describe("Admin 移动端抽屉（S8.2）", () => {
  test("小屏冷启动：汉堡可见、桌面侧栏隐藏", async ({ page }) => {
    await page.goto("/admin/logs");
    await page.waitForLoadState("networkidle");
    await expect(page.getByTestId("admin-mobile-menu-toggle")).toBeVisible();
    await expect(page.locator('nav[aria-label="管理导航"]').first()).toBeHidden();
  });

  test("打开抽屉 → 链接可见 → 点击跳转并自动关闭", async ({ page }) => {
    await page.goto("/admin/logs");
    await page.waitForLoadState("networkidle");

    await page.getByTestId("admin-mobile-menu-toggle").click();
    const drawer = page.getByTestId("admin-mobile-drawer");
    await expect(drawer).toHaveAttribute("data-open", "1");

    const usersLink = drawer.locator('a[href="/admin/users"]').first();
    await expect(usersLink).toBeVisible();
    await usersLink.click();

    await expect(page).toHaveURL(/\/admin\/users/);
    await expect(drawer).toHaveAttribute("data-open", "0");
  });
});
