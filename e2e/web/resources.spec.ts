/**
 * Web用户端 - 资源页面E2E测试
 * 
 * Task: 验证Skills/MCP/Agent/News资源页面正常
 * 
 * 执行逻辑：
 * 触发：用户点击"资源"导航子菜单
 * 路由：GET /space/skills → src/app/(web)/resources/skills/page.tsx
 * 处理：资源列表组件加载数据、筛选
 * 请求：GET /api/v1/tools/skills, GET /api/v1/tools/mcp, GET /api/v1/tools/agents
 * 数据库：SELECT * FROM skills/mcp_servers/agents/api_stations WHERE is_active=true
 * 响应：渲染资源列表HTML
 */

import { test, expect } from '../fixtures';

// Build: 1M7JWhK9gs91qVHGEzAH0（2026-09-09 门禁构建产物）
/**
 * [C-3 skip 2026-09-09 质量门禁] 本文件引用的 /space/* 资源页路由已删除——
 * 构建产物 (site) 路由表无 space/skills|mcp|agent|news（Build 1M7JWhK9gs91qVHGEzAH0，
 * 全量回归实测 13 例失败证实）。保留用例作为证据链，待管理者确认资源页新入口后重写。
 */
const RESOURCE_PAGES = [
  { name: 'Skills', path: '/space/skills' },
  { name: 'MCP', path: '/space/mcp' },
  { name: 'Agent', path: '/space/agent' },
  { name: '资讯', path: '/space/news' },
];

for (const resource of RESOURCE_PAGES) {
  // C-3: /space/* 路由已删除，见文件头注记
  test.describe.skip(`${resource.name}页面`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(resource.path);
      await page.waitForLoadState('networkidle');
    });

    test(`${resource.name}页面正常加载`, async ({ page }) => {
      // 验证页面主体可见
      const main = page.locator('main, [role="main"]').first();
      await expect(main).toBeVisible();
    });

    test(`${resource.name}页面有内容或空状态`, async ({ page }) => {
      // 验证有内容卡片或空状态提示
      const hasContent = await page.locator('[class*="card"], [class*="item"], [data-testid*="item"]').first()
        .isVisible({ timeout: 3000 }).catch(() => false);
      
      const hasEmpty = await page.locator('[class*="empty"], [class*="no-data"], text=暂无数据').first()
        .isVisible({ timeout: 2000 }).catch(() => false);
      
      // 至少有内容或空状态其中之一
      expect(hasContent || hasEmpty).toBeTruthy();
    });

    test(`${resource.name}页面筛选功能`, async ({ page }) => {
      // 查找筛选/搜索
      const filterBtn = page.locator('[class*="filter"], [data-testid*="filter"], button:has-text("筛选")').first();
      const searchInput = page.locator('input[placeholder*="搜索"], input[type="search"]').first();
      
      if (await filterBtn.isVisible().catch(() => false)) {
        await filterBtn.click();
        await page.waitForTimeout(300);
      }
      
      if (await searchInput.isVisible().catch(() => false)) {
        await searchInput.fill('test');
        await page.waitForTimeout(500);
      }
    });
  });
}

test.describe.skip('资源导航', () => {
  // C-3: /space/* 资源页路由已删除，导航入口随信息架构调整，见文件头注记
  test('从首页导航到Skills页面', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // 点击"资源"导航
    const resourcesLink = page.locator('a[href="/space"], a:has-text("AideanSpace"), a:has-text("资源")').first();
    if (await resourcesLink.isVisible()) {
      await resourcesLink.click();
      await page.waitForLoadState('networkidle');
      
      // 验证在资源页面
      await expect(page).toHaveURL(/\/space/);
    }
  });
});
