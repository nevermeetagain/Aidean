# Tasks · implement-console-effects-and-e2e

> 所属 Phase: 3 前置（establish-dev-workflow 继承） | 四级层级 · 六字段

---

## Task C.1 流动模糊渐变特效层 【依赖: 无 | 产出: FlowGradient + 关键帧】

- [ ] #### SubTask C.1.1 FlowGradient 组件
  - 【目标】可复用特效背景层，严格转译 AE 十一步（多椭圆模糊旋转/湍流置换/截半错落/透明度循环）
  - 【范围】新建 `apps/web/components/console/FlowGradient.tsx`；修改 `apps/web/app/globals.css` 追加 `@keyframes flow-spin/flow-drift/flow-opacity` 与 `.flow-layer` 工具类
  - 【验收】椭圆层 ≤5 层；动画仅 transform/opacity；组件 props 支持 tone(primary/accent)与 seed 变体；文件内无业务 import
  - 【验证命令】`(Select-String -Path apps/web/components/console/FlowGradient.tsx -Pattern 'filter: blur|feTurbulence|use client').Count -ge 3`
  - 【产出】FlowGradient.tsx
  - 【依赖】无

- [ ] #### SubTask C.1.2 reduced-motion 降级
  - 【目标】无障碍兜底
  - 【范围】`globals.css` 追加 `@media (prefers-reduced-motion: reduce)` 下 `.flow-layer{animation:none}` 规则
  - 【验收】规则存在且选择器命中 .flow-layer
  - 【验证命令】`Select-String -Path apps/web/app/globals.css -Pattern 'prefers-reduced-motion'`
  - 【产出】降级样式
  - 【依赖】C.1.1

## Task C.2 控制台页面组装 【依赖: C.1 | 产出: /user/console 可访问】

- [ ] #### SubTask C.2.1 CoreInfoCard 三卡
  - 【目标】余额/等级/用量三卡 + 特效背景 + z-index 文字分层
  - 【范围】新建 `apps/web/components/console/CoreInfoCard.tsx`
  - 【验收】卡内前景文字包于 relative z-10 容器；卡片接受 value/label/tone/progress props 复用
  - 【验证命令】`Select-String -Path apps/web/components/console/CoreInfoCard.tsx -Pattern 'FlowGradient','z-10'`
  - 【产出】CoreInfoCard.tsx
  - 【依赖】C.1.*

- [x] #### SubTask C.2.2 /user/console 页面
  - 【目标】控制台骨架：H1「控制台」+ 双形态切换占位 Segmented(通用版/专业版，纯 UI 非受控) + 三 CoreInfoCard（¥128.00/普通用户/62%）+ free 模型额度只读三行
  - 【范围】新建 `apps/web/app/(web)/user/console/page.tsx`
  - 【验收】HTTP 200；SSR HTML 含「控制台」「余额」「免费额度」字样；全页 client 组件仅新增的受控交互件
  - 【验证命令】构建产物核验：`pnpm build` 后 `Get-ChildItem apps/web/.next/server/app/(web)/user -Recurse -Filter *.html` 存在
  - 【产出】控制台页
  - 【依赖】C.2.1

## Task C.3 Playwright e2e 底座（G-3 回填） 【依赖: C.2 | 产出: e2e 基建 + 3 用例】

- [x] #### SubTask C.3.1 Playwright 配置
  - 【目标】测试基建：webServer 自动起 dev(3000)、baseURL、单 worker
  - 【范围】新建 `e2e/playwright.config.ts`、根 package.json script `test:e2e:"playwright test --config e2e/playwright.config.ts"`、devDep @playwright/test 于根
  - 【验收】config 合法且 webServer.command 指向 pnpm --filter web dev
  - 【验证命令】`npx playwright test --list --config e2e/playwright.config.ts` 列出 3 用例
  - 【产出】基建
  - 【依赖】C.2.*

- [x] #### SubTask C.3.2 三冒烟用例
  - 【目标】theme-switch(data-theme 持久)/header-links(七项顺序+Logo 回首页)/console-flow-gradient(卡片存在+reduced-motion 动画关)
  - 【范围】新建 `e2e/tests/{theme-switch,header-links,console-flow-gradient}.spec.ts`
  - 【验收】3 用例全绿退出码 0；用例 3 内 emulate reduced-motion 后断言 getComputedStyle(animationName) 为 none 或 animation-play-state 无运行值
  - 【验证命令】`pnpm test:e2e`
  - 【产出】冒烟基线（回填 establish-dev-workflow G-3）
  - 【依赖】C.3.1

## Task C.4 门禁与文档收口 【依赖: C.3 | 产出: checklist 双向回填】

- [x] #### SubTask C.4.1 核验与勾选
  - 【目标】跑通全链门禁并回填两份 checklist
  - 【范围】`checklist.md`(本目录) 全项核验勾选；`docs/specs/establish-dev-workflow/checklist.md` 回填 2-2/2-3 e2e 断言与 G-3；`tasks.md`(本目录) 逐项勾选
  - 【验收】`pnpm build && pnpm gates && pnpm test:e2e` 三连退出码 0
  - 【验证命令】同左三连
  - 【产出】绿色闭环
  - 【依赖】C.3.*

---

# 核验修复回路

- [x] Fix-2（引用检查点 C-12 / e2e webServer）：`pnpm test:e2e` 首跑失败——next 虚拟实例（peer-hash 含 @playwright/test）node_modules 抖动致 dev server `Cannot find module '../client/router'`。修复：`pnpm install --force` 重建链接后重跑三连须全绿。（已修：install --force 后 `pnpm test:e2e` → 4 passed (9.7s) exit 0）

# Task Dependencies
