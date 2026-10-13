# 管理端信息架构收尾与运营盲区补齐 Spec

> change-id: `finalize-admin-ia-and-ops-gaps` | 语言: 中文 | 版本: v1.0 | 创建: 2026-10-13 | 更新: 2026-10-13
> 书写总规范见 [docs/governance/开发流程.md](../../governance/开发流程.md)；铁律见根 [AGENTS.md](../../../AGENTS.md)。
> 本文件是「集大成者」规划产物（默认只读，不改业务代码；仅落规划文档）。对应交付格式 §10 第 1–5、12 节。

---

## §1 规划快照（snapshot）

```yaml
snapshot:
  规划日期: 2026-10-13
  git_branch: huaweicloud
  git_commit: a1fc5c05          # S1-S8 + UI 轨道，已 push，双端一致
  工作区是否干净: true           # git status --porcelain 行数 = 0
  与远端: origin/huaweicloud 同步（rev-list 0/0）
  前序里程碑: restructure-admin-nav-rbac-cms（S1-S8 已 CLOSED 并 push）
  代码事实基线（当前真实代码，非文档）:
    - apps/web/lib/admin-navigation-core.ts（buildAdminNav 严格两级；DEFAULT_ADMIN_NAV 26 叶滞后）
    - apps/web/prisma/seed-navigation-menu.ts（3 组 30 叶 + 概览 = 31 入口；注释仍写"26"过时）
    - apps/web/components/admin/AdminSidebar.tsx（两级渲染：组→叶 + 概览独立置顶）
    - app/api/v1/admin/* 共 35 个路由域（reports/logs/menus/roles/oidc-clients/prices 等均已存在）
  需求文档清单:
    - 本 pasted-text「任务分配与完整规划指令」（§1-§13 + 深度分析方法）
    - docs/specs/restructure-admin-nav-rbac-cms/spec.md（前序 S1-S8 规格，已关闭）
    - docs/plans/未完成事项目录.md（巨型台账 v2.35，超 3000 行需按铁律6拆分——见风险 R-7）
  测试命令: pnpm --filter web exec tsc --noEmit; pnpm --filter web vitest run; node scripts/check-docs-facts.mjs; pnpm exec playwright test（admin 全量 52 passed 基线）
```

---

## §2 事实基线（含文档与代码不一致清单）

### 2.1 已确认事实（有当前代码证据）

| 事实 | 证据（文件:行） |
|---|---|
| 侧栏建树只支持「组(level1)+叶(level2)」两级，无第三级 | `admin-navigation-core.ts:45-52`（`filter(level===1 && isDropdown)` → `leaves: filter(level===2 && parentCode)`） |
| `AdminSidebar` 严格两级渲染，概览独立置顶 | `AdminSidebar.tsx:161-236`（`nav.groups.map` → 组头 + `open && 叶列表`），`128-160`（overview 单独块） |
| 出厂默认仍是 3 组旧分类学（运营/数据/财务） | `seed-navigation-menu.ts:33-85`（`GROUPS` = ops/data/finance） |
| 报表后端+前端已存在且挂在 `/admin` 首页，无独立报表页 | `app/api/v1/admin/reports/*` 存在；`admin/page.tsx` 引入 `ReportsBoard`（参考1 grep 实证） |
| 日志中心 `/admin/logs` 已存在（审计/网关/同步/脚本/安全 5 tab） | `app/api/v1/admin/logs/*`；`seed:65` `adm_logs → /admin/logs` |
| `DEFAULT_ADMIN_NAV` 兜底树缺 5 叶 | `admin-navigation-core.ts:84-128`（缺 prices/logs/oidc/menus/roles，对比 seed 31 入口） |
| 用户密钥/渠道/站点用户密钥无 admin 视图 | 35 个 admin 路由域无 `api-keys`/`custom-channels`/`station-user-keys`；grep `prisma.(apiKey|customChannel|stationUserKey)` 在 admin 下 0 命中 |
| 在途冻结款 BalanceHold 无 admin 视图 | 35 域无 `holds`；grep `balanceHold` 在 app/api + lib 0 命中（billing 内部有，但无 admin 列表端点） |
| OrdersManager 残留原生弹窗 | `OrdersManager.tsx:91/95/97`（`window.prompt`/`window.confirm` ×3） |

### 2.2 仅来自参考文档、已用代码复核的结论

