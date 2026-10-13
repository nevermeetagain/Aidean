/**
 * Admin管理端 - 模型同步E2E测试
 *
 * 覆盖页面：
 * - /admin/models/sync
 * - /admin/models/sync-logs
 *
 * 核心目标：逐元素交互验证（刷新/触发同步/DryRun/筛选/展开）
 */

import { test, expect } from '../fixtures';

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'admin@aidean.com';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'Admin123456!';

async function ensureAdminLoggedIn(page: import('@playwright/test').Page) {
  const loginHeading = page.getByRole('heading', { name: '管理员登录' });
  if (await loginHeading.isVisible().catch(() => false)) {
    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="邮箱"]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"], input[placeholder*="密码"]').first();
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await emailInput.fill(ADMIN_EMAIL);
    await passwordInput.fill(ADMIN_PASSWORD);

    const submitBtn = page.locator('button[type="submit"], button:has-text("登录"), button:has-text("Login")').first();
    await submitBtn.click();
    await page.waitForURL(/\/admin(\/)?$/, { timeout: 15000 }).catch(() => {});
  }
}

test.describe('模型同步管理', () => {
  test('同步管理页渲染与基础交互', async ({ page }) => {
    await page.goto('/admin/models/sync');
    await page.waitForLoadState('networkidle');

    await ensureAdminLoggedIn(page);

    const heading = page.getByRole('heading', { name: '模型数据同步' });
    await expect(heading).toBeVisible();

    const refreshBtn = page.getByRole('button', { name: '刷新状态' });
    await expect(refreshBtn).toBeVisible();
    await refreshBtn.click();

    const syncBtn = page.getByRole('button', { name: /立即同步|同步中/ });
    await expect(syncBtn).toBeVisible();

    const dryRunBtn = page.getByRole('button', { name: /试运行（Dry Run）/ });
    await expect(dryRunBtn).toBeVisible();

    // DryRun触发：不强制要求成功（依赖后端环境），但必须能发起请求并保持页面不崩
    await dryRunBtn.click();
    await page.waitForTimeout(500);
    await expect(heading).toBeVisible();
  });

  test('同步日志页筛选与展开交互', async ({ page }) => {
    await page.goto('/admin/models/sync-logs');
    await page.waitForLoadState('networkidle');

    await ensureAdminLoggedIn(page);

    const heading = page.getByRole('heading', { name: '同步变更日志' });
    await expect(heading).toBeVisible();

    const refreshBtn = page.getByRole('button', { name: '刷新' });
    await expect(refreshBtn).toBeVisible();
    await refreshBtn.click();

    // 筛选按钮组
    await page.getByRole('button', { name: '全部' }).click();
    await page.getByRole('button', { name: '新增' }).click();
    await page.getByRole('button', { name: '更新' }).click();
    await page.getByRole('button', { name: '废弃' }).click();

    // 展开按钮：存在则点击一次验证不报错
    const expandBtns = page.locator('button').filter({ has: page.locator('svg') });
    const count = await expandBtns.count();
    if (count > 0) {
      await expandBtns.first().click();
      await page.waitForTimeout(300);
      await expect(heading).toBeVisible();
    }
  });
});
