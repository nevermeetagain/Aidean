# Aidean 生态多平台融合设计 — 综合方案

> 生成日期：2026-09-30
> 数据来源：from_claude.md（739 行对抗性评审）+ from_chatgpt.md（2592 行红队评审）+ 六平台源码实测 + ADR-0003/0005
> 方法论：交叉验证（多方独立确认的事实才入基线）+ 钢人论证（每个决策双向拷问）+ 现状优先（代码实证 > 文档声明）

---

## 一、现状证据基线

### 1.1 六平台实测清单

| 平台 | 端口段 | 技术栈 | OIDC 接入 | 网关接入 | 定位 | 关键发现 |
|------|--------|--------|:---------:|:--------:|------|----------|
| **Aidean** | 3000–3100 | Next.js 15 + Prisma + PG | **IdP 本体** | **网关本体** | 枢纽/控制面 | 自研 OIDC 7 端点 + RS256/JWKS + RefreshToken 轮换 + back-channel logout；wallet hold/capture/void；`/api/v1/gateway/chat` 五态 billingPath |
| **BotHot** | 3200/3300 | FastAPI + Next.js 14 + PG | ✅ 已实装 | ❌ 直连 SiliconFlow | 采集雷达/推送 | 10 渠道推送；热点聚簇数据模型已建（逻辑待实现）；SSO + back-channel logout 测试通过；`FOR UPDATE SKIP LOCKED` 无 Redis 队列 |
| **AideanBot** | 3300–3400 | FastAPI + PG | ✅ 已接入 | ✅ 经网关 | 对话/通知（旧） | `oidc_clients.wechat-rag`（3333 回调）；公众号→知识库→机器人闭环；BotHot 的前身 |
| **AideanFleet** | 3100–3200（当前 5000 越段） | Python + FastAPI + SQLite | ❌ 零接入 | ❌ 零接入 | DAG 编排/查证 | 10 状态机 + budget gate + reviewer + 8 执行器；零外部依赖（SQLite + JSONL） |
| **AideanThesis** | 3400–3500 | Next.js 15 + FastAPI + PG + Redis/Celery | ❌ 自建 JWT | ❌ 直连 DeepSeek | 论文生产/查重 | DDD 架构；`jwt_provider.py` 用 python-jose + bcrypt 自建账密——**违反红线 1**；PaperFree 查重适配器 |
| **AideanCompany** | 待定 | FastAPI + Next.js + PG | ❌ 零接入 | ❌ 零接入 | 一人公司/知识库 | 设计阶段；backend 有 KnowledgeSpace/LangBot 集成；fleet 有 configs/dispatcher/runner/reports |

### 1.2 既有基建交叉验证

| 维度 | 既有事实 | 证据来源 | 对融合的意义 |
|------|----------|----------|--------------|
| 身份层 | 主平台内嵌自研 OIDC IdP（七端点 + JWKS + RS256 + RefreshToken 轮换 + back-channel logout） | ADR-0003/0005 + 4 份评审 | 新子平台接入 = `oidc_clients` 插一行 + 标准跳转流 |
| 计费层 | 统一网关 `/api/v1/gateway/chat`（五态 billingPath + hold/capture/void + requestId 幂等）+ wallet 只读 API | 代码实测 + 4 份评审 | 余额套餐通用已落地，子平台零余额写权限 |
| 模型配置 | UserTierMapping（四档）+ UserModelPriority（1-99）+ StationUserKey + CustomChannel | 代码实测 + Claude 评审 | 配一次主平台，全子平台经网关生效 |
| 接入现状 | Bot 已接 SSO + 网关（唯一）；BotHot 代码级已实装 SSO；Fleet 零接入；Thesis 自建 JWT | 代码实测 + 4 份评审 | 接入路径已验证，剩余是复制 + 裁剪 |
| 编排能力 | Fleet = 薄 ControlPlane + DAG + 10 状态机 + reviewer + 零外部依赖 | 代码实测 + 4 份评审 | 天然跨平台 DAG 编排器，需扩展 HTTP 执行体适配器 |
| 知识库 | BotHot 内置 KB（LangBot）；Thesis 有 knowledge module；AideanWiki 双账号 L3 待实施 | 代码实测 + 4 份评审 | 知识层分散，需统一底座 |
| 端口/域名 | 五段百端口区间已登记；二级域名 + 通配符证书 + host-only cookie | 全部评审 + AGENTS.md | 拓5段骨架就位 |
| 治理 | ADR-0003（自研 IdP 锁定）+ ADR-0005（SSO 选型）+ 六步循环 + 文档铁律 | ADR 实测 | 设计受 ADR 锁定，不得偏离 |

### 1.3 已实证的冲突/缺口清单

| # | 冲突/缺口 | 严重度 | 融合方案解法 |
|:---:|-----------|:------:|--------------|
| 1 | 端口双占：BotHot 3300 与 AideanBot 段冲突；5300/5433/6380 共享实例双占 | 高 | BotHot 迁入 3200 段统一管理；共享实例按归属段映射 |
| 2 | AideanBot 8000 / Fleet 5000 越段 | 中 | 统一迁入各自段内（Bot→3333，Fleet→3100） |
| 3 | Thesis 自建 JWT 账密违反红线 1 | 高 | Phase 1 替换为 OIDC 授权码流，删除 `jwt_provider.py` |
| 4 | 除 Bot 外所有子平台 LLM 直连外部，不经网关不落钱包 | 高 | Phase 2 各子平台接入 `/api/v1/gateway/chat` 代理 |
| 5 | 跨平台无统一编排，全流程靠人工串联 | 高 | Fleet 作为跨平台 DAG 编排器 + HTTP 执行体适配器 |
| 6 | 知识层分散（BotHot KB / Thesis 文献库 / 无 Wiki） | 高 | 统一知识底座：一期 BotHot KB + 适配器，二期独立服务 |
| 7 | 溯源链无统一规范，Bot SSE 引用帧不透 URL | 中 | 统一 Provenance 数据模型 |
| 8 | AideanWiki 无仓库无端口段；AideanCompany 定位未定 | 中 | Wiki 延期；Company 定位为知识库 + Fleet Worker 候选 |
| 9 | 微信扫码登录 G0 关闭（行政门槛） | 低 | 邮箱验证码通道为主推进项 |
| 10 | Thesis ADR-009 技术栈漂移 → ADR-013 已追认 Python 实栈 | 中 | ADR-013 accepted，Python 为权威 |