- 参考1「S1-S8 已完成约九成」→ 复核属实（`restructure-admin-nav-rbac-cms` 已 CLOSED 并 push）。
- 参考1 G4（`lib/features/news/static-articles.ts` 与 DB 文章合并、NewsManager 管不到）→ **属实**，S7 处理。
- 参考1 G5（PartnerMarquee 硬编码 12 虚构名 + 关于正文静态）→ **属实**，`about/page.tsx` 仅 `contactEmail/wechatQrUrl` 走 SystemConfig、正文硬编码（本会话已读）。
- 参考1 G7（部分页无 RSC 级 `hasPermission` 重定向、权限域无独立 oidc/prices 码、30 页 vs 31 锚 vs 29 叶数字漂移）→ **部分属实**，S9 处理（金额可见性已由 B2 裁决加限制；独立权限码 oidc/prices 属 B5 NON_BLOCKING 本轮不动）。

### 2.3 文档与代码不一致清单（逐条，以代码为准）

| # | 不一致 | 真相（代码） | 处置 |
|---|---|---|---|
| D-1 | `seed-navigation-menu.ts:3,87` 注释「26 个功能入口」 | 实际 `EXPECTED_HREFS` = 1 概览 + 30 叶 = **31** | S3 同步注释与 `EXPECTED_HREFS.length` |
| D-2 | `admin-navigation-core.ts:83` 注释「与既有 26 入口对齐」 | 同上，应为 31 | S3 修 `DEFAULT_ADMIN_NAV` 补 5 叶时一并 |
| D-3 | §11 落盘模板路径（`docs/03_solution`/`docs/04_planning`/`docs/05_execution`/`packages/contracts`/`database/migrations/001_init.sql`） | 本仓均不存在；真实约定 `docs/specs/<change-id>/`（`_template` 起步）+ `docs/ADR` + `apps/web/prisma/migrations` | 已由用户裁决方案 A：产物落 `docs/specs/<change-id>/`（本目录） |
| D-4 | 参考3（AideanFleet 仓库分析） | 属**错误仓库**，与本仓无关 | **弃用**（糟粕） |
| D-5 | 参考1「78 admin route.ts」「49 页面」口径 | **S9 实测**：admin 路由 98 文件 / 36 路由目录域 / 32 后台页（`/admin` 概览 + 31 导航叶）；权限 `ADMIN_DOMAINS` 30 域×{read,write}=60 原子 | **以代码为准**（S9 收口；四处锚文档已同步实数） |

---

## §3 需求基线复核

### 3.1 复述与拆解

核心问题：管理端 `/admin` **能力已基本齐备**（30 页 / 35 路由域 / 接口级 RBAC / CMS / 报表 / 日志中心 / 财务处置），但**默认信息架构仍是 3 组旧分类学**，与用户想要的「按业务板块、至少 3 级、可展开」的导航心智错位；同时存在若干运营真实盲区（用户密钥/渠道、在途冻结款）与一致性缺口（静态资讯归属、跑马灯/关于正文、原生弹窗、RSC 守卫/权限码口径）。目标 = 把「能力」变成「开箱默认 + 补齐盲区」，而非重建已上线之物。

- 用户：终端订阅者（前台）；管理端：运营/审核/财务/超管（分角色）。
- 系统边界：`apps/web`（Next.js 15 App Router）+ PostgreSQL 16 + Redis + Prisma（铁律5 技术栈锁定，本规划不偏离）。

关键词：板块化、≥3 级、最小原子化、开箱默认、运营盲区、契约冻结、并行可执行。

### 3.2 MUST / SHOULD / COULD / MUST NOT

