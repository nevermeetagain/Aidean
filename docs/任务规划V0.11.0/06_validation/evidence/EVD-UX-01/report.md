# EVD-UX-01 用户端 + 管理端 UI/布局/交互全量调研报告

- BASE：`c84efff2081ac7a63e0823bb78fbc5e8b79634a4`（独立克隆，本地分支 `ux/01-audit`，未 pull/push）
- 运行：Hark 沙箱（用户 2026-10-22 16:10 裁定），生产构建 `next start -p 3002`，独立库 `aidean_ux` + 本克隆 seed
- 覆盖：用户端 23 路由（动态路由各 2 样本，共 27 行）+ 管理端 34 个 `/admin/**` 与 `/admin/login`（共 35 行）× 1440/768/390 = 186 张全页截图；匿名访问 5 个需登录页 × 2 视口
- 附件：`features.csv`（62 行）· `scorecard.csv`（62 行）· `static.txt` · `a11y.txt` · `perf.txt` · `verify.txt` · `shots/`（38 张，均在下文引用）
- 优先级：P0=功能错误/失败显示为空/横向溢出；P1=体验与一致性；P2=美化。工作量：S≤0.5d，M≤2d，L>2d

## 1. 总览

| 端 | 页数 | 均分（/16） | 百分制 | 最弱维度（均分/2） |
|---|---|---|---|---|
| 用户端 | 27 | **9.11** | 56.9 | ⑥响应式 0.07、①网格 0.48、②字号 0.67 |
| 管理端 | 35 | **8.74** | 54.6 | ②字号 0.09、⑤组件一致 0.69、③颜色 0.86、④间距 0.86 |

八维评分规则（逐页读数见 `scorecard.csv`「主要扣分读数」列）：
①网格：正文容器合《UI设计文档》§2.4 全宽且与页头同宽=2，仅页头 `max-w-6xl` 错位=1，正文自设窄容器=0。
②字号：可见文字字号不在 13/14/16/20/24/32 的占比 <15% 且 H1 在 24–32px=2，<40%=1，否则 0。
③颜色：页面文件+直接引用组件的 `bg|text|border-色板-数字` ≤10=2，≤40=1，>40=0（与基线同口径）。
④间距：计算样式中非 4px 倍数的 padding/margin/gap ≤40=2，≤120=1，否则 0。
⑤组件：按钮高度种类（除主题色点）≤2=2，3=1，≥4=0；管理端文件原生/组件按钮混用封顶 1。
⑥响应式：768 或 390 有横向溢出=0；390 下宽或高 <24px 的可点目标（扣页头）≤2=2，≤10=1。
⑦中文排版：数字非等宽占比 >30%、中英文无空格 >3 处、中文后半角标点，每项 −1。
⑧动效：`prefers-reduced-motion` 下动画数（5 页实测全部归 0）且未超文档范围=2。

## 2. 最大 5 个问题

1. **768 平板全站横向溢出 103px**（UX-01，P0）：用户端 26/26 页 `scrollWidth−clientWidth=103`（控制台等登录页 97）；`md:flex` 在 768 就展开八项导航+搜索+主题+登录。样板改到 `xl` 后 768/1024 溢出归 0，1280/1440 不变（§6）。
2. **失败显示为空**（UX-02/03/04，P0）：`/evaluations` 断网/500 都显示「还没有测评记录」；`/announcements` 数据库不可用时显示「当前暂无公告」；管理端 8 页断网显示「暂无…」，与真实空数据无法区分。
3. **手机上价格页看不到价格**（UX-05，P1）：`/pricing` 390 下表格只露「模型/厂商」两列，输入/输出单价要在 358px 容器里横滑才能看到。
4. **天梯核心可读性**（UX-06/07，P1）：`/models` 1440 下卡片名截到 3 个字符（「der…」）；`/ladder` 首屏 20 行空档、零卡片（轴顶恒 100，云服务榜最高分 98，颗粒 0.1）。
5. **对比度不达标面广**（UX-13，P1）：axe serious 共 687 个节点、45/62 页；主因 `text-slate-400`（#90a1b9，白底 2.63:1）用户端 103 处、管理端 81 处。

## 3. 问题清单（证据化）

