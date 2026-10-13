# Tasks · 管理端信息架构收尾与运营盲区补齐（原子化任务书）

> change-id: `finalize-admin-ia-and-ops-gaps` | 版本: v1.0 | 创建: 2026-10-13
> 层级图例（L1→L4）与合规规则见 [_template/tasks.md](../_template/tasks.md)。
> 本文件对应交付格式 §10 第 6–11 节。契约真源见 [spec.md](./spec.md) §4-§5。**未过 BLOCKING（B1–B4）的切片只写到 L2，不下发实现。**

---

## 层级图例（沿用仓内约定 + 三扩展字段）

| 级 | 载体 | 职责 |
|---|---|---|
| L1 切片/轨道 | `## S-N …` | 声明目标、前置、交付物、并行性 |
| L2 任务 | `### Task N.M` | 可独立验收的功能面 |
| L3 原子任务 | `#### SubTask N.M.K` | 最小可独立验证单元；字段完备即合法 |
| L4 字段 | `- 【字段】:` | 目标/范围/验收/验证命令/产出/依赖 + **档位/规模/允许修改**（映射 §6.2 十六必填） |

**§6.2 十六字段 → 本仓字段映射**：归属=L1/L2 层级；来源需求=§3.2 编号（M1…）；目标=【目标】；输入(契约/文档)=【范围】+【依赖】；输出=【产出】；Execution Steps=【范围】内有序动作；验收=【验收】；验证命令=【验证命令】；证据=`docs/specs/<change-id>/evidence/`（CLOSE 归档）；允许/禁止修改=【允许修改】+ 全局禁改冻结契约；依赖阻塞=【依赖】+【并行性】；档位=【档位】；升级条件=每 L1「升级触发」；规模=【规模】。
**复选框规则**：L3 完成勾自身；L2 勾=其全部 L3 完成且 checklist 对应点通过。**合法规则**：缺【目标】【范围】【验收】任一 = 非法，执行者停止并要求补齐。

---

## S0 · 基线冻结与留证（步行骨架｜前置：无｜交付：门禁基线快照）

> 本级职责：把规划钉在可复现基线上，后续每刀可比对。升级触发：基线本身有红灯（说明前序未真绿，须回退核查）。

### Task 0.1 复核并留证当前基线 【目标: 证明 S1-S8 后系统全绿 | 依赖: 无 | 产出: 基线证据】

- [ ] #### SubTask 0.1.1 跑类型/单测/文档门禁/端到端基线
  - 【目标】采集现状绿测数字，作为后续回归对照（无基线禁排"优化"任务，§9.1）。
  - 【范围】只读执行，不改任何代码：`pnpm --filter web exec tsc --noEmit`、`pnpm --filter web vitest run`、`node scripts/check-docs-facts.mjs`、`pnpm exec playwright test`（admin 子集）。
  - 【验收】tsc 0 error；vitest 全绿；docs-facts 14/14；admin e2e ≥ 前序 52 passed；记录三处数字锚（admin 页 30 / 路由域 35 / 概览+29 叶）。
  - 【验证命令】`pnpm --filter web exec tsc --noEmit` 与 `node scripts/check-docs-facts.mjs`（PowerShell 兼容，分号串联）。
  - 【产出】`docs/specs/finalize-admin-ia-and-ops-gaps/evidence/baseline.md`（CLOSE 时归档，本规划阶段仅登记待办）。
  - 【依赖】无。
  - 【并行性】串行首刀（其余刀全依赖它）。
  - 【档位】sonnect（跑测+记录，无决策）。
  - 【规模】小（<2h）。

---

## S1 · 导航引擎三级化（M1｜前置：S0｜交付：三级建树 + 三级渲染 + 三级剪枝）

> 本级职责：把两级 `buildAdminNav` 扩到「板块(1)→分组(2)→叶(3)」，是 M2 板块化的硬前置。升级触发：三级化破坏既有 52 e2e 且无法在 S1 内修复 → 升 opus 做契约级重审。

### Task 1.1 扩展建树纯函数 【目标: buildAdminNav 支持三级 | 依赖: 0.1.1 | 产出: 改 core + 单测】

- [ ] #### SubTask 1.1.1 改类型与 buildAdminNav 三级聚合
  - 【目标】输出 `sections[]→groups[]→leaves[]` 三级 VM，向后兼容两级数据。
  - 【范围】改 `apps/web/lib/admin-navigation-core.ts`：`AdminNavVM` 增加 `sections`（或让 `groups` 携带 `children: NavGroupVM[]`）；`buildAdminNav` 识别 `level===1`(板块,isDropdown)→`level===2`(分组,isDropdown)→`level===3`(叶,有 path)；保留旧 `level===1 组 + level===2 叶` 的两级数据仍能渲染（兼容分支）。**禁止改** 现有导出符号名以外语义。
  - 【验收】新增单测：给定三级 rows 输入，`buildAdminNav` 产出三级；给定两级 rows，产出等价旧结构；无 path 节点跳过；sortOrder 升序稳定。
  - 【验证命令】`pnpm --filter web vitest run admin-navigation`（或对应 spec 文件名）。
  - 【产出】core 改动 + `admin-navigation.spec.ts`（若无则并入现有测试）。
  - 【依赖】0.1.1。
  - 【并行性】串行（S2/S3 依赖；与 S4/S5/S6 文件不相交可并行）。
  - 【允许修改】`apps/web/lib/admin-navigation-core.ts`、其 spec。
  - 【档位】opus（改冻结的建树契约语义，牵动全局）。
  - 【规模】中。

