# > 版本: v0.4 | 更新: 2026-10-14 | 变更: V0.4.0——承 V0.2.0 83 条（代码无 delta，复验背书）+ 新增 REQ-M-001..016 模型源监控需求（需求输入=用户链接+补充1/2，经核验）
# -*- coding: utf-8 -*-
# 字段：id, lvl(MUST/SHOULD/COULD/MUST NOT), src(来源文档§), stmt(可验证表述), st(实现状态), lab(证据标签), ev(证据), tasks, v1(V0.1.0 判定 → V0.2.0)
# 实现状态四分：已实现 / 部分实现 / 未实现 / 待澄清；用户已决策暂停的条目记为「未实现」+ 标签「暂不执行」
# 证据标签：已确认 / 部分确认 / 证据不足 / 待其他员工完成 / 存在缺陷 / 需要返工 / 暂不执行
RQ = "docs/product/requirements/需求文档.md"
LG = "docs/plans/未完成事项目录.md"
R = []
def r(id, lvl, src, stmt, st, lab, ev, tasks="—", v1="同 V0.1.0"):
    R.append(dict(id=id, lvl=lvl, src=src, stmt=stmt, st=st, lab=lab, ev=ev, tasks=tasks, v1=v1))

# ---------------- 功能需求（需求文档 v1.14）----------------
r("REQ-F-001", "MUST", f"{RQ} §3.1", "GET /api/v1/ladder?type=models|stations 两榜均返回 200 信封；/models 与 /providers 可渲染", "已实现", "已确认", "app/api/v1/ladder/route.ts；app/(site)/models、app/(site)/providers；next build 路由表含 /models", "015（站榜受开关控制）")
r("REQ-F-002", "MUST", f"{RQ} §3.1", "专业版/应用版切换即时生效", "已实现", "已确认", "components/ladder/VersionSwitcher.tsx、LadderBoard.tsx")
r("REQ-F-003", "MUST", f"{RQ} §3.1", "表格（默认）/柱状图两视图可切换", "已实现", "已确认", "components/ladder/LadderBarChart.tsx、LadderBoard.tsx")
r("REQ-F-004", "MUST", f"{RQ} §3.1 v1.10", "工具栏三行制布局（行1 版本｜筛选；行2 视图+排序+分度值+阵营；行3 标题｜更新时间）", "已实现", "部分确认", "LadderBoard.tsx 含各控件；布局需运行态人工比对（本沙箱无 DB，未截图）")
r("REQ-F-005", "MUST", f"{RQ} §3.1", "五维筛选即时生效、互斥展开、开源/闭源并入标签", "已实现", "部分确认", "e2e ladder-matrix 存在（--list 计入 138）；本轮未运行 e2e")
r("REQ-F-006", "MUST", f"{RQ} §3.1", "五种排序含自定义公式", "已实现", "已确认", "lib/features/ranking/formula-parser.ts；ladder/route.ts 接收公式")
r("REQ-F-007", "MUST", f"{RQ} §3.1 v1.7/v1.8", "分度值下拉即时切换；性能轴 0→100 全量程", "已实现", "已确认", "components/ladder/GranularitySelector.tsx；lib/features/ladder/__tests__/ladder.spec.ts:540（g=5 刻度序列）")
r("REQ-F-008", "MUST", f"{RQ} §3.1", "后台可配厂商优先级 1–99 与颗粒值 0.01–10", "已实现", "部分确认", "app/api/v1/admin/vendors、configs；未逐值验证边界")
r("REQ-F-009", "MUST", f"{RQ} §3.1 v1.7", "无限滚动续载、穷尽提示「到底了」、天梯页无页脚", "已实现", "已确认", "LadderBoard.tsx/LadderMatrixBoard.tsx 含「到底了」；台账 §7.12 R-83 T1–T5 ✅")
r("REQ-F-010", "MUST", f"{RQ} §3.2", "详情页左侧目录 + 参数表 + 基准弹窗 + 历史测评", "已实现", "部分确认", "app/(site)/models/[slug]/page.tsx")
r("REQ-F-011", "MUST", f"{RQ} §3.2 / §五.6", "价格统一以 ￥/M Tokens 展示与计费（¥5=$1 换算），且展示价与官方一致", "未实现", "存在缺陷",
  "①网关扣费不读 billingCurrency/billingUnit：gateway/service.ts:681-704、990-1003 以 priceInput 直接作 ¥/M；②seed 82 条价格 48 条 priceCurrency='USD'（seed.ts 计数）；③/pricing 以 $ 显示 USD 行（pricing/page.tsx:6,80-83）；④discovery 换算用 1:7.2（lib/discovery/pricing-extraction.ts:217-220）与需求 ¥5=$1 冲突",
  "047、048、049、053、054、055（U-15）", "V0.1.0 未发现 → V0.2.0 新增（D-NEW-1）")
