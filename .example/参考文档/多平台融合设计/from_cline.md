我已完成**只读侦察**（零文件改动）。以下为三轮推理后的终稿设计。

> ⚠️ **安全先行（必须先处理）**：你在消息中**明文贴出了 GitHub PAT**。我未复述、未抄录、未写入任何文件、未在任何命令中使用它。请立即到 GitHub → Settings → Developer settings → Tokens **吊销该 token 并重新签发**；若曾写入 `~/.git-pat` / `~/.git-credentials` 或 remote URL，请一并清理。这优先于本设计任务。

---

# 第一轮 · 发散（5W1H）

**What（客观事实，全部取自真实文件）**

| # | 事实 | 证据 | 状态 |
|---|---|---|---|
| F1 | 主平台 IdP **已建成运行**：7 端点 + discovery + JWKS，RS256/PKCE/轮换链/tokenVersion | `apps/web/app/oauth/*`、`middleware.ts` Edge fail-closed | 已确认 |
| F2 | 余额基建**已存在**：`GET /api/v1/internal/billing/wallet`（client 凭据 + `wallet:read`）、BalanceHold `hold→capture→void`、`releaseExpiredHolds` | `app/api/v1/internal/billing/wallet/route.ts`、`lib/features/billing/*` | 已确认 |
| F3 | 统一计费网关**已存在**：`POST /api/v1/gateway/chat`，OpenAI/Anthropic 双格式，预扣-按实捕获，`x-request-id` 幂等 | `app/api/v1/gateway/chat/route.ts` | 已确认 |
| F4 | `oidc_clients` 单表 + **4 个 first-party seed**（`aidean-rag`/`wechat-rag`/`skills-cloud` + upsert 计数 4） | `prisma/seed.ts:328-331` | 已确认 |
| F5 | **back-channel logout 已实现**（fire-and-forget 5s、2 次重试） | `lib/features/oauth/backchannel.ts:47,81` | 已确认 |
| F6 | **AideanBot 已接入**（唯一被文档确认方），回调 3333，`AIDEAN_GATEWAY_URL` 指主平台 | `AideanBot/docker/.env.example` | 已确认 |
| F7 | **BotHot 已配齐 OIDC 五件套 + 网关 URL**，回调 3200 | `AideanBotHot/docker/.env.example:29-52` | 已确认 |
| F8 | **AideanThesis 实际已实现 SSO 模块**：`sso_routes.py` 含 authorize/callback/**merge**/**backchannel-logout**/**wallet**，`.env.example` 有 `AIDEAN_SSO_*`（引用「guide v1.4」） | `AideanThesis/apps/api/.../identity/**` | 已确认 |
| F9 | **主平台文档与 F8 冲突**：《子平台规范说明》§7.2 记「AideanThesis **未接入**（自建认证）」 | `docs/product/modules/子平台规范说明.md:758` | **存在缺陷（文档漂移）** |
| F10 | **BotHot LLM/Embedding/Reranker 默认直连 SiliconFlow**，不经网关 | `AideanBotHot/backend/app/core/config.py:64,70`、`providers/reranker.py` | **存在缺陷（余额链断裂）** |
| F11 | **BotHot 与 AideanBot 共用 `wechat-rag` 一个 client_id**，3333 与 3200 回调混入同一白名单 | 两边 `.env.example` 对比 | **存在缺陷（aud 隔离/登出粒度受损）** |
| F12 | **AideanFleet 零接入**：`.env.example` 无任何 `AIDEAN_*`/`OIDC_*` | `AideanFleet/.env.example` | 已确认 |
| F13 | 端口**现状严重冲突**：`3000`（主平台↔Thesis）、`3333`（Bot↔Fleet）、`8000`（Bot↔Thesis） | 《子平台规范说明》§5 实测表 | 已确认 |
| F14 | 五段端口区间为**目标态**，迁移与豁免挂台账 **#78 待裁决** | `docs/plans/未完成事项目录.md` §7.20 | 部分确认 |
| F15 | 现有铁律：三子平台「**互不共享代码、互不调用 API**」 | 《子平台规范说明》§1:23 | 已确认 |

**Why**：你的 5 步链路（搜集→存储→配置模型→写论文→查证）本质是**跨平台业务流水线**，与 F15「互不调用 API」直接冲突；「全自动」又依赖 F13 端口可并行——两者当前**都不成立**。这是本方案必须解决的**根本矛盾**，而非表面接入问题。

**Where/When**：冲突集中在①`oidc_clients` 注册面、②各子平台 `.env`、③端口矩阵、④LLM 调用出口。执行顺序上，**端口裁决 → client 拆分 → LLM 出口收敛 → 编排层 → 场景**，不可倒置。

**Who**：主平台=IdP+余额唯一权威+网关唯一计费口（责任方：主平台仓）；Bot/BotHot/Fleet/Thesis=RP；编排层=**待裁决归属**。

**How / What if**：见第二轮追问后收敛结论。

---

# 第二轮 · 苏格拉底追问 + 双向钢人

**Q1 「全自动」是否与「互不调用 API」铁律矛盾？**
- *支持保留铁律*：该铁律是 F15 的明确记载，解耦三平台、独立演进。
- *反对*：你的 5 步链路**必然**要 BotHot 把数据交给 Thesis、Fleet 去查证——不调用就无法全自动。**反方胜**。
- **追问**：那是否要推翻铁律？不必。铁律的本意是「子平台之间不互相耦合」（横向解耦），而非禁止「经主平台编排」（纵向编排）。**存活结论**：保留「子平台互不调用」，新增**唯一编排者**，所有跨平台调用经它中转 → 横向解耦不变，纵向编排补齐。

**Q2 编排者是谁？三向钢人**
| 方案 | 支持 | 反对 | 判定 |
|---|---|---|---|
| A 主平台内嵌 | 已有 cron sidecar、`run-due` 防重入锁（`lock:scheduler:run-due`） | 使主平台从「IdP+网关」膨胀为「万能中枢」，失败半径扩大；违 ADR-0005 「IdP 职责收敛」精神 | 弱 |
| B 新建编排微服务 | 职责纯净 | **违铁律 5 技术栈锁定**（引入新运行时），且 ADR-0003 已否决同类成本 | 否 |
| C **AideanFleet 承载** | Fleet **本就是**「薄控制面 + 可插拔执行体」，有 10 状态任务机（FROZEN v1.1）、15 字段进度表、REST+WS 契约、Manager 派工 | Fleet 当前零 SSO/零计费接入（F12）——但这是**待补的缺口，非结构性障碍** | **胜出** |

**存活结论**：**AideanFleet = 生态编排者（Orchestrator）**。主平台只负责「签发凭证 + 计费 + 存权威数据」，Fleet 负责「跨平台任务编排」。这**零新增运行时**、复用已归档的 v3 基线，是唯一同时满足铁律 5 与「高性能、高拓展」的路径。

**Q3 「余额通用」当前是否成立？** —— **不成立**。F10 证明 BotHot 的 LLM/Embedding/Reranker 全部绕过网关直连 SiliconFlow，主平台**完全看不到这些消费**。
- *钢人反方*：「直连更快，省一次转发」→ 成立，但代价是余额不可通用、无用量审计、无统一降级。
- *钢人正方*：走网关可统一预扣/降级/审计 → 成立，代价是一跳延迟。
- **存活结论**：**必须收敛到网关**，用「本地连接池 + 网关侧流式透传」抵消一跳开销；Embedding/Reranker 作为**新的计费计量类型**扩展（当前网关只有 chat 口）。

**Q4 「一键登录免配置」的真正缺口是什么？** 不是协议（协议已完备），而是三件事：①BotHot **复用** `wechat-rag` 导致登出/撤销无法区分产品（F11）；②Fleet **完全没接**（F12）；③Thesis 虽已实现 SSO 但**同时保留本地账密**（`jwt_provider`+`passlib`），触碰红线 1。→ 缺口是**注册面与清理**，不是新开发。

**Q5 Thesis「未接入」是文档错还是代码错？** 代码证据（F8）压倒文档表述（F9）。**判定：文档漂移，代码为准**（符合《子平台规范说明》§8.4「不接受凭记忆填写」）。→ 归入台账更新项，非接入开发项。

**Q6 「数据可溯源不丢失」现在有支撑吗？** 部分。主平台有 `model-provenance.spec` 与 seed provenance 标记；BotHot 有标准化资产（Markdown+元数据+质量评分）。但**跨平台无统一溯源结构**，Fleet 查证结果无法回挂到 Thesis 的引用链。→ **证据不足，需新增统一 Provenance 结构**。

**Q7 端口不收敛会怎样？** 3000/3333/8000 三处冲突意味着**五平台无法同时在线**，而全自动流水线要求五平台并行 → **端口是「全自动」的硬前置**，必须先于一切执行（F13+F14）。

---

# 第三轮 · 重构终稿

## 前提与局限（先声明）

- **前提**：维持 ADR-0002/0003/0005 自研 IdP 路线；主平台为唯一余额写权威；子平台零余额写权限；遵守铁律 5 技术栈锁定。
- **局限**：①本方案**未改动任何文件**，全部为设计；②Fleet 承载编排是**架构建议，待你裁决**；③Wallet 展示层缓存是否违反「禁止持久化余额副本」需你拍板；④外部 IdP 重评触发线（接入>5）**本方案将使其提前达成**，需同步 ADR-0006 重评窗口。
- **未验证**：Thesis SSO 的实际联调是否已通过（代码在、e2e 未见）；BotHot 网关切换开关是否存在（仅有 env，未见读取逻辑）。

---

## 可执行大纲（L0–L8，三级编号，原子化）

### L0 裁决与前置层（Gate，必须最先完成）

- **0.1 端口收敛裁决**（依据 #78）
  - 0.1.1 落定五段区间为唯一真源：Aidean `3000–3100` / Fleet `3100–3200` / BotHot `3200–3300` / AideanBot `3300–3400` / Thesis `3400–3500`
  - 0.1.2 迁移 Thesis web `3000→3400`、api `8000→3401`（其 README 已自述 3400/3401，改动量小）
  - 0.1.3 迁移 AideanBot backend `8000→3301`；Fleet UI `3333→3101`、console `5000→3102`、manager `9900→3103`
  - 0.1.4 裁决基础设施端口豁免（PG/Redis/LangBot 5433/6380/5300 保持现状）
  - 0.1.5 **验收**：五平台同时启动，`netstat` 无双占，e2e `--workers=1` 全绿
- **0.2 编排层归属裁决**
  - 0.2.1 选定 **C：AideanFleet 承载编排**（推荐），或 A/B
  - 0.2.2 若选 C，登记 ADR-0008「AideanFleet 兼任生态编排者」并走六步循环 APPROVE
- **0.3 文档漂移归档**
  - 0.3.1 修正《子平台规范说明》§7.2：Thesis 状态改「**已实现 SSO 模块，联调待验**」，附 `sso_routes.py` 证据（F8）
  - 0.3.2 升版本标记（铁律 3），同步《文档索引.md》（铁律 6）

### L1 身份融合层（一键登录免配置）

- **1.1 oidc_clients 注册面整改**
  - 1.1.1 **为 BotHot 独立注册 `bot-hot` client**（新增一行 + `OIDC_CLIENT_SECRET_BOT_HOT` env），回调 `http://localhost:3200/auth/aidean/callback`，scopes `openid profile wallet:read`
  - 1.1.2 从 `wechat-rag` 白名单**移除 3200 条目**，AideanBot 独占 `wechat-rag`（恢复 aud 隔离与登出粒度）
  - 1.1.3 注册 `aidean-fleet` client（回调 `http://localhost:3101/auth/aidean/callback`）
  - 1.1.4 核验 Thesis 侧 `AIDEAN_SSO_CLIENT_ID` 对应的 client 是否已注册（**待确认**，若无则补一行）
  - 1.1.5 **验收**：`node apps/web/scripts/check-oidc.mjs` 输出 5+ client，每 client 回调互不重叠
- **1.2 子平台侧接入**
  - 1.2.1 Fleet：新增 `providers/aidean/`（对照 BotHot 同构实现）+ 回调路由 + 本地会话
  - 1.2.2 BotHot：env 五件套切换到新 `bot-hot` client，验证 backchannel logout 投递
  - 1.2.3 Thesis：**移除本地账密入口**（红线 1），或按 ADR-0003 §5 走「本地账号 + 显式绑定」双账号模型
  - 1.2.4 **验收**：四平台 `sub` 同一人；主平台登出 → 四平台会话全部销毁
- **1.3 一键直达（免配置跳转）**
  - 1.3.1 主平台控制台新增「生态入口」区，带 `id_token_hint` 或已登录态 302 直达各子平台
  - 1.3.2 子平台未登录时自动走授权码流（一次点击完成），**禁止任何密码框**
  - 1.3.3 **验收**：从主平台单击进入 4 子平台，全程零二次输密码、零手工配置

### L2 资金融合层（余额/套餐通用）

- **2.1 LLM 出口全量收敛至网关**（修复 F10）
  - 2.1.1 BotHot `config.py:64,70` 的 `llm_api_base`/`embedding_api_base` **默认值改为 `AIDEAN_GATEWAY_URL`**，SiliconFlow 直连降为 dev-only 兜底
  - 2.1.2 BotHot `reranker.py` 同步切换；保留直连仅作网关不可用时的显式降级（并记审计）
  - 2.1.3 复用 `providers/aidean/client.py` 统一出口，禁止 Service 层感知 HTTP
  - 2.1.4 **验收**：BotHot 一次问答 → 主平台 `usage_logs` 出现对应用量行；断网关 → 可控降级而非静默直连
- **2.2 计费计量面扩展**
  - 2.2.1 网关新增 `embedding`/`rerank` 计量类型（当前仅 chat）
  - 2.2.2 长任务接入 BalanceHold `hold→capture→void`，幂等键 = `x-request-id`
  - 2.2.3 **验收**：`usage_logs` 按 model+billingPath 可对账，零重复扣费
- **2.3 余额读路径统一**
  - 2.3.1 四子平台展示层一律调 `GET /api/v1/internal/billing/wallet?userId=<sub>`（scope `wallet:read`）
  - 2.3.2 **禁止本地持久化余额副本**（红线 3）
  - 2.3.3 【**待你裁决**】展示层是否允许**进程内 ≤5s TTL 缓存**（非持久化、资金操作零缓存）——存在违红线 3 的解释风险
  - 2.3.4 **验收**：主平台扣费后 ≤5s 内所有子平台余额显示同步

### L3 数据融合层（知识库 + 溯源不丢失）

- **3.1 知识库归属裁决**（BotHot LangBot RAG 与 AideanWiki 功能重叠，不分裂则数据重复）
  - 3.1.1 裁定 **采集与工作知识库归 BotHot**，**百科/长期沉淀归 AideanWiki**，写清边界
  - 3.1.2 若裁定合并，则 AideanWiki 仅作只读发布面，写入仍走 BotHot
- **3.2 统一溯源结构 ProvenanceRef**（新增跨平台契约，四级）
  - 3.2.1 字段：`sourceId` / `sourceType` / `sourceUrl` / `capturedAt` / `contentHash` / `collectorPlatform` / `pipelineRunId` / `parentRefs[]`
  - 3.2.2 BotHot 入库时**强制**填充（其已有 Markdown+元数据+质量评分，扩展即可）
  - 3.2.3 Fleet 查证结果回写 `parentRefs`，形成可回溯链
  - 3.2.4 Thesis 引用文献时携带 `sourceId`，论文引用 → 一键回溯到原始抓取
  - 3.2.5 **验收**：Thesis 中任一引用可反向定位到「哪次抓取、何时、哪个平台、原文 hash」
- **3.3 防丢失**
  - 3.3.1 `contentHash` 去重 + 源文快照落库（BotHot `raw_store` 已具备，接入 ProvenanceRef 即可）
  - 3.3.2 跨平台传输走**引用（id）而非拷贝**，避免副本漂移
  - 3.3.3 **验收**：删除源文后，引用方仍可回放快照

### L4 编排融合层（全自动流水线）

- **4.1 Fleet 编排能力补齐**
  - 4.1.1 Fleet 接入 SSO（见 1.2.1）+ internal wallet 读
  - 4.1.2 定义 `Pipeline` 模型：阶段 DAG + 状态机复用现有 10 状态（FROZEN v1.1）
  - 4.1.3 各平台实现**统一执行体适配器契约** `POST /fleet/v1/exec`（输入 ProvenanceRef 集 + 输出 ProvenanceRef 集）
- **4.2 五步流水线定义（你的链路）**
  - 4.2.1 `S1 采集`：BotHot 订阅/抓取 → ProvenanceRef[]
  - 4.2.2 `S2 入库`：BotHot RAG + 索引 → 知识条目 id
  - 4.2.3 `S3 模型配置`：主平台下发推荐模型/渠道（**经网关**，非写余额）
  - 4.2.4 `S4 分析写作`：Thesis 消费 S2+S3 → 文稿 + 引用链
  - 4.2.5 `S5 查证`：Fleet 核验 S4 引用 → 证据回写 3.2.3
  - 4.2.6 `S6 汇总`：结果回主平台展示，全链 `pipelineRunId` 贯穿
- **4.3 可靠性**
  - 4.3.1 每阶段幂等：`requestId` 去重；失败重试走指数退避
  - 4.3.2 断点续跑：状态机持久化，跨平台任一平台宕机不丢进度
  - 4.3.3 事件驱动优先于轮询（复用 back-channel fire-and-forget 模式）
  - 4.3.4 **验收**：任一平台中途重启，流水线从断点继续；无重复消费

### L5 场景落地层（五类用户逐一拆解）

| 编号 | 用户 | 核心场景 | 主用链路 | 关键差异化需求 |
|---|---|---|---|---|
| 5.1 | **大学生/研究生** | 文献搜集→笔记→论文初稿→查重前查证 | S1→S2→S4→S5 | 低门槛、免费额度优先、引用格式规范 |
| 5.2 | **科研人员** | 课题跟踪→数据沉淀→论文/报告→证据核验 | S1→S2→S4→S5→S6 | 严苛溯源、长期归档、团队共享知识库 |
| 5.3 | **金融研究员** | 财报/公告抓取→要点入库→模型分析→交叉验证 | S1→S2→S3→S4→S5 | **时效性**、热点聚簇（BotHot 已备）、多源交叉验证 |
| 5.4 | **行业分析员** | 行业资讯→结构化→报告生成→数据复核 | S1→S2→S4→S5 | 模板化输出、批量处理、渠道推送（BotHot 6 渠道） |
| 5.5 | **自媒体博主** | 热点追踪→选题→成稿→多渠道分发 | S1→**S4**→**S6** | 热点日报/Feed（BotHot 已备）、定时推送、弱查证 |

- **5.6 场景汇总**：五类用户共用**同一条 S1–S6 流水线**，差异仅在「触发器（定时/手动/事件）+ 输出模板 + 分发渠道 + 查证强度」四个参数 → 以**配置而非分叉**实现，保证高拓展

### L6 非功能层（性能 / 拓展 / 安全）

- **6.1 性能**
  - 6.1.1 本地 JWKS 验签零 RTT（已具备，保持）
  - 6.1.2 网关流式透传 + 连接池，抵消一跳开销
  - 6.1.3 Redis 仅用于**易失状态**（会话/锁/限流），余额不入 Redis 副本
  - 6.1.4 大表分区：`usage_logs` 按 RANGE 分区（已登记）
- **6.2 高拓展**
  - 6.2.1 新增平台 = `oidc_clients` **一行** + 一条 DNS + 一个 nginx server 块 + 一个 Fleet 执行体适配器（**四步，零主平台代码改动**）
  - 6.2.2 端口 = 从所属百段区间内取号，进注册表
  - 6.2.3 触发 ADR-0003 §6 重评线（接入>5）→ 启动外部 IdP 重评窗口，但**端点为标准 OIDC 子集，切换时子平台仅改 issuer、零代码**
- **6.3 安全**
  - 6.3.1 三红线不变：密码仅主平台 / `sub` 唯一锚点 / 余额实时查询
  - 6.3.2 禁止父域 Cookie 扩散（host-only 保持）
  - 6.3.3 凭据仅 env 注入，**永不入日志/文件名/文档**
  - 6.3.4 refresh 重放 → 整链撤销 + `auth-security` 告警（已具备）

### L7 治理与文档层（铁律合规）

- **7.1** 单一事实来源：实体文档仅在根 `docs/`，`apps/*/docs/` 仅 `index.json` 映射
- **7.2** 双向锚点：《API接口文档》↔《API架构设计方案》每节末互引；术语首次出现链接 `术语表.md#`
- **7.3** 版本锚定：所有改动文首 `> 版本: vX.Y | 更新: YYYY-MM-DD | 变更: <简述>`
- **7.4** 历史只读：`.example/history/` 不改不删
- **7.5** 文档即结构：新增编排层须同步《目录结构文档.md》与《文档索引.md》