---

## 二、五类用户场景拆解与需求汇总

### 2.1 用户画像与核心场景

| 用户类型 | 核心场景 | 搜集 | 存储 | 配模型 | 写作/分析 | 查证 | 关键诉求 |
|----------|----------|------|------|--------|-----------|------|----------|
| 大学生/研究生 | 文献综述/开题/论文自检 | 公众号/网页/视频 | 个人知识库 | 便宜模型兜底 | 论文初稿/格式/查重 | 引用核验/AIGC 率 | 低成本，防学术不端 |
| 科研人员 | 跟踪前沿/综述/实验报告 | arXiv/公众号/RSS | 团队知识库 | 高档推理模型 | 综述/分析 | 数据可溯源/可复现 | 溯源链完整 |
| 金融研究员 | 每日简报/研报/数据图 | 财经媒体/公告 | 行业知识库 | 长上下文模型 | 研报/图表 | 数字交叉核验 | 实时 批量 SLA |
| 行业分析员 | 行业图谱/竞品/趋势 | 多源图文/视频 | 结构化知识库 | 多模态 | 分析报告 | 事实核查/引用链 | 多源去重 |
| 自媒体博主 | 选题/素材/成稿/分发 | 抖音/B站/小红书/公众号 | 内容素材库 | 快速模型 | 成稿/标题/脚本 | 查重/合规 | 全自动 高产 |

### 2.2 汇总能力需求（去重后 12 项）

| # | 能力 | 对应既有基建 | 状态 | 融合后归属 |
|:---:|------|--------------|:----:|------------|
| C1 | 统一身份（一键登录/JIT 建户/单点登出） | 主平台 OIDC IdP | ✅ 已建 | Aidean |
| C2 | 统一计费（余额套餐通用/预留结算/对账） | 网关五态 billingPath | ✅ 已建 | Aidean |
| C3 | 统一网关（一键模型方案/回退/缓存/SSE） | `/api/v1/gateway/chat` | ✅ 已建 | Aidean |
| C4 | 采集雷达（源适配器/热点聚簇） | BotHot 10 渠道 + 4 文章源 | 🔨 部分 | BotHot |
| C5 | 统一知识底座（摄取/混合检索/快照溯源） | BotHot KB + Thesis knowledge | ⏳ 待统一 | 一期 BotHot → 二期独立服务 |
| C6 | 生产交付（写作/模板/导出/审阅/查重） | AideanThesis | ✅ 已建 | AideanThesis |
| C7 | 查证证据链（多源一致性/快照回链） | Fleet reviewer | 🔨 需扩展 | AideanFleet |
| C8 | 自动化编排（跨平台 DAG/预算门/审批门） | Fleet DAG + 10 状态机 | 🔨 需扩展 | AideanFleet |
| C9 | 场景产品包（五类用户 pipeline 预设） | 无 | ⏳ 待建 | Aidean（编排模板） |
| C10 | 可观测审计（trace 全链/四金指标） | UsageLog + events.jsonl | 🔨 需统一 | Aidean |
| C11 | 性能扩展（插件接口冻结/新平台接入清单） | 端口-适配器模式 | ✅ 已建 | 各平台 |
| C12 | 安全不丢数据（凭据治理/备份演练） | 既有安全红线 | ✅ 已建 | 各平台 |

---

## 三、总体融合架构

### 3.1 拓扑：Hub-and-Spoke + 事件契约主干

```
                    ┌──────────────────────────────────────────────┐
                    │           Aidean 主平台 :3000                │
                    │  ┌─────────┐  ┌──────────┐  ┌────────────┐  │
                    │  │OIDC IdP │  │ 计费账本  │  │ 模型网关    │  │
                    │  │(7端点)  │  │hold/cap  │  │/gateway/chat│  │
                    │  └────┬────┘  └────┬─────┘  └─────┬──────┘  │
                    │  ┌────┴────────────┴───────────────┴──────┐  │
                    │  │  生态编排器(DAG+预算门+审批门) 事件网关 │  │
                    │  │  (Fleet Control Plane 嵌入)  HMAC签名   │  │
                    │  └────────────────────────────────────────┘  │
                    └──┬──────────┬──────────┬──────────┬─────────┘
            OIDC授权码流 │ 计量/预留 │ 网关调用 │ 事件(信封+HMAC)
           ┌────────────┼──────────┼──────────┼──────────┐
           │            │          │          │          │
      BotHot       AideanBot    Thesis     Fleet
      :3200        :3333        :3400      :3100
      采集雷达      对话/通知     生产交付    DAG编排/查证
      10渠道推送    通道         查重/写作   8执行器+reviewer
```

### 3.2 六层架构定义

| 层 | 职责 | 组件 | 数据流方向 |
|:---:|------|------|------------|
| **T0 枢纽层** | 唯一身份/计费/网关/模型配置权威 | Aidean 主平台 | 双向（授权↓ 计量↑） |
| **T1 编排层** | 跨平台 DAG 调度/重试/断点续跑/预算门/审批门 | Fleet Control Plane | 下发 TaskPack ↑ 回收 Evidence |
| **T2 能力层** | 采集/推送/写作/分析/查重/查证 | BotHot + AideanBot + Thesis + Fleet | 接收任务 ↑ 返回产物 |
| **T3 知识层** | 摄取/混合检索/快照溯源 | 一期：BotHot KB（LangBot）；二期：独立知识服务 | 查询↓ 结果↑ |
| **T4 身份计费层** | OIDC + 网关代理 + BalanceHold | Aidean IdP + Gateway | 授权码流↓ JWKS 验签↑ |
| **T5 数据层** | 各平台自有 PG + 统一溯源 + 事件日志 | 各仓库独立数据库 | 事件 Outbox → Webhook |

### 3.3 控制面 vs 数据面分离

| 维度 | 控制面（Control Plane） | 数据面（Data Plane） |
|------|------------------------|---------------------|
| 身份 | OIDC 授权码流 + JWKS 验签 | 各子平台 Session（短期，不持久化余额） |
| 计费 | 主平台 wallet + BalanceHold | 子平台经网关调用，计量回传 |
| 模型 | UserTierMapping + ModelProfile | 子平台零模型配置，全走网关 |
| 编排 | Fleet DAG + 预算门 | 各子平台执行体接收 TaskPack |
| 审计 | 主平台 UsageLog + events.jsonl | 子平台本地日志 → 事件回传 |
| 数据 | 不存子平台业务数据 | 各子平台自有 PG，独立数据库 |


