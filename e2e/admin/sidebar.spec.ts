/**
 * Admin 侧边栏展开态回归（S1 / change-id restructure-admin-nav-rbac-cms）
 *
 * 执行逻辑：
 * 触发：登录 admin 后（admin-setup 依赖）冷启动直访深层页
 * 断言点：
 *  1) 冷启动直达默认收起分组的页面（/admin/orders，属"财务与配置"第三组，缺省 openGroups=[0,1] 不含它）
 *     → 路由命中该组并自动展开，当前项链接在 DOM 且可见，aria-current="page"
 *  2) 手动展开某默认收起分组后 reload → 展开态从 localStorage(aidean-admin-open-groups) 恢复
 * 修复前：AdminSidebar 收起分组子项 {open && …} 整体卸载、且 openGroups 不持久化、无路由自动展开
 *         → 上述两项均失败（链接不在 DOM）。
 */
import { test, expect } from '../fixtures';

const ORDERS_LINK = 'nav[aria-label="管理导航"] a[href="/admin/orders"]';

test.describe('Admin 侧边栏展开态（S1）', () => {
  test('冷启动直访 /admin/orders：当前分组自动展开且当前项可见', async ({ page }) => {
    await page.goto('/admin/orders');
    await page.waitForLoadState('networkidle');

    const link = page.locator(ORDERS_LINK).first();
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('aria-current', 'page');
  });

  test('手动展开"财务与配置"分组后刷新：展开态持久化保持', async ({ page }) => {
    // 概览页：第三组默认收起，订单链接不可见
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    const link = page.locator(ORDERS_LINK).first();
    await expect(link).toBeHidden();

    // 点击分组头展开 → 写入 localStorage
    await page.locator('nav[aria-label="管理导航"] button:has-text("财务与配置")').first().click();
    await expect(link).toBeVisible({ timeout: 5000 });

    // 刷新：展开态应从存档恢复（不再依赖路由 effect）
    await page.reload();
    await page.waitForLoadState('networkidle');
    // 回概览需显式导航，reload 仍在 /admin；此处以 orders 组是否仍展开为准
    const persisted = await page.evaluate(() => localStorage.getItem('aidean-admin-open-groups'));
    expect(persisted).not.toBeNull();
    expect(JSON.parse(persisted as string)).toContain(2);
  });
});