| 级别 | 条目 | 可验证改写 |
|---|---|---|
| MUST | M1 导航引擎支持 ≥3 级（板块→分组→叶） | 新建一棵 3 层 `NavigationMenu` 树，`buildAdminNav` 输出 3 层结构，侧栏正确渲染并可逐级展开 |
| MUST | M2 出厂默认切换为 7 大板块 | 全新库 seed 后开箱侧栏 = 7 板块（+ 概览独立），30 叶零丢失 |
| MUST | M3 不覆盖管理员已做的手工编排 | 对已自定义的库重跑 seed，检测非出厂集合即跳过并提示 |
| MUST | M4 `DEFAULT_ADMIN_NAV` 与 seed 一致（补 5 叶） | 缺库/空表兜底树 = 31 入口，与 seed `EXPECTED_HREFS` 全等 |
| MUST | M5 用户密钥/渠道 admin 只读视图 + 吊销（脱敏） | 存在 `GET/POST` 端点返回尾号/状态且绝不明文回显密钥值，越权返回 403 |
| MUST | M6 在途冻结款 BalanceHold admin 分页只读视图 | 存在按 `status+createdAt` 分页的列表端点，不全表扫 |
| MUST NOT | MN1 重建已上线的报表/日志/角色/菜单/OIDC/定价 | 不新增这些能力的重复实现 |
| MUST NOT | MN2 激活 6 张死表（Favorite/Feedback(+Comment)/UserNotification/FeatureFlag/LadderChart/LadderRanking） | 保留 schema、不迁移不删表（已有正式裁决，数据库文档 §九） |
| MUST NOT | MN3 把前台 SITE 导航纳入 `/admin/menus` 管理 | 菜单管理仅 scope=ADMIN |
| SHOULD | S1a OrdersManager 原生弹窗归一到 ConfirmDialog/message | 3 处 `window.*` 移除，改为项目内对话框 |
| SHOULD | S1b 新页面补 RSC 级 `hasPermission` 守卫（menus/logs） | 无权限直接重定向而非空态 |
| COULD | C1 静态资讯归属、跑马灯/关于正文 CMS 化（见 BLOCKING B3/B4） | 裁决后再排期 |

### 3.3 冲突清单

| 冲突 | 说明 | 需裁决 |
|---|---|---|
| 报表板块独立性 | 用户原话要「数据报表」独立板块，前序 spec #7 设计为「报表首页 = /admin 升级」 | ✅ 已裁决：两者兼得（S2r 新建 + 概览保留精简） |
| ≥3 级 vs 现两级 | 用户要「至少 3 级」，现引擎两级封顶 → M1 需改纯函数+类型+侧栏 | 已纳入 S1，非阻塞 |
| seed 幂等覆盖 | 直接重跑会覆盖手工编排 → M3 用「不覆盖检测」规避 | 已纳入 S2 |
| 复用权限码 vs 独立码 | oidc/prices 现复用码；若要独立需扩 ADMIN_DOMAINS | B5 NON_BLOCKING（本轮不动） |
| MODERATOR 收入可见性 | `reports/overview` 裸 `requireAdminApi()`，全域可读 | ✅ 已裁决：加限制（S9 新码 `admin.reports.read`） |

### 3.4 决策记录（B1–B4 已由用户于 2026-10-13 裁决，解除 BLOCKING）

> 原 BLOCKING 未知项已全部落定，对应 S1a/S7/S8/S9 可展开至 L4 下发实现。

- **B1（已裁决＝融合方案）报表形态**：`/admin` 首页保留精简全局概况（4 张 KPI 卡）+ **新建 `/admin/reports` 独立专属页**承载完整报表（趋势双轴图 / 模型 Top / 7-90 天切换 / 未来导出与多维扩展）。侧栏「数据报表」板块主入口指向 `/admin/reports`；`ReportsBoard` 抽出为可复用组件，概览与专属页共用。（→ 新增切片 S1a）
- **B2（已裁决＝加限制）MODERATOR 收入可见性**：新增权限码 `admin.reports.read`；`reports/overview` 端点由裸 `requireAdminApi()` 改为 `requireAdminApi("admin.reports.read")`；SUPER_ADMIN 通配自然持有，MODERATOR/SUPPORT 不分配此码 → 看不到收入金额聚合。概览/专属页对无此码角色隐藏收入卡。（→ S9）
- **B3（已裁决＝迁入 DB）5 篇官方资讯**：写迁移脚本把 `lib/features/news/static-articles.ts` 5 篇插入 `NewsItem`（`category="官方公告"`、`status=PUBLISHED`、`publishedAt` 取原文时间）。**零 schema 迁移**（`NewsItem.category` 字段已存在，无 isOfficial 也能用类别区分）。NewsManager 现成可按 category 管理；清理前端静态与 DB 合并逻辑。（→ S7）
- **B4（已裁决＝CMS 化）跑马灯/关于正文**：`SystemConfig` 新增两键——`partners.marquee`（`configType=JSON`，值 `[{name,url?,logoUrl?}]`）承载合作方名单，现虚构名单作初始 seed、运营后台可替换；`about.body`（`configType=RICH_TEXT`）承载关于页长文，`AboutSection.tsx` 改读此键。站点配置页加两个编辑器（复用现成编辑器模式）。**零 schema 迁移**。（→ S8）
- **B5（NON_BLOCKING）独立权限码扩域**
  - 假设：本轮沿用复用码（不改 `ADMIN_DOMAINS`），仅在 D-1/D-2 注释与口径锚对齐。依据：改注册表牵动 RBAC 快照与 e2e。若后续要独立管控 oidc/prices 再立 change-id。