- [ ] #### SubTask 1.1.2 三级 RBAC 剪枝
  - 【目标】`filterNavByPerms` 按三级剪枝：叶无权限→隐藏；分组无可见叶→隐藏；板块无可见分组→隐藏。
  - 【范围】同文件 `filterNavByPerms`；wildcard 仍全可见；空壳逐级丢弃。
  - 【验收】单测：非通配角色仅持部分叶权限时，空的分组/板块不出现；overview 不受影响。
  - 【验证命令】`pnpm --filter web vitest run`。
  - 【产出】filterNavByPerms 改动 + 用例。
  - 【依赖】1.1.1。
  - 【并行性】串行。
  - 【档位】opus。
  - 【规模】小。

### Task 1.2 侧栏三级渲染与展开 【目标: AdminSidebar 渲染三级并逐级可展开 | 依赖: 1.1.2 | 产出: 改组件】

- [ ] #### SubTask 1.2.1 三级手风琴渲染
  - 【目标】板块头→分组头→叶 三级缩进 + 展开/收起；概览仍独立置顶。
  - 【范围】改 `apps/web/components/admin/AdminSidebar.tsx:161-236` 渲染块（当前两级）→ 嵌套三级；沿用 `NavIcon`/`ACTIVE_CLS`/`IDLE_CLS`；移动端 `forceExpanded` 恒展开逻辑保留。
  - 【验收】视觉：三级缩进清晰；键盘可达（原生 button/link）；收起态图标列仍可用；现 admin e2e 导航类用例不破。
  - 【验证命令】`pnpm exec playwright test`（admin 导航相关）。
  - 【产出】侧栏组件改动。
  - 【依赖】1.1.2。
  - 【并行性】串行。
  - 【档位】sonnect（渲染实现，契约已由 1.1 冻结）。
  - 【规模】中。

- [ ] #### SubTask 1.2.2 展开态持久化兼容三级 + 深链自动展开
  - 【目标】`openGroups`/localStorage 存档兼容三级 key 结构，旧存档不崩；直访深层叶自动展开所属分组与板块。
  - 【范围】改 `AdminSidebar.tsx:59-77`（`groupIndexForPath` 扩到三级命中路径回填；`OPEN_GROUPS_KEY` 值结构升级并容错旧值）。
  - 【验收】旧 localStorage 值存在时不报错并安全迁移；冷启动直访最深层叶，其两级祖先均展开在 DOM 内。
  - 【验证命令】`pnpm exec playwright test` + 手动核验（人工核验 localStorage 迁移）。
  - 【产出】组件展开逻辑改动。
  - 【依赖】1.2.1。
  - 【并行性】串行。
  - 【档位】sonnect。
  - 【规模】小。

---

## S2 · 7 大板块默认树 + 安全切换（M2/M3｜前置：S1｜交付：新 seed + 应用推荐分组）

> 本级职责：把「能力」变「开箱默认」，且不覆盖管理员手工编排。升级触发：不覆盖检测误判覆盖真实编排 → 立即熔断升 opus 重审判定逻辑。

### Task 2.1 设计并落默认三级树 【目标: 出厂 = 7 板块 | 依赖: 1.2.2 | 产出: 新 seed 脚本】

- [ ] #### SubTask 2.1.1 新建 `seed-admin-nav-default.ts`（三级 7 板块）
  - 【目标】按 §2.3 板块划分产出三级种子树，30 叶零丢失（不改 URL，只重组层级与归属）。
  - 【范围】新建 `apps/web/prisma/seed-admin-nav-default.ts`（不改旧 `seed-navigation-menu.ts`）。板块（level1）：①数据报表 ②模型与采集 ③用户与权限 ④交易与财务 ⑤渠道与子平台 ⑥内容运营 ⑦站点与系统；概览独立置顶。叶 href 全部沿用现值（见 spec §2.1 表）。
  - 【验收】跑脚本后 `buildAdminNav` 得 7 板块；`EXPECTED_HREFS` 覆盖 31 入口零缺失（复用旧脚本覆盖断言思路）。
  - 【验证命令】`pnpm --filter web exec tsx prisma/seed-admin-nav-default.ts`。
  - 【产出】新 seed 脚本 + 覆盖断言输出。
  - 【依赖】1.2.2。
  - 【并行性】串行（S2 内）。
  - 【档位】sonnect。
  - 【规模】中。

