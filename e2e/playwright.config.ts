import { defineConfig } from '@playwright/test'

// Task C.3.1 冒烟基线专用配置：仅指向 e2e/tests 目录，与仓库遗留 playwright.config.ts（testDir ./e2e）互不干扰。
// [C-N8b 2026-09-09 员工C] webServer 命令适配：宿主 bash 无 pnpm shim，改经 npx 调起；
// 本基线为 dev 态（dev mock 支付渠道仅非生产可用，standalone server.js 固化 production 语义），
// 运行时须先释放 3000（reuseExistingServer=true 会复用占用进程），测毕按 G-2 归位 standalone。
// T2.1 收敛（CLOSER-07）：实现 spec 注释声称的 E2E_BASE_URL env 覆盖（原硬编码 3000）。
// webServer.url 固定 3000（standalone 永驻，reuseExistingServer 即时通过，不触发裸 npx pnpm）；
// use.baseURL 走 env → 测试请求指向独立 dev server（3101），不动 3000/3333。
//
// T2-fix（CLOSER-07 续）：Node.js v24 上 webpack 初始化挂起（"Starting..." 后无限等待），
// 须 TURBOPACK=1 起 dev server（`TURBOPACK=1 next dev --port 3101`，Ready ~900ms）。
// webServer.command 带 --turbo 标志以防 reuseExistingServer 失效时自起仍可用。
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3000'

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  workers: 1,
  use: { baseURL, locale: 'zh-CN' },
  webServer: {
    command: 'npx -y pnpm --filter web dev -- --turbo',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