- **N-1（NON_BLOCKING）BalanceHold 数据量/性能**
  - 假设：按 `status+createdAt` 建索引分页可接受。执行时实测慢查询再调。
- **N-2（NON_BLOCKING）数字口径锚（30 页/31 锚/29 叶）**
  - 假设：以代码为准统一到「概览 + 29 叶 + N 内嵌」并更新锚文档，不改功能。
  - **S9 收口实况**：实测为「`/admin` 概览 + 31 导航叶 = 32 后台页」（S2r 增 `/admin/reports` 专属页，较规划期 29 叶多 2）；权限域经 S9 新增 `reports` 后为 30 域×60 原子。四处锚（功能 §3.5 / API接口文档 §5.8.6 / API架构设计方案 §7.9 / 目录结构文档 §十一）已按实数同步；`check-docs-facts` 断言不含权限域数/导航叶数/admin 页数细分，故 prose 计数变更不动门禁。

### 3.5 隐含要求与前置条件

- 隐含：三级导航需同步 `filterNavByPerms`（按板块/分组/叶三级剪枝）、`groupIndexForPath`（深链自动展开到第三级）、localStorage `OPEN_GROUPS_KEY` 结构兼容（旧存档不得崩）。
- 隐含：M5/M6 新端点必须走 `requireAdminApi(permission)` 强制层，且写操作（吊销/释放）落 `AuditLog`。
- 前置：M1（引擎三级）先于 M2（板块化默认树）；契约冻结先于并行下发；每片全绿才推、推送前单独报备（记忆红线）。
- 边界：本地仅端口 3000（AideanThesis 3400 不可动）；绝不用/泄露 pasted-text 中的明文 PAT（该值与本规划无关，建议用户撤销轮换）；SSH 别名 `git@github-aideanew` 推送，无 PAT、无交互。

---

## §4 契约冻结包（六份，唯一源）

> 唯一源原则（§4.2）：本仓契约以 **TypeScript 类型 + zod schema（`packages/shared` / `apps/web/lib`）** 为机器可校验真源；OpenAPI 由路由注记派生。禁止另立自然语言契约源。下列六份为「剩余任务」增量契约，存量契约不重述（引用前序 spec）。

### ① API（增量端点）
```
GET  /api/v1/admin/users/[id]/credentials
     auth: requireAdminApi("admin.users.read")
     res200: { apiKeys:[{id,masked:"sk-…1234",status,lastUsedAt|null}],
               stationKeys:[{id,stationName,masked,status}],
               channels:[{id,name,provider,enabled}] }   // 绝不含明文密钥值
     page: 无（一用户一聚合）
POST /api/v1/admin/users/[id]/credentials/revoke
     body: { kind:"apiKey"|"stationKey"|"channel", id:string, reason:string }
     auth: requireAdminApi("admin.users.write"); 幂等: 状态机（已吊销→409）
     side-effect: 写 AuditLog(action="admin.credential.revoke")
GET  /api/v1/admin/holds
     query: { page, pageSize, status?, userId?, from?, to? }
     auth: requireAdminApi("admin.wallets.read")
     res200: { items:[{id,userId,amountMinor,currency,status,createdAt,expiresAt?}], total, page }
     index: BalanceHold(status,createdAt)  // 见 §5
```
- 分页格式统一：`{ items[], total, page, pageSize }`；金额一律 `amountMinor`（整数分）+ `currency`；时间 ISO8601 UTC。

### ② Errors（复用既有错误体）
```
统一体：{ error: { code: string, message: string } }
沿用现码：401 UNAUTHENTICATED / 403 FORBIDDEN(越权) / 404 NOT_FOUND /
409 CONFLICT(幂等) / 422 VALIDATION / 429 RATE_LIMITED
新增码：CREDENTIAL_NOT_REVOCABLE(已吊销再吊销)  映射 409
前端展示：admin 客户端统一走 ConfirmDialog / message（禁 window.*，S1a）
```

