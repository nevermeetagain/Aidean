# 验收清单：管理端信息架构重构

> change-id: `restructure-admin-nav-rbac-cms` | 语言: 中文 | 版本: v1 | 创建: 2026-10-12 | 更新: 2026-10-12
> 核验方式继承 [docs/governance/开发流程.md](../../governance/开发流程.md)：[命令]/[断言]/[测试]/[人工]；每片全绿且报备后方可推送。

## 最终门禁（Phase Close 前全绿）

- [命令] `pnpm install && pnpm build` 连续退出码 0
- [命令] `pnpm type-check`、`pnpm lint` 退出码 0
- [命令] `pnpm test`（vitest）退出码 0；关键 e2e 场景通过
- [命令] `node scripts/check-docs-facts.mjs`（若涉数值事实）退出码 0
- [断言] 任一 Fail 在 `tasks.md` 追加 `Fix:` 任务，留证据，不得 Close/推送

## S0 基线与护栏

- [断言] `git status` 需求无关杂物（`.example/`、`参考文档/`）不在待提交集；实际交付集为业务代码+文档+配置+迁移
- [命令] 新提交 diff grep 无 `ghp_`/明文密码/`git config` remote 内嵌 token
- [断言] 本地 dev 端口=3000；镜像自检端口=13000 不占本地

## S1 菜单展开态

- [测试] Playwright：冷启动 `goto('/admin/orders')` → 当前叶 `toBeVisible()`
- [测试] 展开某组 `reload()` → 展开态从 `aidean-admin-open-groups` 恢复
- [断言] 无 hydration 警告/错误；无 `${collapsed ? "" : ""}` 死三元
- [命令] `pnpm build` + `pnpm lint` 全绿

## S2 可配置菜单

- [断言] migration 后 `prisma migrate status` 无 drift；`NavigationMenu.scope`/`requiredPermissions` 存在
- [测试] seed 脚本断言旧 26 href → 新树 `coverage 26/26` 零缺失
- [测试] vitest：树构建、排序、`isVisible` 过滤、环检测（二级归属指向自身/成环被拒）
- [人工] `/admin/menus` 新建一级 + 二级改名/排序 + 保存 → 重新登录后侧栏生效（截图/录屏）
- [断言] 缺库时回退默认树，侧栏不白屏

## S3 RBAC（A2 + B2）

- [断言] 模型 `Role/Permission/RolePermission/UserRoleAssignment` 存在 + migration
- [测试] 迁移后现存 ADMIN/SUPER_ADMIN 自动获系统角色，`/admin` 可进（e2e）
- [测试] vitest：`getUserPermissions` 多角色并集；SUPER_ADMIN 通配
- [测试] `requireAdminApi(code)`：有码校验、无码=任一 admin；gate regression 现有路由 200/401/403 矩阵不回归
- [测试] 反例 e2e：MODERATOR 无 `finance.order.read` 直连 `GET /admin/orders` → 403
- [断言] 护栏：禁改自身角色、禁移除最后一个 SUPER_ADMIN（vitest）
- [人工] `/admin/users` 提升角色为版主 → 目标用户重登可见其被授权菜单、不可见未授权

## S4 站点可见即可改

- [x] [测试] ✅ vitest `site-content-s4.spec.ts`：DB 不可用/缺行/非法时 `loadSiteBranding`/`loadHomeContent`/`loadDocsArticles` 回退 DEFAULT，不抛白屏（13 passed）
- [x] [自动化代人工] ✅ e2e `admin/cms-content.spec.ts`：改 `site.name`→前台 `<title>` 变；改 `home.hero`→首页 `<h1>` 变（2 passed，测毕还原）
- [x] [自动化代人工] ✅ `/docs` 改读 `docs.articles`（RSC + `DocsReader`）；`/admin/configs` 按「常用/不常用」分堆（品牌/首页/文档/合作/路线图/联系 = 常用；天梯图呈现参数默认折叠 = 不常用）