---

## 四、关键设计决策（经钢人论证幸存）

### D1：Hub-and-Spoke 拓扑 — Aidean 为唯一身份/计费/网关锚点

| 维度 | 内容 |
|------|------|
| **决策** | Aidean 主平台为唯一 Hub，所有子平台为 Spoke |
| **支持证据** | BotHot 已实践 `sub` 锚定 + 余额实时查；ADR-0003 铁律 1-5；SSO 指南 v1.4 |
| **反对/风险** | Hub 单点故障 → 全生态登录/计费不可用 |
| **结论** | **维持**。补强：JWKS 缓存宽限（kid 双活已落地）+ 多副本部署 + 健康探针 + 降级模式（网关不可用时子平台只读） |
| **钢人论证** | 反方："应用 Kafka 事件溯源去中心化" → 正方："6 平台规模不需要 Kafka 运维税，PG Outbox + Webhook 足够；ADR-0003 已锁自研路线" |

### D2：Fleet 作为跨平台 DAG 编排器

| 维度 | 内容 |
|------|------|
| **决策** | Fleet 扩展 HTTP 执行体适配器，成为生态级编排器 |
| **支持证据** | Fleet DAG/dispatcher/reviewer 天然适配；10 状态机已覆盖 retry/skip/timeout/budget_gate |
| **反对/风险** | Fleet 零依赖铁律（SQLite + JSONL）被打破 |
| **结论** | **成立**。出站 HTTP 不引入外部服务依赖（只是新增一种 Executor），双模式：自备池（本地 Agent）+ 走网关（云端模型）。SQLite 保留为控制面状态 |
| **实现** | 新增 `HttpExecutor`：`TaskPack → HTTP POST → 子平台 /api/v1/internal/fleet/task` → 回调 `Evidence`；子平台需实现 internal task 接收端点 |

### D3：事件基础设施 — PG Outbox + HMAC Webhook（非 Redis Streams / Kafka）

| 维度 | 内容 |
|------|------|
| **决策** | 事件传递用 PostgreSQL Outbox 表 + HMAC 签名 Webhook，不用 Redis Streams 或 Kafka |
| **支持证据** | Claude + ChatGPT 双方一致推荐；主平台已有 PG；6 平台事件量 < 10K/day |
| **反对/风险** | PG Outbox 轮询延迟（秒级）；无事件回溯总线 |
| **结论** | **维持**。补强：Outbox 轮询间隔 2s（可配）；Webhook 失败指数退避重试（max 5 次）；事件保留 90 天后归档 OBS |
| **钢人论证** | 反方："Kafka 提供事件回溯和精确一次语义" → 正方："6 平台不需要 Kafka 运维税（3 broker + ZK/KRaft + 监控）；PG Outbox + 幂等消费者已够；事件回溯用 events.jsonl 归档 OBS 替代" |

### D4：信息采集基座 — BotHot（非 AideanBot）

| 维度 | 内容 |
|------|------|
| **决策** | 以 BotHot 为信息采集与推送基座，AideanBot 逐步退役 |
| **支持证据** | BotHot 是 AideanBot 的升级版（AGENTS.md 明确"不修改 AideanBot 原项目，BotHot 是独立副本"）；10 渠道 vs AideanBot 单渠道；热点聚簇数据模型已建 |
| **反对/风险** | AideanBot 已接 SSO + 网关（唯一完整接入），BotHot 尚未接网关 |
| **结论** | **成立**。BotHot 复用 AideanBot 的 SSO 接入路径（`oidc_clients` 已有 `wechat-rag` 行），新增 `bothot-web` client；Phase 2 接入网关 |

### D5：AideanWiki 延期 — 知识适配器模式

| 维度 | 内容 |
|------|------|
| **决策** | 一期不建独立 AideanWiki，用知识适配器统一各平台 KB 接口 |
| **支持证据** | Wiki 无仓库无端口段；BotHot KB（LangBot）已运行；Thesis 有 knowledge module |
| **反对/风险** | 知识分散，跨平台检索需多跳 |
| **结论** | **维持**。一期：BotHot KB 暴露统一检索 API（`/api/v1/kb/search`），Thesis knowledge 经适配器调用；二期：数据量 > 100GB 时提取独立知识服务 |

### D6：Thesis 身份替换 — 删除自建 JWT，接入主平台 OIDC

| 维度 | 内容 |
|------|------|
| **决策** | AideanThesis 删除 `jwt_provider.py`（python-jose + bcrypt），改用主平台 OIDC 授权码流 |
| **支持证据** | ADR-0003 铁律 1："`sub` 为唯一跨平台身份键"；Thesis 端口 3400 已在规划段内 |
| **反对/风险** | Thesis 有本地 Organization/Role 模型，OIDC 替换需迁移 |
| **结论** | **成立**。保留 Thesis 本地 Organization/Role（业务角色），身份认证委托主平台；`sub` → 本地 `user.external_id` 映射；新增 `oidc_clients.thesis-web`（redirect_uri=`http://localhost:3400/auth/callback`） |

### D7：溯源数据模型 — 统一 Provenance 图

| 维度 | 内容 |
|------|------|
| **决策** | 定义统一 Provenance 数据模型，各平台产出物必须携带溯源元数据 |
| **支持证据** | ChatGPT 评审指出"provenance as flat JSON"是第 3 大失败点；Fleet reviewer 已有证据链概念 |
| **结论** | 统一模型：`Asset → Artifact → Source → ProvenanceEdge → Event → ContentHash`；每个 Artifact 必须记录：来源 Asset、生成 Event（模型/参数/prompt）、ContentHash（内容指纹） |

### D8：统一计费预聚合 — 避免热查询

| 维度 | 内容 |
|------|------|
| **决策** | UsageLog 小时级写入，按天预聚合到 `usage_daily` 表，查询走聚合表 |
| **支持证据** | ChatGPT 评审指出"billing hot queries"是第 2 大失败点 |
| **结论** | 聚合任务每小时跑一次（Celery beat），查询 API 默认查 `usage_daily`，实时查询走 `UsageLog`（仅限当日） |

### D9：端口分配 — 半开区间 + CI 守卫

