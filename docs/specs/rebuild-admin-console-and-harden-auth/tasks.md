# Tasks · 重建管理后台与认证加固（原子化任务书）

> change-id: `rebuild-admin-console-and-harden-auth` | 版本: v1 | 四级层级说明见文末《层级图例》

---

## 层级图例（L1→L4）

| 级 | Markdown 载体 | 本级职责 |
|---|---|---|
| **L1 阶段** | `## Phase N · 名称` | 声明该组目标、前置条件、交付物 |
| **L2 任务** | `### Task N.M 名称` | 一个可独立验收的功能面；标注【依赖】【产出】 |
| **L3 子任务** | `#### SubTask N.M.K 名称` | 最小可执行单元；字段完备即合法 |
| **L4 字段** | 子任务下有序列表 `- 【字段】: 内容` | 目标/范围/验收/验证命令/产出/依赖 |

**复选框规则**：L3 完成即勾选自身复选框；**L2 勾选 = 其全部 L3 完成并经 checklist 对应检查点通过**。
**合法性规则**：任一 L3 缺失任一必填字段（【目标】【范围】【验收】）即为非法任务，实施者停止执行并要求补齐。

---

## Phase 0 · P0 认证缺陷修复（先行独立交付）

> **本级职责（L1）**：修复 /user/* 全站 307 的 RS256/HS256 算法不匹配缺陷。前置：无。交付物：middleware RS256/JWKS 版 + 单测 + 浏览器回归取证 + 审计文档缺陷状态更新。

### Task 0.1 middleware 迁移 RS256/JWKS 【目标: 消灭 P0 算法不匹配 | 依赖: 无 | 产出: middleware.ts 新版 + 单测】

- [ ] #### SubTask 0.1.1 createRemoteJWKSet 验签实现
  - 【目标】middleware 改用 `createRemoteJWKSet(new URL("/.well-known/jwks.json", req.nextUrl.origin))`（模块级单例，jose 内建 kid 缓存/cooldown），algorithms=["RS256"]、issuer=AUTH_ISSUER、audience=AUTH_AUDIENCE_SELF，claims 校验 sub/tier/ver/jti 与 verifyAccess 对齐；JWKS 拉取失败/无 Cookie → 视为未登录（fail-closed）。
  - 【范围】修改 `apps/web/middleware.ts`；不动 keys.ts（node:crypto/Redis 不可入 Edge）。
  - 【验收】单测四态全绿：有效 RS256 token 放行、过期拒绝、伪造 kid 拒绝、refresh 混入 access 位拒绝（缺 tier/ver）。
  - 【验证命令】`pnpm vitest run apps/web/middleware.spec.ts`（vi.stubGlobal mock fetch JWKS）
  - 【产出】middleware.spec.ts（新建）+ middleware.ts（修改）
  - 【依赖】无
- [x] #### SubTask 0.1.2 matcher 扩 /admin 并分流登录页
  - 【目标】config.matcher 改 `['/user/:path*','/admin/:path*']`；/admin/* 未登录 307 至 `/admin/login?redirect=…`（/user/* 沿用 /login）；`/admin/login` 自身 SHALL NOT 被拦截（matcher 排除或显式放行）。
  - 【范围】修改 `apps/web/middleware.ts`。
  - 【验收】单测断言两种前缀的重定向目标与 /admin/login 放行。
  - 【验证命令】`pnpm vitest run apps/web/middleware.spec.ts`
  - 【产出】middleware.ts（修改）
  - 【依赖】0.1.1

### Task 0.2 P0 回归取证与文档 【目标: 浏览器实证 /user/* 恢复 200 | 依赖: Task 0.1 | 产出: 取证记录 + 审计 v1.4】

- [x] #### SubTask 0.2.1 构建部署 + 浏览器回归
  - 【目标】next build → standalone 静态资源复制（static/public）→ 重启 :3000 分离进程 → chrome-devtools 登录后访问 /user/balance、/user/console 均 200，/admin 匿名 307 → /admin/login。
  - 【范围】无代码变更，纯验证（注意 project_memory：构建前查 standalone server 进程；复制 static/public）。
  - 【验收】四条 URL 断言全过（200/200/200/307→login）。
  - 【验证命令】chrome-devtools MCP 会话取证（截图与网络状态码）
  - 【产出】取证截图（会话内）+ checklist 勾选
  - 【依赖】0.1.1、0.1.2
- [x] #### SubTask 0.2.2 审计文档更新
  - 【目标】[项目状态审计.md](../../../docs/archive/项目状态审计.md) §五 P0 缺陷行改为 ✅ 已修复（记录修复方式与取证），文首版本标记 v1.4。
  - 【范围】修改 `docs/项目状态审计.md`。
  - 【验收】缺陷行状态为已修复且含取证描述。
  - 【验证命令】`git diff docs/项目状态审计.md`（人工核验）
  - 【产出】审计 v1.4
  - 【依赖】0.2.1

---

## Phase 1 · 管理端独立外壳与登录

> **本级职责（L1）**：route group 拆分 + 独立登录页 + 两级侧边栏外壳 + 概览页。前置：Phase 0 全勾。交付物：(site)/(admin) 两组布局、/admin/login、/admin 概览、/admin/configs。

### Task 1.1 Route Group 拆分 【目标: 前后台信息架构隔离、URL 不变 | 依赖: 无（可与 0.2 并行）| 产出: 两组布局】

- [x] #### SubTask 1.1.1 (site) 组建立与前台迁移
  - 【目标】根 layout 剥离 SiteHeader/SiteFooter（保留 ThemeProvider/html/body）；新建 `app/(site)/layout.tsx` 挂载二者；`(web)` 下 about/docs/ladder/login/models/partners/pricing/products/register/roadmap/user 十目录 git mv 至 `(site)`。
  - 【范围】修改 `apps/web/app/layout.tsx`；新建 `apps/web/app/(site)/layout.tsx`；移动类变更（组名不参与 URL，相对导入深度不变）。
  - 【验收】构建 0 错；前台页 URL 与头尾渲染不变（回归快照/浏览器抽查 /models、/login）。
  - 【验证命令】`pnpm build`（apps/web）+ 浏览器抽查
  - 【产出】(site)/layout.tsx + 迁移后目录
  - 【依赖】无
- [x] #### SubTask 1.1.2 (admin) 组建立与 admin 迁移
  - 【目标】`(web)/admin` git mv 至 `(admin)/admin`；临时保留现有守卫与 AdminConfigPanel 渲染（Phase 1.4 再拆页）。
  - 【范围】移动类变更。
  - 【验收】/admin 可访问且无前台 Header/Footer。
  - 【验证命令】浏览器抽查 /admin
  - 【产出】(admin)/admin/page.tsx
  - 【依赖】1.1.1

### Task 1.2 /admin/login 独立登录页 【目标: 需求 1/2 收口 | 依赖: Task 1.1 | 产出: 登录页组件】

- [x] #### SubTask 1.2.1 AdminLoginForm 与页面
  - 【目标】新建 `app/(admin)/admin/login/page.tsx` + `components/admin/AdminLoginForm.tsx`（客户端）：垂直水平居中卡片、独立深色管理风格（不含前台导航/微信扫码块）、复用 `LoginSchema` 客户端校验与 `POST /api/v1/auth/login`、成功跳 `redirect` 参数（仅站内相对路径，缺省 /admin）、失败行内红字。
  - 【范围】新建 2 文件。
  - 【验收】未登录访问 /admin/login 呈现居中卡；错误密码行内报错；SUPER_ADMIN 登录跳 /admin。
  - 【验证命令】浏览器取证（chrome-devtools）
  - 【产出】page.tsx + AdminLoginForm.tsx
  - 【依赖】1.1.2

### Task 1.3 (admin) 管理外壳与侧边栏 【目标: 需求 3/4/10/11 收口 | 依赖: Task 1.1/1.2 | 产出: layout.tsx + Sidebar 组件】

- [x] #### SubTask 1.3.1 两级手风琴侧边栏
  - 【目标】新建 `components/admin/AdminSidebar.tsx`（客户端）：两组菜单（运营：用户/模型/提供商/产品；财务与配置：套餐/兑换码/余额钱包/站点配置），手风琴展开收起、整体可收起为纯图标（localStorage 持久化 + aria-label/useId 可访问名）；当前路由高亮。
  - 【范围】新建 1 组件 + 常量（导航数据内聚组件文件）。
  - 【验收】展开/收起/持久化三态可用；键盘可达（Tab/Enter）。
  - 【验证命令】浏览器取证 + [人工] 截图
  - 【产出】AdminSidebar.tsx
  - 【依赖】无
- [x] #### SubTask 1.3.2 (admin)/layout.tsx 守卫外壳
  - 【目标】新建 `app/(admin)/layout.tsx`（/admin/login 例外由其页面级控制或布局分流）：requireUser + 回库复核 role（ADMIN/SUPER_ADMIN 之外 redirect /admin/login?denied=1）；布局 = 左侧 AdminSidebar + 顶栏（面包屑、管理员邮箱、退出登录、返回主站链接）；子页 `app/(admin)/admin/*/layout.tsx` 或页面直接套用。
  - 【范围】新建 layout.tsx。
  - 【验收】匿名 307（middleware 已拦）+ 普通用户登录后访问 /admin 被重定向至 /admin/login；管理页无前台头尾。
  - 【验证命令】浏览器取证（三态：匿名/普通/管理员）
  - 【产出】(admin)/layout.tsx
  - 【依赖】1.3.1

### Task 1.4 概览页与配置页分离 【目标: 需求 9 统计面 + 原 /admin 职责拆分 | 依赖: Task 1.3 | 产出: 两页】

- [x] #### SubTask 1.4.1 概览统计卡
  - 【目标】`(admin)/admin/page.tsx` 重写为概览：四统计卡（用户总数/模型总数/ENABLED+ISSUED 兑换码数/钱包总余额分转元）聚合查询（prisma aggregate/count，force-dynamic）+ 各管理页快捷入口。
  - 【范围】修改 `apps/web/app/(admin)/admin/page.tsx`。
  - 【验收】四卡数值与 DB 聚合一致（与 psql 抽查比对）。
  - 【验证命令】浏览器取证 + SQL 比对
  - 【产出】概览页
  - 【依赖】1.3.2
- [x] #### SubTask 1.4.2 AdminConfigPanel 迁至 /admin/configs
  - 【目标】新建 `(admin)/admin/configs/page.tsx` 承载 AdminConfigPanel（原 /admin 面板功能等价迁移，侧边栏加「站点配置」项）。
  - 【范围】新建 configs/page.tsx；AdminConfigPanel 组件不动。
  - 【验收】颗粒度 PUT→SSR 即时生效原 E2E 口径复验通过（/models、/ladder）。
  - 【验证命令】`pnpm vitest run`（admin 相关）+ 浏览器取证
  - 【产出】configs 页
  - 【依赖】1.4.1

---

## Phase 2 · 用户/模型/提供商/产品管理

> **本级职责（L1）**：需求 5/6/7/8 四管理域。前置：Phase 1 全勾。交付物：4 页面 + 8 个 route（含 [id]）+ Product 建模迁移。

### Task 2.1 用户管理 【目标: 需求 8 | 依赖: Phase 1 | 产出: 页 + API + 审计】

- [x] #### SubTask 2.1.1 API GET /api/v1/admin/users + PATCH /[id]
  - 【目标】GET：分页（page/pageSize≤50）+ email 模糊搜索，返回 id/email/nickname/tier/status/role/createdAt/钱包余额；PATCH [id]：tier（AccountTier 枚举域）与 status（ACTIVE/SUSPENDED）白名单字段；封禁置 tokenVersion++；写 AuditLog(tableName=users)。全部走 requireAdminApi。
  - 【范围】新建 `apps/web/app/api/v1/admin/users/route.ts`、`users/[id]/route.ts`；schema 入 `packages/shared/src/schemas/admin.schema.ts`（新建）。
  - 【验收】vitest：未登录 401/普通用户 403/管理员放行/PATCH 越权字段剔除/封禁后 ver++。
  - 【验证命令】`pnpm vitest run apps/web/lib/features/auth/__tests__`（新增 admin-users.spec）
  - 【产出】2 route + admin.schema.ts + spec
  - 【依赖】无
- [ ] #### SubTask 2.1.2 /admin/users 页面
  - 【目标】表格（分页/搜索/徽章化 tier 与 status）+ 行操作（调 tier、封禁/解封、详情抽屉含余额只读）；操作后 router.refresh()。
  - 【范围】新建 `(admin)/admin/users/page.tsx` + `components/admin/UsersTable.tsx`（客户端）。
  - 【验收】浏览器：搜索、翻页、封禁→该用户 me 立即 401。
  - 【验证命令】浏览器取证 + API 用例
  - 【产出】users 页
  - 【依赖】2.1.1、1.3.2

### Task 2.2 模型管理 【目标: 需求 5 | 依赖: Phase 1 | 产出: 页 + API】

- [x] #### SubTask 2.2.1 API GET /api/v1/admin/models + PATCH /[id]
  - 【目标】GET：分页 + modelCode/nameDisplay 搜索（含 vendor 名称投影）；PATCH：白名单 nameDisplay/isActive/visibility/isFeatured/sortOrder；isActive 变更后 revalidatePath("/models")；写 AuditLog。
  - 【范围】新建 2 route；schema 入 admin.schema.ts。
  - 【验收】vitest 四态（401/403/放行/白名单剔除）+ revalidatePath 被 mock 断言。
  - 【验证命令】`pnpm vitest run`（新增 admin-models.spec；注意 vi.mock("next/cache")）
  - 【产出】2 route + spec
  - 【依赖】无
- [ ] #### SubTask 2.2.2 /admin/models 页面
  - 【目标】表格（分页/搜索/厂商列）+ 行内编辑（ isActive 开关、visibility 下拉）。
  - 【范围】新建 page.tsx + ModelsTable.tsx。
  - 【验收】关闭 isActive 后 /models SSR 即时少一条（浏览器）。
  - 【验证命令】浏览器取证
  - 【产出】models 页
  - 【依赖】2.2.1、1.3.2

### Task 2.3 提供商管理 【目标: 需求 6 | 依赖: Phase 1 | 产出: vendors CRUD 扩展 + 页】

- [x] #### SubTask 2.3.1 vendors API 升级 CRUD
  - 【目标】现有 GET/PUT priority 基础上扩 POST（新建：code/name/nameCn/priority/isActive）、PATCH [id]（编辑）、DELETE [id]（软删 deletedAt，有模型引用时禁止物理删除语义沿软删）；保留原 PUT 优先级口径兼容 AdminConfigPanel。
  - 【范围】修改 `apps/web/app/api/v1/admin/vendors/route.ts`；新建 `vendors/[id]/route.ts`。
  - 【验收】vitest：CRUD 全链 + code 重复 400 + 软删后 GET 列表不含。
  - 【验证命令】`pnpm vitest run`（新增 admin-vendors.spec）
  - 【产出】route 修改 + [id] route + spec
  - 【依赖】无
- [ ] #### SubTask 2.3.2 /admin/vendors 页面
  - 【目标】表格（logo/name/priority/isActive/modelCount）+ 新建/编辑表单（弹层）+ 软删确认；AdminConfigPanel 的厂商优先级卡移除（职责并入本页）。
  - 【范围】新建 page.tsx + VendorsManager.tsx；修改 AdminConfigPanel（移除厂商卡）。
  - 【验收】新建→列表出现；软删→消失；priority 修改→天梯列序变化（浏览器）。
  - 【验证命令】浏览器取证
  - 【产出】vendors 页
  - 【依赖】2.3.1、1.3.2

### Task 2.4 产品管理（Product 建模）【目标: 需求 7 | 依赖: Phase 1 | 产出: 迁移 + API + 页 + 前台读库】

- [ ] #### SubTask 2.4.1 Product 模型与迁移
  - 【目标】schema 新增 `Product`（id uuid(7)/slug unique/name/tagline/description @db.Text/badge/benefits Json?/status ACTIVE|DISABLED/sortOrder/created/updated/deletedAt，@@map("products")）+ `pnpm prisma migrate dev --name add_product`；seed 补 AideanWiki/WeChatRag/SkillsCloud 三条；数据库文档登记（版本标记更新）。
  - 【范围】修改 `apps/web/prisma/schema.prisma`、`prisma/seed.ts`；新建迁移文件；修改 `docs/architecture/数据库文档.md`。
  - 【验收】migrate 成功、seed 后 products 表 3 行。
  - 【验证命令】`pnpm prisma migrate dev --name add_product` + `pnpm prisma db seed`
  - 【产出】迁移文件 + 文档节
  - 【依赖】无
- [ ] #### SubTask 2.4.2 API 与页面 + 前台读库
  - 【目标】GET/POST `/api/v1/admin/products`、PATCH/DELETE `[id]`（软删）；`/admin/products` 管理页（表单含 benefits JSON 数组编辑）；前台 `(site)/products/page.tsx` 改读库（isActive 按 sortOrder），空表回退现有静态内容。
  - 【范围】新建 2 route + page + ProductsManager.tsx；修改前台 products 页。
  - 【验收】管理端改 badge/名称后 /products 即时呈现（revalidatePath）；vitest 守卫四态。
  - 【验证命令】`pnpm vitest run` + 浏览器取证
  - 【产出】products 全套
  - 【依赖】2.4.1、1.3.2

---

## Phase 3 · 套餐、兑换码与财务闭环

> **本级职责（L1）**：需求 9 全量（套餐/余额/兑换码管理 + 站内兑换 + 卡商 API）。前置：Phase 2 全勾。交付物：redemption 域实现、Package/Product 管理页、Partner API、调账 API、ISSUED 枚举迁移。

### Task 3.1 redemption 域实现 【目标: 核销引擎真实现（现占位桩）| 依赖: 无 | 产出: service/repository + 单测】

- [x] #### SubTask 3.1.1 repository + service + CAS 状态机
  - 【目标】repository：findById/查批次/分页/生成批量 insert/updateMany CAS；service：`redeem(code,userId)` 事务内 CAS（updateMany where id+status∈{ENABLED,ISSUED} → USED，count=0 即码无效/已用）→ 余额码 walletService 入账（ledger GRANT，idempotencyKey=`redemption:{id}`，sourceType=redemption）/ 套餐码校验 package ACTIVE 后创建 PackageOrder；过期（expiresAt）/DISABLED 判定；批次生成（面额/数量≤500/前缀/有效期，code 12 位随机字母数字，唯一冲突重试）；单/整批禁用。
  - 【范围】实现 `apps/web/lib/features/package/redemption/{repository,service}.ts`（替换占位）；扩展 `packages/shared/src/schemas/redemption.schema.ts`（生成/列表入参与 RedemptionsResult）。
  - 【验收】vitest：并发双花恰一单成功；幂等（重复 redeem 同码返回已使用）；过期码拒绝；余额码入账后钱包余额=面额且 ledger 恰一条 GRANT；套餐码核销后 PackageOrder ACTIVE。
  - 【验证命令】`pnpm vitest run apps/web/lib/features/package`
  - 【产出】redemption 域实现 + shared schema 扩展 + spec 文件
  - 【依赖】无

### Task 3.2 套餐管理 【目标: Package CRUD | 依赖: Phase 1 | 产出: API + 页】

- [ ] #### SubTask 3.2.1 packages API 与页面
  - 【目标】GET/POST `/api/v1/admin/packages`、PATCH/DELETE `[id]`（软删；有码引用仅 DISABLED）；列表含已兑换计数；`/admin/packages` 页（title/price 元分转换/durationHours/benefits/status）+ PackageOrder 只读列表（用户邮箱/套餐/状态/到期）。
  - 【范围】新建 2 route + page + PackagesManager.tsx。
  - 【验收】vitest 守卫四态 + 元分转换往返；浏览器 CRUD。
  - 【验证命令】`pnpm vitest run` + 浏览器取证
  - 【产出】packages 全套
  - 【依赖】1.3.2

### Task 3.3 兑换码管理 【目标: 批次生成/导出/禁用 | 依赖: 3.1 | 产出: API + 页】

- [ ] #### SubTask 3.3.1 redemption-codes API 与页面
  - 【目标】POST `/api/v1/admin/redemption-codes/batches`（生成）、GET 列表（批次/状态筛选/分页）、PATCH `[id]`（DISABLED）；响应仅在批次创建时一次性返回明文码数组（前端渲染 CSV 下载，服务端不存明文副本——码明文本存于 redemptions.code 列属既有设计，沿用 one-api 口径）；`/admin/redemptions` 页（生成表单 + 批次列表 + 导出按钮）。
  - 【范围】新建 3 route + page + RedemptionManager.tsx。
  - 【验收】生成 500 码导出 CSV 行数一致；禁用单码后 redeem 拒绝；vitest 守卫四态。
  - 【验证命令】`pnpm vitest run` + 浏览器取证
  - 【产出】redemption-codes 全套
  - 【依赖】3.1.1、1.3.2

### Task 3.4 站内兑换 API 【目标: 用户自助兑换 | 依赖: 3.1 | 产出: route + 限流】

- [x] #### SubTask 3.4.1 POST /api/v1/redemption/redeem
  - 【目标】requireUserApi + Redis 固定窗口限流（user 维度，如 5 次/分钟）+ zod 校验 RedeemInputSchema；成功返回 RedemptionResult（kind 判别）；错误码沿用 40000/40004 段并在 API 文档登记。
  - 【范围】新建 `apps/web/app/api/v1/redemption/redeem/route.ts`。
  - 【验收】vitest：成功入账/已用/过期/限流 429/未登录 401。
  - 【验证命令】`pnpm vitest run`（新增 redeem-route.spec）
  - 【产出】redeem route + spec
  - 【依赖】3.1.1
- [ ] #### SubTask 3.4.2 用户侧兑换入口
  - 【目标】`/user/balance` 页加兑换码输入卡（客户端组件，成功后余额区刷新），仅当前端入口。
  - 【范围】修改 `(site)/user/balance/page.tsx` + 新建 RedeemCard.tsx。
  - 【验收】浏览器：余额码兑换后余额即时 +面额。
  - 【验证命令】浏览器取证
  - 【产出】RedeemCard
  - 【依赖】3.4.1

### Task 3.5 卡商 Partner API 【目标: 上架卡商平台 | 依赖: 3.1/3.3 | 产出: PartnerKey 迁移 + 2 端点】

- [ ] #### SubTask 3.5.1 PartnerKey 建模与 ISSUED 枚举
  - 【目标】schema 新增 `PartnerKey`（id uuid(7)/name/keyHash unique SHA-256/prefix 8 位明文前缀展示/isActive/lastUsedAt/createdAt，@@map("partner_keys")）；RedemptionStatus 增 `ISSUED @map("5")`；migrate dev；seed 生成一个 dev PartnerKey（明文仅 seed 输出一次，库内只存 hash）；数据库文档登记两处变更。
  - 【范围】修改 schema.prisma、seed.ts；新建迁移；修改 `docs/architecture/数据库文档.md`。
  - 【验收】迁移成功；seed 后 partner_keys 1 行、code hash 与明文比对一致。
  - 【验证命令】`pnpm prisma migrate dev --name add_partner_key_and_issued` + `pnpm prisma db seed`
  - 【产出】迁移 + 文档节
  - 【依赖】无
- [x] #### SubTask 3.5.2 GET /api/v1/partner/codes 取码 + 查码
  - 【目标】`X-API-Key` 头 → SHA-256 比对 PartnerKey.keyHash（isActive）→ Redis 限流（key 维度，如 60 次/分）；入参 count(≤100)/targetType/balanceMinor（余额码）；事务内将 count 枚 ENABLED→ISSUED 并返回明文；查码 `GET /api/v1/partner/codes/status?code=`（卡商对账，仅返回状态不返回面额敏感全量）；更新 lastUsedAt；API 文档 §5.8 登记。
  - 【范围】新建 `apps/web/app/api/v1/partner/codes/route.ts`、`codes/status/route.ts`。
  - 【验收】vitest：有效 Key 取 5 枚 ISSUED/无效 401/限流 429/查码状态正确。
  - 【验证命令】`pnpm vitest run`（新增 partner-codes.spec）
  - 【产出】2 route + spec
  - 【依赖】3.5.1、3.1.1
- [ ] #### SubTask 3.5.3 PartnerKey 管理面
  - 【目标】POST `/api/v1/admin/partner-keys`（生成返回一次性明文）+ GET 列表（prefix/lastUsedAt/isActive）+ PATCH 停用；/admin/redemptions 页加「卡商密钥」卡。
  - 【范围】新建 1 route + UI 卡片。
  - 【验收】生成→用该 Key 取码成功；停用→401。
  - 【验证命令】`pnpm vitest run` + 浏览器取证
  - 【产出】partner-keys route
  - 【依赖】3.5.2

### Task 3.6 余额调账 【目标: 财务合规调账 | 依赖: Phase 2 用户页 | 产出: 调账 API + 入口】

- [x] #### SubTask 3.6.1 POST /api/v1/admin/wallets/adjust
  - 【目标】入参 walletId/amountMinor（可负）/note（必填 ≤200 字）；事务：乐观锁推进 + ledger ADJUST 双录（idempotencyKey=`admin-adjust:{walletId}:{idempotencyKey入参}`）；拒绝 FROZEN/CLOSED 钱包；写 AuditLog。
  - 【范围】新建 `apps/web/app/api/v1/admin/wallets/adjust/route.ts`；billing/wallet service 域补 adjust 方法（经 service 层，禁止 route 直连 prisma）。
  - 【验收】vitest：+10 元入账对账恒等式；负调账余额不为负（不足 40001）；FROZEN 拒绝；幂等重放不重复入账。
  - 【验证命令】`pnpm vitest run apps/web/lib/features/billing`（新增 adjust.spec）
  - 【产出】adjust route + service 方法 + spec
  - 【依赖】无
- [ ] #### SubTask 3.6.2 用户详情调账入口
  - 【目标】/admin/users 详情抽屉加「余额调账」表单（金额/备注/二次确认），成功后刷新余额显示。
  - 【范围】修改 UsersTable.tsx。
  - 【验收】浏览器调账后用户余额页数值变化一致。
  - 【验证命令】浏览器取证
  - 【产出】调账 UI
  - 【依赖】3.6.1、2.1.2

---

## Phase 4 · 前台等级即时可见

> **本级职责（L1）**：需求 12。前置：Phase 0（否则 /user/* 不可用影响验证链）。交付物：Header tier 徽章。

### Task 4.1 Header tier 徽章 【目标: 登录即见等级 | 依赖: Task 0.2 | 产出: HeaderSession/UserMenu 修改】

- [ ] #### SubTask 4.1.1 HeaderSession 扩展 tier 渲染
  - 【目标】HeaderSession state 增加 tier（me 已返回）；authenticated 态在 UserMenu 触发器左侧渲染徽章（NORMAL→「普通」中性灰 / PRO→「Pro」品牌蓝 / MAX→「Max」琥珀金，配色走 CSS 变量）；UserMenu 下拉首行显示「等级：X」；loading 占位与徽章同尺寸（w-10 h-5）防跳变。
  - 【范围】修改 `apps/web/components/site/HeaderSession.tsx`、`UserMenu.tsx`；新建 `components/site/TierBadge.tsx`。
  - 【验收】PRO 用户登录后任意前台页 Header 即见徽章；匿名无徽章；无布局跳变（CLS 观察）。
  - 【验证命令】浏览器取证（chrome-devtools 三账号态）
  - 【产出】TierBadge + 2 处修改
  - 【依赖】无

---

## Phase 5 · 文档同步与收官

> **本级职责（L1）**：铁律 1–6 全量同步与归档。前置：Phase 0–4 全勾。交付物：五文档版本更新 + spec 归档。

### Task 5.1 文档同步 【目标: 文档治理合规 | 依赖: 全部 | 产出: 五文档】

- [ ] #### SubTask 5.1.1 五文档登记
  - 【目标】[API接口文档.md](../../../docs/architecture/API接口文档.md)：§5.8 扩容全部新端点（users/models/packages/products/redemption-codes/partner/wallets-adjust/redemption-redeem）+ 新错误码；[数据库文档.md](../../../docs/architecture/数据库文档.md)：Product/PartnerKey/ISSUED；[界面交互文档.md](../../../docs/product/design/界面交互文档.md)：admin 外壳/登录页/侧边栏/tier 徽章；[目录结构文档.md](../../../docs/governance/目录结构文档.md)：(site)/(admin) 组；[文档索引.md](../../../docs/文档索引.md) 版本推进；各文文首版本标记。
  - 【范围】修改 5–6 个 .docs 文档。
  - 【验收】双向锚点互引齐全（铁律 2）、版本标记齐全（铁律 3）。
  - 【验证命令】`rg "rebuild-admin-console-and-harden-auth" .docs` 命中 + 人工核验
  - 【产出】文档更新
  - 【依赖】无（随各 Phase 增量，收官时统一复核）
- [ ] #### SubTask 5.2.1 全量回归与归档
  - 【目标】191 基线 + 本 spec 新增用例全绿；tsc clean；build exit 0；浏览器全链抽查（登录→tier→admin 各页→兑换→调账）；checklist 全勾后 spec 归档、审计文档收口本 change-id。
  - 【范围】验证 + `docs/项目状态审计.md` 收口。
  - 【验收】四命令全绿 + 浏览器抽查通过。
  - 【验证命令】`pnpm vitest run`、`pnpm -r typecheck`（tsc --noEmit）、`pnpm build`、浏览器会话
  - 【产出】checklist 全勾 + 审计收口
  - 【依赖】5.1.1