### ③ Identity（角色与边界）
```
用户ID：cuid string。角色枚举（B2 已存在）：SUPER_ADMIN(通配 *)、MODERATOR(全域读+部分写)、
SUPPORT、FINANCE 等（见 Role 表）。Session：NextAuth/JWT，isStaff 入场总闸。
边界：requireAdminApi() 无参 = isStaff；有参 = 逐接口强制（AND 语义，与 filterNavByPerms 对齐）。
禁止越权：credentials/holds 读端点必须带 permission 参数；跨用户 credentials 一律 403（单测覆盖）。
B2 已裁决：MODERATOR/SUPPORT 不可读 reports 金额聚合（`admin.reports.read` 门控，见 §3.4 B2 / S9.1）。
```

### ④ Resources
```
本规划无新增文件/图片上传。复用既有：图片走 /public 与 CMS 配置项 URL 字段。
关于正文/跑马灯若 CMS 化（B4）：SystemConfig 键 partners.marquee(string[] JSON)、about.body(string)；
访问控制沿用 SystemConfig admin 读写域，无新生命周期。
```

### ⑤ Events
```
本规划无新增异步事件。既有：revalidateTag（菜单/配置保存后侧栏缓存失效，S2）沿用。
吊销/释放动作走同步 AuditLog，不引入消息总线。
```

### ⑥ UX States（三级导航 + 新视图）
```
板块(section)→分组(group)→叶(leaf) 三级：
  空态：板块内无可见叶→隐藏板块（filterNavByPerms）；全部隐藏→"无授权入口"提示
  加载态：菜单取数失败→回退 DEFAULT_ADMIN_NAV（补全后 31 入口）
  错误态：seed 检测到已自定义→跳过覆盖并在菜单页提示"点应用推荐分组"
  无权限态：直访越权 admin 页→RSC 重定向（S1b）
  成功态：保存后 localStorage 展开态与新层级兼容不丢失
credentials/holds 视图：空列表/加载骨架/错误(脱敏)/无权限/成功，均对齐现 admin 列表组件口径
```

### 4.4 契约自检
- [x] 前端可只凭 §4 写调用层（响应字段枚举完毕）。
- [x] 后端可只凭 §4 实现（auth/page/side-effect 明确）。
- **数据端凭 §5 定表/索引（本轮几乎无新索引：`BalanceHold` 已有 `@@index([status, expiresAt])`，holds 查询可直接走）。**
- [x] 错误码覆盖吊销幂等 + 越权。
- [x] 管理端越权路径在 Identity③ 显式禁止（403 + 单测）。
- **B1–B4 已裁决**：对应端点/页面（/admin/reports、credentials、holds、资讯/跑马灯/关于 CMS）可展开 L4 进入实现（见 tasks.md S1a/S7/S8/S9）。

---

## §5 数据模型基线

> 结论（2026-10-13 裁决 + 代码核实后）：本轮**预计零 schema 迁移**——能力多已建表，导航/资讯/配置均为数据变更（seed/脚本）。唯一潜在迁移＝credentials 按 userId 聚合若实测慢才加索引（N-1）。

- 核心实体（已存在）：`NavigationMenu`（scope=ADMIN，`parentCode`/`level`/`sortOrder`/`requiredPermissions`）、`ApiKey`、`StationUserKey`、`CustomChannel`、`BalanceHold`、`SystemConfig`、`NewsItem`、`Role/Permission/RolePermission/UserRoleAssignment`。
- 三级导航落库：`NavigationMenu` 用 `level∈{1,2,3}` + `parentCode` 自引用即可表达「板块(1)→分组(2)→叶(3)」，无需改 schema（现有字段足够；改的是 `buildAdminNav` 读取逻辑）。
- holds 分页：`BalanceHold` 已有 `@@index([status, expiresAt])`，若按 `status+createdAt` 查询仍走此索引可接受则**不新建**；否则补 `@@index([status, createdAt])`（唯一潜在迁移候补）。
- credentials 聚合：`ApiKey/StationUserKey/CustomChannel` 三表**均无 userId 索引**（已核）；PG 不自动索引外键列。实施时 EXPLAIN 确认；若单用户聚合慢则加 `@@index([userId])`（潜在迁移，归 S4/N-1）。
- 配置键（B4）：`SystemConfig` 新增行 `partners.marquee`（JSON）/ `about.body`（RICH_TEXT），**数据层**，无 schema 变更。
- 资讯迁库（B3）：写 `NewsItem` 行（category="官方公告"），**数据层**，无 schema 变更。
- 权限码（B2）：`admin.reports.read` 写 Permission 表 + 分配给 SUPER_ADMIN（seed/注册表代码），**数据层**，无 schema 变更。
- 迁移版本号编排：若 S4/S5 实测触发加索引 → 合并为**单一**迁移 `2026xxxx_admin_ops_indexes`；导航/资讯/配置/权限均走 seed 脚本非迁移。**同一 change-id 内迁移串行、版本号唯一；不同切片不共用版本号。**

