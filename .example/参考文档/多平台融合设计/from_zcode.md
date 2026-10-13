

我先声明任务边界：本轮**只读代码与文档、不改任何文件**，产出一份融合主平台与子平台的完整设计方案大纲，等你确认后才进入实施。下面先做事实勘察（本地各子项目是否存在、技术栈、端口、认证与计费现状、Aidean 现有治理文档），再按 5W1H → 苏格拉底追问 → 钢人论证 → 重构的流程收敛出方案。






六个子项目在本地全部存在。继续摸清 Aidean 的文档基线与子平台规范。






主平台已有《子平台规范说明》《子平台SSO接入指南》《网关计费时序契约》等权威文档，这是方案的直接地基，我逐一读取。






























勘察与推演完成。以下是完整设计方案（本轮零文件改动）。

---

# Aidean 生态融合设计方案（v1.0 草案 · 仅方案，待你确认后实施）

## 〇、结论先行

对照你的五步链路（BotHot 搜集 → Wiki 存储 → Aidean 一键配模 → Thesis 写作 → Fleet 查证）与五条核心诉求，**生态的"身份、计费、溯源"三根钢筋已建成约八成，真正缺的是两根柱子**：

1. **知识存储层不存在**——主平台 52 个 Prisma model 里知识库/向量类为零（v2.0 重建时有意删除，定位"纯中转+计费"），AideanWiki 项目在 ADR-0003 中只有设想、无仓库。这是链路上唯一的真空段。
2. **"一键配置模型免配置"没有闭环**——网关 `/gateway/chat`（五态计费、幂等、Key 冷却、流式全齐）只被 Bot 系经 LangBot 间接消费；Thesis 直连 deepseek、Bot 问答直连硅基流动、Fleet 自带 8 路模型池，**三个子平台的 AI 消费都没走主平台钱包**。SSO 之后"登录免配置"已成立，"模型免配置"差一步授权通道。

其余是收口问题：Thesis 自建账密违反自家红线、Fleet 零接入、BotHot 无台账且端口双占、引用帧不透出来源 URL。全部可在不违反铁律 5（技术栈锁定）与 ADR-0003（自研 IdP）的前提下解决。

---

## 一、事实底座（全部读码实测，非文档转述）