| 编号 | 优先级 | 路由 · 视口 | 截图 | 证据 file:line | 违反规则 | 现状读数 → 目标读数 | 建议 | 工作量 |
|---|---|---|---|---|---|---|---|---|
| UX-01 | P0 | 用户端全部 · 768 | `UX01-home-768-overflow.png` `UX01-pricing-768-overflow.png` `UX01-models-768-overflow.png` | `components/site/SiteHeader.tsx:113,121`；`components/site/MobileNav.tsx:40` | 交互文档 §六（平板 768–1199 缩列）；横向溢出 | 溢出 103px（26/26 页）→ 0px；导航在 768/1024 逐字竖排 → 单行 | 导航/搜索断点 `md`→`xl`，抽屉 `md:hidden`→`xl:hidden`（样板已验证并还原） | S |
| UX-02 | P0 | /evaluations · 全部 | `UX02-evaluations-offline-empty.png` `UX02-evaluations-500-empty.png` | `app/(site)/evaluations/page.tsx:31-40`（非 401 一律 `setState("ready")` + `rows=[]`；catch 也置 ready） | 失败≠空态 | 断网/500 显示「还没有测评记录」且公开示例消失 → 错误文案 + 重试，空态只在 200 且 total=0 时出现 | 增 `error` 状态与重试按钮 | S |
| UX-03 | P0 | /announcements · 全部 | （SSR，curl 取证见 verify） | `lib/features/announcements/repository.ts:56` catch 返回空；`app/(site)/announcements/page.tsx:33` | 失败≠空态 | 停库时 200 +「当前暂无公告」→ 错误提示 | catch 返回错误标记，页面分支渲染 | S |
| UX-04 | P0 | 管理端 8 页 · 1440 | `UX04-admin-announcements-offline-empty.png` `UX04-admin-audit-offline-empty.png` `UX04-admin-scripts-offline-empty.png` `UX04-admin-intelligence-offline-empty.png`；对照 `UX04-admin-featureflags-offline-ok.png` | `AnnouncementManager.tsx:60` `AuditLogsTable.tsx:58` `ScriptsManager.tsx:106` `ApiStationManager.tsx:52` `BenchmarksManager.tsx:111` `CapabilityMatrix.tsx:34` `CandidateManager.tsx:56` `IntelligenceDashboard.tsx:51`（均 `if (res.ok && res.data)` 无 else） | 失败≠空态；B11-05 验收 2 | 断网 8/33 页显示「暂无…」→ 0；对照：feature-flags 等 20 页已出错误态 | 并入 B11-05 `PanelState`（冻结，仅方案） | M |
| UX-05 | P1 | /pricing · 390 | `UX05-pricing-390-no-price-col.png` | `app/(site)/pricing/page.tsx:245`（`min-w-[520px]`，列序 模型/厂商/输入/输出） | 交互文档 §六 移动 <768 卡片化 | 首屏可见价格列 0/2 → 2/2 | 390 下改卡片行（模型名 + 两价），或把厂商并入模型名副行 | M |
| UX-06 | P1 | /models · 1440、390 | `UX06-models-1440-card-truncate.png` `UX06-models-390.png` | `components/ladder/LadderMatrixBoard.tsx:167,204`（`truncate text-xs`） | UI §4 天梯卡「扫一眼即对比」 | 卡宽约 85px、可见名称 3 字符；390 下有卡宽 16px（旅程 U6a）→ 名称≥10 字符可见 | 名称两行截断 `line-clamp-2` + 列数随宽度收敛（1440 ≤6 列） | M |
| UX-07 | P1 | /ladder · 1440 | `UX07-ladder-1440-empty-first-screen.png` `UX07-ladder-390.png` | `lib/features/ladder/matrix-layout.ts:9,151`（顶格恒 100） | 交互文档 §三 2.4「顶格=最高综合分向上取整」（与同文 v2.1「恒 100」冲突，见 §8） | 首屏卡片 0 张、空档 20 行 → 首屏≥1 张卡 | 顶格取最高分上取整，或首屏自动滚到首张卡 | S |
| UX-08 | P1 | /evaluations/new · 1440 | `UX08-evaluations-new-1000-chips.png` | `app/(site)/evaluations/new/page.tsx:21`（findMany 无 take）；`components/evaluations/EvaluationCreateForm.tsx:76` | 主流选择器惯例（可搜索） | 1006 个按钮、页面 >6000px → 可搜索下拉，首屏 ≤50 项 | 改 Combobox + 厂商分组 | M |
| UX-09 | P1 | /user/console · 1440 | `UX09-console-modelid-input.png` | `components/console/GeneralForm.tsx:206`（「输入 modelId 后添加」） | 交互文档 §七 用户把模型绑定到四档 | 绑定需手输内部 ID → 模型搜索下拉 | 复用 UX-08 选择器 | M |
| UX-10 | P1 | /user/console · 平台渠道 | `UX10-apikey-copy.png` | `components/console/ApiKeysPanel.tsx:151`「删除后立即可用」 | 文案与行为相反 | → 「删除后立即失效」 | 改一词 | S |
| UX-11 | P1 | /pricing · 全部 | `UX05-pricing-390-no-price-col.png` | `app/(site)/pricing/page.tsx:238,311` | 需求 §五.6 加价率/倍率对用户不可见 | 页内 2 处提及「加价率与 Token 倍率」且与页头「不做隐性加价」并存 → 0 处 | 删两处说明，只保留「按官方单价」 | S |
| UX-12 | P1 | /models/[slug] · 全部 | `UX12-model-detail-no-h1.png` | `app/(site)/models/[slug]/page.tsx:349`（首个标题为 h2「基本介绍」，全文件无 h1） | 标题层级；a11y | H1 数 0 → 1（模型名，24–32px） | 页首加 H1 模型名，「基本介绍」降为 h2 小节 | S |
| UX-13 | P1 | 45 页 · 1440 | — | 见 `a11y.txt`；`static.txt` §3 | WCAG 1.4.3（≥4.5:1）；UI §7 对比度 | 687 节点 → 0；slate-400 用户端 103 处 | 次要文字统一 `text-muted-foreground`（#64748b 4.76:1） | M |
| UX-14 | P1 | console/balance/evaluations/news 详情 · 1440 | `UX14-balance-maxw6xl.png` `UX14-evaluations-maxw4xl.png` | `SiteHeader.tsx:98` `SiteFooter.tsx:70` `app/(site)/page.tsx:44` `user/console/page.tsx:112` `user/balance/page.tsx:75` `evaluations/page.tsx:49` `evaluations/new/page.tsx:30` `news/[slug]/page.tsx:38` | UI §2.4 M-WIDE 全宽 | 正文容器 4 种宽度（全宽/3xl/4xl/6xl），骨架全宽→页面 6xl 跳变 → 1 种 | 页头/页脚改全宽；正文统一全宽，文本段落自身 `max-w-3xl` | S |
| UX-15 | P1 | 一级页 · 1440 | `UX15-home-1440.png` | `components/common/PageHero.tsx:73` `PagePlaceholder.tsx:58` `app/(site)/models/page.tsx:70` | UI §2.3 刻度上限 32 | H1 五种：52.8/36/30/24/20px → 页面标题 32、区块 24 | `md:text-4xl`→32px 令牌 | S |
| UX-16 | P1 | /user/console · 1440 | — | `components/console/ConsoleWorkspace.tsx:115-118`（只读一次 `?tab=`，全文件无 router.replace/history 回写） | 交互文档 §七 `?tab=` 深链 | 切换后 URL 无 tab、刷新回「模型配置」→ 刷新保持 | `router.replace` 回写 | S |
| UX-17 | P1 | 导航 · 全部 | — | `lib/navigation.ts:35-55`（无 /ladder） | 需求 §3.1 两类榜单 | 云服务天梯图入口：仅首页卡片 1 处 → 导航/产品下拉可达 | 产品下拉加「云服务天梯图」 | S |
| UX-18 | P2 | /register、/login | `UX18-login-1440.png` | `lib/features/auth/service.ts:99`「凭据无效」；`components/auth/AuthForm.tsx`（`required` 走浏览器原生气泡） | 主流登录文案；表单错误样式统一 | 术语 →「邮箱或密码错误」；原生气泡 → 行内红字 | 改文案，`noValidate` + 行内校验 | S |
| UX-19 | P2 | 页头 · 1440 | `UX19-search-panel.png` | `components/site/GlobalSearch.tsx:169`（`w-44`） | 文字截断 | 占位符「搜索模型 / 产品 / 资」截断 → 完整 | 占位改「搜索」或宽 w-56 | S |
| UX-20 | P2 | /user/console | `UX09-console-modelid-input.png` | `app/(site)/user/console/page.tsx:228`（表名 usage_daily_stats）、`:123,150`（两入口去 /user/balance） | 面向用户文案不出现实现细节 | 1 处表名 → 0；重复入口 2 → 1 | 删表名；兑换入口并入余额卡 | S |
| UX-21 | P2 | /oauth/dev/callback | — | `app/oauth/dev/callback/page.tsx:27-31`（内联 style，无 noindex） | 生产暴露联调页 | 生产 200 可访问并回显 code → 仅 dev 挂载 | 见 §5 取舍 | S |
| UX-22 | P1 | /admin/models · 1440/390 | `UX22-admin-models-1440.png` `UX22-admin-models-390.png` `UX22-admin-model-create.png` | `components/admin/ModelsTable.tsx:316`（每行 `variant="danger"` 实心删除）、`:356`（原生 `bg-emerald-600`） | 主流后台：危险操作弱化；无编辑 | 每页 20 个实心红按钮、编辑入口 0 → 删除收进行菜单、编辑 1 | 冻结，待 B11-05 | M |
| UX-23 | P1 | /admin/models、/admin/audit-logs | `UX23-admin-audit-1440.png` | `ModelsTable.tsx:77`、`AuditLogsTable.tsx:39-42`（分页/筛选仅 useState） | 主流后台：筛选可分享可刷新 | 翻页/筛选后刷新丢失 → URL 保持 | 冻结 | M |
| UX-24 | P1 | 管理端 9 页 | — | 见 `a11y.txt` select-name/label | WCAG 4.1.2 | critical 13 节点 → 0 | 给筛选 select/date 加 `aria-label` | S |
| UX-25 | P1 | /admin/models 三主题 | `UX25-theme-admin-models-3themes.png`；对照 `UX25-theme-home-3themes.png` `UX25-theme-models-3themes.png` `UX25-theme-console-3themes.png` | `ModelsTable.tsx:356`；`static.txt` §2（admin 色板 1148） | UI §2.2 主色随主题 | 彩色元素随主题变色：首页 93/102、/models 15/32、控制台 20/28、/admin/models 9/71 → 主色元素 100% 跟随 | 主按钮走 `Button`/`var(--primary)` | M |
| UX-26 | P1 | 管理端 IA | `UX26-admin-logs-tabs.png` `UX26-admin-configs-bloat.png` | `components/admin/LogsBoard.tsx:7,28`（审计 Tab 复用 AuditLogsTable）；`lib/admin-nav-default-tree.ts`（提供商管理/模型提供商）；`app/(admin)/admin/configs/page.tsx`（10 个编辑器） | 一个功能一个入口 | 重复入口 4 组；/admin/configs 交互元素 404 → 拆分 | 见 §5 | M |
| UX-27 | P2 | 管理端 | `UX22-admin-models-1440.png` `UX23-admin-audit-1440.png` | `app/(admin)/admin/models/page.tsx:23`（isActive/visibility…）；`AuditLogsTable.tsx:30`（ai_models…） | 后台面向运营的中文 | 说明/筛选项暴露字段名与表名 → 中文业务名 | 冻结 | S |
| UX-28 | P2 | /admin · 390 | `UX28-admin-390.png` `UX28-admin-390-drawer.png` | `AdminMobileNav.tsx`（汉堡 24×36） | 触控 ≥44px 推荐 | 24×36 → 44×44 | 冻结 | S |
| UX-29 | P1 | /pricing、/news · 1440/390 | — | `perf.txt`；`app/(site)/news/page.tsx:30-38`（推断） | Web Vitals CLS ≤0.1 | /pricing 0.346、/news 0.170/0.414 → ≤0.1 | /news 去 Suspense 回退高度差；/pricing 待归因 | M |