r("REQ-F-012", "MUST", f"{RQ} §3.3", "Dock 暂存对比；付费对比 ¥2/模型/次预扣", "已实现", "已确认", "components/site/CompareDock.tsx；lib/features/evaluation/service.ts（captureHold）；web 单测 1081 全绿")
r("REQ-F-013", "MUST", f"{RQ} §3.3", "未登录可看历史测评案例", "已实现", "部分确认", "app/(site)/evaluations")
r("REQ-F-014", "SHOULD", f"{RQ} §3.4", "/products/[slug] 统一模板 + Product.intro 后台可配（url 仅 http/https）", "已实现", "已确认", "app/(site)/products/[slug]/page.tsx；ProductIntroSchema（packages/shared）")
r("REQ-F-015", "SHOULD", f"{RQ} §3.4 / {LG} #65", "子平台正式入口 URL 由运营配置", "部分实现", "待其他员工完成", "台账 #65：seed 指向 github.com/aideanew 组；正式地址待运营", "—（运营配置，无代码任务）")
r("REQ-F-016", "COULD", "V0.1.0 S9 / 台账 #70 收口后续", "子平台介绍页截图画廊", "待澄清", "证据不足", "无素材与托管口径（U-4）", "044、045、046（U-4）")
r("REQ-F-017", "COULD", f"{LG} §7.13 D1", "介绍页标题双语 vs 纯英文原名", "待澄清", "暂不执行", "台账 §7.13 D1 ⏸（app/(site)/products/[slug]/page.tsx 标题）")
r("REQ-F-018", "MUST", f"{RQ} §3.4.1", "人工 CRUD 录入模型/基准/价格且写 audit_logs", "已实现", "已确认", "app/api/v1/admin/{models,benchmarks,prices}；prices/route.ts:111-133 writeAudit")
r("REQ-F-019", "SHOULD", f"{RQ} §3.4.1 P1", "同一模型多次自动采集写价成功、current 恰 1 条", "部分实现", "存在缺陷",
  "已确认：PGlite PG16.4 + 16 条真实迁移，第 2 次 persistPrices 等价 SQL 报 23505（=P2002）（EVD-BASELINE-V2/pglite-repro-p2002.txt）；M-001 修复草案验证通过（pglite-verify-m001.txt）", "010、011、012、013", "V0.1.0「部分确认/未复现」→ V0.2.0「已确认」")
