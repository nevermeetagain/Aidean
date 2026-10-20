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
 *
 * [C-N4 2026-09-09 员工C] 配置唯一性说明：本文件是**全量 e2e 的唯一生效配置**
 * （testDir ./e2e；projects: web/admin/admin-setup/mobile/smoke/web-root/flows；baseURL 固定 3000，
 * 符合「只能 3000 端口」门禁铁律；webServer 保持注释，测试不得私拉服务）。
 * [TASK-037 2026-10-20] e2e/playwright.config.ts 降级为兼容 re-export（仅供旧脚本/守卫引用），
 * package.json test:e2e 与 CI 均改用本文件；flows project 承载 e2e/tests 全量（排除 smoke 重复），
 * workers=1 规避登录 IP 限流（20/600s）。
 */
export default defineConfig({
  // 未完成事项目录 #64：生成 web 项目游客快照 .auth/web-guest.json（此前无生成来源致 e2e/web 全红）
  globalSetup: './e2e/global-setup.ts',

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

    // 烟囱测试（C-N6 2026-09-09）：承载 e2e/tests，覆盖门禁 7 断言
    {
      name: 'smoke',
      testDir: './e2e/tests',
      testMatch: /smoke\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
      },
    },

    // 根目录散落用例（TASK-084 跟进）：e2e/ 顶层 spec 不在上述任一 testDir 内，单独收录（游客态，无需登录）。
    {
      name: 'web-root',
      testDir: './e2e',
      testMatch: /ladder-no-footer\.spec\.ts$/,
      testIgnore: ['web/**', 'admin/**', 'tests/**'],
      use: {
        ...devices['Desktop Chrome'],
      },
    },

    // 流程用例（TASK-037）：承载 e2e/tests 全量，排除已由 smoke project 覆盖的 smoke.spec.ts；
    // workers=1 与旧 test:e2e 子配置一致，规避登录 IP 限流（20/600s）。
    {
      name: 'flows',
      testDir: './e2e/tests',
      testMatch: '**/*.spec.ts',
      testIgnore: '**/smoke.spec.ts',
      workers: 1,
      use: {
        locale: 'zh-CN',
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
