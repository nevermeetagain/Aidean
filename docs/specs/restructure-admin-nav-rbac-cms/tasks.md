# 执行 Plan：管理端信息架构重构（可配置菜单 + RBAC + 日志体系 + 可见即可改）

> change-id: `restructure-admin-nav-rbac-cms` | 语言: 中文 | 版本: v1 | 创建: 2026-10-12 | 更新: 2026-10-12
> 格式继承 [docs/governance/开发流程.md](../../governance/开发流程.md) §四（L1→L4、六字段、增量展开）。
> 契约先行（全局约束 2）：每片 Zod/TS 契约先入 `packages/shared`，再实现。

## 0. 基线与冻结口径

- **Baseline**：分支 `huaweicloud`，HEAD 见 §Close；工作区 25 个改动文件/3 删除/23 未跟踪（含 `.example/`、`docker/`、`参考文档/` 等**与需求无关杂物，永不入库**，S0 处理）。
- 关键事实锚点（可复核）：

| Anchor | 冻结事实 | Evidence |
|---|---|---|
| F0001 | admin 页面 26 | `Glob app/(admin)/**/page.tsx` = 26 |
| F0002 | admin API 路由 78 | `Get-ChildItem app/api/v1/admin -Recurse route.ts -Filter route.ts` = 78 |
| F0003 | 站点页 21（/docs 在内） | `Glob app/(site)/**/page.tsx` = 21 |
| F0004 | Prisma 模型 64 | `Select-String '^model '` = 64 |
| F0005 | 守卫仅二元角色 | `(admin)/layout.tsx:51`、`session.ts:86` |
| F0006 | role 不可经 API 改 | `admin.schema.ts:101-109` 白名单 tier/status |
| F0007 | 菜单硬编码 3 组 25 叶 | `AdminSidebar.tsx:53-94` |
| F0008 | NavigationMenu/SystemConfig 可复用 | `schema.prisma:1524/1487` |
| F0009 | capabilities 分页无封顶 | `admin/capabilities/route.ts:16` |
| F0010 | 前台无公告消费 | 全仓 grep announcement，admin-only |

- 冻结术语：见本 spec 与《术语表》。一级/二级菜单以本表归属为准。

---

## L1: S0 基线归位与推送/端口护栏

### L2: S0.1 工作区归位
- 任务：清点 25 改动，区分需求相关/无关；无关杂物（`.example/`、`参考文档/`、`docker/` 探索产物）纳入 `.gitignore` 或明确不 stage。
- 前置条件：无 | 交付物：归位说明 + `.gitignore` 调整（如需）
- [验收] `git status` 中需求无关项不再出现在待提交集
- [Close] —

### L2: S0.2 泄露凭据处置
- 任务：确认泄露 PAT 由决策人在 GitHub 吊销/轮换；仓库与文档**不落盘**任何明文凭据；`.gitignore` 守卫本地账号文件。
- 前置条件：决策人操作 | 交付物：处置确认记录
- 验收标准（含反例）：任一新提交 diff 不含 token/密码字面量；反例：git config 写入带 token 的 remote URL → 禁止
- [验收] grep 全仓新提交无 `ghp_`/明文密码 | [Close] —

### L2: S0.3 端口与推送流程锁定
- 任务：本地 dev 固定 3000；13000 仅镜像自检；推送=每片全绿后 `git commit` + 单独报备决策人再 push（经 10808）。
- 交付物：本文件 §Close 记录流程 | [验收] — | [Close] —

---

## L1: S1 菜单展开态修复（最低风险、最先可感）

契约源：无（纯客户端组件）。

### L2: S1.1 openGroups 持久化 + 路由自动展开
- 任务：`AdminSidebar.tsx` 用 `useState` 惰性初始化读 `localStorage['aidean-admin-open-groups']`（SSR 安全，effect 内读），`useEffect([pathname])` 命中当前叶所属分组 index 时并入 openGroups；点击 toggle 后写回 localStorage。
- 前置条件：S0 | 交付物：改动后的 `AdminSidebar.tsx` + 新增 `e2e/admin/sidebar.spec.ts`
- 验收标准（含反例）：冷启动直访 `/admin/orders` 当前项在 DOM 且可见；展开某组刷新后保持；反例：SSR 首帧与客户端 hydration 值不一致报 warning → 禁止
- [验收] ✅ 2026-10-12：`e2e/admin/sidebar.spec.ts` **3 passed**（冷启动 `a[href="/admin/orders"]` toBeVisible + aria-current=page；手动展开后 reload 存档含组下标2）；`next build` exit 0 无 hydration 错；vitest 959 全绿
- [Close] ✅ S1 全绿（typecheck/lint/build/vitest/e2e）；CHANGELOG 已记（2026-10-12）；《前端开发文档》§8.1 留待 S8.6 文档治理统一同步

### L2: S1.2 清理死代码与默认值单一驱动
- 任务：删除 `:144` 空三元 `${collapsed ? "" : ""}`；默认展开态由路由 effect 统一驱动，去掉 `[0,1]` 与 effect 的双写竞态。
- 前置条件：S1.1 | 交付物：同文件改动
- 验收标准：无遗留空三元；`node_modules/.cache` 外无 lint error
- [验收] `pnpm lint` 退出码 0 ｜ ✅ 2026-10-12 lint 0 error（死三元已删） | [Close] ✅

---

## L1: S2 可配置菜单（激活 NavigationMenu）

契约源（先落）：`packages/shared` 新增 `navigationMenuSchema`（menuCode/name/parentId/level/path/linkType/scope/requiredPermissions:Int[]→改为 code 字符串数组/sortOrder/isActive）+ `NavScope` 枚举（SITE/ADMIN）。