| 维度 | 内容 |
|------|------|
| **决策** | 五段半开区间：Aidean[3000,3100) / Fleet[3100,3200) / BotHot[3200,3300) / Bot[3300,3400) / Thesis[3400,3500) |
| **支持证据** | 各平台 AGENTS.md 已固化端口段；CI port gating 作为 SSOT |
| **结论** | **维持**。CI 守卫脚本检查所有 docker-compose 端口映射是否在归属段内；AideanCompany 待定段（候选[3500,3600)） |

### D10：LLM Gateway 模式 — 连接池 + 流式透传

| 维度 | 内容 |
|------|------|
| **决策** | 主平台网关作为唯一 LLM 出口，子平台经网关调用；网关维护 provider 连接池 + SSE 流式透传 |
| **支持证据** | 网关已落地五态 billingPath + hold/capture/void；BotHot 直连 SiliconFlow 是缺口 #4 |
| **结论** | 子平台删除直连 provider 的代码，改为调用 `POST https://aidean/api/v1/gateway/chat`（Bearer token = 子平台 service token）；网关负责路由/限流/计费/缓存/SSE 透传 |


---

## 五、子平台接入规范

### 5.1 OIDC 接入清单（每个子平台必做）

| 步骤 | 操作 | 代码位置 | 验证方式 |
|:----:|------|----------|----------|
| 1 | 主平台 `oidc_clients` 表新增一行（clientId/redirectUri/scopes/pkceRequired） | Aidean `prisma/seed` | `SELECT * FROM oidc_clients` |
| 2 | 子平台实现 `/auth/login` → 302 重定向到主平台 `/oauth/authorize` | 子平台后端 | curl -I `/auth/login` 检查 302 |
| 3 | 子平台实现 `/auth/callback` → 换 code → 建 session | 子平台后端 | E2E 登录测试 |
| 4 | 子平台 JWKS 缓存 → 本地验签（RS256） | 子平台中间件 | 伪造 token 应 401 |
| 5 | 子平台 `/auth/logout` → 调主平台 back-channel logout → 清 session | 子平台后端 | 登出后全端失效 |
| 6 | 子平台 LLM 调用改走网关 `POST /api/v1/gateway/chat`（Bearer = service token） | 子平台 LLM 客户端 | 网关 UsageLog 有记录 |
| 7 | 子平台余额展示调 `GET /api/v1/internal/billing/wallet`（client credentials） | 子平台前端 | 余额与主平台一致 |

### 5.2 各平台接入状态与改造量

| 平台 | SSO | 网关 | 余额 | 编排 | 改造量 | 优先级 |
|------|:---:|:----:|:----:|:----:|--------|:------:|
| BotHot | ✅ | ❌ → Phase 2 | ❌ → Phase 2 | ❌ → Phase 3 | 小（SSO 已有，加网关代理） | P1 |
| AideanBot | ✅ | ✅ | ✅ | ❌ | 零（已完整接入） | — |
| AideanFleet | ❌ → Phase 1 | ❌ → Phase 1 | ❌ → Phase 1 | ✅ 本体 | 中（加 OIDC + billing_adapter + HttpExecutor） | P1 |
| AideanThesis | ❌ → Phase 1 | ❌ → Phase 2 | ❌ → Phase 2 | ❌ → Phase 3 | 大（删 JWT + 加 OIDC + 加网关 + 加 internal task 端点） | P2 |
| AideanCompany | ❌ → Phase 3 | ❌ → Phase 3 | ❌ → Phase 3 | ❌ → Phase 3 | 大（设计阶段，需先定端口段） | P3 |

### 5.3 端口分配总表

| 段 | 归属 | 已用端口 | 服务 |
|:---:|------|----------|------|
| [3000,3100) | Aidean 主平台 | 3000 (Web), 3001 (API) | Next.js + Prisma |
| [3100,3200) | AideanFleet | 3100 (控制台) → 需从 5000 迁移 | FastAPI + SQLite |
| [3200,3300) | BotHot | 3200 (前端), 3201 (后端) → 需从 3300 迁移 | FastAPI + Next.js |
| [3300,3400) | AideanBot | 3333 (后端) | FastAPI |
| [3400,3500) | AideanThesis | 3400 (Web), 3401 (API), 3402 (PG), 3403 (Redis) | Next.js + FastAPI |
| [3500,3600) | AideanCompany（候选） | 待定 | FastAPI + Next.js |

---

## 六、事件驱动通信架构

### 6.1 事件信封规范

```json
{
  "event_id": "uuid_v4",
  "event_type": "thesis.submitted | bothot.hotspot_found | fleet.task_completed",
  "source": "aidean-thesis:3400",
  "target": "aidean-fleet:3100",
  "timestamp": "2026-09-30T12:00:00Z",
  "trace_id": "uuid_v4",
  "payload": { /* 事件特定数据 */ },
  "hmac_sha256": "base64(签名)"
}
```

### 6.2 事件流定义

| 事件 | 来源 | 目标 | 触发条件 | payload |
|------|------|------|----------|---------|
| `bothot.hotspot_found` | BotHot | Aidean (编排器) | 热点聚簇发现新热点 | `{cluster_id, articles[], score}` |
| `fleet.task_dispatched` | Fleet | 子平台 | DAG 调度到某节点 | `{task_id, taskpack, deadline}` |
| `fleet.task_completed` | 子平台 | Fleet | 任务执行完成 | `{task_id, evidence, artifacts[]}` |
| `thesis.submitted` | Thesis | Aidean (审计) | 论文提交查重 | `{doc_id, user_sub, version}` |
| `billing.hold_requested` | 子平台 | Aidean (网关) | 长任务预扣 | `{request_id, amount, user_sub}` |
| `billing.captured` | Aidean | 子平台 | 预扣确认 | `{request_id, actual_amount}` |
| `identity.user_logged_out` | Aidean | 全子平台 | back-channel logout | `{sub, token_version}` |

### 6.3 Outbox + Webhook 实现要点

- **Outbox 表**：`events_outbox (id, event_type, source, target, payload, created_at, dispatched_at, retry_count)`
- **轮询器**：主平台后台任务每 2s 扫 `dispatched_at IS NULL`，发 HTTP POST 到 target
- **HMAC 签名**：`HMAC-SHA256(shared_secret, event_id + timestamp + payload)`
- **重试**：失败指数退避（2s, 4s, 8s, 16s, 32s），max 5 次后标记 `failed`
- **幂等**：target 端用 `event_id` 去重
- **归档**：`dispatched_at < NOW() - 90d` 的行导出到 OBS 后删除

