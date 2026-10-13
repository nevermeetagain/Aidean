# Tasks · 完整项目开发流程（原子化任务书）

> change-id: `establish-dev-workflow` | 版本: v2 | 双轨制 | 四级层级说明见文末《层级图例》

---

## 层级图例（L1→L4）

| 级 | Markdown 载体 | 本级职责 |
|---|---|---|
| **L1 阶段** | `## …`（轨道/Phase） | 声明该组目标、前置条件、交付物 |
| **L2 任务** | `### Task x.y 名称` | 一个可独立验收的功能面；标注【依赖】【产出】 |
| **L3 子任务** | `#### SubTask x.y.z 名称` | 最小可执行单元；字段完备即合法（缺任一必需字段=非法任务，停止执行） |
| **L4 字段** | 子任务下有序列表 `- 【字段】: 内容` | 最小原子信息：目标/范围/验收/验证命令/产出/依赖 |

复选框规则：L2 勾选 = 其全部 L3 完成并经 checklist 对应检查点通过。

---

# 轨道 A · 流程落地（把元流程建起来）

> **本级职责（L1）**：让六步循环从"写在 spec 里"变为"项目级真源 + 可复用模板 + 可执行门禁"。前置：无。交付物：文档中心流程入口、Spec 模板目录、门禁基线脚本。

### Task A.1 六步循环真源落档 【目标: 使流程成为项目正式规范而非仅存于 specs | 依赖: 无 | 产出: .docs 开发流程条目】

- [x] #### SubTask A.1.1 文档中心新增《开发流程》权威条目
  - 【目标】将六步循环、四层级、六字段字典写入 `docs/`，成为铁律级约束的可读来源
  - 【范围】新建 `e:\Code\Aidean\.docs\开发流程.md`（含循环图/字段字典/增量展开规则）；修改 `.docs\README.md` TOC 与 `.docs\文档索引.md` 各加一行链接
  - 【验收】三个文件均存在且互相链接可达；《开发流程.md》包含六步名与六字段名逐字出现
  - 【验证命令】`Select-String -Path .docs\开发流程.md -Pattern 'PLAN','SPEC','APPROVE','IMPLEMENT','VERIFY','CLOSE' | Measure-Object | Select Count` → Count ≥ 6
  - 【产出】`docs/governance/开发流程.md`
  - 【依赖】无

- [x] #### SubTask A.1.2 AGENTS.md 补挂流程锚点
  - 【目标】让每次会话规则加载时知晓流程出处
  - 【范围】修改 `e:\Code\Aidean\AGENTS.md`（追加一节「开发流程」指向 `docs/governance/开发流程.md` 与本 change-id 目录）
  - 【验收】AGENTS.md 出现两处路径且均为相对路径
  - 【验证命令】`Select-String -Path AGENTS.md -Pattern '\docs/governance/开发流程\.md','docs/specs/establish-dev-workflow'` → 匹配数 ≥ 2
  - 【产出】AGENTS.md 更新
  - 【依赖】A.1.1

### Task A.2 Spec 三件套模板固化 【目标: 后续 change-id 一键按格式起步 | 依赖: 无 | 产出: _template 目录】

- [x] #### SubTask A.2.1 建立 `_template/` 骨架
  - 【目标】提供 spec/tasks/checklist 中文骨架（占位符式），杜绝新里程碑忘带字段
  - 【范围】新建 `e:\Code\Aidean\.trae\specs\_template\{spec.md,tasks.md,checklist.md}`
  - 【验收】三文件存在；tasks 模板内置四级层级示例与六字段空位注释；spec 模板含 Why/What Changes/Impact/ADDED/MODIFIED/REMOVED 全节
  - 【验证命令】`(Get-ChildItem docs/specs/_template).Count -ge 3`
  - 【产出】模板目录
  - 【依赖】无

### Task A.3 门禁基线脚本 【目标: 把高频验收命令固化为一键取证 | 依赖: 无 | 产出: scripts/check-gates.ps1】

