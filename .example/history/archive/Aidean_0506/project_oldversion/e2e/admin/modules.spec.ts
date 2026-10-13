/**
 * Admin管理端 - 综合模块E2E测试
 * 覆盖：用户管理/脚本/评测/权限/内容/财务/天梯图/设置/反馈/公告
 * 
 * Task: 验证各管理模块页面可正常加载和基本交互
 * 
 * 执行逻辑：
 * 触发：管理员点击侧边栏各菜单
 * 路由：GET /admin/{module} → 各page.tsx
 * 处理：各模块组件加载对应API数据
 * 请求：GET /api/v1/admin/{module}（withAdmin守卫）
 * 数据库：SELECT * FROM {对应表}
 * 响应：渲染管理界面
 */

import { test, expect } from '../fixtures';

// ============================================
// 用户管理
// ============================================

test.describe('用户管理', () => {
  test('用户列表页加载', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');
    
    const main = page.locator('main, [role="main"]').first();
    await expect(main).toBeVisible();
  });

  test('用户搜索', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');
    
    const searchInput = page.locator('input[placeholder*="搜索"], input[type="search"]').first();
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('admin');
      await page.waitForTimeout(500);
    }
  });
});

// ============================================
// 自动化脚本
// ============================================

test.describe('自动化脚本', () => {
  test('脚本列表页加载', async ({ page }) => {
    await page.goto('/admin/scripts');
    await page.waitForLoadState('networkidle');
    
    const main = page.locator('main, [role="main"]').first();
    await expect(main).toBeVisible();
  });
});

// ============================================
// 模型评测
// ============================================

test.describe('模型评测', () => {
  test('评测列表页加载', async ({ page }) => {
    await page.goto('/admin/evaluations');
    await page.waitForLoadState('networkidle');
    
    const main = page.locator('main, [role="main"]').first();
    await expect(main).toBeVisible();
  });
});

// ============================================
// 权限组织
// ============================================

test.describe('权限组织', () => {
  test('角色管理页加载', async ({ page }) => {
    await page.goto('/admin/rbac/roles');
    await page.waitForLoadState('networkidle');
    
    const main = page.locator('main, [role="main"]').first();
    await expect(main).toBeVisible();
  });

  test('部门管理页加载', async ({ page }) => {
    await page.goto('/admin/org/departments');
    await page.waitForLoadState('networkidle');
    
    const main = page.locator('main, [role="main"]').first();
    await expect(main).toBeVisible();
  });

  test('团队管理页加载', async ({ page }) => {
    await page.goto('/admin/org/teams');
    await page.waitForLoadState('networkidle');
    
    const main = page.locator('main, [role="main"]').first();
    await expect(main).toBeVisible();
  });
});

// ============================================
// 内容管理
// ============================================

test.describe('内容管理', () => {
  test('资讯管理页加载', async ({ page }) => {
    await page.goto('/admin/content/news');
    await page.waitForLoadState('networkidle');
    
    const main = page.locator('main, [role="main"]').first();
    await expect(main).toBeVisible();
  });

  test('公告管理页加载', async ({ page }) => {
    await page.goto('/admin/content/announcements');
    await page.waitForLoadState('networkidle');
    
    const main = page.locator('main, [role="main"]').first();
    await expect(main).toBeVisible();
  });
});

// ============================================
// 财务管理
// ============================================

test.describe('财务管理', () => {
  test('交易记录页加载', async ({ page }) => {
    await page.goto('/admin/finance/transactions');
    await page.waitForLoadState('networkidle');
    
    const main = page.locator('main, [role="main"]').first();
    await expect(main).toBeVisible();
  });

  test('套餐管理页加载', async ({ page }) => {
    await page.goto('/admin/finance/plans');
    await page.waitForLoadState('networkidle');
    
    const main = page.locator('main, [role="main"]').first();
    await expect(main).toBeVisible();
  });
});

// ============================================
// 天梯图
// ============================================

test.describe('天梯图管理', () => {
  test('天梯图配置页加载', async ({ page }) => {
    await page.goto('/admin/ladder');
    await page.waitForLoadState('networkidle');
    
    const main = page.locator('main, [role="main"]').first();
    await expect(main).toBeVisible();
  });
});

// ============================================
// 系统设置
// ============================================

test.describe('系统设置', () => {
  test('通用设置页加载', async ({ page }) => {
    await page.goto('/admin/settings');
    await page.waitForLoadState('networkidle');
    
    const main = page.locator('main, [role="main"]').first();
    await expect(main).toBeVisible();
  });

  test('功能开关页加载', async ({ page }) => {
    await page.goto('/admin/settings/features');
    await page.waitForLoadState('networkidle');
    
    const main = page.locator('main, [role="main"]').first();
    await expect(main).toBeVisible();
  });
});

// ============================================
// 反馈与公告
// ============================================

test.describe('反馈与公告', () => {
  test('用户反馈页加载', async ({ page }) => {
    await page.goto('/admin/feedback');
    await page.waitForLoadState('networkidle');
    
    const main = page.locator('main, [role="main"]').first();
    await expect(main).toBeVisible();
  });

  test('系统公告页加载', async ({ page }) => {
    await page.goto('/admin/system/notices');
    await page.waitForLoadState('networkidle');
    
    const main = page.locator('main, [role="main"]').first();
    await expect(main).toBeVisible();
  });
});