| # | 事实 | 状态 | 证据 |
|---|---|---|---|
| F1 | 主平台 IdP 全套已建：OIDC 七端点 + PKCE/S256 + RS256/JWKS + refresh 轮换链 + 重放整链撤销 + back-channel logout | 已确认 | `apps/web/app/oauth/*`、`lib/features/oauth/*`、SSO 指南 v1.4 |
| F2 | 统一计费网关：OpenAI/Anthropic 双格式、`aid_ak_` API Key / cookie 双通道鉴权、hold→capture→void、requestId 幂等、五态 billingPath、Key 冷却 failover | 已确认 | `lib/features/gateway/service.ts`(1143 行)、《网关计费时序契约》v1.4 |
| F3 | 余额实时共享读路径已建：`GET /api/v1/internal/billing/wallet`（client 凭据 + wallet:read） | 已确认 | SSO 指南 §5.2、Bot 已用 |
| F4 | 52 models 中**无任何**文档/素材/向量/知识库 model；Document 等已在 v2.0 删除 | 已确认 | `apps/web/prisma/schema.prisma` 头注 + 全 model 清单 |
| F5 | SSO 接入现状：Bot 已接（唯一）；BotHot 代码级已实装（`providers/aidean/client.py` + 五端点 + backchannel，比规范文档记载超前）；Fleet 零接入；Thesis 自建账密（违反红线 1） | 已确认 | 三仓 grep 实测 |
| F6 | 除 Bot 系 LangBot Provider 外，**所有子平台 LLM 调用直连外部、不经网关、不落主平台钱包** | 已确认 | Bot `chat.py _llm_stream_delta`、Thesis `adapters.py`、Fleet `[model_pool]` |
| F7 | 溯源能力：Bot 最强（Source→ContentAsset.url+content_hash+version→raw_uri 链）；但 SSE 引用帧只透 `{title,spaceName,engine}`，**不透 URL** | 已确认 | `models/entities.py`、`api/v1/chat.py` |
| F8 | Fleet 有 append-only `events.jsonl`（9 字段冻结含 url）+ `evidence/<task>/attempt-N.log` 执行证据 | 已确认 | `fleet/core/events.py`、`executors/base.py` |
| F9 | Thesis 查重真源 PaperFree 仍被 BK-010/011（商务未签约）阻塞，现走 llm_simulated | 已确认 | `backlog.md` P0 open、`paperfree.py raise NotImplementedError` |
| F10 | 端口：目标态五段已登记（#78 待裁决）；新事实——**BotHot 实际用 3200/3300/5300/5433/6380**，3300 踩 AideanBot 区间下界，5300/5433/6380 与 AideanBot 全量双占（二者不可并行） | 已确认 | `AideanBotHot/docker/compose.yml` |
| F11 | Thesis 技术栈漂移：ADR-009(accepted)=TS 全栈，实测代码=Python FastAPI+Next.js，且已按此前进（09-28 查重 LLM 化、端口迁 3400-3500） | 部分确认（代码为可运行事实，ADR 未 supersede） | 《子平台规范说明》§4.3 + 本轮 git log |
| F12 | BotHot 非骨架：92 个 .py、六渠道推送实装、49+18 测试、CI 09-29 清零；热点聚簇/评分/日报仅有壳（自述待 v0.5） | 已确认 | 勘察报告 A |
| F13 | 子平台间治理现状："互不调用 API"是现行规范而非物理不可能；子平台 client 注册靠 seed + env，无 admin 界面 | 已确认 | 规范说明 §一/§七 |

---

## 二、第一轮：5W1H 发散拆解

**What**——目标：五段链路全自动贯通 + 一键登录免配置 + 数据可溯源不丢失 + 余额套餐通用 + 高性能高拓展。现状：登录与计费骨架已通（F1-F3），模型消费与知识层未通（F4/F6），溯源链断在"引用透出"与"跨平台 trace"两处（F7/F8）。

**Why**——单平台价值互不放大：BotHot 的素材流不进论文，Thesis 的查证要用户手工重复搜，Fleet 的查证结果无计费无归属，用户在每个平台各配一遍模型 Key。融合的深层动机是**把"账号-钱包-溯源"做成生态总线，让每个子平台只造自己那一段**。

**Where/When**——改造落点：主平台（网关鉴权面 + OIDC seed + 引用契约 + admin 注册台）、BotHot（引用帧透 URL、推送溯源头、台账入库）、Thesis（SSO 迁移 + 网关切换 + 引用挂 asset）、Fleet（SSO + 网关模型池 + 查证 agent 契约）、Wiki（新建）。顺序硬约束：身份统一(P1)→网关统一(P2)→知识层(P3)→溯源贯通(P4)→场景管线(P5)；验证只能在被依赖平台完成后跑。主平台必须常驻 3000（Bot/BotHot 联调依赖）。

**Who**——你=管理者（裁决 #78 端口、Wiki 立项、ADR 审批）；主平台团队=网关/IdP/契约的守门人；各子平台团队=接入方；AideanCompany 按现行规范**不入生态**（与 Fleet 同源，规范说明 §8.5 明令不得收录）。

**How**——见第六节大纲。核心机制三个：①用户委托令牌过网关（免配置模型）；②content-addressed 资产 + 统一 trace_id（溯源）；③client 注册即一行 seed（拓展性）。