- [ ] #### SubTask 2.1.2 不覆盖检测（安全切换核心）
  - 【目标】仅当 ADMIN 菜单仍等于出厂 menuCode 集合时才 upsert 重组；检测到自定义即跳过并打印提示。
  - 【范围】seed 脚本主流程前置判定：读现 `NavigationMenu(scope=ADMIN)` 的 menuCode 集合 vs 出厂集合；不等→`console.warn`「检测到手工编排，已跳过；请在菜单页点『应用推荐分组』」并 `return`。
  - 【验收】两条用例：(a) 空/等于出厂集合库→重排成功；(b) 含额外/改名 menuCode 的库→跳过、数据不变。
  - 【验证命令】两库状态各跑一次脚本并断言（人工核验 + 脚本退出码）。
  - 【产出】检测逻辑。
  - 【依赖】2.1.1。
  - 【并行性】串行。
  - 【档位】opus（G1 明令规避覆盖，不可逆风险）。
  - 【规模】中。

### Task 2.2 菜单页「应用推荐分组」按钮 【目标: 管理员可主动应用默认板块 | 依赖: 2.1.2 | 产出: MenuManager + 端点】

- [ ] #### SubTask 2.2.1 服务端应用默认端点 + 客户端按钮（二次确认）
  - 【目标】提供「应用推荐分组」动作，复用 2.1.2 同一不覆盖/显式确认逻辑。
  - 【范围】`apps/web/components/admin/MenuManager.tsx` 加按钮（走 ConfirmDialog，禁 window.*）；对应 `app/api/v1/admin/menus/*` 端点新增 action（`requireAdminApi("admin.menus.write")`），落 AuditLog；保存后 `revalidateTag` 失效侧栏缓存。
  - 【验收】点击→二次确认→应用 7 板块；自定义库需显式确认才覆盖；缓存失效侧栏即时更新。
  - 【验证命令】`pnpm exec playwright test`（菜单编排用例）。
  - 【产出】按钮 + 端点动作。
  - 【依赖】2.1.2。
  - 【并行性】串行（S2 尾）。
  - 【档位】sonnect。
  - 【规模】中。

---

## S3 · DEFAULT_ADMIN_NAV 兜底补全 + 注释对齐（M4｜前置：S1｜交付：兜底树 31 入口）

> 本级职责：缺库/空表回退树与 seed 一致，消除 D-1/D-2 文档-代码不一致。**与 S2 不同文件，可并行。**

### Task 3.1 补全兜底树与注释 【目标: 兜底 = 31 入口 | 依赖: 1.2.2 | 产出: 改 core + 注释】

- [ ] #### SubTask 3.1.1 DEFAULT_ADMIN_NAV 补 5 叶 + 对齐三级结构
  - 【目标】兜底树含 prices/logs/oidc/menus/roles，且与 S1 三级 VM 形状一致。
  - 【范围】改 `admin-navigation-core.ts:83-128`：补齐缺失 5 叶；按板块/分组/叶三级重排；注释「26」改实数。
  - 【验收】`DEFAULT_ADMIN_NAV` 展开后入口集合 == seed `EXPECTED_HREFS`（31）；`admin-navigation.spec.ts` 增断言。
  - 【验证命令】`pnpm --filter web vitest run`。
  - 【产出】兜底树改动。
  - 【依赖】1.2.2。
  - 【并行性】与 S2 并行（不同脚本/不同导出块；core 文件若 S1 已改完则无写冲突——需 S1 完成后开工）。
  - 【档位】haiku（填数据/对齐，语义由 S1 冻结）。
  - 【规模】小。
  - 【冲突提醒】3.1.1 与 1.1.1 同文件 `admin-navigation-core.ts` → **串行于 S1 之后**，禁并行同改。

---

## S4 · 用户密钥/渠道只读视图 + 吊销（M5/G2｜前置：S0 + §4①｜交付：credentials 端点 + 抽屉区）

> 本级职责：补运营盲区——用户 ApiKey/StationUserKey/CustomChannel 全局只读 + 吊销。**与 S1/S2/S3 文件不相交，可并行。** 升级触发：无法保证脱敏（漏字段）→ 熔断，不下发。

### Task 4.1 credentials 聚合读端点 【目标: 脱敏查看 | 依赖: 0.1.1 | 产出: GET 端点 + 脱敏单测】