### L2: S2.1 schema 迁移加列
- 任务：`NavigationMenu` 加 `scope`（默认 SITE）、`requiredPermissions String[]`（改自 `requiredRoles Int[]`，保留兼容映射）；生成 migration `<ts>_navigation_menu_scope`。
- 前置条件：S1 | 交付物：`schema.prisma` diff + migration SQL
- 验收标准（含反例）：`prisma migrate deploy`/`db push` 后本地结构一致；反例：直接手改 shadow/远端库 → 禁止（走脚本/迁移）
- [验收] ✅ 2026-10-12：migration `20261012075217_navigation_menu_scope` 已 apply（DB localhost:5435），`migrate status` 无 drift；`pnpm typecheck`/`build` 过（NavScope/requiredPermissions 类型已生成） | [Close] ✅ S2.1（注：`prisma generate` 引擎 DLL 因 dev 占用报 EPERM，类型已成功生成，版本未变无害）

### L2: S2.2 种子：现存 26 页入菜单树
- 任务：`scripts/seed-navigation-menu.ts` 将现 `GROUPS` 25 叶 + 新增入口写成 NavigationMenu 行（scope=ADMIN），覆盖全部 href。
- 前置条件：S2.1 | 交付物：seed 脚本 + 断言
- 验收标准（含反例）：反例：漏掉任一现有功能 href → fail；对照表（旧 href→新归属）零缺失
- [验收] ✅ 2026-10-12：`prisma/seed-navigation-menu.ts` 幂等 upsert，断言 `coverage 27/27`（26 原入口 + 新增 `adm_menus` 菜单配置）| [Close] ✅ S2.2

### L2: S2.3 读服务 + 缓存
- 任务：`lib/admin-navigation.ts` 读取并构建 ADMIN 树（`unstable_cache` tag `admin-nav`）。
- 前置条件：S2.2 | 交付物：lib + 单测
- [验收] ✅ 2026-10-12：`lib/admin-navigation-core.ts`（纯逻辑）+ `lib/admin-navigation.ts`（取数+`unstable_cache` tag admin-nav）；`admin-navigation-core.spec.ts` **6 passed**（overview 识别/分组归属/无path跳过/sortOrder 升序/iconPath 透传/DEFAULT 26 入口） | [Close] ✅ S2.3

### L2: S2.4 AdminSidebar 改读库
- 任务：`GROUPS` 常量删除，改由 S2.3 服务端注入；保留手风琴/折叠/持久化逻辑（S1）。
- 前置条件：S2.3 | 交付物：`AdminSidebar.tsx` + `(admin)/layout.tsx`
- 验收标准：渲染结果与种子树一致；缺库回退默认树不崩
- [验收] ✅ 2026-10-12：`(admin)/layout.tsx` 注入 `getAdminNav()`；`AdminSidebar` 删 GROUPS 常量、改受控 `nav` prop + `NavIcon`(iconPath)；`pnpm build` exit 0；e2e `sidebar.spec.ts` 2 passed（DB 驱动下展开/持久化仍成立）；缺库回退 `DEFAULT_ADMIN_NAV` 不崩 | [Close] ✅ S2.4

### L2: S2.5 菜单管理页与 API
- 任务：`/api/v1/admin/menus`（GET/POST/PATCH，写 `AuditLog` + `revalidateTag('admin-nav')`）；`/admin/menus` 面板（一级自建、二级选归属/排序/改名）。
- 前置条件：S2.4 | 交付物：route.ts + page.tsx + MenuManager.tsx + shared schema
- 验收标准（含反例）：新增/改名/排序后重登生效；反例：二级归属指向自身或成环 → 拒绝
- [验收] ✅ 2026-10-12：`/api/v1/admin/menus`（GET/POST）+ `[id]`（PATCH/DELETE，写 AuditLog + `revalidateTag('admin-nav')`，守护：menuCode 唯一/二级须归属现存 level1 分组/一级不可挂父/非自环/有子项拒删）+ `/admin/menus` 面板 + `packages/shared/menu.schema.ts`；vitest 全量 965 passed；e2e `menus.spec.ts` **3 passed**（DB 驱动入口高亮/面板读真源/建表单） | [Close] ✅ S2.5（待补：二级改父成环的专项 vitest 归 S2.6，功能已由 PATCH 守护覆盖）

---

## L1: S3 RBAC 接口级权限体系（A2 + B2）

契约源（先落）：`packages/shared/src/permissions.ts` 权限码注册表（`admin.<域>.<资源>.<read|write>` 枚举）+ `rbac.schema.ts`（roleCreate/rolePatch/userRolesPatch）。

### L2: S3.1 模型与迁移
- 任务：新增 `Role`(code/name/description/isSystem)、`Permission`(code/description)、`RolePermission`、`UserRoleAssignment`(userId+roleId 多对多)；`User` 加关系；migration。
- 前置条件：S2（结构就绪即可，可与 S2 并行准备契约） | 交付物：schema diff + migration
- 验收标准（含反例）：现有 ADMIN/SUPER_ADMIN 用户迁移后自动获得对应系统角色；反例：迁移后任一现有管理员失权 → 阻断
- [验收] ✅ 2026-10-12：migration `20261012082315_rbac_role_permission_user_role` 已 apply（localhost:5435），`migrate status` 无 drift；`seed-rbac.ts` 幂等回绑现有 `User.role` 枚举管理员（SUPER_ADMIN/ADMIN/MODERATOR→对应系统角色，实测 `回绑用户分配=1`）；管理员 e2e 仍可进 `/admin`（admin 项目 30 passed，SUPER_ADMIN 通配不失权） | [Close] ✅ S3.1