---

## 七、溯源数据模型（统一 Provenance）

### 7.1 核心实体

```
Asset（资产：用户上传的文件/URL/采集的文章）
  ├── Artifact（产物：AI 生成的内容/分析报告/论文初稿）
  │     └── ContentHash（内容指纹：SHA-256）
  ├── Source（来源：Asset 的出处信息）
  └── ProvenanceEdge（溯源边：Asset → Artifact 的生成关系）
        ├── Event（生成事件：模型/参数/prompt/时间戳）
        └── trace_id（关联全链 trace）
```

### 7.2 各平台产出物溯源要求

| 平台 | 产出物 | 必须记录 |
|------|--------|----------|
| BotHot | 热点日报 | 源文章 URL + 采集时间 + 聚簇算法 + 模型 + prompt |
| Thesis | 论文初稿 | 源文献列表 + AI 模型 + prompt + 版本号 + 查重报告 |
| Fleet | 任务报告 | 输入 Asset + 执行器 + 模型 + prompt + Evidence |
| Aidean | 网关调用 | user_sub + model + tokens + billingPath + requestId |

---

## 八、安全与治理

### 8.1 安全红线（ADR-0003 铁律 + 评审补充）

| # | 红线 | 现状 | 执行机制 |
|:---:|------|:----:|----------|
| R1 | `sub`（=主平台 User.id）为唯一跨平台身份键；禁止邮箱作外键 | ✅ ADR-0003 L1 | OIDC claims 审计 |
| R2 | 主平台为唯一余额写入权威；子平台零余额写权限 | ✅ ADR-0003 L1 | 网关计费 + wallet 只读 API |
| R3 | 跨注册域一律走 OIDC 授权码重定向，禁止跨域 Cookie 共享 | ✅ ADR-0003 L1 | redirect_uri 精确白名单 |
| R4 | PKCE 仅 S256；access token aud=clientId 隔离 | ✅ ADR-0005 | OIDC client 注册规范 |
| R5 | 子平台 LLM 调用必须经主平台网关 | ❌ 缺口 #4 | Phase 2 统一接入 |
| R6 | 事件传递必须 HMAC 签名 + 幂等消费 | ⏳ 待实现 | Outbox + Webhook 规范 |
| R7 | 各平台凭据只经环境变量注入，禁止入 Git | ✅ 既有 | CI secret 扫描 |

### 8.2 ADR 治理链

```
ADR-0005 (SSO 选型：自研 OIDC)
  └── ADR-0003 (多平台账号与余额共享路线：维持自研 IdP)
        └── 本设计文档 (多平台融合综合方案)
              ├── D1-D10 设计决策（受 ADR 锁定，不得偏离）
              └── 子平台接入规范（遵循 ADR-0003 铁律 1-5）
```

### 8.3 演进触发条件（ADR-0003 L5）

满足任一条件时重评成品 IAM（Casdoor/Keycloak/ZITADEL/Logto）：
1. 接入产品 > 5
2. 出现不受信第三方接入方
3. 企业客户要求 SAML/LDAP/SCIM
4. MCP/Agent 服务需要统一鉴权面


---

## 九、实施路线图

### Phase 0：现状收口（1-2 周）

| 任务 | 平台 | 依赖 | 验收标准 |
|------|------|------|----------|
| 端口迁移：Fleet 5000→3100 | Fleet | 无 | `curl localhost:3100/health` 200 |
| 端口迁移：BotHot backend 3300→3201 | BotHot | 无 | docker-compose 端口在 [3200,3300) |
| 共享实例端口映射（5300/5433/6380） | 全局 | 各平台 | CI port gating 通过 |
| `oidc_clients` 注册 BotHot/Thesis/Fleet | Aidean | 无 | `SELECT * FROM oidc_clients` 有 3 行新增 |

### Phase 1：身份统一（2-3 周）

| 任务 | 平台 | 依赖 | 验收标准 |
|------|------|------|----------|
| Fleet OIDC 接入（service credentials flow） | Fleet | Phase 0 | Fleet 任务带 `sub` 运行 |
| Thesis OIDC 替换 JWT（删 `jwt_provider.py`） | Thesis | Phase 0 | Thesis 登录跳转主平台 |
| Thesis 本地 Organization/Role 保留映射 | Thesis | 上一步 | `user.external_id = sub` |
| back-channel logout 全生态验证 | 全部 | 上两步 | 一处登出全端失效 |

### Phase 2：网关统一（2-3 周）

| 任务 | 平台 | 依赖 | 验收标准 |
|------|------|------|----------|
| BotHot LLM 改走网关 | BotHot | Phase 1 | 网关 UsageLog 有 BotHot 记录 |
| Thesis LLM 改走网关 | Thesis | Phase 1 | 网关 UsageLog 有 Thesis 记录 |
| Fleet billing_adapter（hold/capture/void） | Fleet | Phase 1 | Fleet 任务有预扣记录 |
| 余额展示统一（wallet 只读 API） | 全部 | 上三步 | 各平台余额与主平台一致 |
| 计费预聚合任务（Celery beat） | Aidean | 上三步 | `usage_daily` 表有聚合数据 |

### Phase 3：编排贯通（3-4 周）

| 任务 | 平台 | 依赖 | 验收标准 |
|------|------|------|----------|
| Fleet `HttpExecutor` 实现 | Fleet | Phase 2 | 可下发 HTTP task 到子平台 |
| 子平台 internal task 接收端点 | BotHot/Thesis | 上一步 | `POST /api/v1/internal/fleet/task` 200 |
| 事件 Outbox + Webhook | Aidean | 上一步 | 事件信封 + HMAC 签名验证 |
| 跨平台 DAG 示例（采集→写作→查证） | Fleet | 上两步 | 端到端 DAG 跑通 |
| 溯源 Provenance 数据模型落地 | 全部 | 上一步 | 每个 Artifact 有溯源边 |

### Phase 4：场景产品包（2-3 周）

| 任务 | 平台 | 依赖 | 验收标准 |
|------|------|------|----------|
| 五类用户 pipeline 预设 | Aidean | Phase 3 | 每类用户有 1 个 DAG 模板 |
| 知识适配器统一接口 | BotHot/Thesis | Phase 3 | `/api/v1/kb/search` 统一 |
| AideanCompany 定位与端口段 | Company | Phase 3 | 端口段分配 + OIDC 接入 |
| 可观测审计统一 trace | Aidean | 上三步 | 全链 trace_id 贯穿 |