- [ ] #### SubTask 4.1.1 实现 GET credentials 聚合
  - 【目标】返回尾号/状态/末用时间，绝不明文回显密钥值。
  - 【范围】新建 `app/api/v1/admin/users/[id]/credentials/route.ts`；`requireAdminApi("admin.users.read")`；查 `prisma.apiKey/stationUserKey/customChannel` where userId；映射 masked（复用现控制台脱敏函数，若无可提 `lib`）；响应严格对齐 §4①。
  - 【验收】单测断言响应不含 `secret`/`key`/`token` 明文；跨用户 userId 越权返回 403；空态返回空数组。
  - 【验证命令】`pnpm --filter web vitest run` + 路由级集成测（现有 admin API 测试基座）。
  - 【产出】读端点 + 脱敏断言测试。
  - 【依赖】0.1.1。
  - 【并行性】与 S1/S2/S3/S5/S6 并行（新增文件，无共享可变状态，§7.1 四条件满足）。
  - 【允许修改】新目录 `app/api/v1/admin/users/[id]/credentials/`、用户详情抽屉组件、`lib` 脱敏工具。
  - 【档位】sonnect。
  - 【规模】中。

### Task 4.2 吊销写端点 + 抽屉展示 【目标: 可吊销且审计 | 依赖: 4.1.1 | 产出: POST + UI】

- [ ] #### SubTask 4.2.1 POST revoke（幂等 + 审计）
  - 【范围】新建 `.../credentials/revoke/route.ts`；`requireAdminApi("admin.users.write")`；状态机（已吊销→409 `CREDENTIAL_NOT_REVOCABLE`）；写 `AuditLog(action="admin.credential.revoke")`。
  - 【验收】重复吊销 409；越权 403；成功落审计；单测覆盖三态。
  - 【验证命令】`pnpm --filter web vitest run`。
  - 【依赖】4.1.1。【并行性】S4 内串行。【档位】sonnect。【规模】中。

- [ ] #### SubTask 4.2.2 用户详情抽屉「密钥与渠道」区
  - 【范围】用户详情抽屉组件加只读区 + 吊销按钮（ConfirmDialog）；消费 4.1/4.2 端点；UX 五态对齐 §4⑥。
  - 【验收】渲染脱敏列表；吊销二次确认；无权限态隐藏入口。
  - 【验证命令】`pnpm exec playwright test`。
  - 【依赖】4.2.1。【并行性】S4 尾。【档位】sonnect。【规模】中。

---

## S5 · 在途冻结款只读分页视图（M6/G3｜前置：S0 + §5 索引｜交付：holds 端点 + 视图）

> 本级职责：BalanceHold 运营可见。**与 S4 并行（不同表/不同文件）。**

### Task 5.1 holds 分页读端点 【目标: 按状态分页 | 依赖: 0.1.1, (可选迁移) | 产出: GET holds】

- [ ] #### SubTask 5.1.1 GET /admin/holds（可选建索引）
  - 【目标】提供按状态+时间分页的冻结款列表；索引按需。
  - 【范围】新建 `app/api/v1/admin/holds/route.ts`，`requireAdminApi("admin.wallets.read")`，分页 `status/userId/from/to` 过滤，响应 `{items,total,page,pageSize}`。`BalanceHold` 已有 `@@index([status, expiresAt])`；若 EXPLAIN 证实走不了此索引→补 `@@index([status, createdAt])` 归入唯一迁移 `2026xxxx_admin_ops_indexes`。
  - 【验收】EXPLAIN 核验查询走索引或可接受；分页契约齐；越权 403。
  - 【验证命令】`pnpm --filter web exec tsc --noEmit` + `pnpm --filter web vitest run`（若加迁移：`pnpm exec prisma migrate deploy`）。
  - 【产出】端点 + 测试（+ 可选迁移）。
  - 【依赖】0.1.1。【并行性】与 S4 并行；若建迁移则版本号**独占串行**（§7.1）。【档位】sonnect。【规模】中。

- [ ] #### SubTask 5.1.2 冻结款视图（页签）
  - 【范围】钱包页或订单页加「在途冻结」只读页签消费 5.1.1；异常 hold 的释放动作复用既有 capture/reverse 链并审计（不新造资金逻辑）。
  - 【验收】列表可分页可过滤；释放走既有链 + 审计；UX 五态。
  - 【验证命令】`pnpm exec playwright test`。
  - 【依赖】5.1.1。【并行性】S5 尾。【档位】sonnect。【规模】中。

---

## S6 · OrdersManager 弹窗归一（S1a/G6｜前置：S0｜交付：0 原生弹窗）

> 本级职责：3 处 `window.prompt/confirm` → ConfirmDialog/message。**单文件独占，可与任意切片并行。**

### Task 6.1 归一原生弹窗 【目标: 移除 window.* | 依赖: 0.1.1 | 产出: 改 OrdersManager】

- [ ] #### SubTask 6.1.1 替换 :91/:95/:97 三处
  - 【范围】改 `apps/web/components/admin/OrdersManager.tsx:91`（冲正原因→带输入框的对话框）、`:95`/`:97`（标记异常/关单→ConfirmDialog）；复用项目既有对话框/message 组件（对齐 N6 轮其它 6 个管理器口径）。
  - 【验收】文件内 0 处 `window.prompt|confirm|alert`（grep 断言）；三动作仍可发起且落审计；移动端不阻塞。
  - 【验证命令】`Select-String -Path apps/web/components/admin/OrdersManager.tsx -Pattern "window\.(prompt|confirm|alert)"` 应 0 命中；`pnpm exec playwright test`。
  - 【产出】OrdersManager 改动。
  - 【依赖】0.1.1。【并行性】独立并行（单文件所有权）。【档位】sonnect。【规模】小。