r("REQ-F-020", "MUST", f"{RQ} §3.4.1 / §五.7", "benchmark 标注来源与核验；未核验显示「演示数据」且不进排名", "已实现", "部分确认", "app/(site)/models/[slug]/page.tsx 含「演示数据」；verifiedStatus 过滤于 ladder 读侧（V0.1.0 已核）")
r("REQ-F-021", "SHOULD", f"{LG} #34", "多源交叉验证加权融合", "未实现", "暂不执行", "lib/sync/cross-validator.ts 无 weight/fusion；台账 #34 需第二数据源")
r("REQ-F-022", "MUST", f"{RQ} §3.5", "邮箱+密码注册/登录（bcrypt）签发 JWT", "已实现", "已确认", "app/api/v1/auth/*；lib/features/auth/tokens.ts")
r("REQ-F-023", "MUST", f"{RQ} §3.5", "JWT 24h + Refresh 7d", "待澄清", "已确认", "代码 access=15min（可配 5–60）、refresh=7d：lib/features/auth/constants.ts:16-19,59-80（U-1）", "040（U-1）")
r("REQ-F-024", "MUST(文档)", f"{RQ} §3.5/§六", "微信扫码登录签发同一 JWT 体系", "未实现", "暂不执行", "app/api/v1/wechat/qrcode/route.ts:13-24 注释桩；台账 #6 用户 2026-09-23 暂停（U-11）", "040 注记（U-11）")
r("REQ-F-025", "MUST", f"{RQ} §3.5", "三级等级；后台按等级配 free 模型/折扣/免费额度（天/周/月刷新）", "已实现", "已确认", "admin/tier-mappings、admin/free-quotas（含 batch）；schema RefreshCycle DAY/WEEK/MONTH")
r("REQ-F-026", "MUST", f"{RQ} §3.5", "充值五档 ¥10/55/115/600/2500 展示", "已实现", "已确认", "app/(site)/pricing/page.tsx:31")
r("REQ-F-027", "MUST(文档)", f"{RQ} §3.5 / {LG} #5", "微信/支付宝在线充值", "未实现", "暂不执行", "仅 mock-pay；台账 #5 用户暂停（U-11）", "040 注记（U-11）")
r("REQ-F-028", "MUST", f"{RQ} §3.5", "付费操作预扣，失败退还", "已实现", "已确认", "lib/features/billing/service.ts captureHold / holds 冲正")
r("REQ-F-029", "MUST", f"{RQ} §3.5", "消费记录按日期分组", "已实现", "已确认", "app/(site)/user/balance/page.tsx:134")
r("REQ-F-030", "MUST", f"{RQ} §3.5", "余额不足提示", "已实现", "已确认", "errors.ts INSUFFICIENT_BALANCE=40001")
r("REQ-F-031", "MUST", f"{RQ} §3.6", "用户自有 Key 优先，否则平台 Key 池；单平台多 Key 分流", "已实现", "部分确认", "app/api/v1/user/station-keys；admin/partner-keys；lib/features/apikey/crypto.ts")
r("REQ-F-032", "MUST", f"{RQ} §3.6", "优先级 1–99 自动降级；free 最低优先级兜底；余额不足切 free", "已实现", "已确认", "lib/features/gateway/*（9 个单测文件，web 1081 全绿）")
r("REQ-F-033", "MUST", f"{RQ} §3.6", "控制台通用版/专业版共享同一路由配置", "已实现", "部分确认", "components/console/GeneralForm.tsx、ProPrioritiesList.tsx")
r("REQ-F-034", "MUST", f"{RQ} §3.6", "本系统计费公式；加价率/倍率用户不可见", "已实现", "已确认", "packages/shared/src/utils/billing.ts:49-64 calcCharge；公开 route.ts grep markupRate 0 命中")
r("REQ-F-035", "MUST", f"{RQ} §3.6/§3.7", "用户自有 Key/套餐直连按平台原价、倍率不生效", "已实现", "部分确认", "gateway/repository.ts listActivePackageStations；台账 #12")
r("REQ-F-036", "MUST", f"{RQ} §3.6", "OpenAI/Anthropic 双格式入口与协议中转", "已实现", "已确认", "lib/features/gateway/adapters.ts；gateway/chat/route.ts")
r("REQ-F-037", "MUST", f"{RQ} §3.6", "自定义渠道不扣平台余额", "已实现", "已确认", "app/api/v1/user/custom-channels；CustomChannelsPanel")
r("REQ-F-038", "MUST", f"{RQ} §3.6", "限时优惠直接影响计费价（可为 0）", "未实现", "已确认", "PriceSource.PROMOTION 仅枚举（schema.prisma:499）；gateway/repository.ts:89,109 只取 isCurrent；运行时 0 引用", "026–031")
r("REQ-F-039", "MUST", f"{RQ} §3.7", "余额兑换套餐 + 套餐直连路由", "已实现", "已确认", "lib/features/package/**；listActivePackageStations")
r("REQ-F-040", "MUST", f"{RQ} §3.8", "余额码/定向套餐码批量生成、一次性核销、有效期", "已实现", "已确认", "admin/redemption-codes（含 batches）")
r("REQ-F-041", "MUST", f"{RQ} §3.9", "开关关闭 → 入口隐藏 + 页面 403 态 + API 50011", "未实现", "已确认", "feature_flags 表与 7 条种子（seed.ts:240-248）；运行时 grep 0 命中", "014、015、018、019、020")
r("REQ-F-042", "SHOULD", f"{RQ} §3.10 表", "后台可查看/切换功能开关", "未实现", "已确认", "app/api/v1/admin/ 36 个域目录无 feature-flags；需求文档 §3.10 写「✅GET/✅PATCH」为文档错误", "016、017、018、040", "V0.1.0 已立卡 → V0.2.0 补记文档错误")
r("REQ-F-043", "COULD", f"{RQ} §3.9（示例键）", "chat.support 客服功能", "待澄清", "证据不足", "仅种子开关键（seed.ts:247），无任何客服组件；需求仅作开关示例")
r("REQ-F-044", "MUST", f"{RQ} §3.10", "P0 四域 CRUD + 审计读侧", "已实现", "已确认", "admin 36 域/32 页（check-docs-rule PASS）；audit-logs 页")
r("REQ-F-045", "MUST", f"{RQ} §3.10 R-07", "admin 写操作写 audit_logs", "已实现", "部分确认", "writeAudit 广泛覆盖；未逐路由穷举")
r("REQ-F-046", "MUST", f"{RQ} §3.10", "敏感配置经白名单序列化，公开接口不暴露", "已实现", "已确认", "同 REQ-F-034 证据")
r("REQ-F-047", "MUST", f"{RQ} §四", "四维权重可调并重算、缓存失效", "已实现", "已确认", "app/api/v1/admin/ranking-weights/route.ts:61 revalidatePath('/models')")
r("REQ-F-048", "MUST", f"{RQ} §3.11", "一级导航八项（含「模型」）+ Logo 回首页", "待澄清", "已确认", "代码为 首页/资讯/产品/价格/文档/路线图/合作/关于（lib/navigation.ts:8-28）；验收表又写七项（U-2）", "040（U-2）")
r("REQ-F-049", "MUST", f"{RQ} §3.11", "首页自上而下结构（banner→平台介绍→模型→产品→路线图→合作→关于）", "已实现", "部分确认", "components/home/{HeroBanner,PlatformIntro,ModelSection,ProductSection,RoadmapSection,PartnerMarquee,AboutSection}.tsx")
r("REQ-F-050", "MUST", f"{RQ} §3.11", "合作 logo 多行交替方向滑动", "已实现", "已确认", "components/home/PartnerMarquee.tsx:9-48（reverse 行）")
r("REQ-F-051", "MUST", f"{RQ} §3.11", "价格页：单价表 + 充值档位 + 产品等级权益价", "已实现", "部分确认", "app/(site)/pricing/page.tsx；台账 #74 权益徽标与 DB 不一致未核（见 REQ-L-010）")
r("REQ-F-052", "SHOULD", f"{RQ} §二", "登录用户收藏模型/站点并在控制台查看", "未实现", "已确认", "Favorite 模型（schema）存在；运行时 grep -i favorite 0 命中（U-8）", "021–025")
# ---------------- 约束 / MUST NOT ----------------
r("REQ-C-001", "MUST / MUST NOT", f"{RQ} §五.1 / ADR-0006", "永远浅色、多套浅色主题、无深色模式、默认中文", "已实现", "已确认", "components/common/ThemeSwitcher.tsx；全仓 tsx 中 `dark:` 仅 1 处注释（CompareDock.tsx:8）")
r("REQ-C-002", "MUST NOT（隐含 SHOULD）", f"{RQ} §五.2", "搜索框仅存在于顶部导航栏（隐含：顶栏应有搜索）", "待澄清", "已确认", "components/site/* 无搜索组件（U-5）", "032–036（U-5）")
r("REQ-C-003", "MUST NOT", f"{RQ} §五.3", "导航栏上方无数据条/统计元素", "已实现", "部分确认", "components/site/SiteHeader.tsx 无顶部数据条（需运行态目视）")
r("REQ-C-004", "MUST", f"{RQ} §五.4/§五.5", "项目名 Aidean；筛选即时；首页数据走缓存", "已实现", "已确认", "app/(site)/page.tsx:21 revalidate=300")
r("REQ-C-005", "MUST", "用户指令 2026-10-14 / 子平台规范说明 §5.0", "Aidean 用户访问端口位于 3000–3100（dev/start/e2e/Docker/issuer 默认 3000）", "已实现", "已确认", "next start -p 3000 实测 200（EVD-BASELINE-V2/latency.txt）；playwright baseURL 3000；Dockerfile EXPOSE 3000；auth/constants.ts:82", "007（守卫固化）")
r("REQ-C-006", "MUST", "用户指令 2026-10-14 vs 子平台规范说明 §5.0 vs 外部仓 AGENTS.md", "主平台 OIDC 种子中的子平台本地回调端口与各子平台端口区间一致", "待澄清", "需要返工",
  "seed.ts:354 wechat-rag 回调 = localhost:3200（= BotHot 前端宿主，BotHot AGENTS.md）；e2e/web/sso-3333.spec.ts、单测 oauth-redirect-origin.spec.ts:59 期望 3333（AideanBot，子平台规范说明 §5.0 区间 3300–3400，用户本次未列出）；AideanThesis 用户口径 3000–3100 vs 其 AGENTS.md 3400–3500（P-1/P-2）",
  "007、008（P-2）、037", "V0.1.0「3200 为缺陷、改 3333」→ V0.2.0 需要返工（3200 属 BotHot）")