### L2: S3.2 权限解析与缓存
- 任务：`lib/features/auth/permissions.ts`：`getUserPermissions(userId)` 联合角色权限，`unstable_cache` tag `admin-auth`；SUPER_ADMIN 返回通配。
- 前置条件：S3.1 | 交付物：lib + 单测
- [验收] ✅ 2026-10-12：`lib/features/auth/permissions.ts`（`loadAdminPermissions` 具名导出便于无 Next 缓存上下文注入 mock prisma）；`permissions.spec.ts` **8 passed**（查无/SUPER_ADMIN 通配/分配 SUPER 通配且 `*` 不落 codes/多角色并集去重/MODERATOR 入场/ADMIN 非通配）；`getAdminPermissions` `unstable_cache` tag `admin-auth` | [Close] ✅ S3.2

### L2: S3.3 requireAdminApi 扩展 + 页面守卫
- 任务：`requireAdminApi(permission?: PermissionCode)` 增可选权限码入参，无参=旧行为（任一 admin），有参=校验持有；`(admin)/layout.tsx` 守卫改为"是否持有任一 admin 权限"。
- 前置条件：S3.2 | 交付物：`session.ts`/`layout.tsx` 改动
- 验收标准（含反例）：78 路由全部保持原可访问（无回归失权）；反例：把权限校验放前端承担 → 禁止
- [验收] ✅ 2026-10-12：`requireAdminApi(permission?)` 无参=`isStaff` 入场总闸（放开 MODERATOR）/有参=逐接口强制；`(admin)/layout.tsx` 守卫改 `isStaff`；`admin-guard.spec.ts` 重写 **13 passed**（未登录10004/USER 拦10008/ADMIN·SUPER·MODERATOR 放行/null·软删·SUSPENDED·INACTIVE 10005/持有码放行/未持有码10008/通配放行）；现有 admin 路由矩阵无回归（admin e2e 30 passed） | [Close] ✅ S3.3

### L2: S3.4 逐路由声明权限码（分片串行）
- 任务：按域将 78 路由改为 `requireAdminApi('admin.<域>.<资源>.<read>')`，写/改接口用 `.write`；每域一组。
- 前置条件：S3.3 | 交付物：分组路由改动
- 验收标准（含反例）：每组改完跑该域 e2e；反例：MODERATOR 无该码访问被拒 403 | [验收] ✅ 2026-10-12：`scripts/rbac-codemod.mjs` 确定性标注 **80 文件 / 135 处** `requireAdminApi()`→权限码（DIR_TO_DOMAIN 归域、GET→read/写→write、按最近 export const 定位），dry-run 与 --apply 均 **0 gap / 0 未知域**；typecheck 0 / lint 0 / admin e2e（SUPER_ADMIN 通配）全绿无 403 回归；MODERATOR 无码被拒由 `admin-guard.spec.ts` 在 requireAdminApi 层逐例覆盖（未持有码→10008） | [Close] ✅ S3.4

### L2: S3.5 角色/成员管理 UI 与 API
- 任务：`/admin/roles`（角色 CRUD + 权限勾选）、`/admin/users` 角色列可编辑；PATCH `/admin/users/[id]` role 字段仅 SUPER_ADMIN，禁改自身与最后一个 SUPER_ADMIN，写审计。
- 前置条件：S3.3 | 交付物：pages + routes + shared schema
- 验收标准（含反例）：提升角色后目标可进 `/admin`（`revalidateTag('admin-auth')`）；反例：移除最后一个 SUPER_ADMIN → 拒绝
- [验收] ✅ 2026-10-12：角色/成员管理 API（roles CRUD + users/[id]/roles 三重护栏：禁改自身/末位超管/角色码存在）+ `/admin/roles` UI（`RolesManager.tsx` 按域读写勾选）+ `UsersTable`「分配角色」编辑器（`canAssignRoles` 服务端有效权限推导）+ 侧栏 `filterNavByPerms` 剪枝 + 种子 `adm_roles`；护栏 vitest（`admin-guard.spec` 13 + `permissions.spec` 8）、`admin-navigation-core.spec` filter 3 passed；e2e `roles.spec.ts` **4 passed**（入口高亮+读系统角色/分配角色露出/禁改自身 400/清 Cookie 401）；revalidateTag(admin-auth) 令授权即时生效 | [Close] ✅ S3.5

---

## L1: S4 站点可见即可改（CMS 全量）

契约源：`packages/shared` `siteConfigSchema`（命名空间 `site.*`）。

### L2: S4.1 配置键 seed + 读服务
- 任务：定义 `site.name/seo.*/logo/favicon/hero.stats.*/home.blocks.*/partner.*/docs.articles.*` 键；`lib/site-config.ts` 读取 + 默认回退（DB 不可用不白屏）。
- 前置条件：S3（守卫就绪）| 交付物：seed + lib + 单测
- 验收标准（含反例）：反例：DB 挂时前台白屏 → 禁止 | [验收] vitest 回退 | [Close] —

> 实现口径修正（开工勘探后）：命名空间未用单一 `siteConfigSchema`，而是沿用既有四处同步白名单（`ADMIN_CONFIG_KEYS` + `ADMIN_CONFIG_REGISTRY`）扩容：新增 `site.seo.keywords` + `home.hero/home.valuePoints/home.modelEntries` + `docs.articles`（17→22 键）。新增 `packages/shared/src/schemas/home-content.schema.ts`、`docs-content.schema.ts`（单一真源 `*_JSON` 手写真串 + `schema.parse(JSON.parse())` 派生 DEFAULT，`admin-config-seed-parity` 逐字符校验）。值规则 `homeHero/homeCards/docsArticles` 采用 validate-then-store-raw（不重排键序）。读服务：`lib/site-config.ts`（tag `site-branding`）、`lib/features/home/config.ts`（tag `site-home`）、`lib/features/docs/config.ts`（tag `site-docs`），均 try/catch→DEFAULT 回退。- [验收] ✅ 2026-10-12：`lib/__tests__/site-content-s4.spec.ts` **13 passed**（三态回退 + 新值规则校验）；`admin-config-seed-parity` **6 passed**、`admin-configs` **15 passed**（白名单断言同步 17→22）；seed 幂等：`db:seed` 连跑 2× exit 0（26 system configs） | [Close] ✅ S4.1

