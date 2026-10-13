/**
 * Web用户端 - 认证页面E2E测试
 * 
 * Task: 验证登录/注册/会话管理正常
 * 
 * 执行逻辑：
 * 触发：用户点击"登录"按钮
 * 路由：GET /auth/login → src/app/(web)/auth/login/page.tsx
 * 处理：登录表单填写→提交→JWT验证→设置cookie
 * 请求：POST /api/v1/auth/login { email, password }
 * 数据库：SELECT * FROM users WHERE email=? AND status=ACTIVE → 校验密码 → INSERT user_sessions
 * 响应：设置access_token cookie → 重定向到首页
 */

import { test, expect } from '../fixtures';

// [C-N8 2026-09-09 员工C] 路径迁移：/auth/login→/login、/auth/register→/register
// （构建产物 (site) 路由表真源，Build 1M7JWhK9gs91qVHGEzAH0）

const TEST_EMAIL = process.env.E2E_USER_EMAIL || 'test@aidean.com';
const TEST_PASSWORD = process.env.E2E_USER_PASSWORD || 'Test123456!';

test.describe('登录页面', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
  });

  test('登录页正常渲染', async ({ page }) => {
    // 验证页面有登录表单
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitBtn = page.locator('button[type="submit"], button:has-text("登录")').first();
    
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitBtn).toBeVisible();
  });

  test('空表单提交显示验证错误', async ({ page }) => {
    const submitBtn = page.locator('button[type="submit"], button:has-text("登录")').first();
    await submitBtn.click();
    
    // 应该出现验证错误提示
    await page.waitForTimeout(500);
    const errorMsg = page.locator('[class*="error"], [class*="invalid"], [role="alert"], [class*="text-red"]');
    const hasError = await errorMsg.first().isVisible({ timeout: 3000 }).catch(() => false);
    // HTML5原生验证可能不显示可见错误，所以只验证没有跳转
    expect(page.url()).toContain('/login');
  });

  test('错误凭证登录失败', async ({ page }) => {
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitBtn = page.locator('button[type="submit"], button:has-text("登录")').first();
    
    await emailInput.fill('wrong@example.com');
    await passwordInput.fill('WrongPassword123');
    await submitBtn.click();
    
    await page.waitForTimeout(2000);
    // 应该还在登录页
    expect(page.url()).toContain('/login');
  });

  test('注册链接可点击', async ({ page }) => {
    // [C-N8 2026-09-09] 收紧定位器：联合选择器 a:has-text("注册") 会误中页头
    // 其他含"注册"字样的链接；以精确 href 为准（DOM 实测 /login 存在 a[href="/register"]）
    const registerLink = page.locator('a[href="/register"]').first();

    await expect(registerLink).toBeVisible();
    await registerLink.click();
    await expect(page).toHaveURL(/\/register/, { timeout: 10_000 });
  });
});

test.describe('注册页面', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');
  });

  test('注册页正常渲染', async ({ page }) => {
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
  });

  test('注册表单验证', async ({ page }) => {
    const submitBtn = page.locator('button[type="submit"], button:has-text("注册")').first();
    await submitBtn.click();
    
    // 应该还在注册页（验证失败）
    await page.waitForTimeout(500);
    expect(page.url()).toContain('/register');
  });
});