## S5 记录/日志中心

- [x] [断言] ✅ 账本/记录类只读：`logs/{usage,security,scripts}` 仅导出 GET，无 DELETE/自由 PATCH；看板五 Tab 均无新增/编辑/删除入口（`AuditLogsTable` 复用只读表）
- [x] [测试] ✅ vitest `admin-logs.spec.ts` **8 passed**（quotaMinor BigInt→string+元口径 / pageSize>100→400 / onlyErrors where / requireAdminApi 拒绝→403 / TOKEN 派生态 / ACTIVE 内存过滤 / CONSENT 直读 / scripts status 标签）
- [x] [自动化代人工] ✅ e2e `admin/logs.spec.ts`：侧栏 `adm_logs` 入口高亮 + 五 Tab 渲染 + 安全事件 TOKEN/CONSENT 双子视图切换 + GET `/admin/logs/usage` 信封 code 0 + 清 Cookie 401
- [x] [权限] ✅ 新增 `logs` 域经 `seed-rbac` 自动传播（58 权限原子）；`filterNavByPerms` 对 ADMIN/MODERATOR 均露出 logs.read → 侧栏入口对二者可见

## S6 财务全链与处置

- [x] [断言] ✅ 免迁移落地：「标异常/关单/冲正」均为既有枚举受控状态转移（充值 PENDING→FAILED/→EXPIRED、PAID→REFUNDED；套餐 PENDING|ACTIVE→CANCELLED）+ `writeAudit` 记录处置原因，无 schema 迁移
- [x] [断言] ✅ 账本 `LedgerEntry` 不可处置：`OrdersManager` 处置列仅 `canWrite && type!=='LEDGER'` 拼接，账本 Tab 无处置入口（e2e 断言无「处置」列）
- [x] [断言] ✅ 冲正走 REVERSAL 不物理删/改：`reverseRechargeOrder` 仅追加 DEBIT 反向分录 + 状态机 CAS（原分录保留、无 DELETE），全程经 `billingService`（路由不含 `ledgerEntry.create`）
- [x] [测试] ✅ vitest `reverse.spec.ts` **5 passed** + `order-disposition.spec.ts` **12 passed**（余额守卫 40001/非 PAID 40000/幂等 0n/CAS where 旧状态/元口径/守卫 403）
- [x] [自动化代人工] ✅ e2e `admin/orders.spec.ts` **4 passed**：可写露「处置」列 + 账本 Tab 无处置列 + GET `/admin/package-orders` 信封 code 0 + 清 Cookie 401（非侵入，不改真实账本）
- [x] [权限] ✅ 复用 `admin.orders.{read,write}` 域，无新权限域/导航入口；`orders/page` 服务端推导 `canWrite` 下传

## S7 CRUD 孤岛 + 接入断链

- [x] [断言] ✅ 不新增权限域：prices→`admin.models.{read,write}`、oidc/ranking-weights→`admin.configs.{read,write}`（复用既有域）；故 `seed-rbac` 无需重跑（规避 `db:seed` 破坏陷阱），仅 `seed-navigation-menu.ts` 幂等追加 `adm_prices`/`adm_oidc`（coverage 31/31）
- [x] [测试] ✅ vitest `admin-prices.spec.ts` **8 passed**（Decimal→string / limit 越界 400 不查库 / 守卫 403 / POST 新建+audit / 模型不存在 400 / 已有当前价 400 / PATCH 编辑+audit / 记录不存在 400）
- [x] [测试] ✅ vitest `admin-oidc.spec.ts` **5 passed**（GET 无 clientSecretHash / 守卫 403 / PATCH 元数据+audit / 记录不存在 400 / 非法回调 URI 400）
- [x] [测试] ✅ vitest `announcements/read.spec.ts` **6 passed**（isStillActive 三分支 / date 回退 / where 过滤 isPublished·isActive·deletedAt·OR / DB 失败回落空）
- [x] [断言] ✅ OIDC 安全边界：GET 投影绝不含 `clientSecretHash`，无 secret 发放/回显入口（e2e 断言 `clientSecretHash in c === false`）
- [x] [断言] ✅ 公告前台严格过滤「已发布+启用+未过期」，DB 挂回落空态不白屏；首页横幅无公告不渲染（非侵入）
- [x] [自动化代人工] ✅ e2e `admin/prices.spec.ts` **3 passed** + `admin/oidc.spec.ts` **3 passed**（冷启动表头+可写露「操作」列 / GET 信封 code 0 / 清 Cookie 401；只读呈现，不改真实数据）
- [x] [命令] ✅ `check-docs-facts` **14/14**（route 139→143 · page 52→55 · spec 138→143 · @aidean/ui refs 55→58 · lib-features 17→18）