### L2: S4.2 前台接入
- 任务：`app/layout.tsx` `generateMetadata` 动态；首页各区块/合作伙伴/`/docs` 改读配置（保留硬编码为兜底）。
- 前置条件：S4.1 | 交付物：layout + home 组件 + docs/page 改动
- [验收] e2e 改站名后前台 `<title>` 变化 + 首页文案变化 | [Close] —

> - [验收] ✅ 2026-10-12：`app/layout.tsx` 改 `generateMetadata`（消费 `getSiteBranding`，输出 title/description/keywords/icons/OG）；`(site)/page.tsx` 转 async 读 `getHomeContent` 下传 HeroBanner/PlatformIntro/ModelSection（新增 `HomeIcon.tsx` 名→lucide 映射，未知名回退 Sparkles）；`(site)/docs/page.tsx` 转 RSC + 新 `components/docs/DocsReader.tsx`（client）读 `getDocsArticles`；configs 路由按组 `revalidateTag`（general/home/docs）+ `revalidatePath`。e2e `admin/cms-content.spec.ts` **2 passed**（改 site.name→前台 `<title>` 变；改 home.hero→首页 `<h1>` 变；测毕还原原值）；`pnpm build` exit 0（34 静态页，DB 挂亦回退不白屏） | [Close] ✅ S4.2

### L2: S4.3 配置面板分堆
- 任务：`/admin/configs`（+ 文本/文档/页面子入口）按"常用/不常用"分组，RICH_TEXT/JSON 编辑。
- 前置条件：S4.1 | 交付物：page + ConfigsManager 扩展 | [验收] e2e | [Close] —

> 交付物形态修正：未引入单体 `ConfigsManager`，而是沿用每域自含编辑器惯例（对齐 `SiteContentEditor`/`RoadmapEditor`）。- [验收] ✅ 2026-10-12：新增 `SiteBrandingEditor.tsx`（6 个 site.* 键表单）、`HomeContentEditor.tsx`（hero + 两组卡片，图标受限枚举下拉）、`DocsEditor.tsx`（文章/小节嵌套编辑）；`configs/page.tsx` 按「常用（品牌/首页/文档/合作/路线图/联系）/不常用（天梯图呈现参数，默认折叠）」分堆；`typecheck`/`lint` 无新错（仅遗留 `SafeImage <img>` 告警）；`@aidean/ui` import 数 51→54 同步至 `check-docs-facts`（14/14） | [Close] ✅ S4.3（及 S4 整体）
>
> ⚠️ 门禁运维陷阱（本轮实测）：`db:seed`（`prisma/seed.ts`）会 `navigationMenu.deleteMany()` + `systemConfig.deleteMany()`，仅回填前台站点导航与基础配置；后台侧栏 28 入口及角色回绑需紧随跑 `seed-navigation-menu.ts` 与 `seed-rbac.ts` 恢复，否则 admin e2e（/admin/roles、/admin/menus 入口）因导航数据缺失而红（非代码回归）。且重跑后需重启 dev 以刷新 `getAdminNav` 的 `unstable_cache(tag admin-nav)`。

---

## L2+ 远端切片（L2/L3，开工时按六字段增量展开）

### L1: S5 记录/日志中心（可与 S2/S3 并行）
- S5.1 `/admin/logs` 板块 + 只读聚合 API（审计/网关 UsageLog/采集 SyncBatch/脚本 ScriptExecution/安全 RefreshToken+OidcUserConsent）。
- S5.2 各记录页分页封顶 + 筛选；账本类确认无 DELETE/自由 PATCH。

### L2: S5.1 只读聚合 API + 看板
- 任务：新增权限域 `logs`（`admin.logs.read`）+ `packages/shared/src/schemas/logs.schema.ts` 三查询契约；`/api/v1/admin/logs/{usage,security,scripts}` 三只读路由（审计复用 `audit-logs`、采集复用 `sync/batches`）；`components/admin/LogsBoard.tsx` 五 Tab 只读表 + `/admin/logs` 页。
- 前置条件：S3（守卫就绪）| 交付物：shared 契约 + 路由 + 看板 + seed 入口 + 单测
- 验收标准（含反例）：反例：记录页出现新增/编辑/删除入口 → 禁止（仅查+筛）；BigInt 直传 JSON → 500 → 禁止（须转 string+元口径）
- [验收] vitest `admin-logs.spec.ts` | [Close] —

