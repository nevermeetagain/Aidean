# Aidean 生态多平台融合设计综合方案

生成日期: 2026-09-30
数据来源: from_claude.md + from_deveco.md + from_oc.md + from_workbuddy.md + from_zcode.md

## 一、现状证据基线

基于5份设计文档的交叉验证，以下事实已由多方独立确认：

| 维度 | 既有事实 | 证据来源 | 对融合的意义 |
|------|------|------|------|
| 身份层 | 主平台内嵌自研OIDC IdP(七端点+JWKS+RS256+RefreshToken轮换+back-channel logout) | Claude/ZCode/OC/Deveco | 新子平台接入=oidc_clients插一行+标准跳转 零IdP改动 |
| 计费层 | 统一网关/api/v1/gateway/chat(五态billingPath+hold/capture/void+requestId幂等)+wallet只读API | Claude/ZCode/OC/Deveco | 余额套餐通用已落地 子平台零余额写权限 |
| 模型配置 | UserTierMapping(四档)+UserModelPriority(1-99)+StationUserKey+CustomChannel | Claude/ZCode | 一键配置模型=配一次主平台 全子平台经网关生效 |
| 接入现状 | Bot已接SSO+网关(唯一)；BotHot代码级已实装SSO；Fleet零接入；Thesis自建JWT账密(违反红线1) | Claude/ZCode/OC/Deveco | 接入路径已验证 剩余是复制+裁剪 |
| 编排能力 | Fleet=薄ControlPlane+DAG+10状态机+reviewer+零外部依赖(SQLite+JSONL) | Claude/OC/Deveco | 天然跨平台DAG编排器 需扩展HTTP执行体适配器 |
| 知识库 | AideanWiki(RagFlow已部署)双账号模型L3待实施；BotHot内置KB；主平台52模型中无知识库 | Claude/ZCode/OC/Deveco/WorkBuddy | 知识层是链路唯一真空段 |
| 端口/域名 | 五段百端口区间目标态已登记；二级域名+通配符证书+host-only cookie | 全部5份 | 拓展骨架就位 #78待裁决迁移 |
| 治理 | ADR-0003(自研IdP)+ADR-0005(SSO选型)+六步循环+文档铁律 | 全部5份 | 设计受ADR锁定 不得偏离 |

### 已实证的冲突/缺口清单

| # | 冲突/缺口 | 严重度 | 来源 |
|:---:|------|:---:|------|
| 1 | 端口双占：BotHot backend 3300与AideanBot段冲突；5300/5433/6380共享实例双占 | 高 | Deveco/OC/ZCode |
| 2 | AideanBot后端8000/Fleet控制台5000越段 | 中 | Deveco/OC |
| 3 | Thesis自建账密违反红线1 | 高 | Claude/ZCode/OC |
| 4 | 除Bot外所有子平台LLM调用直连外部 不经网关 不落主平台钱包 | 高 | ZCode/OC |
| 5 | 跨平台无统一编排 全流程靠人工串联 | 高 | 全部 |
| 6 | 知识层分散(BotHot KB/Thesis文献库/无生态Wiki) | 高 | 全部 |
| 7 | 溯源链无统一规范 Bot SSE引用帧不透URL | 中 | ZCode/OC |
| 8 | AideanWiki无仓库无端口段 AideanCompany定位未定 | 中 | Deveco/OC |
| 9 | 微信扫码登录G0关闭(行政门槛) | 低 | OC/WorkBuddy |
| 10 | Thesis ADR-009技术栈漂移(TS声明 vs Python实栈) | 中 | ZCode/Deveco |

## 二、五类用户场景拆解与需求汇总

