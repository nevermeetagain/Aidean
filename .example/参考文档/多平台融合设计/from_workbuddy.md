已完成实地核查（只读，未动任何文件）。先给推理过程，再给终稿大纲。

---

# 第一部分：深度分析（四轮）

## 一、第一轮：5W1H 发散

**What（事实）**
- 实测确认的主平台基线：`apps/web` 内嵌 OAuth2/OIDC IdP 已建成（RS256+JWKS、PKCE 仅 S256、RefreshToken 轮换链、`tokenVersion` 全端失效、aud 隔离）；billing 模块含 `GET /api/v1/internal/billing/wallet` 与 BalanceHold（hold→capture→void→对账测试）；`docs/specs/implement-gateway-module`、`implement-billing-module`、`add-subplatform-showcase-pages`、`enrich-subplatform-intro-pages` 规格目录均已存在。
- 实测确认的 ADR 已确权：ADR-0003（自研 IdP、`sub` 唯一身份锚、oidc_clients 一行注册、余额主平台唯一权威、跨域走授权码）+ ADR-0005（SSO 选型）。**本方案不是从零设计，而是在既定路线上补齐“流程编排 + 知识层 + 溯源链”三块。**
- 子平台实测：AideanBot（3333，已接 SSO，实测通过）；BotHot（前端 3200/backend **3300**，FastAPI+Next.js14+LangBot 5300+PG 5433+Redis 6380，六渠道推送已通、热点聚簇模型已建逻辑待落地）；AideanThesis（前端 3400/API 3401，FastAPI+Celery+packages/contracts）；AideanFleet（Python FastAPI 自研薄 Control Plane + 可插拔执行体，天然是编排器候选）；AideanWiki **无项目本体**（ADR-0003 仅预留双账号模型）。
- 缺口：①五平台间无统一编排，全流程靠人工串联；②知识层分散（BotHot 内置 KB vs 拟建 AideanWiki，归属未定）；③溯源链无统一规范；④BotHot backend 3300 与新端口规划（AideanBot 段 3300-3400）冲突。

**Why（动机）**：六个目标人群的共性是“信息→知识→产出→验证→发布”长链条，当前每个环节独立操作、模型各自配置、余额各自查——自动化与统一计费是生态价值成立的唯一路径。

**Where/When（边界）**：本地 3000-3500 端口段；微信扫码登录通道 G0 关闭（行政门槛），登录主通道为邮箱验证码；本任务仅设计，不落码。

**Who**：Aidean=身份+计费+模型配置权威；Fleet=编排执行面；BotHot=采集+分发面；Thesis=产出面；Wiki=知识沉淀面（待建）。

**How**：见第二部分大纲。

**What if**：知识层若直接新建 AideanWiki，BotHot 已有 KB 会形成双头——必须先裁决归属；若 Fleet 不做编排而放主平台，则违反“主平台薄、能力在子平台”的扩展方向且主平台 Next.js 不适合跑长任务调度。

## 二、第二轮：苏格拉底追问（关键结论抽查）

- 「SSO 已就绪只需加注册行？」→ 证据：ADR-0003 现状基线 + Bot 实测通过。但追问：Fleet（无前端登录页的 CLI/控制台形态）与未来 Wiki（双账号）接入模式不同——结论修正为“SSO 主链路就绪，但**机器对机器（M2M）凭证流与双账号绑定流需补**”。
- 「余额通用已实现？」→ wallet API 只解决“读”；子平台消费写回（hold/capture）只有基建，**各子平台尚未真正经网关计费调用模型**——结论修正为“计费面就绪，计费点未铺”。
- 「编排放 Fleet 最优？」→ 反证：Fleet 版本 0.3.0、定位“薄 Control Plane”，承载五平台长流水线是否过薄？结论：编排规范放 Fleet，但**持久化流水线状态放各自平台库+事件日志**，Fleet 只持调度态，失败可重建——抗“过薄”质疑。
- 「BotHot 内置 KB 直接当生态知识层？」→ 追问：Thesis 需要结构化文献元数据，BotHot KB 面向公众号 RAG，schema 不匹配。结论：短期复用、长期独立 AideanWiki，且知识条目 schema 从第一天按生态标准定义。

## 三、第三轮：双向钢人

