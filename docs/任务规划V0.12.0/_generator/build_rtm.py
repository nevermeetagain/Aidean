#!/usr/bin/env python3
"""Generate rtm.json + rtm_summary.md (read-only audit of /workspace/work/Aidean @3b9f88c)."""
import json, re, collections

SRC = "../../任务规划V0.10.0/03a_统一需求追溯矩阵.md"
rows = {}
order = []
in_matrix = False
for line in open(SRC, encoding="utf-8"):
    if line.startswith("## 矩阵"): in_matrix = True; continue
    if line.startswith("## 未实现"): in_matrix = False
    if in_matrix and line.startswith("| REQ-"):
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        rid, prio, src, title, st = cells[0], cells[1], cells[2], cells[3], cells[4]
        rows[rid] = dict(id=rid, title=title, source_doc=src, priority=prio, prior_status_v010=st.strip("*"))
        order.append(rid)
assert len(order) == 115, len(order)

# (status, area, evidence, missing, notes)
V = {}
def v(i, status, area, evidence, missing="", notes=""):
    V[i] = (status, area, evidence, missing, notes)

# ---------------- ladder ----------------
v("REQ-F-001","done","frontend","app/api/v1/ladder/route.ts; app/(site)/models/page.tsx; app/(site)/ladder/page.tsx")
v("REQ-F-002","done","frontend","components/ladder/VersionSwitcher.tsx; LadderBoard.tsx")
v("REQ-F-003","done","frontend","components/ladder/LadderBarChart.tsx; LadderBoard.tsx")
v("REQ-F-004","done","frontend","LadderBoard.tsx toolbar rows (行1/行2/行3 controls present)","","三行布局仅静态核对，本审计未做运行态截图比对")
v("REQ-F-005","done","frontend","components/ladder/LadderFilterBar.tsx（五组、开源/闭源并入标签）")
v("REQ-F-006","done","backend","lib/features/ranking/formula-parser.ts; ladder route 接收公式")
v("REQ-F-007","done","frontend","components/ladder/GranularitySelector.tsx; lib/features/ladder/matrix-layout.ts:147-157 computeAxisTop","","轴顶规则已由 UX-07 改为『最高分上取整对齐 g、≤100』（替代 v1.8『顶格恒 100』）；matrix-layout.ts:9 文件头注释仍写『顶格恒 100』")
v("REQ-F-008","done","admin","packages/shared/src/schemas/admin.schema.ts:258 priority int 1..99; lib/features/ladder/config.ts:36 setLadderGranularity→clampGranularity; app/api/v1/admin/ladder/config/route.ts")
v("REQ-F-009","done","frontend","components/ladder/LadderMatrixBoard.tsx:690『到底了 · 已展示全部 N 个条目』; components/site/SiteFooter.tsx:39-40 LADDER_PATHS 不渲染页脚")
v("REQ-NF-012","done","frontend","components/site/SiteFooter.tsx:39-40（/models、/ladder 无页脚）; e2e/ladder-no-footer.spec.ts（TASK-084）")
# ---------------- detail ----------------
v("REQ-F-010","done","frontend","app/(site)/models/[slug]/page.tsx:37-41 TOC（含『在哪里可调用』）; components/models/BenchmarkDialog.tsx（@aidean/ui Dialog）; components/models/EvaluationExamples.tsx; page.tsx:336 H1","","测评示例取最近 3 条（page.tsx:143 take:3），《界面交互文档》§四写『默认最近 10 条』")
v("REQ-F-059","done","frontend","components/models/BenchmarkDialog.tsx:81-139（分项、来源、版本、测试日期、核验）; EvaluationExamples.tsx; e2e/web/model-detail-benchmark.spec.ts（TASK-075）")
v("REQ-L-013","done","frontend","同 REQ-F-059：占位已被 EvaluationExamples 替换（page.tsx:562-568）")
v("REQ-F-011","done","backend","U-15 新口径：lib/features/gateway/repository.ts:41-58 normalizePriceRow→CNY + getDailyFx; lib/features/pricing/{effective-price,fx}.ts; middleware.ts x-display-currency; app/(site)/pricing/page.tsx:8-11,191-195『价格待核』; prisma model FxDailyRate","","原文『¥5=$1』已作废（需求文档 v1.18 §3.2）。运行态依赖 fx_daily_rates 有行（fx_daily 已登记 ScheduledScript seed.ts:324）；『展示价与官方一致』见冲突 C-1")
v("REQ-F-060","done","backend","lib/features/gateway/service.ts:710-737（cachedTokens×priceCache，缺缓存价回退输入价；Anthropic cache_read 另计）")
v("REQ-F-063","done","backend","TASK-097 天梯/详情读侧随生效价切换；lib/features/pricing/effective-price.ts isActivePromotion/pickEffectivePrice")
v("REQ-F-038","done","backend","app/api/v1/admin/prices/promotions{,/[id]}; effective-price.ts:51-63; e2e/tests/promotion-billing.spec.ts（TASK-030 优惠 0→零扣费）","","R10-03：绕过 API 直写 model_prices 仍可造重叠窗口（无 DB EXCLUDE 约束），已登记未修")
# ---------------- eval / products ----------------
v("REQ-F-012","done","backend","components/site/CompareDock.tsx; lib/features/evaluation/service.ts:209-214 captureHold perModelMinor×okCount")
v("REQ-F-013","done","frontend","app/(site)/evaluations/page.tsx; app/api/v1/evaluations/demo/route.ts")
v("REQ-F-014","done","frontend","app/(site)/products/[slug]/page.tsx; packages/shared ProductIntroSchema")
v("REQ-F-015","partial","data","prisma/seed.ts:857,896,935 产品链接仍指向 github.com/aideanew；AideanWiki 为裸 IP http://36.134.158.50:10001","运营在后台配置正式入口 URL（待运营/正式域名）","非代码缺口，属运营数据")
v("REQ-F-016","frozen","frontend","packages/shared/src/schemas 无 screenshots 字段（grep 0）；TASK-044/045/046 延后","Product.intro.screenshots 契约 + 画廊 UI + 后台编辑","U-4：做，排末批，素材到位后下发")
v("REQ-F-017","unclear","frontend","app/(site)/products/[slug]/page.tsx 标题现状未裁定","台账 §7.13 D1 双语 vs 英文原名未裁决","暂不执行")
# ---------------- data supply ----------------
v("REQ-F-018","done","admin","app/api/v1/admin/{models,benchmarks,prices}（POST/PATCH/DELETE）+ writeAudit")
v("REQ-F-019","done","data","prisma/migrations/20260925170000_align_unique_indexes（model_prices is_current 部分唯一索引）")
v("REQ-F-020","done","backend","lib/features/ladder/repository.ts:222 benchmarks where verifiedStatus:1; BenchmarkDialog 演示数据提示; models/[slug]/page.tsx:171-189 isDemo")
v("REQ-F-021","not","backend","lib/sync/cross-validator.ts：grep -i weight|fusion|融合 = 0","加权融合计算（仅有冲突检测）","台账 #34 暂不执行（需第二数据源积累）")
v("REQ-F-053","frozen","data","prisma/seed.ts 仍统一写 verifiedStatus:1（演示豁免）；无审核清单/脚本","上线前逐条人工审核门禁（TASK-083）","U-3 冻结")
v("REQ-F-054","done","data","field-ownership.spec.ts（EVD-086 复核 PASS）","","未在真库重测")
v("REQ-F-055","done","data","change-log-coverage.spec.ts（EVD-086 复核 PASS）; lib/features/admin/model-change-log.ts")
v("REQ-F-061","done","admin","app/api/v1/admin/prices/batch-upsert/route.ts:4-9（≤500 行、requestId 重放 replayed=true）")
# ---------------- auth / user ----------------
v("REQ-F-022","done","backend","app/api/v1/auth/{register,login}; lib/features/auth/tokens.ts")
v("REQ-F-023","done","backend","lib/features/auth/constants.ts:16-19 ACCESS 15min / REFRESH 7d（运行时读 security.* 可配）","","需求已按 U-1 改写为 15min+7d；《功能设计文档》§3.3 仍写 Access(24h)")
v("REQ-F-024","frozen","backend","app/api/v1/wechat/qrcode/route.ts:13-24 注释桩；components/auth/AuthForm.tsx:51-56,235 未启用整块隐藏","扫码状态机/回调/换票全链路（登录方案 M2-A）","U-11 暂停")
v("REQ-F-057","done","backend","app/api/v1/auth/email/{code,verify}")
v("REQ-F-025","done","admin","app/api/v1/admin/{tier-mappings,free-quotas}（含 batch）；schema RefreshCycle DAY/WEEK/MONTH")
v("REQ-F-026","done","frontend","packages/shared/src/constants/billing.constants.ts:43-47 RECHARGE_TIERS 10/55/115/600/2500; app/(site)/pricing/page.tsx:382")
v("REQ-F-027","frozen","backend","仅 app/api/v1/billing/recharge-orders/[id]/mock-pay；《支付渠道集成指南》§1 现状为桩","微信/支付宝 PayChannel 实现 + 回调路由","U-11 暂停；现阶段以兑换码/后台调账入账")
v("REQ-F-028","done","backend","lib/features/billing/service.ts captureHold / void")
v("REQ-F-029","done","frontend","app/(site)/user/balance/page.tsx（按日期分组）")
v("REQ-F-030","done","backend","errors INSUFFICIENT_BALANCE=40001")
# ---------------- gateway ----------------
v("REQ-F-031","done","backend","app/api/v1/user/station-keys; admin/partner-keys; lib/features/gateway/repository.ts:231-247 Key 失败计数/冷却","","用户自有 Key（UPSTREAM 分支）暂不支持流式：service.ts:1136")
v("REQ-F-032","done","backend","lib/features/gateway/service.ts:73-109 降级候选链 + FREE_FALLBACK_PRIORITY=100 free 兜底")
v("REQ-F-033","done","frontend","components/console/GeneralForm.tsx; ProPrioritiesList.tsx")
v("REQ-F-062","done","backend","tier-order.spec.ts（固定序 + 默认映射 1/2/3/4）")
v("REQ-F-034","done","backend","packages/shared/src/utils/billing.ts calcCharge；公开路由不序列化 markupRate","","见冲突 C-1（展示『官方价』vs 隐藏加价率）")
v("REQ-F-035","done","backend","lib/features/gateway/repository.ts listActivePackageStations; service.ts:1331-1332 billingPath PACKAGE")
v("REQ-F-036","done","backend","lib/features/gateway/adapters.ts; app/api/v1/gateway/chat/route.ts")
v("REQ-F-037","done","backend","app/api/v1/user/custom-channels; components/console/ApiChannelsPanel.tsx","","《界面交互文档》§七『保存时自动测连通并回显』未实现，见 REQ-N-012")
v("REQ-F-039","done","backend","lib/features/package/**; listActivePackageStations")
v("REQ-F-040","done","admin","app/api/v1/admin/redemption-codes{,/batch,/batches,/batches/[id]/disable}")
# ---------------- flags / admin ----------------
v("REQ-F-041","done","backend","components/common/FeatureDisabled.tsx（models/ladder/providers/evaluations/new 页面接入）; lib/features/flags/service.ts; lib/navigation.ts collectDisabledPages; EVD-092 运行态","","读取失败 fail-open（flags/service.ts:6,28）口径仍待 U-7 裁决")
v("REQ-F-042","done","admin","app/api/v1/admin/feature-flags{,/[id]} GET/PATCH; app/(admin)/admin/feature-flags")
v("REQ-F-043","unclear","frontend","仅 seed 开关键 chat.support；全仓无客服组件；CompareDock 无客服 Tab","需求只作开关示例，是否要做客服未定义","与 REQ-N-011 Dock 三 Tab 相关")
v("REQ-F-044","done","admin","admin models/users POST + [id] DELETE；benchmarks POST；app/(admin)/admin/audit-logs","","models/users/prices 等 26 条单资源 GET 未补（Q-11-03 选 B，非本需求）；prices/[id] 无 DELETE")
v("REQ-F-045","done","admin","writeAudit 覆盖 admin 写路由（未逐路由穷举）")
v("REQ-F-046","done","backend","序列化白名单；公开路由 grep markupRate 0")
v("REQ-F-047","done","admin","app/api/v1/admin/ranking-weights/route.ts revalidatePath('/models')")
# ---------------- nav / home ----------------
v("REQ-F-048","done","frontend","lib/navigation.ts:34-56 NAV_ITEMS 八项（首页/资讯/产品/价格/文档/路线图/合作/关于）；产品下拉含 /models /providers /ladder","","需求已按 U-2 改为以代码为准")
v("REQ-F-049","done","frontend","components/home/{HeroBanner,PlatformIntro,ModelSection,ProductSection,RoadmapSection,PartnerMarquee,AboutSection}.tsx; app/(site)/page.tsx RevealOnScroll")
v("REQ-F-050","done","frontend","components/home/PartnerMarquee.tsx（reverse 行交替）")
v("REQ-F-051","done","frontend","app/(site)/pricing/page.tsx:2 三锚区块（gateway-pricing / recharge-tiers / product-tiers）","","权益徽标与 DB 一致性未核（REQ-L-010）")
v("REQ-F-052","done","frontend","app/api/v1/user/favorites{,/[id]}; components/site/FavoriteButton.tsx; components/console/FavoritesPanel.tsx; EVD-092")
# ---------------- constraints ----------------
v("REQ-C-001","done","frontend","app/globals.css :root teal 默认 + data-theme 变体；全仓 tsx 中 'dark:' 仅 2 处注释（CompareDock.tsx:8, GlobalSearch.tsx:19）")
v("REQ-C-002","done","frontend","app/api/v1/search/route.ts; components/site/GlobalSearch.tsx（U-5=A）")
v("REQ-C-003","done","frontend","components/site/SiteHeader.tsx 无顶部数据条（静态核对）")
v("REQ-C-004","done","frontend","app/(site)/page.tsx revalidate=300")
v("REQ-C-005","done","infra","playwright baseURL 3000；Dockerfile EXPOSE 3000；apps/web/package.json dev/start 依赖 Next 默认 3000（无显式 -p）")
v("REQ-C-006","partial","data","prisma/seed.ts:365 wechat-rag 回调 localhost:3200（符合 P-1/P-2=A）","e2e/web/sso-3333.spec.ts 与 lib/features/auth/__tests__/oauth-redirect-origin.spec.ts:45-65 仍以 3333 为前提，与『3333 不保留』裁决矛盾；需删改或标注环境门控","")
v("REQ-C-007","done","infra","apps/web/package.json next 15.5.28、prisma ^6.19.3、tailwindcss 4.0.0；docker-compose.prod.yml postgres:16-alpine、redis:7-alpine")
v("REQ-C-008","partial","docs","check-docs-rule PASS；但大量文档远超 3000 字未拆：docs/plans/未完成事项目录.md 39,141 B、docs/任务规划V0.11.0/25_执行记录.md 211,903 B、00_深度分析.md 139,377 B","铁律6 超 3000 字拆分")
v("REQ-NF-001","done","infra",".github/workflows/ci.yml:50-56 contract generate + drift；check-docs-facts 16/16（v120/check-docs-facts.log）","","U-25=B：Actions 不开启，CI 仅本地复现")
v("REQ-NF-002","done","backend","app/api/v1/system/ready/route.ts（50010→503）; lib/features/system/__tests__/readiness.spec.ts","","真实依赖宕机场景未实测")
v("REQ-NF-003","frozen","infra","无生产部署记录；deploy/scripts 仅 .gitkeep","生产部署实弹（TASK-043）","U-3 冻结")
v("REQ-NF-004","frozen","infra","scripts/db/backup.sh、restore.sh 存在（restore.sh:58 仅表数计数）","逐表行数比对 + 演练记录（TASK-042）","U-3 冻结")
v("REQ-NF-005","partial","infra",".github/workflows/ci.yml:131-236 e2e-skeleton job；根 playwright.config.ts 单套配置（TASK-037）","e2e 从未在 CI 真库执行（U-25=B 不开 Actions，仅 TASK-006 本地复刻）")
v("REQ-NF-006","done","infra","ci.yml:45-48 guard run-all（root-pollution/secret-scan/module-boundary/port/api-method/pagination）、:67-69 lint、:71-79 shared/ui/web 单测","","U-25=B：只在本地跑；本审计同 HEAD 复跑 run-all 6/6 PASS（v120/run-all.log）")
v("REQ-NF-007","done","infra","TASK-039 真实基线 p50 147.64 / p95 191.31 ms（EVD-039，c9ce67b）","","只测量不设阈值")
v("REQ-NF-008","done","infra","TASK-038 coverage-v8 基线 Lines 67.06% / Branches 79.7%")
v("REQ-NF-009","frozen","infra","middleware.ts 公开基址；app/oauth/authorize/route.ts:80-86","发布环境契约 + 回滚验收两文档（TASK-052），harden-rc02 checklist 16 项未勾","代码部分已落，剩余 U-3 冻结")
v("REQ-NF-010","partial","backend","lib/features/oauth/backchannel.ts（2 次重试/5s）","seed 中无任何 client 配置 logoutUri；《子平台SSO接入指南》§10.1 三个子平台 logout 端点 ⬜ 未验收","依赖子平台提供端点")
v("REQ-NF-011","partial","backend","lib/features/auth/session.ts:53-66 requireUserApi 回库 status/deletedAt","未比对 tokenVersion(ver)；改密全端失效依赖 access 15min 自然过期","暂不执行")
# ---------------- ledger / governance ----------------
v("REQ-L-001","not","admin","app/(admin)/admin/tools 不存在；e2e/admin/tools.spec.ts:66-67 describe.skip","skills/mcp/agents 三页（同 R-80）","暂不执行 P2")
v("REQ-L-002","partial","data","LedgerEntry 无 note 列（schema.prisma:1026-1048）；备注仅入 audit","ledger 分录备注列","暂不执行")
v("REQ-L-003","not","data","UsageDailyStat 仅 requestCount/quotaMinor/promptTokens/completionTokens（schema.prisma:976）","扩列与回填（独立立项）","暂不执行")
v("REQ-L-004","not","docs","apps/web/docs/index.json 存在但仓内无生成脚本（仅 check-docs-rule 校验其存在）","index.json 生成器","暂不执行")
v("REQ-L-005","unclear","docs","待决事项决策说明 §二 #23 未拍板","check-tables.mjs 最终位置","")
v("REQ-L-006","unclear","docs","主平台无 BotHot 台账；P-1/P-2 已裁决维持 3200","BotHot 正式台账","")
v("REQ-L-007","done","docs","TASK-051：台账 #17/#36 单一 ✅（需求追溯矩阵.md 入库后改判表）")
v("REQ-L-008","partial","docs","未勾选项：establish-dev-workflow/tasks 33、finalize-admin-ia/checklist 21、harden-rc02/checklist 16、rebuild-admin/tasks 15+checklist 6 等","spec 勾选与代码事实对齐")
v("REQ-L-009","partial","docs","docs/product/requirements/需求追溯矩阵.md v1.0 入库并被需求文档链接；check-docs-facts rtm-row-count=158","矩阵为 V0.10.0 快照：V0.11.0 B11-RTM 再生成未做（docs/任务规划V0.11.0 无 03a），大量行状态已过期（如 F-011/F-059/M-013 仍记未实现）","见 REQ-N-031")
v("REQ-L-010","unclear","frontend","pricing/page.tsx #product-tiers 存在；未在运行态与 DB 对账","权益徽标 vs DB 一致性运行态核对")
v("REQ-L-011","unclear","frontend","全仓 web3 0 命中；报错栈在浏览器扩展","待截图出处")
v("REQ-L-012","partial","frontend","非 admin 组件 22/60 引用 @aidean/ui（grep -rl components/ 排除 admin）","其余 38 个非 admin 组件","暂不执行")
v("REQ-L-014","done","admin","TASK-084：台账 #19 回写 ✅，余 3 缺口转 #35/#43（未完成事项目录 v2.39 版本头）")
v("REQ-L-015","done","infra","origin = nevermeetagain/Aidean，main 与 origin/main 同步（git status -sb）；B-0' 已裁决 A'","","他线 aideanew/huaweicloud 内容本沙箱不可核")
v("REQ-L-016","done","docs","docs/任务规划V0.5.0 文件名 0 处双编码；201 条相对链接 0 失效（本审计 python 扫描）")
# ---------------- monitoring ----------------
v("REQ-M-001","done","data","prisma model MonitoringSource（schema.prisma:2248）；seed.ts:1226-1239 5 源 upsert")
v("REQ-M-002","partial","backend","lib/monitoring/catalog/{openrouter,aihubmix,quanzil}.ts 三个公开源 collector；scripts/crawl/monitor_catalogs.ts；apps/web/package.json:31 crawl:monitor","默认无『每日自动』：seed ScheduledScript 仅 crawl_models/update_ranking/crawl_llmtest/fx_daily（seed.ts:307-324），未登记 monitor_catalogs；MonitoringSource.cadenceCron 无任何调度消费者；authRequired 源仅 console.warn 跳过（monitor_catalogs.ts:449-451），未写 credential_missing 健康态","")
v("REQ-M-003","done","data","CatalogSnapshot（schema.prisma:2279：@@unique[sourceId,rawSha256]、rawSample VarChar(2048)、rawBytes）")
v("REQ-M-004","done","data","ProviderModelObservation（schema.prisma:2300）；TASK-098 空 items 不下架/分批 upsert（cb49b70）")
v("REQ-M-005","done","data","CatalogChangeEvent（schema.prisma:2328：kind listed/delisted/model_first_seen/price_changed、snapshotId、sourceUrl、deltaPct）；lib/monitoring/diff/{detect,persist}.ts")
v("REQ-M-006","partial","backend","app/api/v1/models/[id]/offerings/route.ts; lib/monitoring/offerings.ts; components/models/ModelOfferings.tsx","公开接口仅放行 tosStatus∈{allowed,attribution_required}（offerings.ts:25），而 seed 全部源 tosStatus='pending'（seed.ts:1237）且 U-M6 未裁决 → 默认部署下多源观测对外为空","B11-07 的 25 模型有行来自人工挂载 ProviderModelOffering")
v("REQ-M-007","done","backend","lib/discovery/pricing-extraction.ts:10,24,254-262 getDailyFx（缺汇率 fail-closed）；FxDailyRate（schema.prisma:2354）","","ModelOfferings.tsx:9 注释仍写『U-15 未决前不出现 ¥ 换算』")
v("REQ-M-008","partial","data","TASK-073 llmtest composite→ReliabilityObservation 映射；TASK-099 幂等键口径","全仓无 reliabilityObservation.create/upsert 写入路径；无自有探针（U-M3=B）")
v("REQ-M-009","partial","backend","monitor_catalogs.ts:5-10 逐源 try/catch、lastStatus/lastError；admin/monitoring 页展示","未接入 ScheduledScript + scheduler sidecar（见 M-002）","")
v("REQ-M-010","done","infra","scripts/guard/secret-scan.mjs（run-all PASS）；当前无 keyed 源；run 路由对 authRequired 直接 50012")
v("REQ-M-011","partial","admin","app/api/v1/admin/monitoring/sources/[key]/route.ts:40-42 PATCH enabled/cadenceCron + audit；sources/[key]/run 202 + Redis SETNX 锁","手动运行端点只占锁不执行（run/route.ts:10『实际采集由调度侧执行』，全仓无 lock:monitor 消费者）；改频率不生效（cadenceCron 无消费者）")
v("REQ-M-012","done","backend","ERROR_CODES MONITOR_SOURCE_NOT_FOUND(20004) / MONITOR_SOURCE_CREDENTIAL_MISSING(50012)；API接口文档 §4 登记")
v("REQ-M-013","done","admin","app/(admin)/admin/monitoring; components/admin/monitoring/MonitoringPanel.tsx; e2e/admin/monitoring.spec.ts（TASK-065）")
v("REQ-M-014","done","backend","lib/monitoring/offerings.ts:90 relay→identityVerified=false；ModelOfferings.tsx:100-104『身份未验证』；discovery candidates promote 需人工")
v("REQ-M-015","partial","frontend","lib/sync/adapters/artificial-analysis.ts（经 OpenRouter 代理，sourceName='artificial-analysis'）；BenchmarkDialog.tsx:126 仅显示来源字段原值","U-M2 要求前台对 AA 指数署名：无『数据来源 Artificial Analysis』署名文案/链接（components/app grep 'Artificial Analysis' 0）")
v("REQ-M-016","cancelled","backend","TASK-071 已取消（U-M3=B 不做付费探测）；discovery/protocol-probe.ts 只探协议")
v("REQ-F-056","done","backend","oidc-redlines.spec.ts（PKCE S256 / refresh 重放撤链 / host-only）；lib/features/auth/repository.ts:167 refresh_replay 告警")
v("REQ-F-058","done","frontend","LadderFilterBar『全部』全选/全不选；e2e ladder-filter-all 4 passed（EVD-088）")