---

## S2r · 报表独立页 `/admin/reports`（B1 已裁决｜前置：S0｜交付：专属报表页）

> 本级职责：侧栏「数据报表」板块有独立专属页承载重报表；`/admin` 首页保留精简全局概况。**与 S1 并行（不同文件）；但概览页/ReportsBoard/reports API 三文件与 S9 重叠 → S9.1.2 必须串行于 S2r 后。**

### Task 2r.1 报表页与组件复用 【目标: /admin/reports 可用且与概览共用 | 依赖: 0.1.1 | 产出: 新页 + 抽组件】

- [ ] #### SubTask 2r.1.1 抽出 ReportsBoard 为可复用 + 概览保留精简 KPI
  - 【目标】把现有挂在 `/admin` 概览的 `ReportsBoard` 重构为可传参（compact/full 两模）组件；概览页用 compact（4 KPI 卡），专属页用 full（趋势图+Top+时间切换）。
  - 【范围】改 `apps/web/components/admin/ReportsBoard.tsx`（加 `variant` prop，缺省 full 保持向后兼容）；改 `app/(admin)/admin/page.tsx` 用 compact。禁改 `reports-core.ts` 数据层。
  - 【验收】概览渲染精简版不倒退；tsc 0；现报表单测（reports.spec）不破。
  - 【验证命令】`pnpm --filter web vitest run` + `pnpm exec playwright test`（概览）。
  - 【产出】ReportsBoard variant 化 + 概览页改动。
  - 【依赖】0.1.1。【并行性】与 S1 并行；与 S9.1.2 同文件→S9.1.2 后。
  - 【允许修改】`ReportsBoard.tsx`、`app/(admin)/admin/page.tsx`。
  - 【档位】sonnect。【规模】中。

- [ ] #### SubTask 2r.1.2 新建 `/admin/reports` 专属页
  - 【目标】独立页承载 full 版报表，预留导出/多维扩展位。
  - 【范围】新建 `app/(admin)/admin/reports/page.tsx`（`generateMetadata` + `force-dynamic` + 渲 full ReportsBoard）；权限入场守门同概览。
  - 【验收】`/admin/reports` 可访问、渲染完整报表；无权限（S9 后）重定向。
  - 【验证命令】`pnpm exec playwright test`（新增 reports 页用例）。
  - 【产出】新页文件。
  - 【依赖】2r.1.1。【并行性】S2r 尾。
  - 【档位】sonnect。【规模】小。

---

## S7 · 静态资讯迁入 DB（B3 已裁决｜前置：S0｜交付：5 篇入 NewsItem）

> 本级职责：官方静态文章迁库、后台可编。**新文件/新脚本，可与 S4/S5/S6 并行。**

### Task 7.1 迁库与清理 【目标: 5 篇官方文章可后台编辑 | 依赖: 0.1.1 | 产出: 迁移脚本 + 合并逻辑清理】

- [x] #### SubTask 7.1.1 写迁库脚本（static-articles → NewsItem）✅ 已完成：新建 `seed-official-news.ts`（slug 幂等 upsert），tsx 实跑新建 5 篇、重跑不重复，查回 5 条 category=官方公告/status=PUBLISHED。
  - 【目标】把 `lib/features/news/static-articles.ts` 5 篇幂等写入 `NewsItem`（`category="官方公告"`、`status=PUBLISHED`、`publishedAt` 取原文时间、`slug` 保留原值）。
  - 【范围】新建 `prisma/seed-official-news.ts`（按 slug upsert 幂等，可重跑）；不改 schema。
  - 【验收】跑脚本后 NewsItem 含这 5 篇且 slug 无重；重跑不产生重复。
  - 【验证命令】`pnpm --filter web exec tsx prisma/seed-official-news.ts` + 查回行数断言。
  - 【产出】迁库脚本。
  - 【依赖】0.1.1。【并行性】S7 内先。
  - 【档位】sonnect。【规模】小。

- [x] #### SubTask 7.1.2 清理前后端静态合并 + NewsManager 按类别管理✅ 已完成：repository 移除静态兜底改纯 DB（site-pages.spec 两降级用例改写）；NewsManager 加 category 筛选下拉；static-articles.ts/seed-news.ts 标 @deprecated。
  - 【目标】资讯列表/详情不冉合并静态源（改读 DB）；NewsManager 可按 `category=官方公告` 筛选编辑。
  - 【范围】改消费 `static-articles` 的资讯列表/详情逻辑（去合并）；NewsManager 加 category 筛选（若已有则复用）；标旧 `static-articles.ts` 废弃（不物理删，加 deprecated 注释）。
  - 【验收】前台资讯列表数据与迁库前一致（5 篇仍在）；NewsManager 能编这 5 篇；无重复渲染。
  - 【验证命令】`pnpm exec playwright test`（news 前台）+ 人工核验 NewsManager。
  - 【产出】合并逻辑清理 + 管理器类别支持。
  - 【依赖】7.1.1。【并行性】S7 尾。
  - 【档位】sonnect。【规模】中。