- [x] #### SubTask A.3.1 编写 PowerShell 门禁脚本
  - 【目标】汇总 install/build/tsc/prisma-validate/barrel-检查 五类命令，任一失败即非零退出
  - 【范围】新建 `e:\Code\Aidean\scripts\check-gates.ps1`；根 package.json 加 `"gates"` script 调用
  - 【验收】脚本含 `$ErrorActionPreference='Stop'`；五类检查各自独立输出 PASS/FAIL 且最终汇总退出码正确
  - 【验证命令】`pnpm gates`（构建链通后全 PASS；基建未完成前允许首项即 FAIL——此属预期，进入 Task 0.6 前不必强求绿）
  - 【产出】`scripts/check-gates.ps1`
  - 【依赖】0.2（turbo 管道存在才能跑 build 类检查；允许先行提交、延后转绿）

---

# 轨道 B · 开发执行（做什么事：Phase 0→4）

> **本级职责（L1）**：以 MVP 定义为主线的五阶段实施。全局顺序 Phase 0→1→2→3→4；各 Phase 内并行关系在各 Task 标注。
> **前置校验（阶段门禁）**：进入 Phase N 前其所有前序 Phase 的 checklist 分组必须全部勾选。

---

## Phase 0 · 工程基建

> **本级职责（L1）**：把仓库从「turbo 雏形 + 断裂路径」治理为「Monorepo 分包可用骨架」。**前置**: 无。**交付物**: 可运行的 workspace 构建、prisma 就位 apps/web、env 体系归位、Docker 构建通。

### Task 0.1 旧代码归档 【依赖: 无 | 产出: 归档区 current-legacy】

- [ ] #### SubTask 0.1.1 移动 src/ 至历史区
  - 【目标】旧单仓代码整体让位且保留回溯（归档≠删除）
  - 【范围】移动 `src/**` → `.example/history/current-legacy/src/**`
  - 【验收】根目录无 `src/`；归档区文件计数 > 0 且等于原 src 文件数
  - 【验证命令】`Test-Path src` 为 False；`(Get-ChildItem .example/history/current-legacy/src -Recurse -File).Count -gt 0`
  - 【产出】归档副本
  - 【依赖】无

- [ ] #### SubTask 0.1.2 清除失效路径引用
  - 【目标】配置不再指向已归档路径（重写由 Task 0.2/0.3 承接）
  - 【范围】修改 根`package.json`、`apps/web/package.json`、`apps/web/tsconfig.json` 中 `"src/` 引用
  - 【验收】三份配置 grep `"src/` 无结果
  - 【验证命令】`Select-String -Path package.json,apps/web/*.json,apps/web/tsconfig.json -Pattern '"src/'` → 无匹配
  - 【产出】干净配置
  - 【依赖】0.1.1

### Task 0.2 Monorepo 三件套 【依赖: 0.1 | 产出: pnpm-workspace.yaml / turbo.json / @aidean/config】

- [ ] #### SubTask 0.2.1 建立 pnpm-workspace.yaml
  - 【目标】声明 `apps/*` `packages/*` 为成员
  - 【范围】新建 `pnpm-workspace.yaml`
  - 【验收】含两行 glob 声明；install 成功识别 apps/web
  - 【验证命令】`pnpm install` 退出码 0
  - 【产出】workspace 声明
  - 【依赖】0.1.2

- [ ] #### SubTask 0.2.2 重写 turbo.json 管道
  - 【目标】build/lint/typecheck/dev 五管道 + 包间 `^build` 依赖图
  - 【范围】重写 `turbo.json`
  - 【验收】JSON 合法；build.outputs 含 `.next/**`；shared 变更会触发 web 重 build
  - 【验证命令】`Get-Content turbo.json -Raw | ConvertFrom-Json` 成功解析
  - 【产出】管道定义
  - 【依赖】0.2.1