## 4. 关键旅程（Playwright 实跑，`.scratch/ux/journeys.mjs`）

| 旅程 | 步数 | 卡点 / 读数 |
|---|---|---|
| U1 首页→模型详情（1440） | 3（打开+2 次点击） | 通；详情页无 H1（UX-12） |
| U2 天梯对比 3 个模型 | 5 | 通；Dock「对比篮（3/6）」→ /evaluations/new；新建页 1000 个 chips（UX-08） |
| U3 注册/登录 | 6 | 空提交走浏览器原生气泡；错误口令「凭据无效」；提交中按钮禁用 ✓；落点 /user/console |
| U4 控制台建密钥→看余额 | 8 | 明文一次性展示 ✓、删除有二次确认 ✓；切 tab 不进 URL、刷新回默认（UX-16）；文案「删除后立即可用」（UX-10）；测试密钥已删除还原 |
| U5 搜资讯（1440） | 3 | 输入 250ms 后分组结果，↓+Enter 直达 ✓ |
| U6 移动端 U1/U5（390） | 3 / 4 | 通；天梯卡出现 16px 宽卡（UX-06） |
| A1 模型 新增/编辑/删除 | 4 | 新建弹窗 8 字段，空提交「请选择」✓；**无编辑入口**；翻页不进 URL（UX-22/23）；未落库写入 |
| A2 调价 | — | 未执行（为免改动演示价格；PricesManager 已由 B11 系列覆盖） |
| A3 发布公告 | 1 | 入口齐全（新建/编辑/置顶/撤回/删除）；未落库写入 |
| A4 审计筛选 | 2 | 筛选项为英文表名；筛选不进 URL，刷新丢失（UX-23/27） |
| A5 移动端侧栏（390） | 3 | 汉堡 24×36；跳转后抽屉自动关闭 ✓ |