# ---------------- NEW requirements ----------------
NEW = [
 ("REQ-N-001","R-72 6 个未注册 sync adapter 注册并在 SyncManager 可选","docs/product/requirements/项目需求更新分析.md §三 R-72","P0","done","backend","lib/sync/sources/registry.ts:34-46 SYNC_SOURCES 11 源（含 epochai/llmstats/artificial-analysis/agentindex/skillsmp/smithery）","",""),
 ("REQ-N-002","R-73 check-docs-facts 期望值与 desc 一致","项目需求更新分析.md R-73","P0","done","infra","node scripts/check-docs-facts.mjs → All 16 assertions passed（v120/check-docs-facts.log）","",""),
 ("REQ-N-003","R-74 check-docs-facts Windows 可执行","项目需求更新分析.md R-74","P2","unclear","infra","V0.11 执行在 Windows 侧跑过 facts（25_执行记录），本沙箱为 Linux 无法复核","Windows 运行证据",""),
 ("REQ-N-004","R-75/R-76 free-quotas、tier-mappings batch 路由","项目需求更新分析.md R-75/R-76","P1","done","admin","app/api/v1/admin/free-quotas/batch/route.ts; tier-mappings/batch/route.ts","",""),
 ("REQ-N-005","R-77/78/79 非 admin 高可见度组件迁移 @aidean/ui","项目需求更新分析.md R-77~R-79","P2","partial","frontend","非 admin 22/60 组件引用 @aidean/ui","home/site/ladder 其余组件","与 REQ-L-012 同源"),
 ("REQ-N-006","R-81 deploy/scripts 目录决策（填充或移除）","项目需求更新分析.md R-81","P2","not","infra","git ls-files deploy/scripts → 仅 .gitkeep","决策与落地",""),
 ("REQ-N-007","R-82 facts 新增 batch 路由计数断言","项目需求更新分析.md R-82","P1","done","infra","scripts/check-docs-facts.mjs:157-161 batch-count = 15","",""),
 ("REQ-N-008","中/英语言切换即时生效（默认中文）","docs/product/design/界面交互文档.md §一/§六","(未标)","not","frontend","stores/uiStore.ts:4-46 仅有 lang 状态与 setLang；app/components 无任何调用 setLang 或读取 lang，无 i18n 文案","语言切换 UI + 文案国际化",""),
 ("REQ-N-009","右下角 Dock 三 Tab（收藏夹/对比/客服），可折叠不可关闭，受开关控制","界面交互文档 §五；功能设计文档 §四","(未标)","partial","frontend","components/site/CompareDock.tsx:15-30 仅对比篮，items=0 时整块不渲染，sm 以下隐藏","收藏夹 Tab、客服 Tab、常驻折叠态","客服见 REQ-F-043"),
 ("REQ-N-010","自定义渠道保存时自动测连通并回显","界面交互文档 §七","(未标)","not","frontend","app/api/v1/user/custom-channels/route.ts 仅 GET/POST 持久化；ApiChannelsPanel.tsx 无连通测试调用","保存后连通性探测与回显",""),
 ("REQ-N-011","余额不足自动切 free 时响应内轻提示","界面交互文档 §七","(未标)","partial","backend","service.ts:1000 响应头 x-aidean-billing-path（FREE_QUOTA 可识别）","面向用户的轻提示文案/前端呈现未找到","可视为头部已承载，需产品确认"),
 ("REQ-N-012","用户改密/重置密码（改密即 tokenVersion++ 全端失效）","docs/product/modules/子平台SSO接入指南.md §4 两级撤销","(未标)","not","backend","app/api/v1/auth 下无改密/重置端点；tokenVersion 仅在 admin 封禁时自增（admin/users/[id]/route.ts、users/batch/route.ts；auth/repository.ts:244 bumpTokenVersion）","用户改密/找回密码流程",""),
 ("REQ-N-013","Key 池故障 Key 自动摘除并告警","docs/product/design/功能设计文档.md §3.6","(未标)","partial","backend","lib/features/gateway/repository.ts:231-247 failureCount≥阈值→冷却/摘除","告警通道未找到",""),
 ("REQ-N-014","后台面板五态 + testid 基线（B11-05）","界面交互文档 §8.1；V0.11 07_ B11-05","验收目标","done","admin","components/admin/PanelState.tsx；admin-ui-audit：filesWithTestid=33、filesWithPanelState=20","filesWithoutErrorState=9、filesWithoutRetry=22（本审计跑 scripts/audit/admin-ui-audit.mjs）","达成卡面 ≥20 目标；非全量"),
 ("REQ-N-015","admin 原生表单标签全量迁移到 @aidean/ui（RK-11-10 余量）","V0.11 12_ RK-11-10","后续批","partial","admin","admin-ui-audit SUMMARY：rawButton 29 / rawSelect 18 / rawTextarea 8 / rawLabel 61 / rawTable 1，mixedFiles 0","剩余 37 个组件原生标签","B11-04b 仅锁定 18 文件归零"),
 ("REQ-N-016","非 2xx 出口统一信封（405+Allow、未匹配 /api 404 JSON）","V0.11 12_ Q-11-03=B（B11-10）","—","done","backend","app/api/[[...slug]]/route.ts；_lib/method-not-allowed；guard api-method-coverage PASS","26 条单资源 GET 未补（按裁决 B 不做）",""),
 ("REQ-N-017","列表端点分页参数有限性守卫统一（非法串 400）","V0.11 12_ Q-11-05=A（B11-11）","—","done","backend","lib/http/pagination.ts；scripts/guard/pagination-guard.mjs --strict PASS（P1 命中 0）","",""),
 ("REQ-N-018","游客浏览公开页 401 噪声为 0（不改 /auth/me 契约）","V0.11 Q-11-02=B（B11-06）","—","done","frontend","lib/features/auth/session-store.ts、session-hint.ts；hooks/useSession.ts；EVD-B11-06 6→0","",""),
 ("REQ-N-019","协议/能力矩阵运营化（CRUD + 错误态≠空态）","V0.11 Q-11-01=A（B11-03a/b）","—","done","admin","app/api/v1/admin/{protocols,capabilities}/[id]；components/admin/MatrixPanel.tsx；/admin/protocols 307→/admin/capabilities?tab=protocol","",""),
 ("REQ-N-020","日汇率采集可执行/可调度（B11-01）","V0.11 07_ B11-01","—","done","backend","apps/web/package.json:30 crawl:fx；scripts/crawl/fx_daily.ts；seed.ts:323-324 ScheduledScript","","缺汇率时不自动估算（fail-closed，RK-11-01）"),
 ("REQ-N-021","调度执行链与执行历史（B11-08）","V0.11 07_ B11-08","—","done","backend","lib/features/admin/script-executor.ts planScriptRun；app/api/v1/admin/scripts/[id]/executions","",""),
 ("REQ-N-022","容器内调度链可执行（RK-11-07）","V0.11 12_ RK-11-07（U-3 仅对本项解冻）","—","partial","infra","scripts/build/bundle-scripts.mjs → apps/web/scripts-dist（未入 git，构建产物）","真 docker build / alpine musl / nextjs 用户下运行未确认（沙箱无 docker）",""),
 ("REQ-N-023","业务 barrel 回归 ADR-0002 红线（B11-09）","V0.11 Q-11-04=A","—","done","infra","a02d8c1 拆 4 业务 barrel","","pnpm gates 需 pwsh，本审计未复跑"),
 ("REQ-N-024","EVD-UX-01 29 项 UI/交互修复（UX-01…UX-29）","docs/任务规划V0.11.0/06_validation/evidence/EVD-UX-01/report.md、retest.md","P0/P1/P2","done","frontend","retest.md：溢出 0、axe serious/critical 0、失败≠空态 0；抽查 SiteHeader xl:flex、oauth/dev/callback 生产 notFound、ApiKeysPanel.tsx:151『删除后立即失效』、navigation.ts:44 /ladder","HeroBanner 内部 max-w-6xl（非阻塞）；TBT 仅参考",""),
 ("REQ-N-025","合作页三产品介绍后台可配（封面/标题/小标题/描述/多图/说明/视频）","docs/archive/reference/补充.txt #2；design/合作产品内容配置.md","用户原始需求","done","frontend","SystemConfig partners.education/paper/research；SiteContentEditor；components/common/SafeImage.tsx","浏览器端持久化 e2e 未取证（合作产品内容配置 §核验边界）",""),
 ("REQ-N-026","关于页关键信息后台可配 + 图片格式/尺寸限制","补充.txt #3","用户原始需求","done","frontend","app/(site)/about/page.tsx:18-32 about.contactEmail / about.wechatQrUrl + isSafeMediaUrl；SafeImage 尺寸上限","",""),
 ("REQ-N-027","文档页非空、飞书/语雀式阅读","补充.txt #4","用户原始需求","done","frontend","components/docs/DocsReader.tsx；app/(site)/docs/page.tsx","","『美观』为主观项，未做评审"),
 ("REQ-N-028","资讯：可编辑并置顶《免费模型合集》、分类、Markdown 编辑","补充.txt 第二批 #1-#3","用户原始需求","done","admin","News.pinned/category/contentMarkdown（schema）；app/(site)/news/page.tsx:2 ?cat= 白名单 + 置顶首位；app/api/v1/admin/news","seed 未见《免费模型合集》条目（运营数据）",""),
 ("REQ-N-029","产品下拉前两项为模型天梯图、模型服务提供商","补充.txt #6","用户原始需求","done","frontend","lib/navigation.ts:41-42","",""),
 ("REQ-N-030","需求追溯矩阵按 V0.11.0 再生成（B11-RTM）","V0.11 07_ D.1.1 B11-RTM；30_ 队列 #6","—","not","docs","docs/任务规划V0.11.0 下无 03a；需求追溯矩阵.md 仍为 V0.10.0 快照（check-docs-facts rtm-row-count 锁 158）","再生成 + facts 期望同步",""),
 ("REQ-N-031","AideanBot 分级权益（普通用户仅文字解析且有额度；图文/视频/音频需 Pro+）","需求文档 §3.4","(未标)","unclear","backend","主平台仅展示（pricing #product-tiers）；能力在子平台外部仓","子平台仓库实现不在本仓可核",""),
 ("REQ-N-032","监控源条款核验结论（U-M6，决定 tosStatus 是否可对外）","需求文档 §3.4.2『仍待定』","—","unclear","data","seed.ts:1222,1237 tosStatus 恒 'pending'","U-M6 裁决",""),
 ("REQ-N-033","首页区块滚动渐入（禁止一次性渲染全部区块）","界面交互文档 §二","(未标)","done","frontend","components/home/RevealOnScroll.tsx；app/(site)/page.tsx:5,12","",""),
 ("REQ-N-034","后台入口在前台不暴露链接（路由仍可访问）","功能设计文档 §3.5","(未标)","done","frontend","components/site/SiteHeader.tsx、SiteFooter.tsx grep 'admin' 0","",""),
 ("REQ-N-035","功能开关读取失败策略（fail-open 待 U-7）","需求文档 §3.9","—","unclear","backend","lib/features/flags/service.ts:6,28 当前 fail-open","U-7 最终裁决",""),
]