- [x] #### SubTask 0.2.3 根 scripts 对齐 --filter=web
  - 【目标】根 dev/build/lint/db:* 全部经 turbo 定向 web 工作区
  - 【范围】修改 根`package.json` scripts
  - 【验收】`pnpm build --dry=json` 输出含 web 任务
  - 【验证命令】`pnpm build --dry=json | Select-String '"web"'` 有匹配
  - 【产出】可用根命令
  - 【依赖】0.2.2

- [x] #### SubTask 0.2.4 共享工程配置包 @aidean/config
  - 【目标】ESLint/TS/Prettier 配置收敛为 workspace 包供两端引用
  - 【范围】新建 `packages/config/{package.json,eslint/index.cjs,tsconfig/base.json,prettier/index.json}`
  - 【验收】四个文件齐全；package name=@aidean/config 正确导出
  - 【验证命令】`Test-Path packages/config/tsconfig/base.json` 为 True
  - 【产出】工程配置包
  - 【依赖】0.2.1

### Task 0.3 Prisma 落位 apps/web 【依赖: 0.2 | 产出: apps/web/prisma/**】

- [ ] #### SubTask 0.3.1 迁移 prisma 目录
  - 【目标】schema v2.0 进应用包，根治 db 脚本断裂债
  - 【范围】移动 `prisma/{schema.prisma,seed.ts,migrations?}` → `apps/web/prisma/`；修改 `apps/web/package.json` db:* 相对路径
  - 【验收】schema 位于新位置且头注版本 v2.0；db:seed 可寻址
  - 【验证命令】`Test-Path apps/web/prisma/schema.prisma` 为 True
  - 【产出】应用内 prisma
  - 【依赖】0.2.3

- [ ] #### SubTask 0.3.2 prisma validate + generate 冒烟
  - 【目标】证明 schema 合法且 client 可生成
  - 【范围】生成物 `apps/web/node_modules/.prisma/**`
  - 【验收】validate 输出 "valid"；generate 退出码 0
  - 【验证命令】`$env:DATABASE_URL='postgresql://u:p@localhost:5432/d'; pnpm --filter web exec prisma validate; pnpm --filter web exec prisma generate`
  - 【产出】Prisma Client
  - 【依赖】0.3.1

- [ ] #### SubTask 0.3.3 seed.ts 类型冒烟
  - 【目标】seed 与 schema v2.0 模型一致（wallet/stationBillingRule 等）
  - 【范围】`apps/web/prisma/seed.ts`
  - 【验收】tsc 对 seed 无 Unknown model / Unknown arg 错误
  - 【验证命令】`pnpm --filter web exec tsc prisma/seed.ts --noEmit`
  - 【产出】可靠种子脚本
  - 【依赖】0.3.2

### Task 0.4 环境变量体系 【依赖: 0.2 | 产出: apps/web/.env* 四件套】

- [x] #### SubTask 0.4.1 env 迁移与隔离
  - 【目标】Next 约定位置承载 env；secret 与模板分离
  - 【范围】移动 `.env|.env.example|.env.local|.env.test` → `apps/web/`；核对 .gitignore
  - 【验收】`.env.example` 被追踪且含 DATABASE_URL/REDIS_URL/JWT_SECRET/WECHAT 占位；`.env` 被 ignore
  - 【验证命令】`git check-ignore apps/web/.env; git ls-files apps/web/.env.example`
  - 【产出】env 四件套
  - 【依赖】0.2.1

### Task 0.5 Docker 构建适配 【依赖: 0.3 | 产出: 可构建镜像定义】

- [x] #### SubTask 0.5.1 Dockerfile 构建上下文校正
  - 【目标】镜像能装配 monorepo 产物并启动 standalone 服务
  - 【范围】修改 `Dockerfile`（或 `docker/app/Dockerfile`）
  - 【验收】本地或 CI `docker build` 成功；若网络不可达则在 tasks.md 本项标注「待 CI」豁免注记
  - 【验证命令】`docker build -t aidean-web .`（网络受限时人工核验 Dockerfile 步骤完备性并在该项旁注记）
  - 【产出】镜像定义
  - 【依赖】0.3.2