**支持「渐进式（先复用 BotHot KB，后立 Wiki）」**：零新运行时（守铁律5）、BotHot 已有多空间隔离与公共库、ADR-0003 已给 Wiki 留了双账号位，演进路径已有权威背书。
**反对与排除结果**：
- “一步到位建 Wiki 更干净”——成立但成本高，且 Wiki 本体未立项；**不被排除，转为 P2 路线**。
- “编排放 AideanCompany（Hermes A2A）更成熟”——A2A 多 Agent 已有实施文档；但 Company 定位不同且未列入本次五环节；**保留为替代方案，标注待决策**。
- “BotHot backend 3300 不用迁”——与规划段冲突是事实；**成立，必须迁**（建议 3260）。
- 仍成立的风险：端口段边界（3300）双归属、Fleet 编排能力未经长流水线验证、跨平台事务一致性（计费 hold 与任务产出的对账）。

## 四、第四轮：重构终稿

结论：在 ADR-0003/0005 既定路线上，补三件事——**统一编排（Fleet）、统一知识层（先 BotHot KB 后 Wiki）、统一溯源规范（全链 source_id 贯穿）**；计费点铺到每个 AI 调用。前提：各子平台按接入规范注册 oidc_client + gateway 凭据。局限：Fleet 承载力、微信登录通道、Wiki 立项时机为本方案三大不确定性。

⚠️ 另：你在消息中内嵌 PAT 属高敏凭据，本回复与后续文件均不引用其值；**该值已在对话中暴露，建议尽快在 GitHub 后台撤销轮换**。

---

# 第二部分：终稿大纲（待你确认后执行）

**《Aidean 生态五平台一体化全流程方案》**

## 1. 总体架构与分层
- 1.1 六层架构定义（自上而下）
  - 1.1.1 接入层：Aidean 主站统一入口 + 子平台展示页 + 跳转式 SSO
  - 1.1.2 编排层：AideanFleet Control Plane（流水线模板/调度/重试/断点续跑）
  - 1.1.3 能力层：BotHot（采集+推送）、AideanThesis（写作+分析）、Fleet-Verify（查证执行体）
  - 1.1.4 知识层：BotHot KB（一期）→ AideanWiki（二期独立项目）
  - 1.1.5 身份与计费层：Aidean IdP（OIDC）+ 网关 AI 代理 + BalanceHold 计费点
  - 1.1.6 数据层：各平台自有 PG + 统一溯源规范 + 事件日志
- 1.2 设计铁律（继承+新增）
  - 1.2.1 继承：ADR-0003 五条接入铁律逐条沿用（sub 锚点/一行注册/余额唯一权威/预扣结算/授权码跨域）
  - 1.2.2 新增铁律 6：知识条目必须携带溯源五元组（origin_url, source_platform, captured_at, capture_method, operator_sub）
  - 1.2.3 新增铁律 7：子平台禁止直连模型厂商，一律经主平台网关（OpenAI 兼容端点）
  - 1.2.4 新增铁律 8：流水线每步产物 append-only 落库，任何步骤可重放不重算

## 2. 用户场景需求拆解（6 类人群）
- 2.1 大学生：公众号资料入库→知识库问答→Thesis 课程论文→Fleet 查证引用；需求重心=低门槛+免费配额
- 2.2 研究生：多源文献采集→综述生成→引用格式核验；需求重心=溯源精确性
- 2.3 科研人员：订阅式增量采集→结构化知识条目→深度分析长文；需求重心=长任务可靠性（hold/断点）
- 2.4 金融研究员：公众号+热点聚簇（BotHot 热度模型）→行业分析→数据源回查；需求重心=时效性+日报
- 2.5 行业分析员：Feed 流→定时日报推送→报告产出；需求重心=全自动定时
- 2.6 自媒体博主：热点选题→内容生成→六渠道推送（BotHot 既有能力）；需求重心=分发效率
- 2.7 汇总：六场景映射为 3 条标准流水线模板（P-研究型/P-资讯型/P-创作型）+ 参数化差异

## 3. 统一身份与一键登录
- 3.1 oidc_clients 注册规范扩展（每平台一行：BotHot/Thesis/Fleet/Wiki 预留）
- 3.2 Fleet M2M 接入：client credentials 流（无浏览器场景），scope 最小化
- 3.3 AideanWiki 双账号绑定流（ADR-0003 L3 模型落地规范）
- 3.4 主站“我的生态”页：已登录状态下一键进入各子平台（携 code 跳转，零二次配置）