**What if**——Wiki 若暂不立项：BotHot KB 直接升格为共享知识读层（D3-B 备选，大纲已含降级路径）；PaperFree 商务不落地：查证仍 LLM 模拟 + 真源检索，计费与溯源不受影响（F9 不阻塞主链）；若你否决主平台网关加委托鉴权：退化为"用户手工建 `aid_ak_` Key 逐平台粘贴"——体验降级但零协议变更；Token/凭据泄露：refresh 轮换链已内置整链撤销，新增面（scope 授予）沿用同一撤销语义。

---

## 三、第二轮：苏格拉底致命追问（对关键结论）

**结论①「一键配置模型 = 网关接受用户委托的 OAuth access_token」**
- 凭什么：子平台 SSO 后服务端已持用户 access/refresh（SSO 指南 §5）；网关已有 JWT 回落鉴权与 aud=clientId 隔离（F2）；主平台本是 IdP，本地 JWKS 验签零网络往返。
- 相反证据？：网关 guard 现行只认 `aid_ak_`/`x-api-key`/cookie——但这只是入口分支，不是架构限制；JWKS/aud/过期语义 `lib/features/oauth` 全部现成。
- 前提：gateway 需把「client 代用户消费」的计费归属写死 userId=sub、attributedClientId——否则 UsageLog 归因污染。已列入任务 2.1.4。
- 结论成立度：**可靠**（协议标准、改动面集中在 guard 一个函数 + scope 定义）。

**结论②「知识层应是独立子平台而非塞进主平台或复用 BotHot」**
- 凭什么：主平台 schema 头注即声明"纯中转+计费"的删除决策（F4）；BotHot KB 的 space/引擎是 RAG 机器人语义（空间↔LangBot 1:1），与"跨平台引用库"语义不同构；ADR-0003 L3 已为 Wiki 预置双账号模型。
- 最强反对：多一个服务=多一套部署与一致性成本，MVP 期"读 BotHot 的读 API"即可。→ **此反对部分成立**，故大纲采用"两步走"：P3 前期 BotHot KB 以版本化只读契约升格为知识源（零新仓），P3 后期视负载将 Hub 职责剥离为 AideanWiki。**这是本方案唯一的重大路线弹性点，等你裁决。**
- 若前提变（BotHot 停滞）：Wiki 直接 ingest 原始源，读契约不变，消费方无感。

**结论③「编排不进主平台」**
- 凭什么：铁律 5 + ADR-0003 把主平台钉死在身份/计费/模型中转；场景编排天然属于场景平台（论文=Thesis，资讯=BotHot 调度）。
- 反对：全自动"一键出论文"谁串链路？→ Thesis 作为 composition root 经用户委托令牌调用 BotHot/Wiki 读 API + 网关 + Fleet 查证 API，即已是全自动；主平台只多记一层 trace 归因，不碰业务。结论：**维持**。
- 遗留：现行"子平台互不调用 API"规范需 ADR 显式解禁为"仅允许经主平台用户委托鉴权的受控读/查证调用"（任务 0.3.2）。

**结论④「Thesis 迁移 SSO 可行」**
- 凭什么：SSO 指南 §9 已有存量绑定先例（RagFlow 三步）；ADR-0003 L3 双账号模型已批准。
- 风险：Thesis 是 Pages Router + 自建 JWT，删除本地密码前必须完成绑定率迁移——故大纲里"密码框移除"排在绑定表+灰显引导之后（1.4.3→1.4.5 依赖链），防锁死老用户。

---

## 四、分用户场景拆解（五类 → 需求 → 链路映射）