### Task 0.6 阶段门禁核验 【依赖: 0.1–0.5 全部 | 产出: 绿色构建基线】

- [x] #### SubTask 0.6.1 全量构建门禁
  - 【目标】install→generate→build 全链路证明基建完整
  - 【范围】仓库整体
  - 【验收】`pnpm install && pnpm build` 连续退出码 0
  - 【验证命令】同左
  - 【产出】绿色基线（进入 Phase 1 的硬条件）
  - 【依赖】0.1.* ~ 0.5.*

---

## Phase 1 · 共享层

> **本级职责（L1）**：建成跨端唯一契约源 packages/shared 与组件底座 packages/ui。**前置**: Phase 0 checklist 全勾。**交付物**: schemas 八域 + money/billing 纯函数(带测) + ui 最小组件集。

### Task 1.1 shared 包骨架 【依赖: Phase 0 | 产出: @aidean/shared】

- [x] #### SubTask 1.1.1 初始化包结构与 barrel 入口
  - 【目标】建立唯一允许 barrel 的契约包
  - 【范围】新建 `packages/shared/{package.json,src/index.ts,src/schemas/,src/types/,src/constants/,src/utils/}`
  - 【验收】name=@aidean/shared、exports 有效；web 以 `"@aidean/shared":"workspace:*"` 依赖
  - 【验证命令】`pnpm --filter web list @aidean/shared`
  - 【产出】契约包壳
  - 【依赖】0.6

- [x] #### SubTask 1.1.2 收编旧 shared-types 并归档
  - 【目标】消除重复类型包
  - 【范围】评估 `packages/shared-types/**` → 有效部分并入 `src/types/` → 整目录移入 `.example/history/current-legacy/`
  - 【验收】active workspace 无 shared-types；并入类型 tsc 通过
  - 【验证命令】`Test-Path packages/shared-types` 为 False
  - 【产出】单一类型源
  - 【依赖】1.1.1

### Task 1.2 Zod Schema 契约库（8 域） 【依赖: 1.1 | 产出: src/schemas/*.schema.ts ×8】

- [x] #### SubTask 1.2.1 auth 域
  - 【目标】注册/登录/微信扫码/刷新请求响应契约
  - 【范围】新建 `packages/shared/src/schemas/auth.schema.ts`
  - 【验收】Register/Login/WechatLogin/AuthResponse Schema 与 z.infer 导出齐备
  - 【验证命令】`pnpm --filter @aidean/shared test auth`
  - 【产出】auth.schema.ts
  - 【依赖】1.1.1

- [x] #### SubTask 1.2.2 models+ladder 域
  - 【目标】筛选参数、榜单查询、详情响应契约
  - 【范围】新建 `models.schema.ts`,`ladder.schema.ts`
  - 【验收】type 枚举仅 models|stations；分页 meta 统一
  - 【验证命令】同上 pattern ladder
  - 【产出】两 schema 文件
  - 【依赖】1.1.1

- [x] #### SubTask 1.2.3 billing+gateway 域（敏感隔离红线）
  - 【目标】充值/兑换码/网关双格式请求体/用量查询契约
  - 【范围】新建 `billing.schema.ts`,`gateway.schema.ts`
  - 【验收】GatewayChat 以 discriminatedUnion 区分 openai|anthropic；**全文件无 markupRate/tokenMultiplier 字面量**
  - 【验证命令】`Select-String -Path packages/shared/src/schemas/gateway.schema.ts -Pattern 'markupRate|token_multiplier'` → 无匹配
  - 【产出】两 schema 文件
  - 【依赖】1.1.1

- [x] #### SubTask 1.2.4 package/redemption/common 域
  - 【目标】套餐、兑换码、统一信封 Envelope 泛型
  - 【范围】新建 `packages.schema.ts`,`redemption.schema.ts`,`common.schema.ts`
  - 【验收】Envelope<ZodType> 包装任意 data parse 通过
  - 【验证命令】`pnpm --filter @aidean/shared test envelope`
  - 【产出】三 schema 文件
  - 【依赖】1.1.1

