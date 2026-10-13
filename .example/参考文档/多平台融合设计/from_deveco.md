勘察完毕，证据充分。以下是完整设计输出。
声明：本任务全程只读（6 仓库目录 + 12 份关键文档），未新建/编辑任何文件，未执行任何 git 操作，未回显任何凭据值。
Aidean 生态融合设计方案（PLAN 草案 v1.0）
A. 现状证据盘点（全部来自真实仓库，非推测）
仓库	定位（证据来源）	技术栈	端口现状	生态关键事实
Aidean	AI 天梯图评测平台 + 余额制付费（README）	Next.js 15 + Prisma + PG16 + Redis，turbo/pnpm	3000	【已确认】已有《子平台规范说明》v1.5（生态台账唯一权威，§5.0 五段百端口目标态+漂移对照）、《子平台SSO接入指南》v1.4（授权码流，ADR-0002/0005）、《网关计费时序契约》v1.4、ADR-0001~0007、auth/billing/gateway 三个 spec、52 数据模型含 provider_model_offerings、支付渠道指南、子平台展示页 spec
BotHot	AideanBot 升级版：采集+推送+热点+KB（README/架构文档）	FastAPI + Next.js 14 + PG16 + Redis7	前端 3200、后端 3300	【已确认】已锚定主平台 SSO：users.sub，余额/等级不落地、实时查主平台（AGENTS.md 关键约束）；架构图已画“主平台(OIDC):3000”；Job 队列在 PG；LLM 直连 SiliconFlow；热点聚簇逻辑【部分确认】自述待实现
AideanBot	信息源→知识库→机器人闭环	Python 后端 + 前端	前端 3333、后端 8000（越段）、LangBot 5300、PG 5433、Redis 6380	【已确认】端口准则：3000 主平台专用；BotHot 为其独立副本，互不影响
AideanFleet	多 Agent 执行控制平面（TaskPack/DAG/Machine Gate/Evidence）	Python + SQLite + events.jsonl + FastAPI 控制台	控制台 5000（越段，目标段 3100-3200）	【已确认】零外部依赖铁律（ADR-026 禁 Redis/MySQL）；10 状态机 FROZEN 契约；Roadmap Phase 4 才扩 Research Domain
AideanThesis	论文检测/质控为主、创作为 Max 权益	FastAPI + Next.js 15 + PG16 + Redis/Celery	3400/3401/3402/3403（已固化段内自备）	【已确认】packages/contracts TS↔Pydantic 双语契约先例；红线：AI 标识、原文版本保留、禁“单一来源伪装多源验证”
AideanCompany	AideanAgentFleet（Hermes A2A 舰队：console 5000 / Manager 9900 / 员工 9901-9911）	Python	不在五段内	【部分确认】与 AideanFleet 同主题双谱系，关系未裁定
已实证的冲突/漂移清单（方案必须解决）：
1. 端口边界值双重归属：3100/3200/3300/3400/3500 均同时出现在相邻两段中（含 AideanThesis AGENTS.md 将 3300–3400 划给 AideanBot，而 BotHot 后端实际占用 3300）。
2. AideanBot 后端 8000、AideanFleet 控制台 5000 越出各自段。
3. LangBot 5300 / PG 5433 / Redis 6380 为 AideanBot-BotHot 共享遗留实例（Thesis 已示范“段内自备”模式）。
4. AideanWiki 无仓库、无端口段；AideanCompany 定位未定。
5. 本地目录名 AideanBotHot ≠ 仓库名 BotHot，命名未登记。
B. 深度分析
B.1 5W1H（发散）
维度	结论
What	事实：1 主平台 + 4 子平台 + 1 新 BotHot，身份/计费已有雏形且方向正确（BotHot 已实际锚定 OIDC + 余额实时查询），但知识库三处孤岛（BotHot KB / Thesis 文献库 / 无生态级 Wiki）、模型密钥分散（BotHot 直连 SiliconFlow）、跨平台流水线不存在。用户要的是：融合方案 + ≥3 级可执行大纲。
Why	直接原因：五步流水线（采集→存储→配模型→生产→查证）跨 5 个仓库，无统一管道。根因：缺少生态级契约层与枢纽能力外露（SSO/计费/网关在 Aidean 有 spec 但未推广到全生态）。若做点对点集成 → n² 复杂度，必败。
Where/When	边界：Windows 宿主机本地开发态、端口强约束；Fleet FROZEN 契约 + 零依赖铁律限制其改造深度；BotHot 热点逻辑未落地是 8.x 前置。时序：P0 基座必须先于 P1 数据流；Wiki 裁定先于 7.x。范围外：AideanCompany 内部治理、模型训练、爬虫合规细节。
Who	管理者=用户（批准/裁决 DP1-DP5）；实施=各仓库代理（Aidean 侧承担枢纽改造）；验收=六步流程 VERIFY + 16.x E2E。
How	只读勘察（已完成）→ 本方案 → 用户确认 → SPEC 三件套（docs/specs/ecosystem-fusion/）→ 按仓库原子任务实施 → CI 门禁 + E2E 验收 → CLOSE 归档。
What if	Hub 宕机→离线校验+计量缓冲重放；Fleet 不可用→工件标“未查证”不阻断；Wiki 裁定复用 BotHot→7.x 降级为开放 API 任务；端口口径被否→按裁定重排 2.x；测试过但运行失败→16.x 真机 E2E 兜底。
B.2 关键决策双向钢人论证（收敛后幸存结论 D1-D10）
#	决策	最强支持证据	最强反对
D1	Hub-and-Spoke 拓扑：Aidean 为唯一身份/计费/网关锚点	BotHot 已实践“users.sub 锚定+余额实时查主平台”；SSO 指南 v1.4、计费契约 v1.4 已存在	Hub 单点故障；强耦合阻碍子平台独立演进
D2	自建 OIDC 授权码流，不引入 Keycloak 等外部 IdP	SSO 接入指南 v1.4 已定授权码流，BotHot 已按此实现	自建 IdP 实现缺陷风险
D3	主平台唯一账本 + 网关咽喉计量 + 预留-结算	网关计费时序契约 v1.4；BotHot“从不持久化余额"约束	上报链路故障→漏计/重计
D4	新建 AideanWiki 统一知识底座（两阶段：先复用 BotHot KB 过渡）	知识三孤岛实证；用户流程第 2 步需生态级存储；外部 KB 数据主权弱	新增平台成本；LangBot RAG 已可用
D5	事件契约与传输解耦：信封+签名规范，传输允许 HTTP Webhook 或总线适配	Fleet 禁 Redis（ADR-026）、BotHot 队列在 PG → 基础设施异构，强推共享总线必败	Webhook 可靠性低于总线
D6	端口半开区间 [start, start+100)，边界归下一段；新项目段内自备 DB（Thesis 模式）	冲突实证 5 条；Thesis 已固化此模式	存量迁移有回归成本
D7	Fleet = 查证执行平面（复用 TaskPack/DAG/Machine Gate/Evidence，不动其内核）	用户定位"辅助查证”；Evidence/Machine Gate 天然产出查证报告；Thesis 红线"禁单一来源伪装多源"恰需多源交叉	Fleet MVP 面向 Coding Domain，Research 是其 Phase 4
D8	模型全量走 Aidean 网关 + Model Profile 一键下发	Aidean 已有 provider_model_offerings 数据 + gateway spec；现状 BotHot 直连 = 密钥分散、无法统一计量	网关单点 + 附加延迟
D9	生态编排器只做跨平台 DAG 协调，不替代各平台内部调度	BotHot 已有 60s PushScheduler/订阅调度；Thesis 有 Celery；Aidean 有 scheduler sidecar	"又造一个工作流引擎"质疑
D10	契约 SSOT 在 Aidean docs/，实现包各仓库自带（TS + Pydantic 双形态）	Thesis contracts 双语先例；铁律 1 单一事实源	跨仓库发共享包的发布成本
B.3 What-if 边界推演（摘要）
前提变化	后果与对策
DP1 裁定"复用 BotHot KB"	大纲 7.x 整体替换为"BotHot 开放 KB API + 配额”，依赖关系不变
DP2 裁定"维持现状不迁移"	2.1.x 各任务转为登记项，但 3300 双占冲突仍须二选一裁决
Hub 停机	子平台 JWKS 缓存宽限 24h；计量缓冲落库；新 pipeline 暂停，进行中任务完成后挂起
Fleet FROZEN 契约拒绝改动	9.1.3 改为“只读消费 events.jsonl + 新增旁路 API”，不改 10 状态机
BotHot 热点逻辑延期	12.4/12.6 两条 pipeline 降级为“人工触发版”，其余用户包不受影响
C. 用户 × 场景需求逐一拆解与汇总
C.1 五类用户拆解
用户	高频场景链	特有诉求（区别项加粗）
大学生/研究生	选题调研→文献综述→初稿→引用核验→格式化导出	低价学生套餐；GB/T 7714 模板；防假引用（引用必挂真实来源）；导师多轮审阅
科研人员	每日文献监控→实验分析→论文撰写→LaTeX 导出	持续监控（arXiv/RSS）；批量处理；可复现溯源；团队协作
金融研究员	晨间热点→快评→深度研报→合规留痕	时效 SLA；多源交叉验证（单源不算已验证）；审计级留痕；结构化报告模板
行业分析员	竞对/政策监控→行业图谱→白皮书→多轮审阅	长文档分析；框架模板（PEST/SWOT）；周期监测看板；导出质量（docx/PPT）
自媒体博主	热点雷达→选题→脚本→发布前查证→多平台适配	速度；热点评分；风格模板（小红书/公众号体）；单件低成本；防翻车
C.2 汇总 → 生态能力矩阵（→ 大纲映射）
能力	内容
C1 统一身份	一键登录、JIT 建户、单点登出、RBAC
C2 统一计费	余额/套餐通用、预留-结算、配额、对账
C3 统一网关	一键模型方案、回退、缓存、SSE
C4 采集雷达	BotHot 源适配器插件、热点聚簇、AideanBot 通道
C5 统一知识底座	摄取/混合检索/快照溯源
C6 生产交付	Thesis 写作/模板/导出/审阅
C7 查证证据链	Fleet Research 域、多源一致性、快照回链
C8 自动化编排	跨平台 DAG、预算门、审批门
C9 场景产品包	五类用户 pipeline 预设 + 通知闭环
C10 可观测审计	trace 全链路、四金指标、追加式审计
C11 性能扩展	插件接口冻结、新平台接入清单
C12 安全不丢数据	凭据治理、反注入、备份演练
用户五步流程 → 机制映射：① 搜集信息 → C4（§8）；② 存储信息 → C5（§7）；③ 一键配置模型 → C3（§6）；④ 写论文/分析 → C6（§10）；⑤ 辅助查证 → C7（§9）。五大核心诉求映射：全自动→C8+预算/审批门；一键登录免配置→C1+C3；溯源不丢失→C5 快照+C10 溯源链+C12 备份；余额套餐通用→C2；高性能高拓展→C11+C14。
D. 总体融合架构
D.1 拓扑（Hub-and-Spoke + 事件契约主干）
                    ┌──────────────────────────────────────┐
                    │        Aidean 主平台  :3000           │
                    │  IdP(SSO授权码流) · 计费账本+预留结算    │
                    │  模型网关(OpenAI兼容+Model Profile)    │
                    │  生态编排器(DAG+预算门+审批门)          │
                    │  事件网关(HMAC Webhook) · 审计中心      │
                    └────┬──────────┬──────────┬───────────┘
        授权码流+JWKS缓存 │ 计量/预留 │ 网关调用  │ 事件(信封+签名)
   ┌────────────┬────────┴───┬──────┴──────┬───┴─────────┬────────────┐
   ▼            ▼            ▼             ▼             ▼            ▼
 BotHot      AideanBot   AideanThesis   AideanFleet   AideanWiki   AideanCompany
 :3200/:3210  :3333/:3310  :3400-3403     :3100        :3500-3503   (谱系待裁定)
 采集雷达+     对话/通知     生产/交付      查证执行平面   知识底座      Hermes A2A
 六渠道推送    通道          模板/导出      Evidence+Gate 快照+混合检索  (候选Worker)