## 5. 臃肿清理建议（取舍项，等待裁定）

| # | 对象 | 选项 A | 选项 B | 选项 C | 我的倾向 |
|---|---|---|---|---|---|
| 1 | `/oauth/dev/callback` | 删除：零维护；SSO 联调需临时起本地页 | 仅 `NODE_ENV!=='production'` 挂载：联调照用，生产 404；多一个环境分支 | 保留 + `noindex`：改动最小；生产仍回显 code | B |
| 2 | 日志中心「审计」Tab vs `/admin/audit-logs` | 去掉日志中心审计 Tab：入口唯一；日志中心少一类 | 删 `/admin/audit-logs` 页：侧栏少一项；审计深链失效 | 保持：两处同表，筛选态不同步 | A |
| 3 | 「提供商管理」(/admin/vendors) vs「模型提供商」(/admin/providers) | 改名「厂商管理」/「服务平台」：零迁移 | 合并一页两 Tab：入口少；牵涉两套 API | 保持 | A |
| 4 | 调账：用户详情抽屉 vs `/admin/wallets` | 只留钱包页：资金操作集中；查用户时多跳一次 | 只留抽屉：路径短；钱包页只读 | 保持两处：易漏审 | A |
| 5 | 首页「模型能力入口」4 卡 | 保留，「API 平台详情入口」改指 /providers：修名实不符 | 删此区块：首页短一屏；/ladder 失去唯一入口（需先做 UX-17） | — | A |
| 6 | `/admin/configs` 10 个编辑器 | 拆为「站点内容」「系统参数」两页：单页交互元素 404→约 200 | 页内 Tab：URL 不变；仍一次加载 | 保持 | B（冻结期后） |
| 7 | 能力矩阵 / 协议矩阵 | 合并「兼容矩阵」两 Tab（B11-03b 后） | 保持两页 | — | A |
| 8 | 控制台「兑换码兑换」按钮 | 删，余额卡即入口 | 保留 | — | A |

