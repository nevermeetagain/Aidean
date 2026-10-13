# Tasks · 子平台介绍页（原子化任务书）

> change-id: `add-subplatform-showcase-pages` | 版本: v1 | 四级层级说明见 `_template/tasks.md`《层级图例》

---

## 轨道/Phase 1 · 数据与契约层

> **本级职责（L1）：让 `intro` 成为可校验、可迁移、可测试的合法数据。** 前置：无。交付物：migration、shared schema、API 透传。

### Task 1.1 Product.intro 数据层 【目标: Product 可存结构化介绍块 | 依赖: 无 | 产出: schema+migration+shared schema】

- [x] #### SubTask 1.1.1 schema 扩展与迁移
  - 【目标】`Product` 新增 `intro Json?`（v1 结构 `{version:1, links:[{label,url,kind}], facts:[{group,items:[{label,value}]}]}`）
  - 【范围】修改 `apps/web/prisma/schema.prisma`；新建 `apps/web/prisma/migrations/*_add_product_intro/`（`prisma migrate dev`）
  - 【验收】`prisma migrate status` 干净；dev 库 products 表出现 intro 列
  - 【验证命令】`pnpm --filter web exec prisma migrate dev --name add_product_intro`
  - 【产出】migration 目录
  - 【依赖】无
- [x] #### SubTask 1.1.2 shared ProductIntroSchema 与并入 Admin 产品 schema
  - 【目标】写侧唯一校验真源：url 协议白名单（http/https）、label ≤20、links ≤6、facts 组 ≤6、组内条目 ≤12、kind ∈ product/repo/docs/other
  - 【范围】修改 `packages/shared/src/**`（产品 schema 所在文件）；新增 vitest 用例
  - 【验收】`javascript:` 协议被拒；超 6 条链接被拒；合法 v1 对象通过
  - 【验证命令】`pnpm --filter @aidean/shared test`（或根 `pnpm test`）
  - 【产出】`ProductIntroSchema` + 用例
  - 【依赖】1.1.1 结构定义（可与 1.1.1 并行编写）

### Task 1.2 API 写侧透传 【目标: admin CRUD 全链路带 intro | 依赖: 1.1 | 产出: API 行为+测试】

- [x] #### SubTask 1.2.1 GET/POST/PATCH 透传 intro
  - 【目标】GET 返回 intro 原文；POST/PATCH 经 `AdminProductCreate/UpdateSchema`（已含 intro 可选字段）校验后落库；AuditLog 逻辑不变
  - 【范围】修改 `apps/web/app/api/v1/admin/products/route.ts`、`apps/web/app/api/v1/admin/products/[id]/route.ts`；扩展 `apps/web/lib/features/auth/__tests__/admin-products.spec.ts`
  - 【验收】带合法 intro 的 PATCH 返回 200 且 GET 可见；`javascript:` url 的 PATCH 返回 400
  - 【验证命令】`pnpm --filter web exec vitest run admin-products`
  - 【产出】API 用例全绿
  - 【依赖】1.1.1、1.1.2

---

## 轨道/Phase 2 · 呈现层（统一模板 + 后台编辑）

> **本级职责（L1）：一套模板渲染所有产品；后台可编辑链接与信息条目。** 前置：Phase 1 全勾。交付物：详情页、后台表单扩展。

### Task 2.1 统一模板介绍页 【目标: /products/[slug] 统一渲染 | 依赖: 1.1 | 产出: page.tsx】

- [x] #### SubTask 2.1.1 路由与数据获取
  - 【目标】Server Component + `revalidate=300` + `generateStaticParams`（ACTIVE 列表）+ try/catch 降级 + `notFound()` + `generateMetadata`
  - 【范围】新建 `apps/web/app/(site)/products/[slug]/page.tsx`
  - 【验收】ACTIVE 产品返回 200；DISABLED/不存在 slug 返回 404；DB 异常降级不白屏
  - 【验证命令】dev 环境 `curl -s -o /dev/null -w "%{http_code}" localhost:3000/products/<slug>`
  - 【产出】页面路由
  - 【依赖】1.1.1
- [x] #### SubTask 2.1.2 模板区块与样式契约
  - 【目标】固定区块序：PagePlaceholder 页头（badge）→ 简介+CTA → 核心能力卡（benefits）→ 平台信息表（facts）→ 相关链接 → 返回矩阵；仅用 `@aidean/ui`/`lucide-react`/令牌类；外链 `target="_blank" rel="noopener noreferrer"`；`intro=null` 降级
  - 【范围】同 2.1.1 文件（含模板子组件同文件或 `components/site/ProductIntroTemplate.tsx`）
  - 【验收】三主题（data-theme indigo/teal/orange）切换无硬编码色残留；375px 窄屏不破版；reduced-motion 静态呈现
  - 【验证命令】浏览器人工核验 + `pnpm --filter web exec tsc --noEmit`
  - 【产出】统一模板
  - 【依赖】2.1.1