| 用户 | 核心场景 | 搜集 | 存储 | 配模型 | 写作/分析 | 查证 | 关键诉求 |
|------|------|------|------|------|------|------|------|
| 大学生/研究生 | 文献综述/开题/论文自检 | 公众号/网页/视频 | 个人知识库 | 便宜模型兜底 | 论文初稿/格式/查重 | 引用核验/AIGC率 | 低成本 防学术不端 |
| 科研人员 | 跟踪前沿/综述/实验报告 | arXiv/公众号/RSS | 团队知识库 | 高档推理模型 | 综述/分析 | 数据可溯源/可复现 | 溯源链完整 |
| 金融研究员 | 每日简报/研报/数据图 | 财经媒体/公告 | 行业知识库 | 长上下文模型 | 研报/图表 | 数字交叉核验 | 实时 批量 SLA |
| 行业分析员 | 行业图谱/竞品/趋势 | 多源图文/视频 | 结构化知识库 | 多模态 | 分析报告 | 事实核查/引用链 | 多源去重 |
| 自媒体博主 | 选题/素材/成稿/分发 | 抖音/B站/小红书/公众号 | 内容素材库 | 快速模型 | 成稿/标题/脚本 | 查重/合规 | 全自动 高产 |

### 汇总能力需求（去重后12项）

| # | 能力 | 对应既有基建 | 状态 |
|:---:|------|------|:---:|
| C1 | 统一身份(一键登录/JIT建户/单点登出) | 主平台OIDC IdP | 已建 |
| C2 | 统一计费(余额套餐通用/预留结算/对账) | 网关五态billingPath | 已建 |
| C3 | 统一网关(一键模型方案/回退/缓存/SSE) | /api/v1/gateway/chat | 已建 |
| C4 | 采集雷达(源适配器/热点聚簇) | BotHot+AideanBot | 部分(热点待落地) |
| C5 | 统一知识底座(摄取/混合检索/快照溯源) | AideanWiki(RagFlow)+BotHot KB | 待统一 |
| C6 | 生产交付(写作/模板/导出/审阅) | AideanThesis | 已建 |
| C7 | 查证证据链(多源一致性/快照回链) | Fleet reviewer | 已建(需扩展) |
| C8 | 自动化编排(跨平台DAG/预算门/审批门) | Fleet DAG | 需扩展HTTP执行体 |
| C9 | 场景产品包(五类用户pipeline预设) | 无 | 待建 |
| C10 | 可观测审计(trace全链/四金指标) | UsageLog+events.jsonl | 部分(需统一trace) |
| C11 | 性能扩展(插件接口冻结/新平台接入清单) | 端口-适配器模式 | 已建 |
| C12 | 安全不丢数据(凭据治理/备份演练) | 既有安全红线 | 已建 |

## 三、总体融合架构

### 拓扑：Hub-and-Spoke + 事件契约主干

```
                    +--------------------------------------+
                    |        Aidean 主平台 :3000           |
                    |  IdP(SSO授权码流) 计费账本+预留结算    |
                    |  模型网关(OpenAI兼容+ModelProfile)   |
                    |  生态编排器(DAG+预算门+审批门)        |
                    |  事件网关(HMAC Webhook) 审计中心     |
                    +--+----------+----------+-----------+
        授权码流+JWKS | 计量/预留 | 网关调用 | 事件(信封+签名)
   +------------+--------+------+-----+------+---+---------+------------+
   |            |        |      |     |      |   |         |            |
 BotHot    AideanBot  Thesis  Fleet  Wiki  Company
 :3200     :3333      :3400   :3100  :3500  (待裁定)
 采集雷达   对话/通知   生产    查证   知识   Hermes A2A
 六渠道推送  通道       交付    执行   底座   (候选Worker)
```

### 六层架构定义

| 层 | 职责 | 组件 |
|:---:|------|------|
| T0 枢纽层 | 唯一身份/计费/网关/模型配置权威 | Aidean主平台 |
| T1 编排层 | 跨平台DAG调度/重试/断点续跑 | Fleet Control Plane + SkillsCloud |
| T2 能力层 | 采集/推送/写作/分析/查证 | BotHot+AideanBot+Thesis+Fleet |
| T3 知识层 | 摄取/混合检索/快照溯源 | BotHot KB(一期) -> AideanWiki(二期) |
| T4 身份计费层 | OIDC+网关代理+BalanceHold | Aidean IdP+Gateway |
| T5 数据层 | 各平台自有PG+统一溯源+事件日志 | 各仓库独立数据库 |