r("REQ-C-007", "MUST", "AGENTS.md 铁律5 / ADR-0001", "技术栈锁定 Next.js 15 + PG16 + Redis + Prisma + Tailwind 4", "已实现", "已确认", "apps/web/package.json：next 15.0.0、prisma 6.19.3、tailwindcss 4.0.0")
r("REQ-C-008", "MUST", "AGENTS.md 铁律1/3/6", "文档单一事实来源、版本头、超 3000 字拆分", "部分实现", "存在缺陷", "check-docs-rule PASS；但台账 155,968 字节未拆（铁律6）；错误码三源（见 REQ-NF-001）", "041、051")
# ---------------- 非功能 ----------------
r("REQ-NF-001", "MUST", "docs/governance/开发流程.md §五.2", "错误码唯一源（shared），契约测试自动生成并进 CI", "未实现", "已确认", "web errors.ts 22 码 vs shared types/index.ts:72-89 冲突旧表（10002/10003、50000/50001）vs API接口文档 §4 仅登记 3xxxx/4xxxx", "001、002、004、009")
r("REQ-NF-002", "MUST(上线)", f"{LG} #2/#3", "就绪探针：依赖不可用返回 503", "未实现", "已确认", "system/health/route.ts:11-14；无 DB 实测 200", "003")
r("REQ-NF-003", "MUST(上线)", f"{LG} #2", "生产部署实弹", "未实现", "暂不执行", "台账 #2 ⬜；缺服务器/域名/密钥（U-3）", "043（U-3）")
r("REQ-NF-004", "MUST(上线)", f"{LG} #3", "备份/恢复/迁移演练", "未实现", "暂不执行", "台账 #3 ⬜；无演练脚本（scripts/ 无 pg-drill）", "042、052（U-3）")
r("REQ-NF-005", "SHOULD", f"{LG} #36 / .github/workflows/ci.yml:5", "e2e 在 CI 真库运行且只有一套配置", "部分实现", "存在缺陷", "ci.yml:5「e2e 暂不进 CI」；两配置并存（根 138 例/26 文件，e2e/ 子配置 64 例/14 文件）；台账 #36 在 L113 为 🟡、L295 为 ✅（自相矛盾）", "005、006、037、051")
r("REQ-NF-006", "SHOULD", "指令 §9.4 / ci.yml", "CI 硬门禁含 lint、三包单测、密钥扫描、根污染、模块边界", "未实现", "已确认", "ci.yml verify job 无 lint、无 @aidean/ui 测试、无守卫脚本", "007、050", "V0.1.0 仅立守卫卡 → V0.2.0 补 lint/ui")
r("REQ-NF-007", "SHOULD", f"{LG} #17 / R-83", "千级模型天梯量级有可复现基线数字", "部分实现", "证据不足", "R-83 分窗加载已实现（台账 §7.12）；本规划无 DB 无法测 → 尚无基线", "039")
r("REQ-NF-008", "SHOULD", "指令 §9.1", "单测覆盖率首测基线", "未实现", "证据不足", "无 coverage 依赖（U-10）→ 尚无基线", "038（U-10）")
r("REQ-NF-009", "SHOULD", "docs/specs/harden-rc02-standalone-address", "对外地址固定为公开基址 + 发布环境契约/回滚验收文档", "部分实现", "部分确认", "代码已落：middleware.ts:65、oauth/authorize/route.ts:80-86；checklist 16 项未勾，C4/C5 两文档不存在", "052（U-3）", "V0.1.0 未登记 → V0.2.0 新增")
r("REQ-NF-010", "COULD", f"{LG} #13", "OIDC back-channel 全量一致性", "部分实现", "待其他员工完成", "lib/features/oauth/backchannel.ts 2 次重试；需子平台 logout 端点验收")
r("REQ-NF-011", "COULD", f"{LG} #20 / V0.1.0 R-09", "requireUserApi 回库比对 tokenVersion（改密全端失效）", "部分实现", "暂不执行", "session.ts:53-66 回库 status/deletedAt，未比对 ver；台账要求独立 spec 评估性能")
# ---------------- 台账 / spec / 治理 ----------------
r("REQ-L-001", "COULD", f"{LG} #43", "admin/tools：skills/mcp/agents 三页", "未实现", "暂不执行", "app/(admin)/admin/tools 不存在；e2e/admin/tools.spec.ts:66-67 describe.skip")
r("REQ-L-002", "COULD", f"{LG} #21", "调账备注落 ledger 分录", "部分实现", "暂不执行", "LedgerEntry 无 note 列（schema.prisma:1022+）；备注仅入 audit（wallets/adjust/route.ts:47）")
r("REQ-L-003", "COULD", "控制台7项反馈大纲 §7.3-2（D1=B）", "usage_daily_stats 扩列与回填", "未实现", "暂不执行", "大纲注明独立立项")
r("REQ-L-004", "COULD", f"{LG} #77", "apps/web/docs/index.json 生成器", "未实现", "暂不执行", "仓内无生成脚本（观察项）")
r("REQ-L-005", "COULD", f"{LG} #23", "check-tables.mjs 最终位置", "待澄清", "暂不执行", "待决事项决策说明 §二 #23：管理者拍板")
r("REQ-L-006", "SHOULD", f"{LG} #78", "BotHot 正式台账 + 端口漂移裁决", "待澄清", "部分确认", "外部仓 aideanew/BotHot@13acacc 可访问且自带端口表（3200/3300/5300/5433/6380）；主平台台账未建（P-1/P-2）")
r("REQ-L-007", "SHOULD", f"{LG} L44/L113/L295", "台账同一事项只有一个现行状态", "未实现", "存在缺陷", "#17：L44 🟡 vs §7.12 R-83 ✅；#36：L113 🟡 vs L295 ✅", "051", "V0.2.0 新增")
r("REQ-L-008", "SHOULD", "docs/specs/*/tasks.md|checklist.md", "spec 勾选与代码事实一致", "部分实现", "部分确认", "未勾：establish-dev-workflow 33+3、finalize-admin-ia 17+21、harden-rc02 16、rebuild-admin 15+6、console-effects 3、ladder 3、audit 2+3、fix-restore 1、enrich 1（多为勾选滞后）", "041、052")
r("REQ-L-009", "MUST（本次指令）", "用户指令 2026-10-14「建立统一规划体系」", "存在唯一的需求→状态→任务追溯表，台账/大纲/需求文档引用它", "未实现", "部分确认", "本规划 03a 已产出 RTM；入库待 TASK-051", "051")
r("REQ-L-010", "COULD", f"{LG} #74", "pricing 权益分区徽标与 DB 一致", "待澄清", "证据不足", "台账 #74 🟡 P2；本轮未在运行态核对")
r("REQ-L-011", "COULD", "控制台7项反馈 P1", "MetaMask 报错", "待澄清", "暂不执行", "全仓 web3 0 命中，报错栈在扩展 inpage.js；待截图出处")
r("REQ-L-012", "COULD", f"{LG} #35 / R-69", "非 admin 组件复用 @aidean/ui", "部分实现", "暂不执行", "实测 18/51 非 admin tsx 引用 @aidean/ui（components/）")