## S8 报表/响应式/批量并行/死表/文档

- [x] [断言] ✅ 报表只读聚合走预表层：`reports/overview` 仅 `usageDailyStat.groupBy`（日/模型/用户）+ `rechargeOrder` PAID JS 归并，**禁扫 `usage_logs` 明细**（与 §7.5 用户侧 stats 同口径）；`buildReportView`/图表 option 均为纯函数可单测
- [x] [断言] ✅ `reports/overview` 跨域概览走 `requireAdminApi()` 无参入场总闸（同 `/admin` 首页口径），**不落具体业务域/不新增域**，`seed-rbac` 无需重跑
- [x] [断言] ✅ 移动端仅 CSS 断点隔离零回归：桌面侧栏 `hidden md:block`，抽屉 `md:hidden`（`AdminMobileNav` 内嵌 `AdminSidebar forceExpanded`），**未重构 RSC 布局**
- [x] [断言] ✅ 批量并发不改业务结果：providers/batch 逐条审计 `for-await`→`Promise.all`；capabilities/protocols/discovery `pageSize` `Math.min(100)` 封顶（反例：超大 take 扫全表 → 禁止）
- [x] [断言] ✅ 死表保留不删：`favorites`/`feedback`(+`feedback_comments`)/`user_notifications`/`feature_flags`/`ladder_charts`/`ladder_rankings` 运行时零消费，保留 schema（删表属破坏性迁移，另立 change-id）；`navigation_menus` S2 已激活
- [x] [测试] ✅ vitest `lib/admin/__tests__/reports.spec.ts` **5 passed**（零填充/充值归并 750.00/越界防御/趋势序列/排行反转）
- [x] [自动化代人工] ✅ e2e `admin/reports.spec.ts`（4）+ `admin/mobile-nav.spec.ts`（2，viewport 390×844）**6 passed**；`pnpm build` exit 0（经 `pnpm install --force --ignore-scripts` + `prisma generate` 修复残缺 node_modules）；全量 admin e2e **52 passed/0 failed/20 skipped**（零回归）
- [x] [命令] ✅ `check-docs-facts` **14/14**（route 143→144 · @aidean/ui refs 58→59 · spec 143→146）；`check-docs-rule` FAIL→**PASS**（§二 68 model/37 enum · §3.5 35 域/31 页，偿 S3 RBAC 四表 + S2-S7 未回写的累积口径债）
- [x] [铁律2] ✅ 双向锚闭合：《API接口文档》§5.8.6 `restructure-admin-api` ↔《API架构设计方案》§7.9 `restructure-admin-architecture`
- [x] [铁律3] ✅ 文档版本锚：API接口 v1.46 / API架构 v1.12 / 数据库 v2.10 / 目录结构 v3.12 / 功能设计 v0.8.5

## 每片交付证据要求

- 每片在对话内回报：改了什么、门禁命令输出摘要（全绿）、回归/反例证据；推送前单独报备并列出该 commit 的文件集。