## 四、关键设计决策（经多方钢人论证幸存）

| # | 决策 | 支持证据 | 反对/风险 | 结论 |
|:---:|------|------|------|------|
| D1 | Hub-and-Spoke拓扑：Aidean为唯一身份/计费/网关锚点 | BotHot已实践sub锚定+余额实时查；SSO指南v1.4 | Hub单点故障 | 维持 补强：JWKS缓存宽限+多副本+健康探针 |
| D2 | Fleet作为跨平台DAG编排器(新增HTTP执行体适配器) | Fleet DAG/dispatcher/reviewer天然适配 | Fleet零依赖铁律 | 成立：出站HTTP不引入外部服务 双模式(自备池+走网关) |
| D3 | 知识层两步走：Phase-A复用BotHot KB -> Phase-B建AideanWiki | 主平台52模型无知识库；BotHot KB已有 | 多一个服务成本 | 推荐：先复用后独立 视负载阈值切换 |
| D4 | Thesis移除本地账密+AI改走网关(红线1不可逾越) | SSO指南§9存量绑定先例 | 双重改造+ADR-009漂移 | 成立：分步迁移 过渡期保留密码兜底 |
| D5 | 溯源链batchId贯穿(不需要中心DB) | 各段已有本地存储+事件日志 | 跨仓库无中心DB | 成立：batchId由编排层生成 各段本地存储+交叉检索 |
| D6 | 通信维持host-only cookie+授权码流(禁止父域共享) | SSO指南§2.1有意设计 | 跨子域要跳转 | 维持：一次跳转可接受 |
| D7 | 网关第三鉴权通道=用户委托access_token(一键配置模型) | JWKS/aud/过期语义现成 | guard改动是资金入口 | 成立：spec覆盖四异常路径+影子计费对照 |
| D8 | 事件契约与传输解耦(信封+签名 传输允许Webhook或总线) | Fleet禁Redis BotHot队列在PG -> 基础设施异构 | Webhook可靠性低 | 成立：不强推共享总线 |
| D9 | 端口半开区间[start,start+100) 边界归下一段 | 冲突实证5条；Thesis已固化段内自备 | 存量迁移回归成本 | 成立：CI门禁+迁移窗口 |
| D10 | 契约SSOT在Aidean docs/ 实现包各仓库自带(TS+Pydantic双形态) | Thesis contracts双语先例 | 跨仓库发共享包成本 | 成立 |

## 五、五条核心要求映射

| 核心要求 | 映射能力 | 映射阶段 | 验证方式 |
|------|------|------|------|
| 全自动 | C8编排+预算/审批门 | P2/M5 | 全链无人干预e2e+故障注入恢复 |
| 一键登录免配置 | C1身份+C3网关 | P0-P1/M1 | 五平台e2e登录矩阵 |
| 可溯源不丢失 | C5快照+C10溯源链+C12备份 | P1/M3 | 溯源e2e+篡改检测+导出哈希+恢复演练 |
| 余额套餐通用 | C2计费 | P1/M2 | 充值->跨平台消费->联合账单对账 |
| 高性能高拓展 | C11插件+端口-适配器 | P3/M7 | 压测+拓展演练(新增第6产品零改核心代码) |

## 六、可执行大纲（原子化 分阶段 P0->P3）

> 每条叶子任务=一个可验收交付物。执行前须按六步流程PLAN->SPEC->APPROVE->IMPLEMENT->VERIFY->CLOSE。

### P0 治理与基座层（纯文档/决策 先行）

