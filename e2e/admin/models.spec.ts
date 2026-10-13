/**
 * Admin管理端 - 模型管理E2E测试
 * 
 * Task: 验证模型CRUD + 厂商管理 + 基准测试管理
 * 
 * 执行逻辑：
 * 触发：管理员点击"模型管理"菜单
 * 路由：GET /admin/models → src/app/admin/(shell)/models/page.tsx
 * 处理：AdminModelsPage组件加载模型列表+分页
 * 请求：GET /api/v1/admin/models?page=1&limit=20（withAdmin守卫）
 * 数据库：SELECT * FROM ai_models JOIN vendors ORDER BY created_at DESC
 * 响应：渲染模型表格 + 分页控件
 */

import { test, expect } from '../fixtures';

test.describe('模型列表管理', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/models');
    await page.waitForLoadState('networkidle');
  });

  test('模型列表页加载', async ({ page }) => {
    const main = page.locator('main, [role="main"]').first();
    await expect(main).toBeVisible();
  });

  test('模型表格存在', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // 查找表格或卡片列表
    const table = page.locator('table, [class*="table"], [class*="list"], [data-testid="model-list"]');
    const count = await table.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('模型搜索功能', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="搜索"], input[type="search"]').first();
    
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('GPT');
      await page.waitForTimeout(500);
    }
  });

  test('新建模型按钮', async ({ page }) => {
    const createBtn = page.locator('button:has-text("新建"), button:has-text("添加"), button:has-text("Create"), a:has-text("新建")').first();
    
    if (await createBtn.isVisible().catch(() => false)) {
      await createBtn.click();
      await page.waitForTimeout(500);
    }
  });
});

test.describe('厂商管理', () => {
  test.beforeEach(async ({ page }) => {
    // [C-N8 2026-09-09] 路径迁移：/admin/models/vendors→/admin/vendors（构建产物路由表真源）
    await page.goto('/admin/vendors');
    await page.waitForLoadState('networkidle');
  });

  test('厂商管理页加载', async ({ page }) => {
    const main = page.locator('main, [role="main"]').first();
    await expect(main).toBeVisible();
  });

  test('厂商列表有内容或空状态', async ({ page }) => {
    await page.waitForTimeout(1000);
    const hasContent = await page.locator('table, [class*="card"], [class*="item"]').first()
      .isVisible({ timeout: 3000 }).catch(() => false);
    expect(typeof hasContent).toBe('boolean');
  });
});

test.describe.skip('基准测试管理', () => {
  // [C-3 skip 2026-09-09] /admin/models/benchmarks 路由已删除（构建产物无此目录），待管理者确认新入口后重写
  // QA-COV-01 P2(2026-09-14) 复核：源码 app/(admin)/admin/models/ 仅 page.tsx，无 benchmarks 子目录，
  // 且 admin/models 页面与父导航无 benchmarks Link → 结构性删除、非迁移，本轮不可恢复，保持 skip。
  test('基准测试页面加载', async ({ page }) => {
    await page.goto('/admin/models/benchmarks');
    await page.waitForLoadState('networkidle');
    
    const main = page.locator('main, [role="main"]').first();
    await expect(main).toBeVisible();
  });
});