out = []
for rid in order:
    r = rows[rid]
    st, area, ev, miss, notes = V[rid]
    out.append(dict(id=rid, title=r["title"], source_doc=r["source_doc"], priority=r["priority"], status=st,
                    evidence=ev, missing=miss, area=area, notes=notes, prior_status_v010=r["prior_status_v010"]))
for (rid,title,src,prio,st,area,ev,miss,notes) in NEW:
    out.append(dict(id=rid,title=title,source_doc=src,priority=prio,status=st,evidence=ev,missing=miss,area=area,notes=notes,prior_status_v010="(不在 RTM)"))
missing_v = set(order) - set(V)
assert not missing_v, missing_v
json.dump(out, open("rtm.json","w",encoding="utf-8"), ensure_ascii=False, indent=1)

# ---------- summary ----------
STATUSES = ["done","partial","not","unclear","frozen","cancelled"]
AREAS = ["frontend","backend","data","infra","admin","docs"]
cnt = collections.Counter(o["status"] for o in out)
grid = collections.defaultdict(collections.Counter)
for o in out: grid[o["area"]][o["status"]] += 1
pgrid = collections.defaultdict(collections.Counter)
def pnorm(p):
    p=p.upper()
    if "MUST NOT" in p: return "MUST NOT"
    if p.startswith("MUST"): return "MUST"
    if p.startswith("SHOULD"): return "SHOULD"
    if p.startswith("COULD"): return "COULD"
    return "其他/未标"