| # | 任务 | 责任方 | 验收标准 | 依赖 |
|:---:|------|------|------|------|
| 0.1 | 决策冻结D1-D10(含知识层路线/端口迁移/编排归属) | 管理者 | 各决策书面裁决 | - |
| 0.2 | 新建ADR-0008(跨平台编排与溯源)+ADR-0009(事件契约)+ADR-0010(知识底座) | 主平台 | 评审通过 含回退路径 | 0.1 |
| 0.3 | 修订《子平台规范说明》v2.0：登记BotHot现状+Wiki目标态+端口目标表 | 主平台 | 版本锚点+端口矩阵含BotHot实占 | 0.1 |
| 0.4 | 端口收口：Fleet 5000->3100；Bot backend 8000->3310；BotHot backend 3300->3210 | 各仓库 | 全栈docker compose双活无冲突 | 0.1 |
| 0.5 | 契约定义：事件信封schema v1(CloudEvents子集)+生态事件类型注册表 | 主平台 | 契约文档+OpenAPI快照 | 0.2 |
| 0.6 | 双语契约包：推广Thesis packages/contracts模式至各仓库(TS+Pydantic) | 主平台 | 各仓库CI契约漂移检查 | 0.5 |
| 0.7 | 统一trace_id规范(HTTP头Aidean-Trace-Id+事件字段透传) | 主平台 | 写入规范说明 | 0.5 |
| 0.8 | CI门禁：各仓库端口段对账+契约漂移检查+文档铁律 | 主平台 | 违规样例被拦截 | 0.3/0.6 |

### P1 身份与计费统一（一键登录免配置+余额套餐通用）

| # | 任务 | 责任方 | 验收标准 | 依赖 |
|:---:|------|------|------|------|
| 1.1 | oidc_clients注册4个client(bothot/thesis/fleet/wiki预埋)+seed脚本 | 主平台 | seed幂等 redirect_uri白名单精确 | P0 |
| 1.2 | admin/oidc-clients最小管理页(列表/启停) | 主平台 | 门禁全绿 | 1.1 |
| 1.3 | Fleet接SSO(FastAPI最小RP+logoutUri登记) | Fleet | e2e全链307->登录->code->会话 | 1.1 |
| 1.4 | Thesis SSO迁移(新增RP+绑定表+保留密码过渡期) | Thesis | 绑定三步用例过 | 1.1 |
| 1.5 | BotHot SSO回调登记对齐 | BotHot/主平台 | e2e全链通过 | 1.1 |
| 1.6 | 钱包实时读嵌入：四端点统一渲染余额/套餐 禁止本地持久化 | 各子平台 | 四平台UI同源同值 | 1.1 |
| 1.7 | 网关委托鉴权：scope gateway:chat + guard第三分支(Bearer RS256验签) | 主平台 | spec覆盖过期/撤销/越scope/重放四路径 | 1.1 |
| 1.8 | 子平台LLM调用切网关(Bot/Thesis/Fleet/BotHot) | 各子平台 | 计费流水入主钱包 grep无vendor key直连 | 1.7 |
| 1.9 | 支付渠道生产化(微信/支付宝) | 主平台 | 生产不再抛40000 | P0 |
| 1.10 | 联合账单：GET /internal/billing/usage(按product聚合) | 主平台 | 本地基线P95<300ms | 1.8 |
| 1.11 | 降级：3000健康探测->离线横幅->禁新登录->已登录只读宽限 | 各子平台 | kill 3000后五平台行为实测 | 1.3-1.5 |

### P2 数据流层（知识+采集+查证+溯源）