## 6. 样板修复（S5，已验证已还原）

- 改动：`SiteHeader.tsx:113,121` `md:`→`xl:`；`MobileNav.tsx:40` `md:hidden`→`xl:hidden`（diff 存 `.scratch/ux/sample-fix-UX01.diff`）。
- 读数：768 / 1024 / 1280 / 1440 / 390 五宽 × 4 页溢出全部 ≤0（原 768=103）；`lg` 方案在 1024 导航逐字竖排（`UX01-sample-fix-lg-1024-wrap.png`），故取 `xl`（`UX01-sample-fix-xl-1024.png`）。
- 还原：`git checkout -- SiteHeader.tsx MobileNav.tsx`，`git status` 仅剩本证据目录。

## 7. 三个独立批次（文件不相交，可并行）

**批次 A｜用户端外壳与版式（可立即开工）**：UX-01、UX-13（只在 `globals.css @theme` 重映射 slate-400，不逐文件改类名）、UX-15（仅 PageHero/PagePlaceholder）、UX-17、UX-19，及 UX-14 的页头/页脚/首页分隔线部分。
文件：`components/site/SiteHeader.tsx` `MobileNav.tsx` `SiteFooter.tsx` `GlobalSearch.tsx` `components/common/PageHero.tsx` `PagePlaceholder.tsx` `app/(site)/page.tsx` `app/globals.css` `lib/navigation.ts`。验收：768 溢出 0；PageHero/PagePlaceholder 两组件 H1 ≤32；用户端 axe color-contrast 降 ≥80%。