---

## 十、性能与可扩展性

### 10.1 性能目标

| 指标 | 目标 | 依据 |
|------|------|------|
| OIDC 登录延迟 | < 500ms（JWKS 缓存命中） | RS256 本地验签零 RTT |
| 网关调用延迟 | < 100ms overhead（不含模型 RT） | 连接池 + SSE 透传 |
| 事件传递延迟 | < 5s（Outbox 轮询 2s + HTTP） | PG Outbox 轮询 |
| 余额查询延迟 | < 50ms | wallet 只读 API + 索引 |
| 计费预聚合 | 每小时一次，< 10s 完成 | `usage_daily` 聚合 |

### 10.2 扩展路径

| 场景 | 当前方案 | 扩展触发条件 | 扩展方案 |
|------|----------|--------------|----------|
| 事件量增长 | PG Outbox + Webhook | > 100K events/day | 引入 Redis Streams（仅事件层） |
| 知识库规模 | BotHot KB（LangBot） | > 100GB | 提取独立知识服务（AideanWiki） |
| 子平台数量 | 5 个 Spoke | > 10 个 | 重评成品 IAM（ADR-0003 L5） |
| 模型并发 | 网关连接池 | > 1000 QPS | 网关水平扩展 + 负载均衡 |
| 编排复杂度 | Fleet SQLite | > 100 并发 DAG | Fleet 迁移 PG 状态存储 |

---

## 十一、待确认事项与所需资源

### 11.1 需用户确认的决策

| # | 待确认事项 | 当前方案默认 | 影响 |
|:---:|-----------|--------------|------|
| Q1 | AideanCompany 最终定位（知识库 / Fleet Worker / 两者兼有） | 知识库 + Fleet Worker 候选 | 端口段分配 + 接入优先级 |
| Q2 | AideanWiki 是否一期建独立服务 | 延期（用知识适配器） | 知识层架构 |
| Q3 | AideanBot 退役时间表 | BotHot 接入完成后逐步退役 | 采集层单一化 |
| Q4 | 事件共享密钥（HMAC secret）分发方式 | 主平台生成，子平台 env 注入 | 安全实施 |
| Q5 | AideanCompany 端口段分配 | 候选 [3500,3600) | 端口总表 |

### 11.2 需用户提供的信息

| # | 信息 | 用途 | 紧急度 |
|:---:|------|------|:------:|
| I1 | AideanCompany 的完整需求文档或 design.md | 确定定位与接入方案 | 中 |
| I2 | AideanWiki 仓库地址（如有） | 知识层一期/二期决策 | 低 |
| I3 | 各子平台的生产域名（非 localhost） | OIDC redirect_uri 白名单 | 高（Phase 1 前） |
| I4 | HMAC 事件签名密钥生成方式（主平台生成 or 各自协商） | 事件通信安全 | 中 |
| I5 | PaperFree 官方凭证（Thesis BK-010/011） | Thesis 查重功能上线 | 低（Thesis 内部） |

### 11.3 不需额外资源即可推进的工作

- Phase 0 全部任务（端口迁移 + oidc_clients 注册）
- Phase 1 Fleet/Thesis OIDC 接入
- Phase 2 网关统一接入
- 事件 Outbox + Webhook 实现
- 溯源 Provenance 数据模型设计

---

## 十二、附录

### A. 设计文档索引

| 文档 | 行数 | 核心贡献 |
|------|------|----------|
| from_claude.md | 739 | 对抗性评审 7 失败点 + D1-D10 决策评估 + 需求覆盖矩阵 |
| from_chatgpt.md | 2592 | 红队评审 8 失败点 + 架构评估 + 安全清单 + 端口分配 |
| ADR-0003 | — | 自研 IdP 路线锁定 + 多平台铁律 1-5 |
| ADR-0005 | — | SSO 选型：自研 OIDC + RS256 + PKCE |
| 本文档 | — | 六平台源码实测 + 综合方案 + 实施路线图 |

### B. 术语表

| 术语 | 定义 |
|------|------|
| Hub-and-Spoke | 星型拓扑：Aidean 为中心 Hub，子平台为 Spoke |
| Control Plane | 控制面：身份/计费/模型配置/编排决策中心 |
| Data Plane | 数据面：各子平台业务数据存储与处理 |
| Outbox | 发件箱模式：PG 表暂存事件，后台轮询发出 |
| BalanceHold | 预扣结算：长任务前 hold 余额，完成后 capture 或 void |
| TaskPack | Fleet 任务包：DAG 节点的输入数据 + 执行指令 |
| Evidence | 查证证据：Fleet reviewer 产出的任务执行证据链 |
| Provenance | 溯源：从产物回溯到源资产的完整链路 |
| `sub` | OIDC Subject Identifier：主平台 User.id，唯一跨平台身份键 |

---

> 本文档为设计综合方案，受 ADR-0003/0005 锁定。任何偏离需先发 ADR 评审。
> 实施前需确认 §11.1 中的 Q1-Q5 和 §11.2 中的 I3（生产域名）。


---

## 十三、六份参考文档独特洞察综合

> 除 from_claude.md 和 from_chatgpt.md 外，另有 4 份参考文档（from_zcode.md / from_cline.md / from_deveco.md / from_cc.md）提供了独特洞察。以下仅列出**未被前文覆盖且经交叉验证有价值**的内容。

### 13.1 编排器归属争议 — Fleet vs 主平台内嵌

| 方案 | 来源 | 论据 | 论驳 | 本方案立场 |
|------|------|------|------|------------|
| A: Fleet 作为编排器 | from_claude / from_chatgpt / from_zcode / from_cline / from_cc | Fleet 已有 DAG + 10 状态机 + reviewer；端口-适配器模式天然适配 | Fleet 零接入需先补 OIDC + billing | **采纳（D2）** |
| B: 主平台内嵌编排器 | from_deveco（唯一） | 主平台已有 scheduler sidecar；避免新增编排组件；BotHot/Thesis 各有内部调度 | 违反 ADR-0005 "IdP 职责收敛"；主平台膨胀 | **否决**，但采纳其"不替代各平台内部调度"原则 |