---

## S8 · 跑马灯/关于正文 CMS（B4 已裁决｜前置：S0｜交付：两配置键可编）

> 本级职责：虚构硬编码转可配。**新键/新编辑器，可与 S4/S5/S6/S7 并行。**

### Task 8.1 配置化 【目标: 名单与关于正文后台可改 | 依赖: 0.1.1 | 产出: 配置键 + 消费端】

- [x] #### SubTask 8.1.1 新增两 SystemConfig 键 + 初始 seed ✅ 已完成：shared `site-sections.schema.ts` 定 `partners.marquee`（JSON 字符串数组）/`about.body`（纯文本）契约+DEFAULT+parse；`ADMIN_CONFIG_KEYS` 22→24；registry 两项 `configGroup=home`（新 kind `marquee`/`richText`）；seed.ts 插两行（configValue 逐字符同 schema 真源）。**注**：沿用既有架构——结构化配置统一 `configType=STRING`，由 `valueRule.kind` 驱动校验与编辑器分派（非字面 JSON/RICH_TEXT 型）；parity 守卫 6/6 过。
  - 【范围】新增 `partners.marquee`（configType=JSON，值=现 12 虚构名单作初始）/ `about.body`（RICH_TEXT，值=现关于页正文）；写 seed 或复用配置 seed。**数据层，无 schema 变更。**
  - 【验收】两键可经配置 API 读回；缺省有兜底值。
  - 【验证命令】`pnpm --filter web exec tsx prisma/seed.ts`（或专键脚本）+ 读回断言。
  - 【依赖】0.1.1。【档位】haiku（填数据）。【规模】小。

- [x] #### SubTask 8.1.2 PartnerMarquee / AboutSection 改读配置 ✅ 已完成：`loadHomeContent` findMany 并两键（tag `site-home`），返回 `marquee`/`aboutBody`，catch 回退 DEFAULT；`PartnerMarquee` 改 `names` props（半切分两行）、`AboutSection` 改 `body` props（`splitAboutParagraphs` 渲染多 `<p>`）；`(site)/page.tsx` 解构下传。`site-sections.spec.ts` 7 测覆盖 parse 兜底 + loadHomeContent DB成功/故障/缺行降级。配置缺失回退不报错。
  - 【范围】`PartnerMarquee.tsx` 从硬编码数组→读 `partners.marquee`；`AboutSection.tsx`/`about/page.tsx` 正文→读 `about.body`（RSC 取数，带兜底）。
  - 【验收】前台跑马灯/关于正文随配置变化；配置缺失回退不报错。
  - 【验证命令】`pnpm exec playwright test`（首页/关于页）。
  - 【依赖】8.1.1。【档位】sonnect。【规模】中。

- [x] #### SubTask 8.1.3 站点配置页加两编辑器 ✅ 已完成：新建 `HomeSectionsEditor.tsx`（`PartnerMarqueeEditor` 名单增删 + `AboutBodyEditor` 多行文本），挂 `/admin/configs` 常用堆；保存经 `normalizeConfigValue`（校验后存原文）→ configs PUT 按 `configGroup=home` 自动 `revalidateTag('site-home')+revalidatePath('/')`，首页即时生效，无需改 route。UX 装载/保存/错误态复用现成编辑器范式。
  - 【范围】SiteConfigs 管理页加 `partners.marquee`（数组编辑 UI）与 `about.body`（富文本）编辑器，复用现成 6 编辑器模式；保存 `revalidateTag`。
  - 【验收】可在后台改名单/正文并前台生效；UX 五态。
  - 【验证命令】`pnpm exec playwright test`。
  - 【依赖】8.1.1。【档位】sonnect。【规模】中。

---

## S9 · RSC 守卫 + 报表权限码（B2 已裁决｜前置：S0 + S2r｜交付：越权重定向 + MODERATOR 不见金额）

> 本级职责：补安全边界与报表金额可见性。**reports API/概览页与 S2r 同文件 → 串行于 S2r 后。**

### Task 9.1 报表金额权限 【目标: MODERATOR 看不到收入 | 依赖: 2r.1.2 | 产出: 新权限码 + 端点鉴权 + UI 隐藏】