| # | 用户 | 核心场景 | 链路 | 关键依赖缺口 |
|---|---|---|---|---|
| U1 | 大学生/研究生 | 选题→文献搜集→引用写作→查重→AI 味检测 | BotHot(选题)→Wiki(文献库)→Thesis(写作/查重)→Fleet(引用核实) | Thesis SSO+网关(1.4/2.3)；引用→asset 挂接(4.2.3)；F9 不阻塞（LLM 查重已可用） |
| U2 | 科研人员 | 情报订阅→综述→查证实验数据→投稿质检 | BotHot 订阅→Wiki(公共库)→Thesis(审阅协作)→Fleet(反证检索) | 跨平台引用溯源(4.x)；Fleet SSO(1.3) |
| U3 | 金融研究员 | 公众号/热点→行业数据→分析日报 | BotHot(热点+日报)→网关(分析模型)→Fleet(数据交叉验证) | **BotHot 热点聚簇/日报仅壳**（F12）→列为 P5 显式任务而非 P1 |
| U4 | 行业分析员 | 多源监测→深度报告 | BotHot(多源)→Wiki(结构化沉淀)→Thesis(报告模板)→Fleet(数据核实) | 同 U3 + Thesis 引用管理(4.2.3) |
| U5 | 自媒体博主 | 素材→改写→多渠道分发 | BotHot(六渠道推送，已实装)→Wiki(素材库)→网关(改写) | 引用帧透 URL 以保二创合规(4.2.1)；BotHot 台账/端口收口(0.1/0.2) |

五类人共享的公共底座完全重合：**同一个账号、同一个钱包、同一条溯源链、一次登录全生态可用**——这正是把融合价值集中投到"网关委托鉴权 + 知识层 + trace 贯通"三件事上、而不是给每类用户做专属功能的依据。

---

## 五、终稿架构：八个设计决策（经钢人论证幸存）

- **D1 身份统一**：全生态以 `sub` 为唯一身份锚（已固化为 L1 铁律，零新设计），Fleet/Thesis/BotHot 补 OIDC client（seed 一行一平台）；Thesis 按 L3 双账号模型迁移，最终移除本地账密。
- **D2 一键配模**：网关第三鉴权通道 = 用户委托 access_token（RS256 本地验签，scope `gateway:chat`，attributedClientId 归因）。子平台获得 SSO 即获得全部模型能力，用户零粘贴 Key；用户仍可用 `aid_ak_` 直连作开发者路径。
- **D3 知识层两步走**：Phase-A（P3 前半）BotHot KB 以版本化只读契约（`/kb/v1`：search/fetch/asset，含 url/contentHash/version/raw_uri）升格为生态知识源；Phase-B（P3 后半）建 AideanWiki 独立仓（FastAPI+PG，读契约不变、写入方切换为 BotHot 推送同步），端口段建议 **3500-3600**（待裁决）。主平台永远不进业务数据（F4 边界不破）。
- **D4 溯源三锚**：①资产锚=content-hash 版本链（Bot 已有，补透出）；②执行锚=requestId/trace_id 全链贯穿（W3C traceparent 兼容，Bot 中间件已生成 requestId，只差经 `x-request-id` 透传进网关与跨平台头）；③资金锚=UsageLog.requestId + LedgerEntry 幂等键（已建）。引用帧强制含 `{url, assetId, contentHash}`。
- **D5 Fleet 查证角色**：模型池新增 `aidean` 路（网关 OpenAI 兼容 + 运维者 `aid_ak_`）；新增「查证任务」API 契约（输入 claim，输出 verdict+证据 url 列表+trace_id，落 events.jsonl append-only）；Thesis 经用户委托令牌调用之。Fleet 零外部依赖铁律不破（只加出站 httpx 调用）。
- **D6 计费拓展预留（二期）**：embedding/查重等非 chat 消费现无网关通道——预留 `/gateway/embeddings` 与 `billing:write` 评审通道两个决策点，本期只立 ADR 不做实现（防范围爆炸）。
- **D7 高性能手段**：JWKS 本地验签（已建）；网关路由链结果按 `(userId,tier)` Redis 缓存（读多写少）；KB 搜索走 PG 全文+游标分页，向量检索仍下放 LangBot/RAGFlow 引擎位（Bot 现有可插拔引擎架构，不上调 PG 存向量）；Fleet 事件 cursor 增量读已建；UsageLog 按月分区（schema 已规划）。**新增服务零个（Phase-A），主平台零新依赖。**
- **D8 拓展性契约**：新子平台接入=S 流程固化的"seed 一行 + 标准授权码流 + 委托令牌调网关"；KB 读契约版本化；trace 字段落 `usage_logs.metadata`(Json) 向前兼容；演进触发线（>5 产品再议成品 IAM）沿用 ADR-0003 L6。