**裁决**：编排器放 Fleet（D2 维持），但采纳 from_deveco 的约束："生态编排器只做跨平台 DAG 协调，不替代各平台内部调度"（BotHot 60s PushScheduler / Thesis Celery / Aidean scheduler 各自保留）。

### 13.2 事件基础设施争议 — PG Outbox vs Redis Streams

| 方案 | 来源 | 论据 | 论驳 | 本方案立场 |
|------|------|------|------|------------|
| PG Outbox + Webhook | from_chatgpt / from_deveco | 6 平台规模不需要 Kafka；PG 已有；Fleet 禁 Redis | 轮询延迟秒级 | **采纳（D3）** |
| Redis Streams | from_cc | at-least-once 语义；消费者组；低延迟 | 引入 Redis 运维税；Fleet 禁 Redis 铁律冲突 | **否决**，但保留为扩展路径 |

**裁决**：PG Outbox + HMAC Webhook（D3 维持）。Redis Streams 作为 > 100K events/day 时的扩展方案。

### 13.3 各文档独特贡献清单

#### from_zcode.md 独特洞察

| 洞察 | 内容 | 是否纳入本方案 |
|------|------|:--------------:|
| SkillsCloud 技能层 | skill = (input schema, output schema, endpoint) 三元组，可作 Fleet DAG 节点或网关意图路由 | ✅ §十三.4 |
| Fleet 双模式计费 | (a) 自备模型池：纯编排任务免费不走主账本；(b) SSO client 走网关：能力调用进统一余额享套餐 | ✅ §十三.5 |
| batchId 跨仓库 trace | UUIDv7 由编排层生成，穿入每段本地存储的 `metadata.batchId`；trace = 跨仓库搜索 + 拼接，非集中 DB | ✅ §七（溯源模型补充） |
| 八能力映射既有基建 | 明确展示 8 项用户需求全部有既有落地点（无绿地） | ✅ §二.2 |

#### from_cline.md 独特洞察

| 洞察 | 内容 | 是否纳入本方案 |
|------|------|:--------------:|
| 三向钢人论证编排器 | A=主平台内嵌（否决：违反 ADR-0005）B=新微服务（否决：违反铁律 5）C=Fleet（胜出） | ✅ §十三.1 |
| Embedding/Reranker 新计费类型 | 当前网关仅 chat；BotHot 的 Embedding/Reranker 也绕网关；需扩展 `embedding`/`rerank` meter 类型 | ✅ §十三.6 |
| 新铁律 6/7/8 | R6: 知识项必须携带溯源五元组；R7: 子平台禁止直连模型厂商；R8: pipeline 步骤产物 append-only | ✅ §八.1 |
| Thesis SSO 文档漂移 | 声称 Thesis 已实现 `sso_routes.py` | ❌ **经实测否决**：Thesis 仅有自建 JWT（register/login/refresh），无 SSO/OIDC 代码；文档中 "SSO" 实指 "SSOT" |

#### from_deveco.md 独特洞察

| 洞察 | 内容 | 是否纳入本方案 |
|------|------|:--------------:|
| 三标准 pipeline 模板 | P-研究型 / P-资讯型 / P-创作型，五类用户映射到 3 模板 + 配置 | ✅ §十三.7 |
| CloudEvents 事件信封 | `schema v1 (id/type/source/subject/time/trace_id/spec_version/data)` — 明确采用 CloudEvents 标准 | ✅ §六.1（升级信封规范） |
| 双语契约包 | 将 Thesis `packages/contracts`（TS + Pydantic 双形态）推广到全仓库 + CI 契约漂移检查 | ✅ §十三.8 |
| 降级矩阵 | Hub 宕 / 事件链路断 / 上游模型挂 / Fleet 不可用 / Wiki 不可用 — 每种有具体降级行为 | ✅ §十三.9 |
| 内容寻址存储 | sha256 快照不可变，引用不复用 | ✅ §七（溯源模型） |

#### from_cc.md 独特洞察

| 洞察 | 内容 | 是否纳入本方案 |
|------|------|:--------------:|
| 产品接入向导 | admin 5 步向导（slug → 回调 URL → 自动写 oidc_clients + products + 端口注册 + 生成 .env.example） | ✅ §十三.10 |
| 三层溯源对象模型 | Source（信源）→ Asset（内容资产）→ Artifact（产出物），统一 URI `aidean://<platform>/<entity>/<id>@<v>` | ✅ §七（升级溯源模型） |
| 溯源中枢 API | `POST /internal/provenance/register`、`GET /internal/provenance/{uri}`（返回祖先链 + hash 验证）、`GET /internal/provenance/verify/{uri}`（hash 比对检测篡改） | ✅ §十三.11 |
| 用户数据导出 | `/user/data-export` 一键导出（JSON-LD + 附件 zip，按 sub 隔离）— "可溯源不丢失"的验收标准 | ✅ §十三.12 |
| 自动化分级 L0-L3 | L0 手动 / L1 半自动（一键触发 + 人工确认）/ L2 条件触发 / L3 全托管（定时 + 阈值 + 重试 + 告警） | ✅ §十三.13 |
| 五场景模板 | 论文资料链 / 文献追踪链 / 晨间研报链 / 行业监测链 / 选题分发链 | ✅ §十三.7（与 from_deveco 三模板合并） |
| Scope 化授权清单 | `openid/profile/wallet:read/entitlement:read/knowledge:read/knowledge:write/workflow:run/billing:write(需评审)` | ✅ §十三.14 |

### 13.4 SkillsCloud 技能层（from_zcode.md）

```
skill = (input_schema, output_schema, endpoint)
```

- 可作 Fleet DAG 节点（`HttpExecutor` 调用 endpoint）
- 可作网关意图路由（网关根据用户意图匹配 skill → 路由到对应 endpoint）
- MVP 阶段：SkillsCloud 为规划中（无代码），用各子平台现有 API 作 stand-in
- 后续：skill 注册到主平台 `skills` 表，Fleet DAG 引用 skill_id

### 13.5 Fleet 双模式计费（from_zcode.md）

| 模式 | 场景 | 计费路径 | 余额来源 |
|------|------|----------|----------|
| (a) 自备模型池 | 纯编排任务（DAG 调度、reviewer 查证） | 不走主账本 | Fleet 自有 model-pool.json |
| (b) SSO client 走网关 | 能力调用（生成内容、分析） | 经网关 hold/capture/void | 主平台 wallet |