### Task 1.3 常量层 【依赖: 1.1 | 产出: src/constants/*.constants.ts】

- [x] #### SubTask 1.3.1 领域常量集中
  - 【目标】排序键/等级序/刷新周期/账本类型单一来源
  - 【范围】新建 `src/constants/{ladder,billing,gateway,user}.constants.ts`
  - 【验收】ModelTierOrder=[OPUS,SONNET,FABLE,HAIKU]；PriorityMin=1,PriorityMax=99；RefreshCycle=DAY|WEEK|MONTH
  - 【验证命令】`pnpm --filter @aidean/shared exec tsc --noEmit`
  - 【产出】四常量文件
  - 【依赖】1.1.1

### Task 1.4 计费纯函数（带测试） 【依赖: 1.3 | 产出: money.ts / billing.ts + vitest]

- [x] #### SubTask 1.4.1 money.ts 金额换算
  - 【目标】分↔元 BigInt 无损
  - 【范围】新建 `src/utils/money.ts` + `__tests__/money.spec.ts`
  - 【验收】≥8 用例全绿（往返/零/超大额/非法输入抛错）
  - 【验证命令】`pnpm --filter @aidean/shared test money`
  - 【产出】money 模块
  - 【依赖】1.1.1

- [x] #### SubTask 1.4.2 billing.ts Token 计费公式
  - 【目标】`扣费=(上游单价×加价率)×(token数×倍率)` 权威实现
  - 【范围】新建 `src/utils/billing.ts` + 测试
  - 【验收】≥6 用例（默认1.0/加价/缓存价/免费优惠=0）；纯函数输出 BigInt 分
  - 【验证命令】`pnpm --filter @aidean/shared test billing`
  - 【产出】billing 模块
  - 【依赖】1.4.1

### Task 1.5 ui 组件库初始化 【依赖: 0.6 | 产出: @aidean/ui 基座】

- [x] #### SubTask 1.5.1 shadcn 原子组件最小集
  - 【目标】Button/Input/Dialog/Card/Table/Tabs/Badge/DropdownMenu 八件套
  - 【范围】新建 `packages/ui/**`
  - 【验收】构建通过；peerDeps 含 react/tailwindcss；零业务逻辑
  - 【验证命令】`pnpm --filter @aidean/ui build`
  - 【产出】ui 包
  - 【依赖】0.6

- [x] #### SubTask 1.5.2 EChartWrapper（动态 import 红线样板）
  - 【目标】图表封装统一主题注入与懒加载
  - 【范围】新建 `packages/ui/src/charts/EChartWrapper.tsx`
  - 【验收】echarts 仅存在于异步 chunk；主题读取 CSS 变量
  - 【验证命令】构建产物目录 `Select-String -Path .next/static/chunks/*.js -Pattern 'echarts'` 仅命中 async chunk（配合 analyze）
  - 【产出】图表封装
  - 【依赖】1.5.1

---

## Phase 2 · 应用骨架

> **本级职责（L1）**：七项导航 + 区块首页 + API 底座 + feature 脚手架成型。**前置**: Phase 1 checklist 全勾。**交付物**: 可浏览骨架站 + system 接口 + features 目录树。

### Task 2.1 根布局与主题 【依赖: Phase 1 | 产出: layout/theme】

- [ ] #### SubTask 2.1.1 layout+globals 三浅色主题变量
  - 【目标】中文默认 lang、Providers、data-theme 令牌组（indigo/teal/orange）、无 dark:
  - 【范围】`apps/web/app/layout.tsx,globals.css`
  - 【验收】SSR html 含 lang="zh-CN"；globals 无 dark: 前缀；三组变量名齐全
  - 【验证命令】`Select-String -Path app/globals.css -Pattern 'dark:'` 无匹配；`Select-String 'indigo|teal|orange'` 各命中
  - 【产出】布局基座
  - 【依赖】1.5.1