| # | 任务 | 责任方 | 验收标准 | 依赖 |
|:---:|------|------|------|------|
| 2.1 | Phase-A：BotHot KB服务化(/kb/v1只读契约：search/fetch/asset 含url/hash/version) | BotHot | 契约文档+OpenAPI快照 | P1 |
| 2.2 | 引用溯源透出：BotHot SSE citations帧补url/assetId/contentHash | BotHot | 前端引用卡片可点回原源 | 2.1 |
| 2.3 | Thesis引用改造：Reference.source挂KB assetId | Thesis | 导出物含source url+assetId双溯源 | 2.1 |
| 2.4 | provenance表结构+URI规范aidean://platform/entity/id@v | 主平台 | prisma migrate通过 | P1 |
| 2.5 | POST /internal/provenance/register(contentHash幂等去重) | 主平台 | 重复注册返回同URI | 2.4 |
| 2.6 | 采集链终点追加registerAsset(URI+provenance) | Bot/BotHot | 新入库文100%带URI | 2.5 |
| 2.7 | Fleet查证API契约：POST /verify(claim->verdict/evidence[]/trace_id) | Fleet | Thesis调用->Fleet出证->主平台见流水 | P1 |
| 2.8 | 查证报告schema入契约包(claim/evidence[]/verdict/confidence) | 主平台 | 契约测试通过 | 2.7 |
| 2.9 | 数据导出：/user/data-export(JSON-LD+附件zip 按sub隔离) | 主平台 | 导出包哈希校验通过 | 2.4 |
| 2.10 | 三保险：PG备份+Artifact快照+outbox append-only | 各仓库 | 恢复演练1次 | 2.4 |
| 2.11 | 篡改检测：改一条provenance记录->verify变红 | 主平台 | 演示记录 | 2.5 |

### P3 自动化与质量层（编排+场景+性能+验收）

| # | 任务 | 责任方 | 验收标准 | 依赖 |
|:---:|------|------|------|------|
| 3.1 | 事件总线：Redis Streams+outbox表+consumer group+去重表 | 主平台 | 重复投递消费结果不变(幂等) | P2 |
| 3.2 | 频道冻结v1：evt.asset.created/artifact.published/verify.requested/billing.depleted | 主平台 | 契约测试+频道文档 | 3.1 |
| 3.3 | Fleet HTTP子平台执行体适配器(aidean_http.py) | Fleet | 封装调子平台API为标准执行体 | P2 |
| 3.4 | 流水线DAG定义：搜集->存储->[配置隐式]->写作->查证 | Fleet | 每节点=SubplatformTask | 3.3 |
| 3.5 | 场景模板注册表：student/researcher/finance/analyst/creator五套pipeline | 主平台 | 每模板可启停 | 3.4 |
| 3.6 | S1论文链：Bot搜集->Wiki存储->Thesis写作->Fleet查证->导出 | 全部 | e2e spec通过 | 3.5 |
| 3.7 | S3晨报链：AIHOT热点->双源verify->生成研报->6渠道推送 | 全部 | 推送窗口P95<5min | 3.5 |
| 3.8 | S5选题分发链：热点feed->选题->模型成稿->合规预检->多渠道发布 | 全部 | 全程<30min | 3.5 |
| 3.9 | /user/workspace五模式(学生/科研/金融/行业/自媒体) | 主平台 | 每模式=快捷入口+余额卡+溯源卡+最近工作流 | 3.5 |
| 3.10 | 统一控制台：余额/套餐/用量/导出/登录设备一页 | 主平台 | UI e2e | P1 |
| 3.11 | 网关性能：连接池复用+上游超时熔断+令牌桶限流+流式透传 | 主平台 | 压测对比表 | P1 |
| 3.12 | @aidean/shared<->pydantic contracts双向契约测试进CI | 主平台 | 字段漂移即红 | P0 |
| 3.13 | 拓展演练：仅用向导+模板新增第6个产品 不改核心代码 | 主平台 | 演练记录 | 3.9 |
| 3.14 | 五类用户UAT脚本执行+证据留存 | 全部 | 截图/日志/CI run编号 | 3.6-3.8 |
| 3.15 | 五条核心铁律验收表(全自动/一键登录/可溯源/余额通用/高性能) | 主平台 | 每条对应可复现命令 | 3.14 |
| 3.16 | 安全复查：凭据文件600/日志零泄漏/git remote无残留/临时凭据即用即删 | 主平台 | 清单逐项勾选 | 3.14 |

## 七、风险与缓解

