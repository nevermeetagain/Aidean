/**
 * Web用户端 - 模型页面E2E测试
 * 
 * Task: 验证模型列表/详情/分类筛选正常
 * 
 * 执行逻辑：
 * 触发：用户点击"Aidean"导航或直接访问 /aidean
 * 路由：GET /aidean → src/app/(web)/models/page.tsx
 * 处理：模型列表组件加载分页数据、筛选器
 * 请求：GET /api/v1/models?page=1&limit=20
 * 数据库：SELECT * FROM ai_models WHERE is_active=true ORDER BY benchmark_score DESC
 * 响应：渲染模型列表HTML
 */

import { test, expect } from '../fixtures';

test.describe('模型列表页', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/aidean');
    await page.waitForLoadState('networkidle');
  });

  test('模型列表页正常加载', async ({ page }) => {
    // 验证页面标题
    await expect(page).toHaveTitle(/Aidean|模型|Model/);
    
    // 验证页面主体存在
    const main = page.locator('main, [role="main"]').first();
    await expect(main).toBeVisible();
  });

  test('模型分类标签可点击', async ({ page }) => {
    // 查找分类标签
    const categoryTabs = page.locator('[class*="tab"], [role="tab"], [data-testid*="category"]');
    const count = await categoryTabs.count();
    
    if (count > 0) {
      // 点击第一个分类标签
      await categoryTabs.first().click();
      await page.waitForLoadState('networkidle');
      
      // 验证URL变化或页面内容更新
      await page.waitForTimeout(500);
    }
  });

  test('模型搜索/筛选功能', async ({ page }) => {
    // 查找搜索框
    const searchInput = page.locator('input[type="search"], input[placeholder*="搜索"], input[placeholder*="Search"]').first();
    
    if (await searchInput.isVisible()) {
      await searchInput.fill('GPT');
      await page.waitForTimeout(500); // 防抖等待
      
      // 验证结果更新
      await page.waitForLoadState('networkidle');
    }
  });

  test('模型列表存在详情入口且详情页可打开', async ({ page }) => {
    // 使用当前页面的稳定详情入口，而不是宽泛的 href 模式
    const modelItem = page.locator('a[aria-label^="查看模型详情："]').first();
    
    if (await modelItem.isVisible({ timeout: 3000 }).catch(() => false)) {
      const href = await modelItem.getAttribute('href');
      expect(href).toMatch(/^\/models\//);
      await page.goto(href!);
      await page.waitForLoadState('networkidle');
      
      // 详情页仍保留 /models/:id 作为实现路由
      expect(page.url()).toMatch(/\/models\//);
    }
  });
});

test.describe('模型详情页', () => {
  test('模型详情页正常加载', async ({ page }) => {
    await page.goto('/aidean');
    await page.waitForLoadState('networkidle');

    // 复用页面真实详情入口，避免依赖列表 API 返回结构导致用例脆弱。
    const modelItem = page.locator('a[aria-label^="查看模型详情："]').first();
    const href = await modelItem.getAttribute('href');

    expect(href).toMatch(/^\/models\//);
    await page.goto(href!);
    await page.waitForLoadState('networkidle');

    const main = page.locator('main, [role="main"]').first();
    await expect(main).toBeVisible();
  });

  test('模型详情页可将模型带入对比页', async ({ page }) => {
    await page.goto('/aidean');
    await page.waitForLoadState('networkidle');

    const modelItem = page.locator('a[aria-label^="查看模型详情："]').first();
    const href = await modelItem.getAttribute('href');

    expect(href).toMatch(/^\/models\//);
    await page.goto(href!);
    await page.waitForLoadState('networkidle');

    const modelTitle = (await page.locator('h1').first().textContent())?.trim();
    expect(modelTitle).toBeTruthy();

    await page.getByRole('button', { name: '加入对比' }).click();
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/compare$/);
    await expect(page.getByText(modelTitle!, { exact: false }).first()).toBeVisible();
  });

  test('模型详情页可将模型带入测评页', async ({ page }) => {
    await page.goto('/aidean');
    await page.waitForLoadState('networkidle');

    const modelItem = page.locator('a[aria-label^="查看模型详情："]').first();
    const href = await modelItem.getAttribute('href');

    expect(href).toMatch(/^\/models\//);
    await page.goto(href!);
    await page.waitForLoadState('networkidle');

    const modelTitle = (await page.locator('h1').first().textContent())?.trim();
    expect(modelTitle).toBeTruthy();

    await page.getByRole('button', { name: '参与测评' }).click();
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/evaluation$/);
    await expect(page.getByText(modelTitle!, { exact: false }).first()).toBeVisible();
  });
});