## 4. 统一计费与余额通用
- 4.1 网关 AI 代理端点规范化（`/api/v1/gateway/ai/*`，OpenAI 兼容）
- 4.2 计费点铺设：Thesis 生成、BotHot 入库解析、Fleet 查证 LLM 调用，均 hold→capture
- 4.3 套餐/tier 生态级生效模型（主平台为唯一权威，子平台实时读 wallet）
- 4.4 对账与幂等（requestId 幂等键 + releaseExpiredHolds 兜底 + 月度对账任务）

## 5. 统一知识层与溯源
- 5.1 一期：BotHot KB 服务化（对生态暴露 KB API：空间/条目/检索三组端点）
- 5.2 知识条目生态标准 schema（含溯源五元组 + lineage 父指针 + 内容 hash）
- 5.3 溯源链规范：source→raw_snapshot→normalized_doc→knowledge_item→citation→report 六级，每级带 UUID+hash 链
- 5.4 防丢失：原文 append-only 表 + 内容寻址存储 + 每日备份策略
- 5.5 二期：AideanWiki 立项边界（继承 5.2 schema，直接满足铁律，避免返工）

## 6. 全自动编排（Fleet）
- 6.1 流水线模板引擎（3 模板 × 参数化：触发器/步骤/产物/计费点声明式描述）
- 6.2 执行体适配器协议（KB-adapter、Thesis-adapter、Verify-adapter、Push-adapter，各子平台实现统一接口）
- 6.3 触发器三类：手动（主站一键）/ 定时（cron）/ 事件（新文章入库 webhook）
- 6.4 可靠性：断点续跑 + 指数退避重试 + 死信队列 + 每步产物可独立重放
- 6.5 编排态与业务态分离（Fleet 只存调度态，业务产物在源平台库）

## 7. 各平台改造清单（原子任务）
- 7.1 Aidean：oidc_clients 加 3 行 seed；网关 AI 代理端点；“我的生态”页；用户默认模型一键配置（生态级偏好表）
- 7.2 BotHot：backend 3300→3260 迁移；KB API 服务化；热点聚簇 v0.5 落地；gateway 凭据接入计费
- 7.3 AideanThesis：SSO 客户端接入（对标 AideanBot wechat-rag 先例）；KB 消费端；计费点接入
- 7.4 AideanFleet：流水线模板引擎；4 个适配器；M2M 凭证；3100-3200 段端口定档
- 7.5 AideanWiki（P2）：项目立项 + 双账号绑定 + schema 继承

## 8. 端口与部署规划
- 8.1 端口分配表（按你的五段规划，含迁移项：BotHot backend 3300→3260）
- 8.2 每平台独立 docker-compose，共享网络但数据不共享库

## 9. 性能设计
- 9.1 长任务全部异步化（Celery/job worker），API 层零阻塞
- 9.2 网关验签本地 JWKS 零 RTT（ADR-0005 既有）
- 9.3 KB 检索 RAG 缓存（Redis）+ 热点评分物化
- 9.4 编排调度 60s 心跳级联事件驱动（事件触发优先于轮询）

## 10. 拓展性设计
- 10.1 新子平台接入成本恒定 = 1 行 oidc_clients + 1 个适配器 + 1 段端口
- 10.2 AideanCompany/Hermes A2A 作为未来执行体来源的预留接口位
- 10.3 成品 IAM 重评触发条件沿用 ADR-0003（>5 接入方时）

## 11. 分期路线
- 11.1 MVP（P0）：SSO 铺满 + 网关计费点 + KB API + 1 条研究型流水线跑通（大学生场景端到端）
- 11.2 P1：3 模板齐 + 热点聚簇 + 定时日报 + 计费对账
- 11.3 P2：AideanWiki 立项 + 创作型流水线 + Company 执行体接入

## 12. 风险与待决策点
- 12.1 待决策 ①：知识层归属（推荐“先 BotHot 后 Wiki”渐进式；替代：一步到位建 Wiki）
- 12.2 待决策 ②：编排归属（推荐 Fleet；替代：AideanCompany Hermes A2A）
- 12.3 待决策 ③：BotHot backend 迁移目标端口（推荐 3260）
- 12.4 风险：微信登录通道行政门槛（邮箱通道先行）；Fleet 长流水线承载力未验证；跨平台计费一致性
- 12.5 安全行动项：对话中暴露的内嵌 PAT 建议立即撤销轮换（本方案全程仅以泛化表述引用）

---

以上为完整设计大纲，未编辑/新建任何文件。三个待决策点（12.1/12.2/12.3）请给出裁决，或直接说“按推荐执行”，我再进入下一步。