### Task 2.2 后台编辑扩展 【目标: 链接与 facts 可后台配置 | 依赖: 1.2 | 产出: ProductsManager 表单】

- [x] #### SubTask 2.2.1 链接动态行 + 信息条目文本域
  - 【目标】沿用 Dialog/多行解析惯例：链接行（名称+URL+kind 下拉，≤6 条）；信息条目每行 `分组::标签::值`（解析失败行给出行内提示并阻断提交）
  - 【范围】修改 `apps/web/components/admin/ProductsManager.tsx`
  - 【验收】编辑 aideanbot 加一条链接保存后，GET /products/wechatrag 即时可见（revalidatePath 链路）
  - 【验证命令】`pnpm --filter web exec tsc --noEmit` + 手动核验
  - 【产出】表单扩展
  - 【依赖】1.2.1

---

## 轨道/Phase 3 · 内容与入口

> **本级职责（L1）：数据填充与导航打通。** 前置：Phase 1 全勾。交付物：seed 幂等、导航契约绿。

### Task 3.1 seed 内容填充 【目标: 五产品矩阵含三子平台公开文案 | 依赖: 1.1 | 产出: seed 更新】

- [x] #### SubTask 3.1.1 产品条目与公开文案
  - 【目标】`wechatrag` 改名 AideanBot（tagline 注明生态亦称 WeChatRag）；新增 `aideanfleet`/`aideanthesis`；intro.seed 仅配 GitHub 仓库链接；文案重写且过安全过滤（无端口/IP/env 键/风险台账）
  - 【范围】修改 `apps/web/prisma/seed.ts`（productsSeed 段）
  - 【验收】seed 重跑幂等；/products 显示 5 产品；grep seed 无 `3333|5000|543x|host.docker|AIDEAN_|OIDC_` 类泄漏
  - 【验证命令】`pnpm --filter web exec prisma db seed` + grep 断言
  - 【产出】seed 更新
  - 【依赖】1.1.1、1.1.2

### Task 3.2 入口打通 【目标: 首页与导航指向详情页 | 依赖: 3.1 | 产出: 首页读库+导航更新】

- [x] #### SubTask 3.2.1 ProductSection 读库
  - 【目标】删硬编码数组，改 `prisma.product.findMany`（同 /products 查询）；卡片链 `/products/[slug]`；badge→三档 tone 映射；空表回退底稿
  - 【范围】修改 `apps/web/components/home/ProductSection.tsx`
  - 【验收】首页卡数=ACTIVE 产品数；点击进详情页
  - 【验证命令】`pnpm --filter web exec tsc --noEmit` + 浏览器核验
  - 【产出】首页收口双源
  - 【依赖】2.1.2
- [x] #### SubTask 3.2.2 导航下拉与契约测试
  - 【目标】产品下拉新增 AideanBot/AideanFleet/AideanThesis（→`/products/<slug>`），AideanWiki 改指 `/products/aideanwiki`；同步顺序契约测试
  - 【范围】修改 `apps/web/lib/navigation.ts` 及引用 NAV_ITEMS 顺序/children 的测试文件
  - 【验收】`/api/v1/system/navigation` children 与常量一致；测试绿
  - 【验证命令】`pnpm --filter web exec vitest run`
  - 【产出】导航更新
  - 【依赖】2.1.1

---

## 轨道/Phase 4 · 核验与归档

> **本级职责（L1）：全量验证 + 文档同步 + 推送。** 前置：Phase 1–3 全勾。交付物：checklist 全勾、文档同步、commit+push。

### Task 4.1 VERIFY 与 CLOSE 【目标: 证据链完备并归档推送 | 依赖: 全部 | 产出: checklist+文档+commit】

- [x] #### SubTask 4.1.1 全量测试
  - 【目标】typecheck/lint/test/e2e 全绿
  - 【范围】仓库根
  - 【验收】无失败项；失败即回修
  - 【验证命令】`pnpm typecheck && pnpm lint && pnpm test`（e2e 按仓库既有脚本）
  - 【产出】测试回执
  - 【依赖】Phase 1–3
- [x] #### SubTask 4.1.2 文档同步与推送
  - 【目标】铁律 3/6 文档同步 + 六步归档 + 推送 huaweicloud
  - 【范围】`docs/product/requirements/需求文档.md` §3.4、`docs/architecture/数据库文档.md` products 行、`docs/governance/目录结构文档.md`、`docs/文档索引.md`、`docs/governance/术语表.md` 子平台行、`docs/plans/待执行任务大纲.md`
  - 【验收】各文档版本标记更新；CI 文档检查通过；push 成功且 remote URL 无凭据
  - 【验证命令】`node scripts/check-docs-rule.mjs` + `git push origin huaweicloud`
  - 【产出】commit + push
  - 【依赖】4.1.1
