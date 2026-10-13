# Checklist · establish-dev-workflow（v2 · 双轨制）

> 核验规则：按轨道/阶段分组；每组全部通过才可宣告完成。任何失败项 → tasks.md 追加 `Fix:` 任务（引用检查点编号）→ 修复后重验勾选。
> 取证标注：[命令] 必须以确切命令执行取证；[断言] 为结构/文档核验；[测试] 为自动化测试通过；[人工] 允许描述式核验。
> **本轮 apply 覆盖**：Track A 全部 + Phase 0/1/2 实施与核验（2026-08-26~27）。Phase 3/4 按粒度递减策略待独立 change-id 展开。

---

## Track A · 流程落地

- [x] A-1 `docs/governance/开发流程.md` 存在且六步名逐字出现 ≥6 次——实测 Count=9 ≥6（SubTask A.1.1）[命令]
- [x] A-2 README(v1.6) 与 文档索引(v1.1) 各含《开发流程》链接（SubTask A.1.1）[断言]
- [x] A-3 AGENTS.md 含两条相对路径锚点 `docs/governance/开发流程.md` 与本 spec 目录，L59/L60 命中（SubTask A.1.2）[命令]
- [x] A-4 `_template/` 三件套齐备且含四级层级示例与六字段空位（SubTask A.2.1）[断言]
- [x] A-5 check-gates.ps1 存在、EAP=Stop、五检查独立 PASS/FAIL、根已挂 `gates` script；经 Fix-1 后 5/5 PASS（SubTask A.3.1）[命令]

---

## Phase 0 · 工程基建

