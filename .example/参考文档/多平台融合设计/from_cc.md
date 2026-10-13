三个探查 agent 已全部回报，主平台架构报告与我直接核验的文档/代码完全互证。证据基线充分，进入推演与方案重构。

  下面给出完整设计。本轮不创建或编辑任何文件，仅输出经推敲的方案与可执行大纲，待你确认后再落地。

  ---

  Aidean 生态融合设计方案

  〇、证据基线（设计非绿地，建立在既有决策之上）

  ┌────────┬────────────────────────────────────────────────────────────────────────────┬───────────────────────────┐
  │  维度  │                              既有事实（证据）                              │       对融合的意义        │
  ├────────┼────────────────────────────────────────────────────────────────────────────┼───────────────────────────┤
  │        │ 主平台内嵌自研 OIDC IdP（app/oauth/* 七端点 + JWKS + RS256 kid 轮换 +      │ 新子平台接入 =            │
  │ 身份层 │ RefreshToken 轮换链 + User.tokenVersion 全端失效 + back-channel            │ oidc_clients 插一行 +     │
  │        │ logout）；seed 已备 wechat-rag/aidean-rag/skills-cloud 三个 first-party    │ 标准跳转，零 IdP 改动     │     │        │ client                                                                     │                           │
  ├────────┼────────────────────────────────────────────────────────────────────────────┼───────────────────────────┤
  │        │ 统一网关 /api/v1/gateway/chat（五态                                        │                           │
  │ 计费层 │ billingPath：PLATFORM/PACKAGE/UPSTREAM/FREE_PROXY/FREE_QUOTA +             │ 余额套餐通用已落地，子平  │
  │        │ billingExempt；hold→capture→void；requestId 幂等）+                        │ 台零余额写权限            │
  │        │ /api/v1/internal/billing/wallet（client 凭据 + wallet:read）               │                           │
  ├────────┼────────────────────────────────────────────────────────────────────────────┼───────────────────────────┤
  │ 模型配 │ UserTierMapping（Opus/Sonnet/Fable/Haiku 档↔具体模型）+                    │ "一键配置模型"= 配一次主  │
  │ 置     │ UserModelPriority（1-99 优先级）+ StationUserKey（自有 Key，AES-256-GCM）+ │ 平台，全子平台经网关生效  │
  │        │  CustomChannel（自填渠道）                                                 │                           │
  ├────────┼────────────────────────────────────────────────────────────────────────────┼───────────────────────────┤
  │ 接入现 │ AideanBot 已接入 SSO+网关（唯一接入方，providers/aidean/ 端口-适配器，e2e  │ 接入路径已被验证，剩余是  │
  │ 状     │ sso-3333.spec.ts 闭环）；Fleet/Thesis 未接入；Thesis 自建 JWT              │ 复制+裁剪                 │
  │        │ 账密（与红线#1冲突）                                                       │                           │
  ├────────┼────────────────────────────────────────────────────────────────────────────┼───────────────────────────┤
  │ 编排能 │ AideanFleet = 薄 Control Plane + 7 款 CLI 执行体 + dispatcher/DAG/10       │ 天然跨平台 DAG            │
  │ 力     │ 状态机/reviewer/REL 守望，零外部依赖（SQLite+JSONL）                       │ 编排器，需扩展"HTTP       │
  │        │                                                                            │ 子平台执行体"适配器       │
  ├────────┼────────────────────────────────────────────────────────────────────────────┼───────────────────────────┤
  │ 知识库 │ AideanWiki（原 AideanRag，RagFlow，已部署                                  │ "存储信息"载体已存在      │
  │        │ 36.134.158.50:10001），双账号模型 L3 待实施                                │                           │
  ├────────┼────────────────────────────────────────────────────────────────────────────┼───────────────────────────┤
  │ 端口/  │ 五段百端口区间目标态已登记（主3000-3100/Fleet3100-3200/BotHot3200-3300/Bot │ 拓展骨架已就位，#78       │
  │ 域名   │ 3300-3400/Thesis3400-3500）；二级域名 <product>.aidean.com + host-only     │ 待裁决迁移                │
  │        │ cookie + 通配符证书                                                        │                           │
  ├────────┼────────────────────────────────────────────────────────────────────────────┼───────────────────────────┤
  │ 治理   │ ADR-0003（维持自研 IdP、拒绝成品 IAM）、ADR-0005、六步开发循环、文档铁律   │ 设计受 ADR 锁定，不得偏离 │
  └────────┴────────────────────────────────────────────────────────────────────────────┴───────────────────────────┘

  ---

  一、用户与场景需求拆解（5 类用户逐一 → 汇总）

  ┌─────────┬──────────────────┬───────────────┬─────────┬──────────────┬────────────┬────────────┬────────────┐
  │  用户   │     核心场景     │     搜集      │  存储   │     配置     │ 写作/分析  │    查证    │  关键诉求  │
  ├─────────┼──────────────────┼───────────────┼─────────┼──────────────┼────────────┼────────────┼────────────┤
  │ 大学生/ │ 文献综述、开题、 │ 公众号/网页/  │ 个人知  │ 便宜模型兜底 │ 论文初稿/  │ 引用核验、 │ 低成本、防 │
  │ 研究生  │ 论文质量自检     │ 视频知识      │ 识库    │ +按档降级    │ 格式/查重  │ AIGC 率    │ 学术不端   │
  ├─────────┼──────────────────┼───────────────┼─────────┼──────────────┼────────────┼────────────┼────────────┤
  │ 科研人  │ 跟踪前沿、综述、 │ arXiv/公众号/ │ 团队知  │ 高档模型推理 │ 综述/分析  │ 数据可溯源 │ 溯源链完整 │
  │ 员      │ 实验报告         │ RSS           │ 识库    │              │            │ 、可复现   │            │
  ├─────────┼──────────────────┼───────────────┼─────────┼──────────────┼────────────┼────────────┼────────────┤
  │ 金融研  │ 每日简报、研报、 │ 财经媒体/公告 │ 行业知  │ 长上下文模型 │ 研报/图表  │ 数字交叉核 │ 实时、批量 │
  │ 究员    │ 数据图           │               │ 识库    │              │            │ 验         │            │
  ├─────────┼──────────────────┼───────────────┼─────────┼──────────────┼────────────┼────────────┼────────────┤
  │ 行业分  │ 行业图谱、竞品、 │ 多源图文/视频 │ 结构化  │ 多模态       │ 分析报告   │ 事实核查、 │ 多源去重   │
  │ 析员    │ 趋势             │               │ 知识库  │              │            │ 引用链     │            │
  ├─────────┼──────────────────┼───────────────┼─────────┼──────────────┼────────────┼────────────┼────────────┤
  │ 自媒体  │ 选题、素材、成稿 │ 抖音/B站/小红 │ 内容素  │ 快速模型     │ 成稿/标题/ │ 查重、合规 │ 全自动、高 │
  │ 博主    │ 、分发           │ 书/公众号     │ 材库    │              │ 脚本       │            │ 产         │
  └─────────┴──────────────────┴───────────────┴─────────┴──────────────┴────────────┴────────────┴────────────┘

  汇总能力需求（去重后 8 项）：①多源信息搜集 ②知识库沉淀与检索 ③一次配置全平台生效的模型路由 ④写作/分析/格式/查重
  ⑤事实查证与引用核验 ⑥跨平台余额套餐通用 ⑦全链路溯源 ⑧全自动 DAG 编排。

  对照既有基建：①=BotHot+AideanBot ②=AideanWiki ③=主平台网关+UserTierMapping ④=AideanThesis ⑤=AideanFleet reviewer
  ⑥=网关五态 ⑦=UsageLog+LedgerEntry+events.jsonl ⑧=Fleet DAG+SkillsCloud。八项需求全部有对应落点，无一项是绿地。

  ---

  二、关键决策推演（5W1H 收敛 → 双向钢人 → 重构）

  ▎ 为控制篇幅，对 6 个关键决策各做一轮钢人，幸存者进入 §三大纲。

  D1：主平台为唯一权威（IdP+网关+模型配置），子平台为零权威 RP。
  - 钢人-反：主平台成为 SPOF，3000 下线则全生态登录与计费瘫痪（§7.3 已实证 Bot 依赖 3000）。
  - 钢人-正：ADR-0003 已裁决此路线，期权未锁死（对外端点为标准 OIDC 子集，未来切 IdP
    子平台零改）；分散权威会引入双写/一致性税，更脆弱。
  - 重构幸存：维持。补强：子平台本地会话 15min/7d 缓冲 + 关键只读功能降级可用 + 主平台多副本/健康探针（§七高性能）。

  D2：引入 AideanFleet 作为跨平台 DAG 编排器，新增"HTTP 子平台执行体"适配器。
  - 反：Fleet 铁律"零外部依赖（不引 Redis/MySQL）"——调子平台 HTTP 是否违反？
  - 正：铁律禁的是"引入外部服务依赖"（自身运行时要 Redis/MySQL），出站 HTTP 调用不引入外部服务，与既有 7 款 CLI
    执行体（外部进程）同构。Fleet 的 dispatcher/DAG/reviewer/REL 天然适配"搜集→存储→写作→查证"多步任务。新增
    fleet/executors/aidean_http.py（端口-适配器，已验证模式）即可，零铁律违反。
  - 反-再追：Fleet 模型池（8 路自有 Key）调 CLI 执行体时不走主平台网关，与"余额套餐通用"冲突？
  - 正：Fleet 双模式——(a) 自备模型池（免费，不进主平台账本，给纯编排任务用）；(b) 作为 SSO client
    走主平台网关（进统一余额，享套餐，由用户在主平台配置）。由用户配置决定，不强制。
  - 重构幸存：D2 成立，双模式并存。

  D3：SkillsCloud 作为"技能/mcp 即插即用"层，每个 skill = 跨平台复用能力单元。
  - 反：SkillsCloud 是"规划中"（intro:null），无任何代码，依赖它是否空中楼阁？
  - 正：设计不依赖其当前实现，只定义契约——skill 是一个 (输入 schema, 输出 schema, 执行端点) 三元组，可由 Fleet DAG
    作为节点调用，也可由主平台网关按意图路由。MVP 可先用 AideanBot 的现有 API 暂代"搜集 skill"，SkillsCloud
    真正就位前不阻断流水线。
  - 重构幸存：D3 成立，分阶段（MVP 用现成 API 顶替，SkillsCloud 就位后切换）。

  D4：AideanThesis 接入 SSO 时必须移除本地账密（红线#1），AI 调用改走主平台网关。
  - 反：Thesis 当前自建 JWT（python-jose+passlib）+ 自有 AI（AI_API_KEY=deepseek），接入=双重改造，且 ADR-009
    技术栈漂移未闭环。
  - 正：红线#1 不可逾越（子平台不得出现密码输入框），自建账密路径必须移除；AI
    调用走网关才能享"一次配置全平台生效+余额套餐通用"。技术栈漂移以实测代码（Python
    FastAPI）为准，接入工作不依赖漂移闭环。
  - 重构幸存：D4 成立，接入=裁剪本地认证+改 AI 调用指向 AIDEAN_GATEWAY_URL，复用 AideanBot 的 providers/aidean/ 模式。

  D5：跨平台溯源链用"批次 ID + sourceId + chunk provenance + citation + reviewer 回执"五段贯穿。
  - 反：五段跨四个仓库，无中心 DB，如何保证不断链？
  - 正：主平台已有 SyncBatch（批次）+UsageLog（requestId 幂等）+AuditLog；Fleet 有
    events.jsonl（append-only）+evidence/+reports/；Thesis 有 Reference/Citation；Wiki 有 chunk provenance。不需要中心
    DB——批次 ID 由编排层（Fleet）生成，作为 metadata.batchId 透传到每段的本地存储，溯源 = 用 batchId 在各仓库检索 +
    交叉拼接。这是"可溯源"而非"集中存储"，符合各子平台独立部署铁律。
  - 重构幸存：D5 成立，batchId 为贯穿键，各段本地存储+交叉检索。

  D6：通信安全维持 host-only cookie + 授权码流，禁止父域 Cookie 共享。
  - 反：跨子域登录要跳转，体验不如共享 cookie。
  - 正：SSO 指南 §2.1 已裁决（host-only
    是有意设计，父域共享=任一子平台被攻破即暴露主平台会话）。已登录用户一次跳转即签发授权码（SameSite=Lax 允许顶层 GET
    导航），体验可接受。
  - 重构幸存：D6 成立，维持。

  What-if 边界（汇总）：网关不可用→子平台 AI 功能不可用但已建会话只读可用；配置缺失→fail-closed 引导注册；端口冲突→#78
  迁移排期；Thesis 漂移→以实测代码为准；Fleet 执行体未就位→SkillsCloud/skill 兜底。

  ---

  三、融合架构终稿大纲（多层原子编号，可执行）

  ▎ 层级：一 = 生态层 ｜ x.y = 子系统 ｜ x.y.z = 原子动作（可对应到文件/路由/契约/迁移）。标注
  ▎ [既有]=已存在无需新建，[新增]=待实现，[改造]=在既有上裁剪。

  一、生态三层定位（Hub-Orchestration-Capability）

  1.1 T0 枢纽层 — 主平台 Aidean（唯一权威）

  - 1.1.1 [既有] 身份权威：自研 OIDC IdP（app/oauth/* + JWKS + RS256 轮换 + RefreshToken 轮换链 + tokenVersion 全端失效
    + back-channel logout）。
  - 1.1.2 [既有] 计费权威：统一网关 /api/v1/gateway/chat（五态 billingPath + hold/capture/void + requestId 幂等）+
    /api/v1/internal/billing/wallet。
  - 1.1.3 [既有] 模型配置权威：UserTierMapping（四档↔模型）+ UserModelPriority（1-99）+ StationUserKey（自有 Key）+
    CustomChannel（自填渠道）；控制台 components/console/。
  - 1.1.4 [既有] 产品入口：/products/[slug] 统一模板 + ProductIntroSchema v2 三层 + 导航 NavigationMenu。
  - 1.1.5 [新增] 编排接入面：主平台暴露"任务批次"只读视图（复用 SyncBatch 表 + 新增 metadata.batchId
    索引），供编排层回写溯源锚点；不改 IdP/网关核心。

  1.2 T1 编排层 — AideanFleet（DAG）+ SkillsCloud（技能）

  - 1.2.1 [既有] Fleet DAG 调度：fleet/manager/{dispatcher,dag,scheduler,intake,report,reviewer,rework_manager} + 10
    状态机 + REL 守望。
  - 1.2.2 [新增] Fleet HTTP 子平台执行体适配器：fleet/executors/aidean_http.py（端口-适配器，复用 base.py + registry.py
    模式），封装"调 AideanBot/Wiki/Thesis API"为标准执行体；不引外部服务，不违铁律。
  - 1.2.3 [新增] 编排契约：fleet/manager/contracts.py 增
    SubplatformTask（batchId/capability/inputSchema/outputSchema/retryPolicy/billingMode[self|gateway]）。
  - 1.2.4 [新增] Fleet SSO 接入：按 D4 模式（OIDC client aidean-fleet + redirect
    https://fleet.aidean.com/auth/aidean/callback），Fleet 双模式——编排用自备模型池，能力调用走主平台网关（用户 token
    on-behalf-of）。
  - 1.2.5 [规划] SkillsCloud 技能层：skill = (输入 schema, 输出 schema, 端点) 三元组；MVP 用 AideanBot API 顶替"搜集
    skill"，SkillsCloud 就位后切换；oidc_clients 已 seed skills-cloud。

  1.3 T2 能力层 — 四能力包 + 知识库（各自独立部署）

  - 1.3.1 [既有] BotHot（新项目，3200-3300）：信息搜集扩展（抖音/B站/小红书），由 AideanBot 拓展、不影响
    AideanBot；台账待建（#78-i）。
  - 1.3.2 [既有] AideanBot（3333/8000）：信息源（公众号）→知识库→机器人闭环；已接入 SSO+网关（providers/aidean/）。
  - 1.3.3 [既有] AideanWiki（RagFlow，10001）：知识存储与检索；oidc_clients 已 seed aidean-rag；双账号模型 L3 待 Wiki
    就位后实施（绑定表 wiki_user↔aidean sub，禁止同邮箱自动合并）。
  - 1.3.4 [改造] AideanThesis（3000/8000→迁移至 3400-3500）：移除本地账密（modules/identity JWT 自签路径裁剪，保留 sub
    关联表）；AI 调用改指 AIDEAN_GATEWAY_URL（移除 AI_API_KEY=deepseek 直连）；新增 providers/aidean/（移植 AideanBot
    模式）。
  - 1.3.5 [既有] AideanFleet reviewer 角色（roles:reviewer-1，hermes 适配器）：查证执行体，回执
    PASS/PARTIAL/REWORK/BLOCKED。

  二、通信与身份层（一键登录免配置）

  2.1 SSO 授权码流（五步，零 IdP 改动）

  - 2.1.1 [新增] client 注册：oidc_clients 为 Fleet/Thesis/BotHot 各插一行（clientId/redirectUri
    精确白名单/scopes/pkceRequired/firstParty）+ seed 脚本。
  - 2.1.2 [既有] 五步流：构造 authorize 跳转 → 主平台认证 → 回调校验 state → POST /oauth/token 兑换 →
    子平台建本地会话（id_token.sub 为锚点）。
  - 2.1.3 [既有] 本地 RS256 验签：子平台缓存 JWKS 本地验签（PyJWT/Node jose），零 IdP 网络往返。
  - 2.1.4 [既有] refresh 轮换 + back-channel logout：子平台可靠持久化最新一代 refresh_token；logoutUri 回填（指南 §10.1
    模板，#13 关账）。

  2.2 统一网关调用（on-behalf-of）

  - 2.2.1 [既有] 子平台持用户 access_token 调 POST /api/v1/gateway/chat（Authorization: Bearer <jwt>），网关
    requireGatewayPrincipal 回落 JWT，计费落用户钱包。
  - 2.2.2 [既有] 双格式 parse（OpenAI/Anthropic）+ x-request-id 幂等 + 五态 billingPath 透传。
  - 2.2.3 [新增] 子平台 AI 调用统一改造：Thesis apps/api 的 AI 模块改调网关；Bot 已接入；Fleet
    能力调用走网关（编排任务用自备池，按 1.2.4 双模式）。

  2.3 域名与 Cookie 隔离

  - 2.3.1 [既有] 二级域名 <product>.aidean.com + 通配符证书 *.aidean.com。
  - 2.3.2 [既有] 主平台会话 Cookie host-only（baseCookieOptions() 不设 domain），禁止父域共享。
  - 2.3.3 [新增] 生产 redirect_uri 白名单按完整二级域登记；本地联调 localhost:<port> 条目分开登记。

  2.4 端口区间收敛（#78 裁决）

  - 2.4.1 [裁决] Fleet 5000/9900/3333 → 3100-3200；Bot backend 8000 → 3300-3400；Thesis web 3000/api 8000 → 3400-3500。
  - 2.4.2 [裁决] 基础设施端口（PG 5432/5433、Redis 6379/6380、LangBot 5300）豁免区间口径。
  - 2.4.3 [新增] BotHot 台账建立（技术栈/目录/CI/SSO 接入），入《子平台规范说明》§2 新增小节。

  三、模型配置一次生效（一键配置模型）

  3.1 主平台配置面（一次）

  - 3.1.1 [既有] 通用版：UserTierMapping 把模型绑到 Opus/Sonnet/Fable/Haiku 四档。
  - 3.1.2 [既有] 专业版：UserModelPriority 1-99 优先级，free 模型自动装载为最低兜底。
  - 3.1.3 [既有] 自有 Key：StationUserKey（UPSTREAM 路径，免扣直调上游）。
  - 3.1.4 [既有] 自填渠道：CustomChannel（FREE_PROXY，免扣无限制中转）。

  3.2 网关消费配置（全子平台生效）

  - 3.2.1 [既有] resolveRouteChain：请求模型链首 → 等级映射/优先级合并 → free 兜底；按 userId 取该用户配置。
  - 3.2.2 [既有] 双模式供给：用户自有 Key 优先（UPSTREAM），无则平台 Key 池（PLATFORM/PACKAGE/FREE_QUOTA）。
  - 3.2.3 [既有] 子平台不感知用户配置——只传"能力标识"（tier/档位/skill 意图），网关自动用用户配置路由。

  3.3 权益透传

  - 3.3.1 [既有] id_token claims 含 sub/tier/role；/oauth/userinfo 实时返回。
  - 3.3.2 [既有] 子平台按 tier/status 决定功能门禁（PRO/MAX 专属能力）。

  四、全自动流水线（搜集→存储→配置→写作→查证）

  4.1 DAG 定义（Fleet 编排）

  - 4.1.1 [新增] 流水线 DAG：搜集(BotHot/Bot) → 存储(Wiki) → [配置隐式:网关路由] → 写作(Thesis) → 查证(Fleet
    reviewer)，每节点 = SubplatformTask（1.2.3）。
  - 4.1.2 [新增] batchId 生成：编排层生成 UUIDv7，作为 metadata.batchId 透传每段。
  - 4.1.3 [新增] 失败降级：节点失败按 retryPolicy（429/超时重试，401/402/403 硬失败切换）；全链败 → BLOCKED
    等人工（Fleet 既有语义）。

  4.2 节点契约

  - 4.2.1 [新增] 搜集节点：调 BotHot/Bot POST /api/v1/...（待 BotHot API 契约定稿），输出 {sourceId, rawItems[]}。
  - 4.2.2 [既有] 存储节点：调 AideanWiki（RagFlow API）入库，输出 {kbId, chunkIds[]} with provenance。
  - 4.2.3 [既有] 写作节点：调 AideanThesis POST /api/v1/theses + AI 模块（已改走网关），输出 {thesisId, citations[]}。
  - 4.2.4 [既有] 查证节点：Fleet reviewer-1 执行体，输入写作产物，输出 {verdict: PASS|PARTIAL|REWORK|BLOCKED,
    issues[]}。

  4.3 SkillsCloud 技能即能力

  - 4.3.1 [规划] 每个 skill 注册到 Fleet executors/registry + 主平台产品入口；MVP 用 4.2 既有 API 顶替。
  - 4.3.2 [规划] 用户在主平台"一键启用 skill"= 写 UserModelPriority/skill 绑定，全流水线生效。

  五、数据可溯源不丢失

  5.1 溯源链五段（batchId 贯穿）

  - 5.1.1 [既有] 搜集：BotHot/Bot 落 sourceId（URL/哈希）+ batchId。
  - 5.1.2 [既有] 存储：AideanWiki chunk provenance（sourceId→chunkId）+ batchId。
  - 5.1.3 [既有] 写作：AideanThesis Reference/Citation（chunkId→thesisId）+ batchId。
  - 5.1.4 [既有] 查证：Fleet evidence/+reports/+events.jsonl（append-only）+ batchId。
  - 5.1.5 [既有] 计费：主平台 UsageLog（requestId 幂等）+ LedgerEntry（双录）+ AuditLog，metadata.batchId 索引。

  5.2 跨平台检索（无中心 DB）

  - 5.2.1 [新增] 溯源查询：主平台暴露 GET /api/v1/internal/trace?batchId=，聚合各段本地查询（服务端对服务端，client
    凭据）。
  - 5.2.2 [既有] 各段独立存储，不复制原始数据（铁律：子平台不持久化余额副本，同理不持久化溯源副本）。

  六、余额套餐通用

  6.1 五态计费（已落地）

  - 6.1.1 [既有] PLATFORM（hold/capture）/PACKAGE（套餐免扣）/UPSTREAM（自有 Key
    免扣）/FREE_PROXY（自填渠道免扣）/FREE_QUOTA（免费额度）。
  - 6.1.2 [既有] billingExempt：评估域免扣（#26 仲裁）。

  6.2 套餐与兑换

  - 6.2.1 [既有] Package/PackageOrder/Redemption（余额码/定向套餐码）+ 套餐直连路由。
  - 6.2.2 [既有] 网关 listActivePackageStations 读取用户生效套餐覆盖面。

  6.3 子平台零余额写权限

  - 6.3.1 [既有] 子平台经 wallet:read 实时查询，禁止本地持久化（红线#3）。
  - 6.3.2 [既有] 子平台 AI 消费一律经网关，零本地扣费。

  6.4 Fleet 双模式

  - 6.4.1 [新增] 编排任务用自备模型池（免费，不进账本）。
  - 6.4.2 [新增] 能力调用走主平台网关（on-behalf-of，进统一余额，享套餐）。

  七、高性能与高拓展性

  7.1 性能

  - 7.1.1 [既有] 网关 stateless（除 Redis）可水平扩展；Redis 缓存（models:v1/ranking:v1/ladder:matrix）。
  - 7.1.2 [既有] 子平台本地验签（零 IdP 往返）+ Edge middleware fail-closed。
  - 7.1.3 [既有] 网关聚合流式（攒流归一）避免上游 SSE 抖动；透传模式按已产出计量。
  - 7.1.4 [既有] Key 池加权分流 + 故障冷却摘除/自动恢复。
  - 7.1.5 [既有] Fleet 虚拟滚动 + SQLite 本地 + append-only JSONL。

  7.2 拓展

  - 7.2.1 [既有] 二级域名 + 通配符证书：新增子平台 = 一条 DNS + 一个 nginx server 块 + 一行 client 注册。
  - 7.2.2 [既有] 端口区间：每平台百端口段，新增不冲突。
  - 7.2.3 [既有] 端口-适配器模式：Fleet 执行体、AideanBot providers/ 均可插拔。
  - 7.2.4 [规划] skills/mcp 即插即用（SkillsCloud）。

  八、治理与安全

  8.1 文档治理

  - 8.1.1 [既有] 六步循环 PLAN→SPEC→APPROVE→IMPLEMENT→VERIFY→CLOSE；四层层级；六字段字典。
  - 8.1.2 [既有] 版本锚点（铁律3）+ 双向强制链接（铁律2）+ 单一事实来源（铁律1）。
  - 8.1.3 [新增] 本设计落地须新建 ADR-0008《跨平台编排与溯源路线》+ 修订《子平台规范说明》v1.6（BotHot 台账 +
    Fleet/Thesis 接入状态）。

  8.2 安全红线

  - 8.2.1 [既有] SSO 八红线（密码只主平台输入/sub 锚点/余额不持久化/HTTPS/PKCE/host-only cookie 等）。
  - 8.2.2 [既有] 凭据铁律（600 权限/用完即删/remote URL 不残留/泛化表述）。
  - 8.2.3 [既有] 网关安全（敏感字段不序列化/Key 哈希落库/AES-256-GCM/上游错误体截断 300 字）。

  ---

  四、分阶段路线（MVP→接入→编排→全自动）

  ┌────────────┬──────────────────────────┬───────────────────────────────────────────────────────────────┬──────────┐
  │    阶段    │           目标           │                          关键原子项                           │   依赖   │
  ├────────────┼──────────────────────────┼───────────────────────────────────────────────────────────────┼──────────┤
  │ P1         │ Fleet/Thesis 接入        │ 2.1.1/2.1.2、1.3.4（Thesis 改造）、1.2.4（Fleet               │ ADR-0008 │
  │ 接入补齐   │ SSO+网关                 │ 接入）、2.4.1（端口迁移）                                     │          │
  ├────────────┼──────────────────────────┼───────────────────────────────────────────────────────────────┼──────────┤
  │ P2         │ Fleet HTTP 执行体 + DAG  │ 1.2.2/1.2.3、4.1.1-4.1.3、4.2.1-4.2.4                         │ P1       │
  │ 编排打通   │ 五节点                   │                                                               │          │
  ├────────────┼──────────────────────────┼───────────────────────────────────────────────────────────────┼──────────┤
  │ P3         │ batchId 五段贯穿 +       │ 5.1.1-5.1.5、5.2.1                                            │ P2       │
  │ 溯源闭环   │ 检索面                   │                                                               │          │
  ├────────────┼──────────────────────────┼───────────────────────────────────────────────────────────────┼──────────┤
  │ P4 全自动  │ SkillsCloud 技能层 +     │ 1.2.5、4.3.1-4.3.2                                            │ P3       │
  │            │ 失败降级                 │                                                               │          │
  └────────────┴──────────────────────────┴───────────────────────────────────────────────────────────────┴──────────┘

  ---

  五、前提条件、局限性与待确认项

  前提条件：①主平台 3000 常驻（IdP+网关，子平台依赖）；②生产二级域名+通配符证书落地（现为 localhost 联调态）；③#78
  端口迁移裁决通过；④Thesis 技术栈漂移以实测代码（Python FastAPI）为准。

  局限性：①主平台为 SPOF，需多副本+健康探针补强（D1 补强）；②SkillsCloud 为规划项，P4 前用既有 API 顶替（D3）；③BotHot
  台账待建，搜集节点契约待定稿；④微信扫码身份源 G0 待微信认证资质（行政门槛，任何 IdP 无解）。

  待确认项（需你裁决）：
  1. 编排层归属：Fleet 作为跨平台 DAG 编排器（D2）是否采纳？还是主平台自建编排能力？
  2. Fleet 双模式（6.4）：编排用自备池、能力调用走网关——是否同意？
  3. Thesis 接入力度（D4）：移除本地账密 + AI 改走网关，是否一次性到位还是分步？
  4. 溯源检索面（5.2.1）：主平台暴露 internal/trace 聚合查询，是否同意？
  5. 阶段起点：从 P1 接入补齐开始，还是直接跳到 P2 编排？
  6. ADR-0008：是否授权新建《跨平台编排与溯源路线》ADR？

  门禁对齐：本设计不解除任何铁律；落地时每步走六步循环，文档同步版本锚点 + 双向链接；oidc_clients 变更走 seed
  脚本；端口迁移走 #78 裁决。

  ---

  方案已完整呈现，等待你的确认（尤其是第五节 6 个待确认项）。确认后我会按六步循环 PLAN→SPEC
  起步，逐原子项落地，全程不偏离 ADR-0003/0005 与八红线。