---

## 六、可执行大纲（原子化 · 3~4 级 · 带依赖与验收）

> 约定：每任务标 `[仓库]`；六步循环（PLAN→SPEC→APPROVE→IMPLEMENT→VERIFY→CLOSE）逐一适用；文档变更按铁律 3 加版本锚。

**1. 阶段 P0 · 治理与台账收口（纯文档，先行）**
- 1.1 BotHot 台账入库 `[Aidean/docs]`
  - 1.1.1 《子平台规范说明》升 v2.0：范围从 3 平台扩至 5+BotHot（改 §8.5 范围纪律），新增 BotHot 全节（技术栈/端口/SSO 实装态，按 §8.4 只认实文件）——验收：v2.0 版本锚 + 端口矩阵含 BotHot 实占 3200/3300/5300/5433/6380
  - 1.1.2 #78 裁决材料：BotHot↔AideanBot 三端口双占 + 3300 越界，列迁移 vs 豁免两案 —— 验收：管理者签字记录，#78 🟡→✅
- 1.2 端口收口 `[BotHot]`：BotHot backend 3300→3201 或区间内其他空闲位（豁免裁决后）；BotHot PG/Redis/LangBot 错开 AideanBot 实例端口 —— 验收：与 AideanBot 全栈并行 `docker compose up` 双活无冲突
- 1.3 Thesis ADR-009 漂移裁决 `[AideanThesis]`：supersede 为 Python 实栈（代码即事实）—— 验收：ADR-009 status: superseded + 指向新 ADR-013
- 1.4 新 ADR 两篇 `[Aidean/docs]`
  - 1.4.1 ADR-0008 子平台互操作解禁：仅允许"用户委托令牌鉴权的受控读 API + 查证 API"两类跨平台调用 —— 验收：评审通过，更新 SSO 指南 §5.3 与规范说明 §七
  - 1.4.2 ADR-0009 知识层两步走路线（Phase-A→B 判据：QPS/空间数阈值）—— 验收：含回退路径
- 1.5 AideanWiki 立项书（P3-B 才建）：仓名/端口段 3500-3600/技术栈（建议 FastAPI+PG，与 Bot KB 同栈）/双账号模型按 ADR-0003 L3 —— 验收：管理者确认（**待确认项**）

**2. 阶段 P1 · 身份统一（一键登录免配置覆盖全生态）**
- 2.1 client 注册与 admin 台 `[Aidean]`
  - 2.1.1 `prisma/seed.ts` 增 4 client：`bothat` / `aidean-thesis` / `aidean-fleet` / `aidean-wiki`(预埋) ，secret 经 `OIDC_CLIENT_SECRET_*` env 注入 —— 验收：seed 幂等，redirect_uri 精确白名单含 localhost 与二级域两套（分开登记）
  - 2.1.2 admin/oidc-clients 最小管理页（列表/启用停用，不含 secret 明文）—— 验收：24→25 admin 域，门禁复跑全绿
- 2.2 Fleet 接 SSO `[Fleet]`：FastAPI 侧最小 RP（authorize→callback→本地会话→refresh 持久化，遵守 §10.1 重放语义）+ logoutUri 登记 —— 验收：e2e 全链 307→登录→code→会话；`/oauth/revoke` 仅断 Fleet 链
- 2.3 Thesis SSO 迁移 `[Thesis]`（依赖 2.1.1）
  - 2.3.1 新增 `/auth/aidean/*` RP + wiki_user↔sub 绑定表 + 同邮箱需验证旧密码一次方可合并（禁自动合并）—— 验收：绑定三步（指南 §9）用例过
  - 2.3.2 未绑用户"使用 Aidean 登录"入口 + 余额灰显引导；**保留本地账密过渡期**
  - 2.3.3 绑定率 ≥95% 后删除密码框与 ` DOCUMent`…（即红线 1 合规）—— 依赖 2.3.1，验收：全站 grep 无 password input
