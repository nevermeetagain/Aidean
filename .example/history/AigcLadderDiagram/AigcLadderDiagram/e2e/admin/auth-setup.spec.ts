/**
 * Admin认证Setup
 * 在admin测试项目执行前，先登录并保存storageState
 * 
 * 执行逻辑：
 * 触发：playwright.config.ts中admin项目依赖admin-setup
 * 路由：POST /api/v1/auth/login
 * 处理：填写admin凭证 → 提交登录 → 等待跳转
 * 请求：POST /api/v1/auth/login { email, password }
 * 数据库：验证admin用户→创建session→写入cookie
 * 响应：保存cookie到.auth/admin-auth.json
 */

import { test as setup, expect } from '@playwright/test';

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'admin@aidean.com';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'Admin123456!';

setup('admin认证 - 登录并保存状态', async ({ page }) => {
  // 1. 导航到admin登录页
  await page.goto('/admin/login');
  await page.waitForLoadState('networkidle');
  
  // 2. 填写登录表单
  const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="邮箱"]').first();
  const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
  
  await emailInput.fill(ADMIN_EMAIL);
  await passwordInput.fill(ADMIN_PASSWORD);
  
  // 3. 提交登录
  const submitBtn = page.locator('button[type="submit"], button:has-text("登录"), button:has-text("Login")').first();
  await submitBtn.click();
  
  // 4. 等待跳转到admin仪表盘
  await page.waitForURL(/\/admin(\/)?$/, { timeout: 15000 }).catch(async () => {
    // 如果没有自动跳转，检查是否有错误提示
    const errorMsg = page.locator('.error, [role="alert"], .text-red-500').first();
    if (await errorMsg.isVisible().catch(() => false)) {
      console.log('Admin登录错误:', await errorMsg.textContent());
    }
    // 仍然尝试保存状态（可能已经在admin页面）
  });
  
  // 5. 保存认证状态
  await page.context().storageState({ path: '.auth/admin-auth.json' });
});
