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

// Build: 1M7JWhK9gs91qVHGEzAH0（2026-09-09 门禁构建产物）
/**
 * [C-3 skip 2026-09-09 质量门禁] 本文件引用的 /sphere/*、/compare、/evaluation、
 * /docs/help|help-center|pricing|api、/about/contact|cooperation|jobs 路由已删除
 * （构建产物 .next/server/app 仅存 /docs、/about 单页，无 sphere/compare/evaluation）。
 * 保留用例作为证据链，待管理者确认信息架构后重写，勿直接删除。
 */

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
  // C-3: /docs/help|help-center|pricing|api 子页已删除，仅存 /docs 单页
  test.describe.skip(`${doc.name}`, () => {
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
  // C-3: /about/contact|cooperation|jobs 子页已删除，仅存 /about 单页
  test.describe.skip(`${about.name}`, () => {
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
  { name: 'AI员工', path: '/sphere/ai-employee' },
  { name: '知识库', path: '/sphere/knowledge-base' },
  { name: '解决方案', path: '/sphere/solutions' },
  { name: '业务咨询', path: '/sphere/consulting' },
];

for (const product of PRODUCT_PAGES) {
  // C-3: /sphere/* 产品页已删除
  test.describe.skip(`${product.name}`, () => {
    test(`${product.name}页面正常加载`, async ({ page }) => {
      await page.goto(product.path);
      await page.waitForLoadState('networkidle');
      
      const main = page.locator('main, [role="main"]').first();
      await expect(main).toBeVisible();
    });
  });
}

test.describe.skip('产品总览语义路径', () => {
  // C-3: /sphere 产品总览页已删除
  test('/sphere 产品页卡片使用三产品语义路径', async ({ page }) => {
    await page.goto('/sphere');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('a[href="/aidean"]').first()).toBeVisible();
    await expect(page.locator('a[href="/sphere/ai-employee"]').first()).toBeVisible();
    await expect(page.locator('a[href="/sphere/knowledge-base"]').first()).toBeVisible();
    await expect(page.locator('a[href="/sphere/solutions"]').first()).toBeVisible();
  });
});

// ============================================
// 其他页面
// ============================================

test.describe.skip('其他Web页面', () => {
  // C-3: /compare 与 /evaluation 路由已删除
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