> 实现口径：权限域 `ADMIN_DOMAINS` 28→29（新增 `logs: "日志中心"`），经 `seed-rbac` 自动传播为 58 权限原子（SUPER_ADMIN 通配 / ADMIN 含 logs 读写 / MODERATOR 含 logs.read，均无需手改角色集）。三聚合路由 `requireAdminApi("admin.logs.read")`；`logs/usage` 覆盖 UsageLog（quotaMinor BigInt→string + `fenToYuan` 元口径、model/时间范围/仅错误筛选、pageSize≤100）；`logs/security` 双视图（RefreshToken 派生态 撤销>轮换>过期>有效 内存过滤 + OidcUserConsent 直读）；`logs/scripts` 跨脚本 ScriptExecution（status 标签、列表不含 output）。看板 `LogsBoard.tsx` 默认「网关调用」Tab，复用 `AdminDataTable` + `AuditLogsTable`，全部只读无写入口。- [验收] ✅ 2026-10-12：`admin-logs.spec.ts` **8 passed**（BigInt 序列化 / pageSize 越界 400 / onlyErrors where / 守卫 403 / TOKEN 派生态 / ACTIVE 过滤 / CONSENT 直读 / scripts 标签）；`pnpm --filter web typecheck` 0 错误；`check-docs-facts` **14/14**（route 133→136 · page 51→52 · spec 133→135 · @aidean/ui refs 54→55） | [Close] ✅ S5.1

### L2: S5.2 导航入口 + 分页封顶/筛选
- 任务：`seed-navigation-menu.ts` 加 `adm_logs` 入口（`perms ["admin.logs.read"]`）；各 Tab 分页封顶 + 轻量筛选。
- 前置条件：S5.1 | 交付物：seed + 看板筛选/分页 | [验收] e2e `admin/logs.spec.ts` | [Close] —

> - [验收] ✅ 2026-10-12：`adm_logs` 落 数据与同步 分组，seed `EXPECTED_HREFS` 28→29（coverage 动态、叶数 29 零缺失）；e2e `logs.spec.ts` 断言侧栏入口高亮 + 五 Tab + 安全双子视图切换 + GET usage 信封 code 0 + 清 Cookie 401 | [Close] ✅ S5.2（及 S5 整体）

### L1: S6 财务全链与处置
- S6.1 套餐订单只读 API `/admin/package-orders`。
- S6.2 订单"标记异常/关单"接真实 PATCH；冲正走 REVERSAL（非删除）。

### L2: S6.1 套餐订单只读 + 订单受控处置端点
- 任务：`packages/shared/admin.schema.ts` 新增 `AdminPackageOrdersQuerySchema`（page/pageSize≤50/status/userId）+ `AdminOrderDispositionSchema`（action `CLOSE|FLAG|REVERSE`/reason≤200/idempotencyKey）；GET `/api/v1/admin/package-orders` 只读聚合（`priceMinor` BigInt→string + `fenToYuan` 元口径、分页封顶、status/userId 筛选）；PATCH `/api/v1/admin/package-orders/[id]`（CLOSE/FLAG→`CANCELLED` 状态机 CAS，REVERSE 不适用→400）；PATCH `/api/v1/admin/recharge-orders/[id]`（CLOSE→`EXPIRED`/FLAG→`FAILED` 仅 PENDING；REVERSE 委托 `billingService`）。
- 前置条件：S3（orders 域守卫就绪）；**复用既有 `admin.orders.{read,write}` 域与 `/admin/orders` 页，无新权限域/导航入口** | 交付物：shared 契约 + 3 路由 + `OrdersManager` 处置列 + `orders/page` 下传 `canWrite` + 单测 + e2e
- 验收标准（含反例）：账本 `LedgerEntry` 不可处置（spec 铁律「账本只读·仅查+处置」，反例：给账本 Tab 加删除/编辑入口 → 禁止）；资金变动一律经 `billingService`（乐观锁+幂等+余额守卫），路由不得直写分录；「标异常/关单」落为**免迁移**的受控状态转移 + `writeAudit` 记录原因；非 PENDING 订单 CLOSE/FLAG→400；终态再处置→400
- [验收] vitest `order-disposition.spec.ts` | [Close] —

> 实现口径：不新增字段/schema 迁移（避开环境脆弱与死表后置），复用 `RechargeOrder`/`PackageOrder` 既有枚举落地——充值 `PENDING→FAILED`（标异常）/`PENDING→EXPIRED`（关单）/`PAID→REFUNDED`（冲正，经服务）；套餐 `PENDING|ACTIVE→CANCELLED`（关单/标异常，套餐无资金故 REVERSE→400）。UI `OrdersManager` 增「处置」列（`canWrite && type!=='LEDGER'` 才拼接；账本 Tab 无处置），REVERSE 走 `window.prompt` 强制原因、CLOSE/FLAG 走 `confirm`，成功 `reload()`。- [验收] ✅ 2026-10-12：`order-disposition.spec.ts` **12 passed**（GET 元口径/越界 400 不查库/守卫 403；package CLOSE→CANCELLED CAS+audit/REVERSE 400/终态 400/403；recharge CLOSE→EXPIRED/FLAG→FAILED/REVERSE→REFUNDED+元口径+audit/幂等命中无 audit/PAID CLOSE 400）；`pnpm --filter web typecheck` 0 错误；e2e `orders.spec.ts` **4 passed**（三 Tab+可写露「处置」列/账本 Tab 无处置列/GET package-orders 信封 code 0/清 Cookie 401，非侵入不改单）；`check-docs-facts` **14/14**（route 136→139） | [Close] ✅ S6.1

### L2: S6.2 充值冲正（REVERSAL 反向分录 + CAS + 幂等）
- 任务：`billingService.reverseRechargeOrder(orderId,{idempotencyKey})`：`$transaction` + `withOptimisticRetry` 内先 CAS `rechargeOrder` PAID→REFUNDED（`updateMany where status=PAID`），再对本金与赠送各写一条 `entryType=REVERSAL` 的 **DEBIT** 反向分录（原 TOPUP/GRANT 分录保留，账本只 INSERT 不可改删）；幂等键 `recharge-reverse:{id}:{key}`（赠送追加 `:bonus`，`createEntryIfAbsent` 命中 P2002→幂等）；DEBIT 经 `postEntryInTx` 余额守卫防扣成负。
- 前置条件：S6.1 | 交付物：`billing/service.ts` 新方法 + 单测
- 验收标准（含反例）：`reversedMinor = amount + bonus` 元口径回传；反例：直接改原分录或软删订单 → 禁止（只追加反向分录 + 状态机 CAS）；非 PAID→40000 零副作用；已 REFUNDED→幂等（`reversedMinor 0n` 不重复 CAS/分录）；余额不足以反向扣减→40001 且不写分录
- [验收] vitest `reverse.spec.ts` | [Close] —