---

## §6 垂直切片清单（排序与理由）

| 切片 | 名称 | 可演示行为 | 依赖 | 并行性 |
|---|---|---|---|---|
| S0 | 基线冻结与留证 | 跑通门禁基线（tsc/vitest/docs-facts/e2e） | 无 | 串行首刀（步行骨架） |
| S1 | 导航引擎三级化 | 侧栏渲染板块→分组→叶三级并逐级展开 | S0 | 串行（M1 前置于 M2） |
| S2 | 7 大板块默认树 + 安全切换 | 新库开箱 7 板块；旧库自定义不被覆盖 | S1, S2r | 串行 |
| S2r | 报表独立页 `/admin/reports`（B1） | 侧栏数据报表板块 → 专属报表页；概览保留精简 KPI | S0 | 可与 S1 并行（不同文件） |
| S3 | DEFAULT_ADMIN_NAV 兜底补全 + 注释对齐 | 缺库回退 = 31 入口；注释=实数 | S1 | 可与 S2 并行（不同文件） |
| S4 | 用户密钥/渠道只读视图 + 吊销 | admin 查看脱敏密钥并吊销（审计） | S0,§4 | 可与 S1/S2 并行（无共享可变状态） |
| S5 | 在途冻结款只读分页视图 | admin 按状态分页看 holds | S0,§5 索引 | 可与 S4 并行 |
| S6 | OrdersManager 弹窗归一（S1a） | 3 处原生弹窗换成对话框 | S0 | 可与任意并行（单文件独占） |
| S7 | 静态资讯迁入 DB（B3 已裁决） | 5 篇官方文章入 NewsItem，NewsManager 可编 | S0,§5 | 可与 S4/S5/S6 并行（新文件） |
| S8 | 跑马灯/关于正文 CMS（B4 已裁决） | 后台可配名单与关于正文 | S0,§5 | 可与 S4/S5/S6 并行（新文件） |
| S9 | RSC 守卫 + 报表权限码（B2 已裁决） | 越权重定向；MODERATOR 不含 reports 码看不到金额 | S0 | 部分可并行（reports API 文件需与 S2r 协调） |

- 第一刀 = S0（步行骨架：先冻结基线留证，确保后续每刀可比对）。
- 关键路径：S0 → S1 → S2（板块化主诉求）；S2r 为 S2 的叶前置（数据报表板块指向 /admin/reports）；S4/S5/S6/S7/S8 为可并行的独立盲区/内容刀。
- 环检测：无环（S3 依赖 S1 与 S2 依赖 S1 均为单前驱）。

---

## §12 风险清单 / 待裁决（汇总指针）

- B1–B4 **已于 2026-10-13 全部裁决**（见 §3.4 决策记录）；无遗留 BLOCKING。唯余 NON_BLOCKING 假设 B5/N-1/N-2（带依据推进）。
- 风险 R-1：改 `buildAdminNav` 三级化会牵动 `filterNavByPerms`/`groupIndexForPath`/侧栏/localStorage 兼容——须回归现 e2e（admin 52 passed）不破。
- 风险 R-2：seed「不覆盖检测」逻辑若判定失误，可能覆盖管理员手工编排（G1 明令规避）——必须双向测（全新库覆盖 / 自定义库跳过）。
- 风险 R-3：credentials 脱敏若漏字段会泄露密钥明文——单测强制断言无明文键。
- 风险 R-4：`BalanceHold` 无索引全表扫在大表下慢——§5 索引先行 + 实测。
- 风险 R-5：pasted-text 内含明文 PAT（真实凭据）——与规划无关，但须提醒用户撤销轮换，本仓绝不写入/引用其值。
- 风险 R-6：并行下发时多 CLI 同改 `admin-navigation-core.ts`/侧栏 会冲突——见 tasks.md 所有权矩阵，S1/S2/S3 同文件域必须串行。
- 风险 R-7：`docs/plans/未完成事项目录.md` 超 3000 行（铁律6 触发拆分）——CLOSE 阶段处理，不阻塞开发。
- 风险 R-8：本规划为静态核查，未运行系统；性能类断言（N-1/R-4）需实施期实测，勿当既成事实。