# ---------------- V0.4.0 新增：模型源监控体系（需求输入：instruction_v3「当前我找到的」+ 补充1/补充2；核验见 19_外部来源核验证据.md）----------------
MI = "instruction_v3 补充1/补充2"
def m(id, lvl, stmt, st, lab, ev, tasks="—"):
    r(id, lvl, MI, stmt, st, lab, ev, tasks, v1="V0.4.0 新增")
m("REQ-M-001", "MUST", "监控源有唯一注册表：每源含 key/分级(S1/S2/A/B/C)/类型(official/cloud/hosted/relay/benchmark/community)/端点/是否需 Key/刷新 cron/条款状态/启停", "部分实现", "部分确认",
  "lib/sync/sources/registry.ts 仅 key/label/role(primary|cross) 11 源，无分级/端点/需Key/条款字段；无 DB 表（schema 68 model 无 monitoring_sources）", "056、058")
m("REQ-M-002", "MUST", "至少 3 个无需 Key 的公开目录源每日自动采集（OpenRouter /api/v1/models、AIHubMix /api/v1/models、Quanzil /api/pricing），keyed 源缺凭证时不报错而标记 credential_missing", "部分实现", "部分确认",
  "OpenRouterAdapter/QuanzilAdapter 已存在并由 crawl_models.ts 每日 02:00 调度（seed.ts:300-308）但写入 AiModel/ModelPrice 而非按源目录快照；AIHubMix 无适配器；无 keyed 源与 credential_missing 语义", "060、062、070")
m("REQ-M-003", "MUST", "每次采集保存目录快照：源、采集时间、条目数、原始响应 sha256 与采样，同哈希不重复入库", "未实现", "已确认",
  "SyncBatch 仅存计数/validationSummary，无原始响应哈希；MarketSnapshot 为全市场聚合非按源（schema.prisma:2212）", "058、059")
m("REQ-M-004", "MUST", "按源记录 provider_model 观测：外部模型 ID、规范化 ID、是否在列、原币价格（输入/输出/缓存）、首次/末次出现时间", "未实现", "已确认",
  "ProviderModelOffering @@unique([providerId,modelId]) 单行无历史，仅后台手工与 seed 写入（admin/providers/[id]/offerings 路由、seed.ts）；sync 不写 offering", "058、059")
m("REQ-M-005", "MUST", "相邻快照 diff 产出事件：新上架/下架/调价(≥1%)/模型首次出现，每条事件带来源 URL 与快照 ID", "部分实现", "部分确认",
  "lib/intelligence/change-detector.ts 基于 MarketSnapshot 做全局 diff（provider_added/model_added/price_changed 等）但无按源事件表、无快照 ID 证据；ModelChangeLog 记录的是 AiModel 字段变更", "061")
m("REQ-M-006", "MUST", "可回答「某模型现在在哪些源可调用」：公开 API 返回该模型各源上架状态与原币价格", "未实现", "已确认",
  "无 /api/v1/models/{id}/offerings；前台模型页无多源区块", "066、067、068（U-M5）")
m("REQ-M-007", "MUST", "价格按原币+单位保存与展示；任何换算到 CNY 必须读统一汇率配置（不得硬编码）", "部分实现", "存在缺陷",
  "lib/discovery/pricing-extraction.ts:217-243 硬编码 1:7.2；用户口径 U-15（5）未裁决；ModelPrice 有 originalCurrency/exchangeRate 字段但网关不消费（REQ-F-011 同源）", "060、069（U-15）")
m("REQ-M-008", "SHOULD", "中转/网关可用性时序：llmtest composite 的分数/存活/检测次数与自有探针结果写入可用性观测", "部分实现", "部分确认",
  "lib/discovery/llmtest.ts 把 score/isAlive/total_checks 拼进候选 description 文本；ReliabilityObservation 表存在但全仓 0 写入方（grep prisma.reliabilityObservation 无结果）", "061、073、071（U-M3）")
m("REQ-M-009", "MUST", "监控任务由既有调度体系运行（ScheduledScript + scheduler sidecar），单源失败不影响他源，状态可在后台查看", "部分实现", "部分确认",
  "script-executor.ts + run-due 路由 + docker-compose.prod.yml:353 scheduler sidecar 已存在；无监控脚本与源级状态字段", "062、063、064、065")
m("REQ-M-010", "MUST NOT", "仓库/日志/快照中不得出现任何第三方 API Key；Key 仅经环境变量或加密配置注入", "已实现", "部分确认",
  "当前无任何 keyed 源（grep OPENROUTER_API_KEY/SILICONFLOW/AA_API 无结果）；TASK-007 secret-scan 待落地", "062、070、007")
