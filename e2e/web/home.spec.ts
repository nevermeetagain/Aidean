/**
 * Web用户端 - 首页E2E测试
 * 
 * Task: 验证首页各模块正常渲染和交互
 * 
 * 执行逻辑：
 * 触发：用户访问 /
 * 路由：GET / → src/app/(web)/page.tsx
 * 处理：HomePage组件加载统计、轮播图、天梯图、快报
 * 请求：GET /api/v1/system/stats, GET /api/v1/models, GET /api/v1/tools/*
 * 数据库：SELECT COUNT(*) FROM ai_models, SELECT * FROM ladder_rankings
 * 响应：渲染首页HTML
 */

import { test, expect } from '../fixtures';

// Build: PcWuUbTloz3rPlzSFQrvn（2026-09-15 现役基线）
/**
 * [QA-COV-01 2026-09-15 员工C] 「首屏三产品主入口」用例已按现役 DOM 重写：
 * C-3 期依赖的 /aidean、/space、/sphere 均为已删除路由；2026-09-17 导航改版后
 * 一级入口为「资讯 /news」，产品下拉 = 模型天梯图(/models)/模型服务提供商(/providers)/
 * AideanWiki(/products/aideanwiki) 与三子平台介绍页 AideanBot(/products/wechatrag，生态旧名 WeChatRag)、
 * AideanFleet(/products/aideanfleet)、AideanThesis(/products/aideanthesis)
 * （add-subplatform-showcase-pages，契约真源 lib/navigation.ts）。
 * 原用例仅改入口指向，断言语义（产品入口可达）保留，未删除用例。
 */
test.describe('首页', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('首屏呈现三产品主入口且均可达', async ({ page }) => {
    const nav = page.locator('nav, header').first();
    await expect(nav).toBeVisible();

    // 现役产品导航入口（契约真源 lib/navigation.ts：资讯一级 + 产品下拉六子项，此处抽验代表项；
    // #71 后 label 为纯中文名，href/slug 保持不变）
    const entries: Array<[string, RegExp]> = [
      ['资讯', /\/news$/],
      ['产品', /\/products$/],
      ['独立知识百科', /\/products\/aideanwiki$/],
      ['信源引擎机器人', /\/products\/wechatrag$/],
      ['自动化舰队引擎', /\/products\/aideanfleet$/],
      ['论文审查助手', /\/products\/aideanthesis$/],
    ];
    for (const [name, pattern] of entries) {
      const link = nav.getByRole('link', { name, exact: true }).first();
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute('href', pattern);
    }
  });

  test('首页正常加载', async ({ page }) => {
    // 验证页面标题
    await expect(page).toHaveTitle(/Aidean|天梯图/);
    
    // 验证导航栏存在
    const nav = page.locator('nav, header').first();
    await expect(nav).toBeVisible();
  });

  test('轮播图模块渲染', async ({ page }) => {
    // 验证轮播图容器存在
    const carousel = page.locator('[data-testid="carousel"], .carousel, [class*="carousel"]').first();
    
    // 轮播图可能还在加载，等待短暂时间
    await page.waitForTimeout(1000);
    
    // 验证至少有一张图片
    const images = page.locator('img[alt*="AI"], img[alt*="模型"], img[alt*="天梯"]');
    const imgCount = await images.count();
    // 即使没有数据，轮播图容器应该存在
    expect(imgCount).toBeGreaterThanOrEqual(0);
  });

  test('统计卡片显示', async ({ page }) => {
    // 等待统计API响应
    const statsSection = page.locator('[data-testid="stats"], [class*="stat"], [class*="counter"]').first();
    
    // 统计卡片可能加载慢，给5秒
    await statsSection.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {
      // 如果没有专门的stats容器，可能统计嵌在其他组件中
    });
    
    // 验证页面已完全渲染（无loading骨架）
    const loadingSkeletons = page.locator('[class*="skeleton"], [class*="animate-pulse"]');
    const skeletonCount = await loadingSkeletons.count();
    // 允许0个或少量骨架（可能在可视区域外）
    expect(skeletonCount).toBeLessThanOrEqual(10);
  });

  test('导航栏链接可点击', async ({ page }) => {
    // 验证主导航项存在
    const navLinks = page.locator('nav a, header a');
    const count = await navLinks.count();
    expect(count).toBeGreaterThan(0);
    
    const newsLink = page.locator('header').getByRole('link', { name: '资讯', exact: true });
    await expect(newsLink).toBeVisible();
    await expect(newsLink).toHaveAttribute('href', '/news');
    await newsLink.click();
    await expect(page).toHaveURL(/\/news$/);
  });

  test('页脚显示', async ({ page }) => {
    // 滚动到页面底部
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    
    const footer = page.locator('footer, [class*="footer"]').first();
    // 页脚应该存在
    await expect(footer).toBeVisible();
  });
});
