# Checklist · implement-console-effects-and-e2e

> 取证标注：[命令]/[断言]/[测试]/[人工]

## Task C.1 特效层

- [x] C-1 FlowGradient.tsx 存在，'use client'/blur/feTurbulence 三要素命中 hits=4≥3；椭圆 5 层（C.1.1）[断言]
- [x] C-2 globals.css 含 flow-spin/flow-drift/flow-opacity 关键帧 + .flow-layer（C.1.1）[断言]
- [x] C-3 prefers-reduced-motion 规则命中 .flow-layer（globals.css L119-123）（C.1.2）[断言]

## Task C.2 控制台页面

- [x] C-4 CoreInfoCard 引 FlowGradient 与 z-10 前景分层（3 处 z-10）（C.2.1）[断言]
- [x] C-5 /user/console 构建通过：路由表 `/user/console 1.1kB 94.9kB (Static)`；SSR HTML 含控制台/账户余额/免费额度全 True（产物实际路径 .next/server/app/user/console.html——(web) 组不影响产物路径，规格原字面路径已修正并注记）（C.2.2）[命令]
- [x] C-6 红线复核：新增文件中 'use client' 仅 FlowGradient.tsx 一处；页面/卡片均 Server（C.2 红线自检+终检）[命令]

## Task C.3 e2e 底座

- [x] C-7 playwright.config webServer=pnpm --filter web dev；--list 列出 4 tests in 3 files（reduced-motion 为嵌套子测）（C.3.1）[命令]
- [x] C-8 theme-switch 绿：teal 切换 → data-theme='teal' → reload 持久（C.3.2）[测试]
- [x] C-9 header-links 绿：七项顺序契约 + Logo 回首页 URL 断言（C.3.2）[测试]
- [x] C-10 console-flow-gradient 绿：正常态 animationName 含 flow-spin/flow-opacity；reduced-motion 态 animationName==='none' 且三卡文案可见。⚠️ 实现注记：Playwright 1.62×Chrome151 下 context 级 reducedMotion 不传导，用 page.emulateMedia 双保险（C.3.2）[测试]

## 回填与全局门禁

- [x] C-11 establish-dev-workflow/checklist.md 已回填：2-2/2-3 补 e2e 断言注记、G-3 勾选「4 passed (9.7s)」（C.4.1）[断言]
- [x] C-12 三连门禁退出码 0：build=0(19.4s,12 路由含 /user/console) → gates=0(5/5 PASS) → test:e2e=0(4 passed 9.7s)。过程经 Fix-2 闭环（next 虚拟实例抖动→install --force 重建）（C.4.1）[命令]