> - [验收] ✅ 2026-10-12：`reverse.spec.ts` **5 passed**（① PAID 全额冲正 reversedMinor 12000n + 两条 DEBIT REVERSAL 分录 + CAS where status=PAID data=REFUNDED/② bonus=0 单分录/③ PENDING→40000 零副作用/④ REFUNDED→幂等 0n 无 CAS 无分录/⑤ 余额不足→40001 无分录）；资金编排全程仅经 `billingService`（路由不含 `ledgerEntry.create`） | [Close] ✅ S6.2（及 S6 整体）

### L1: S7 补 CRUD 孤岛 + 接入断链
- S7.1 `/admin/prices` + `/api/v1/admin/prices`（ModelPrice）；S7.2 Provider 面板 + 路由；S7.3 OIDC 客户端/API Key 管理；S7.4 公告/文档前台消费闭环；S7.5 ranking-weights 孤儿裁决。

> **权限域决策（勘探后）**：S7 不新增权限域——prices→`admin.models.{read,write}`（ModelPrice 隶属模型）、oidc/ranking-weights→`admin.configs.{read,write}`（与既有 configs 域同）。故 `seed-rbac` 无需重跑，规避 `db:seed` 破坏性陷阱；仅 `seed-navigation-menu.ts` 幂等追加 `adm_prices`/`adm_oidc` 入口（coverage 31/31）。

### L2: S7.1 模型定价 CRUD 孤岛激活
- 任务：`packages/shared/admin.schema.ts` 新增 `AdminPricesQuerySchema`/`AdminPricePatchSchema`/`AdminPriceCreateSchema`（Decimal 金额非负有限数，create 附 modelId/billingMode）；GET `/api/v1/admin/prices`（当前价 isCurrent=true + 模型/厂商投影，Decimal→string，q/modelId/limit≤200 筛选）；POST（为尚无当前价的模型新建，已有→400 请改用编辑）；PATCH `/api/v1/admin/prices/[id]`（编辑当前价，不动 isCurrent/modelId）；`PricesManager.tsx` + `/admin/prices` 页（服务端 `canWrite=admin.models.write` 下传）；写 `writeAudit` + `revalidatePath("/pricing")`。
- 前置条件：S3 | 交付物：shared 契约 + 2 路由 + 面板 + 页 + seed 入口 + 单测 + e2e
- 验收标准（含反例）：`@@unique([modelId,isCurrent])` 一模型一当前价，POST 命中已有→400；Decimal(19,6) 直传 JSON→禁止（须 `.toString()`）；反例：为已有当前价的模型重复建当前价 → 拒绝
- [验收] vitest `admin-prices.spec.ts` + e2e `admin/prices.spec.ts` | [Close] —

> 实现口径：ModelPrice 由爬虫/seed 写、前台 `/pricing` 消费，此前无后台面（真孤岛）。- [验收] ✅ 2026-10-12：`admin-prices.spec.ts` **8 passed**（GET 当前价投影 Decimal→string + where.isCurrent/limit 越界 400 不查库/守卫 403；POST 新建 sourceType=OFFICIAL+isCurrent+audit/模型不存在 400/已有当前价 400；PATCH 编辑+audit/记录不存在 400）；e2e `prices.spec.ts` **3 passed**（表头+可写露「操作」列/GET prices 信封 code 0/清 Cookie 401，非侵入不改价）；`check-docs-facts` **14/14**（route 139→143） | [Close] ✅ S7.1

### L2: S7.2 Provider 面板 + 路由
- 任务：勘探确认 `/admin/providers` 页与 `/api/v1/admin/providers` 路由已存在且可用（无孤岛）。- [验收] ✅ 2026-10-12：勘探 `Glob app/(admin)/admin/providers/**` 与 `app/api/v1/admin/providers/**` 均在（`page.tsx` + 路由），前台 `/providers` 消费已接；判定为已交付，本切片无需新增 | [Close] ✅ S7.2（已交付）

### L2: S7.3 OIDC 客户端管理
- 任务：GET `/api/v1/admin/oidc-clients`（列元数据，**绝不下发 clientSecretHash**，guard `admin.configs.read`）；PATCH `/api/v1/admin/oidc-clients/[id]`（编辑 name/redirectUris/logoutUri/scopes/isActive，`AdminOidcClientPatchSchema` 校验 URL，guard `admin.configs.write`，写 audit）；`OidcClientsManager.tsx` + `/admin/oidc-clients` 页（canWrite 下传）。
- 前置条件：S3 | 交付物：shared 契约 + 2 路由 + 面板 + 页 + seed 入口 + 单测 + e2e
- 验收标准（含反例）：secret 不经此面发放/回显（与 seed/env 安全设计一致），反例：GET 响应含 `clientSecretHash` 或提供 secret 生成入口 → 禁止；停用即时影响登录（`getActiveClient` 返 null）
- [验收] vitest `admin-oidc.spec.ts` + e2e `admin/oidc.spec.ts` | [Close] —

