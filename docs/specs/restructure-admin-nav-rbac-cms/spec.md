# 管理端信息架构重构（可配置菜单 + RBAC + 记录日志体系 + 站点可见即可改） Spec

> change-id: `restructure-admin-nav-rbac-cms` | 语言: 中文 | 版本: v1 | 创建: 2026-10-12 | 更新: 2026-10-12
> 本 spec 继承 [docs/governance/开发流程.md](../../governance/开发流程.md) 的六步循环、四级层级与六字段规范；契约唯一源遵循《开发流程》全局约束 2（`packages/shared` 的 Zod）。

---

## 为什么（Why）

管理端现状经真实代码复算（2026-10-12，分支 `huaweicloud`）确认四类结构性缺口：

1. **菜单硬编码 + 展开态缺陷**：`apps/web/components/admin/AdminSidebar.tsx:53-94` 将 3 组 25 叶写死为常量 `GROUPS`；`openGroups` 初值 `[0,1]`（`:104`）不持久化、收起时子项 `{open && (…)}`（`:234`）整体卸载，导致冷启动直达财务组页面（如 `/admin/orders`）当前项不在 DOM；`:144` 存在空三元死代码。
2. **无权限体系**：守卫 `(admin)/layout.tsx:51` 与 `lib/features/auth/session.ts:86` 仅判 `role∈{ADMIN,SUPER_ADMIN}`；角色为 `User.role` 枚举、无 Role 实体、无权限维度；`AdminUserPatchSchema`（`packages/shared/src/schemas/admin.schema.ts:101-109`）白名单仅 `tier/status`，**role 无法经界面/API 变更**。
3. **信息记录散落、日志无体系**：64 个 Prisma 模型中约 20 个属"记录类"（`UsageLog`/`AuditLog`/`SyncBatch`/`ScriptExecution`/`LedgerEntry`/`RechargeOrder`/`PackageOrder`/`OidcUserConsent`/`RefreshToken` 等），分散在各菜单，`admin` 侧仅 `audit-logs` 一个只读页，无统一日志板块；`components/admin` 内 echarts 引用为 0，报表能力缺位。
4. **站点可见内容不可配**：站名/SEO 硬编码于 `app/layout.tsx:15-16`；首页区块文案硬编码（`components/home/HeroBanner.tsx:8 STATS`、`ModelSection.tsx:16 MODEL_ENTRIES`、`PlatformIntro.tsx:12 VALUE_POINTS`）；帮助文档硬编码于 `(site)/docs/page.tsx:7-38 ARTICLES`。`SystemConfig`（`schema.prisma:1487`）已具备 `RICH_TEXT/JSON/configValueEn/isEditable` CMS 底座，但未接入上述可见元素。

同时存在 **8 张死表**（`schema` 有、运行时零消费）：`NavigationMenu`(`:1524`)、`FeatureFlag`(`:1458`)、`UserNotification`(`:1572`)、`Feedback`(`:1777`)、`FeedbackComment`(`:1808`)、`Favorite`(`:1245`)、`LadderChart`(`:1362`)、`LadderRanking`(`:1413`)。其中 `NavigationMenu` 字段完整，是"菜单入库可配置"的现成地基。

需求出处：本轮用户决策 **A2（接口级权限、后端逐接口强制）+ B2（独立 Role 实体 + 用户-角色多对多）**、内容"全部可改且常用/不常用分堆"、"分批执行每片全绿才推"。

---

## 变更清单（What Changes）