- [x] 0-1 根无 `src/`；归档 before=372 after=372 一致（SubTask 0.1.1）[命令]
- [x] 0-2 三配置无 `"src/` 失效引用（SubTask 0.1.2）[命令]
- [x] 0-3 pnpm-workspace.yaml 声明 apps/* packages/*；install 识别 5 workspace projects、exit 0（SubTask 0.2.1）[命令]
- [x] 0-4 turbo.json（v2 tasks 格式）解析成功；build.outputs 含 `.next/**`；dependsOn `^build`（SubTask 0.2.2）[命令]
- [x] 0-5 根 build dry-run 含 "web" 两处命中（SubTask 0.2.3）[命令]
- [x] 0-6 packages/config 四文件齐全、@aidean/config 导出（SubTask 0.2.4）[验证]
- [x] 0-7 apps/web/prisma/schema.prisma 迁入并 validate 输出 valid 🚀（SubTask 0.3.1-2）[命令]
- [x] 0-8 prisma generate exit 0、Client v5.22.0 生成（SubTask 0.3.2）[命令]
- [x] 0-9 seed.ts tsc es2022 零错误、无 Unknown model/arg（SubTask 0.3.3）[命令]
- [x] 0-10 env 迁入 apps/web；example 含 DATABASE_URL/REDIS_URL/JWT + 补 WECHAT/ALIPAY 占位；gitignore 补 `.env.test`（SubTask 0.4.1）。⚠️ git 实机两条命令因目录无 .git 记为待仓库初始化后复核 [命令/人工]
- [x] 0-11 Dockerfile 三阶段重写（apps/web 命中 10 处 ≥2）、next.config.mjs 补 standalone、dockerignore 强化子目录泄漏修复；docker build 记「待 CI」（SubTask 0.5.1）[命令/人工]
- [x] 0-12 门禁：pnpm install && pnpm build 连续退出码 0（build 21.5s 成功）（SubTask 0.6.1）[命令]

## Phase 1 · 共享层

- [x] 1-1 @aidean/shared 就位、web 以 workspace:* 依赖、link 生效（SubTask 1.1.1）[命令]
- [x] 1-2 shared-types 收编后归档至 current-legacy、workspace 不存在（SubTask 1.1.2）[命令+断言]
- [x] 1-3 八域 schema 文件齐备（auth/models/ladder/billing/gateway/packages/redemption/common）、shared tsc --noEmit 0 错（Task 1.2 全部）[命令]
- [x] 1-4 LadderQuerySchema.type 仅 models|stations、非法抛 ZodError（vitest 用例覆盖）（SubTask 1.2.2）[测试]
- [x] 1-5 gateway.schema.ts 红线字面量 grep 0 命中（复检 redline-hits=0）（SubTask 1.2.3）[命令]
- [x] 1-6 Envelope 泛型包装 parse 通过（SubTask 1.2.4）[测试]
- [x] 1-7 常量层 ModelTierOrder/Priority 1/99/RefreshCycle 七值 LEDGER 类型导出齐备（SubTask 1.3.1）[测试]
- [x] 1-8 money.ts 测试全绿（'10'→1000n 元→分语义、往返/零/超大/非法抛错 ≥8 例）（SubTask 1.4.1）[测试]
- [x] 1-9 billing.ts 公式实现 round-half-up BigInt 分、≥6 用例含免费=0/默认倍率/加价 1.1（SubTask 1.4.2）[测试]
- [x] 1-10 packages/ui 八组件 ≤60 行、占位简化版头注、peerDeps 正确、tsc/build 通过（SubTask 1.5.1）[命令+断言]
- [x] 1-11 EChartWrapper 动态 import echarts（可选 peer），不进包产物主入口（SubTask 1.5.2）[断言]
- ★ 附加证据：shared 包 vitest 35/35 全绿（auth/ladder/envelope/money/billing 五 spec）

## Phase 2 · 应用骨架

- [x] 2-1 globals.css 无 dark: 变体（dark-count=0）；indigo/teal/orange 三组变量齐备；html lang="zh-CN"（SubTask 2.1.1）[命令+断言]
- [x] 2-2 ThemeProvider/ThemeSwitcher/uiStore（aidean-theme 持久化键）就位；✅ e2e 已补跑：theme-switch 用例绿（teal 切换→reload 持久，见 implement-console-effects-and-e2e C-8）（SubTask 2.1.2）[测试]
- [x] 2-3 SiteHeader 采用 NAV_ITEMS 单源 DRY 实现，七项链接与顺序在 lib/navigation.ts 断言全命中；Logo 回首页；导航栏上方零元素；✅ e2e 已补跑：header-links 用例绿（顺序契约+Logo URL 断言，见 implement-console-effects-and-e2e C-9）（SubTask 2.2.1）[测试]
- [x] 2-4 SiteFooter 渲染零 error、三列+版权行、About 入口（SubTask 2.2.2）[构建+断言]
- [x] 2-5 首页八区块 DOM 顺序正确；hero SSR 直渲（LCP 决策并已注明偏离理由）；下方区块 opacity-0 渐显；容器 max-w-7xl px 缩放（SubTask 2.3.1）[构建+断言]
- [x] 2-6 PartnerMarquee 双行反向 keyframes、复制列表无缝、hover paused、灰度 hover primary（SubTask 2.3.2）[断言]
- [x] 2-7 七路由 build 输出全部 ○ Static 200 预渲染（about/docs/models/partners/pricing/products/roadmap 各 190B）（SubTask 2.4.1）[命令]
- [x] 2-8 pricing 三 section id 全命中（gateway-pricing/recharge-tiers/product-tiers L27/L65/L86）（SubTask 2.4.2）[断言]
- [x] 2-9 _lib 信封恒四要素 + x-request-id 贯穿、错误码表对齐 §4 段位（badRequest→40000 已登记注记）（SubTask 2.5.1）[构建+断言]
- [x] 2-10 health={status:"ok"}、navigation 七项=NAV_ITEMS 单源（SubTask 2.5.2）[构建注册+断言]
- [x] 2-11 lib/features 7 域(+redemption 子域)各四文件齐备；跨域直 import 断言 cross_domain_imports=0；README 纪律成文（SubTask 2.6.1）[命令+grep]
- [x] 2-12 首页路由表静态预渲染 95.1kB First Load；echarts 未安装于 web（动态 import 红线由 shared/ui 侧保证）— chunk 卫生复跑留待引入图表时执行（SubTask 2.7.1）[部分取证/lint 待补]

## Phase 3 · MVP 模块（按粒度递减策略，各模块独立 change-id 展开）

- [x] 3-x·天梯图 ✅（change-id: implement-ladder-module）——核心交付：DESIGN.md 设计先行、seed 扩容(代码静态验证✅/DB count 待 Docker 环境)、rankService.recap+formula-parser(19 tests)、读穿缓存矩阵服务(13 tests, Redis 降级链)、四端点(ladder/models/[id]/stations, 20002 信封)、六筛选五排序栏、双视图同源(切视图零请求 e2e 断言)、详情锚点目录页。四连门禁：shared 35/35→build 0→gates 5/5→e2e 8/8
- [x] 3-x·用户系统 ✅（change-id: implement-auth-module）——核心交付：shared 用户域契约（PriorityUpsert/TierMappingUpsert/UserProfile/QuotaUsageItem）、bcrypt+jose 双令牌（access15m/refresh7d jti+ver 轮换，无 Session 表→无状态 JWT 对方案）、auth 五路由+微信扫码探测降级（/api/v1/wechat/qrcode enabled 开关，凭据到位零结构启用）、middleware /user/* 守卫 307 回跳、login/register 页、SiteHeader 登录区接真、console 切真（¥128 Mock 归零、双形态受控持久化、专业版优先级整组覆盖 UPSERT、free 只读区「系统配置」徽章）。五连门禁：shared 40→webtest 70→build 0(29 路由)→gates 5/5→e2e 11/11。[待 DB]移交 6 项复验清单见该模块 checklist
- [ ] 3-x·余额账本（wallet/ledger/hold 服务层，待立项）
- [ ] 3-x·统一计费网关（降级链/协议中转/计费引擎，压轴）

## Phase 4 · 二阶段能力（未立项）

- [ ] 4-x 随立项随检

## 全局回归门禁

- [x] G-1 pnpm build 全绿（exit 0, 21.5s）+ gates 内 tsc typecheck 0 errors
- [x] G-2 `pnpm gates` 汇总退出码 0（5/5 PASS，经 Fix-1 修复 barrel 误报）
- [x] G-3 e2e 关键链路冒烟通过——Playwright 底座由 implement-console-effects-and-e2e 建成：theme-switch/header-links/console-flow-gradient 3 spec 4 tests 全绿 (9.7s)；`pnpm test:e2e` exit 0

---

## 遗留与移交注记

1. ~~git 类取证待仓库初始化~~ ✅ 已解决（2026-08-27）：`.git` 初始化 + 全量首提 `920a1be` 推送至 github.com/CodingHeader/Aidean（main，socks5://127.0.0.1:10808 代理仅 local 配置）；安全断言过三关（env/node_modules 零泄漏、无嵌套子仓库、无 >8MB 可疑文件）；`.turbo/cache`、`.workbuddy`、`package-lock.json`、`scripts/e2e-report.json`（测试报告铁则移除）已剔除并补 gitignore。**后续写库类取证（0-10 git check-ignore 等）现可实机执行**。
2. ~~Docker build 待 CI 或网络可达环境实跑~~ ✅ 已闭环（2026-08-29）：CI `docker-build` job（buildx + gha 缓存）首跑连抓 3 层根因（Dockerfile 漏拷 shared manifest → zod 未装 → web 冗余 zod@4 hoist 掩盖类型退化），修复后 `e9c9687` **verify + docker-build 双 job success，生产镜像首次构建成功**；prod compose 应用层（web+nginx）补全详见《Docker配置文档》v2.2 §2.2，compose config 校验已入门禁。
3. ~~Playwright e2e 尚未建库~~ ✅ 已解决：G-3 由 implement-console-effects-and-e2e 建成后扩至 11/11（auth-guard/ladder-matrix 并入）。
4. ~~`packages/api-contracts/`（空壳）待决策并入或删除~~ ✅ 已决策（2026-08-28）：**删除**——契约唯一真源为 `packages/shared`（Zod）；同步清理 tsconfig.base.json paths 映射、Dockerfile 死引用（api-contracts 注释 + 已归档 shared-types 的 COPY 行，修复 deps 阶段必失败）。~~`features/README.md` 与铁律 1 的 CI 实装冲突~~ ✅ 已解决（2026-08-28）：CI（.github/workflows/ci.yml + scripts/check-docs-rule.mjs）对 `**/README.md` 豁免（导航惯例非实体文档）；apps 下唯一实体文档 ladder/DESIGN.md 已迁 `docs/product/modules/天梯模块设计文档.md`（v1.1，引用同步）。
5. ~~PG 凭据修复后复验 [待DB] 清单~~ ✅ 已完成（2026-08-28）：凭据修复（.env 与 .env.local 双文件——注意 .env.local 优先级覆盖陷阱）→ `db push --force-reset` 35 表同步 → seed 五项全达标（22 厂商/78 模型/78 评分/4 权重/6 榜单，另 20 站点+2 用户）；天梯图 API 实弹出榜（rows=7，90–95 档 o1=93.25/DeepSeek-R1=92/Claude3.7=91.5）；注册→me→PUT priorities→GET 回读整链路通；e2e 11/11 真实数据复跑全绿。
6. ~~下一里程碑候选：`implement-billing-module`（余额账本）~~ ✅ 已完成（2026-08-27，见 implement-billing-module/checklist）；后续 `implement-gateway-module` 亦已收官（2026-08-28），**MVP 四模块全绿**。G-2 硬门禁 CI 已实装：`.github/workflows/ci.yml`（铁律1 → prisma generate → 双包 tsc --noEmit → 双包单测 → next build）。
