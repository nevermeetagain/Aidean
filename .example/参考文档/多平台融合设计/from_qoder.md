收到。本次任务**只输出设计方案，不编辑/新建任何文件**。为保证方案建立在真实代码而非猜测之上，我先对主平台现状（认证、账户/余额、模型配置、API 契约、已有 SSO/OIDC 痕迹）做取证式探查。

## 阶段 0：代码库取证


主平台已内置 OIDC Provider。继续取证账户/余额/模型配置相关的核心实体与已有模块文档。


# Aidean 生态多平台融合设计方案（纯设计稿，未触碰任何文件）

---

## 〇、现状取证摘要（全部来自真实代码/文档，已确认）

| # | 证据 | 结论 |
|---|---|---|
| E1 | [schema.prisma](file:///e:/Code/Aidean/apps/web/prisma/schema.prisma#L52-L167)：`User.tier(NORMAL/PRO/MAX)`、`tokenVersion`、`OidcClient`（含 `firstParty`、`scopes` 默认 `wallet:read`）、`OidcUserConsent`（first-party 免同意） | 主平台**已是完整 OIDC IdP**，SSO 硬前置（refresh 轮换链、全端失效）已落地 |
| E2 | [oauth/ 路由 7 个](file:///e:/Code/Aidean/apps/web/app/oauth) + `/.well-known/openid-configuration` + JWKS | 授权码+PKCE(S256)、令牌兑换/刷新/撤销/内省全链路可用 |
| E3 | [API接口文档](file:///e:/Code/Aidean/docs/architecture/API接口文档.md) §5.4：`/api/v1/gateway/chat`（OpenAI/Anthropic 双格式、优先级路由+降级+free 兜底、预扣-捕获幂等、`X-Request-Id`）；`api-keys`（明文仅返回一次）；`custom-channels`；`station-keys` | **统一计费网关已交付 MVP**（非流式）；API Key 为**用户手动创建**形态，无自动派发 |
| E4 | [子平台SSO接入指南](file:///e:/Code/Aidean/docs/product/modules/子平台SSO接入指南.md) v1.4 + [子平台规范说明](file:///e:/Code/Aidean/docs/product/modules/子平台规范说明.md) §7.2 | 二级域名规划、host-only Cookie、back-channel logout 已实现；`/api/v1/internal/billing/wallet` 服务端实时查钱包；**AideanBot 是唯一已接入 SSO+网关的子平台**（client `wechat-rag`），Fleet 未接入，Thesis 自建账密（与红线#1 冲突） |
| E5 | 数据库文档：账本三表分离（`wallets`/`ledger_entries` 不可变双录/`balance_holds` 预扣）、三处幂等唯一约束、`products` 表含 AideanWiki slug、`packages/package_orders/redemptions` | 余额通用与数据溯源的**账务底座已存在**；AideanWiki 仅在产品矩阵登记，**实体宿主未确认** |
| E6 | 子平台规范说明 §一/§3.11/§五 | **子平台之间"互不共享代码、互不调用 API"**（现状铁律）；Fleet 零外部服务依赖（SQLite+JSONL）；端口区间口径 2026-09-29 已登记（3000-3100 主 / 3100-3200 Fleet / 3200-3300 BotHot / 3300-3400 Bot / 3400-3500 Thesis），存量端口大量越界待裁决（#78） |
| E7 | BotHot：仓库台账待建（#78），由 AideanBot 拓展而来 | 设计输入仅有定位（信息搜集/热点），**代码层证据不足** |

> ⚠️ **安全提示（铁律#1）**：您在消息中明文粘贴了 GitHub PAT。该 token 已在本次对话中暴露，建议**立即在 GitHub 上吊销/轮换**。本方案及后续任何产物均不记录、不回显该值。

---

## 一、第一轮·发散（5W1H）

**What**：用户要的"融合"= 五段流水线（BotHot/Bot 搜集 → Wiki 存储 → 主平台一键配模型 → Thesis 写作 → Fleet 查证）在**账号、计费、数据、编排、UX** 五个层面打通。现状：账号层（E1/E2）与计费层（E3/E4）**已建成 70%**；编排层**为 0**（E6 明确"互不调用"）；数据契约层**半建成**（requestId/账本已有，跨平台内容溯源没有）；BotHot/Wiki **接近 0**。

**Why**：直接原因是各平台孤立导致用户要配置 5 次、买 5 份套餐、数据 5 处漂移；根本原因是生态按"独立仓库独立部署"演进（ADR-0002/0003 的星型只覆盖了**账号**，没覆盖**工作流**）。

**Where/When**：耦合点只有三类——主平台 3000（IdP+网关，E6 已确认不可下线）、二级域名边界（E4 §2.1）、端口区间（E6）。时序上：SSO 扩面（Fleet/Thesis/BotHot 接入）先于编排，编排先于场景模板。

**Who**：主平台团队负责 IdP/网关/事件面/契约；各子平台团队负责 RP 接入+流水线挂载；BotHot 是新团队（由 Bot 衍生）；AideanWiki 宿主**待确认**（外部知识库 vs 主平台内建 RAG）。

**How**：核心手段是**把"子平台互不调用"升级为"星型 hub-and-spoke"**——所有跨平台流量经主平台（授权、计费、事件、数据契约四面），既不产生网状依赖，又与现有架构（E1-E4 全是星型端点）完全同构。

**What if**：
- Fleet 零依赖铁律不放行 → Fleet 只以"本地执行体+拉取主平台任务"形态参与（HTTP 客户端已有 `httpx` 类依赖的 Bot/Thesis 无此问题）；
- Wiki 落地为主平台内建 → 事件面可省一跳，但主平台单体膨胀，违背 ADR-0002 分离原则 → 倾向独立宿主；
- Thesis 不自建账密迁移 → 融合 UX 出现两套登录，tier 门禁无法穿透 → **必须**列入 P0；
- 如果"全自动"理解为无人审批 → 与 Thesis 付费权益、计费预扣的确认语义冲突 → 设计为"流水线自动 + 计费/发布节点可配审批"。

## 二、第二轮·苏格拉底致命追问（关键结论逐条拷问）

| 结论 | 追问 | 存活判定 |
|---|---|---|
| "一键免配置 = SSO 跳转即可" | SSO 只解决**身份**；Bot 接入仍要手工配 `OIDC_*` 五件套+网关地址（E4/E6 实证）。免配置的残留是**子平台服务端凭据注入**。 | 部分成立 → 需增补"first-party 免同意 + 配置注入标准化"（§B7.1） |
| "网关调用需要给子平台发 API Key" | ApiKey 明文仅创建时返回一次（E3），子平台无法安全持有用户 Key。 | **推翻直发 Key 方案** → 子平台以 `client 认证 + 用户 access_token` 调网关（Bearer JWT 已是网关合法凭据），零派发、零泄露面、随 tokenVersion 即时失效 |
| "Fleet 做编排引擎" | Fleet 是**本地单用户** Control Plane（SQLite、零外部服务、禁止 Redis/MySQL——E6）。生产多租户流水线不能跑在它里面。 | 部分成立 → **双形态**：服务端编排 = 主平台事件/流水线 API；开发者本地编排 = Fleet 拉取主平台任务模板执行后上报 |
| "余额套餐通用 = 查钱包即可" | 钱包实时查询已存在（E4 §5.2），但"套餐通用"还需 `packages.benefits` 定义**跨平台权益位图**，且子平台只能读不能猜。 | 成立但不足 → 增补权益契约端点与 benefits schema（§B3.4） |
| "数据可溯源 = requestId 已有" | requestId 只覆盖**计费链路**；内容链（抓取 URL→快照→引用→论文段落）无跨平台锚。 | **不足** → 需 `pipeline_run_id + 内容哈希 + citation 锚点表`（§B5.4） |
| "BotHot 由 Bot 拓展=复用 Bot 代码" | 铁律"不影响 aideanbot"（用户明示）+ Bot 已有独立 PG/Redis/队列。 | 成立 → BotHot 独立仓库/独立 client 注册/独立数据，仅复用**模式**不复用实例 |

## 三、第三轮·双向钢人论证（对总体架构选择）

**支持"星型 hub-and-spoke（主平台为 hub）"**：与已交付的 IdP/网关/内部计费端点完全同构（E1-E4）；子平台间零直连，**不违反** E6 现行铁律（只需把铁律措辞升级为"跨平台流量一律经主平台"）；任何一个 spoke 宕机不级联；安全边界（host-only Cookie、精确 redirect 白名单）不变。

**反对意见及处置**：
1. *主平台成为单点+性能瓶颈* → 成立但可控：JWKS 本地验签零往返（已实现）、事件面用 Redis Streams 独立逻辑库、网关无状态水平扩展（§B8）；
2. *主平台团队要接住所有编排需求，职责膨胀* → 部分成立：编排语义（模板/DAG）下沉 `@aidean/shared` 契约包，主平台只做**传输与记账**，执行语义归各 spoke（§B4.3）；
3. *事件驱动对本地开发形态（Fleet）过重* → 通过双形态豁免（§B4.4），Fleet 用拉取模式，不强制消费事件。

**幸存结论**：星型 + 双面（同步计费调用 / 异步事件流水线）+ 双形态（服务端/本地）是当前证据下唯一不与任何已冻结架构决策冲突的路线。

## 四、第三轮·重构终稿：可执行大纲

> 层级：L 层（9 层）→ N 节 → N.N 原子任务。每任务标注【新增/扩展/复用】与确认状态。

---

### 【方案大纲】Aidean 生态五平台深度融合

#### B0 总体架构原则（前提与不变式）

- B0.1 **星型铁律**：子平台之间永不直连；跨平台身份、计费、事件、数据一律经主平台 hub（**扩展** E6 铁律，非推翻）。
- B0.2 **四面分离**：身份面（OIDC，已有）、计费面（网关+账本，已有）、编排面（事件/流水线，新建）、数据契约面（溯源锚点，新建）。任意一面可独立演进。
- B0.3 **双形态**：同一能力区分"服务端生产形态"（多租户、主平台托管）与"开发者本地形态"（Fleet/单机工具，拉取+上报），流水线模板对两形态同契约。
- B0.4 **零副本原则**：余额/套餐/tier 只实时读（JWT claims + 钱包端点），任何子平台禁止持久化副本（沿用 SSO 指南铁律 3）。
- B0.5 **幂等三锚**：`requestId`（计费）/ `pipeline_run_id + step_id`（编排）/ `content_hash`（数据）——所有跨平台写操作必须携带至少其一。

#### B1 身份与账号层（Lv1：IdP 扩面）

- B1.1 `oidc_clients` 注册扩面【扩展·复用表】：新增 seed `bot-hot`、`aidean-fleet`、`aidean-thesis`（对齐既有 `wechat-rag/aidean-rag/skills-cloud` 三 seed 模式，secret 经 env 注入不落库明文）。
- B1.2 first-party 免同意全铺【已确认·复用】：三个新 client 均 `firstParty=true`→ 已登录主平台用户"一次点击"直达子平台，无 consent 页（O2 核心体验的协议层依据）。
- B1.3 Fleet 接入 SSO【新增·子平台侧】：控制台（Vue3）加"使用 Aidean 账号登录"→ 授权码流 → `sub` 绑定本地用户；回调 `http://localhost:3100+/auth/aidean/callback`（本地）与二级域条目（生产）**分开登记**。
- B1.4 Thesis SSO 迁移【新增·子平台侧，P0】：按 SSO 指南 §9 三步（sub 命中→email 合并→新建）；**处置存量自建账密**（E6 红线冲突）：注册/登录入口收敛为主平台跳转，本地 `identity` 模块降级为 `sub↔localUser` 映射表。
- B1.5 BotHot 接入【新增】：从 AideanBot 的 `providers/aidean/` 端口-适配器模式**复制模式不复制实例**，独立 client_id、独立 PG/Redis（端口区间 3200-3300 + 基础设施端口按 #78 裁决错开）。
- B1.6 back-channel logout 闭环【扩展·复用机制】：三个新 client 注册 `logoutUri`，回填《子平台SSO接入指南》§10.1 清单表（该表本就是为此预留的验收载体）。
- B1.7 微信身份源穿透【待确认】：扫码登录依赖主平台微信凭据下发（指南 §10 待办），协议链路已就绪——列为并行推进项，不阻塞。

#### B2 统一访问凭据层（Lv2："免配置"的凭据内核）

- B2.1 **否决直发 API Key 给子平台**（第二轮追问结论）：子平台调网关一律 `Authorization: Bearer <用户 access_token>` + client 认证头——JWT 是网关合法凭据【部分确认：需核验网关鉴权中间件对 JWT-Bearer 的接受路径，落地前补一次代码取证】。
- B2.2 15 分钟 access TTL 与长任务矛盾 → 子平台服务端静默 refresh 轮换（指南 §4 已有语义），长流水线以"任务级令牌注入"替代"请求级持有"（见 B4）。
- B2.3 tokenVersion 全端失效穿透【已确认·复用】：改密/封号 → 子平台刷新即失败 → 统一回主平台登录页；子平台禁止循环重试（指南 §6）。

#### B3 计费与权益层（Lv3：余额、套餐通用）

- B3.1 AI 调用零自扣费【已确认·复用】：所有子平台模型调用统一走 `/api/v1/gateway/chat`（预扣-捕获、账本双录、降级+free 兜底）——一份余额五处可用。
- B3.2 权益门禁标准化【扩展】：`tier` 进 JWT claims（已有）→ 各子平台按 claims 做功能开关；**禁止**子平台把 tier 落库当只读快照，超时用钱包端点实时复核（涉资金操作走 introspect）。
- B3.3 非 AI 计费通道【新增·需单独评审】：Thesis 查重（PaperFree 成本）、Bot 抓取配额等"第三方成本型"消费 → 开放 `billing:write` scope 的**代记通道**：子平台服务端以 `requestId + cost 明细` 记账入主平台账本，规则表由主平台 Admin 配置（计费规则可配是本仓库既有模式）。
- B3.4 套餐跨平台权益位图【扩展】：`packages.benefits` JSON 定义为 `{platform: {feature_key: quota}}` 契约（落 `@aidean/shared`），新增权益端点 `GET /api/v1/internal/billing/entitlements?userId=`（一次返回 tier+有效套餐权益，替代子平台多次查询）。
- B3.5 用户侧统一消费视图【扩展】：`/user/usage` 已含 billingPath 过滤 → 增加 `source`（ clientId）维度，控制台可见"哪个平台花了多少钱"。

#### B4 编排与工作流层（Lv4：全自动流水线——本方案最大增量）

- B4.1 **生态事件总线**【新增】：主平台侧 Redis Streams（各平台独立逻辑库/key 前缀命名空间），事件契约 v1：`ingest.completed`、`kb.doc.published`、`pipeline.run.requested/started/step.completed/failed`、`citation.verified`。发布方只发事实，订阅方各自消费——**事件只传 ID+锚点，正文走数据契约层拉取**（消息体 ≤4KB 红线）。
- B4.2 **流水线 API**【新增】：主平台 `POST /api/v1/pipelines/runs`（模板 id + 入参 + idempotencyKey）；`GET /runs/[id]` 状态与产物索引。流水线状态机仿 Fleet 的 FROZEN 状态机经验：10 状态内、迁移表显式、非法迁移拒绝。
- B4.3 **模板 = 共享契约**【新增】：DAG 定义（节点=平台能力，边=事件依赖）下沉 `@aidean/shared` 包，主平台只做传输记账，**执行语义归各 spoke**——防止主平台职责膨胀（反对意见 2 的处置）。
- B4.4 **Fleet 双形态**【扩展】：
  - 本地形态（不动架构）：Fleet 拉取 `GET /api/v1/pipelines/templates` → 以角色七席编排本机执行体 → `POST /runs/[id]/events` 上报进度与产物（HTTP 客户端，不违反零**服务**依赖铁律；需 Fleet 维护者放行一条新依赖方向，**待确认**）；
  - 生产形态：流水线由主平台事件面驱动，各 spoke 的 worker（Bot/Thesis 已有 Celery）自主消费——**不需要中心引擎**。
- B4.5 审批节点【新增·可配】：默认全自动；"发布/付费超阈值/查重报告交付"三类节点可按模板配置人工审批（对齐六步开发循环的 APPROVE 语义），审批经主平台通知中心触达。
- B4.6 失败语义【新增】：步骤级重试（幂等锚 B0.5）→ 耗尽后 run 挂起 + 事件告警；计费侧沿用 `5003 GATEWAY_UPSTREAM_ALL_FAILED` 类错误码段位登记规则（先登记后实现）。

#### B5 数据契约与溯源层（Lv5）

- B5.1 **全局追踪**【复用+扩展】：`X-Request-Id`（UUIDv7 时间有序，网关已强制）→ 升级为 run 级 `pipeline_run_id` 贯穿事件、账单、引用三链；SLSA 式 provenance 理念：每个派生数据落 `{source_url, fetched_at, content_sha256, snapshot_uri}` 四元组。
- B5.2 **跨平台引用锚点表**【新增·主平台】：`citations`（id, run_id?, sub, source_type, url, content_hash, snapshot_uri, verified_state, created_at）——Thesis 写作的每条引用、Fleet 查证的每个结论都锚定于此；快照对象存储 S3 兼容（Thesis ADR-009 已承诺），元数据入主平台保证"不丢失"。
- B5.3 **Fleet 本地数据上云通道**【新增】：`events.jsonl`（append-only 不动）+ 归档时批量上报 evidence 包至主平台（低频、幂等、可离线补传）——解决"本地优先 vs 溯源不丢失"的架构张力。
- B5.4 **实体规范**【扩展·复用】：全生态沿用主平台规则：UUIDv7 主键、金额整数最小单位、软删、`deletedAt`；子平台新表强制对齐（各仓库 AGENTS.md 增补一条交叉引用，属文档同步非代码变更）。
- B5.5 迁移与回滚【扩展】：各子平台独立 alembic/Prisma migration，**无分布式事务**；跨平台一致性只靠幂等+事件重放（至少一次投递 + 消费端幂等去重）。

#### B6 知识库层（Lv6：存储与复用）

- B6.1 **宿主裁决（待确认，两案）**：
  - A 案（推荐）：AideanWiki = 独立服务（可基于 Bot 的 KB 能力产品化，独立仓库/独立 client），生态内公开内容库 + 用户私有库两级；
  - B 案：主平台内建 RAG——违背前后端分离单体膨胀风险，仅在 Wiki 需求量小时回退。
- B6.2 知识流转契约【新增】：`kb.doc.published` 事件 + `GET /kb/docs/{id}`（Bearer）拉正文；Bot→Wiki 入库（已有 ingest/categorizer 服务，E6 §2.4 实证）、Thesis→Wiki 检索（RAG）、Fleet→Wiki 查证结果回写 `verified_state`。
- B6.3 公共库/私有库边界【复用+扩展】：Bot 的 P1 public_library + P0 资产命中计数已具雏形 → 可见性三态（私有/生态公开/全站公开）由主平台 products/权限元数据统一登记。
- B6.4 向量化统一走网关【扩展】：Bot 现直连硅基流动（E6 §2.6 `EMBEDDING_API_BASE`）→ 迁移为 `gateway/embeddings`（新增端点，计费同账本）；embedding 模型注册进天梯，纳入"一键配置"候选集。

#### B7 用户体验融合层（Lv7：一键登录/一键配置的落点）

- B7.1 **一键配置模型（主→子）**【扩展】：主平台控制台"我的模型配置"（tier-mappings/priorities/custom-channels 已有）→ 出**配置分发 API** `GET /api/v1/internal/user/model-config?userId=`（返回路由优先级+兜底策略），子平台运行时拉取并在自己的"模型设置"页展示为**只读继承 + 本地覆写**两层。
- B7.2 **一键配置（用户→外部工具）**【扩展·复用】：主平台已有 OpenAI+Anthropic 双格式端点 → 增加 Cursor/Claude Code 等**IDE 配置片段一键复制**（base_url=网关，token=用户自建 api_key——注意：这条通道保留 ApiKey 手动形态，与 B2.1 子平台通道互不干扰）。
- B7.3 生态入口导航【新增·轻】：各子平台顶栏"生态跳板"（主平台+四平台图标直达），跳转一律走 authorize URL（已登录=一次点击直达）；导航数据复用主平台 `navigation` 模块（本仓库已有 navigation-sync）。
- B7.4 免配置装配标准【新增·交付物】：`nacos` 式"接入即三件套"——子平台仓库 `.env.example` 统一键名（`AIDEAN_ISSUER/AIDEAN_GATEWAY_URL/OIDC_*`，沿用 Bot 已验证的五件套命名），主平台 docs 出**一键注册脚本**（Admin 生成 client + 输出 env 片段；secret 只在颁发响应出现一次，落盘权限口径遵循本仓库 .env 规范）。
- B7.5 全端状态可见【扩展】：主平台控制台增"已连接应用"页（`oidc_user_consents`+活跃 refresh 链聚合），用户可单平台断开（revoke 链）——把两级撤销语义（指南 §4）变成用户可操作界面。

#### B8 场景适配层（Lv8：五类用户的流水线模板）

| # | 场景 | 管道 | 权益关键点 |
|---|---|---|---|
| B8.1 | 大学生/研究生 | Wiki 文献入库 → Thesis 大纲/初稿 → Fleet 逐段查证 → 引用报告 | PRO：查重额度；NORMAL：限篇数+水印 |
| B8.2 | 科研人员 | Bot 订阅领域公众号/源 → 知识库 → Thesis 综述（引用全锚 B5.2） | 引用快照永久可导出=溯源卖点 |
| B8.3 | 金融研究员 | BotHot 实时热点/公告采集 → 事件驱动分析 run → 多源交叉查证 | 事件时效性最高；付费代记通道 B3.3 主战场 |
| B8.4 | 行业分析员 | BotHot 舆情 → Wiki → Thesis 报告模板 → IDE 深度定制（B7.2） | MAX：并行 run 数 |
| B8.5 | 自媒体博主 | BotHot 选题榜 → Bot 素材库 → 网关生成稿 | free 兜底路由=零成本试跑 |
- B8.6 模板注册机制【新增】：模板存主平台（版本化 JSON DAG），场景=模板+权益门禁的组合——新场景不改代码只加模板。

#### B9 非功能层（Lv9：性能/扩展/安全/容错/可观测）

- B9.1 **性能**：身份面零往返（JWKS 本地验签，已实现）；权益读加 30s 只读 Redis 缓存（键 `ent:{sub}`，tier 变更事件主动失效）；事件面 Streams 按 `*` 组消费，单事件 ≤4KB；网关候选链降级沿用。
- B9.2 **扩展性**：新平台接入成本 = B1.1 一行 seed + B7.4 三件套 + 订阅感兴趣事件——主平台零代码变更；能力面扩（如加 AideanVideo）走同一路径。
- B9.3 **安全**：client secret 仅服务端 env（600 口径）；PAT/密钥永不入聊天/日志/仓库（本铁律延续）；开放重定向防护（精确白名单已实现）；跨平台写操作全部要求 client 认证+scope 校验（10007 已有）。
- B9.4 **容错**：spoke 宕机→run 步骤挂起可重放；hub 宕机→子平台用未过期 access（≤15min）继续本地服务，入队写操作待 hub 恢复重放（幂等锚兜底）；Redis 持久化 AOF 用于事件面。
- B9.5 **可观测**：`X-Request-Id` 全链透传 + `pipeline_run_id` 关联结构化日志（structlog 两平台已有）；重放告警（auth-security，已实现）+ run 失败率/步骤耗时两指标入监控。

#### B10 实施里程碑（建议排期，供确认）

- **M-1（纯复用，2~3 周）**：B1.3/B1.4/B1.6 Fleet+Thesis 接入 SSO 与网关（Bot 模式照搬）——融合地基，风险最低。
- **M-2（凭据与权益内核）**：B2.1 网关 JWT-Bearer 通道取证与落地、B3.3/B3.4 权益契约、B6.4 embeddings 上网关。
- **M-3（数据契约先行）**：B5.1/B5.2 citations 锚点表 + 快照存储（编排的依赖前提）。
- **M-4（事件面+流水线）**：B4.1/B4.2/B4.3 + 单场景模板打样（建议 B8.5 自媒体，链路最短）。
- **M-5（编排全自动）**：B4.4 双形态、B4.5 审批、其余四场景模板、B7.1 配置分发。
- **M-6（BotHot/Wiki 收口）**：依赖 #78（端口裁决）与 B6.1（宿主裁决）两项**管理者判断**先行。

#### B11 待确认清单（不得当成已完成）

| # | 事项 | 状态 |
|---|---|---|
| Q1 | AideanWiki 宿主（A 案独立服务 vs B 案内建） | **待确认（管理者裁决）** |
| Q2 | 网关是否已接受用户 JWT 直接 Bearer（B2.1） | 待代码取证（半天内可确认） |
| Q3 | Fleet 放行"http 上报依赖方向"（不违反零服务依赖） | 待确认（Fleet 维护者） |
| Q4 | BotHot 仓库现状（#78 台账待建） | 证据不足 |
| Q5 | Thesis 存量账密用户合并的密码验证策略（SSO 指南 §9 建议项） | 待确认 |
| Q6 | `billing:write` 代记通道的评审口径（哪些成本项可代记） | 待确认（单独评审，指南 §5.3 已预留） |
| Q7 | 生产域名实际分配（`.aidean.com` 为示意） | 待确认 |
| Q8 | 端口区间口径 #78（存量越界迁移+基础设施豁免） | 待裁决，非本方案范围 |

---

## 五、结论的前提条件与局限性

- **前提**：B1~B3 全部建立在已交付且经文档实证的 OIDC/网关/账本能力上（E1-E4）；增量风险集中在 B4 事件面（全新）与 B6.1 宿主裁决。
- **局限**：本次未读取 Bot/Fleet/Thesis 三仓库源码（仅有主平台侧台账 E6），子平台侧工作量估算以台账为据，落地前需在各仓库按其 AGENTS.md 流程重新取证；所有端口/域名以 #78 与 Q7 裁决为准。
- **可推翻点**：若 Q2 取证发现网关不接受 JWT-Bearer 且不便于扩展，B2 退化方案为"子平台服务端代持用户 Key（加密存储+轮换）"——架构其余层不受影响。

---

**等待您的确认**。可整案确认，也可逐条反馈（尤其 Q1~Q8 的裁决意见与 B10 里程碑取舍）；确认后我才会进入下一阶段（届时将按六步开发循环先出 PLAN/SPEC 文档提案，仍经您批准方动代码）。