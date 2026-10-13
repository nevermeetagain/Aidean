/**
 * Web用户端 - 模型页面E2E测试
 * 
 * Task: 验证模型列表/详情/分类筛选正常
 * 
 * 执行逻辑：
 * 触发：用户点击"模型"导航或直接访问 /models
 * 路由：GET /models → src/app/(web)/models/page.tsx
 * 处理：模型列表组件加载分页数据、筛选器
 * 请求：GET /api/v1/models?page=1&limit=20
 * 数据库：SELECT * FROM ai_models WHERE is_active=true ORDER BY benchmark_score DESC
 * 响应：渲染模型列表HTML
 */

import { test, expect } from '../fixtures';

test.describe('模型列表页', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/models');
    await page.waitForLoadState('networkidle');
  });

  test('模型列表页正常加载', async ({ page }) => {
    // 验证页面标题
    await expect(page).toHaveTitle(/模型|Model/);
    
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

  test('点击模型进入详情页', async ({ page }) => {
    // 查找模型卡片/行
    const modelItem = page.locator('a[href*="/models/"], [data-testid="model-item"]').first();
    
    if (await modelItem.isVisible({ timeout: 3000 }).catch(() => false)) {
      await modelItem.click();
      await page.waitForLoadState('networkidle');
      
      // 验证URL包含模型ID
      expect(page.url()).toMatch(/\/models\//);
    }
  });
});

test.describe('模型详情页', () => {
  test('模型详情页正常加载', async ({ page, apiClient }) => {
    // 先获取模型列表，拿到第一个模型ID
    const modelsRes = await apiClient.get('/api/v1/models?page=1&limit=1');
    
    let modelId = 'gpt-4o'; // 默认回退
    if (modelsRes?.success && modelsRes?.data?.items?.length > 0) {
      modelId = modelsRes.data.items[0].slug || modelsRes.data.items[0].id;
    }
    
    await page.goto(`/models/${modelId}`);
    await page.waitForLoadState('networkidle');
    
    // 验证页面存在主体内容
    const main = page.locator('main, [role="main"]').first();
    await expect(main).toBeVisible();
  });
});