**批次 B｜用户端状态与数据页（可立即开工）**：UX-02、03、05–12、14（页面容器部分）、15（`models/page.tsx:70`、`news/[slug]/page.tsx:52` 两处 H1）、16、18、20、21、29。
文件：`app/(site)/evaluations/**` `app/(site)/announcements/page.tsx` `lib/features/announcements/repository.ts` `app/(site)/pricing/page.tsx` `app/(site)/models/page.tsx` `app/(site)/models/[slug]/page.tsx` `app/(site)/news/**` `app/(site)/user/**` `components/ladder/**` `lib/features/ladder/matrix-layout.ts` `components/evaluations/**` `components/console/**` `components/auth/AuthForm.tsx` `lib/features/auth/service.ts` `app/oauth/dev/**`。验收：注入 500/断网三页出错误态；390 价格列可见；/ladder 首屏≥1 卡。

**批次 C｜管理端（冻结，等待 B11-05 完成后开工）**：UX-04、22–28。
与在途任务的重叠文件：
- B11-03（任务卡标题 B11-03，证据目录 EVD-B11-03b）：`CapabilityMatrix.tsx`（UX-04）、`ProtocolMatrix.tsx`（UX-26 合并）
- B11-04b：`ProductsManager.tsx` `VendorsManager.tsx`（UX-26 改名） `MenuManager.tsx` `HomeContentEditor.tsx` `DocsEditor.tsx`（UX-26 configs 拆分）
- B11-05：`AnnouncementManager.tsx` `AuditLogsTable.tsx` `ScriptsManager.tsx` `ApiStationManager.tsx` `BenchmarksManager.tsx` `CandidateManager.tsx` `IntelligenceDashboard.tsx`（UX-04/23/27）、`ModelsTable.tsx`（UX-22/23/25）、`LogsBoard.tsx`（UX-26）
- 在 B11-05 范围（`components/admin/*.tsx`）内但未被点名：`AdminMobileNav.tsx`（UX-28）；完全不重叠：`app/(admin)/admin/models/page.tsx`（UX-27）、`lib/admin-nav-default-tree.ts`（UX-26 改名）

## 8. 文档修订建议

1. 《UI设计文档》§2.2「靛蓝（默认）」→ 代码默认 teal（`app/globals.css:30`、`stores/uiStore.ts:37`），二择一定稿。
2. 《UI设计文档》§2.3 刻度 13/14/16/20/24/32 与实际 Tailwind 刻度（12/18/30/36 大量使用：/models 12px 117 处、10px 142 处）不符：建议在 `globals.css @theme` 定义 6 档字号令牌，或把 12 列为「辅助」档写进文档。
3. 《UI设计文档》§2.4 卡片 `rounded-lg` 实际值为 16px（`globals.css:40`），写明数值；M-WIDE 全宽条款补「页头/页脚同宽」验收读数。
4. 《界面交互文档》§一 一级导航仍写「首页/模型/产品…」，与 §十一、需求 §3.11、`lib/navigation.ts` 的「资讯」不一致。
5. 《界面交互文档》§三 3.1「/models 无 H1/介绍文案」与现状英雄卡（`app/(site)/models/page.tsx:62-71`）及 §十一「页头居中」互相矛盾。
6. 《界面交互文档》§三 2.4（顶格=最高分取整）与 2.3 v2.1（顶格恒 100）冲突，代码按后者（`matrix-layout.ts:9`）；需裁定，关系 UX-07。
7. 《界面交互文档》§七「五个板块：…平台密钥/自有密钥…」→ 现为 7 个 Tab「模型配置/免费额度/平台渠道/外部渠道/调用测试台/统计报表/我的收藏」。
8. 《界面交互文档》§六 响应式断点按 UX-01 结论改为「<1280 抽屉导航」。
9. 《需求文档》§3.1 两类榜单补「云服务天梯图」导航入口要求（UX-17）。