- [x] #### SubTask 9.1.1 新增 `admin.reports.read` 权限码 + 注册✅ 已完成：`permissions.ts` `ADMIN_DOMAINS` 加 `reports` 域（29→30 域×{read,write}=60 原子）；`MODERATOR_READ` filter 排除 `admin.reports.*`；ADMIN 含 `admin.reports.read`、SUPER_ADMIN 通配自然持有；新建 `admin-permissions.spec.ts` 6 测（shared vitest 全绿）。零 schema 变更（入库靠 `seed-rbac` 重跑）。
  - 【范围】权限注册表新增 `admin.reports.read`（归属报表域）；seed/注册写入 Permission 表；分配给 SUPER_ADMIN（通配自然持有）；**不分配 MODERATOR/SUPPORT**。无 schema 变更。
  - 【验收】码存在于库；MODERATOR 权限集不含此码；SUPER_ADMIN 含。
  - 【验证命令】`pnpm --filter web vitest run`（RBAC 快照测）。
  - 【依赖】0.1.1。【档位】opus（改 RBAC 权限快照，牵全局）。【规模】中。

- [x] #### SubTask 9.1.2 reports 端点鉴权 + 概览/专属页按角色隐金额✅ 已完成：`reports/overview/route.ts` 改 `requireAdminApi("admin.reports.read")`；`/admin` 概览紧凑看板 + 「完整运营报表」入口按 `canViewReports` 条件渲染，`/admin/reports` 页级守卫隐金额（均服务端 session 判定）；web tsc 0。
  - 【范围】`app/api/v1/admin/reports/overview/route.ts` 由裸 `requireAdminApi()` 改 `requireAdminApi("admin.reports.read")`；`/admin` 概览与 `/admin/reports` 对无此码角色隐藏收入卡/趋势图金额轴（服务端 session 判定）。
  - 【验收】MODERATOR 调 reports API 403 或拿到不含金额的视图；SUPER_ADMIN 全量；越权不泄露金额。
  - 【验证命令】`pnpm --filter web vitest run` + `pnpm exec playwright test`（两角色登录对测）。
  - 【依赖】9.1.1, 2r.1.2。【并行性】串行于 S2r（同 reports 文件域）。【档位】sonnect。【规模】中。

### Task 9.2 RSC 守卫与数字锚（不阻塞） 【目标: 越权重定向 + 口径统一 | 依赖: 0.1.1 | 产出: 页守卫 + 锚修正】

- [x] #### SubTask 9.2.1 /admin/menus /admin/logs 补页级 hasPermission 重定向✅ 已完成：`/admin/menus`、`/admin/logs`（及 `/admin/reports`）改 async RSC，无对应 `admin.*.read` 直访 `redirect("/admin?denied=...")`（对齐 roles 页既有范式）；web tsc 0。
  - 【范围】两页面（现仅 API 兜底）补 RSC 级权限判定→无权限 redirect（避免 MODERATOR 进页看空态）。
  - 【验收】无对应读码角色直访两页→重定向而非空态页。
  - 【验证命令】`pnpm exec playwright test`（越权路由）。
  - 【依赖】0.1.1。【并行性】可与主路径并行（不同文件）。【档位】sonnect。【规模】小。

- [x] #### SubTask 9.2.2 数字口径锚统一（D-1/D-2）✅ 已完成：四处锚（功能 §3.5/API接口 §5.8.6/API架构 §7.9/目录 §十一）「29 域58 原子→**30 域60 原子**」统一；spec D-5/N-2 以代码为准（98 文件/36 路由目录域/32 后台页=概览+31 叶）。
  - 【范围】统一口径锚（30 页 vs 31 锚 vs 29 叶）到以代码为准（与 S3 注释修正联动）；更新对应锚文档行。
  - 【验收】`node scripts/check-docs-facts.mjs` 全绿；三处数字不再打架。
  - 【验证命令】`node scripts/check-docs-facts.mjs`。
  - 【依赖】0.1.1。【档位】haiku。【规模】小。

---

## §8 依赖 DAG / 并行判定 / 关键路径 / 环检测

```
S0 ─┬─ S1 ─┬─ S2(需 S2r 先交叶) ───┐
    │      └─ S3(串于S1,同文件)     │
    ├─ S2r ─ S9.1(串于S2r,同文件)  │
    ├─ S4 ───────────────────────┼─→ CLOSE
    ├─ S5 ───────────────────────┤
    ├─ S6 ───────────────────────┤
    ├─ S7 ───────────────────────┤
    ├─ S8 ───────────────────────┤
    └─ S9.2(独立可并行) ────────┘
```
- **可并行组**（§7.1 四条件：无共享可变状态 ∧ 契约已冻结 ∧ 文件所有权不相交 ∧ 迁移版本号不冲突）：
  - **{S4, S5, S6, S7, S8, S9.2}** 互可并行 —— 均为新文件/单文件独占，所有权不相交；唯 **S5 若建迁移则版本号全局唯一且串行**。
  - S3 与 S2 并行——不同脚本；但 **S3 与 S1 同文件 `admin-navigation-core.ts`，必须串行于 S1 后**。
  - S2r 与 S1 并行——不同文件。
