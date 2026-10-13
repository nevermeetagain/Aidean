# 用户控制台骨架与流动模糊渐变特效 Spec

> change-id: `implement-console-effects-and-e2e` | 语言: 中文 | 创建: 2026-08-27
> 所属阶段: Phase 3 前置 UI 补全（继承 establish-dev-workflow 四层级/六字段规范）
> 设计准则出处: 用户设计准则第 11 条（控制台核心信息特效）+ AGENTS.md 全局约束

## 为什么（Why）

设计准则 1-10 条已在 establish-dev-workflow 的 Phase 0-2 落地（导航/首页/主题/滚动加载等 12 项检查点全勾）。唯余两条实质缺口：⑪「用户控制台核心信息增加特效」（CoreInfoCard 流动模糊渐变，AE 十一步转译规范已在《UI设计文档》§7 定稿但代码未落）与 G-3「Playwright e2e 冒烟未建库」。控制台 `/user` 路由自身也仅有 tasks 占位、无真实页面。三者打包为一个小 change-id，在进入 Phase 3 重模块前完成 UI 收口。

## What Changes

- 新增 `/user/console` 用户控制台页（登录态简化为 Mock 登录态开关，认证硬依赖留 Phase 3.2）
- 新增 `components/console/CoreInfoCard.tsx`：余额/等级/免费额度三卡，背景应用流动模糊渐变动效
- 新增 `components/console/FlowGradient.tsx`：多层椭圆 + blur + rotate/translate 动画 + SVG feTurbulence 湍流置换 + opacity 循环的通用特效层（严格转译 AE 十一步，符合《UI设计文档》§7 性能红线：椭圆 ≤5、只动 transform/opacity、will-change 隔离合成层）
- 新增降级：`prefers-reduced-motion: reduce` 时停帧保留静态渐变
- 新建 Playwright e2e 底座（playwright.config.ts + web 服务器复用 existing dev/build 输出）并落三条冒烟用例：
  - theme-switch：切主题断言 data-theme 持久化
  - header-links：七项导航顺序/路径/Logo 回首页
  - console-flow-gradient：控制台卡片存在且 prefers-reduced-motion 下动画关闭
- **BREAKING**：无（纯新增页面/组件/测试基建）

## Impact

- Affected specs: establish-dev-workflow（回填 checklist 2-2/2-3 的 e2e 断言与 G-3）
- Affected code:
  - 新建 `apps/web/app/(web)/user/console/page.tsx`
  - 新建 `apps/web/components/console/{CoreInfoCard,FlowGradient}.tsx`
  - 修改 `apps/web/app/globals.css`（追加 marquee 同层的 flow 渐变关键帧）
  - 新建 `e2e/{playwright.config.ts,tests/theme-switch.spec.ts,header-links.spec.ts,console-flow-gradient.spec.ts}`
  - 根 package.json 增加 `test:e2e` script

## ADDED Requirements

### Requirement: 流动模糊渐变特效层（FlowGradient）

系统 SHALL 提供 FlowGradient 特效组件：5 层以内绝对定位椭圆（border-radius 50%），分别施加 filter: blur(40–80px) 与错速 rotate/translate 无限动画；底层椭圆叠加 SVG feTurbulence+feDisplacementMap 有机形变；容器 overflow hidden 形成"截半错落"；透明度 0.5→0.8→0.5 循环。

#### Scenario: 正常渲染
- **WHEN** 用户访问 /user/console
- **THEN** 三张 CoreInfoCard 各含 FlowGradient 背景，前景数字/等级文本清晰可读（z-index 分层、文字对比度 ≥4.5:1）
#### Scenario: 降级
- **WHEN** 系统开启 prefers-reduced-motion
- **THEN** 所有动画静止，保留静态渐变底色，无任何无限动画运行

### Requirement: 控制台页面

系统 SHALL 提供 /user/console 页面：顶部双形态切换器占位（通用版/专业版），核心信息区三张 CoreInfoCard（余额 ¥（来自 wallet Mock）/当前等级 普通/Pro/Max 切换演示/今日 token 用量进度条），下方 free 模型额度只读列表（3 行静态演示数据）。

#### Scenario: 访问控制台
- **WHEN** GET /user/console
- **THEN** HTTP 200，页面 H1 含「控制台」，三卡与额度列表渲染

### Requirement: E2E 冒烟基线（G-3 回填）

项目 SHALL 建立 Playwright 测试基建并通过三条冒烟用例，作为 establish-dev-workflow G-3 门禁的落地载体。

#### Scenario: 门禁绿
- **WHEN** 运行 test:e2e
- **THEN** 3 用例全绿退出码 0

## MODIFIED Requirements

### Requirement: establish-dev-workflow G-3 / 2-2 / 2-3
由「待 Playwright 接入后补跑」改为「三条冒烟用例绿即勾选」，回填 establish-dev-workflow/checklist.md 对应项。

## REMOVED Requirements

（无）