- [ ] #### SubTask 2.1.2 ThemeSwitcher + uiStore
  - 【目标】切换即时生效、localStorage 持久
  - 【范围】新建 `stores/uiStore.ts`、`components/common/ThemeSwitcher.tsx`
  - 【验收】点击→html[data-theme] 变化→reload 保持
  - 【验证命令】e2e: `pnpm --filter web e2e theme-switch`（Playwright 用例）
  - 【产出】主题能力
  - 【依赖】2.1.1

### Task 2.2 七项导航 【依赖: 2.1 | 产出: SiteHeader/SiteFooter】

- [ ] #### SubTask 2.2.1 SiteHeader
  - 【目标】七项导航链接 + Logo 回首页 + 右侧用户区；导航栏上方零元素
  - 【范围】新建 `components/site/SiteHeader.tsx`（数据接 `/api/v1/system/navigation`）
  - 【验收】链接集合={/models,/products,/pricing,/docs,/roadmap,/partners,/about} 顺序一致
  - 【验证命令】e2e header-links 用例
  - 【产出】页头
  - 【依赖】2.1.1、2.5.2（接口可 mock 先行）

- [ ] #### SubTask 2.2.2 SiteFooter
  - 【目标】页脚结构 + About 入口 + 产品三卡引用
  - 【范围】新建 `components/site/SiteFooter.tsx`
  - 【验收】渲染零 console error
  - 【验证命令】页面快照/e2e footer 用例
  - 【产出】页脚
  - 【依赖】2.1.1

### Task 2.3 首页区块化长页 【依赖: 2.2 | 产出: app/page.tsx + components/home/*】

- [x] #### SubTask 2.3.1 八区块骨架 + 滚动渐入 + 留白容器
  - 【目标】菜单栏→banner→平台介绍→模型→产品→路线图→合作→关于；IntersectionObserver 渐显；正文 max-w 留白
  - 【范围】`app/page.tsx`、新建 `components/home/*`（SectionFrame/RevealOnScroll）
  - 【验收】区块 DOM 顺序一致；下方区块初始 opacity-0；首屏 SSR 直渲 banner 文案
  - 【验证命令】curl 首页 HTML 含 banner 标题；Playwright reveal 断言
  - 【产出】首页长页
  - 【依赖】2.2.*

- [ ] #### SubTask 2.3.2 PartnerMarquee logo 墙
  - 【目标】奇偶行反向无缝循环、hover 暂停、灰度 hover 复色
  - 【范围】新建 `components/home/PartnerMarquee.tsx` + 种子 partner 数据
  - 【验收】两行 animation-direction 相反；hover play-state paused
  - 【验证命令】Playwright marquee 用例
  - 【产出】合作墙
  - 【依赖】2.3.1

### Task 2.4 (web) 七路由 + 价格骨架 【依赖: 2.2 | 产出: 占位页×7 + pricing 三段骨架】

- [ ] #### SubTask 2.4.1 一级路由占位 ×7
  - 【目标】每路由 Server Component 占位（H1 中文 + 面包屑）
  - 【范围】新建 `app/(web)/{models,products,pricing,docs,roadmap,partners,about}/page.tsx`
  - 【验收】七路由 HTTP 200
  - 【验证命令】PowerShell 循环 Invoke-WebRequest 状态码断言
  - 【产出】路由矩阵
  - 【依赖】2.2.1

- [ ] #### SubTask 2.4.2 价格中心三段骨架
  - 【目标】#gateway-pricing/#recharge-tiers/#product-tiers 三锚区块
  - 【范围】`app/(web)/pricing/page.tsx` + `components/pricing/*`
  - 【验收】DOM 三 id 存在
  - 【验证命令】Playwright id 断言
  - 【产出】价格骨架
  - 【依赖】2.4.1

### Task 2.5 API v1 底座 【依赖: 1.2 | 产出: _lib + system 两接口】