1. 修复 `AdminSidebar` 展开态四缺陷：`openGroups` 持久化 localStorage + 路由命中自动展开 + 清理死三元；默认展开态交由路由 effect 单一驱动。
2. **激活 `NavigationMenu`** 作为可配置菜单真源：新增 `scope`（SITE/ADMIN）、`requiredPermissions` 字段；AdminSidebar 改为读库渲染；新增 `/admin/menus` 管理页（一级自建、二级选归属+排序+改名）。**BREAKING（行为）**：菜单不再由代码常量驱动。
3. **建立 RBAC（B2）**：新增 `Role`、`Permission`、`RolePermission`、`UserRoleAssignment` 模型 + 迁移；将 `User.role` 枚举作为遗留缓存逐步退役为派生；`requireAdminApi(permission?)` 扩展为按权限码强制、SUPER_ADMIN 绕过。约 78 个 admin 路由逐个声明所需权限码（分片串行推进）。**BREAKING（鉴权语义）**。
4. **角色可变更通道**：新增 `AdminRolePatchSchema`（仅 SUPER_ADMIN 可改；禁止改动自身与最后一个 SUPER_ADMIN）；`/admin/users/[id]` 角色列可编辑 + 审计 + `revalidateTag`。
5. **记录/日志体系**：新增"日志中心"板块，聚合审计、网关调用、采集同步、脚本执行、安全事件（`RefreshToken`/`OidcUserConsent`）只读视图 + 必要只读聚合 API；账本类只给"查+处置(冲正/关单)"、**不提供删改**。
6. **站点可见即可改（全量）**：站名/SEO/logo/favicon/OG、首页各区块文案、合作伙伴、帮助文档、公告投放位全部纳入 `SystemConfig`；前台 `layout.tsx` 改 `generateMetadata` 动态读取；配置面板按"常用/不常用"分堆。
7. 报表首页：`/admin` 由 4 数字卡升级为时间×指标二维图（复用 `@aidean/ui` EChartWrapper + 新增 `admin/reports` 只读聚合 API）。
8. 安全与门禁：`capabilities`/`protocols` 等分页 `pageSize` 统一 `Math.min` 封顶；死表逐个裁决（激活/保留/迁出 schema，不批量删）。
9. 文档治理同步（铁律 2/3/6）：《API接口文档》《数据库文档》《目录结构文档》《功能设计文档》§3.5、《文档索引》版本锚定 + 双向链接。

---

## 影响面（Impact）

- **Affected specs**：继承 `establish-dev-workflow`（六步/四级/六字段）；与 `rebuild-admin-console-and-harden-auth`（AdminSidebar、admin 守卫）在 RBAC 上衔接；与 `close-admin-loop-and-harden-billing` 在订单处置上衔接。
- **Affected code**：
  - 修改：`apps/web/components/admin/AdminSidebar.tsx`、`apps/web/app/(admin)/layout.tsx`、`apps/web/lib/features/auth/session.ts`、`apps/web/app/layout.tsx`、`apps/web/app/(site)/docs/page.tsx`、`apps/web/components/home/*.tsx`、`packages/shared/src/schemas/admin.schema.ts`、约 78 个 `apps/web/app/api/v1/admin/**/route.ts`（逐个声明权限码）、`scripts/check-docs-facts.mjs`（页数/路由数断言）。
  - 新建：`apps/web/lib/admin-navigation.ts`、`apps/web/app/(admin)/admin/menus/page.tsx`、`apps/web/app/(admin)/admin/logs/**`、`apps/web/app/api/v1/admin/menus/**`、`apps/web/app/api/v1/admin/reports/**`、`apps/web/app/api/v1/admin/logs/**`、`apps/web/app/api/v1/admin/oidc-clients/**`、`apps/web/app/api/v1/admin/prices/**`、`packages/shared/src/schemas/rbac.schema.ts`、`packages/shared/src/permissions.ts`（权限码注册表）、对应 `components/admin/*Manager.tsx`、`prisma/migrations/<ts>_rbac_*`。
  - 数据：`NavigationMenu` 加列；`Role/Permission/RolePermission/UserRoleAssignment` 新表；`SystemConfig` 新增站点配置键（seed）。

---

## ADDED Requirements

### Requirement: 菜单展开状态可靠

管理端侧边栏 SHALL 持久化分组展开状态，并在路由变化时自动展开命中分组，使当前页在任意冷启动下均可见。

#### Scenario: 冷启动直达深层页面

- **WHEN** 管理员直接在地址栏访问 `/admin/orders`（属默认收起的组）
- **THEN** 该页对应分组 SHALL 自动展开，且当前 `<Link aria-current="page">` SHALL 存在于 DOM 并可见
- **AND** 验收经 Playwright `toBeVisible` 取证

#### Scenario: 展开状态刷新保持

- **WHEN** 管理员展开某分组后刷新页面
- **THEN** 分组展开状态 SHALL 从 `localStorage`（键 `aidean-admin-open-groups`）恢复

### Requirement: 菜单可由管理员配置