实现：Fleet `billing_adapter.py` 根据 `billingMode` 字段选择路径；模式 (a) 零余额交互，模式 (b) 走 D2 的 HttpExecutor + 网关代理。

### 13.6 网关扩展 — Embedding/Reranker 计费类型（from_cline.md）

当前网关仅有 `chat` 计费类型。BotHot 的 Embedding（向量化）和 Reranker（重排序）调用也绕过网关。需扩展：

| meter_type | 计费单位 | 调用方 |
|------------|----------|--------|
| `chat` | token 数 | 所有子平台 LLM 对话 |
| `embedding` | token 数（输入） | BotHot 向量化、Thesis 文献向量化 |
| `rerank` | 文档数 | BotHot 检索重排 |

网关路由：`POST /api/v1/gateway/{chat|embedding|rerank}`，统一走 billingPath 五态。

### 13.7 场景 pipeline 模板（from_deveco.md + from_cc.md 合并）

from_deveco 提出三模板，from_cc 提出五模板。合并为**三模板 + 五配置**：

| 模板 | 触发 | 步骤 | 适用用户 |
|------|------|------|----------|
| **P-研究型** | 定时(cron) / 事件(新文献) | 采集→知识入库→分析→写作→查证→导出 | 大学生、科研人员 |
| **P-资讯型** | 定时(每日) / 事件(热点) | 采集→聚簇→评分→日报→推送 | 金融研究员、行业分析员 |
| **P-创作型** | 手动 / 事件(素材就绪) | 采集→选题→成稿→查重→分发 | 自媒体博主 |

五配置 = 三模板 × 用户类型参数差异（模型档位 / 预算上限 / 查证强度 / 推送渠道 / 输出格式）。

### 13.8 双语契约包（from_deveco.md）

将 AideanThesis 的 `packages/contracts`（TypeScript types ↔ Pydantic schemas 双形态）推广到全生态：

```
packages/contracts/
  ├── typescript/    # TS 类型定义（前端用）
  ├── python/        # Pydantic schemas（后端用）
  └── openapi.yaml   # OpenAPI 3.1 规范（SSOT）
```

CI 契约漂移检查：每个仓库的本地契约 vs Aidean OpenAPI snapshot diff → 不一致则 CI 失败。

### 13.9 降级矩阵（from_deveco.md）

| 故障场景 | 影响范围 | 降级行为 | 恢复条件 |
|----------|----------|----------|----------|
| Hub（主平台）宕 | 全生态登录/计费 | 子平台 JWKS 缓存宽限 15min（已登录用户可用）；新登录不可用；网关不可用→子平台只读 | Hub 恢复 + 健康探针通过 |
| 事件链路断 | 跨平台编排 | Outbox 积压不投递；子平台本地任务继续 | 链路恢复后积压事件按序投递 |
| 上游模型挂 | LLM 调用 | 网关自动回退到备用模型（UserModelPriority 1-99） | 上游恢复或手动切换 |
| Fleet 不可用 | 跨平台编排 | 各子平台内部调度继续（PushScheduler/Celery） | Fleet 恢复 |
| Wiki/KB 不可用 | 知识检索 | 返回缓存结果 + 降级标记 | 知识服务恢复 |

### 13.10 产品接入向导（from_cc.md）

主平台 admin 界面新增 5 步向导：

| 步骤 | 操作 | 自动生成 |
|:----:|------|----------|
| 1 | 输入 slug（如 `bothot`） | clientId = `bothot-web` |
| 2 | 输入回调 URL（如 `https://bothot.aidean.com/auth/callback`） | redirect_uri 白名单 |
| 3 | 选择 scopes | 授权清单 |
| 4 | 确认端口段 | 端口注册表 |
| 5 | 确认 | `oidc_clients` 行 + `products` 行 + `.env.example` 密钥清单 |

目的：消除手动复制粘贴注册错误（BotHot 3200 未注册是反例）。

### 13.11 溯源中枢 API（from_cc.md）

主平台新增溯源中枢端点（server-to-server，client credentials）：

| 端点 | 方法 | 功能 |
|------|------|------|
| `/internal/provenance/register` | POST | 注册 Asset/Artifact + ProvenanceEdge |
| `/internal/provenance/{uri}` | GET | 返回祖先链 + hash 验证 |
| `/internal/provenance/verify/{uri}` | GET | hash 比对检测篡改 |
| `/internal/trace?batchId=` | GET | 按 batchId 聚合全链 trace |

统一 URI 格式：`aidean://<platform>/<entity>/<id>@<version>`

### 13.12 用户数据导出（from_cc.md）

`GET /user/data-export` → 一键导出（JSON-LD + 附件 zip，按 `sub` 隔离）

- 包含：用户资产、产物、溯源链、计费记录、事件日志
- 格式：JSON-LD（可机器读） + 附件 zip
- 用途："可溯源不丢失"的验收标准 + GDPR 合规

### 13.13 自动化分级（from_cc.md）

| 级别 | 名称 | 定义 | 示例 |
|:----:|------|------|------|
| L0 | 手动 | 人工全流程 | 手动采集→手动写作→手动查重 |
| L1 | 半自动 | 一键触发 + 人工确认 | 一键启动 DAG → 人工确认产物 |
| L2 | 条件触发 | 事件触发 + 自动执行 | 新文献入库 → 自动分析 → 人工审阅 |
| L3 | 全托管 | 定时 + 阈值 + 重试 + 告警 | 每日 6:00 自动研报 → 自动推送 → 失败告警 |

五类用户目标级别：大学生 L1 / 科研 L2 / 金融 L3 / 行业 L2 / 自媒体 L3

### 13.14 Scope 化授权清单（from_cc.md）

| Scope | 用途 | 授权对象 |
|-------|------|----------|
| `openid` | OIDC 基础 | 所有子平台 |
| `profile` | 用户基本信息 | 所有子平台 |
| `wallet:read` | 余额只读 | 所有子平台 |
| `entitlement:read` | 权益快照（tier + 套餐 + 免费配额） | 所有子平台 |
| `knowledge:read` | 知识库检索 | BotHot / Thesis / Company |
| `knowledge:write` | 知识库写入 | BotHot / Thesis |
| `workflow:run` | DAG 编排触发 | Fleet |
| `billing:write` | 计费写入（需评审） | 仅网关内部 |

每个子平台按最小权限原则申请 scope，`oidc_clients` 表 `scopes` 字段精确白名单。