- [x] #### SubTask 2.5.1 _lib 信封与中间件装配
  - 【目标】success/error/badRequest 封装 + requestId 贯穿
  - 【范围】新建 `app/api/v1/_lib/**`
  - 【验收】错误响应恒四要素 {code,message,data:null,requestId}
  - 【验证命令】单测 badRequest 快照
  - 【产出】API 助手层
  - 【依赖】1.2.4

- [ ] #### SubTask 2.5.2 system health/navigation
  - 【目标】健康检查与导航公开端点
  - 【范围】新建 `app/api/v1/system/{health,navigation}/route.ts`
  - 【验收】health={status:"ok"}；navigation 七项顺序=常量
  - 【验证命令】Invoke-RestMethod 两端点字段断言
  - 【产出】系统接口
  - 【依赖】2.5.1、1.3.1

### Task 2.6 features 脚手架 【依赖: Phase 1 | 产出: lib/features/** 目录树】

- [ ] #### SubTask 2.6.1 七域目录与占位规范
  - 【目标】ladder/ranking/gateway/billing/wallet/evaluation/package(+redemption) 目录各含 service/repository/schema/types 占位
  - 【范围】新建 `apps/web/lib/features/**`
  - 【验收】目录计数≥7 且各域四文件齐全；跨域直 import 为零
  - 【验证命令】`Get-ChildItem lib/features -Directory | Measure-Object` Count≥7；grep 跨域 import 断言
  - 【产出】业务骨架树
  - 【依赖】1.1.1

### Task 2.7 阶段门禁核验 【依赖: 2.1–2.6 全部 | 产出: bundle 卫生报告】

- [x] #### SubTask 2.7.1 SSR/LCP 与 chunk 卫生
  - 【目标】首屏直渲；echarts 不进公共 chunk
  - 【范围】`.next/**` 分析
  - 【验收】首页 HTML 含 banner 文案；公共 chunk 无 echarts 关键字
  - 【验证命令】curl HTML 断言 + `ANALYZE=true pnpm build`
  - 【产出】卫生基线（进入 Phase 3 硬条件）
  - 【依赖】2.3.1、1.5.2

---

## Phase 3 · MVP 模块（模块级 + 关键子项；开工时按 spec §增量规则补独立 change-id）

> **本级职责（L1）**：四大模块按 MVP 序交付。**前置**: Phase 2 checklist 全勾。**内部并行**: 3.1∥3.2；3.3 早于 3.4。

### Task 3.1 天梯图模块 【依赖: P2 | 产出: 两榜可用】

- [ ] #### SubTask 3.1.1 ladder 数据服务（矩阵/缓存）
  - 【范围】`lib/features/ladder/**`、`app/api/v1/ladder/route.ts`
  - 【目标】【验收】GET type=models|stations 返回矩阵；Redis 二次命中有日志证据
- [ ] #### SubTask 3.1.2 天梯交互组件（专业版应用版/表格柱状图）
  - 【范围】`components/ladder/**`
  - 【目标】【验收】视图切换零二次请求；柱状动态加载
- [ ] #### SubTask 3.1.3 排名算法与公式解析器接入
  - 【范围】`lib/features/ranking/**`
  - 【目标】【验收】权重调整触发缓存失效；公式错误不阻断排序
- [ ] #### SubTask 3.1.4 模型详情页与站点资费 Tab
  - 【范围】`app/(web)/models/[id]/**`
  - 【目标】【验收】对照需求§七详情行逐项勾验

### Task 3.2 用户系统 【依赖: P2 | 产出: 登录+控制台】

- [ ] #### SubTask 3.2.1 认证（邮箱+微信扫码→同一 JWT 体系）
  - 【范围】`lib/auth/**`、`app/api/v1/auth/**`、`app/(web)/auth/**`
  - 【目标】【验收】双通道登录可用；锁定策略生效