D.2 数据流样例（金融晨报，全自动）
1. cron 07:00 → Aidean 编排器启动 pipeline（预算预留 200 积分）；
2. BotHot：金融源适配器采集（trace_id 注入）→ article.collected 事件；
3. Wiki：摄取去重入库，原始页面快照（sha256 内容寻址，不可变）；
4. BotHot：热点聚簇评分 → Top N 主题；
5. Thesis：调网关（用户 Model Profile 自动生效）生成快评草稿，引用全部挂 Wiki source_id；
6. Fleet：草稿 claims → 查证 TaskPack（多源检索+快照取证+Machine Gate）→ 查证报告回挂；
7. 编排器：结算实际消耗（refund 剩余预留）；
8. BotHot：终稿+查证报告+溯源链经飞书/企微推送；
9. 审计中心：全链路 trace 落档，对账作业零差异。
D.3 降级矩阵
故障	行为
Aidean Hub 停机	子平台 JWKS 缓存宽限、计量本地缓冲重放、新 pipeline 暂停
事件链路故障	outbox 暂存重投，死信表告警
上游模型故障	网关回退链（provider_model_offerings 路由）
Fleet 不可用	工件标“未查证”状态，不阻断交付
Wiki 不可用	摄取方缓冲，检索降级为各平台本地 KB
E. 可执行大纲（≥3 级、原子化、带序号；P0→P1→P2→P3 分四阶段）
依赖关系：§4/§5/§6 依赖 §1-§3；§7-§10 依赖 §3-§6；§11-§12 依赖 §7-§10；§13-§16 贯穿收尾。每条叶子任务 = 一个可验收交付物。执行前须按六步流程落 SPEC 三件套（1.1.1）。
P0 基座层
1. 生态治理与规格基线【Aidean】
- 1.1 SPEC 立项
- 1.1.1 从 docs/specs/_template/ 创建 ecosystem-fusion/ 三件套（问题/方案/任务），文首版本标记 v1.0
- 1.1.2 将本方案 C.2 能力矩阵与 E 大纲落为 SPEC 任务基线，逐项标注依赖与验收标准
- 1.2 权威文档同步（铁律 1/2/3）
- 1.2.1 更新《子平台规范说明》→ 登记 BotHot 现状、AideanWiki 目标态、端口目标表（§5.0 漂移对照刷新）
- 1.2.2 更新《术语表》→ 新增词条：AideanWiki、模型方案(Model Profile)、预留-结算、溯源链、事件信封
- 1.2.3 《API接口文档》新增生态域端点清单（SSO/计费/网关/Wiki/事件），与《API架构设计方案》锚点互引
- 1.3 ADR 决策记录
- 1.3.1 ADR-0008 生态拓扑：Hub-and-Spoke + 离线降级（D1）
- 1.3.2 ADR-0009 事件契约：信封+签名+双传输适配（D5）
- 1.3.3 ADR-0010 知识底座形态与迁移路径（D4，依 DP1 裁定）
- 1.3.4 ADR-0011 端口半开区间口径与迁移窗口（D6，依 DP2 裁定）
- 1.4 治理门禁
- 1.4.1 新增 CI 校验脚本：各仓库 AGENTS.md 端口段 ↔《子平台规范说明》对账，不一致即失败
2. 端口与命名规范治理【全生态】
- 2.1 端口目标态落地（依 DP2 口径）
- 2.1.1 AideanFleet 控制台 5000→3100（Makefile/启动脚本/README/AGENTS.md/契约文档同步），回归 make test
- 2.1.2 AideanBot 后端 8000→3310（docker 映射/启动脚本/CORS 同步），前端维持 3333
- 2.1.3 BotHot 后端 3300→3210（compose/uvicorn 默认/前端 API 基座/AGENTS.md 同步），消除 3300 双占
- 2.1.4 遗留共享实例（LangBot 5300 / PG 5433 / Redis 6380）登记为遗留例外并挂迁移窗口
- 2.2 命名规范
- 2.2.1 统一服务名登记表（BotHot=BotHot、本地目录别名 AideanBotHot）写入《子平台规范说明》
- 2.2.2 统一环境变量命名（AIDEAN_HUB_URL / AIDEAN_CLIENT_ID / AIDEAN_SERVICE_TOKEN）写入《子平台SSO接入指南》
- 2.3 端口门禁
- 2.3.1 各仓库新增 scripts/check-ports：扫描 compose/env/代码监听端口，越段即 CI 失败
3. 生态契约与客户端 SDK【Aidean 主，各仓库消费】
- 3.1 契约定义
- 3.1.1 事件信封 schema v1（id/type/source/subject/time/trace_id/spec_version/data），CloudEvents 子集
- 3.1.2 生态事件类型注册表 v1（article.collected / kb.ingested / artifact.drafted / verify.reported / billing.reserved…）
- 3.1.3 跨平台 REST 契约 OpenAPI 3.1 快照：网关/计费/Wiki/查证四组端点
- 3.2 双语契约包
- 3.2.1 推广 Thesis packages/contracts 模式至各仓库：TS types + Pydantic 双形态
- 3.2.2 各仓库 CI 增加"契约漂移检查”：本地契约与 Aidean OpenAPI 快照 diff，越界失败
- 3.3 传播规范
- 3.3.1 统一 trace_id 规范（HTTP 头 Aidean-Trace-Id + 事件字段透传）写入《子平台规范说明》
4. 统一身份 SSO【Aidean 主，四子平台接入】
- 4.1 IdP 侧补齐（Aidean）
- 4.1.1 核对 implement-auth-module/《登录方案》v1.3 实际完成度，输出缺口清单（JWKS/PKCE/静默授权/登出联动）
- 4.1.2 补齐 /.well-known/jwks.json + RS256 签发（如缺口）
- 4.1.3 实现第一方客户端静默授权（已登录会话直接回码），redirect_uri 白名单
- 4.1.4 实现跨平台单点登出（token revocation 事件广播）
- 4.2 子平台接入
- 4.2.1 BotHot：现网 OIDC 流对齐 JWKS 缓存离线校验 + trace 透传（现状已锚 users.sub）
- 4.2.2 AideanThesis：本地 JWT 切换为 OIDC 联合登录（保留本地密码兜底），auth store 改造
- 4.2.3 AideanFleet：控制台接入 OIDC（纯 HTTP+JWKS，零依赖铁律不破）
- 4.2.4 AideanBot：与 BotHot 同源对齐改造
- 4.3 一键登录体验
- 4.3.1 Aidean 子平台展示页（已有 showcase/intro 基础）增加“一键进入”：携带 client_id 发起授权码流
- 4.3.2 子平台回跳 JIT 建户（users.sub 锚定，不落地余额/等级）
- 4.4 机器身份
- 4.4.1 Aidean 签发平台级服务令牌（aud+scopes），用于编排器↔子平台、子平台↔网关的机器调用
5. 统一计费与配额【Aidean 主，各子平台消费】
- 5.1 账本与套餐
- 5.1.1 核对 implement-billing-module/《网关计费时序契约》v1.4 完成度，输出生态侧缺口清单
- 5.1.2 落地预留-结算两阶段 API（reserve→settle/refund），幂等键=ULID
- 5.1.3 套餐权益按平台域分组（wiki/thesis/fleet/bothot 配额），Aidean 后台可配置
- 5.2 计量接入
- 5.2.1 网关咽喉计量：模型调用在网关统一扣费，子平台不持 provider 密钥
- 5.2.2 平台侧计量：非 LLM 资源（Fleet 查证页数、BotHot 监控词数、Thesis 查重次数）走 HMAC 签名 usage 事件
- 5.2.3 各子平台实现计量本地缓冲（hub 不可用时落库暂存，恢复重放）
- 5.3 对账与稽核
- 5.3.1 每日对账作业：网关计量 vs 平台上报 vs 账本流水三方核对，差异告警
- 5.3.2 余额/套餐只读查询接口推广至 Thesis/Fleet/Wiki（复用 BotHot 实时查询模式）
6. 统一模型网关【Aidean 主，各子平台切换】
- 6.1 网关能力
- 6.1.1 核对 implement-gateway-module 完成度，补齐 OpenAI 兼容端点（chat/completions、embeddings）SSE 透传
- 6.1.2 模型回退链与多 provider 路由（基于 provider_model_offerings 数据）
- 6.1.3 提示精确缓存 + embedding 缓存（Redis）
- 6.2 模型方案（“一键配置模型”）
- 6.2.1 Model Profile 实体：用户级默认模型组合（写作/分析/嵌入三槽位）
- 6.2.2 网关按调用者身份自动解析 Profile（子平台零配置）
- 6.2.3 Aidean 前端“模型方案”设置页（一键切换全局生效）
- 6.3 子平台切换
- 6.3.1 BotHot：SiliconFlow 直连 → 网关（保留直连开关作降级路径）
- 6.3.2 AideanThesis：AI 模块 AI_MODE 适配器新增 AideanGateway 并设默认
- 6.3.3 AideanFleet：Worker 模型调用经网关（纯 HTTP + 短期服务令牌）
- 6.3.4 AideanBot / AideanWiki：同模式接入
P1 数据流层
7. AideanWiki 统一知识底座【依 DP1；推荐形态=新仓库】
- 7.1 服务骨架
- 7.1.1 新建 github.com/aideanew/AideanWiki，段 [3500,3600)：3500 API/Web、3501 PG、3502 对象存储
- 7.1.2 数据模型：sources/snapshots/documents/chunks/collections/citations/provenance
- 7.1.3 快照内容寻址（sha256）入对象存储，不可变、被引用不回收
- 7.2 摄取与检索 API
- 7.2.1 POST /kb/v1/ingest（source_url/collector/content_hash，幂等去重）
- 7.2.2 混合检索：PG 全文 + pgvector 双路召回 + 融合排序
- 7.2.3 溯源 API：GET /kb/v1/sources/{id}/snapshots（查证与引用回链专用）
- 7.3 生态接入
- 7.3.1 BotHot：入库流水线增加“双写 Wiki"（LangBot 空间保留为 BotHot 私有 RAG）
- 7.3.2 AideanThesis：文献库对接 Wiki（DOI/arXiv 拉取入 Wiki；引用插入挂 source_id）
- 7.3.3 Wiki 入库事件广播（事件信封）
- 7.4 过渡方案（若 DP1 选“先复用 BotHot"）
- 7.4.1 BotHot 开放 KB 只读 + 摄取 API（带配额），Thesis/Fleet 先行试用
8. 采集层贯通【BotHot + AideanBot】
- 8.1 BotHot 雷达增强
- 8.1.1 落地热点聚簇/热度评分/日报逻辑（v0.3 登记的待实现项，P1 前置）
- 8.1.2 SourceProvider 插件接口（discover/fetch，成本与频控参数化）
- 8.1.3 新增场景源适配器：RSS/公告/arXiv（依 C.1 需求排期）
- 8.2 AideanBot 通道职责
- 8.2.1 边界条款写入两仓库 AGENTS.md：AideanBot=对话/通知通道，BotHot=采集雷达+推送，禁止重复建设
- 8.2.2 AideanBot 对话接网关（模型能力与主平台一致）
- 8.2.3 推送统一走 BotHot 六渠道 PushProvider（AideanBot 渠道并入，避免双栈）
- 8.3 采集→知识闭环
- 8.3.1 采集完成 → article.collected 事件 → Wiki 摄取（7.3.1 双写）
- 8.3.2 采集合规基类：robots/频控/成本上限；内容标记 untrusted（供 15.4.1 反注入）
9. 查证层贯通【AideanFleet，不动 core 内核与 FROZEN 契约】
- 9.1 域适配
- 9.1.1 executors/ 新增 research worker 适配器（检索+快照取证+引文核对）
- 9.1.2 查证 TaskPack 模板：claim 抽取→证据检索→交叉比对→报告生成（四步 DAG）
- 9.1.3 控制台新增 /verify/claims 端点（claims[] → task_id，状态机复用）
- 9.2 查证语义
- 9.2.1 证据快照强制存 Wiki，报告引用必须可点验
- 9.2.2 多源一致性规则：单一来源不得标记“已验证”（对齐 Thesis 红线）
- 9.2.3 查证报告 schema 入契约包（claim/evidence[]/verdict/confidence）
- 9.3 预算与计量
- 9.3.1 查证任务绑定计费预留（页数/token/时长上限，超限 ESCALATED 不续扣）
- 9.4 Hermes 谱系对接【依 DP3】
- 9.4.1 （若采纳）AideanCompany Hermes 网关作为 Fleet Worker Adapter 试点（A2A→TaskPack 翻译层）
10. 生产层贯通【AideanThesis】
- 10.1 模型与知识接入
- 10.1.1 AI 辅助默认走网关 + 用户 Model Profile（继承 6.3.2）
- 10.1.2 引用插入强制挂 Wiki source_id（无 source 不入引用列表）
- 10.1.3 文献监控：订阅 BotHot 关键词/arXiv 源，每日速递入 Thesis 通知
- 10.2 查证联动
- 10.2.1 章节“一键查证”：claims → Fleet /verify/claims → 报告回挂文档版本
- 10.2.2 查重（PaperFree）与 Fleet 引文核对并排展示（遵守 AGENTS.md §4.8 合规红线）
- 10.3 交付增强
- 10.3.1 导出链：docx/LaTeX 模板引擎（学校模板 + GB/T 7714 样式）
- 10.3.2 AI 生成标识 + 原文版本保留机制回归核验
- 10.3.3 导师-学生审阅流与 BotHot 通知打通
P2 自动化层
11. 事件与编排引擎【Aidean 新增 orchestration 域】
- 11.1 事件主干
- 11.1.1 Event Gateway：Webhook 注册/发布（HMAC 校验）+ 重试 + 死信表
- 11.1.2 各平台事件出口 outbox（DB 事务内落表→投递→确认；Fleet 用 events.jsonl 旁路导出适配）
- 11.2 流水线引擎
- 11.2.1 pipeline 定义 schema（DAG JSON：trigger/steps/budget/approval_gate）
- 11.2.2 触发器四类：cron / 事件 / 手动 / Webhook
- 11.2.3 步骤执行器：HTTP 调用子平台 API + 结果断言 + 断点续跑（步骤幂等键）
- 11.2.4 预算门：pipeline 级预留（调 5.1.2），失败自动 refund
- 11.2.5 人工审批门：暂停→BotHot 渠道通知→放行
- 11.3 运行时视图
- 11.3.1 Aidean 前端 pipeline run 页（状态/耗时/费用/溯源链）
12. 场景流水线与通知闭环【五类用户包】
- 12.1 通用底座
- 12.1.1 场景模板注册表：student / researcher / finance / analyst / creator 五套预置 pipeline + 使用文档
- 12.2 学生/研究生包
- 12.2.1 pipeline「论文助手」：选题调研（BotHot+Wiki）→文献综述（Thesis+引用）→初稿→查证（Fleet）→格式化导出
- 12.3 科研人员包
- 12.3.1 pipeline「每日文献速递」：arXiv/RSS 采集→Wiki 入库→摘要（网关）→BotHot 推送
- 12.3.2 pipeline「论文工作台」：长文分析→分章撰写→引用核验→LaTeX 导出
- 12.4 金融研究员包
- 12.4.1 pipeline「晨报自动化」：事件触发 07:00 热点采集→聚簇评分→快评→Fleet 多源核验→推送+审计留痕
- 12.5 行业分析员包
- 12.5.1 pipeline「行业雷达」：竞对/政策监控→Wiki 沉淀→白皮书草稿→人工审阅门→终稿
- 12.6 自媒体包
- 12.6.1 pipeline「热点创作」：热点雷达→选题评分→脚本→发布前查证（防翻车门）→多平台风格适配导出
- 12.7 通知闭环
- 12.7.1 所有 pipeline 终态经 BotHot 六渠道推送（含审批链接+溯源报告链接）
P3 质量与运营层
13. 可观测性与审计
- 13.1 日志与追踪
- 13.1.1 各平台结构化日志统一字段（trace_id/user.sub/platform）
- 13.1.2 跨平台链路视图：按 trace_id 聚合全平台事件（Aidean 前端）
- 13.2 指标与告警
- 13.2.1 四金指标：网关 P95/错误率、事件投递成功率、pipeline 成功率、计费对账差异
- 13.2.2 告警接 BotHot Webhook 渠道
- 13.3 审计
- 13.3.1 追加式审计表（登录/授权/扣费/导出/查证）+ 每日哈希校验点
- 13.3.2 溯源链完整性作业：孤儿 artifact/snapshot 每日扫描
14. 性能与扩展性
- 14.1 性能
- 14.1.1 网关基准：SSE 透传零缓冲，P95 附加延迟 <100ms（结果入 evidence）
- 14.1.2 Wiki 检索基准：HNSW 参数调优 + 混合召回 A/B（recall/延迟）
- 14.1.3 采集并发上限+退避（对齐 429 处置惯例）
- 14.1.4 Thesis 长文分块批处理 + Celery 优先级队列（交互>批处理）
- 14.2 扩展
- 14.2.1 插件接口冻结：SourceProvider / Verifier / PushProvider / ModelProfile 入契约包
- 14.2.2 新子平台接入清单（端口段申请→SSO 注册→网关接入→事件注册→CI 门禁）写入《子平台SSO接入指南》
15. 安全与合规
- 15.1 凭据治理
- 15.1.1 全仓库密钥仅环境变量 + gitleaks CI 扫描
- 15.1.2 PAT 使用规程固化（见 §G），执行阶段用毕建议轮换
- 15.2 接口防护
- 15.2.1 网关与事件端点限流（用户/令牌维度令牌桶）
- 15.2.2 Webhook HMAC 签名 + 时间戳防重放
- 15.3 权限
- 15.3.1 RBAC 最小集：owner/admin/member/viewer + 平台 scopes（Aidean 签发、各平台本地映射）
- 15.4 内容安全
- 15.4.1 采集内容反提示注入：untrusted 数据化隔离（分隔标记+注入测试集）
- 15.4.2 导出物 AI 标识与版权提示（对齐 Thesis 红线）
- 15.5 数据不丢失
- 15.5.1 PG WAL 归档 + 每日全量备份 + 对象存储版本化；季度恢复演练（报告入 evidence）
16. 端到端验收与发布
- 16.1 E2E 场景验收（每类用户一条，全链路证据链）
- 16.1.1 学生：综述含可点引用→查证 pass→GB/T 7714 导出
- 16.1.2 科研：晨间速递 07:30 前送达 + 引用核验抽检
- 16.1.3 金融：晨报全自动产出 + 审计留痕完整 + 对账零差异
- 16.1.4 行业：白皮书过审批门 + 导出格式合格
- 16.1.5 自媒体：热点→脚本→查证→三平台风格稿，全程 <30min
- 16.2 治理验收
- 16.2.1 全仓库端口门禁 + 契约漂移检查 + 文档铁律 CI 三绿
- 16.2.2 SPEC 走完 VERIFY→CLOSE，证据归档各仓库 evidence 目录
- 16.3 发布
- 16.3.1 灰度：内部账号→白名单→全量；回滚预案（各平台独立回滚，hub 兼容 N-1 契约）
F. 前提、局限与风险
前提：① DP1-DP5 按下方裁定；② Aidean auth/billing/gateway 三模块的 spec 完成度以 4.1.1/5.1.1/6.1.1 核对结果为准（本方案未逐行核验 104 路由/52 模型实现态）；③ Fleet 改造不触 FROZEN 契约；④ 后续一切文档改动带版本标记（铁律 3）。
局限：基于文档级勘察，未验证运行态；生产域名/SLA/部署细节未展开（子平台规范说明已有二级域名约定，【部分确认】）。
主要风险：R1 端口迁移回归（对策：CI 门禁+迁移窗口）；R2 BotHot 热点逻辑未实现拖累 P2（对策：降级人工触发版）；R3 自建 IdP 安全缺陷（对策：4.1.x 补齐+审计）；R4 对账差异（对策：5.3.1 每日作业）。
G. 安全声明（凭据处理规程）
本轮未发生任何凭据使用。后续执行阶段涉及 GitHub 操作时：内嵌 PAT 仅写入权限 600 的临时凭据文件 → 用毕即删 → git remote set-url 清除残留 → 全程不在任何输出/日志/文档中回显。另建议：该 token 已在对话明文出现，执行阶段用毕后请在 GitHub 后台轮换。