for o in out: pgrid[pnorm(o["priority"])][o["status"]] += 1
changed = [o for o in out if o["prior_status_v010"] not in ("(不在 RTM)",) ]
L=[]
L.append("# RTM V0.12.0 审计汇总（只读，Aidean main @ 3b9f88c）\n")
L.append("> 生成：2026-10-23 · 脚本 `/workspace/work/v120/build_rtm.py` · 明细 `rtm.json`（%d 条：RTM 115 + 新增 REQ-N %d）\n" % (len(out), len(NEW)))
L.append("> 口径：done=代码已实现且无已知代码缺口；partial=有实现但缺可点名部分；not=无实现；unclear=无法在本仓/本沙箱核实或需求未定；frozen=U-3/U-4/U-11 冻结或暂停；cancelled=已裁决取消。旧 RTM 的 158 行 = 115 主矩阵 + 43 行缺口复表（重复），本表按 115 去重。\n")
L.append("## 1. 按状态\n\n| 状态 | 条数 |\n|---|---|")
for s in STATUSES: L.append(f"| {s} | {cnt[s]} |")
L.append(f"| **合计** | **{len(out)}** |\n")
L.append("## 2. 按领域 × 状态\n\n| area | " + " | ".join(STATUSES) + " | 合计 |\n|---|" + "---|"*(len(STATUSES)+1))
for a in AREAS:
    L.append(f"| {a} | " + " | ".join(str(grid[a][s]) for s in STATUSES) + f" | {sum(grid[a].values())} |")