- **必须串行链**：S0→S1→S2（板块化主路径）；**S2r→S9.1**（reports API/概览页同文件域）；**S2r→S2**（数据报表板块需 /admin/reports 叶就位）；S1→S3；S4.1→S4.2；S5.1→S5.2；S7.1→S7.2。
- **关键路径**：S0 → S1 → S2 →（合并）→ CLOSE（板块化主诉求）；次关键链 S0 → S2r → S9.1。
- **环检测**：无环（S2←S2r←S0；S9.1←S2r；均为单向前驱）。

## §9 所有权矩阵（Agent × 路径，重叠即缺陷）

| 路径 | 归属 Agent | 涉及切片 | 重叠 |
|---|---|---|---|
| `apps/web/lib/admin-navigation-core.ts` | Agent-Nav | S1(1.1)、S3(3.1) | ⚠ S1/S3 同文件 → **串行**（已标） |
| `apps/web/components/admin/AdminSidebar.tsx` | Agent-Nav | S1(1.2) | 无 |
| `apps/web/prisma/seed-admin-nav-default.ts` | Agent-Nav | S2(2.1) | 无 |
| `apps/web/components/admin/MenuManager.tsx` + `app/api/v1/admin/menus/*` | Agent-Nav | S2(2.2) | 无 |
| `app/api/v1/admin/users/[id]/credentials/*` + 用户抽屉 | Agent-Ops | S4 | 无 |
| `app/api/v1/admin/holds/*` + `prisma/schema.prisma`(索引) | Agent-Data | S5 | ⚠ schema.prisma 迁移版本号独占 → 串行 |
| `apps/web/components/admin/OrdersManager.tsx` | Agent-UI | S6 | 无 |
| `ReportsBoard.tsx` + `admin/page.tsx` + `reports/overview/route.ts` + `admin/reports/page.tsx` | Agent-UI | S2r、S9.1.2 | ⚠ S2r 与 S9.1.2 同文件 → **S9.1.2 串行于 S2r** |
| news 消费逻辑 + `NewsManager.tsx` + `prisma/seed-official-news.ts` | Agent-Content | S7 | 无（不碰 S8 文件） |
| `PartnerMarquee.tsx`/`AboutSection.tsx` + SiteConfigs 编辑器 + 专键 seed | Agent-Content | S8 | ⚠ 与 S7 同属 Agent-Content → **串行或拆两内容 Agent** |
| 权限注册表 + Permission seed | Agent-Guard | S9.1.1 | 无 |

- 同时最多 3 个写入 Agent：主路径 **Agent-Nav**（S1/S2/S3）+ **Agent-UI**（S2r/S6）+ 一个旁路槽（{S4 Ops / S5 Data / S7•S8 Content / S9.2} 轮换）。S5 迁移窗口时 Agent-Data 独占。
- **消除重叠**：潜在争用三处——`admin-navigation-core.ts`（S1/S3）、`schema.prisma`（S5 迁移）、reports 文件域（S2r/S9.1.2），均已降为串行/独占。
- S7 与 S8 同属 Agent-Content 但文件不相交，可拆为两个内容 Agent 并行，或单 Agent 串行；不得同时改共享 seed 入口。

## §10 档位分配与成本预算（§8.2 默认 opus；券制 opus≤3/切片，fable≤1/切片）

| 切片 | 任务数 | haiku | sonnect | opus | fable |
|---|---|---|---|---|---|
| S0 | 1 | 0 | 1 | 0 | 0 |
| S1 | 4 | 0 | 2 | 2 | 0 |
| S2 | 3 | 0 | 2 | 1 | 0 |
| S3 | 1 | 1 | 0 | 0 | 0 |
| S4 | 3 | 0 | 3 | 0 | 0 |
| S5 | 2 | 0 | 2 | 0 | 0 |
| S6 | 1 | 0 | 1 | 0 | 0 |
| S2r | 2 | 0 | 2 | 0 | 0 |
| S7 | 2 | 0 | 2 | 0 | 0 |
| S8 | 3 | 1 | 2 | 0 | 0 |
| S9 | 4 | 1 | 2 | 1 | 0 |
- opus 集中于「改冻结契约语义」（S1 建树/剪枝）、「不可逆风险」（S2 不覆盖检测）、「RBAC 权限快照」（S9.1.1）。
- 总数：约 **27 个原子任务**（S0–S9 含 S2r）；sonnect 主力 18、haiku 4、opus 5（含 S1×2 + S2×1 + S9.1.1×1 + S5×1）。
- fable 默认 0；仅当并行执行中需推翻 §4 契约或 §3.2 需求边界时启用（≤1/切片，超需人批）。
- 熔断（§8.4）：同一任务连续 2 次验收失败 → 停改代码 → 重写任务书 / 升档 / 标 blocked，禁止换提示词硬撞第 3 次。