- 2.4 钱包实时读嵌入：Bot/BotHot/Fleet/Thesis 四端点统一渲染 `{balanceYuan,availableYuan,tier}`，**禁止本地持久化** —— 验收：四平台 UI 同源同值，断网降级提示不显示缓存值

**3. 阶段 P2 · 模型统一（一键配置模型免配置 + 余额套餐通用）**
- 3.1 网关委托鉴权 `[Aidean]`（本阶段核心）
  - 3.1.1 scope 字典增 `gateway:chat`（RP 可注册）—— 验收：《API接口文档》错误码/scope 表同步（铁律 2 锚点）
  - 3.1.2 `guard.ts` 第三分支：Bearer RS256 access_token 本地验签（iss/aud/exp/tokenVersion 联动撤销）→ userId=sub 计费，`metadata.attributedClientId=clientId` —— 验收：spec 覆盖过期/撤销/越 scope/重放四异常路径；五态 billingPath 与现有 spec 全绿
  - 3.1.3 限流与防护：委托令牌按 `rl:client:{clientId}:{userId}:min` 独立窗口 —— 验收：429(10006) 用例
- 3.2 子平台 LLM 调用切网关（可并行四仓）
  - 3.2.1 Bot `chat.py _llm_stream_delta` 换 base=网关 + Bearer 委托令牌，requestId 透传 `x-request-id` —— 验收：问答计费流水 quotaMinor>0、UPSTREAM/FREE_QUOTA 路径可解释、幂等重放零双扣
  - 3.2.2 Thesis AI 模块 `adapters.py` 同改 —— 验收：查重/写作消耗入主钱包账本
  - 3.2.3 Fleet `[model_pool]` 新增 `aidean` 路（base=网关，key=运维者 `aid_ak_`；level 排序与 429/402 切换语义沿用现有 [request] 段）—— 验收：model_pool 9 路，401/402 硬失败切换用例
  - 3.2.4 BotHot LangBot Provider 的 `AIDEAN_GATEWAY_URL` 文档化 + 委托令牌注入 —— 验收：LangBot 问答流水归因 botthat
- 3.3 前端告知义务扩展（FE01）：委托调用余额 0 预检 + 实扣文案 —— 验收：四平台复用主平台文案规约

**4. 阶段 P3 · 知识层（Phase-A：BotHot KB 升格为生态知识源）**
- 4.1 KB v1 只读契约 `[BotHot]`：`GET /kb/v1/search`（关键词+空间+游标分页）、`GET /kb/v1/asset/{id}`（含 url/author/published_at/content_hash/version/raw_uri/quality_score）—— 验收：契约文档（版本锚）+ OpenAPI 快照入库；鉴权=用户委托令牌（依赖 3.1）
- 4.2 引用溯源透出 `[BotHot]`：SSE citations 帧补 `{url, assetId, contentHash}`（现在只有 title/spaceName/engine）—— 验收：前端引用卡片可点回原源
- 4.3 Thesis 引用改造：`Reference.source` 字段允许挂 KB assetId，写作时引用即挂接 —— 验收：导出物含 source url+assetId 双溯源
- 4.4 多源供给扩展（服务 U3/U4/U5，原"热点壳"落位）`[BotHot]`：热点聚簇+评分+日报按既有数据模型补实现（原自述 v0.5 项）；发现渠道 dajiala/justoneapi/wellbyte/tikhub 已实装，redfox 仅清单端点的事实维持—— 验收：日报生成 e2e + 每日调度心跳探针
- 4.5 Phase-B 触发评估 `[Aidean/docs]`：负载达阈值才建 AideanWiki；建时数据迁移用 content-addressed 校验（hash 等值即迁）—— 状态：触发制，暂不执行

