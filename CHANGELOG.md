# Changelog

All notable changes to the Aidean project are documented in this file.
Format based on [Keep a Changelog](https://keepachangelog.com/), dates in YYYY-MM-DD.

## [Unreleased] — 2026-10-12

### Added — 管理端信息架构收尾与运营盲区补齐（`finalize-admin-ia-and-ops-gaps`，2026-10-13 起；TASK-041 于 2026-10-20 补录）
- **导航三级化（S1/S3）**：`lib/admin-navigation-core.ts` 的 `buildAdminNav` 支持 板块→分组→叶 三级（`NavGroupVM.sections`），`filterNavByPerms` 逐级剪枝（无可见叶的分组/板块整体剔除）；`DEFAULT_ADMIN_NAV` 兜底树与 seed 同构（7 板块 / 33 叶，`admin-navigation-core.spec.ts`）；`AdminSidebar.tsx` 三级渲染 + 深链自动展开祖先分组。
- **7 板块默认树（S2）**：新增 `prisma/seed-admin-nav-default.ts` 与 `lib/admin-nav-default-tree.ts`（只增不减、URL 不变，34 入口零缺失断言）；菜单页「应用推荐分组（7 板块）」按钮（ConfirmDialog 二次确认）+ `POST /api/v1/admin/menus/apply-default`（`admin.menus.write`，落审计）。注：spec 2.1.2「检测到手工编排即跳过」未按原卡实现，现为「停用多余自定义入口」，tasks.md 保留未勾。
- **用户凭据只读 + 吊销（S4）**：`GET /api/v1/admin/users/[id]/credentials`（三类凭据脱敏聚合）、`POST …/credentials/revoke`（已停用 → 409 `CREDENTIAL_NOT_REVOCABLE`，审计 `admin.credential.revoke`）；用户详情抽屉「密钥与渠道」区（`UsersTable.tsx`）。
- **在途冻结款视图（S5）**：`GET /api/v1/admin/holds`（status/userId/from/to 过滤 + 分页，`admin.wallets.read`）；钱包页「在途冻结」页签（`HoldsPanel.tsx` / `WalletsTabs.tsx`）。
- **OrdersManager 弹窗归一（S6）**：`window.prompt/confirm` 三处改 ConfirmDialog / 带原因 Dialog（文件内 0 处原生弹窗）。
- **报表独立页（S2r，B1）**：`ReportsBoard` 增 `variant`（概览 compact / 专属页 full），新增 `/admin/reports`。
- **CMS 补齐（S7/S8，B3/B4）**：官方静态资讯迁入 `NewsItem`（`seed-official-news.ts` slug 幂等）；`partners.marquee` / 关于正文两配置键 + `HomeSectionsEditor`。
- **RSC 守卫与报表权限码（S9，B2）**：新增 `admin.reports.read`；`/admin/menus`、`/admin/logs`、`/admin/reports` 页级 `hasPermission` 重定向；MODERATOR 不见金额；数字口径锚统一（D-1/D-2）。
- **台账治理（TASK-041）**：《未完成事项目录》v2.37 拆为主表 + `docs/plans/未完成事项回执/` 00–04 分册；`finalize-admin-ia-and-ops-gaps/tasks.md` v1.1 按代码实查补勾 15 项（证据逐项附路径）。证据：`docs/任务规划V0.10.0/06_validation/evidence/EVD-041/`。

### Added — 管理端信息架构重构启动 · S1 侧边栏展开态修复（`restructure-admin-nav-rbac-cms`）
- **规格冻结**：新增三件套 `docs/specs/restructure-admin-nav-rbac-cms/{spec,tasks,checklist}.md`，锁定用户裁决 **A2**（接口级 RBAC，`requireAdminApi(permission?)` 后端逐接口强制）+ **B2**（独立 `Role/Permission/RolePermission/UserRoleAssignment` 多对多）+ 站点可见即可改全量 + 记录/日志体系；切为 S0-S8 垂直切片，含事实锚点表 F0001-F0010、并行/串行调度与独占热点、Top 风险登记。
- **S1 修复**：`AdminSidebar.tsx` 将 `openGroups` 持久化至 `localStorage('aidean-admin-open-groups')`，新增 `groupIndexForPath` 使路由命中的分组自动展开（冷启动/直访深层页当前项必在 DOM），并删除 `${collapsed ? "" : ""}` 死三元。根治「直达默认收起分组页（如 `/admin/orders`）当前项不可见」。
- **回归测试**：新增 `e2e/admin/sidebar.spec.ts`（冷启动自动展开 + `aria-current`；手动展开「财务与配置」后 reload 从存档恢复）。
- **环境**：清理本仓泄漏的僵尸 build/dev 进程（精准仅 `E:\Code\Aidean\`，未触其它工程/IDE）；`pnpm install --force` 修复残缺 node_modules（`next/dist/bin/next` 二进制 + `@prisma/client` 缺失）并重新 `prisma generate`。
- **门禁证据（2026-10-12 本机实测）**：`typecheck` 0 错误 · `lint` 0 error · `next build` exit 0 · vitest **97 文件 / 959 用例全绿** · admin e2e **3 passed**（含 `admin-setup` 登录）。**未推送**，待决策人批准。

### Added — 管理端可配置菜单（S2 · `restructure-admin-nav-rbac-cms`）
- **真源激活**：`NavigationMenu` 加 `scope`（`NavScope` SITE/ADMIN）+ `requiredPermissions String[]` + `@@index([scope])`（migration `20261012075217_navigation_menu_scope`，本地 localhost:5435 已 apply、无 drift）；种子 `prisma/seed-navigation-menu.ts` 幂等 upsert 将既有 26 入口 + 新增 `adm_menus`（菜单配置）落为 scope=ADMIN 行，断言 `coverage 27/27`。
- **DB 驱动侧栏**：`lib/admin-navigation-core.ts`（纯逻辑：类型/`buildAdminNav`/`DEFAULT_ADMIN_NAV`，供无副作用单测）+ `lib/admin-navigation.ts`（取数 + `unstable_cache` tag `admin-nav`，空表回退默认树）；`(admin)/layout.tsx` 注入 `getAdminNav()`，`AdminSidebar.tsx` **删除硬编码 `GROUPS` 常量**改受控 `nav` prop，图标由 `iconPath` 经 `NavIcon` 渲染（缺库/无图标兜底不崩，保留 S1 手风琴/持久化/自动展开）。
- **菜单管理闭环**：`packages/shared/src/schemas/menu.schema.ts`（`AdminMenuCreate/Update/Reorder` 契约，menuCode 稳定键不可变）；`/api/v1/admin/menus`（GET/POST）+ `[id]`（PATCH/DELETE），写 `AuditLog` + `revalidateTag('admin-nav')`，守护：menuCode 唯一、二级须归属现存 level1 分组、一级不可挂父、非自环、一级有子项拒删；`/admin/menus` 面板（`MenuManager.tsx`）支持自建一级、二级选归属/排序/改名/改路径/显隐/删除，保存后提示「重新登录后台生效」。
- **门禁证据（2026-10-12 本机实测）**：`pnpm typecheck` 0 错误 · `pnpm lint` 0 error · `next build` exit 0（含 `/admin/menus` 新路由）· vitest **98 文件 / 965 用例全绿**（+6 为 `admin-navigation-core.spec.ts`）· admin e2e `menus.spec.ts` **3 passed** + `sidebar.spec.ts` **2 passed**（DB 驱动入口高亮 / 面板读真源 / 建表单 / 展开持久化）。**未推送**（按用户「任务全部完成再统一推送」指令）。

### Added — 管理端接口级 RBAC（S3 · `restructure-admin-nav-rbac-cms` A2+B2）
- **B2 角色实体**：新增 `Role`/`Permission`/`RolePermission`/`UserRoleAssignment` 四模型（migration `20261012082315_rbac_role_permission_user_role`，localhost:5435 已 apply、`migrate status` 无 drift）；`User` 加 `roleAssignments` 关系，`User.role` 枚举保留为「入场总闸」与向后兼容（细粒度授权走 用户↔角色↔权限 多对多）。
- **A2 权限注册表（唯一契约源）**：`packages/shared/src/permissions.ts`（`ADMIN_DOMAINS` 28 业务域 × {read,write} = 56 权限原子；`SYSTEM_ROLES` 收敛——`SUPER_ADMIN` 通配 `*`、`ADMIN` 除 roles 外全部、`MODERATOR` 全域读 + 内容/评估/发现/基准写）+ `schemas/rbac.schema.ts`（`RoleCreate/RolePatch/UserRolesPatch` 白名单；`ROLE_CODE_REF_REGEX` 兼容系统大写码）。
- **权限解析与守卫**：`lib/features/auth/permissions.ts`（`loadAdminPermissions` 联合角色→权限并集去重 + `getAdminPermissions` `unstable_cache` tag `admin-auth`；`hasPermission` 通配或码命中）；`requireAdminApi(permission?)` 扩展——无参=`isStaff` 入场总闸（放开 MODERATOR，落实决策④），有参=逐接口后端强制（未命中抛 10008/403）；`(admin)/layout.tsx` 守卫改判 `isStaff`；侧栏 `filterNavByPerms` 按 `requiredPermissions` 剪枝（SUPER_ADMIN 通配全可见）。
- **逐路由标注权限码**：`scripts/rbac-codemod.mjs` 确定性 codemod（`DIR_TO_DOMAIN` 归域、GET→read / POST·PUT·PATCH·DELETE→write、按最近 `export const METHOD` 定位）一次性为 **80 文件 / 135 处** `requireAdminApi()` 注入权限码，dry-run 与 apply 均 **0 gap / 0 未知域**，规避手改回归。
- **角色/成员管理闭环**：`/api/v1/admin/roles`（GET/POST，权限码 ⊂ 注册表禁 `*`）、`/roles/[id]`（PATCH 覆盖式重建权限；DELETE 护「系统角色禁删 / 有用户绑定禁删」）、`/users/[id]/roles`（GET/PATCH，三重护栏：禁改自身分配 · 禁移除末位超管 · 角色码须存在），全部写 `AuditLog` + `revalidateTag('admin-auth')` 令授权即时生效；UI 新增 `/admin/roles`（`RolesManager.tsx`：系统/自定义角色 + 按域读写勾选 + CRUD）与 `UsersTable`「分配角色」编辑器（`canAssignRoles` 由服务端有效权限推导，仅 SUPER_ADMIN 露出）；种子 `seed-rbac.ts` 幂等回绑现有管理员 + `seed-navigation-menu.ts` 新增 `adm_roles` 入口（`requiredPermissions ["admin.roles.read"]`）。
- **门禁证据（2026-10-12 本机实测）**：`pnpm typecheck` 0 错误 · `pnpm lint` 0 error（仅 1 既存无关 `<img>` 警告）· `next build` exit 0（含 `/admin/roles`，经 `pnpm install --force` 离线修复残缺 node_modules 后全新构建）· vitest **99 文件 / 980 用例全绿**（`admin-guard.spec.ts` 重写 13 例覆盖逐接口放行/拒绝/通配、新增 `permissions.spec.ts` 8 例、`admin-navigation-core.spec.ts` filter 3 例）· `check-docs-facts` **14/14 PASS**（模型 64→68 · route 130→133 · page 50→51 · spec 129→131 · @aidean/ui refs 50→51）· admin e2e **30 passed**（新增 `roles.spec.ts` **4** 例：入口高亮 + 面板读系统角色 / 分配角色露出 / 禁改自身 400 / 清 Cookie 后 401）；`seed-rbac`、`seed-navigation-menu` 幂等复跑通过。**未推送**（按用户「任务全部完成再统一推送」指令）。

### Added — 站点可见即可改·CMS 全量（S4 · `restructure-admin-nav-rbac-cms` 决策⑤）
- **配置键扩容（四处同步）**：白名单 17→22 键——新增 `site.seo.keywords` + 首页三区块 `home.hero`/`home.valuePoints`/`home.modelEntries` + 帮助文档 `docs.articles`；契约 `packages/shared/src/schemas/home-content.schema.ts`（`HomeHeroSchema`/`HomeCardSchema` + `HOME_ICON_NAMES` 受限图标枚举）、`docs-content.schema.ts`（`DocsArticleSchema`）采用**单一真源**：手写成串 `*_JSON`（compact、与重构前硬编码逐字一致）→ `schema.parse(JSON.parse())` 派生 `*_DEFAULT`，`admin-config-seed-parity` 逐字符守卫。值规则 `homeHero/homeCards/docsArticles` 走 validate-then-store-raw（校验后原样入库、不重排键序）。
- **读服务（DB 挂不白屏）**：`lib/site-config.ts`（`getSiteBranding` tag `site-branding` + `buildDocumentTitle`）、`lib/features/home/config.ts`（tag `site-home`）、`lib/features/docs/config.ts`（tag `site-docs`），均 try/catch→DEFAULT 回退；`unstable_cache` + configs 路由按组 `revalidateTag`/`revalidatePath`（general/home/docs）令保存即时前台生效。
- **前台接入**：`app/layout.tsx` 改 `generateMetadata`（消费 `getSiteBranding` 输出 title/description/keywords/icons/OG）；`(site)/page.tsx` 转 async 读 `getHomeContent` 下传 `HeroBanner`/`PlatformIntro`/`ModelSection`（新增 `HomeIcon.tsx` 名→lucide 映射，未知名回退 Sparkles）；`(site)/docs/page.tsx` 转 RSC + 新 `components/docs/DocsReader.tsx`（client）读 `getDocsArticles`；`SiteHeader` 保持静态化不受影响。
- **配置面板分堆**：`/admin/configs` 新增 `SiteBrandingEditor.tsx`（6 个 site.* 键）、`HomeContentEditor.tsx`（首屏 Hero + 价值点/模型入口两组卡片，图标受限枚举下拉，统计条增删）、`DocsEditor.tsx`（文章/小节嵌套编辑、id 唯一校验）；页面按**常用**（品牌/首页/文档/合作/路线图/联系）/ **不常用**（天梯图呈现参数，默认折叠 `<details>`）分堆。
- **门禁证据（2026-10-12 本机实测）**：`pnpm typecheck` 0 错误 · `pnpm lint` 0 error（仅既存 `SafeImage <img>` 告警）· `pnpm build` exit 0（34 静态页）· vitest **100 文件 / 993 用例全绿**（新增 `lib/__tests__/site-content-s4.spec.ts` 13 例三态回退+新值规则；`admin-configs.spec.ts` 白名单断言同步 17→22）· `check-docs-facts` **14/14 PASS**（lib/features 15→17 · @aidean/ui refs 51→54 · spec 131→133，route 133/page 51 不变）· admin e2e **32 passed / 0 failed**（新增 `e2e/admin/cms-content.spec.ts` 2 例：改 `site.name`→前台 `<title>` 变、改 `home.hero`→首页 `<h1>` 变，测毕逐字节还原）· `db:seed` 连跑 2× exit 0（26 system configs）。**⚠ 陷阱**：`seed.ts` 会 `navigationMenu.deleteMany()`+`systemConfig.deleteMany()` 仅回填前台导航，跑 `db:seed` 后须补 `seed-navigation-menu.ts`+`seed-rbac.ts` 并重启 dev 才能恢复后台侧栏 28 入口（否则 roles/menus e2e 因导航缺数据而红，非代码回归）。**未推送**（按用户「任务全部完成再统一推送」指令）。

### Added — 记录/日志中心（S5 · `restructure-admin-nav-rbac-cms` 决策⑤）
- **权限域扩容**：`ADMIN_DOMAINS` 28→29（新增 `logs: "日志中心"`），经 `seed-rbac` 自动传播为 **58** 权限原子（SUPER_ADMIN 通配 / ADMIN 含 logs 读写 / MODERATOR 含 logs.read，系统角色集无需手改）；侧栏 `adm_logs` 入口 `requiredPermissions ["admin.logs.read"]`，`filterNavByPerms` 令 ADMIN/MODERATOR 均可见。
- **只读聚合 API**（均 `requireAdminApi("admin.logs.read")`、仅 GET、无写/删）：`/api/v1/admin/logs/usage`（UsageLog：quotaMinor **BigInt→string + fenToYuan** 元口径、model/时间范围/仅错误筛选、pageSize≤100）、`/logs/security`（RefreshToken 派生态 撤销>轮换>过期>有效 内存过滤 + OidcUserConsent 直读双子视图）、`/logs/scripts`（跨脚本 ScriptExecution，status 标签、列表不含 output）；审计/采集复用既有 `audit-logs`/`sync/batches` 只读端点。契约 `packages/shared/src/schemas/logs.schema.ts`（三查询、`z.coerce` page/pageSize 封顶）。
- **看板**：`components/admin/LogsBoard.tsx` 五 Tab（审计/网关调用/采集同步/脚本执行/安全事件）全只读，复用 `AdminDataTable` + 现成 `AuditLogsTable`，网关调用为默认 Tab；`/admin/logs` 页 `force-dynamic`。账本/记录类不提供新增/编辑/删除（对齐决策⑤「只读+处置」）。
- **门禁证据（2026-10-12 本机实测）**：`pnpm --filter web typecheck` 0 错误 · `admin-logs.spec.ts` **8 passed** · `check-docs-facts` **14/14**（route 133→136 · page 51→52 · spec 133→135 · @aidean/ui refs 54→55）· admin e2e **36 passed / 0 failed**（`logs.spec.ts` 4 例 + 既有回归）。**未推送**（按用户「任务全部完成再统一推送」指令）。

### Added — 财务全链与订单处置（S6 · `restructure-admin-nav-rbac-cms` 决策⑤延伸）
- **只读聚合 + 受控处置端点**（复用 `admin.orders.{read,write}` 域，**无新权限域/导航入口**）：`packages/shared/admin.schema.ts` 新增 `AdminPackageOrdersQuerySchema`（page/pageSize≤50/status/userId）+ `AdminOrderDispositionSchema`（action `CLOSE|FLAG|REVERSE`/reason/idempotencyKey）；GET `/api/v1/admin/package-orders`（`priceMinor` **BigInt→string + fenToYuan** 元口径、分页封顶）；PATCH `/package-orders/[id]`（CLOSE/FLAG→`CANCELLED` 状态机 CAS，REVERSE 不适用→400）、`/recharge-orders/[id]`（CLOSE→`EXPIRED`/FLAG→`FAILED` 仅 PENDING；REVERSE 委托 `billingService`），均写 `writeAudit` 记录处置原因。
- **免迁移落地口径**：「标异常/关单/冲正」均映射为 `RechargeOrder`/`PackageOrder` **既有枚举**的受控状态转移（充值 `PENDING→FAILED/→EXPIRED`、`PAID→REFUNDED`；套餐 `PENDING|ACTIVE→CANCELLED`），不新增字段、不动 schema；账本 `LedgerEntry` 严格只读，无删除/自由 PATCH（对齐 spec「账本仅查+处置」铁律）。
- **REVERSAL 冲正服务**：`billingService.reverseRechargeOrder(orderId,{idempotencyKey})` 于 `$transaction` + `withOptimisticRetry` 内先 CAS `rechargeOrder` `PAID→REFUNDED`，再对本金与赠送各追加一条 `entryType=REVERSAL` 的 **DEBIT** 反向分录（原分录保留、只 INSERT 不可改删）；幂等键 `recharge-reverse:{id}:{key}`（赠送 `:bonus`），`createEntryIfAbsent` 命中 P2002→幂等；DEBIT 经 `postEntryInTx` 余额守卫防扣成负（不足→40001）。资金变动全程仅经账务服务，路由不含 `ledgerEntry.create`。
- **UI**：`OrdersManager.tsx` 增「处置」列（仅 `canWrite && type!=='LEDGER'` 拼接，账本 Tab 无处置），REVERSE 走 `window.prompt` 强制原因、CLOSE/FLAG 走 `confirm`，成功 `reload()`；`orders/page.tsx` 改 async 服务端推导 `canWrite` 下传。
- **门禁证据（2026-10-12 本机实测）**：`pnpm --filter web typecheck` 0 错误 · `pnpm lint` 0 error（仅既存 `SafeImage <img>` 告警）· vitest **103 文件 / 1018 用例全绿**（新增 `reverse.spec.ts` 5 例 + `order-disposition.spec.ts` 12 例）· `next build` exit 0（经 `pnpm install --force --ignore-scripts` + `prisma generate` 离线修复残缺 node_modules 后全新构建）· `check-docs-facts` **14/14**（route 136→139 · spec 135→138）· admin e2e **40 passed / 0 failed / 20 skipped**（新增 `orders.spec.ts` 4 例，非侵入不改真实账本）。S6 未新增权限域/导航入口，`seed-rbac`/`seed-navigation-menu` 无需重跑。**未推送**（按用户「任务全部完成再统一推送」指令）。

### Added — CRUD 孤岛激活与接入断链补全（S7 · `restructure-admin-nav-rbac-cms`）
- **权限域决策**：S7 **不新增权限域**——prices→`admin.models.{read,write}`、oidc/ranking-weights→`admin.configs.{read,write}`（复用既有域），故 `seed-rbac` 无需重跑（规避 `db:seed` 破坏陷阱）；仅 `seed-navigation-menu.ts` 幂等追加 `adm_prices`/`adm_oidc` 入口（coverage 31/31）。
- **S7.1 模型定价孤岛**：`admin.schema.ts` 新增 `AdminPricesQuerySchema`/`AdminPricePatchSchema`/`AdminPriceCreateSchema`（Decimal 金额非负有限数）；GET `/api/v1/admin/prices`（当前价 isCurrent=true + 模型/厂商投影、**Decimal→string**、q/modelId/limit≤200）+ POST（为尚无当前价模型新建，`@@unique([modelId,isCurrent])` 命中已有→400）+ PATCH `/prices/[id]`；`PricesManager.tsx` + `/admin/prices`（服务端 `canWrite=admin.models.write` 下传）；写 `writeAudit` + `revalidatePath("/pricing")` 令前台即时生效。
- **S7.3 OIDC 客户端管理（安全边界）**：GET `/api/v1/admin/oidc-clients` 列元数据但**绝不下发 `clientSecretHash`**（guard `admin.configs.read`）；PATCH `/oidc-clients/[id]`（`AdminOidcClientPatchSchema` 校验 URL，编辑 name/redirectUris/logoutUri/scopes/isActive）；`OidcClientsManager.tsx` + `/admin/oidc-clients`。**secret 不经此面发放/回显**（与 seed/env 安全设计一致）。
- **S7.4 公告前台消费闭环**（此前 F0010 成立——前台零消费）：`lib/features/announcements/repository.ts`（`listActiveAnnouncements` 仅「已发布+启用+未删除+未过期」，DB 挂静默回落空数组）；`(site)/announcements/page.tsx`（force-dynamic 列表）；首页 `AnnouncementBanner`（首条有效公告横幅，无则不渲染，跟随首页 `revalidate=300`）；`SiteFooter` 资源列加 `/announcements` 入口。
- **S7.5 ranking-weights 孤儿裁决**：表被 `ranking/repository.listActiveWeights` 消费（非死表）但 API 完整无 UI（UI 孤岛）——新增 `RankingWeightsEditor.tsx` 复用既有 `/api/v1/admin/ranking-weights` GET/PUT，折叠进 `/admin/configs` 「不常用配置」区（configs 页转 async 算 `canWriteConfigs`）。
- **门禁证据（2026-10-12 本机实测）**：`pnpm --filter web typecheck` 0 错误 · `pnpm lint` 0 error（仅既存 `SafeImage <img>` 告警）· vitest **106 文件 / 1037 用例全绿**（新增 `admin-prices.spec.ts` 8 + `admin-oidc.spec.ts` 5 + `announcements/read.spec.ts` 6）· `next build` exit 0（经 `pnpm install --force --ignore-scripts` + `prisma generate` 离线修复残缺 node_modules 后全新构建）· `check-docs-facts` **14/14**（route 139→143 · page 52→55 · spec 138→143 · @aidean/ui refs 55→58 · lib-features 17→18）· admin e2e **46 passed / 0 failed / 20 skipped**（新增 `prices.spec.ts` 3 + `oidc.spec.ts` 3，只读呈现非侵入）。`seed-navigation-menu` 幂等复跑通过。**未推送**（按用户「任务全部完成再统一推送」指令）。

### Added — 运营报表/响应式/批量并行/死表裁决/文档治理收口（S8 · `restructure-admin-nav-rbac-cms`）
- **S8.1 运营报表（二维图、只读聚合）**：`packages/shared/src/schemas/reports.schema.ts`（`AdminReportsQuerySchema` days 7-90 缺省 30 + 四 view 接口）；`lib/admin/reports-core.ts`（`buildReportView` 纯函数：零填充/分桶/`fenToYuan`）、`lib/admin/reports-chart-option.ts`（趋势双轴 + 模型排行 option）；`api/v1/admin/reports/overview/route.ts`（`Promise.all` 四路 groupBy **只读 `usage_daily_stats`** 日汇总 + `recharge_orders` PAID JS 归并，**禁扫 `usage_logs` 明细**）；`ReportsBoard.tsx`（swr + `EChartWrapper` dynamic ssr:false）接入 `(admin)/admin/page.tsx`。跨域概览走 `requireAdminApi()` 无参入场总闸（同 `/admin` 首页口径），**不落具体业务域/不新增域**，`seed-rbac` 无需重跑。
- **S8.2 移动端响应式抽屉**：`AdminMobileNav.tsx`（`md:hidden` 汉堡 + 遮罩抽屉，内嵌 `AdminSidebar forceExpanded`）；`layout.tsx` 桌面侧栏 `hidden md:block` + header 插抽屉。**不重构 RSC 布局**（仅 CSS 断点隔离，桌面零回归）。
- **S8.4 批量串行改并行 + 分页封顶**：`providers/batch/route.ts` 逐条 `for-await writeAudit`→`Promise.all`（业务结果不变，仅降时延）；`capabilities`/`protocols`/`discovery/candidates` GET 的 `pageSize` 经 `Math.min(100, …)` 封顶（防超大 take 扫全表）。
- **S8.5 死表逐个裁决**：grep 反查运行时消费者——`navigation_menus` S2 已激活；`favorites`/`feedback`(+`feedback_comments`)/`user_notifications`/`feature_flags`/`ladder_charts`/`ladder_rankings` 六类七表运行时零消费，**保留 schema、不迁移不批量删**（删表属破坏性迁移，与重构正交，另立 change-id 走 ADR），逐表裁决记录于《数据库文档》§九。
- **S8.6 文档治理同步（铁律 2/3/6）**：《API接口文档》§5.8.6 逐端点登记 S2-S8 admin 端点（v1.46）；《API架构设计方案》新增 §7.9 `restructure-admin-architecture` 与 §5.8.6 双向锚（v1.12）；《数据库文档》§九死表裁决 + §二补登 RBAC 四表且口径 64→68 model/36→37 enum（v2.10）；《目录结构文档》§十一 重构增量（v3.12）；《功能设计文档》§3.5 口径锚 27→35 域/26→31 页（v0.8.5）——**兼偿还 S3 RBAC 四表 + S2-S7 新增页/域未回写的跨片累积口径债**（`check-docs-rule` 由 FAIL→PASS）。
- **门禁证据（2026-10-12 本机实测）**：`pnpm build` exit 0（经 `pnpm install --force --ignore-scripts` + `prisma generate` 修复 `jest-worker/processChild.js` 残缺 node_modules 后全新构建）· vitest **107 文件 / 1042 用例全绿**（新增 `lib/admin/__tests__/reports.spec.ts` 5）· `check-docs-facts` **14/14**（route 143→144 · @aidean/ui refs 58→59 · spec 143→146）· `check-docs-rule` **PASS**（model=68/enum=37/域=35/页面=31）· 全量 admin e2e **52 passed / 0 failed / 20 skipped**（新增 `reports.spec.ts` 4 + `mobile-nav.spec.ts` 2，零回归）· dev 已按端口 owner 停（仅 3000，3400 AideanThesis 未触）。**未推送**（按用户「任务全部完成再统一推送」指令）。

### Changed — 品牌主色 AA 小字达标（N7）
- **WCAG AA 小字≥ 4.5:1 直接修复**（管理者直报「修改到 4.5:1 以上」，取代 v1.4 登记的「另提 ADR」缓施方）：`--primary` **teal-600 (#0d9488) → teal-700 (#0f766e)**（对比度 3.74→5.47:1）与 **orange-600 (#ea580c) → orange-700 (#c2410c)**（3.56→5.18:1），indigo-600 保持 #4f46e5（6.29:1 已达标）。色相 hue 保留，同相深一档。`button.tsx` `primary` 变体 `hover:brightness-110 → 105`（三主题 hover 态均 ≥4.5:1）。与主题色引用同步：`globals.css :root/[data-theme=teal]/[data-theme=orange]` + `--page-gradient` 首层 rgba + `ThemeSwitcher` 色点 + `UsageStatsPanel` fallback + `qa-fe-01-regression` 断言。**运行态终证**：Playwright 登录态循环三主题 `data-theme`，`[data-testid="console-config-save"] button` 的 `getComputedStyle` 实测 bg=rgb(15,118,110)/(79,70,229)/(194,65,12)、fg=白、filter=brightness(1.05)，对比度 5.47/6.29/5.18 常态 + 5.05/5.82/4.77 hover，**ALL PASS**。门禁：check-gates **7/7** PASS（tsc 0 · button-antipattern 0/82）、vitest **954/959**（同 5 失败既存正交）、facts **14/14** PASS、rule PASS。详见《控制台7项反馈》v1.5 §7.6。

### Changed — 控制台按钮悬停可读性根治（N6）· 保存钮上移 · admin 原生弹窗归一（WF-28~30）
- **N6 按钮悬停不可见根治**：根因是 `@aidean/ui` `Button` 的 `ghost`/`outline` 变体固定带 `hover:bg-[var(--muted)]`（`--muted:#f1f5f9` 近白），业务方以 `variant="ghost"` 叠加 `bg-primary`/`bg-foreground` + 浅色字做实心按钮时，`cn()`（twMerge）只消解同修饰符组，`hover:` 组的近白底逃逸覆盖 → 悬停浅字落近白底不可见。修复：① `button.tsx` 新增 **`dark`** 变体（`bg-[var(--foreground)] text-[var(--background)] hover:brightness-125`，深底浅字实心），`ghost`/`outline` 显式补 `text-[var(--foreground)]` 并写死变体契约注释（实心按钮一律 primary/dark/danger）；② 控制台调用点迁移——`ModeSwitch` 激活态/`ConfigSaveButton`/`+添加绑定`/立即充值/立即兑换 → `primary`，「添加渠道」+ 渠道 Dialog 确认 + 平台渠道三钮（创建/复制/新建 Key）→ `dark`；③ `check-gates.ps1` 新增 `button-antipattern` 守卫（`ghost|outline` + 实色深底 + 浅字正则，排除 `bg-primary/5` 半透明与中灰合法用法），全仓 82 tsx 命中 **0**。
- **模型配置保存钮上移**：通用版「保存四档绑定」与专业版「保存优先级」原在组件底部，经 `consoleStore.configSave` 状态提升（表单注册 save action + `saveRef` 取最新闭包），统一渲染于「模型配置」标题行 **版本切换左侧**（`ConsoleWorkspace` `[ConfigSaveButton][ModeSwitch]`），保留 e2e「切换器居标题行最右」与 `tier-dup-error`/`tier-saved` 等就近提示 testid。
- **admin 原生弹窗归一规范组件**：`Scripts`/`Wallets`/`Sync`/`Evaluation`/`ApiStation`/`Announcement` 六管理器残留的原生 `alert`/`confirm`/`prompt` 迁移至 admin 既定范式——内联 `message`（`role="status"` slate 卡）替代 `alert`、`ConfirmDialog` 替代 `confirm`、`Dialog`+`Input` 替代 `prompt`（Sync 回滚原因），全部 testid 与业务逻辑不变；全 admin `alert|confirm|prompt` 真实调用 grep = **0**。
- **文档同步**：《控制台7项反馈-代码复核与剩余任务大纲》v1.3→v1.4（新增 §7.5 N6 执行回执）；《未完成事项目录》v2.33→v2.34（§7.33 本轮回执）；《文档索引》同步两文版本。
- **门禁证据（2026-10-10 本机实测）**：`check-gates.ps1` **7/7 PASS**（`tsc --noEmit` 0 错误、`button-antipattern` 0/82、prisma validate 有效、store untouched）；admin 原生弹窗 grep 0；**运行时 `getComputedStyle` hover 实测**（登录态 Playwright 直达 `/user/console`）——三处修复按钮悬停背景稳定不翻 `#f1f5f9`（`dark` 添加渠道 17.06:1、`primary` teal 3.74:1 见下注）、保存钮 `x=995` 居版本切换 `x=1119` 左侧同行；`next build` **exit 0**（修复 corrupt `next`/`clsx` 软链后全新构建）；vitest **954 passed / 5 failed**（5 项全困于 `billing.spec.ts` 订单回关闭环，经 `git stash` 干净 HEAD 对照实证为既存且与本改动正交，需支付渠道 mock/DB seed 前置）。**已知越界项**（v1.5 N7 已修复）：白字落品牌主色 旧值 `#0d9488` = 3.74:1（低于 AA 小字 4.5:1）。v1.5 同相深一档至 teal-700 `#0f766e` (5.47:1) + orange-700 `#c2410c` (5.18:1)，三主题 hover 亮度降至 105%，均 ≥4.5:1，详见下条。

### Added — 采集基础数据支撑来源全量路线（L1-L5）
- **L1 模型三源周期化 + 单一真源注册表**：`lib/sync/sources/registry.ts`（`SYNC_SOURCES` 11 源纯数据 + `MODEL_AGGREGATION_CROSS_KEYS`）+ `adapters.ts`（服务端工厂 `ADAPTER_REGISTRY`/`buildAdapter`/`buildCrossAdapters`）+ `registry.spec.ts` 防漂移；quanzil/arena/openrouter 三源按源频率周期化，SyncManager UI 暴露。
- **L2 自定义频率管理闭环（admin/scripts CRUD+trigger）**：`app/api/v1/admin/scripts/route.ts`（GET 全局 `deletedAt` 过滤 + POST 新建）、`[id]/route.ts`（PATCH 白名单 + 频率/启停重算 `nextRunAt`、DELETE 软删）、`[id]/trigger/route.ts`（触发语义自集合 POST 迁出）；校验真源 `lib/features/admin/script-validation.ts`（`isValidScriptPath` 白名单/`validateCron`/`computeNextRunForSchedule`）；`ScriptsManager.tsx` 完整 CUD UI；`script-executor` 补软删过滤；审计 action=1/2/3 全覆盖。
- **L3 llmtest.cn 站点采集**：`lib/discovery/llmtest.ts` 纯映射（composite 榜单 → `DiscoveryCandidate`，domain 守卫 + 同批去重）；`candidate-discovery.ts` 填充 `discoverFromCrawl`（safeFetch + 逐域预检幂等）；`scripts/crawl/crawl_llmtest.ts` 薄封装调度脚本；`seed.ts` 登记 llmtest 采集 ScheduledScript 行。`--dry-run` 实测发现 50 候选。
- **L4 安全与出网健壮性**：`url-policy.ts` 新增 `resolveOutboundProxy`/`getOutboundDispatcher`（HTTP(S)_PROXY env 门控 ProxyAgent，**默认无代理与 `getSecureDispatcher` 完全等价——SSRF 现状零变化**）；`base.ts fetchJson` 改 `safeFetchWithRetry`（5xx/网络错误 3 次退避、`UnsafeUrlError` 不重试）。
- **文档同步**：《API接口文档》v1.45（新增 §5.8.5 采集脚本调度管理、修正 §5.8.4 陈旧状态声明）、《功能设计文档》v0.8.4（§3.4 交付实况）、《项目需求更新分析》v7.1（R-71 登记不修→已交付）；`check-docs-facts.mjs` 计数同步（route 128 / spec 126）。
- **门禁证据**：`tsc --noEmit` exit 0；vitest 97 文件/959 用例全绿 exit 0；`next build` exit 0（含新路由）；`check-docs-facts` 14/14 PASS、`check-docs-rule` PASS。

### Changed — 控制台命名统一 · 外部渠道四协议 · 用户区风格对齐 · 后台收口（M1-M6）
- **M1 命名统一**：「接入密钥」→「平台渠道」、「API 渠道」→「外部渠道」（纯 UI 文案，`data-testid`/后端 `kind` 字段不变；e2e 文案断言同步）。
- **M2 外部渠道添加体验闭环**：添加/编辑改 `@aidean/ui` `Dialog`、删除走 `ConfirmDialog`、行内编辑、控件标准化、测试连通。
- **M3 上游协议扩展至四种**：Prisma `ChannelFormat` enum + shared `GATEWAY_FORMATS` 由 openai/anthropic 两值扩为 **openai/anthropic/openai-responses/gemini** 四值；`adapters.ts` 以 OpenAI 为中枢（hub-and-spoke）实装四协议**真实**上游适配（URL/鉴权头/请求体/响应回转/SSE 聚合）；跨格式流式强制走 `callUpstreamAggregated` 聚合后回转（`isPassthroughSafe`）；`gatewayFormatToChannelEnum`/`channelEnumToGatewayFormat` 为 wire↔enum 唯一映射真源；「外部渠道」面板 `format` 选择器四选一；migration `20261010000000_channel_format_extend_4` 已 deploy。新增单测：adapters 转换器 + format 映射回环（web gateway+channel-aggregate 158 passed、shared gateway 15 passed）。
- **M4 用户区风格对齐**：以 `/news`、`/pricing` 为基准抽 `PageHeader`、`/user/balance` 重做、`/user/console` token 化 + 暗色适配。
- **M5 后台收口**：A—确定性 bug 波（批量删除死锁×4/Sync 回滚/UsersTable/首帧闪空态）；B/C/D—后台遗留手工 overlay 模态（CandidateManager/EvaluationManager/TierMappingsManager/FreeQuotasManager ×2）收敛至 `@aidean/ui` `Dialog`（UsersTable 为侧边抽屉保留）。**范围结论**：后台为刻意浅色 slate 主题（slate 类名 ≈408、语义 token 近 0），全量暗色 token 化列为独立后续议题（高回归风险、非需求本意）；后台数据均为动态无 mock。
- **文档同步**：《API接口文档》v1.44、《API架构设计方案》v1.11（新增 §7.8）、《术语表》v1.17 登记上游协议四值扩展与双向互引锚（铁律 2/3）。

### Changed — 控制台体验修复批次（M1-M6，/user/console 五问题）
- **M1 API Key 物理删除**：`DELETE /api/v1/user/api-keys/[id]` 由吊销（`isActive=false`）改为物理删除（`deleteApiKey` 移除整行）。`UsageLog` 不引用 `apiKeyId`，删除不破坏历史消耗明细；0 行（不存在/非本人）→ 40000。
- **M2 可读性加固 + 创建 Key 用途弹窗**：Key 详情/列表对比度修复（`ak_…·gateway:chat·默认 60/min` 文本可读性）；创建 Key 弹窗提供三档用途预设（名称+权限）与明文一键复制（明文仅创建响应返回一次）。
- **M3 station-keys/custom-channels CRUD 补齐**：自有密钥与自定义渠道增删改全通路，新增站点下拉（`/user/station-keys/stations` 供选择器）；说明文字对比度修复。
- **M4 统计报表日期区间 + 多维**：`GET /user/usage/stats` 新增 `dateFrom`/`dateTo` 自定义有界窗口（`USAGE_STATS_MAX_WINDOW_DAYS`）；新增 `GET /user/usage/breakdown` 渠道×模型×计费路径多维聚合（读 `usage_logs` 有界窗口 `groupBy`，来源优先级 channel>station>platform，名称回填限本人）；`UsageStatsPanel` 支持预设/自定义日期切换 + 多维矩阵表。
- **M5 调用测试台 4 种接入格式**：shared 网关契约新增正交「接入格式层」（`GATEWAY_ACCESS_FORMATS`=openai/anthropic/openai-responses/gemini + `detectAccessFormat`/`normalizeAccessRequest`/`serializeAccessResponse`）；chat route 边界归一为内部 OpenAI Chat（上游适配层不变）；`CallPlayground` 支持四种格式请求体构造与响应解析（responses/gemini 强制聚合）。上游/渠道协议格式 `GATEWAY_FORMATS`（openai/anthropic）保持不变。
- **文档同步**：`docs/architecture/API接口文档.md` v1.41 登记以上端点与行为变更。
- **环境修复（非代码）**：`node_modules/.pnpm/next@15.0.0/**` 出现空目录（`dist` 缺失）导致 `next build` 报 `jest-worker/processChild.js` 缺失；以 `pnpm install --force` 从本地 store 重新物化后 build 恢复绿色（与本次代码改动无关）。

### Verification — 控制台体验修复批次
- TypeScript (tsc --noEmit)：web 0 errors、shared 0 errors
- ESLint (web)：pass（仅既存无关 `<img>` 提示）
- Vitest：web 858/858 pass（基线 847）、shared 109/109 pass
- next build (web)：✓ Compiled successfully，standalone 产物拷贝完成（exit 0）

### Added — 模型提供商定价设计增强
- **Schema**: `ProviderModelOffering` 新增 `discountCacheMin`/`discountCacheMax` 字段（Decimal 19,6），补齐缓存命中维度的折扣价数据结构；配套 Prisma migration `20260928180000_add_discount_cache_to_offerings`。
- **Shared**: `AdminOfferingUpsertSchema` / `AdminOfferingPatchSchema` 新增 `discountCacheMin`/`discountCacheMax` Zod 验证字段。
- **API**: offerings POST (upsert) 和 PATCH 路由处理 `discountCacheMin`/`discountCacheMax` 字段。
- **Providers 页面**: 价格表重构为三行制（输入/输出/缓存命中），每行展示标价 + K Tokens 折扣价 + M Tokens 折扣价双列，附换算公式与示例。
- **Admin ProvidersManager**: offerings 子表新增"折扣价(缓存)"列。
- **功能设计文档**: 新增"附录 D：模型提供商定价数据模型"章节，包含字段清单、计算公式、缓存折扣价闭环说明。

### Changed — 文档与文件清理
- **文档归档**: `docs/research/sso-balance-final-plan.md` 移入 `docs/archive/research/`（SSO 已落地实施，研究规划完成使命）；删除空的 `docs/research/` 目录。
- **文档索引**: 移除 `docs/research/` 条目，更新 `docs/archive/` 描述。
- **网关计费时序契约**: §2.1 待闭环注记（cached 折扣未生效）标记为"已闭环"。
- **archify 工具归档**: `.example/archify/`（AideanSynapse 架构图生成器，孤儿工具）移入 `docs/archive/archify-source/`，产物 HTML 已在 `docs/archive/`。
- **孤儿脚本删除**: 移除 `scripts/db-count.cjs`、`scripts/gen-doc-index.js`、`scripts/gen-migration-checklist.py`（零引用一次性工具），`scripts/test/formula_test.ts`、`scripts/test/ranking_test.ts`（纯"待实现"桩）。
- **空目录清理**: 删除 `tests/`（仅含 `.gitkeep` 空占位）。
- **遗留资源清理**: 删除 `public/images/{references,banners,avatars,qrcodes}/` 及 `icons/3.gif`（旧 AigcLadderDiagram 项目遗留，零引用 + references/banners 重复）。

### Verification
- TypeScript (tsc --noEmit): 0 errors
- ESLint: pass
- Vitest (shared): 104/104 pass

## [0.11.0] — 2026-10-23

> 版本: v1.0 | 更新: 2026-10-23 | 变更: 新增 V0.11.0 段（由 V0.12.0 卡 T120-07 按 `docs/任务规划V0.11.0/` 10 执行卡 + 3 候选卡的 git 实况回填；只记**已合并**内容，未实施面逐条写在「未做面」）。注：0.8/0.9/0.10 未单独成段，其内容仍在上文 `[Unreleased]` 块内。

本轮主题：**运行态闭环与后台模块完成度**（消解 DEF-011-01…15）。规划·取证·核验全文见 `docs/任务规划V0.11.0/`，逐卡提交号总表见其 `README.md` §卡状态。

### Added — fx 日快照采集入口与价格分层（B11-01 `7f1fa229` · B11-02 `6edaa940`）
- **采集入口（DEF-011-01）**：`scripts/crawl/fx_daily.ts` 此前已交付却无执行入口 → 新增 `pnpm crawl:fx`（根 `package.json`），`fx_daily_rates` 由 0 行起可写入。
- **离线兜底不编造汇率**：实测外网源 Frankfurter 可达，且「源失败自动写估算值」= 编造汇率并让它参与计费，违反 fail-closed → 不内置自动兜底，改为显式 `--rate` 人工发布（`source=manual`）。改判过程见 `docs/任务规划V0.11.0/06_validation/evidence/EVD-B11-01/deviation.md` §一（RK-11-01）。
- **价格分层 seed（DEF-011-02）**：原币维度价格 **0→922**，付费/促销样本进入 `/pricing` 120 窗口；采用**分层**而非替换，先只读核对 `promotion-billing.spec.ts` 以保 U-23 免费路径。

### Added — 协议/能力矩阵运营化（B11-03a `2440fc90`+`033be62b`/merge `dcf28e03` · B11-03b `f2b7c6a5`→`d41f3eae`→`61861826`→验收 `be6d7dcf`，Q-11-01=A）
- 后端：service 层 + `[id]` GET/PATCH/DELETE + zod strict 校验 + `ai_models` 回填写入路径；`40000` 文案点名未知字段/非法 id。
- 前端：新增 `MatrixPanel` 共用外壳（`Table*` 渲染 + 分页条 + 筛选 slot）与 `matrix-panel.spec.ts`；`ProtocolMatrix`／`CapabilityMatrix` 接外壳，原生 `<table>` 归零，补 entityType / source / modelId 筛选、分页与增删改。
- 验收：audit `tbl` 归零、12 态截图齐、CRUD 6×200、门禁全绿；facts 锚 spec 209 · `@aidean/ui` refs 72。

### Added — `@aidean/ui` 底座扩容与 admin 表单热区迁移（B11-04a `66ce864e`（评审通过 `9fca091b`）· B11-04b `e5abdd22`→`220d5d80`→`ad8a190b`→`719b6b7b`→验收 `8aa32fd9`）
- 底座新增 `Select` / `Textarea` / `Label`，延续「占位简化版、零业务逻辑、不引入 cva/radix」约束；`packages/ui/src/index.ts` 现导出 **11** 个组件族。
- admin 侧以 codemod + 人工清理迁移**锁定的 18 个高密度文件**：select/textarea/label 一批（`e5abdd22`），按钮 C1–C18 分三批（`220d5d80`/`ad8a190b`/`719b6b7b`）；验收 = audit 归零 + 34 页截图 + 冒烟 5/5 + 门禁。
- **未做面（RK-11-10）**：归零仅对 18 文件成立；2026-10-23 同脚本复测为 57 个 admin 组件中 **25** 个仍含原生标签（rawButton 29 / rawSelect 18 / rawTextarea 8 / rawLabel 61 / rawTable 1）。

### Added — 后台五态外壳与 testid 基线（B11-05 `e92b126a`→`303bc06e`/`bc4aa30c`→`a7fa5aad`→验收 `976bfe1a`）
- 三批共 14 个面板接入 `PanelState`（`packages/ui` 的 `PanelStatus` = loading/empty/error/forbidden/ready），外壳只包状态不包业务列。
- 失败注入单测 12 条 + 三面板 500 截图与运行态重试；五态契约文档升至 v2.12，度量/偏差/验收 EVD 齐（门禁 8 条全绿）。
- **未做面（RK-11-06）**：33 个无运行态实证的「错误态缺失」页须逐页复测才可打勾，静态结论不得当运行态结论。

### Fixed — 游客 401 噪声治理（B11-06 `534c722d`／docs `b75166e4`／取证 `e5b5e470`／merge `16e3261f`，Q-11-02=B）
- 客户端单一会话 store + middleware 会话提示 Cookie ⇒ 游客**零探测** `auth/me`；已知匿名即跳过 favorites 探针（此前每页 2 条红字）。
- **未做面**：未新建 `/auth/session`（2026-10-23 实测该目录不存在），`auth/me` 保持 401 语义；升格 A 的前置条件（残余红字无法归零）未触发。

### Added — 目录快照与供给闭环（B11-07 `7d70eb63`+`07ab330a`／merge `fe59e4a7`）
- 采集器首跑落地（DEF-011-09/10）：`catalog_snapshot` **0→4**、变更流 **1729** 条、**25** 个模型有 offerings 行。
- 不可达源记录 `credential_missing`，禁止伪造 provenance（`seed-no-official` 断言守护）。

### Fixed — 调度链与执行历史闭环（B11-08 并入 `7f1fa229`；镜像与守卫加固 `6cac3471`）
- 修「容器内调度链必失败」与「执行历史恒空」（DEF-011-11/12），dev 与 `next start` 双口径核验。
- `6cac3471`：builder 阶段 `scripts/build/bundle-scripts.mjs` 把 10 个白名单脚本预编译为 `apps/web/scripts-dist/*.mjs` 并 COPY 进 runner；`script-executor.planScriptRun` 优先级「源+tsx > 预编译产物 > POSIX npx > 报错」；修 `fx_daily` 入口判定只认 `.ts` 会造成打包后静默 exit 0 的假成功，并在打包器构建期拦截同类写法；新增 `scripts/guard/node-modules-integrity.mjs`（web build 前后深扫，异常即 exit 1）。
- **未做面（RK-11-07）**：真 `docker build`、alpine musl 引擎、`nextjs` 用户下运行仍**待确认**——V0.12.0 T120-04 因沙箱容器无镜像仓库出网判 `blocked:no-docker-egress`（证据 `5d72a6e5`）。

### Changed — 契约一致性与守卫统一（候选卡 B11-09 `a02d8c19` · B11-10 `aa7ce564`/docs `f5b93138`/merge `f96cc6e7` · B11-11 `a92b9584`→`71a2c782`→`d03976c0`→`2b60193e`）
- **barrel 回红线（Q-11-04=A，DEF-011-14）**：拆 `lib/currency`、`lib/monitoring/public-pricing`、`lib/sync/mappers`、`lib/sync/writers` 四处业务 barrel，消费点改具体文件（`middleware.ts`、`scripts/crawl/monitor_catalogs.ts` 等）；`barrel-check` 由 4>3 归零且**未调容忍值** ⇒ `pnpm gates` 七项 PASS。
- **非 2xx 出口统一信封（Q-11-03=B，DEF-011-13）**：未实现方法 → 405 + `Allow`；未匹配 `/api/*` → 404 JSON（此前为 405 + 0 字节空体、404 + 27 KB HTML）。**未做面**：26 条单资源路由的 GET 未补，不得读成 REST 完备性已补齐。
- **分页有限性守卫统一口径（Q-11-05=A，DEF-011-15）**：共享件 `lib/http/pagination.ts`（`Number.parseInt` + `Number.isFinite` 双步）+ **15** 个后台列表端点全量接入，非法串由 500 改 400；≥10 例单测 + 第三轮变异检验 15/15。intelligence `limit≤1000` 按 Hark 裁定②保持原样。
- **P0 三项（Hark 裁定）**：`2be54b49` executions 非法 page/pageSize/status 统一 400（与 15 端点同口径）；`a8284d52` free-quotas / tier-mappings 非法枚举 400（白名单取自 Prisma 枚举，GET 与 POST 同源）；`c84efff2` PricesManager 模型下拉 `pageSize=200`→**50** + `q` 搜索（原值被 Zod ≤50 拒绝导致下拉为空）。

### Added — 全站体验修复（UX-01 调研 `2aed5f9c`；UX-FIX A `5dc454bb` / B `a39200d3` / C `f3c30c51` / D `67c1a275` / E `f23d8b69`；复测修正 `12e2ec61`/`f87804c3`/`99f943f8`/`71a9aeea`；导航自动对齐 `b8b21ebc`）
- 用户端外壳与版式（UX-01/13/14/15/17/19 + 用户裁定 6）、用户端状态与数据页（UX-02/03/05–12/14–16/18/20/21/29 + 用户裁定 2/9/10/11/12）、管理端（UX-04/22–28）、对比度收尾 + 首页区块容器全宽对齐，逐条对应 `EVD-UX-01` 调研项。
- 收尾：`/user/console` 与余额页 a11y 两处、对比度余量 0、500 注入覆盖 33 页；管理端导航改名改为**数据迁移自动对齐**（只改旧出厂名、保留自定义），免手动「应用推荐分组」。
- 文档修订落实 `EVD-UX-01` §8 九条建议 + UX-26 管理端 IA / oauth dev 回调在生产 404 的同步（以 main 代码为真）。

### Changed — 依赖安全升级（`3b9f88c8`，2026-10-23）
- Next.js 15.0.0 → **15.5.28** + `sharp ^0.35.5`（GHSA-2464-fhr4-w9xw / CVE-2026-96889 / GHSA-p3m5-59mp-jv5r）；`check-docs-rule` 大版本正则改为只取 major ⇒ 技术栈仍锁 Next.js 15（铁律 5 无冲击）。

### Verification — V0.11.0 收口读数与口径
- 门禁口径定版（RK-11-08）：报告必写「**六项命令 exit=0 + `pnpm gates` 7 项全 PASS**」（自 B11-09 起）；载体 `docs/任务规划V0.11.0/06_validation/evidence/EVD-B11-09/verify.txt`（`.scratch/b1109-gates.log`，`GATES_EXIT=0`）。T120-07 本卡**未复跑 gates**，当期结论以复跑为准。
- 类型检查判定只认 `pnpm --filter web exec tsc --noEmit --incremental false` 的全量读数（须同帧附 `apps/web/tsconfig.tsbuildinfo` bytes+mtime 不变）；`pnpm typecheck` 与 gates 的 `tsc-check` 共用同一份增量态，其 exit=0 不满足本口径。
- 五项待裁决（Q-11-01…05）已于 2026-10-22 全部裁决为 **A/B/B/A/A** 并实施；承接 V0.10.0 的 U-24 经复核属**早已落地**（裁决 2026-10-20 11:09 CST，实施 `c42890f9`/TASK-068），详见 `docs/任务规划V0.11.0/12_风险与待裁决.md` §四 更正与 §五 收口汇总。
- 自我证伪台账：审计期 5 类假阳性 + 执行/收口期逐次证伪见 `docs/任务规划V0.11.0/00_深度分析.md` §五；收口门禁流水见同目录 `25_执行记录.md` §九。

## [0.7.1] — 2026-09-23

### Changed — 项目结构治理（huaweicloud 分支交付优化）
- **根目录污染治理**：移除根级重复配置文件（`next.config.mjs`、`postcss.config.js`、`tailwind.config.ts`、`tsconfig.json`），这些文件与 `apps/web/` 下的同名配置重复，造成歧义。
- **目录结构规范化**：将 `.docs/`（隐藏目录）重命名为 `docs/`（可见目录），符合 PROJECT-STRUCTURE-SPEC 的可见性原则；将 `.trae/specs/` 迁移到 `docs/specs/`；将 `research/` 迁移到 `docs/research/`。
- **SQL 文件归位**：将根级 `rel01-baseline.diff.sql`、`rel01-baseline2.sql` 迁移到 `database/baseline/`。
- **环境变量模板归位**：将 `.env.smtp.example` 从根级迁移到 `apps/web/`。
- **设计笔记归档**：将 `.design.md` 迁移到 `docs/design-notes.md`。
- **全量引用更新**：将所有代码和文档中对 `.docs/` 的引用更新为 `docs/`，对 `.trae/` 的引用更新为 `docs/specs/`。
- **命名规范修复**：将 `research/` 中的 `_final` 后缀文件重命名为 `-final`（符合命名规范）。

### Fixed
- 修复 `apps/web/app/global-error.tsx` 中的 ESLint 错误：将 `<a href="/">` 替换为 `<Link href="/">`（`@next/next/no-html-link-for-pages` 规则）。

### Added
- 新增 `.editorconfig`，统一编辑器缩进/换行/字符集规则。
- 新增 `CHANGELOG.md`，记录项目变更历史。
- 更新 `.gitignore`，补充标准卫生条目（`.local/`、`*.bak`、`*_final*`、`_old`、`_copy` 等）。

## [0.7.0] — 2026-09-09

### Changed
- huaweicloud 分支 CI 纳入，修复 6 个 pre-existing vitest 失败用例。
- i18n 收敛为默认中文（ADR-0006）。
- 前后端分离 Monorepo 架构落地（ADR-0002）。
- 目录结构重构（ADR-0001）。