> - [验收] ✅ 2026-10-12：`admin-oidc.spec.ts` **5 passed**（GET createdAt→ISO 且投影无 clientSecretHash/守卫 403；PATCH 成功+audit/记录不存在 400/非法回调 URI 400）；e2e `oidc.spec.ts` **3 passed**（标题+可写露「操作」列/GET 无 clientSecretHash/清 Cookie 401）；`check-docs-facts` route 143（含 oidc 2 路由）、page 55 | [Close] ✅ S7.3

### L2: S7.4 公告前台消费闭环
- 任务：`lib/features/announcements/repository.ts`（`listActiveAnnouncements`：仅「已发布+启用+未删除+未过期」，DB 失败静默回落空数组；`pickBannerAnnouncement`）；`(site)/announcements/page.tsx`（force-dynamic 列表）；首页 `AnnouncementBanner`（首条有效公告横幅，无则不渲染，跟随首页 ISR）；页脚「资源」加 `/announcements` 入口。
- 前置条件：无（Announcement 模型/后台面板既存）| 交付物：读服务 + 前台页 + 首页横幅 + 页脚链接 + 单测
- 验收标准（含反例）：前台口径严格过滤未发布/停用/过期（反例：草稿或过期公告泄露到前台 → 禁止）；DB 挂时前台不白屏（回落空态）
- [验收] vitest `announcements/read.spec.ts` | [Close] —

> 实现口径：不新增前台实时端点（避扩大公网面），首页横幅复用首页 `revalidate=300`（至多 5 分钟延迟，非关键）；`/announcements` force-dynamic 保证即时。- [验收] ✅ 2026-10-12：`announcements/read.spec.ts` **6 passed**（isStillActive null/未来/过去；映射 date 取 publishedAt??createdAt；where 过滤 isPublished/isActive/deletedAt null/OR；DB 失败回落空）；`lib/features` 目录 17→18 同步 `check-docs-facts` | [Close] ✅ S7.4

### L2: S7.5 ranking-weights 孤儿裁决
- 任务：`RankingWeightsEditor.tsx` 复用既有 `/api/v1/admin/ranking-weights`（GET/PUT，域 configs）；折叠进 `/admin/configs` 「不常用配置」区（configs 页转 async 算 `canWriteConfigs`）；行内改权重 0-100 + 启用态，逐维度 PUT 保存（后端 revalidate /models+/ladder）。
- 前置条件：S3 | 交付物：编辑器组件 + configs 页接入
- 验收标准（含反例）：表被 `ranking/repository.listActiveWeights` 消费（非死表）且 API 完整但无 UI（UI 孤岛）→ 激活；反例：新引权限域/入口 → 禁止（复用 configs 域）
- [验收] `typecheck`/`lint` 无新错 + `@aidean/ui` refs 同步 | [Close] —

> - [验收] ✅ 2026-10-12：`RankingWeightsEditor.tsx`（13 维中文标签/权重/启停，保存逐维度 PUT）；`configs/page.tsx` 转 async + 下传 `canWriteConfigs=admin.configs.write`；`@aidean/ui` refs 55→58（+PricesManager/OidcClientsManager/RankingWeightsEditor）同步 `check-docs-facts` **14/14** | [Close] ✅ S7.5（及 S7 整体）

### L1: S8 报表、集成、性能、可观测、文档
- S8.1 `/admin` 二维图报表（EChartWrapper + `admin/reports` 聚合 API）；S8.2 移动端响应式抽屉；S8.3 网关模拟器/待处理任务接真实端点；S8.4 批量串行改并行/缓存；S8.5 死表逐个裁决；S8.6 文档治理同步（铁律 2/3/6）+ `check-docs-facts.mjs` 页数/路由数对齐。

### L2: S8.1 运营报表（二维图，只读聚合）
- 任务：`packages/shared/src/schemas/reports.schema.ts`（`AdminReportsQuerySchema` days 7-90 缺省 30 + 四 view 接口）；`lib/admin/reports-core.ts`（`buildReportView` 纯函数：零填充/分桶/`fenToYuan`）；`lib/admin/reports-chart-option.ts`（趋势双轴 + 模型排行 option）；`api/v1/admin/reports/overview/route.ts`（`Promise.all` 四路 groupBy 读 `usage_daily_stats`+PAID 单）；`components/admin/ReportsBoard.tsx`（swr + `EChartWrapper` dynamic ssr:false）接入 `(admin)/admin/page.tsx`。
- 前置条件：S5（logs 域既存）| 交付物：契约 + 纯函数 + API + 看板 + 单测 + e2e
- 验收标准（含反例）：只读 `usage_daily_stats`、**禁扫 `usage_logs` 明细**（反例：直接 `usageLog.groupBy` 扫大表 → 禁止）；days 越界 400；未登录 401；跨域概览走 `requireAdminApi()` 入场总闸（不落具体域/不新增域）。
- [验收] vitest `lib/admin/__tests__/reports.spec.ts` + e2e `admin/reports.spec.ts` | [Close] —

> - [验收] ✅ 2026-10-12：`reports.spec.ts` **5 passed**（零填充 7 点/充值归并 75000 分="750.00"/越界防御跳过/趋势 3 序列对齐/排行反转）；e2e `reports.spec.ts` 4 测（看板露出/overview days=30 code0 & daily.length=30 / days=3→400 / 无 Cookie→401）| [Close] ✅ S8.1（2026-10-12 build exit 0 + 全量 admin e2e **52 passed/0 failed/20 skipped**，新 4 测均绿）