L.append("\n## 3. 按优先级 × 状态\n\n| 优先级 | " + " | ".join(STATUSES) + " |\n|---|" + "---|"*len(STATUSES))
for p in ["MUST","MUST NOT","SHOULD","COULD","其他/未标"]:
    L.append(f"| {p} | " + " | ".join(str(pgrid[p][s]) for s in STATUSES) + " |")
# status change vs V0.10
mp={"已实现":"done","部分实现":"partial","未实现":"not","待澄清":"unclear"}
ch=[o for o in out if o["prior_status_v010"] in mp and mp[o["prior_status_v010"]]!=o["status"]]
L.append(f"\n相对 V0.10.0 快照改判 **{len(ch)}** 条（主要因 V0.10/V0.11 卡与 UX-FIX 已合入 main）：" + "、".join(f"{o['id']}({o['prior_status_v010']}→{o['status']})" for o in ch) + "\n")

THEMES = [
 ("计价/计费", ["REQ-F-038"]),
 ("模型源监控（采集-调度-对外）", ["REQ-M-002","REQ-M-006","REQ-M-008","REQ-M-009","REQ-M-011","REQ-M-015"]),
 ("认证/SSO/账户安全", ["REQ-NF-010","REQ-NF-011","REQ-N-012"]),
 ("前台交互缺项（文档有、代码无）", ["REQ-N-008","REQ-N-009","REQ-N-010","REQ-N-011"]),
 ("网关运维", ["REQ-N-013"]),
 ("后台/组件规范余量", ["REQ-N-015","REQ-L-001","REQ-L-012","REQ-N-005"]),
 ("数据/账本", ["REQ-F-021","REQ-L-002","REQ-L-003","REQ-F-015"]),
 ("端口与测试资产", ["REQ-C-006"]),
 ("CI/基础设施", ["REQ-NF-005","REQ-N-022","REQ-N-006"]),
 ("文档治理", ["REQ-C-008","REQ-L-004","REQ-L-008","REQ-L-009","REQ-N-030"]),
]
byid={o["id"]:o for o in out}
L.append("## 4. 全部 not + partial（按主题，一行一缺口）\n")
seen=set()
for th, ids in THEMES:
    items=[byid[i] for i in ids if byid[i]["status"] in ("not","partial")]
    if not items: continue
    L.append(f"### {th}")
    for o in items:
        seen.add(o["id"]); L.append(f"- **{o['id']}** [{o['status']}/{o['priority']}] {o['title'][:60]} — 缺：{o['missing'] or o['notes']}")
    L.append("")
rest=[o for o in out if o["status"] in ("not","partial") and o["id"] not in seen]
if rest:
    L.append("### 其他")
    for o in rest: L.append(f"- **{o['id']}** [{o['status']}] {o['title'][:60]} — 缺：{o['missing']}")
    L.append("")
L.append("### 冻结 / 暂停（不计入缺口，恢复须用户裁决）")
for o in out:
    if o["status"]=="frozen": L.append(f"- {o['id']} {o['title'][:50]} — {o['notes']}；剩余：{o['missing']}")
L.append("\n### 待澄清 / 取消")
for o in out:
    if o["status"] in ("unclear","cancelled"): L.append(f"- {o['id']} [{o['status']}] {o['title'][:50]} — {o['missing'] or o['notes'] or o['evidence'][:80]}")
open("_summary_auto.md","w",encoding="utf-8").write("\n".join(L)+"\n")
print(dict(cnt), len(out), len(ch))