系统 SHALL 以 `NavigationMenu`（`scope=ADMIN`）为管理端菜单唯一真源，管理员可在 `/admin/menus` 自建一级菜单、为二级菜单选择归属/排序并改名；变更在重新登录后生效。

#### Scenario: 新增一级并归置二级

- **WHEN** 管理员新建一级菜单并把若干二级项拖入并排序、改名后保存
- **THEN** 重新登录后 AdminSidebar SHALL 按库中树渲染，顺序与命名一致
- **AND** 现有 26 个功能入口 SHALL 一个不丢（旧 href→新归属对照表零缺失）

### Requirement: 接口级 RBAC（A2 + B2）

系统 SHALL 提供 `Role/Permission/RolePermission/UserRoleAssignment` 多对多权限模型；每个管理端接口 SHALL 声明所需权限码并由后端强制校验；SUPER_ADMIN 隐含全权绕过；未授权访问 SHALL 被拒（403），即便直接访问页面 URL 或直连 API。

#### Scenario: 版主越权被后端拒绝

- **WHEN** 拥有 `content.news.*` 但无 `finance.order.read` 的 MODERATOR 直连 `GET /api/v1/admin/orders`
- **THEN** 后端 SHALL 返回 403（`ERROR_CODES.FORBIDDEN`）
- **AND** 该权限码校验 SHALL 位于 `requireAdminApi("finance.order.read")`，不由前端承担

#### Scenario: 角色变更即时生效且不锁死

- **WHEN** SUPER_ADMIN 将某用户角色由 USER 提升为含 `admin` 权限的角色
- **THEN** 系统 SHALL `revalidateTag("admin-auth")` 使目标用户可进 `/admin`
- **AND** 当试图移除最后一个 SUPER_ADMIN 或改动自身角色时 SHALL 拒绝

### Requirement: 站点可见内容全部可配

站点名称、SEO（title/description/keywords/OG）、logo/favicon、首页各区块文案、合作伙伴、帮助文档、公告投放位 SHALL 可经管理端配置，前台读取带默认回退。

#### Scenario: 改站名与 SEO 即时前台生效

- **WHEN** 管理员修改 `site.name` 与 `site.seo.title` 并保存
- **THEN** 前台 `generateMetadata` SHALL 输出新值，无需改代码发版
- **AND** DB 不可用时 SHALL 回退到构建默认，页面不崩

### Requirement: 记录分类与日志体系

系统 SHALL 将访问/审计/采集/脚本/安全类记录归入"日志中心"只读视图；账本类记录（流水/订单/调用日志）SHALL 只读、仅可处置（冲正/关单/标异常），永不提供删除或改写。

#### Scenario: 账本不可删改

- **WHEN** 审计任何 `LedgerEntry`/`RechargeOrder`/`UsageLog` 的管理端 API
- **THEN** SHALL 不存在 `DELETE`/自由 `PATCH` 端点
- **AND** 处置动作 SHALL 生成新冲正/状态变更记录并写 `AuditLog`

### Requirement: 分批交付每片全绿

每一垂直切片 SHALL 端到端可演示、可独立验收；每片完成须经子智能体测试/证明/验收，门禁全绿且向决策人报备后方可推送。

#### Scenario: 推送前门禁

- **WHEN** 一片实现完成
- **THEN** `pnpm install && pnpm build` SHALL 连续退出码 0，且相关 vitest/e2e 全绿
- **AND** 未过 SHALL 在 `tasks.md` 追加 `Fix:` 任务，不得推送

---

## MODIFIED Requirements

（无——本 change-id 为新增能力；`rebuild-admin-console-and-harden-auth` 的"两级手风琴硬编码 GROUPS"行为被本 spec 的"菜单可配置"取代，差异在 REMOVED 登记。）

## REMOVED Requirements

- R-1「AdminSidebar 以代码常量 `GROUPS` 为菜单真源」（原出处 `rebuild-admin-console-and-harden-auth` Phase 1）→ 移除理由：改为 `NavigationMenu` 库驱动可配置；组件渲染层保留，真源迁移。
- R-2「管理端鉴权 = 角色 ∈ {ADMIN, SUPER_ADMIN} 二元判定」（原出处 `rebuild-admin-console-and-harden-auth` SubTask 1.3.2）→ 移除理由：升级为接口级 RBAC。
