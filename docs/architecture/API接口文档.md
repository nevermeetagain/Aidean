# API 接口文档

> 版本: v1.66 | 更新: 2026-10-23 | 变更: **T120-10（V0.12.0 契约落地）**——§4 新增 30005 `CHANNEL_PROBE_TARGET_FORBIDDEN`（400/inline，28 码），重生成契约 spec；新建 §5.10（anchor `v120-api`）登记改密 / 找回密码 / 监控运行请求 / 运行历史 / 站点可靠性 / 渠道探测 6 个端点（契约 `@aidean/shared` V0.12 增量），架构约束互引《API架构设计方案》§7.16。
> 前次（v1.65 | 更新: 2026-10-22）变更: **UX-FIX-E（UX-21 / 用户裁定 2）**——`GET /oauth/dev/callback` 行补「仅非生产环境挂载，`NODE_ENV=production` 时 404」，端点语义不变。前次（v1.64 | 更新: 2026-10-22）变更: **B11-11 15 个后台列表端点接入分页共享件**——§4.2 口径由「非法串回退默认 200」改为「非法整数串 → HTTP 400 + `code=40000`，且先于任何 Prisma 调用」；空串视同缺省、纯空白视为非法、越界合法值仍钳制；`intelligence` 的 `limit` 新增上限 1000；守卫名单已清空（strict 接线待裁定）。前次（v1.63 | 更新: 2026-10-22）变更: **B11-03a 协议兼容/能力矩阵投入运营（Q-11-01=A）**——新建 §5.8.11（anchor `matrix-admin-api`）登记 `/api/v1/admin/protocols{,/[id]}` 与 `/api/v1/admin/capabilities{,/[id]}` 列表 GET/POST + 单资源 GET/PATCH/DELETE（新增 4 端点、2 route 文件），zod strict 校验、错误码复用既有 40000/20001/10008，协议维度唯一真源 `ModelProtocol`；与《API架构设计方案》§7.15 双向互引（铁律 2）。
> 前次（v1.62 | 更新: 2026-10-22）变更: **B11-10 / B11-11（Q-11-03=B · Q-11-05=A）**——§4 新增 §4.1 非 2xx 出口信封（anchor `api-envelope-exits`：未实现方法 → HTTP 405 + `Allow` + 信封 `code=40000`；未匹配 `/api/*` → HTTP 404 + 信封 `code=40000`，替代 0 字节空体与 27KB HTML）与 §4.2 分页参数解析口径（anchor `pagination-params`：共享件 `lib/http/pagination.ts`，非法串回退默认、越界钳制、绝不送 NaN）；与《API架构设计方案》§7.14 / §五 建立铁律 2 双向互引锚；不新增错误码（复用已登记 40000），不新增单资源 GET。
> 前次（v1.61） | 更新: 2026-10-20 | 变更: **同步 26_用户裁决记录**——§5.2.1 补用户裁决口径注（U-15 / U-23=B / U-24=A）。
> 前次（v1.60） | 更新: 2026-10-20 | 变更: **TASK-054 EffectivePrice 字段表（计价口径归一）**——§5.2.1 新建（anchor `effective-price-fields`）登记 `EffectivePriceSchema` v0.2 全字段，含归一字段 currency/unit/sourceCurrency/sourceUnit/sourcePrice*/fxRate/fxDate；回链《网关计费时序契约》§12 与术语表「计价口径归一」（铁律 2 双向锚）。
> 前次（v1.59） | 更新: 2026-10-20 | 变更: **TASK-031 登记限时优惠价 API-008..011**——新建 §5.8.10（anchor `promotion-prices-api`）登记 `/api/v1/admin/prices/promotions` GET/POST 与 `[id]` PATCH/DELETE 四端点（契约 `PromotionPriceCreateSchema`/`PromotionPricePatchSchema`，权限 `admin.models.read/write`）；生效价解析口径回链《网关计费时序契约》§11（anchor `effective-price-resolution`）与术语表「生效价」（铁律 2 双向锚）；与《API架构设计方案》§7.13 互引。
> 前次（v1.58 | 更新: 2026-10-20）变更: TASK-036 §5 search 行补架构约束回链（[API架构设计方案 §7.12](API架构设计方案.md#search-architecture)，铁律 2 双向锚），端点语义不变。前次（v1.57 | 更新: 2026-10-20 | 变更: TASK-033 登记 GET /api/v1/search（顶栏全局搜索，契约 API-012/SearchQuerySchema/SearchResponseSchema，PUBLIC，IP 级限流 30 次/60s fail-open，三路并发 contains+insensitive，仅 AiModel 未软删+isActive+ACTIVE / Product ACTIVE+未软删 / NewsItem PUBLISHED）。前次（v1.56 | 更新: 2026-10-20 | 变更: TASK-066 登记 GET /api/v1/models/[id]/offerings（多源上架，契约 ModelOfferingsResponse）。前次（v1.55 | 更新: 2026-10-19 | 变更: TASK-097 价格写后缓存失效口径同步（§5 admin/prices/[id] 行：revalidatePath('/pricing') → invalidatePriceViews 两层失效）。前次（v1.54 | 更新: 2026-10-19 | 变更: **TASK-025 S3 收藏数据模型/架构边界文档同步（V0.9.0 / REQ-F-052 / SOL-S3）**——§5.4.2 收藏 favorites（TASK-090 已登记 API-005/006/007）的「数据模型/架构边界由 TASK-025 补登」预留句转实然：加《数据库文档》§九（`favorites` 行·✅ 已激活）与《API架构设计方案》§7.11（anchor `favorites-architecture`）铁律 2 真链。**20003 已在 §4 全 27 码表**（090/009）、API-005/006/007 已在 §5.4.2（090），本卡不改 §4→不触发契约漂移门、零触碰 packages。前次（v1.53 | 更新: 2026-10-19 | 变更: **TASK-020 S2 功能开关运行时文档同步（V0.9.0 / REQ-F-041 / DESIGN-001）**——§5.7 系统 补登 `GET /api/v1/system/features`（API-002/REQ-F-041 公开功能开关快照：PUBLIC 无鉴权，`data=PublicFeaturesSchema` 仅 7 码开/关布尔，DESIGN-001 隐私边界不暴露 rollout/config/时间窗，读经 `getFeatureFlags()` tag `feature-flags`，`force-dynamic`）；§5.8.9 功能开关 admin（TASK-090 已登记 API-003/004）互引句由「由 TASK-020 补登」转实然并加铁律 2 真链、表后补架构约束互引锚；《API架构设计方案》新建 §7.10（anchor `feature-flag-runtime-architecture`）承接运行时边界（7 码真源/双读面/关闭态三重生效/缓存即时性/幂等）。**50011 FEATURE_DISABLED 已在 §4**（TASK-009 全 27 码表），本卡不改 §4→不触发契约漂移门、不需重生成 packages。前次（v1.52 | 更新: 2026-10-19 | 变更: **TASK-009 S0 文档同步（V0.9.0）——§4 全码表 + `/system/ready` 登记 + 双向锚**——§4 由分段三表（11 码）改为**全段单表 27 码**（列 `码位|标识|HTTP|语义|前端展示`），真源唯一化 `packages/shared/src/errors.ts`（`ERROR_CODES`/`DEFAULT_STATUS_BY_CODE`/`ERROR_PRESENTATION`），删除「与 errors.ts 双源对齐」措辞、确立**唯一源=errors.ts**（先登记后实现，§4 由 `gen-contract-tests.mjs` 解析生成契约、纳入 CI 漂移门，同步重生成 `errors.generated.spec.ts`，`DOC_REGISTERED` 11→27，授权偏离见 EVD-009）；§5.7 系统 登记 `GET /api/v1/system/ready`（API-001/REQ-NF-002 就绪探针：DB+Redis 探活失败→`50010`→HTTP 503，`force-dynamic`/PUBLIC，CI e2e-skeleton 就绪门）；《API架构设计方案》§三 建 `error-code-unified-architecture` 双向互引锚（铁律 2）。**注**：卡面「25 码」为 V0.5.0 契约遗留数，本次以真实唯一源实测 27 码为准（含 090 已登记监控 2 码）。前次（v1.51 | 更新: 2026-10-19 | 变更: **TASK-090 文档门禁收口（V0.9.0）**——§4 新增监控/系统段错误码登记表，登记 20004 `MONITOR_SOURCE_NOT_FOUND`/50012 `MONITOR_SOURCE_CREDENTIAL_MISSING`（E9-15，先登记后实现，与 `app/api/v1/_lib/errors.ts` 双源对齐，同步重生成契约）；§5.4.2 新增收藏 favorites 端点登记 API-005/006/007（`/api/v1/user/favorites{,/[id]}`）；§5.8.9 新增后台功能开关 `/api/v1/admin/feature-flags{,/[id]}` 登记（收藏/功能开关的架构数据模型与架构边界富内容由 TASK-025/020 补登）；`check-docs-rule`/`check-docs-facts` 双双 exit 0。前次（v1.50 | 更新: 2026-10-13 | 变更: **S9 reports 端点改权限码级鉴权 + 新增 `reports` 域（finalize-admin-ia-and-ops-gaps B2）**——§5.8.6 GET `/api/v1/admin/reports/overview` 由无参 `requireAdminApi()` 总闸改为 `requireAdminApi("admin.reports.read")`（报表含充值收入金额）；`ADMIN_DOMAINS` **29→30 域 ×{read,write}=60 原子**（新增 `reports` 域，`seed-rbac` 需重跑落 Permission 表）；MODERATOR 系统角色权限集排除 `admin.reports.*`→调 reports 403，越权不泄金额（仅 SUPER_ADMIN 通配/ADMIN/显式授予该码的自定义角色可读）。架构约束互引：[管理端重构域 admin 边界](API架构设计方案.md#restructure-admin-architecture)。前次（v1.49 | 更新: 2026-10-13 | 变更: **S8 跑马灯/关于正文 CMS 化（finalize-admin-ia-and-ops-gaps B4）**——§5.8 通用配置白名单行由 16 键修正为 **24 键**（既存漂移一并补齐），新增两键 `partners.marquee`（合作企业名单，JSON 字符串数组）、`about.body`（首页关于正文，纯文本），均 `configGroup=home`，写入经 `normalizeConfigValue`（marquee/richText 新 kind，校验后存原文）后 `revalidateTag('site-home')+revalidatePath('/')`，首页即时生效；**零 schema 迁移**（复用 SystemConfig）。无新端点，仅白名单扩容。架构约束互引：[管理端重构域 admin 边界](API架构设计方案.md#restructure-admin-architecture)。前次（v1.48 | 更新: 2026-10-13 | 变更: **S5 在途冻结款只读分页端点登记（finalize-admin-ia-and-ops-gaps）**——新增 §5.8.8 登记 GET `/api/v1/admin/holds`（BalanceHold 按 status/userId/from/to 只读分页，`admin.wallets.read`；金额 BigInt→string + fenToYuan；`userId`/`currency` 经所属 Wallet 关联回填；**零 schema 迁移**，依 spec §5 默认 + N-1 索引假设复用既有 `@@index([status,expiresAt])`/`@@index([walletId])`）。架构约束互引：[管理端重构域 admin 边界](API架构设计方案.md#restructure-admin-architecture)。前次（v1.47 | 更新: 2026-10-13 | 变更: **S4 用户凭据管理端点登记（finalize-admin-ia-and-ops-gaps）**——新增 §5.8.7 登记 GET/POST `/api/v1/admin/users/[id]/credentials{,/revoke}`（ApiKey/StationUserKey/CustomChannel 三类脱敏聚合 + 状态机吊销 + 审计，绝不明文回显）；错误码新增 10009 `CREDENTIAL_NOT_REVOCABLE`（409，先登记后实现，与 `app/api/v1/_lib/errors.ts` 双源对齐）。架构约束互引：[管理端重构域 admin 边界](API架构设计方案.md#restructure-admin-architecture)。前次（v1.46 | 更新: 2026-10-12）：**管理端信息架构重构端点登记收口（restructure-admin-nav-rbac-cms S2-S8）**——新增 §5.8.6「管理端重构 · RBAC/菜单/日志/财务处置/CRUD/报表（已实施）」逐个登记 S2-S8 新引入的 `/api/v1/admin/*` 端点（menus/roles/users·roles/logs·usage·security·scripts/package-orders·recharge-orders 处置/prices/oidc-clients/ranking-weights/**reports-overview**）+ 权限码 + 分页 `Math.min` 封顶口径（S8.4 收口 capabilities/protocols/discovery 未封顶）；`reports/overview` 读 `usage_daily_stats` 日汇总（禁扫 usage_logs 明细）。架构约束互引：[管理端重构域 admin 边界](API架构设计方案.md#restructure-admin-architecture)。前次（v1.45 | 更新: 2026-10-10 | 变更: **采集脚本调度管理闭环（L1-L4 全量路线收口）**——新增 §5.8.5「采集脚本调度管理（**已实施**）」登记 `admin/scripts` 全 CRUD 闭环：`GET /api/v1/admin/scripts`（分页 + `deletedAt` 全局过滤 + `isActive` 过滤，`params` 原样序列化）、`POST /api/v1/admin/scripts`（**新建**调度：`name` 必填、`scriptPath` 白名单 `scripts/(crawl|ranking)/*.ts`、`cronExpression`/`intervalDays` 至少其一且 `intervalDays` 优先算 `nextRunAt`，`cron` 经 cron-parser `TZ` 校验，落库 `createdBy` + 审计 action=1）、`PATCH /api/v1/admin/scripts/[id]`（白名单字段显式映射，频率/启停变更重算 `nextRunAt`，审计 action=2）、`DELETE /api/v1/admin/scripts/[id]`（软删 `deletedAt`+`isActive=false`+`nextRunAt=null`，审计 action=3）、`POST /api/v1/admin/scripts/[id]/trigger`（**触发语义自集合 POST 迁出**：`executeScript(id, params??script.params)`，审计 action=2）；既有 `GET /[id]/executions`（执行历史）、`POST /run-due`（sidecar 到点批跑）并入本节。校验真源 `lib/features/admin/script-validation.ts`（`isValidScriptPath`/`validateCron`/`computeNextRunForSchedule`，新建与 PATCH 共用）。同步 §5.8.4 状态声明加 v1.45 修订：`lib/sync/` 目录已存在、采集/脚本调度侧已落地（原「代码零实现」仅指当时快照）。模型同步源注册表（`lib/sync/sources/registry.ts` `SYNC_SOURCES`）与站点发现 crawl 源（`lib/discovery/llmtest.ts`，`llmtest.cn` API 榜单 → `DiscoveryCandidate`）为 L1/L3 交付。安全侧 L4：`url-policy.ts` 新增 `resolveOutboundProxy`/`getOutboundDispatcher`（代理 env 门控，**默认无代理与 `getSecureDispatcher` 完全等价，SSRF 现状零变化**），`base.ts fetchJson` 改 `safeFetchWithRetry`（5xx/网络错误 3 次退避、`UnsafeUrlError` 不重试）。架构约束互引：[§采集/评测域 admin 边界](API架构设计方案.md#sync-eval-admin-architecture)。前次（v1.44 | 更新: 2026-10-10 | 变更: **上游协议扩展至四种（M3·外部渠道真实上游适配）**——`custom_channels.format`（Prisma `ChannelFormat` enum / shared `GATEWAY_FORMATS`）由 openai/anthropic 两值扩为 **openai/anthropic/openai-responses/gemini** 四值；`adapters.ts` 以 OpenAI 为中枢（hub-and-spoke）实装四协议**真实**上游适配（URL/鉴权头/请求体/响应回转/SSE 聚合），跨格式流式强制走 `callUpstreamAggregated` 聚合后回转（`isPassthroughSafe`：仅 `clientFormat===upstreamFormat` 且属 openai/anthropic 才字节透传）；wire↔enum 边界映射 `gatewayFormatToChannelEnum`/`channelEnumToGatewayFormat`（连字符↔下划线）；「外部渠道」面板 `format` 选择器同步四选一。**注**：本次为「上游协议」`GATEWAY_FORMATS`（2→4）扩展，与「接入体裁」`GATEWAY_ACCESS_FORMATS`（恒 4 值，v1.41）**正交**。架构约束互引：[§7.8 上游协议四值扩展与中枢扇出](API架构设计方案.md#upstream-protocol-quad-architecture)。前次（v1.43 | 2026-10-08）：**乙 后端统一聚合端点**——§5.4 新增 `GET /api/v1/user/channels`（「API 渠道」面板单端点，`kind` 归一 `station`/`custom`：station=`station_user_keys` join `api_stations`、custom=`custom_channels`，**数据库为唯一事实源**——不合成 `catalog:<code>` 伪行，未落库平台在渠道列表不出现；单次请求替代前端本地拼装 `/user/station-keys`+`/user/custom-channels`；仅本人 `requireUserApi`；排序 custom 按 `priority asc, createdAt asc` 在前、station 按 `createdAt desc` 在后；`apiKeyMasked` 恒脱敏）。前次（v1.42 | 2026-10-08）：**N3 丁 官方平台目录 + N4 渠道调度字段**——§5.4 补 `GET /api/v1/user/station-keys/stations` 行（UPSTREAM 站点 ∪ 官方平台目录六家，`catalog:<code>` 命名空间 id，displayName 去重 DB 优先，响应含 `icon/models/brandColor/format/code`）；station-keys POST 行补 **catalog:\* 解析语义**（落库前 `resolveCatalogStationId`：baseUrl 命中复用真实 UUID，未命中按目录 baseUrl 兜底建站 + UPSTREAM 计费规则，未知 code → 40000）；`CustomChannel` 契约补 `models/priority/groupName/weight` 四键（`custom-channels` POST/PATCH 行同步，默认 `models=[] priority=100 weight=1 groupName=null`，FREE_PROXY 分发先按 `models` 过滤再按 `priority/weight` 加权分摊）。前次（v1.41 | 2026-10-08）：**控制台体验修复批次（M1-M5）**——§5.4 gateway/chat 新增**接入格式识别与归一**（`openai`/`anthropic` 之外支持 `openai-responses`、`gemini` 四种接入体裁，route 边界 `detectAccessFormat`→`normalizeAccessRequest` 归一为内部 OpenAI Chat、响应体裁 `serializeAccessResponse` 回填，上游适配层不变）；`user/usage/stats` 新增 `dateFrom`/`dateTo`（YYYY-MM-DD）自定义有界窗口（跨度受 `USAGE_STATS_MAX_WINDOW_DAYS` 校验，非法→40000）；新增 `GET /api/v1/user/usage/breakdown`（渠道×模型×计费路径多维聚合，读 `usage_logs` 明细有界窗口 groupBy，来源优先级 channel>station>platform，仅本人）；`DELETE user/api-keys/[id]` 由吊销（isActive=false）改为**物理删除**（`UsageLog` 不引用 apiKeyId，删除不破坏历史消耗明细）。前次（v1.40 | 2026-10-04）：**铁律 2 收口（冲突审计轮）**——§5.4 末尾对「用量统计聚合读侧」增设**专向互引锚**（[架构约束 §7.5](API架构设计方案.md#usage-stats-architecture)）；v1.39 登记 stats 端点时架构方案侧无对应章节，已于《API架构设计方案》v1.7 补 §7.5，`check-docs-facts` 新增断言 `usage-stats-anchor-pair` 守双向锚。前次（v1.39 | 2026-10-01）：**WF-21 用量统计聚合读侧**——§5.4 新增 `GET /api/v1/user/usage/stats` 行（`range` 三档硬上限、只读 `usage_daily_stats` 日表、按天零填充序列 + 模型 TopN 排行 + 区间汇总，仅本人）。前次（v1.38 | 2026-09-28）：**#73 产品命名一致性收口**——§5.4 navigation 行刷新为**七子项**（前两项主站服务入口 `/models`·`/providers` 不进分类组 + 分类组序补「其它」归口，新增技能云 `/products/skillscloud`）；`category` 三值白名单非法值 400 与 `displayName`/`category` 可 `null` 显式清空入档（口径真源 [术语表](../governance/术语表.md#产品中文名映射712026-09-28)）。前次（v1.37 | 2026-09-28）：§5.7 接入约定补记**二级域名接入口径**——子平台统一以二级域名（`<product>.aidean.com` 示意）对外，`redirect_uri` 白名单登记完整二级域地址，主平台会话 Cookie 保持 host-only 不跨子域共享（详见《子平台SSO接入指南》v1.4 §2.1）。）））
> 前次（v1.36 | 2026-09-28）：**#71 产品中文命名与二级分类**——§5.4 navigation 行刷新（产品下拉中文命名 + 二级分类组，顺修 `/products#aideanwiki` 既存漂移→`/products/aideanwiki`）；§5.8 admin/products 行补 `displayName`/`category` 两键（POST 10 键 / PATCH 10 键可选）与写后 `revalidatePath("/")`（首页产品卡即时生效）；ProductCategory enum（OFFERING 特供 / OPEN_SOURCE 开源 / PARTNER 合作，null=未分类归「其它」组，口径真源术语表#产品中文名映射）
> 前次（v1.35 | 2026-09-26）：**R-83 天梯分带**——§5.2 ladder 行补 `band` 分带参数与 `data.band` 元数据（缓存 v7）、ladder/config 行扩三键（granularity/loadWindowPct/hotVendorCount）
> 前次（v1.34 | 2026-09-22）：§5.8.4 补「实施级设计」（思维设计同步）——Benchmark 手动上传的 **CSV/JSON 导入格式样例**（字段→schema 映射表）、**verifiedStatus 审核流状态机**、**导入幂等与校验口径**；与 §5.8.1-5.8.3 已实施端点持续隔离
> 前次（v1.33）：新增 §5.8.4「采集与评测管理契约（**规划登记 · 未实现**）」——登记 `sync/*` 同步任务、`benchmarks/*` 模型评测两组规划端点及 `BenchmarkSource` 五源语义，明确当前**无实现代码/无 UI**，避免与已实施端点混淆
> 前次（v1.32）：新增 §5.8.3 资讯管理 CRUD（news-admin-cms：/api/v1/admin/news GET/POST、/[id] PATCH/DELETE）
> 前次（v1.31）：§5.1 登记邮箱验证码通道两端点（POST /auth/email/code、POST /auth/email/verify；验证码即注册即登录，登录方案 M4）
> 前次（v1.30）：白名单登记为 16 键——新增 §5.8.2 关于页联系方式两键；§5.8.1 证据行更新为真实保存→回读闭环已取证
> 前次（v1.29）：同步合作产品配置三键与验证边界，替代 Product 扩表草案
> 前次（v1.28）：**RW-3 集成收口轮**——① #26 双计费仲裁定论：`executeChat` 新增 `opts.billingExempt`；② EVAL-01 契约补正（costMinor/costYuan、demo limit 越界 40000）；③ D1–D7 缺陷修复；④ G6 18/18 全绿；⑤ 浏览器取证 5/5 PASS
> 规范继承旧体系《API架构设计方案》（其错误码/模块编码设计已验证成熟），按新项目范围裁剪。

## 1. URL 规范

- 格式：`/api/v1/{resource}/{action?}/{id?}`，版本号入 URL（Stripe 风格）。
- 资源用复数；查询用扁平参数（`/favorites?userId=123`），不做深层嵌套。
- 公开接口与后台接口分前缀：`/api/v1/*`（公开）与 `/api/v1/admin/*`（后台，需管理员权限）。

## 2. 认证

双模式（继承旧体系 D4）：

| 模式 | 用途 | 方式 |
|---|---|---|
| JWT | Web 会话 | `Authorization: Bearer <token>`，login/refresh/me/logout；登录方式：邮箱 + 密码、微信扫码（OAuth），签发同一 JWT 体系 |
| API Key | 统一计费网关调用（**GW-KEY-01 已落地**） | `Authorization: Bearer aid_ak_…` 或 `x-api-key`（双形态），对应 `api_keys` 表（keyHash=HMAC-SHA256 只存哈希；permissions/rateLimit/expiresAt/isActive 全量执行）；无效/吊销/过期 401(10004)、缺权限 403(10008)、超限 429(10006) |

## 3. 接口分层

Route（Zod 校验 / 鉴权 / 响应归一化）→ Service（业务）→ Repository（数据）。Route 不写业务逻辑。

## 4. 统一响应

```json
{ "code": 0, "message": "ok", "data": { }, "requestId": "..." }
```

错误时 `code` 为模块编码 + 序号（如 `10001` 用户不存在、`30001` 模型站不可用），`message` 为人类可读。错误码段位：1xxxx 用户/认证，2xxxx 模型/天梯，3xxxx 模型站/统一API，4xxxx 财务，5xxxx 系统。

**错误码登记表（全量 · 28 码）**——唯一源 [`packages/shared/src/errors.ts`](../../packages/shared/src/errors.ts) 的 `ERROR_CODES`；`HTTP` 列取 `DEFAULT_STATUS_BY_CODE` 覆盖值、缺省按 `httpStatusOf`（`50000`→500、其余→400）；`前端展示` 列取 `ERROR_PRESENTATION` 枚举（`inline`=就近字段/表单、`toast`=非阻断提示、`redirect`=跳转登录/后台、`page`=整页状态）。先登记后实现；本节由 `scripts/contract/gen-contract-tests.mjs` 解析生成 `packages/shared/src/__tests__/contract/errors.generated.spec.ts` 交叉断言，CI 以「重生成 + `git diff --exit-code`」漂移门守文档↔代码一致（改本节须同步重生成）。

| 码位 | 标识 | HTTP | 语义 | 前端展示 |
|---|---|---|---|---|
| 10001 | USER_NOT_FOUND | 400 | 用户不存在 | inline |
| 10002 | EMAIL_DUPLICATED | 400 | 邮箱已被注册 | inline |
| 10003 | INVALID_CREDENTIALS | 401 | 账号或密码错误 | inline |
| 10004 | UNAUTHENTICATED | 401 | 未登录或访问令牌失效 | redirect |
| 10005 | ACCOUNT_DISABLED | 403 | 账号被禁用/软删 | page |
| 10006 | TOO_MANY_REQUESTS | 429 | 请求超限（限流） | toast |
| 10007 | FORBIDDEN_CLIENT_SCOPE | 403 | OAuth 客户端 scope 不足 | page |
| 10008 | FORBIDDEN | 403 | 无权限（缺 isStaff 或权限码） | page |
| 10009 | CREDENTIAL_NOT_REVOCABLE | 409 | 凭据状态不允许吊销 | toast |
| 20001 | MODEL_NOT_FOUND | 400 | 模型不存在 | page |
| 20002 | RANKING_TYPE_INVALID | 400 | 天梯榜单类型非法 | inline |
| 20003 | FAVORITE_TARGET_NOT_FOUND | 400 | 收藏目标不存在/已下线 | toast |
| 20004 | MONITOR_SOURCE_NOT_FOUND | 404 | 模型源监控源 key 未注册（M-002 模型源监控 · PATCH/run） | toast |
| 30001 | SITE_UNAVAILABLE | 400 | 模型站不可用 | toast |
| 30002 | GATEWAY_NO_ROUTE | 400 | 网关无可用路由（候选链为空：无配置且无可用 free 兜底） | inline |
| 30003 | GATEWAY_ALL_FAILED | 400 | 网关全部候选失败（沿降级链尝试耗尽仍无成功） | inline |
| 30004 | UPSTREAM_ERROR | 400 | 上游返回错误（上游非 2xx 或响应不可解析） | inline |
| 30005 | CHANNEL_PROBE_TARGET_FORBIDDEN | 400 | 自定义渠道探测目标被 SSRF 策略拒绝（非 https / 私网 / 回环 / 链路本地 / 云元数据 / 重定向） | inline |
| 40000 | BAD_REQUEST | 400 | 请求体/查询参数 Zod 校验失败 | inline |
| 40001 | INSUFFICIENT_BALANCE | 400 | 余额不足（可用额 = 余额 − 预扣冻结） | inline |
| 40002 | RECHARGE_ORDER_NOT_FOUND | 400 | 充值订单不存在或不属于当前用户 | toast |
| 40003 | ORDER_STATE_INVALID | 400 | 订单状态不允许该操作（非 PENDING 重复受理按幂等成功除外） | toast |
| 40004 | HOLD_INVALID | 400 | 预扣不存在/已捕获/已作废/已过期 | toast |
| 40005 | NOTIFY_SIGNATURE_INVALID | 401 | 支付渠道回调验签失败 | toast |
| 50000 | INTERNAL_ERROR | 500 | 未知异常（内部错误） | toast |
| 50010 | SERVICE_UNAVAILABLE | 503 | 依赖不可用（`/system/ready`：DB 或 Redis 探活失败） | page |
| 50011 | FEATURE_DISABLED | 403 | 功能开关关闭 | page |
| 50012 | MONITOR_SOURCE_CREDENTIAL_MISSING | 503 | 模型源凭证缺失（M-002，监控源需凭证但未配置） | inline |

> 段位设计/统一信封/先登记后实现与契约漂移门等架构约束，权威互引《API架构设计方案》：[§三 错误码段位](API架构设计方案.md#error-code-unified-architecture)（铁律 2 双向锚）。

<a id="api-envelope-exits"></a>

### 4.1 非 2xx 出口信封（B11-10 · **已实施** · DEF-011-13 · Q-11-03=B）

所有 `/api/*` 响应（含框架层出口）均为 [统一信封](../governance/术语表.md#term-envelope-exit) `{code,message,data:null,requestId}`，客户端可无条件 `res.json()`：

| 场景 | HTTP | `code` | 头 | 说明 |
|---|---|---|---|---|
| 路由存在但方法未实现（如 `GET /api/v1/admin/scripts/{id}`，该路由仅 PATCH/DELETE） | **405** | `40000` | `Allow: <已实现方法>, HEAD(有 GET 时), OPTIONS` | 修前为 Next 内置 405：0 字节空体、`content-type=null` |
| `OPTIONS` 任一已存在路由 | **204** | — | `Allow` 同上 | 无体；`Allow` 只列真实实现的方法 |
| 未匹配的 API 路径（`/api`、`/api/v1/no-such`、`/api/v1/admin/scripts/{id}/unknown` …，任意方法） | **404** | `40000` | — | 修前回落 27KB 站点 HTML 404；由 `app/api/[[...slug]]/route.ts` 兜底 |

- `message` 为人类可读文案（含方法/路径），`requestId` 透传入站 `x-request-id`，否则自动生成。
- **错误码口径**：复用已登记的 `40000 BAD_REQUEST`（客户端请求不成立），语义由 HTTP 状态 405/404 区分；`packages/shared/src/errors.ts` 为冻结契约，本节**不新增码位**（专用码 `METHOD_NOT_ALLOWED`/`ROUTE_NOT_FOUND` 如需引入须先走 ADR，见 `EVD-B11-10/deviation.md`）。
- **不在本节范围**：26 条单资源路由补 GET（Q-11-03 选项 A，未采纳）。
- 架构约束与选型理由：[《API架构设计方案》§7.14](API架构设计方案.md#api-envelope-exits-architecture)（铁律 2 双向锚）。

<a id="pagination-params"></a>

### 4.2 分页参数解析口径（B11-11 · **15 个后台列表端点已接入** · DEF-011-15 · Q-11-05=A）

列表端点的 `page` / `pageSize` / `limit` 及整数过滤参数（如 `status`）统一经 [分页参数解析](../governance/术语表.md#term-pagination-parse) 共享件 `apps/web/lib/http/pagination.ts`：

- `page`：缺省 → `1`；`< 1` → `1`；`(page-1)*pageSize` 封顶 `2147483647`。
- `pageSize`：缺省 → 端点默认（缺省 20）；钳制到 `[1, 端点上限]`（缺省上限 100）。
- `limit`（intelligence `reports`/`snapshots`）：缺省 → 30；钳制到 `[1, 1000]`。
- **非法整数串不再 500**（DEF-011-15）：15 个后台列表端点对 `?page=abc`、`?pageSize=xyz` 及整数过滤参数（`action`/`verifiedStatus`/`status`）非数字 → **HTTP 400 + `code=40000`**，且校验发生在任何 Prisma 调用之前（NaN 结构上不可能进 `skip`/`take`/`where`）。
- **边界口径**：空串（`?page=`）视同缺省；纯空白串（`?page=%20`）视为非法 → 400；越界合法值（如 `pageSize=1000`）仍钳制到上限，不 400；`"10abc"` 这类可解析前缀按 `parseInt` 语义取 10（共享件既有语义，未引入全串正则）。
- 整数过滤参数：空串 → 视为未过滤；非数字 → 400。
- 现状：15 个端点全部接入，守卫 `scripts/guard/pagination-guard.mjs` 的 `ALLOWLIST_P1` 已清空（新增裸 `parseInt` / `Number(searchParams…)` 一律 FAIL）。参考实现 `admin/scripts/{id}/executions` 仍为「非法串回退默认（200）」历史口径，是否统一待裁定。走 Zod `z.coerce` 的其余列表端点（`holds`/`models`/`orders`/`users` 等）非法值 → 400 + `40000`，不在共享件范围。
- 架构约束：[《API架构设计方案》§五 分页](API架构设计方案.md#pagination-params-architecture)（铁律 2 双向锚）。

## 5. 接口清单（按模块）

### 5.1 认证 auth
| 方法 | 路径 | 说明 |
|---|---|---|
| POST | /api/v1/auth/register | 注册（邮箱+密码） |
| POST | /api/v1/auth/login | 登录（返回 JWT） |
| POST | /api/v1/auth/email/code | 发送邮箱验证码（限流：IP 10/分 + 同邮箱 60s/次 + 每日 10 封；响应恒为 sent:true 防枚举） |
| POST | /api/v1/auth/email/verify | 验证码核验：登录或注册（未注册邮箱自动建号，占位密码阻断密码登录；签发与密码登录同一 JWT/Cookie 体系；错码统一 10003 防枚举，5 次锁 15 分钟） |
| POST | /api/v1/auth/refresh | 刷新 |
| GET | /api/v1/auth/me | 当前用户 |
| POST | /api/v1/auth/logout | 登出 |

### 5.2 天梯 ladder 与模型 models
| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /api/v1/ladder | 天梯榜单（query: type=models/stations；sort 扩展键 composite/contextLength/latency/price/custom；filters 五键 CSV：modelType/protocol/benchmark/tags/updatedWithin——`updatedWithin` 为发布时间窗 `30d/90d/180d/365d/730d`，按 publishedAt 过滤；tags 中「开源/闭源」为真实过滤（isOpenSource 三态推导，v1.11 起生效），旧 `isOpenSource` 参数仅作 URL 回放兼容；**分页 offset/limit**（默认不分页全量，limit 上限 300；兼容旧消费方）**；R-83 T3 分数带分窗 `band=N`**（0=顶带；带高=后台 `ladder_load_window_pct` 默认 25，band=[75,100]、[50,75)…边界归高带；提供 band 时取代 offset/limit，响应附 `data.band={index,height,gte,hasMore}`，前端据此「上拉加载更多」直至 gte=0）；响应为快科技式扁平排行 `data.entries[rank,...]`，一行=一个模型/站点，rank 为综合分同分并列名次，entries 含 vendorCountry/publishedAt/vendorPriority；缓存键 `ladder:matrix:v7:*`（v7：band 元数据入响应 bump）） |
| GET | /api/v1/models | 模型列表（筛选） |
| GET | /api/v1/models/[id] | 模型详情（Tab1 数据） |
| GET | /api/v1/models/[id]/benchmarks | 基准测试分数 |
| GET | /api/v1/models/[id]/stations | 支持该模型的站点及资费（Tab2，含筛选：格式兼容/国内可达/免费） |
| GET | /api/v1/models/[id]/offerings | 模型多源上架信息（「在哪里可调用」：源/分级/上架状态/原币价/首末次采集/来源链接；relay 源 identityVerified=false；PUBLIC，Redis 600s；契约 ModelOfferingsResponse，TASK-066） |
| GET | /api/v1/search | 顶栏全局搜索（TASK-033，契约 API-012；PUBLIC；query: `q`(trim 后 1..50)、`types`(CSV ⊆ model/product/news，缺省全类型)、`limit`(每类上限 1..10，默认 5)；响应 `data={q,hits[],tookMs}` 契约 SearchResponseSchema，hit={type,id,title,subtitle|null,href(站内绝对路径)}；可见性口径：AiModel 未软删+isActive+status=ACTIVE、Product status=ACTIVE+未软删、NewsItem status=PUBLISHED；contains+mode insensitive 三路 Promise.all 并发，无扩展无新索引；IP 级固定窗口限流 30 次/60s（`rl:search:{ip}`，Redis 故障 fail-open，超限 10006→429）；`force-dynamic`；架构约束见 [§7.12 顶栏全局搜索架构边界](API架构设计方案.md#search-architecture)） |

<a id="effective-price-fields"></a>

#### 5.2.1 EffectivePrice 字段表（计价口径归一 · ADR-P005 v0.4 · TASK-048/053/054）
> 契约唯一源 `packages/shared/src/schemas/promotion.schema.ts#EffectivePriceSchema`（v0.2）；由 `/api/v1/models/[id]` 与 `/pricing` 消费。归一规则见《网关计费时序契约》[§12 生效价归一](网关计费时序契约.md#pricing-normalization)，术语见[「计价口径归一」](../governance/术语表.md#term-pricing-normalization)。

| 字段 | 类型 | 说明 |
|---|---|---|
| modelId | string | 模型 id |
| priceInput / priceOutput | DecimalStr | 归一后的输入/输出单价（`currency` / `unit` 口径） |
| priceCache | DecimalStr \| null | 归一后的缓存命中单价；缺失时网关回退输入价（TASK-080） |
| isPromotion | boolean | 是否命中限时优惠窗口 |
| promotionEndsAt | ISO \| null | 优惠结束时刻（半开窗右端） |
| basePriceInput / basePriceOutput | DecimalStr \| null | 优惠生效时的原价（同口径归一），供划线展示；非优惠为 null |
| currency | `CNY` \| `USD` | 归一目标币种：网关恒 `CNY`（结算币种）；读侧为展示币种（中国大陆 CNY，其他 USD，TASK-102） |
| unit | `per_million_tokens` | 归一单位，恒为每百万 Token |
| sourceCurrency / sourceUnit | string | 原始行 `billingCurrency` / `billingUnit`（原价可见） |
| sourcePriceInput / sourcePriceOutput | DecimalStr | 原币原单位价（官方价，不被换算价替换） |
| fxRate | DecimalStr \| null | 本次归一使用的汇率（同币种为 null） |
| fxDate | `YYYY-MM-DD` \| null | 汇率快照日（Asia/Shanghai 自然日；回退 ≤3 天） |

> 用户裁决口径（26_用户裁决记录）：U-15 按 IP 展示币种 + 日汇率快照；U-23=B 免费模型不查余额；U-24=A 上架映射列只存平台 id。

> 不可归一（未知币种/单位、跨币种缺汇率）→ 读侧该价为 null，前台显示「价格待核」，绝不显示 0；网关跳过该候选（fail-closed）。

> 架构约束（路由分层/统一响应/鉴权/分页限流）遵循《[API架构设计方案](API架构设计方案.md)》[§一 路由分层](API架构设计方案.md#一路由分层) 与 [§二 统一响应结构](API架构设计方案.md#二统一响应结构)——本节末尾互引锚点（铁律 2）。

### 5.3 模型站 stations（大模型云服务天梯图）
| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /api/v1/stations | 大模型云服务天梯图（模型站榜，默认 API 版排序；端点维度） |
| GET | /api/v1/stations/[id] | 模型站详情（上线时间、可用率、好评率） |
| GET | /api/v1/stations/[id]/reviews | 好评/差评明细 |
| GET | /api/v1/stations/[id]/prices | 价格柱状图数据（输入/输出/缓存命中，按价升序） |

### 5.7 SSO / OIDC（M-SSO，主平台作为 Identity Provider，详见 ADR-0002）
| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /.well-known/openid-configuration | OIDC 发现（issuer/端点/能力声明） |
| GET | /.well-known/jwks.json | JWKS 公钥集（RS256；产品侧缓存后本地验签，零网络往返） |
| GET | /oauth/authorize | 授权码签发（redirect_uri 精确白名单；state 必填；PKCE S256；未登录跳主站登录页） |
| POST | /oauth/token | code/refresh_token 双 grant 兑换（client Basic/post 认证；code 一次性 60s；refresh 轮换 + 重放检测整链撤销） |
| GET | /oauth/userinfo | Bearer 用户资料（sub/email/nickname/tier/role） |
| POST | /oauth/revoke | 撤销 refresh 链（RFC 7009 子集；恒 200 不泄露存在性） |
| POST | /oauth/introspect | refresh 内省（强实时撤销需求的接入方） |
| GET | /oauth/dev/callback | dev 联调模拟回调页（子平台授权码跳转联调用：回显 code/state/error 等查询参数；force-dynamic no-store，非协议端点无鉴权，仅本地/联调环境使用；**生产 404**：`NODE_ENV=production` 时 `notFound()`，UX-21 / 2026-10-22） |
| GET | /api/v1/internal/billing/wallet?userId= | **服务间**钱包/套餐实时查询（client 认证 + scope `wallet:read`） |

**接入约定**：新平台接入 = `oidc_clients` 注册一行（clientId/secret 哈希/redirect 白名单/scopes）+ 标准授权码跳转流；子平台统一以**二级域名**（`<product>.aidean.com` 示意）对外，`redirect_uri` 白名单登记完整二级域地址（域名/TLS/Cookie 作用域口径见《[子平台SSO接入指南](../product/modules/子平台SSO接入指南.md)》§2.1）；用户身份锚点为 `sub=User.id`，claims 携带 `tier`（NORMAL/PRO/MAX）与 `ver`（tokenVersion）。错误码新增：10006 TOO_MANY_REQUESTS(429)、10007 FORBIDDEN_CLIENT_SCOPE(403)。**分步接入操作手册见《[子平台SSO接入指南](../product/modules/子平台SSO接入指南.md)》（本节为端点权威清单，参数与响应形态以代码为准）。**

### 5.4 统一计费网关 gateway（implement-gateway-module，MVP）
| 方法 | 路径 | 说明 |
|---|---|---|
| POST | /api/v1/gateway/chat | 统一 API 入口：`detectAccessFormat` 按 body 形态识别**四种接入格式**（`openai` Chat Completions / `anthropic` Messages / `openai-responses` Responses API / `gemini` generateContent），在 route 边界经 `normalizeAccessRequest` 归一为内部 OpenAI Chat（responses/gemini 强制走聚合非流式，响应体裁由 `serializeAccessResponse` 回填），上游适配层不变（对仅单格式上游自动协议中转）；优先级路由 + 故障自动降级 + free 兜底；平台 Key 路径预扣-按实捕获（余额不足自动降级），自有渠道路径免费中转不扣费；stream=true 仅 openai/anthropic 支持流式，responses/gemini 及非法 body → 40000 |
| GET/POST/PUT/DELETE | /api/v1/user/custom-channels | 自定义平台渠道管理（base_url + Key，兼容 **OpenAI / Anthropic / OpenAI Responses / Gemini** 四种上游协议——`format` 列 `ChannelFormat` enum，2026-10-10 由两值扩为四值，跨格式流式经网关聚合回转，见架构 §7.8；不扣余额、无限制免费中转；apiKey 经 AES-256-GCM 密文落库 `key_cipher`，界面仅 `key_masked` 脱敏、永不出明文/密文）。**N4 丙 调度字段**（v1.42）：POST/PUT 增 `models`（`string[]`，默认 `[]` 空=不限模型）、`priority`（int，默认 100，**数值越小越优先**）、`groupName`（`string|null`，可选分组名）、`weight`（int，默认 1，同优先级组内加权分摊系数）。网关 FREE_PROXY 分发先按 `models` 过滤（`channelServesModel`，空数组=全模型）再按 `priority` 升序分组、同组内 `weight` 加权随机挑选（`pickChannel`）；`failedChannelIds` 触发同组剔除后**级联降级到低优先级组**，直至可用渠道耗尽才 fallback。架构约束（契约字段/分发顺序/并发口径 A）互引：[§7.6.2 自定义渠道调度边界](API架构设计方案.md#catalog-channel-scheduling-architecture) |
| GET | /api/v1/user/usage | Token 用量与扣费明细分页（model / billingPath 过滤；仅本人） |
| GET | /api/v1/user/usage/stats | 用量统计聚合（WF-21 / P5 报表读侧）：`range`=`7d\|30d\|90d`（缺省 30d，服务端硬上限）**或 `dateFrom`+`dateTo`（YYYY-MM-DD）自定义窗口**（须成对，`date` 优先于 `range`；跨度受 `USAGE_STATS_MAX_WINDOW_DAYS` 有界校验，非法/越界 → 40000）；只读 `usage_daily_stats` 日表（`@@index([userId, day])`，**禁扫 usage_logs 明细**）；返回按天零填充序列（tokens=request+completion、requestCount、花费元字符串）+ 模型维度 TopN 排行（默认 N=10）+ 区间汇总；仅本人（requireUserApi） |
| GET | /api/v1/user/usage/breakdown | 用量多维明细聚合（P5 报表 · 渠道×模型×计费路径）：入参同 stats（`range` 或 `dateFrom`+`dateTo`）；读 `usage_logs` **有界窗口** `groupBy([stationId,channelId,model,billingPath])`（受 `USAGE_STATS_MAX_WINDOW_DAYS` 上限约束，非全表扫），来源优先级 channel(自定义渠道)>station(自有密钥)>platform(平台)，名称回填限本人可见（越权防护），返回 `rows`（tokens=prompt+completion、requestCount、quotaYuan 元字符串）+ 区间合计；仅本人（requireUserApi），非法窗口 → 40000 |
| GET/POST | /api/v1/user/api-keys | 平台 API Key 管理（GW-KEY-01）：GET 本人脱敏列表（keyId/permissions/rateLimit/状态，永不回明文与哈希）；POST 创建（32B 随机 secret，`aid_ak_<16hex>_<43char>` 形态，HMAC-SHA256 库内只存哈希，**明文仅创建响应返回一次**；permissions 当前 `gateway:chat`；rateLimit 缺省 60 req/min；expiresAt 可选） |
| DELETE | /api/v1/user/api-keys/[id] | **物理删除**本人 API Key（GW-KEY-01/M1：平台 Key 应删除而非吊销，`deleteApiKey` 移除整行；`UsageLog` 不引用 apiKeyId，删除不破坏历史消耗明细）；0 行（不存在/非本人）→ 40000 |
| GET/POST/DELETE | /api/v1/user/station-keys | 用户自有上游 Key（GW-KEY-01，站点维度 userId+stationId 唯一）：GET 脱敏列表（keyMasked）；POST 录入/覆盖（AES-256-GCM 密文落库，密钥 JWT_SECRET 派生；UPSTREAM 站命中后直调上游不扣平台余额）；DELETE 按 stationId 删除。**N3 丁 catalog:\* 解析**（v1.42）：POST 传入 `stationId` 形如 `catalog:<code>`（来自 station-keys/stations 的目录项）时，经 `resolveCatalogStationId` 解析——目录存在则按 `baseUrl` 幂等命中 `api_stations` 复用真实 UUID，未命中则按目录 baseUrl 兜底建站并写 `StationBillingRule billingMode=UPSTREAM`，未知 `catalog:<code>` → 40000（不静默造站）；普通 UUID 直通不解析。已入库目录项（如 seed 落库的 openai）直接复用真实站点 id，不重复建站/不重复 upsert 计费规则。架构约束（命名空间隔离/录入解析/SSRF 守卫）互引：[§7.6.1 官方平台目录](API架构设计方案.md#catalog-channel-scheduling-architecture) |
| GET | /api/v1/user/station-keys/stations | **官方平台目录 ∪ UPSTREAM 站点列表**（N3 丁，v1.42）：返回可选计费站点，供「接入密钥」面板下拉选择平台。数据 = 库内 `billingMode=UPSTREAM` 活跃站点 ∪ `OFFICIAL_PLATFORM_CATALOG` 六家主流平台（openai/anthropic/deepseek/moonshot/zhipu/qwen，即使未入库也能开箱可选）；目录项 id 用 `catalog:<code>` 命名空间，与真实站点 UUID 隔离；以 `displayName` 去重（trim+lower），**DB 行优先**（保留真实 UUID 供录入落库，目录项作开箱兜底）。响应字段 `{id, displayName, baseUrl, code, icon, brandColor, models, format}`。鉴权：`requireUserApi` |
| GET | /api/v1/user/channels | **API 渠道聚合**（乙 · 后端统一，v1.43）：一次返回「API 渠道」面板全量渠道，`kind` 归一 `station`/`custom`——station=`station_user_keys` join `api_stations`（UPSTREAM 站点）、custom=`custom_channels`；**数据库为唯一事实源**，**不合成 `catalog:<code>` 伪行**（未落库的平台在渠道列表不出现，用户选择目录项后经 POST 落库自然出现）；**替代前端本地拼装** `/user/station-keys`+`/user/custom-channels`（单次请求）。响应 `items: ApiChannelView[]`，字段 `{kind, id, name, baseUrl, format, models, isActive, apiKeyMasked, createdAt}` + kind 专属（station→`stationId`；custom→`priority/groupName/weight`）；排序 **custom 按 `priority asc, createdAt asc` 在前**、**station 按 `createdAt desc` 在后**；`apiKeyMasked` 恒脱敏，明文/密文永不出 service 层。仅本人（`requireUserApi`，`where: { userId }` 双保险）。架构约束互引：[§7.7 API 渠道聚合边界](API架构设计方案.md#api-channels-aggregate-architecture) |

控制台路由配置（通用版等级绑定 / 专业版 1~99 优先级，两形态共享底层配置）由 §5.1 认证后的用户域端点承接：`/api/v1/user/tier-mappings` 与 `/api/v1/user/priorities`（A.2.2 已交付）；free 等级由系统自动加载、只读。
> GW-KEY-01 销账：API Key 网关鉴权（§2 第二行）与用户自有上游 Key（`station_user_keys` + UPSTREAM 计费路径，时序见《[网关计费时序契约](网关计费时序契约.md)》§2）已交付；/user/station-apis 的站点注册管理面仍随第二阶段（当前以 stationId 直填录入）。错误码 30002~30004 见 §4。
> RW-2 实现确权：上述三组路由 6 操作已真实落盘（`app/api/v1/user/api-keys/`、`[id]/`、`station-keys/`，withApi + requireUserApi，路由零业务逻辑），配路由层直调测试 13 例（`routes-apikey.spec.ts` 全绿）；GW-KEY-01 报告「3 路由文件 6 操作」当时为虚记（路由层未落盘），本轮补齐并三联确权（写→回读→find）。
>
> 架构约束（路由分层/统一响应/鉴权/分页限流）遵循《[API架构设计方案](API架构设计方案.md)》[§一 路由分层](API架构设计方案.md#一路由分层) 与 [§二 统一响应结构](API架构设计方案.md#二统一响应结构)——本节末尾互引锚点（铁律 2）。
>
> 用量统计聚合读侧（`/user/usage/stats`）架构约束专向互引：[§7.5 用量统计聚合读侧边界](API架构设计方案.md#usage-stats-architecture)。

### 5.4.1 对比测评 evaluations（GW-COMPARE · 角色2 契约并表）
> RW-2 依 `docs/specs/implement-evaluation-compare/spec.md` 并表；实现以代码为准，若与本表不符以代码为准并标注差异上报。

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | /api/v1/evaluations | 创建即跑（requireUserApi；tier=NORMAL → 403/10008「付费用户能力」）：body `{prompt 1..2000, modelIds string[2..6], idempotencyKey?≤64}`；幂等键查重（命中返回既有单 idempotent=true）→ 模型存在性校验（40000）→ 建单 → hold（requestId=`eval:<id>`，余额不足 40001 → 建单即败 status=3）→ 并行 executeChat（每模型 requestId=`eval:<id>:<modelId>`，60s 超时非流式，**billingExempt=true → 网关跳过 hold/capture，评估域独占 ¥2/模型 计费**，#26 仲裁定论）→ 结算；响应 `{evaluation: EvaluationDetail, idempotent: boolean}`；错误 40000/40001/403/401 |
| GET | /api/v1/evaluations?page=&pageSize= | 我的分页（requireUserApi）：page≥1、pageSize 1..50；响应 `{rows: EvaluationListRow[], total, page, pageSize}`（createdAt 倒序）；40000 参数非法、401 未登录 |
| GET | /api/v1/evaluations/demo?limit= | 公开示例（无鉴权；仅 isPaid=false 预置示例；limit 1..10 默认 3，**越界 → 40000**）；响应 `{items: EvaluationDetail[]}` |
| GET | /api/v1/evaluations/[id] | 详情（requireUserApi；本人或 isPaid=false 示例可见，他人付费单 403）；读路径惰性对账（status=1 且 startedAt 超 2×60s → 按 usage_logs **成功行**（error:null）前缀 `eval:<id>:%` 实况补偿后返回）；响应 `{evaluation}`（models[] 含 response/status/errorMessage/tokens/latency；**EvaluationDetail 含 costMinor=分整数字符串 + costYuan=元两位小数字符串**） |

### 5.4.2 收藏 favorites（S3 · API-005/006/007 · REQ-F-052）
> 端点登记（TASK-090 收口可见性；TASK-025 补登数据模型/架构边界转实然）；契约唯一源 `packages/shared/src/schemas/favorites.schema.ts`；数据模型见 [《数据库文档》§九](数据库文档.md)（`favorites` 行·✅ 已激活），架构边界见 [§7.11 收藏（favorites）架构边界](API架构设计方案.md#favorites-architecture)（铁律 2 双向互引）。三端点路由首行 `requireFeature("favorites.enabled")` **先于** `requireUserApi()`（关闭→50011→403；未登录→10004→401）。

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /api/v1/user/favorites | 我的收藏分页（API-005）：query `FavoriteListQuerySchema`（`page≥1`、`pageSize 1..50`、`refType?` 可选过滤 `MODEL`/`API_STATION`）；`data = FavoriteListResponseSchema`；错误 40000/10004/50011 |
| POST | /api/v1/user/favorites | 收藏（API-006）：body `FavoriteCreateSchema`；`@@unique[userId,refType,refId]` 幂等 upsert，目标不存在/已下线 → 20003；错误 40000/20003/10004/50011 |
| DELETE | /api/v1/user/favorites/[id] | 取消收藏（API-007）：物理删本人记录，0 行（不存在/非本人）→ 40000（防枚举）；错误 40000/10004/50011 |

### 5.5 套餐 packages（第二阶段）
| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /api/v1/packages | 套餐列表（所属平台、权益内容、价格、有效期） |
| POST | /api/v1/package-orders | 余额兑换套餐（平台内权益；兑换后该平台请求按套餐直连计费） |
| GET | /api/v1/package-orders/[id] | 兑换订单详情与权益状态 |

### 5.6 兑换码 redemption（第二阶段）
| 方法 | 路径 | 说明 |
|---|---|---|
| POST | /api/v1/redemption/redeem | 核销兑换码（登录态 requireUserApi + Redis 固定窗口限流 5 次/分/user）：余额码→wallet GRANT 入账（幂等键 `redemption:{id}`）；套餐码→PackageOrder ACTIVE。单事务 CAS 防并发双花（恰一单入账）；已用/禁用/过期 → 40000 段；未登录 10004；超限 10006(429) |
| GET | /api/v1/user/redemptions | 用户兑换记录 |
| GET | /api/v1/partner/codes | 卡商取码（v1.13 新增）：`X-API-Key`（SHA-256 比对 PartnerKey.keyHash，isActive）鉴权 + Redis 限流 60 次/分/key；`?count≤100&targetType=BALANCE\|PACKAGE&balanceMinor`（正整数分，非法→40000）；事务内 ENABLED→ISSUED 出库返回明文，候选不足→40000 不出部分货；更新 lastUsedAt；无效 Key→401(10004) |
| GET | /api/v1/partner/codes/status | 卡商查码对账（v1.13 新增）：`?code=` 同 X-API-Key 鉴权；仅返回 status/targetType/redeemedAt 状态面，不泄面额/归属；码不存在→40000 |

### 5.7 系统 system
| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /api/v1/system/health | 健康检查 |
| GET | /api/v1/system/ready | **就绪探针**（API-001 / REQ-NF-002 / TASK-003）：DB + Redis 均可达 → 200 + `SystemReadySchema`（`status:"ready"`、`checks.db/redis:"ok"`、`time` ISO 串）；任一不可达 → 抛 `50010 SERVICE_UNAVAILABLE` → HTTP 503（`message` 形如「依赖不可用: db」）；`force-dynamic` 实时探测禁构建期预渲染，PUBLIC 无鉴权（CI e2e-skeleton job 以 `next start` 后本端点=200 为放行门） |
| GET | /api/v1/system/features | **公开功能开关快照**（API-002 / REQ-F-041 / TASK-015）：PUBLIC 无鉴权，`data = PublicFeaturesSchema`（`{ flags: Record<code, boolean> }`，仅 7 码开/关布尔，DESIGN-001 隐私边界不暴露 rollout/config/时间窗）；读经 `getFeatureFlags()`（`unstable_cache` tag `feature-flags`）后台 PATCH 后即时反映，`force-dynamic` 禁构建期固化。运行时边界见《API架构设计方案》[§7.10](API架构设计方案.md#feature-flag-runtime-architecture) |
| GET | /api/v1/system/config | 公开配置（排名权重、功能开关） |
| GET | /api/v1/system/navigation | 导航（一级八项：首页/资讯/产品/价格/文档/路线图/合作/关于；「产品」含可选 children 二级子项共 7 条——前两项为**主站服务入口**模型天梯图`/models`、模型服务提供商`/providers`（非产品、不进分类组、绑定不变），其后按二级分类组序 特供→开源→合作→其它：信源引擎机器人`/products/wechatrag`、自动化舰队引擎`/products/aideanfleet`、独立知识百科`/products/aideanwiki`、论文审查助手`/products/aideanthesis`、技能云`/products/skillscloud`（子项可带非链接分组头 `group`，仅 children 项上有意义，文案唯一来源 `lib/product-label.ts` `PRODUCT_CATEGORY_LABELS`；导航↔产品底稿双向一致性由 `lib/navigation-sync.spec.ts` 守）；Logo 回首页为前端行为） |

### 5.8 后台 admin（第二阶段）
用户、模型、模型站、榜单配置、同步任务、内容、财务、Key 池、计费规则（加价率 / Token 倍率，敏感不出公开接口）、模型等级池、免费额度、套餐、兑换码等管理接口，统一 `/api/v1/admin/*`，结构与旧体系 admin 区一致，实施时展开。

已实施（v1.13，需管理员会话 requireAdminApi：未登录 10004→401 / 非管理员 10008→403；写操作落 audit_logs；分页 page≥1/pageSize≤50）：
| 方法 | 路径 | 说明 |
|---|---|---|
| GET / PUT | /api/v1/admin/ladder/config | 天梯图后台配置（R-83 T2 扩三键：GET 读取 `{granularity, loadWindowPct, hotVendorCount}`；PUT body 三键至少其一——`granularity` 合法域 0.01–10 默认 0.1、`loadWindowPct` 分带百分比 1–100 默认 25、`hotVendorCount` 热门开发商列数 1–100 默认 8，非法值 clamp；分别落 SystemConfig `ladder_score_granularity`/`ladder_load_window_pct`/`ladder_hot_vendor_count`；每键写 audit_logs(tableName=system_configs, action=2)；PUT 后 revalidatePath /models 与 /ladder） |
| GET / PUT | /api/v1/admin/vendors | 厂商优先级配置（GET 厂商列表含 priority；PUT body `{priorities:[{id,priority 1-99}]}`，事务逐行 update vendors.priority——数值越小天梯图列离性能轴越近；PUT 成功逐行写 audit_logs(tableName=vendors, action=2)） |
| GET / POST | /api/v1/admin/vendors | 厂商管理扩展（POST 新建：code/name/nameCn/priority/isActive，code 唯一重复→40000；GET 列表按 priority 升序，软删行不含） |
| PATCH / DELETE | /api/v1/admin/vendors/[id] | 厂商编辑（白名单 name/nameCn/priority/isActive，code 不可改）/ 软删（deletedAt+isActive=false；有模型引用沿软删语义不物理删） |
| GET | /api/v1/admin/users | 用户列表（分页 + email 模糊搜索 q；返回 id/email/nickname/tier/status/role/createdAt/lastLoginAt/walletId/balanceYuan） |
| PATCH | /api/v1/admin/users/[id] | 用户 tier/status 白名单（tier NORMAL\|PRO\|MAX；status ACTIVE\|SUSPENDED）；封禁→SUSPENDED 且 tokenVersion++（全端令牌失效，me 401）；解封不回退 ver |
| GET | /api/v1/admin/models | 模型列表（分页 + modelCode/nameDisplay 模糊搜索，含 vendor 名称投影） |
| PATCH | /api/v1/admin/models/[id] | 模型编辑白名单（nameDisplay/isActive/visibility/isFeatured/sortOrder）；isActive 变更→revalidatePath("/models") 前台即时生效 |
| GET / POST | /api/v1/admin/products | 产品管理（GET 全量含 DISABLED 按 sortOrder，benefits Json 还原数组，含 #71 `displayName`（中文显示名，空=显英文）与 `category`（ProductCategory 特供/开源/合作，null=未分类）；POST 新建 slug 唯一重复→40000） |
| PATCH / DELETE | /api/v1/admin/products/[id] | 产品编辑（白名单：name/displayName/category/tagline/description/badge/benefits/intro/status/sortOrder，10 键；#71 新增 displayName/category 两键可 null 显式清空）/ 软删（deletedAt+status=DISABLED）；均 revalidatePath("/") + /products + /products/<slug>（#71 补首页产品卡即时生效） |
| GET / POST | /api/v1/admin/packages | 套餐管理（GET 含已兑换计数 + PackageOrder 最近 50 条只读列表；POST 新建 priceMinor 分 BigInt） |
| PATCH / DELETE | /api/v1/admin/packages/[id] | 套餐编辑白名单 / 软删（有兑换码引用仅置 DISABLED 保持对账，无引用软删） |
| GET | /api/v1/admin/redemption-codes | 兑换码列表（分页 + batchNo 精确筛选 + status 五态白名单 ENABLED\\|ISSUED\\|USED\\|DISABLED\\|EXPIRED 非法→40000 + 批次聚合统计；明文码不在此返回，仅掩码 codeMasked） |
| POST | /api/v1/admin/redemption-codes/batches | 批次生成（count≤500/prefix≤8/面额或套餐绑定；余额码须 balanceMinor 且 ≤1e8 分、套餐码须 packageId；expiresAt 须为未来时间；响应一次性返回明文码数组供前端 CSV 导出，服务端不另存副本） |
| PATCH | /api/v1/admin/redemption-codes/[id] | 单码禁用（仅 ENABLED/ISSUED 可禁；已用/已禁返回 changed=false） |
| POST | /api/v1/admin/redemption-codes/batches/[batchNo]/disable | 整批禁用（复用 service.disableBatch，仅 ENABLED/ISSUED 计入 disabled，幂等；写 audit_logs(tableName=redemptions, action=2, recordId=batchNo)） |
| GET / POST | /api/v1/admin/partner-keys | 卡商密钥管理（POST 生成 `ak_`+32hex 明文仅本次响应返回，库内只存 SHA-256 + prefix 前 8 位；GET 列表不返回 hash） |
| PATCH | /api/v1/admin/partner-keys/[id] | 卡商密钥启停（isActive=false 后该 Key 取码 401） |
| POST | /api/v1/admin/wallets/adjust | 余额调账（walletId/amountMinor 可负恒非 0/note 必填≤200 字；ledger ADJUST 分录 + 乐观锁推进；幂等键 `admin-adjust:{walletId}:{key}`；FROZEN/CLOSED 拒绝→40000；负调账余额不足→40001；写 AuditLog） |
| GET | /api/v1/admin/orders | 订单/流水只读（P0：type=RECHARGE\|PACKAGE_ORDER\|LEDGER 缺省 RECHARGE；userId 可选精确筛选；分页 page≥1/pageSize≤50；金额 BigInt→string + fenToYuan 元口径；三表只读投影禁写） |
| GET / PUT | /api/v1/admin/configs | 管理员配置白名单现为 **24 键**（ladder + site.*6 + pricing.*2 + security.*3 + about.*2 + roadmap + partners.*3 + home.*3 + docs + **S8 新增 `partners.marquee`/`about.body`**，均 `configGroup=home`）；GET 保留 configs 元数据投影与缺行默认值；PUT `{configKey,configValue}`，number 或 trim 后最多 10000 字符的 string。各旧键仍由 valueRule 保留原长度/枚举/数值约束；合作内容使用严格 JSON schema。写入审计，非法键/值 40000；详见下节合作配置契约。 |

> P3 文案层（v1.18 扩容）：管理端校验错误经 `formatZodMessage` 统一中文化——`invalid_enum_value`→「枚举值非法，允许 X/Y」、`invalid_type`→「参数类型非法（期望 X，收到 Y）」、`too_small/too_big`→「数值低于下限/超出上限（路径：…）」、custom 透传；错误码不变仍 40000。**已接入 14 处**：orders / redemption-codes GET 查询参数、configs PUT，及 11 个写端点（vendors、vendors/[id]、products、products/[id]、packages、packages/[id]、partner-keys、users/[id]、models/[id]、wallets/adjust、redemption-codes/batches 的 POST/PATCH）；`users`/`models` GET 分页沿用既存硬编码中文「分页参数非法」

> 架构约束（路由分层/统一响应/鉴权/分页限流）遵循《[API架构设计方案](API架构设计方案.md)》[§一 路由分层](API架构设计方案.md#一路由分层) 与 [§二 统一响应结构](API架构设计方案.md#二统一响应结构)——本节末尾互引锚点（铁律 2）。

<a id="partner-content-api"></a>
### 5.8.1 合作内容配置契约

[合作产品](../governance/术语表.md#合作产品)复用 [SystemConfig](../governance/术语表.md#systemconfig)，不扩展 products API。键为 `partners.education` / `partners.paper` / `partners.research`；`configValue` 为 JSON 字符串，严格字段：`enabled`（boolean，默认 true）、`title`（1–120）、`subtitle`（≤200）、`description`（≤2000）、`notes`（≤1000）、`coverUrl` / `videoUrl`（可空，各≤500）、`images`（非空图片 URL 数组≤6，各≤500）。字符串 trim，总长≤10000，媒体格式及路径白名单见 [模块约束](../product/design/合作产品内容配置.md#内容与媒体)。

GET 沿用 `data.configs[]` 的 configKey/configGroup/configType/configValue/defaultValue/description/inputType/sortOrder/updatedAt；缺行仍以默认值投影。PUT 成功沿用 `data.config={configKey,configType,configValue}`，规范化后 upsert、审计并 revalidate `/partners`。未登录 HTTP401/10004，非管理员 HTTP403/10008，非法键、JSON、字段或媒体 HTTP400/40000。未新增公开内容端点。

证据：单测/类型检查全绿；2026-09-17 真实后台保存→公开页回读→数据还原闭环已取证（`partners.education.subtitle` 探针标记出现在 /partners SSR，还原后消失），见《[导航与内容页面验收](../archive/导航与内容页面验收.md)》。

本节架构约束互引：[合作内容隔离与读取](API架构设计方案.md#partner-content-architecture)。

<a id="about-contact-api"></a>
### 5.8.2 关于页联系方式配置契约

关于页联系方式两键复用 [SystemConfig](../governance/术语表.md#systemconfig)，经同一 `PUT /api/v1/admin/configs` 链路写入：`about.contactEmail`（`kind:email`——trim 后必填、≤200 字、须匹配邮箱格式，非法 → 400/40000，默认 `591547726@qq.com`）；`about.wechatQrUrl`（`kind:qrImage`——空串合法且语义为「前台显示待上传占位」，非空须通过 `isSafeMediaUrl` 图片白名单（http(s) 或 `/images/`、`/media/` 安全路径；PNG/JPEG/WebP/GIF/AVIF，不接受 SVG），≤500 字）。PUT 成功同样审计并 revalidate `/about`；错误形态与 §5.8.1 一致。管理端编辑入口为 `/admin/configs` 的 `AboutContactEditor`（界面见 [§十一 关于页联系方式](../product/design/界面交互文档.md#about-contact-ui)）；前台展示尺寸由 SafeImage 固定为 200px 方形，不随上传素材变化。

2026-09-17 真实闭环已取证：探针 URL 保存后出现于 `/about` 的 `<img src>`，还原空串后恢复「二维码待上传」占位。

本节架构约束互引：[关于页联系方式键与占位边界](API架构设计方案.md#about-contact-architecture)。

<a id="news-admin-api"></a>
### 5.8.3 资讯管理契约（news-admin-cms）

[NewsItem（资讯）](../governance/术语表.md#newsitem)独立表存储，后台三端点管理（`requireAdminApi`：未登录 10004→401 / 非管理员 10008→403；写路径落 audit_logs(tableName=news_items) 并 `revalidatePath("/news")` 即时同步前台）：

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /api/v1/admin/news | 全量列表（含 DRAFT，无分页——资讯为运营小表）；排序 pinned desc → publishedAt desc → createdAt desc；`data.items[]` 含 contentMarkdown **原样**（编辑回读即库内 Markdown，不经渲染） |
| POST | /api/v1/admin/news | 新建（`AdminNewsCreateSchema.strict()`：slug 小写字母数字中划线 2–64 位首尾非中划线、title 必填 ≤120、summary ≤300、category ∈ [NEWS_CATEGORIES 白名单](../governance/术语表.md#资讯分类)、contentMarkdown ≥1 字 ≤50000、pinned 默认 false、status 默认 DRAFT——仅 PUBLISHED 落 publishedAt）；slug 唯一冲突（P2002）→ 400/40000「资讯 slug 已存在」；`data.item` 返回 id/slug/title/status/pinned |
| PATCH | /api/v1/admin/news/[id] | 部分更新（`AdminNewsPatchSchema`=Create 全字段 partial + 至少一字段；slug 可改但查重同 400）；DRAFT→PUBLISHED 首次发布自动补 publishedAt（此后不再覆盖）；目标不存在 → 400/40000「资讯不存在」 |
| DELETE | /api/v1/admin/news/[id] | 硬删（资讯为内容条目、无业务外键关联；删除即消失并审计 action=3）；目标不存在 → 400/40000「资讯不存在」 |

错误码：参数非法/不存在统一 40000（文案经 `formatZodMessage` 中文化）；成功信封 `data.item`/`data.items` 见 §4。**公开端无资讯 API**——前台 `/news`、`/news/[slug]` 为 SSR 页（Markdown→HTML 渲染管线与静态底稿回退见架构文档 [§7.3](API架构设计方案.md#news-architecture)）。

已实施取证（v1.32，2026-09-18）：路由层单测 10 例（校验/查重/publishedAt 语义/审计 action/未登录 401）+ 真实登录态 CRUD→前台 HTML 命中→原始 Markdown 回读→硬删复原 20/20 通过（见《[验收复核-20260917](../archive/验收复核-20260917.md)》§2.4）。

本节架构约束互引：[资讯 Markdown 存储与渲染边界](API架构设计方案.md#news-architecture)。

<a id="sync-eval-admin-api"></a>
### 5.8.4 采集与评测管理契约（**规划登记 · 未实现**）

> ⚠️ **状态声明（2026-09-22 全维复核）**：本节端点**全部为规划登记，代码零实现**——路由不存在、无 admin 页面。登记目的是**固定契约口径**，防止后续实施时与已实施端点（§5.8.1–5.8.3）混淆。实测证据：`lib/sync/` 目录不存在；`prisma.syncBatch` / `prisma.modelChangeLog` 全仓 0 引用；`model_benchmarks` 读侧已接线（`api/v1/models/[id]/route.ts:61`）但**写侧仅 `seed.ts`**；admin 12 域 API 中无本节端点。台账 #28–#31/#34，见《[未完成事项目录](../plans/未完成事项目录.md)》§七。
>
> **v1.45 修订（2026-10-10，L1-L3 收口）**：上述「代码零实现」为 2026-09-22 当时快照，现已部分失效——① **采集脚本调度管理**（`admin/scripts` 全 CRUD + trigger）已实施，迁至 **§5.8.5（已实施）**；② 模型同步管线 `lib/sync/`（`sources/registry.ts` `SYNC_SOURCES` + adapters + writers + `SyncBatch`）**已存在**，`admin/sync/*` 路由已落盘（见 build 路由表）；③ 站点发现 crawl 源 `lib/discovery/llmtest.ts`（`llmtest.cn` 榜单 → `DiscoveryCandidate`）**已实施**。**仍未实现**：本节（B）`benchmarks/*` 模型评测写侧端点（自测手动上传 #28）与五源加权融合算法——保留为规划登记。

**（A）同步任务 `sync/*`（对应 `sync_batches` + `model_change_logs`）**

| 方法 | 路径 | 规划说明 |
|---|---|---|
| POST | /api/v1/admin/sync/batches | 触发一次采集批次。body `{source: "official_api"\|"crawler"\|"manual", sourceUrl?, operatorNotes?}`；服务端生成 `SyncBatch.batchCode`（`@unique`，去重锚点）→ 编排 adapters → mappers → writers 批量 UPSERT；写 `ModelChangeLog`（`changeType` + `beforeData`/`afterData` + `changedFields` + `checksum`） |
| GET | /api/v1/admin/sync/batches | 批次列表（分页 + `status ∈ running\|completed\|failed\|partial` 筛选；返回 `totalRecords`/`successRecords`/`failedRecords`/`validationSummary`） |
| GET | /api/v1/admin/sync/batches/[batchCode] | 批次明细（含该批 `ModelChangeLog[]` 逐条变更，支持按 `changeType` 过滤） |
| POST | /api/v1/admin/sync/changes/[id]/revert | 变更回滚（`isReverted=true` + `revertedAt` + `revertReason`；回滚本身亦落一条 `ModelChangeLog`） |

> **去重口径**：以 `SyncBatch.batchCode @unique` 界定批次边界、`ModelChangeLog.checksum` 作内容指纹——**同指纹同模型同字段不重复落库**（术语表「UPSERT」口径）。

**（B）模型评测 `benchmarks/*`（对应 `model_benchmarks`）**

| 方法 | 路径 | 规划说明 |
|---|---|---|
| GET | /api/v1/admin/benchmarks | 评测记录列表（分页 + `modelId`/`sourceType`/`benchmarkType` 筛选；`verifiedStatus` 审核态） |
| POST | /api/v1/admin/benchmarks | 单条录入 / 批量导入（`sourceType=SELF` 为**自测手动上传**路径）；字段对齐 schema：`benchmarkType`+`scores Json`+`totalScore`+`testDate`+`testParams`+`sampleCount`+`confidenceLevel`；`verifiedStatus` 默认 0 待审 |
| PATCH | /api/v1/admin/benchmarks/[id] | 编辑 / 审核（`verifiedStatus` 0→1；`weight`/`isWeighted` 调权） |
| DELETE | /api/v1/admin/benchmarks/[id] | 删除误录记录 |

> **多源交叉验证口径（`BenchmarkSource` 五源）**：`OFFICIAL=1`（官方公布）/ `ACTUAL=2`（实测）/ `REVIEW=3`（第三方评测媒体）/ `SELF=4`（平台自测）/ `THIRD_PARTY=5`（第三方机构）。同一模型可有多源多条记录，按 `weight Decimal(4,3) @default(0.25)` + `isWeighted` 加权融合，输出 `totalScore Decimal(5,2)` + `scorePercentile` + `confidenceLevel`。**五源与加权字段已建模（schema:482-527），融合算法零实现**。

> **实施级设计（2026-09-22 思维设计同步）——手动上传路径（`sourceType=SELF`，#28）**

**（B1）POST /api/v1/admin/benchmarks 导入格式（CSV 或 JSON，二选一）**

CSV 列头（与 schema 一一对照）：

| CSV 列 | schema 字段 | 必填 | 说明 |
|---|---|---|---|
| modelCode | → 解析 `modelId` | ✅ | 关联 `AiModel.modelCode`；不存在的模型 → 落 errorSamples 不中断批次 |
| benchmarkType | `benchmarkType` | ✅ | 如 `"overall"` / `"coding"` / `"reasoning"` |
| totalScore | `totalScore` | ✅ | 0–100 区间（Decimal(5,2)），越界拒 |
| sampleCount | `sampleCount` | ✅ | Int ≥ 1 |
| confidenceLevel | `confidenceLevel` | 🟡 | 0–1 区间（Decimal(4,3)），可空 |
| testDate | `testDate` | 🟡 | ISO 日期，缺省=导入日 |
| testParams | `testParams` (Json) | 🟡 | JSON 字符串，如 `{"language":"zh","tasks":20}` |
| scores | `scores` (Json) | 🟡 | 细项评分 JSON，如 `{"code_quality":86,"latency":74}` |
| weight | `weight` | — | 手动路径固定 `0.25` 默认值，不随 CSV 提供 |

单条 JSON（等价的单行申报）：

```json
{
  "sourceType": "SELF",
  "modelCode": "gpt-4o",
  "benchmarkType": "overall",
  "totalScore": 88.5,
  "sampleCount": 40,
  "confidenceLevel": 0.8,
  "testDate": "2026-09-22",
  "testParams": { "language": "zh", "tasks": 20 },
  "scores": { "code_quality": 86, "latency": 74 }
}
```

**（B2）缺省字段与写侧落库**：`sourceType` **强制** `SELF`（防止 upload 路径混淆为官方数据）；`verifiedStatus` 缺省 `0`（待审）；`weight`/`isWeighted` 走默认值，调权一律走 PATCH（不随导入）。

**（B3）verifiedStatus 审核流状态机**

```
        POST(缺省)             PATCH
  [0 待审] ──────────→ [1 已审] ─────────→ 读侧生效（ladder/详情页）
      │                      
      └──[DELETE /[id]]      拒绝/弃用：整条删除（不设驳回态，保持三态简单）
```

- **读侧已接线**：`ladder/repository.ts:178`（take 3）、`api/v1/models/[id]/route.ts:61`、`models/[slug]/page.tsx:250`——**已审（verifiedStatus=1）记录才进天梯展示**（实施时在既有读侧查询补 `WHERE verifiedStatus=1`）。此约束写入验收：审核前列表可见但天梯不显示 → 审核后立即显示。
- PATCH `weight`/`isWeighted` 仅对 `verifiedStatus=1` 记录开放（未审记录无权调权）。

**（B4）导入幂等与校验**
- 幂等键：`importBatchId`（请求头或 body，UUID）；同 key 重放 → 返回首果（参照 redemption GRANT 幂等既有实现）。
- 校验：进入 `packages/shared` 新增 `AdminBenchmarkImportSchema`（Zod），**CSV 行级非法 → 行级拒收并记 errorSamples**，不整批回滚；返回 `{total, imported, rejected, errorSamples[]}`。
- 响应信封沿用统一 `{code,message,data,requestId}`；成功 `code:0`。

> **与已实施评测能力的边界**：**用户侧** `POST /api/v1/evaluations`（对比测评，¥2/模型/次）为**已实现**能力，属「用户自助跑模型并对拍」，落 `evaluations` 表；**本节 `benchmarks/*` 为平台侧运营数据**，落 `model_benchmarks` 表，二者**不共用表、不共用端点**，勿混用。

本节架构约束互引：[采集/评测域 admin 边界](API架构设计方案.md#sync-eval-admin-architecture)。

<a id="scripts-admin-api"></a>
### 5.8.5 采集脚本调度管理（**已实施** · L2 自定义频率管理闭环）

> 本域管理 `ScheduledScript`（预置/自定义采集与排行脚本的定时调度行）与其 `ScriptExecution`（每轮执行落一行），支撑需求「模型信息 / 站点信息 采集按自定义频率周期化」。全部 `requireAdminApi`（未登录 10004→401 / 非管理员 10008→403），写路径落 `audit_logs(tableName="scheduled_scripts")`。校验真源 `lib/features/admin/script-validation.ts`（新建与 PATCH 共用：`isValidScriptPath` 白名单、`validateCron` cron-parser `TZ`（缺省 `Asia/Shanghai`）、`computeNextRunForSchedule` `intervalDays` 优先→cron→null）。

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /api/v1/admin/scripts | 调度列表（分页 `page≥1`/`pageSize≤100`；`where {deletedAt:null}` **全局软删过滤**；`isActive=true\|false` 可选精确过滤；按 `createdAt desc`；序列化含 `params`（原样 JSON，缺省 `null`）、`cronExpression/intervalDays/lastRunAt/nextRunAt/status/isActive`、`executionCount`（`_count.executions`）） |
| POST | /api/v1/admin/scripts | **新建**调度（REST 集合 POST=创建，触发语义已迁至 `/[id]/trigger`）。body `{name必填, scriptPath必填(白名单 `scripts/(crawl\|ranking)/*.ts`), cronExpression?, intervalDays?(正整数), description?, params?(对象), isActive?(缺省 true)}`；`cronExpression` 与 `intervalDays` **至少其一**否则 40000；`isActive` 时按频率算 `nextRunAt` 落库；写 `createdBy=session.userId`，审计 action=1。响应 `{id, nextRunAt}` |
| PATCH | /api/v1/admin/scripts/[id] | 编辑（白名单显式映射 `name/description/scriptPath/params/cronExpression/intervalDays/isActive`；`name` 空串 40000；`scriptPath` 经白名单；`cron` 经校验；`params` 须对象或 `null`（`Prisma.DbNull`）；**频率（cron/intervalDays）或启停（isActive）任一变更 → 重算 `nextRunAt`**（停用置 `null`）；`updatedBy` 落库；审计 action=2 携 `oldData/newData`）。目标不存在（含已软删）→ 40000「脚本不存在」 |
| DELETE | /api/v1/admin/scripts/[id] | **软删**（`deletedAt=now` + `isActive=false` + `nextRunAt=null` + `updatedBy`；历史 `ScriptExecution` 保留可回溯）；审计 action=3。目标不存在 → 40000 |
| POST | /api/v1/admin/scripts/[id]/trigger | 手动触发（`executeScript(id, params)`；`params` 取 body 传入优先、否则回退脚本存量 `params`；写 `ScriptExecution` 并更新 `lastRunAt/nextRunAt`）；审计 action=2 `changedFields:['trigger']`。响应 `{result}`（含 `executionId/status`）。目标不存在 → 40000 |
| GET | /api/v1/admin/scripts/[id]/executions | 执行历史（分页 `pageSize≤50` + `status` 过滤 0执行中/1成功/2失败；按 `startedAt desc`；返回 `durationMs/output/errorMsg/statusLabel`） |
| POST | /api/v1/admin/scripts/run-due | 到点批跑（**scheduler sidecar 专用**：`ADMIN_API_TOKEN` Bearer 与管理员 Cookie 双通道鉴权；`runDueScripts()` 消费 `nextRunAt≤now` 且 `isActive` 且 `deletedAt=null` 的行；Redis `SETNX lock:scheduler:run-due` TTL=300s 防重入，Redis 缺失 fail-open 直跑） |

> **软删口径**：`ScheduledScript.deletedAt` 由 GET 列表、`run-due` 批跑、`script-executor` 全链路统一过滤，软删行不再被调度或列举，仅 `executions` 历史可追溯。自动触发由 Docker sidecar `docker/scheduler/entrypoint.sh` 每分钟 `curl` 本端点承接（R-70/R-71，非进程内轮询）。

错误码：参数非法/目标不存在统一 40000（`ApiError`/`ERROR_CODES.BAD_REQUEST`，由 `withApi` 转 400 信封）；未登录 10004→401；非管理员 10008→403。

本节架构约束互引：[采集/评测域 admin 边界](API架构设计方案.md#sync-eval-admin-architecture)。

<a id="restructure-admin-api"></a>
### 5.8.6 管理端重构 · RBAC/菜单/日志/财务处置/CRUD/报表（**已实施** · restructure-admin-nav-rbac-cms S2-S8）

> 本节登记管理端信息架构重构引入的全部新端点（A2 接口级权限 + B2 角色实体）。均 `withApi` + `requireAdminApi(权限码)`：未登录 10004→401；有权进后台但缺该接口权限码 10008→403；SUPER_ADMIN 通配 `*` 绕过。写路径落 `audit_logs` 并 `revalidateTag`（授权 `admin-auth` / 导航 `admin-nav`）。分页入参统一 `page≥1`、`pageSize` 经 **`Math.min` 封顶**（列表类 ≤100、订单/日志类 ≤50~100；S8.4 收口 capabilities/protocols/discovery 未封顶缺陷）。

| 方法 | 路径 | 权限码 | 说明 |
|---|---|---|---|
| GET/POST | /api/v1/admin/menus | `admin.menus.read` / `.write` | **S2 可配置菜单真源**：GET 返回 scope=ADMIN 树（level1 分组 + 二级叶子）；POST 自建一级（`menuCode` 稳定唯一键、`level=1` 不挂父）；写 `admin-nav` tag |
| PATCH/DELETE | /api/v1/admin/menus/[id] | `admin.menus.write` | 二级改归属/排序/改名/改路径/显隐；DELETE 护「一级有子项拒删」；非自环校验 |
| GET/POST | /api/v1/admin/roles | `admin.roles.read` / `.write` | **S3 B2 角色 CRUD**：GET 系统+自定义角色（含权限码）；POST 建角色（权限码 ⊂ 注册表、禁 `*`） |
| PATCH/DELETE | /api/v1/admin/roles/[id] | `admin.roles.write` | PATCH 覆盖式重建权限；DELETE 护「系统角色禁删 / 有用户绑定禁删」 |
| GET/PATCH | /api/v1/admin/users/[id]/roles | `admin.roles.read` / `.write` | 用户↔角色分配；三重护栏：禁改自身分配 · 禁移除末位超管 · 角色码须存在；`revalidateTag('admin-auth')` 即时生效 |
| GET | /api/v1/admin/logs/usage | `admin.logs.read` | **S5 只读聚合**：UsageLog 分页（`pageSize≤100`；model/billingPath/时间范围/onlyErrors 筛选）；`quotaMinor` BigInt→string + `fenToYuan` 元口径；**禁写/禁删** |
| GET | /api/v1/admin/logs/security | `admin.logs.read` | 安全事件双子视图：RefreshToken 派生态（撤销>轮换>过期>有效）+ OidcUserConsent 直读 |
| GET | /api/v1/admin/logs/scripts | `admin.logs.read` | 跨脚本 ScriptExecution（status 标签；列表不含 output） |
| GET | /api/v1/admin/package-orders | `admin.orders.read` | **S6 只读**：`priceMinor` BigInt→string + `fenToYuan`；`pageSize≤50` + status/userId 筛选 |
| PATCH | /api/v1/admin/package-orders/[id] | `admin.orders.write` | 受控处置 CLOSE/FLAG→`CANCELLED`（状态机 CAS）；REVERSE 不适用→400；账本不提供删改 |
| PATCH | /api/v1/admin/recharge-orders/[id] | `admin.orders.write` | CLOSE→`EXPIRED`/FLAG→`FAILED`（仅 PENDING）；REVERSE 委托 `billingService.reverseRechargeOrder`（PAID→REFUNDED + REVERSAL 反向分录，幂等键） |
| GET/POST | /api/v1/admin/prices | `admin.models.read` / `.write` | **S7.1 ModelPrice CRUD**（复用 models 域）：GET 分页当前价（Decimal→string）；POST 新建（同 model 已有 current→400） |
| PATCH | /api/v1/admin/prices/[id] | `admin.models.write` | 编辑价目字段 + `invalidatePriceViews()`（ISR /pricing·/models·/(site)/models/[slug]·/ladder + 天梯 Redis，TASK-097） |
| GET | /api/v1/admin/oidc-clients | `admin.configs.read` | **S7.3**：客户端列表（`clientSecretHash` **永不返回**）；复用 configs 域 |
| PATCH | /api/v1/admin/oidc-clients/[id] | `admin.configs.write` | 元数据编辑（name/redirect_uris/scopes/isActive）；不发 secret，尊重安全设计 |
| GET | /api/v1/admin/ranking-weights | `admin.configs.read` | **S7.5**：13 维排序权重（`VALID_DIMENSIONS` 白名单） |
| PUT | /api/v1/admin/ranking-weights | `admin.configs.write` | 逐维度 upsert；`revalidatePath('/models'|'/ladder')` |
| GET | /api/v1/admin/reports/overview | `admin.reports.read` | **S8.1 只读聚合**：`days` 7-90（缺省 30）；读 `usage_daily_stats` 日汇总（**禁扫 usage_logs**）+ `recharge_orders`(PAID) → 时间×指标二维图（调用次数/消耗元/充值元 + 模型 TopN）；**S9（B2）改权限码级鉴权**：仅 SUPER_ADMIN 通配 / ADMIN / 显式授予 `admin.reports.read` 的自定义角色可读；MODERATOR 不持有→10008/403，越权不泄金额，仅 GET |

> 权限域决策：prices→`admin.models.*`、oidc-clients/ranking-weights→`admin.configs.*`（复用既有域）；S5 新增 `logs` 域（28→29）；**S9（B2）新增 `reports` 域（29→30 域 × {read,write} = 60 原子）**——报表含充值收入金额，需独立 `admin.reports.read`。端点、`/admin` 概览紧凑看板与 `/admin/reports` 专属页三处同口径；MODERATOR 系统角色权限集排除 `admin.reports.*`（`permissions.ts` `MODERATOR_READ` filter），故侧栏剪枝、直访页重定向、端点 403 一致隐金额。**新增域后 `seed-rbac` 需重跑**以落 Permission 表（与“不新增域”旧口径不同）。

错误码：参数非法/目标不存在 40000→400；越权 10008→403；未登录 10004→401。本节架构约束互引：[管理端重构域 admin 边界](API架构设计方案.md#restructure-admin-architecture)。

<a id="credentials-admin-api"></a>
### 5.8.7 用户凭据只读与吊销（**已实施** · finalize-admin-ia-and-ops-gaps S4 / M5 / G2）

> 补运营盲区：管理员全局只读查看并吊销用户三类凭据。均 `withApi` + `requireAdminApi(权限码)`；**响应绝不包含明文/`keyHash`/`keyCipher`**（ApiKey 仅存哈希不可逆，取 `maskApiKey(keyId)`；StationUserKey/CustomChannel 取库内冗余脱敏列 `keyMasked`）。写操作落 `audit_logs`（action=2 UPDATE，`newData.op="admin.credential.revoke"`）。

| 方法 | 路径 | 权限码 | 说明 |
|---|---|---|---|
| GET | /api/v1/admin/users/[id]/credentials | `admin.users.read` | 一用户一聚合（无分页）：`{ apiKeys:[{id,masked,status,lastUsedAt\|null}], stationKeys:[{id,stationName,masked,status}], channels:[{id,name,provider,enabled}] }`；`status="ACTIVE"\|"REVOKED"`；空态返回空数组 |
| POST | /api/v1/admin/users/[id]/credentials/revoke | `admin.users.write` | body `{kind:"apiKey"\|"stationKey"\|"channel", id, reason}`；状态机：凭据须属于目标用户（`where {id,userId}`）；不存在/跨用户 400；已停用 **409 10009**；活跃→`isActive=false`（非物理删，留审计） |

错误码：参数非法/不存在 40000→400；越权 10008→403；未登录 10004→401；**新增 10009 `CREDENTIAL_NOT_REVOCABLE`→409**（已吊销/停用再吊销，幂等冲突护栏）。本节架构约束互引：[管理端重构域 admin 边界](API架构设计方案.md#restructure-admin-architecture)。

<a id="holds-admin-api"></a>
### 5.8.8 在途冻结款只读分页（**已实施** · finalize-admin-ia-and-ops-gaps S5 / M6 / G3）

> 运营盲区补齐：管理员按状态/时间分页只读查看 `BalanceHold` 预扣冻结款。`withApi` + `requireAdminApi("admin.wallets.read")`；`BalanceHold` 无直接 `userId`，经所属 `Wallet` 关联过滤（`where.wallet.is.userId`）并回填 `userId`/`currency`。金额 `amountMinor`/`capturedMinor` 一律 BigInt→string（分）+ `fenToYuan` 元口径。**只读，禁写/禁删**；释放/捕获资金走既有 billing capture/reverse 链，本端点不新造。零 schema 迁移（依 spec §5 默认 + N-1：复用既有 `@@index([status, expiresAt])`/`@@index([walletId])`，生产 EXPLAIN 若证实排序走不到索引再补 `@@index([status, createdAt])`）。

| 方法 | 路径 | 权限码 | 说明 |
|---|---|---|---|
| GET | /api/v1/admin/holds | `admin.wallets.read` | query `{page,pageSize≤100,status?,userId?,from?,to?}`（status 白名单 `AUTHORIZED\|CAPTURED\|VOIDED\|EXPIRED`；from/to `YYYY-MM-DD`/ISO8601，date-only 视为当日末含）；响应 `{items:[{id,userId,currency,amountMinor,amountYuan,capturedMinor,status,createdAt,expiresAt}],total,page,pageSize}`；`createdAt` 倒序分页；越权 403 |

错误码：参数非法/越界 40000→400；越权 10008→403；未登录 10004→401。分页 `pageSize` 封顶 100（记录类放宽）。本节架构约束互引：[管理端重构域 admin 边界](API架构设计方案.md#restructure-admin-architecture)。

### 5.8.9 功能开关 admin（S2 · API-003/004 · REQ-F-041）
> 端点登记（TASK-090 收口可见性 · TASK-020 补全公开面 API-002 见 §5.7）；受控面与运行时架构边界见《API架构设计方案》[§7.10 功能开关运行时边界](API架构设计方案.md#feature-flag-runtime-architecture)（anchor `feature-flag-runtime-architecture`）。`force-dynamic`。

| 方法 | 路径 | 权限码 | 说明 |
|---|---|---|---|
| GET | /api/v1/admin/feature-flags | `admin.configs.read` | 后台功能开关列表（API-003）：`{items:AdminFeatureFlagSchema[]}`，稳定排序 `priority desc → flagCode asc`；`flagCode` 恒属 7 码枚举 |
| PATCH | /api/v1/admin/feature-flags/[id] | `admin.configs.write` | 编辑功能开关（API-004）：body `AdminFeatureFlagPatchSchema`（strict + 至少一字段），仅 `isEnabled`/`description`；先 `revalidateTag("feature-flags")` 再 `writeAudit`(action=2)；幂等；错误 40000/10008/10004 |

> 架构约束（7 码真源 / public·admin 双读面 / 关闭态三重生效=入口隐藏+页 403+API `50011` / 缓存即时性与幂等）互引：[§7.10 功能开关运行时边界](API架构设计方案.md#feature-flag-runtime-architecture)（铁律 2）。

<a id="promotion-prices-api"></a>

### 5.8.10 限时优惠价 admin（V0.10.0 · API-008..011 · TASK-028/030/031）
> 端点登记；写侧约束与生效价语义见《网关计费时序契约》[§11 生效价解析](网关计费时序契约.md#effective-price-resolution)（anchor `effective-price-resolution`）、术语表[「生效价」](../governance/术语表.md#term-effective-price)，架构边界见《API架构设计方案》[§7.13 生效价与优惠价边界](API架构设计方案.md#effective-price-architecture)。契约唯一源 `packages/shared/src/schemas/promotion.schema.ts`。`force-dynamic`。

| 方法 | 路径 | 权限码 | 说明 |
|---|---|---|---|
| GET | /api/v1/admin/prices/promotions | `admin.models.read` | 优惠价分页列表（API-008）：query `PageQuerySchema & {modelId?}`；仅 `sourceType=PROMOTION` 行，Decimal→string、Date→ISO |
| POST | /api/v1/admin/prices/promotions | `admin.models.write` | 创建限时优惠（API-009）：body `PromotionPriceCreateSchema`（`effectiveUntil` 必填且晚于 `effectiveFrom`，半开窗 `[from, until)`）；billing 三元组（币种/单位/计价模式）由该模型当前价派生，无当前价→`40000`；与既有优惠窗口重叠→`40000`；模型不存在→`20001`；Serializable 事务 + `writeAudit` |
| PATCH | /api/v1/admin/prices/promotions/[id] | `admin.models.write` | 修改优惠（API-010）：body `PromotionPricePatchSchema`（strict，未知键→`40000`）；合并现值后复核窗口与重叠；仅允许 PROMOTION 行；幂等 |
| DELETE | /api/v1/admin/prices/promotions/[id] | `admin.models.write` | 删除优惠（API-011）：仅允许 PROMOTION 行，返回 `{deleted:true}`；删除后下一次请求即回落当前价（e2e：EVD-030） |

> 计费口径互引：生效价由 `lib/features/pricing/effective-price.ts` 唯一解析，网关预扣/结算与 `/api/v1/models/[id]`、`/pricing` 同源消费（[§11 生效价解析](网关计费时序契约.md#effective-price-resolution)，铁律 2）。

<a id="matrix-admin-api"></a>

### 5.8.11 协议兼容矩阵 / 能力矩阵 admin（V0.11.0 · B11-03a · Q-11-01=A）
> 端点登记；架构约束见《API架构设计方案》[§7.15 协议/能力矩阵运营化边界](API架构设计方案.md#matrix-architecture)，术语见[「协议兼容矩阵」](../governance/术语表.md#term-protocol-matrix)。校验 schema 暂驻 `apps/web/lib/features/admin/matrix/schemas.ts`（`packages/shared` 冻结，未静默扩写），维度常量 `lib/features/admin/matrix/constants.ts`。`force-dynamic`。错误码均复用 §4 既有码，**零新增**。

| 方法 | 路径 | 权限码 | 说明 |
|---|---|---|---|
| GET | /api/v1/admin/protocols | `admin.protocols.read` | 分页列表（`page≥1`、`pageSize≤100`）；过滤 `entityType`/`protocol`；`probedAt desc` |
| POST | /api/v1/admin/protocols | `admin.protocols.write` | 按 `(entityType,entityId,protocol)` upsert；body `ProtocolCreateSchema`（strict）：`entityType∈{model,vendor,provider,station}`、`protocol∈ModelProtocol{OPENAI,ANTHROPIC,GOOGLE,RESPONSES,CUSTOM}`、`supported` 必填、`probeMethod∈{endpoint_check,minimal_request,documented,backfill}`、`confidence∈[0,1]`、`probeResult?`；实体不存在 → model `20001` / 其余 `40000`；审计 action=1（新建）/2（命中） |
| GET | /api/v1/admin/protocols/[id] | `admin.protocols.read` | 单行；id 非 UUID → `40000`（不触库）；不存在 → `40000`「协议兼容记录不存在」 |
| PATCH | /api/v1/admin/protocols/[id] | `admin.protocols.write` | body `ProtocolPatchSchema`（strict，≥1 字段，键同 POST 全可选）；改键撞唯一（P2002）→ `40000`「…已存在」；`supported`/`probeMethod` 变更刷新 `probedAt`；审计 action=2 |
| DELETE | /api/v1/admin/protocols/[id] | `admin.protocols.write` | 物理删除（表无 `deleted_at`），返回 `{deleted:true,id}`；并发删除（P2025）→ `40000`；审计 action=3（oldData 全量快照） |
| GET | /api/v1/admin/capabilities | `admin.capabilities.read` | 分页列表；过滤 `modelId`/`capability`；`detectedAt desc` |
| POST | /api/v1/admin/capabilities | `admin.capabilities.write` | 按 `(modelId,capability,source)` upsert；body `CapabilityCreateSchema`（strict）：`capability∈{function_calling,vision,reasoning,structured_output,prompt_caching,code_execution,web_search,long_context}`、`source∈{official,benchmark,observed}`（缺省 official）、`maxContextLength?`、`detail?`；模型不存在 → `20001` |
| GET | /api/v1/admin/capabilities/[id] | `admin.capabilities.read` | 单行；同协议矩阵口径 |
| PATCH | /api/v1/admin/capabilities/[id] | `admin.capabilities.write` | body `CapabilityPatchSchema`（strict，≥1 字段）；P2002 → `40000`；`supported` 变更刷新 `detectedAt`；审计 action=2 |
| DELETE | /api/v1/admin/capabilities/[id] | `admin.capabilities.write` | 物理删除，返回 `{deleted:true,id}`；审计 action=3 |

> 通用异常：未登录 `10004`→401；缺权限码 `10008`→403；未知异常 `50000`→500（不泄露内部细节）。写成功后 `revalidatePath("/admin/protocols"|"/admin/capabilities")`。
> 数据写入路径：`pnpm --filter web db:seed:matrix`（`prisma/seed-matrix-backfill.ts`，亦由 `seed.ts` 主流程调用）由 `ai_models.protocol`/`is_reasoning`/`is_multi_modal`/`context_length` 派生回填，`createMany skipDuplicates` 幂等且不覆盖人工行。架构约束互引：[§7.14](API架构设计方案.md#matrix-architecture)（铁律 2）。

<a id="v120-api"></a>

### 5.10 V0.12.0 增量端点（T120-10 契约登记 · 实现见各卡）
> 契约唯一源 `packages/shared/src/schemas/{auth,monitoring,user}.schema.ts`（自 `docs/任务规划V0.12.0/contracts/` 原样落地）；执行模型见 [ADR-0011](../ADR/ADR-0011-监控执行模型与调度统一.md)；架构约束见《API架构设计方案》[§7.16 V0.12 会话版本 / 运行请求 / 探测边界](API架构设计方案.md#v120-architecture)。

| 方法 | 路径 | 鉴权 | 请求 / 响应 | 说明（实现卡） |
|---|---|---|---|---|
| POST | /api/v1/auth/password | 已登录用户 | `ChangePasswordRequest` → `ChangePasswordResponse` | 同一事务：更新哈希 → `token_version += 1` → 吊销全部 refresh → 当前设备签发新令牌对；旧密错 `10003`（计入登录限流桶）；审计 `password.change`（T120-19） |
| POST | /api/v1/auth/password/reset/code | 匿名 | `ResetCodeRequest` → `ResetCodeResponse` | 恒返回 `{sent:true}` 防枚举；同邮箱 60s / 当日 >10 封 / IP 10 次/分钟 → `10006`；开关 `auth.password_reset` 关 → `50011`（T120-20） |
| POST | /api/v1/auth/password/reset | 匿名 | `ResetPasswordRequest` → `ResetPasswordResponse` | 验证码错 / 过期 / 已用 / 错满 5 次作废 → `10003`（与邮箱不存在同响应）；成功 `token_version += 1` 并吊销全部 refresh，不自动登录（T120-20） |
| POST | /api/v1/admin/monitoring/sources/{key}/run | `admin.sync.write` | — → `AdminMonitoringRunResponseV2`（202） | 语义由「只占锁」改为「插入 pending 请求」；同源未完成请求 → `10006`；key 未注册 → `20004`；缺凭证 → `50012`（T120-12） |
| GET | /api/v1/admin/monitoring/sources/{key}/runs | `admin.sync.read` | `page`/`pageSize≤50` → `AdminMonitoringRunsResponse` | 按 `createdAt` 倒序（T120-12） |
| GET | /api/v1/stations/{id}/reliability | PUBLIC | `days∈[1,30]`（默认 7） → `StationReliabilityResponse` | 缺观测日 `uptimePercent=null`；缓存 600s，persist 写入后失效；station 不存在 → `30001`（T120-14） |
| POST | /api/v1/user/custom-channels/{id}/probe | 已登录用户（仅本人渠道） | `ChannelProbeParams` → `ChannelProbeResponse` | 他人或不存在 → `40000`（不暴露存在性）；目标被拒 → `30005`；每用户 10 次/分钟 → `10006`（T120-23） |

> 会话校验口径变更（T120-18）：`requireUserApi` / `requireAdminApi` 在既有回库查询中追加 `tokenVersion` 投影，`claims.ver !== users.token_version` → `10004`（401）。监控源列表新增只读派生字段 `nextRunAt`（`MonitoringSourceDerived`，T120-11）。

### 5.9 财务 billing（implement-billing-module，MVP）
| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /api/v1/billing/wallet | 钱包概览：余额/冻结/可用（available = balance − held，分转元） |
| GET | /api/v1/billing/ledger | 账本流水分页（page/pageSize/entryType 过滤；按自然日分组视图；仅本人） |
| POST | /api/v1/billing/recharge-orders | 创建充值订单（档位五选一 + 微信/支付宝；返回支付参数，MVP 为 dev mock 渠道） |
| GET | /api/v1/billing/recharge-orders | 我的充值订单列表（最近 20 条） |
| POST | /api/v1/billing/recharge-orders/[id]/notify | 支付渠道回调：验签（失败 40005）→ 单事务「PENDING→PAID + TOPUP/GRANT 入账」；重复回调幂等；无会话依赖（签名即凭证） |

> 账本口径：双录不可变流水（`ledger_entries` 只 INSERT）+ 乐观锁（`wallets.lock_version`）+ 幂等键唯一兜底，见《数据库文档》「计费账本（三表分离）」；错误码见 §4 财务段登记表。架构约束（路由分层/统一响应/鉴权/分页限流）遵循《[API架构设计方案](API架构设计方案.md)》[§一 路由分层](API架构设计方案.md#一路由分层) 与 [§二 统一响应结构](API架构设计方案.md#二统一响应结构)——本节末尾互引锚点（铁律 2）。

## 6. 中间件

请求 ID、结构化日志、限流（Redis）、安全头、JWT/API Key 鉴权。继承旧 `lib/api/middleware` 设计。

## 7. 缓存

榜单、模型详情、站点价格等 GET 接口走 Redis 缓存 + ISR；同步管线写库后按 key 失效。