| 风险 | 严重度 | 缓解措施 | 责任 |
|------|:---:|------|------|
| Hub单点故障(3000宕机全生态不可用) | 高 | JWKS缓存宽限+多副本+健康探针+降级横幅(P1.11) | 主平台 |
| 端口迁移回归(存量服务断) | 中 | 迁移窗口+CI门禁+灰度切换 | 各仓库 |
| Thesis双栈改造复杂度(SSO+网关+ADR-009) | 高 | 分步迁移+密码过渡期+独立验证 | Thesis |
| 事件总线引入Redis(Fleet铁律冲突) | 中 | 传输解耦 Fleet仅消费HTTP Webhook不强依赖Redis | Fleet |
| 知识层Phase-A/B切换数据迁移 | 中 | 统一asset URI+provenance表 跨层迁移仅改指针 | 主平台 |
| 微信扫码登录行政门槛(G0关闭) | 低 | 留G1后置 不阻塞主线 | 管理者 |
| 契约跨语言漂移(TS vs Pydantic) | 中 | 双向契约测试进CI(P3.12) 字段漂移即红 | 主平台 |
| 中转站/外部API不稳定(采集链) | 中 | 多源冗余+降级+重试+告警 | Bot/BotHot |

## 八、验收标准（五条核心铁律）

| 铁律 | 验收命令/方法 | 通过标准 |
|------|------|------|
| 全自动 | 触发S1/S3/S5流水线 观察全程人工干预次数 | 0次干预 故障自恢复 |
| 一键登录免配置 | 五平台e2e登录矩阵(首次登录JIT建户+已绑定直登+单点登出) | 全绿 |
| 可溯源不丢失 | 导出用户数据包->校验哈希->篡改一条provenance->verify变红->恢复演练 | 哈希一致 篡改可检测 数据可恢复 |
| 余额套餐通用 | 充值100元->跨四平台消费->联合账单对账 | 余额变动一致 无超扣 |
| 高性能高拓展 | 压测网关P95<300ms+拓展演练新增第6产品零改核心 | 指标达标 演练通过 |

## 九、里程碑与依赖关系

| 里程碑 | 包含任务 | 预计周期 | 前置 |
|:---:|------|------|------|
| M0 治理冻结 | P0全部 | 1-2周 | - |
| M1 身份计费统一 | P1.1-1.6 | 2-3周 | M0 |
| M2 网关切流 | P1.7-1.11 | 2-3周 | M1 |
| M3 知识溯源 | P2.1-2.11 | 3-4周 | M2 |
| M4 事件编排 | P3.1-3.4 | 2-3周 | M3 |
| M5 场景交付 | P3.5-3.10 | 3-4周 | M4 |
| M6 性能拓展 | P3.11-3.13 | 2周 | M5 |
| M7 验收闭环 | P3.14-3.16 | 1-2周 | M6 |

总周期估算：16-24周（含并行优化）

## 十、设计来源贡献

| 来源 | 核心贡献 |
|------|------|
| from_claude.md | 证据基线方法 5W1H P0-P3大纲骨架 端口-适配器模式 |
| from_deveco.md | 端口冲突实证(5条) 迁移窗口 治理铁律 风险缓解 |
| from_oc.md | 用户场景U1-U5 钢人论证 契约SSOT+实现包分离 事件信封设计 |
| from_workbuddy.md | 知识层定位 场景产品包思路 |
| from_zcode.md | 六仓库证据基线 A2A->TaskPack翻译 端口目标态 溯源batchId |

## 十一、所需资源/输入清单

| 资源 | 用途 | 是否必须 | 当前状态 |
|------|------|:---:|------|
| Aidean主平台源码(6仓库) | 实施改造 | 是 | 已克隆 |
| RagFlow实例 | 知识层Phase-B | 否(Phase-A可复用BotHot KB) | 已部署 |
| Redis实例 | 事件总线P3 | 否(P1/P2不需要) | 需部署 |
| 微信开放平台资质 | 微信扫码登录 | 否(G0已关闭 G1后置) | 行政门槛 |
| 支付渠道生产资质 | 支付生产化 | 是(P1.9) | 需确认 |
| 域名+通配符证书 | 子平台域名 | 是 | 需配置 |
| 压测工具(k6/wrk) | 性能验收 | 否(P3阶段) | 需安装 |
| UAT测试账号(五类用户) | 众测验收 | 是(P3.14) | 需准备 |