**5. 阶段 P4 · 溯源贯通（所有数据可溯源不丢失）**
- 5.1 trace_id 规范 `[Aidean/docs]`：`traceparent` 兼容格式；各平台入口中间件生成/沿用（Bot 已有 requestId 机制，升格为全链规范）；经 `traceparent` + `x-request-id` 双头传递 —— 验收：一次"提问→网关→上游"流水中 UsageLog.requestId 与两端日志可按同一 trace 关联
- 5.2 Fleet 查证 API 契约（D5 落地）：`POST /verify`（claim→verdict/evidence[]/trace_id），证据落 `events.jsonl`+`evidence/`（append-only 不破）—— 验收：Thesis 调用→Fleet 出证→主平台见流水 三点一线
- 5.3 不丢失三保险：各库 pg_dump 日备 + BotHot/Fleet 事件 append-only + 资产 `raw_uri` 强制落地策略（url 透传改为落本地卷，对象存储列二期）—— 验收：恢复演练一次
- 5.4 审计闭环：委托调用与 KB 读操作补写 AuditLog（现有表直接复用）—— 验收：admin/audit-logs 可查 actorId+requestId

**6. 阶段 P5 · 场景管线（五类用户验收剧本）**
- 6.1 剧本化验收 `[各仓 e2e]`：U1（Bot 搜题→Wiki 存储→Thesis 写作→Fleet 查证→查重/report）、U3/U4（订阅→日报→网关分析）、U5（素材→改写→六渠道推送）—— 每剧本断言：一次登录、钱包扣减可见、引用可点回原源
- 6.2 二级域部署骨架 `[deploy]`：`<product>.aidean.com` 每平台一 server 块 + 通配符证书 + redirect/logout 白名单登记（SSO 指南 §2.1）—— 验收：生产白名单与 localhost 条目分离

**7. 阶段 P6 · 性能与门禁**
- 7.1 `[Aidean]` 路由链 `(userId,tier)` Redis 缓存（TTL+失效策略）；委托验签零网络往返断言 —— 验收：网关 P95 对比压测报告
- 7.2 `[BotHot]` KB search PG 全文索引 + 游标分页压测（10⁵ 资产级）
- 7.3 门禁固化：check-docs 双真源检查覆盖新契约文档；CI 全仓复跑基线（rule exit=0 / facts 13/13 口径延续）

---

## 七、前提、局限与待确认

**前提**：Aidean 常驻 3000；主平台技术栈锁定不引入新运行时；AideanCompany 不入生态（现行规范）。
**局限**：微信扫码登录通道 G0 已关闭（行政门槛），"一键登录"在现阶段=邮箱验证码通道为主；查重真商用源仍受 BK-010/011 商务阻塞，方案对此不依赖。
**待你裁决（执行前必须落定）**：①知识层 D3 两步走 vs 直接新建 AideanWiki（含端口段 3500-3600 确认）；②#78：BotHot 端口迁移 vs 豁免；③ADR-009 Thesis 按 Python 实栈 supersede；④委托鉴权（D2）与互操作解禁（D4）两篇新 ADR 是否批准；⑤大纲粒度与阶段划分是否接受。
**主要风险**：Thesis 存量账密用户迁移（已用过渡期+绑定门槛缓解）；网关 guard 改动是全生态资金入口（缓解：spec 覆盖四异常路径 + 并行影子计费对照一周再切默认）；BotHot 功能面比文档新导致的后续口径漂移（缓解：P0 先立台账）。

---

以上方案未写入任何文件。**请确认或调整：知识层路线（D3/待确认①）、两篇新 ADR 方向（D2/D4）、以及 P0 是否先行开工**。你确认后我按大纲顺序进入 P0→P1。