### L2: S8.2 移动端响应式抽屉
- 任务：`components/admin/AdminMobileNav.tsx`（`md:hidden` 汉堡 + 遮罩抽屉，内嵌 `AdminSidebar forceExpanded`）；`layout.tsx` 桌面侧栏 `hidden md:block` + header 插入抽屉；`AdminSidebar.tsx` 新增 `forceExpanded` prop。
- 前置条件：S2（AdminSidebar 既存）| 交付物：抽屉组件 + layout/侧栏改造 + e2e
- 验收标准（含反例）：移动视口（<768）汉堡可开合、点条目导航后自动收起；反例：重构 RSC 布局致桌面回归 → 禁止（仅靠 CSS 断点隔离）。
- [验收] e2e `admin/mobile-nav.spec.ts`（viewport 390×844）| [Close] —

> - [验收] ✅ 2026-10-12：`mobile-nav.spec.ts` 2 测（汉堡可见+桌面侧栏 hidden；点开合 `data-open=1`、点条目跳 `/admin/users` 后 `data-open=0`）；typecheck/lint 无新错 | [Close] ✅ S8.2（2026-10-12 admin e2e 全量 52 passed/0 failed，新 2 测绿，桌面侧栏零回归）

### L2: S8.3 网关模拟器/待处理任务接真实端点
- 勘探结论：`CallPlayground`（898 行）**已接真实端点** `/api/v1/models` + `/api/v1/gateway/chat`；`RechargePanel` mock-pay 为 dev 专用（生产走真实支付）；无硬编码待处理任务列表。**判定：已交付，本切片无代码变更**。
- [验收] 勘探取证 | [Close] ✅ S8.3（已交付）

### L2: S8.4 批量串行改并行 + 分页封顶
- 任务：`providers/batch/route.ts` 逐条 `for-await writeAudit` → `Promise.all` 并发（业务结果不变，仅降时延）；`capabilities`/`protocols`/`discovery/candidates` route GET 的 `pageSize` 经 `Math.min(100, Math.max(1, …))` 封顶。
- 前置条件：S5（logs 分页范式）| 交付物：批量路由 + 三读侧封顶
- 验收标准（含反例）：批量审计并发落库不丢条目；反例：超大 `take` 扫全表 → 禁止（`Math.min` 封顶）。
- [验收] typecheck/lint 无新错 + vitest 全量绿 | [Close] —

> - [验收] ✅ 2026-10-12：providers/batch 改 `Promise.all`（action 1/2/3 审计并发）；capabilities/protocols/discovery 三处 `pageSize` `Math.min(100)`；batch 路由数 15 同步 `check-docs-facts` | [Close] ✅ S8.4

### L2: S8.5 死表逐个裁决
- 任务：对 7 张疑死表 grep 反查运行时消费者 → 逐表裁决记录于《数据库文档》§九。
- 验收标准（含反例）：反例：夹带删表迁移 → 禁止（与重构正交，另立 change-id 走 ADR）。
- [Close] ✅ S8.5（2026-10-12：实测 `navigation_menus` S2 已激活；`favorites`/`feedback`(+`feedback_comments`)/`user_notifications`/`feature_flags`/`ladder_charts`/`ladder_rankings` 运行时零消费，保留 schema 不迁移，已写《数据库文档》§九）

### L2: S8.6 文档治理同步（铁律 2/3/6）
- 任务：《API接口文档》§5.8.6 逐端点登记 S2-S8 admin 端点 + reports/overview（v1.46）；《API架构设计方案》§7.9 `restructure-admin-architecture` 双向锚（v1.12）；《数据库文档》§九 死表裁决 + §二 RBAC 四表与 68/37 口径（v2.10）；《目录结构文档》§十一 重构增量（v3.12）；《功能设计文档》§3.5 口径锚 35 域/31 页（v0.8.5）。
- 验收标准（含反例）：`check-docs-facts` 14/14 + `check-docs-rule` PASS（含跨 S2-S7 累积口径债偿还）；反例：锚悬空/版本缺标 → 禁止。
- [验收] `node scripts/check-docs-facts.mjs` + `node scripts/check-docs-rule.mjs` | [Close] —

> - [验收] ✅ 2026-10-12：`check-docs-facts` **14/14**（route 143→144、@aidean/ui 58→59、spec 143→146）；`check-docs-rule` 由 FAIL→**PASS**（§二 64→68 model/36→37 enum、§3.5 27→35 域/26→31 页，实为 S3 RBAC 四表 + S2-S7 新增页/域未回写的累积债）；双向锚 `restructure-admin-api`↔`restructure-admin-architecture` 闭合 | [Close] ✅ S8.6

---

## 并行/串行调度（供多执行器）

| 波次 | 可并行 | 串行 |
|---|---|---|
| 1 | S1（单文件）；S3.1-3.2 契约与 schema 准备；S5.1-5.2 日志只读；S8.1 图表 | — |
| 2 | S2（菜单，迁移1）；S6.1 只读 | S3.1→S3.3（迁移/守卫，独占 schema 与 session.ts） |
| 3 | S4（CMS）；S3.4-3.5；S2.5 | S6.2 写接口 |
| 4 | S7；S8 | S0/S1→S2 依赖链 |

> 独占所有权热点（禁止并发改）：`schema.prisma`（S2.1/S3.1 串行）、`session.ts`（S3.3）、`AdminSidebar.tsx`（S1/S2.4）、`packages/shared`（各自域独立文件）。

## 执行期风险登记（Top）

1. RBAC 迁移致管理员失权锁死（中/极高）→ 保留 SUPER_ADMIN 通配绕过 + 迁移断言 + e2e。
2. 逐路由声明权限码引入回归 403（中/高）→ gate regression 矩阵比对。
3. 菜单库驱动后缺库白屏（中/中）→ 默认回退树。
4. 并发写 `schema.prisma` 冲突（高/中）→ 迁移串行 + 独占。
5. 泄露凭据入库（低/极高）→ 提交前 diff grep 门禁。