m("REQ-M-011", "SHOULD", "后台可启停源、改刷新频率、手动触发一次运行（防重入）", "未实现", "已确认",
  "后台有 /admin/sync 与 /admin/discovery 页但无按源启停/cadence；run-due 有 Redis 锁可复用", "063、064")
m("REQ-M-012", "MUST", "新增端点与错误码先登记契约再实现（20004 源不存在、50012 源缺凭证）", "未实现", "已确认", "packages/shared 无 monitoring schema；errors.ts 未落地（TASK-001）", "056、057")
m("REQ-M-013", "SHOULD", "后台「模型源监控」页五态齐全并有 E2E 覆盖", "未实现", "已确认", "app/(admin)/admin/ 32 页无 monitoring", "064、065")
m("REQ-M-014", "MUST NOT", "不得把中转站自报的模型名当身份证据；relay 源条目对外必须标「身份未验证」，且不自动 promote 为 APIStation", "部分实现", "部分确认",
  "llmtest 候选走人工 promote（candidates/[id]/promote 路由）已满足后半句；前台尚无多源展示故前半句无载体", "066、067")
m("REQ-M-015", "MUST", "第三方评测数据按其条款使用：Artificial Analysis 数据展示须署名、仅用免费/已授权层级，再分发需另行授权", "部分实现", "存在缺陷",
  "artificial-analysis.ts 主路径 /api/leaderboard 已 404，回落经 OpenRouter benchmarks 代理取 AA 指数；前台/组件 grep 'Artificial Analysis' 无署名", "072（U-M2）、067")
m("REQ-M-016", "COULD", "中转真实性信号：对声称 Claude 的中转模型检查 thinking signature 存在性等，仅作风险信号", "未实现", "已确认",
  "discovery/protocol-probe.ts 只探协议兼容，不做身份核验", "071（U-M3）、070（U-M1）")

# ---------------- V0.5.0：V0.4.0 反向审计修正（EVD-BASELINE-V5/v05-rtm-audit.md）----------------
def _get(i): return next(x for x in R if x["id"] == i)
def _set(i, **kw):
    x = _get(i); x.update(kw); x["v1"] = x["v1"] + " → V0.5.0 改判"
_set("REQ-F-010", st="部分实现", lab="需要返工", ev="左侧目录/参数表已有；基准为页内表格而非弹窗（page.tsx:342-357）；测评示例为「即将上线（Phase 4）」占位（page.tsx:374）", tasks="074、075")
_set("REQ-M-006", st="部分实现", lab="部分确认", ev="已有公开接口 app/api/v1/models/[id]/stations/route.ts:1-37 与详情页「提供商与折扣价」区块 page.tsx:246-290；缺各监控源上架状态与原币价格", tasks="066、067、068（U-M5）")
_set("REQ-NF-004", ev="scripts/db/backup.sh、restore.sh 已存在（restore.sh:56-59）；缺逐表行数比对与演练记录；台账 #3 ⬜")
_set("REQ-F-026", lab="存在缺陷", ev="pricing/page.tsx:31 档位硬编码，与 packages/shared billing.constants.ts:43-47 RECHARGE_TIERS 重复（双源）", tasks="078")
_set("REQ-F-033", stmt="控制台通用版/专业版共享同一路由配置（通用版等级固定序与默认映射见 REQ-F-062）")
_set("REQ-F-038", stmt="限时优惠直接影响计费价（可为 0），且随上游价格采集同步展示价（REQ-F-063）")
RQD = "docs/product/design/功能设计文档.md"
SSO = "docs/product/modules/子平台SSO接入指南.md"
def n(id, lvl, src, stmt, st, lab, ev, tasks="—"):
    r(id, lvl, src, stmt, st, lab, ev, tasks, v1="V0.5.0 新增（V0.4.0 遗漏）")
n("REQ-F-053", "MUST", f"{RQ}:69", "生产上线前 seed 演示数据（verifiedStatus=1）逐条人工审核并留记录", "未实现", "已确认", "seed.ts:531 统一写 verifiedStatus: 1（演示环境豁免）；无审核清单/脚本", "083（U-3）")
n("REQ-F-054", "MUST", f"{RQD}:233-281", "字段所有权矩阵：sync 只 SET sync 字段，不覆盖人工字段", "部分实现", "证据不足", "lib/sync/writers/index.ts 存在；未逐字段核验", "076")
n("REQ-F-055", "MUST", f"{RQ}:66；{RQD}:279", "人工与 sync 全部写操作写 model_change_logs（前后值）", "部分实现", "证据不足", "lib/features/admin/model-change-log.ts；writers 有 modelChangeLog.create；未穷举写入面", "076")
n("REQ-F-056", "MUST", f"{SSO}:55,89,141,215-229", "OIDC：PKCE 仅 S256；refresh 重放撤整链；会话 Cookie host-only", "部分实现", "部分确认", "lib/features/auth/repository.ts:59,67 有实现迹象；无回归测试", "077")
n("REQ-F-057", "SHOULD", "docs/product/modules/登录方案.md:16", "邮箱验证码登录通道", "已实现", "已确认", "app/api/v1/auth/email/{code,verify}")
n("REQ-F-058", "SHOULD", f"{RQ}:179", "五维筛选每组「全部」可全选、也可全不选", "部分实现", "已确认", "LadderFilterBar.tsx:5,152 仅「不限」清空", "078、079")
n("REQ-F-059", "MUST", f"{RQ}:44-46,180", "详情页基准以弹窗呈现；历史测评示例多模型回答并排", "未实现", "已确认", "page.tsx:342-357 页内表格；page.tsx:374 占位", "074、075")
n("REQ-F-060", "SHOULD", f"{RQD}:322-324", "缓存命中 token 参与计价（priceCache/discountCache）", "未实现", "已确认", "gateway/service.ts:681-704 只用 priceInput/priceOutput；cachedTokens 只落库", "080（U-15）")
n("REQ-F-061", "SHOULD", f"{RQD}:209-211", "后台 prices/batch-upsert + requestId 幂等", "部分实现", "已确认", "admin/models/batch 已有；admin/prices 下无 batch", "081、082")
n("REQ-F-062", "MUST", f"{RQ}:90-92", "通用版等级固定序 Opus>Sonnet>Fable>Haiku；专业版默认映射 1/2/3/4；free 等级不可配", "部分实现", "证据不足", "gateway/service.ts:5 注释提及映射；无断言测试", "076")
n("REQ-F-063", "SHOULD", f"{RQ}:105", "限时优惠展示价随上游价格采集同步", "未实现", "已确认", "TASK-026–031 原未覆盖；V0.5.0 并入 027 步骤", "027")
n("REQ-L-013", "SHOULD", f"{LG}:221（#67）", "详情页「测评示例」占位立项", "未实现", "已确认", "同 REQ-F-059", "074")
n("REQ-L-014", "SHOULD", f"{LG}:46（#19）", "admin 配置治理专项收口", "待澄清", "证据不足", "RTM 原只引 #35/#43", "084")
n("REQ-NF-012", "SHOULD", f"{RQ}:41", "天梯页无页脚", "待澄清", "证据不足", "F-009 证据只核了「到底了」", "084")