- [ ] #### SubTask 3.2.2 控制台（通用版绑定/专业版优先级/Free 只读/CoreInfoCard 特效）
  - 【范围】`app/(web)/user/**`、`components/console/**`
  - 【目标】【验收】双形态共享同一 PUT 配置幂等；reduced-motion 降级断言

### Task 3.3 余额账本 【依赖: P2 | 产出: 钱包闭环】

- [ ] #### SubTask 3.3.1 账本服务（双录/幂等/乐观锁）
  - 【范围】`lib/features/billing/**,wallet/**`
  - 【目标】【验收】并发压测余额守恒 Σcredit−Σdebit；幂等冲突被拒
- [ ] #### SubTask 3.3.2 充值订单流（hold→capture 多退少补）
  - 【范围】`app/api/v1/finance/**`、支付沙箱桩
  - 【目标】【验收】预扣生命周期 authorized→captured/voided/expired 全场景

### Task 3.4 统一计费网关 【依赖: 3.3 | 产出: 网关可调计费】

- [ ] #### SubTask 3.4.1 降级链路由器（priority→故障切换→free 兜底）
  - 【范围】`lib/features/gateway/router.ts`
  - 【目标】【验收】高优 500 自动降次级；未配置+欠费自动 free
- [ ] #### SubTask 3.4.2 OpenAI↔Anthropic 协议中转
  - 【范围】`lib/features/gateway/protocol/**`
  - 【目标】【验收】双向转换映射单测完备
- [ ] #### SubTask 3.4.3 计费三分叉引擎 + 敏感白名单序列化
  - 【范围】`gateway/billing-engine.ts`、admin 序列化中间层
  - 【目标】【验收】五路径 e2e 各一例；非 admin 响应 grep 无 markup_rate|token_multiplier
- [ ] #### SubTask 3.4.4 usage_logs 幂等写入 + 日汇总 + RANGE 分区 migration
  - 【范围】`prisma/migrations/*_partition`（raw SQL）
  - 【目标】【验收】requestId 去重；`\d+ usage_logs` 显示 PARTITION BY RANGE(created_at)

---

## Phase 4 · 二阶段能力（远景级；逐个按增量规则展开新 change-id）

> **本级职责（L1）**：MVP 之后的能力储备。不预先穷举细节。

- [ ] Task 4.1 测评与对比模块（¥2/模型/次预扣 + Dock 对比车）
- [ ] Task 4.2 套餐体系（展示/余额兑换/套餐直连计费例外）
- [ ] Task 4.3 兑换码体系（批量生成/一次性核销事务/定向套餐码）
- [ ] Task 4.4 后台管理完善（Key池/计费规则敏感页/等级池/免费额度配置）
- [ ] Task 4.5 产品页深化（AideanRag 跳转联调/WeChatRag 分级权益/SkillsCloud 规划态）

---

# 核验修复回路（VERIFY 阶段产出）

- [x] Fix-1（引用检查点 A-5 / 门禁 barrel-check）：`scripts/check-gates.ps1` 的 barrel-check 过滤逻辑失效——将目录下所有文件误计为 index.ts（输出 49 含 globals.css/layout.tsx 等），而真实 index.ts 计数为 0。修复 Get-ChildItem 过滤参数使仅统计名为 index.ts 的文件，重跑 `pnpm gates` 须 5/5 PASS。（已修：根因 `-Include` 搭配非通配路径被静默忽略，改 `-Filter 'index.ts'`；复跑 5/5 PASS 退出码 0）



```
Track A: A.1 ── A.1.2          A.2 独立    A.3 依赖 0.2（可先提交延后转绿）
Track B: P0: 0.1→0.2→{0.3,0.4}→0.5→0.6
         P1: 1.1→{1.2‖1.3‖1.4}   1.5 ∥
         P2: 2.1→2.2→2.3→2.4     {2.5,2.6}∥  2.7 收口
         P3: {3.1‖3.2}           3.3→3.4
         P4: 互不影响、逐个立项
跨轨: A.3 依赖 B-P0.2；B 各阶段核验联动 scripts/check-gates.ps1
```
