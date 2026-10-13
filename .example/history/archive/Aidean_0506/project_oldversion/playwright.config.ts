import { defineConfig, devices } from '@playwright/test';

/**
 * Aidean E2E测试配置
 * 
 * 执行逻辑：
 * 触发：npx playwright test / npx playwright test --ui
 * 路由：baseURL → http://localhost:3000
 * 处理：globalSetup先启动依赖，测试按projects分web/admin两组
 * 数据库：使用.test后缀的测试数据库，globalSetup自动seed
 * 响应：HTML报告输出到 playwright-report/
 */
export default defineConfig({
  // 测试目录
  testDir: './e2e',
  
  // 测试文件匹配模式
  testMatch: '**/*.spec.ts',
  
  // 全局超时（单个测试最长60秒）
  timeout: 60_000,
  
  // expect断言超时
  expect: {
    timeout: 10_000,
  },
  
  // 并行执行
  fullyParallel: true,
  
  // CI环境下禁止.retries
  retries: process.env.CI ? 2 : 0,
  
  // 并发worker数
  workers: process.env.CI ? 1 : undefined,
  
  // 报告器
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],
  
  // 全局配置
  use: {
    // 基础URL
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    
    // 截图策略：仅失败时
    screenshot: 'only-on-failure',
    
    // 录屏策略：仅失败时
    video: 'retain-on-failure',
    
    // 追踪：仅失败时
    trace: 'on-first-retry',
    
    // 导航超时
    navigationTimeout: 15_000,
    
    // action超时
    actionTimeout: 10_000,
  },
  
  // 项目配置
  projects: [
    // Web用户端测试
    {
      name: 'web',
      testDir: './e2e/web',
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/web-guest.json',
      },
    },
    
    // Admin管理端测试（需要先登录）
    {
      name: 'admin',
      testDir: './e2e/admin',
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/admin-auth.json',
      },
      dependencies: ['admin-setup'],
    },
    
    // Admin登录setup项目
    {
      name: 'admin-setup',
      testDir: './e2e/admin',
      testMatch: 'auth-setup.spec.ts',
    },
    
    // 移动端测试（预留）
    {
      name: 'mobile',
      testDir: './e2e/web',
      testMatch: /mobile\.spec\.ts/,
      use: {
        ...devices['Pixel 5'],
      },
    },
  ],
  
  // 全局setup（启动开发服务器）
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120_000,
  // },
});