# ---------------- V0.7.0（2026-10-17）：基线 ffa158c；业务树仍 = 77c7952 ----------------
import re as _re
_OTHER = {"001","002","003","004","005","006","007","008","009","050","077","010","011","012","013","076"}
def _ptk(tk):
    out = set()
    for a, b in _re.findall(r"(\d{3})\s*[–-]\s*(\d{3})", tk):
        out |= {f"{i:03d}" for i in range(int(a), int(b) + 1)}
    out |= set(_re.findall(r"(?<!\d)(\d{3})(?!\d)", tk))
    return out
for _x in R:
    if _ptk(_x["tasks"]) & _OTHER and _x["st"] != "已实现":
        _x["ev"] += "；V0.7.0：aideanew/huaweicloud 他线声称已修复，镜像 ffa158c 未见实现（证据不足，待 TASK-086 复核）"
        _x["v1"] += " → V0.7.0 镜像复核不变（他线待核）"
r("REQ-L-015", "MUST", "用户指令 2026-10-17「开始前必须先拉取代码，保证 github 双端一致」", "nevermeetagain/Aidean main 包含当前工作代码线全部业务提交（或经书面裁决宣告镜像为唯一真源）",
  "未实现", "存在缺陷", "镜像业务树=77c7952；V0.6.0/19_执行过程记录.md §10 自述 aideanew/Aidean@huaweicloud 含 S0/S1 实现且镜像推送因凭据边界未完成；aideanew/Aidean 对本环境 404", "085、086、088", v1="V0.7.0 新增（B-0）")
r("REQ-L-016", "SHOULD", "AGENTS.md 文档治理铁律（docs/ 单一真源、可追溯）", "规划树文件名 UTF-8 可读且相对链接可解析",
  "未实现", "存在缺陷", "docs/任务规划V0.5.0 下 24 个文件名为 UTF-8→GBK 双编码（13 个不可逆解码）；V0.5.0 缺 ADR-P001、DESIGN-004、03a、20_、21_（被引用）", "087", v1="V0.7.0 新增")

# ---------------- V0.8.0（2026-10-19）：基线 c2da219（镜像已叠加他线 S0–S3 源码）----------------
_EV8 = "EVD-BASELINE-V8（shared/web tsc 0 错；shared vitest 155/155；web vitest 1152 过/2 skip/1 文件因门控缺陷失败）"
def _v8(i, st, lab, ev, tasks=None):
    x = _get(i); x["st"] = st; x["lab"] = lab; x["ev"] = f"V0.8.0：{ev}；{_EV8}"
    if tasks: x["tasks"] = tasks
    x["v1"] += " → V0.8.0 改判"
_v8("REQ-F-019", "部分实现", "部分确认", "迁移 20261014000000_model_prices_partial_current_unique + writers/index.ts 改写已进镜像；PG16 真库三次写价未跑；int spec 门控缺陷", "010、011、012、013、089、091")
_v8("REQ-F-026", "已实现", "部分确认", "pricing/page.tsx:12,192 改读 shared RECHARGE_TIERS（双源消除）；UI 运行态未验", "078、092")
_v8("REQ-F-041", "部分实现", "部分确认", "flags service/repository + system/features + 三路由 route-gate + FeatureDisabled 组件已进镜像，单测通过；e2e 与运行态未跑；文档未同步", "014、015、018、019、020、086、092")
_v8("REQ-F-042", "部分实现", "部分确认", "admin/feature-flags 端点 + FeatureFlagsManager 页 + 菜单种子已进镜像；运行态未验", "016、017、018、040、092")
_v8("REQ-F-052", "部分实现", "部分确认", "favorites schema/API/service/repository + FavoriteButton/FavoritesPanel/useFavorites 已进镜像，单测通过；e2e/运行态未跑；文档未同步", "021、022、023、024、025、086、092")
_v8("REQ-NF-001", "部分实现", "部分确认", "shared/src/errors.ts 唯一码源 + web 重导出 + 3 份 generated 契约测试已进镜像；生成器 scripts/contract/gen-contract-tests.mjs 缺失、CI 未接防漂移", "001、002、004、009、085")
_v8("REQ-NF-002", "部分实现", "部分确认", "system/ready 路由 + readiness.ts（单测覆盖 503 分支）已进镜像；真依赖不可用场景未实测", "003、086")
_v8("REQ-NF-005", "部分实现", "存在缺陷", "walking-skeleton e2e 已进镜像；ci.yml 无 e2e job；CI 作业级占位 DATABASE_URL 使 int spec 必失败", "005、006、037、051、089")
_v8("REQ-F-054", "部分实现", "部分确认", "field-ownership.spec.ts 已进镜像并通过；真库未验", "076")
_v8("REQ-F-055", "部分实现", "部分确认", "change-log-coverage.spec.ts 已进镜像并通过", "076")
_v8("REQ-F-056", "已实现", "部分确认", "oidc-redlines.spec.ts（PKCE S256 / refresh 重放 / host-only）已进镜像并通过", "077")
_v8("REQ-F-058", "已实现", "部分确认", "LadderFilterBar「全部」全选/全不选已进镜像；e2e ladder-filter-all 未跑", "078、079、092")
_v8("REQ-F-062", "已实现", "部分确认", "tier-order.spec.ts 断言固定序与默认映射，已通过", "076")
_v8("REQ-L-015", "部分实现", "部分确认", "4310ce5、c2da219 两次快进叠加使镜像含他线 S0–S3 源码；叠加排除 docs/ 与部分工件（scripts/contract、scripts/guard、ci.yml）；后续开发线未书面裁决（B-0'）", "085、086、088、090")

