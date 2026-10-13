/**
 * Web用户端 - 文档/关于/产品页面E2E测试
 * 
 * Task: 验证文档中心、关于页面、产品页面正常
 * 
 * 执行逻辑：
 * 触发：用户点击导航栏"文档"/"关于"/"产品"
 * 路由：GET /docs/help → src/app/(web)/docs/help/page.tsx 等
 * 处理：静态/半静态页面渲染
 * 请求：GET /api/v1/system/config（部分页面需要）
 * 数据库：SELECT * FROM system_configs WHERE config_group='pricing'（定价页）
 * 响应：渲染页面HTML
 */

import { test, expect } from '../fixtures';

// ============================================
// 文档中心
// ============================================

const DOC_PAGES = [
  { name: '帮助中心', path: '/docs/help' },
  { name: '帮助文档', path: '/docs/help-center' },
  { name: '定价方案', path: '/docs/pricing' },
  { name: 'API文档', path: '/docs/api' },
];

for (const doc of DOC_PAGES) {
  test.describe(`${doc.name}`, () => {
    test(`${doc.name}页面正常加载`, async ({ page }) => {
      await page.goto(doc.path);
      await page.waitForLoadState('networkidle');
      
      const main = page.locator('main, [role="main"]').first();
      await expect(main).toBeVisible();
    });
  });
}

// ============================================
// 关于页面
// ============================================

const ABOUT_PAGES = [
  { name: '联系我们', path: '/about/contact' },
  { name: '合作', path: '/about/cooperation' },
  { name: '招聘', path: '/about/jobs' },
];

for (const about of ABOUT_PAGES) {
  test.describe(`${about.name}`, () => {
    test(`${about.name}页面正常加载`, async ({ page }) => {
      await page.goto(about.path);
      await page.waitForLoadState('networkidle');
      
      const main = page.locator('main, [role="main"]').first();
      await expect(main).toBeVisible();
    });
  });
}

// ============================================
// 产品页面
// ============================================

const PRODUCT_PAGES = [
  { name: 'AI员工', path: '/products/ai-employee' },
  { name: '知识库', path: '/products/knowledge-base' },
  { name: '解决方案', path: '/products/solutions' },
  { name: '业务咨询', path: '/products/consulting' },
];

for (const product of PRODUCT_PAGES) {
  test.describe(`${product.name}`, () => {
    test(`${product.name}页面正常加载`, async ({ page }) => {
      await page.goto(product.path);
      await page.waitForLoadState('networkidle');
      
      const main = page.locator('main, [role="main"]').first();
      await expect(main).toBeVisible();
    });
  });
}

// ============================================
// 其他页面
// ============================================

test.describe('其他Web页面', () => {
  test('对比页面加载', async ({ page }) => {
    await page.goto('/compare');
    await page.waitForLoadState('networkidle');
    
    const main = page.locator('main, [role="main"]').first();
    await expect(main).toBeVisible();
  });

  test('评测页面加载', async ({ page }) => {
    await page.goto('/evaluation');
    await page.waitForLoadState('networkidle');
    
    const main = page.locator('main, [role="main"]').first();
    await expect(main).toBeVisible();
  });
});