### L8 验证层（可执行验收矩阵）

- **8.1 身份**：五平台同 `sub`；主平台登出 → 全端会话销毁；无任何子平台密码框
- **8.2 资金**：任一子平台消费 → 主平台 `usage_logs` 可见；余额显示 ≤5s 同步；子平台零余额写权限（DB 反查）
- **8.3 溯源**：Thesis 引用 → 反查到 `sourceId`+`contentHash`+`capturedAt` 全链贯通
- **8.4 编排**：五平台并行在线（端口零冲突）；流水线端到端跑通；任一平台重启可续跑
- **8.5 门禁**：`tsc` 双 0 / vitest 全绿 / `check-docs-rule` exit=0 / `check-docs-facts` 全 PASS / e2e `--workers=1`
- **8.6 文档**：`check-oidc.mjs` client 数与白名单一致性；《子平台规范说明》§1/§5/§7 与实际文件一致

---

## 待你确认的事项（我尚未执行任何操作）

| # | 待裁决 | 我的推荐 | 影响 |
|---|---|---|---|
| D1 | **编排层归属** | C：AideanFleet 承载 | 决定 L4 全部形态 |
| D2 | 端口迁移排期（#78 三项） | 按 0.1.2/0.1.3 一次迁完 | 不迁则「全自动」不成立 |
| D3 | BotHot 独立 client 拆分 | 立即拆（F11 缺陷） | 影响 aud 隔离 |
| D4 | Thesis 本地账密去留 | 移除，改 SSO-only（红线 1） | 影响既有用户迁移 |
| D5 | 知识库归属（BotHot vs AideanWiki） | 采集/工作归 BotHot，百科归 Wiki | 影响 L3 数据不分裂 |
| D6 | 余额展示层 ≤5s 进程内缓存是否允许 | 允许（非持久化），资金操作零缓存 | 存在红线 3 解释风险 |
| D7 | 是否新建 ADR-0008（Fleet 兼任编排） | 需要（铁律 5 + 六步循环） | 合规前置 |