# ---------------- V0.9.0（2026-10-19）：Hark 核心卡执行后（089/026/082/027/056/058/060/057 完成并经独立审查）----------------
import re as _re
import tasks_data as _TD
_EV9 = "V0.9.0 证据 docs/任务规划V0.9.0/06_validation/evidence/"
def _expand(tok):
    out = []
    for a, b in _re.findall(r"(\d{3})\s*[–-]\s*(\d{3})", tok):
        out += [f"{i:03d}" for i in range(int(a), int(b) + 1)]
    if not out:
        out = _re.findall(r"(?<!\d)(\d{3})(?!\d)", tok)
    return out
def _strip_removed(tasks):
    toks = [x for x in _re.split(r"[、,，]\s*", tasks) if x.strip()]
    keep = []
    for tok in toks:
        ids = _expand(tok)
        if not ids:
            keep.append(tok); continue
        rest = [i for i in ids if i not in _TD.REMOVED9]
        if len(rest) == len(ids):
            keep.append(tok)
        elif rest:
            keep.extend(rest)
    return "、".join(keep)
def _v9(i, st, lab, ev, tasks=None):
    x = _get(i); x["st"] = st; x["lab"] = lab; x["ev"] = f"V0.9.0：{ev}"
    if tasks is not None: x["tasks"] = tasks
    x["v1"] += " → V0.9.0 改判"
for _x in R:
    _before = _x["tasks"]
    _x["tasks"] = _strip_removed(_x["tasks"])
    if _x["tasks"] != _before:
        _x["v1"] += " → V0.9.0 已完成卡移出"
    if not _re.findall(r"(?<!\d)\d{3}(?!\d)", _x["tasks"]):
        if _x["st"] in ("未实现", "部分实现"):
            _x["tasks"] = "086"  # 剩余仅为验收：由 086 独立复核收口
        elif _x["tasks"] in ("", "—"):
            _x["tasks"] = "—"
_v9("REQ-F-019", "已实现", "已确认", "089 门控修复后，PG16.14 真库 persist-prices.int.spec 2/2（三次写价全部成功、current 恰 1 条）；M-001 部分唯一索引经空库 18 条迁移重放（EVD-089、EVD-058）；剩文档同步（013）与独立证据（091）", "013、091")
_v9("REQ-F-038", "部分实现", "部分确认", "026 契约 + 027 生效价解析器已落地：网关两处取价收敛为生效价（窗口内 PROMOTION 优先），/api/v1/models/[id] 追加 effectivePrice；PG16 真库限免=0 计费路径核验（EVD-027）；剩后台写侧（028）、前台展示（029/093）、e2e（030/031）", "028、029、093、030、031")
_v9("REQ-F-063", "部分实现", "部分确认", "027 解析器真库用例：采集写入新当前价后窗口外生效价随之更新、窗口内仍为优惠（EVD-027 int spec 用例 3）；前台展示归 029/093", "029、093")
_v9("REQ-F-061", "部分实现", "部分确认", "082 契约 PriceBatchUpsertSchema（rows 1..500、requestId uuid、行 strict、价格拒空值）已落地；端点 081 未实现", "081")
_v9("REQ-M-001", "已实现", "已确认", "056 MonitoringSource 契约 + 058 monitoring_sources 表（CHECK 约束、key 唯一、部分索引）+ seed 5 源（按 key upsert 不覆盖运营字段）PG16 实测（EVD-056/058）；后台管理面归 063/064（REQ-M-011）", "—")
_v9("REQ-M-002", "部分实现", "部分确认", "060 三个公开源 collector（OpenRouter/AIHubMix/Quanzil，无需 Key）真实 fixture 单测通过；每日调度（062）与 keyed 源（070）未实现", "062、070")
_v9("REQ-M-003", "部分实现", "部分确认", "058 catalog_snapshots 表 + UNIQUE(source_id, raw_sha256) 已在 PG16 落地；写入器 059 未实现", "059")
_v9("REQ-M-004", "部分实现", "部分确认", "058 provider_model_observations 表 + 060 归一为契约观测（原币+单位）已落地；upsert 写入 059 未实现", "059")
_v9("REQ-M-012", "部分实现", "部分确认", "056 已在 shared 登记 20004/50012（27 码唯一、HTTP 404/503）；057 需求文档 §3.4.2 登记；API接口文档 §4 登记归 090（E9-15）", "090")
_v9("REQ-NF-005", "部分实现", "部分确认", "089 修复 int spec 门控（CI 占位串不再误触发，RUN_DB_TESTS=1 显式开启）；CI e2e job（006）仍缺", "006、037、051")
for _i in ("REQ-M-011", "REQ-M-013"):
    _x = _get(_i); _x["tasks"] = _x["tasks"] + "、094（导航登记，E9-10）"; _x["v1"] += " → V0.9.0 新增 094"
