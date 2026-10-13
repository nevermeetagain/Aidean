# 多平台融合设计 — 评审协议差距分析与补缺报告

> **文档类型**：评审协议差距分析（阶段 A 只读分析）
> **分析日期**：2026-09-30
> **分析依据**：AI Project Decision Review Protocol V2.1
> **分析对象**：summary.md（696 行，13 章节）
> **状态**：Active

---

## 一、Analysis Snapshot

```yaml
snapshot:
  analysis_date: 2026-09-30
  target_document: summary.md
  target_lines: 696
  target_sections: 13
  reference_docs: 8
  spec_docs: 3
  platform_repos: 6
  protocol_version: V2.1
  protocol_modules: 29
```

---

## 二、Requirement Baseline（需求基线）

> **差距**：summary.md 用 C1-C12 描述需求，但未原子化、未分 MUST/SHOULD/COULD/MUST NOT、未检查内部冲突。

### 2.1 原子功能需求（REQ-F）

| ID | 原子需求 | 来源 | 优先级 | 验证方式 |
|:---:|------|:---:|:---:|------|
| REQ-F-001 | OIDC 授权码流统一登录（7 端点 IdP） | C1/D1 | MUST | E2E 登录 + JWKS 验签 |
| REQ-F-002 | 单点登出（back-channel logout） | C1 | MUST | 登出后全端失效 |
| REQ-F-003 | JIT 建户（首次登录自动创建本地用户） | C1 | MUST | 新用户首次登录 |
| REQ-F-004 | 统一计费（余额套餐/预留结算/对账） | C2/D8 | MUST | 余额一致性测试 |
| REQ-F-005 | BalanceHold 预扣（hold/capture/void） | C2 | MUST | 长任务预扣流程 |
| REQ-F-006 | 统一 LLM 网关（/api/v1/gateway/chat） | C3/D10 | MUST | 网关 + UsageLog |
| REQ-F-007 | 网关 SSE 流式透传 | C3 | MUST | SSE 连接测试 |
| REQ-F-008 | 网关 provider 连接池/回退/缓存 | C3 | SHOULD | provider 故障回退 |
| REQ-F-009 | BotHot 采集（10 渠道+4 文章源+热点聚簇） | C4/D4 | MUST | 各渠道采集 |
| REQ-F-010 | 统一知识底座（摄取/混合检索/快照溯源） | C5/D5 | SHOULD | KB 检索+溯源 |
| REQ-F-011 | Thesis 生产交付（写作/模板/导出/审阅/查重） | C6 | MUST | 论文全流程 |
| REQ-F-012 | Fleet 查证证据链 | C7/D7 | MUST | reviewer 证据链 |
| REQ-F-013 | Fleet 自动化编排（DAG/预算门/审批门） | C8/D2 | MUST | DAG+门控测试 |
| REQ-F-014 | Fleet HttpExecutor（跨平台任务分发） | C8/D2 | MUST | HTTP 任务派发 |
| REQ-F-015 | 场景产品包（五类用户 pipeline 预设） | C9 | SHOULD | 5 类场景测试 |
| REQ-F-016 | 可观测审计（trace 全链/四金指标） | C10 | MUST | 全链 trace |
| REQ-F-017 | 事件驱动通信（PG Outbox+HMAC Webhook） | D3 | MUST | 事件投递+幂等 |
| REQ-F-018 | 统一 Provenance 溯源元数据 | D7 | MUST | 溯源链完整 |
| REQ-F-019 | 子平台通过网关代理调用 LLM | D10 | MUST | 无直连代码 |
| REQ-F-020 | Thesis 删 JWT 接入 OIDC | D6 | MUST | 无 jwt_provider.py |
| REQ-F-021 | 端口半开区间+CI 守卫 | D9 | MUST | CI 端口检查 |
| REQ-F-022 | 插件接口冻结+新平台接入清单 | C11 | SHOULD | 新平台接入 |

### 2.2 原子非功能需求（REQ-NF）

| ID | 原子需求 | 优先级 | 验收指标 | 指标状态 |
|:---:|------|:---:|------|:---:|
| REQ-NF-001 | OIDC 登录延迟 < 500ms | MUST | P95 < 500ms | 已有 |
| REQ-NF-002 | 网关 overhead < 100ms | MUST | P95 < 100ms | 已有 |
| REQ-NF-003 | 事件传递延迟 < 5s | MUST | P99 < 5s | 已有 |
| REQ-NF-004 | 余额查询延迟 < 50ms | MUST | P95 < 50ms | 已有 |
| REQ-NF-005 | 计费预聚合 < 10s | SHOULD | 执行时间 < 10s | 已有 |
| REQ-NF-006 | 系统可用性 >= 99.9% | SHOULD | 月度可用率 | **缺失** |
| REQ-NF-007 | 事件投递幂等性 | MUST | 重复无副作用 | **缺失量化** |
| REQ-NF-008 | HMAC 防篡改 | MUST | 篡改被拒绝 | **缺失量化** |
| REQ-NF-009 | 数据备份 RTO < 30min | SHOULD | 灾备恢复时间 | **缺失** |
| REQ-NF-010 | 网关不可用时降级只读 | SHOULD | 降级验证 | **缺失量化** |

### 2.3 约束需求（REQ-C）

| ID | 约束 | 来源 | 优先级 |
|:---:|------|:---:|:---:|
| REQ-C-001 | `sub` 为唯一跨平台身份键 | ADR-0003 | MUST |
| REQ-C-002 | 自研 IdP（不引入 Keycloak/Auth0） | ADR-0003 | MUST |
| REQ-C-003 | OIDC + RS256 + PKCE | ADR-0005 | MUST |
| REQ-C-004 | 各子平台独立数据库 | §3.3 | MUST |
| REQ-C-005 | 控制面不存子平台业务数据 | §3.3 | MUST |
| REQ-C-006 | 子平台零模型配置 | §3.3/D10 | MUST |
| REQ-C-007 | 事件量 < 10K/day | D3 | MUST |
| REQ-C-008 | Fleet 零依赖（SQLite+JSONL） | D2 | MUST |
| REQ-C-009 | 端口半开区间不重叠 | D9 | MUST |
| REQ-C-010 | AI 分析与正式 docs 隔离 | 协议§17 | MUST |

### 2.4 MUST NOT

| ID | 禁止 | 来源 |
|:---:|------|------|
| MN-001 | 子平台直连 LLM provider | D10 |
| MN-002 | 子平台持久化余额 | §3.3 |
| MN-003 | 引入 Kafka/Redis Streams 事件总线 | D3 |
| MN-004 | Thesis 自建 JWT | D6 |
| MN-005 | domain 层依赖 ORM/HTTP/Redis/SDK | 结构规范 |
| MN-006 | 跨模块访问 internal 文件 | 结构规范 |

### 2.5 需求内部冲突检查

| ID | 冲突对 | 描述 | 裁决 |
|:---:|------|------|------|
| C-001 | REQ-F-014 vs REQ-C-008 | HttpExecutor 引入出站 HTTP，可能打破零依赖 | **已解决**：D2 明确出站 HTTP 非外部服务依赖 |
| C-002 | REQ-F-010 vs D5 | 统一知识底座需独立服务，但 D5 延期 | **已解决**：一期适配器，二期独立 |
| C-003 | REQ-F-020 vs Thesis 本地角色 | OIDC 替换需迁移角色模型 | **已解决**：D6 保留本地角色 |
| C-004 | REQ-NF-010 vs REQ-F-013 | 降级只读 vs 编排需写操作 | **未解决**：降级模式下编排行为未定义 |


---

## 三、Document Lifecycle & Evidence Model

> **差距**：summary.md 引用 8 份参考文档但未标记生命周期、未建立证据模型。

### 3.1 文档生命周期

| ID | 文档 | 生命周期 | SC | 说明 |
|:---:|------|:---:|:---:|------|
| DOC-01 | summary.md | CURRENT | SC-DESIGN | 当前正式综合方案 |
| DOC-02 | from_claude.md | REFERENCE | SC-EXTERNAL | 对抗性评审 7 失败点 |
| DOC-03 | from_chatgpt.md | REFERENCE | SC-EXTERNAL | 红队评审 8 失败点 |
| DOC-04 | from_zcode.md | REFERENCE | SC-EXTERNAL | 架构评审 |
| DOC-05 | from_cline.md | REFERENCE | SC-EXTERNAL | 代码级评审 |
| DOC-06 | from_deveco.md | REFERENCE | SC-EXTERNAL | 开发者体验评审 |
| DOC-07 | from_cc.md | REFERENCE | SC-EXTERNAL | 架构评审 |
| DOC-08 | from_oc.md | REFERENCE | SC-EXTERNAL | 补充评审 |
| DOC-09 | from_workbuddy.md | REFERENCE | SC-EXTERNAL | 补充评审 |
| DOC-10 | ADR-0003 | ACTIVE | SC-DESIGN | 自研 IdP 路线锁定 |
| DOC-11 | ADR-0005 | ACTIVE | SC-DESIGN | SSO 选型 |
| DOC-12 | 各平台源码 | CURRENT | SC-CODE | 实际实现状态 |

### 3.2 关键 Claim 证据模型

| Claim | 文档 | 主张 | SC | S | A | P | Authority |
|:---:|:---:|------|:---:|:---:|:---:|:---:|:---:|
| CLM-001 | DOC-01 | Hub-and-Spoke 最优 | SC-DESIGN | S2 | A0 | P3 | TARGET |
| CLM-002 | DOC-01 | PG Outbox 优于 Kafka | SC-DESIGN | S2 | A0 | P3 | TECHNICAL |
| CLM-003 | DOC-01 | BotHot 为采集基座 | SC-DESIGN | S3 | A0 | P2 | REALITY |
| CLM-004 | DOC-01 | Thesis 无 SSO/OIDC | SC-CODE | S3 | A0 | P2 | REALITY |
| CLM-005 | DOC-01 | Fleet DAG+10 状态机就绪 | SC-CODE | S3 | A0 | P2 | REALITY |
| CLM-006 | DOC-01 | 网关五态 billingPath 已落地 | SC-CODE | S3 | A0 | P2 | REALITY |
| CLM-007 | DOC-02 | provenance flat JSON 是失败点 | SC-EXTERNAL | S1 | A0 | P6 | TECHNICAL |
| CLM-008 | DOC-03 | billing hot queries 是失败点 | SC-EXTERNAL | S1 | A0 | P6 | TECHNICAL |
| CLM-009 | DOC-06 | 主平台内嵌编排器优于 Fleet | SC-EXTERNAL | S1 | A0 | P6 | TARGET |
| CLM-010 | DOC-01 | 事件量 < 10K/day | SC-INFERRED | S1 | A0 | P7 | TECHNICAL |

### 3.3 独立性检查

| 主张 | 支持文档 | 独立性 | 实际来源 |
|------|----------|:---:|------|
| Hub-and-Spoke | DOC-02/03/04/05/07 | 独立 | 5 份独立评审一致 → S2 |
| PG Outbox | DOC-02/03 | 独立 | 2 份独立评审一致 → S2 |
| Fleet 编排器 | DOC-02/03/04/05/07 | 独立 | 5 份一致 → S2 |
| 事件量 < 10K/day | DOC-01 | 单一 | 推导值，无实际测量 → S1 |
| provenance 失败点 | DOC-02 | 单一 | 仅 Claude 提出 → S1 |

### 3.4 负证据

| 检查项 | 结果 | 说明 |
|------|:---:|------|
| AideanWiki 仓库存在 | NOT_FOUND | DOC-01 延期，无仓库 |
| AideanCompany 源码 | NOT_FOUND | 设计阶段，无完整源码 |
| 生产域名配置 | NOT_FOUND | §11.2 I3 待提供 |
| HMAC 密钥分发 | NOT_FOUND | §11.2 I4 待提供 |
| Thesis SSO 模块 | NOT_SUPPORTED | 源码确认无 sso_routes.py |

---

## 四、Cross-Document Conflict Matrix

> **差距**：summary.md 在 §13.1 提到了编排器归属争议，但未建立完整跨文档矩阵，未进行七分类。

### 4.1 决策点 × 文档矩阵

| 决策点 | DOC-02 Claude | DOC-03 ChatGPT | DOC-04 zcode | DOC-05 cline | DOC-06 deveco | DOC-07 cc | DOC-01 本方案 |
|--------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| D1 Hub-and-Spoke | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| D2 Fleet 编排器 | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| D3 PG Outbox | ✅ | ✅ | — | ✅ | — | — | ✅ |
| D4 BotHot 基座 | — | ✅ | — | — | — | — | ✅ |
| D5 Wiki 延期 | — | — | — | — | — | — | ✅ |
| D6 Thesis OIDC | ✅ | ✅ | — | ✅ | — | — | ✅ |
| D7 Provenance | ✅ | ✅ | — | — | — | ✅ | ✅ |
| D8 预聚合 | — | ✅ | — | — | — | — | ✅ |
| D9 端口分配 | — | ✅ | — | — | — | ✅ | ✅ |
| D10 网关统一 | ✅ | ✅ | ✅ | ✅ | — | — | ✅ |

### 4.2 冲突七分类

| 冲突 ID | 决策点 | 冲突方 | 冲突类型 | 描述 | 裁决 |
|:---:|------|------|:---:|------|------|
| CF-001 | D2 | DOC-06 vs DOC-02/03/04/05/07 | **方案冲突** | 目标一致（编排能力），路径不同（内嵌 vs Fleet 独立） | 采纳 Fleet，否决内嵌；保留 DOC-06 "不替代各平台内部调度"原则 |
| CF-002 | D3 | DOC-01 vs 隐含 Kafka 方案 | **方案冲突** | 目标一致（事件传递），路径不同 | PG Outbox 胜出（规模 < 10K/day） |
| CF-003 | D4 | DOC-05 声称 Thesis 有 SSO | **事实冲突** | DOC-05 声称 sso_routes.py 存在，源码验证不存在 | DOC-05 有误，"SSO"实为"SSOT"误称 |
| CF-004 | D5 | DOC-01 vs 隐含 Wiki 一期方案 | **阶段冲突** | 非方案冲突，是生命周期阶段差异 | 一期适配器，二期独立服务 |
| CF-005 | CLM-010 | DOC-01 事件量估算 | **假设冲突** | < 10K/day 为推导值，无实际测量 | 标记 S1，需实际验证 |

### 4.3 伪共识识别

| 主张 | 表面支持 | 实际 | 评级 |
|------|----------|------|:---:|
| Hub-and-Spoke 最优 | DOC-02/03/04/05/07 五份一致 | 5 份独立评审，无引用链 | S2 真共识 |
| PG Outbox 优于 Kafka | DOC-02/03 两份一致 | 2 份独立评审 | S2 真共识 |
| Fleet 为编排器 | DOC-02/03/04/05/07 五份一致 | 独立评审 | S2 真共识 |

**结论**：未发现伪共识。所有多源支持均来自独立评审，无引用传播链。


---

## 五、Decision Point Deep Review（D1-D10 补强）

> **差距**：summary.md 的 D1-D10 有钢人论证，但缺少 Socratic Challenge（8 问）、Counterexample、Counterfactual、Reversibility 评估。
> 以下对每个决策点补强缺失的评审协议要素。

### D1：Hub-and-Spoke 拓扑

**已有**：钢人论证 ✅ | 支持证据 ✅ | 反对/风险 ✅
**缺失**：Socratic | Counterexample | Counterfactual | Reversibility

| 评审项 | 内容 |
|--------|------|
| **Socratic Q1 最可能错在哪** | Hub 单点故障假设"多副本+健康探针"足够，但未考虑网络分区（split-brain） |
| **Q2 最依赖哪个前提** | 6 平台规模不需要去中心化 — 若平台数 > 10 则前提失效 |
| **Q3 前提不成立会怎样** | 需重评成品 IAM（ADR-0003 L5 已预留此触发条件） |
| **Q4 什么证据能推翻** | 实际运行中 Hub 故障导致全生态不可用的 incident 报告 |
| **Q5 技术偏好误当需求** | 无 — Hub-and-Spoke 来自 ADR-0003 铁律，非偏好 |
| **Q6 解决了不存在的问题** | 无 — 6 平台确实需要统一身份/计费 |
| **Q7 文档详细度影响权重** | 无 — 决策基于 ADR-0003 而非文档详细度 |
| **Q8 最强反例** | Hub 故障时全生态登录/计费不可用 — 降级模式（只读）部分缓解 |
| **Counterexample** | 若 Hub 网络分区，子平台 JWKS 缓存宽限期内可继续验签，但新登录失败 |
| **Counterfactual** | 平台数 > 10 → 触发 ADR-0003 L5 重评；Hub 故障 > 5min → 降级模式 |
| **Reversibility** | PARTIALLY_REVERSIBLE — 子平台已接入 OIDC 后，回退需各平台恢复独立认证 |
| **Reassessment Trigger** | 平台数 > 10；Hub 可用性 < 99.9%；ADR-0003 L5 触发 |

### D2：Fleet 编排器

| 评审项 | 内容 |
|--------|------|
| **Socratic Q1** | Fleet 零依赖铁律被"出站 HTTP 不引入外部服务依赖"重新定义，可能过于宽泛 |
| **Q2** | Fleet 已有 DAG+10 状态机 — 若状态机不覆盖新场景则需扩展 |
| **Q3** | 状态机不足 → 新增状态或改用其他编排器 |
| **Q4** | Fleet 无法处理某类编排场景的实例 |
| **Q5** | 无 — Fleet 选择基于已有能力，非偏好 |
| **Q6** | 无 — 跨平台编排是真实需求 |
| **Q7** | 无 |
| **Q8** | Fleet SQLite 在 > 100 并发 DAG 时性能瓶颈 |
| **Counterexample** | 若 DAG 节点需要等待外部回调（非同步 HTTP），当前 HttpExecutor 模型不完整 |
| **Counterfactual** | 并发 DAG > 100 → Fleet 迁移 PG 状态存储（§10.2 已预留） |
| **Reversibility** | REVERSIBLE — HttpExecutor 是新增 Executor，可移除 |
| **Reassessment Trigger** | 并发 DAG > 100；新增编排场景超出 10 状态机覆盖 |

### D3：PG Outbox + HMAC Webhook

| 评审项 | 内容 |
|--------|------|
| **Socratic Q1** | 事件量 < 10K/day 是推导值（S1），未经实际测量 |
| **Q2** | 6 平台规模 + PG 已有 |
| **Q3** | 事件量 > 100K/day → 引入 Redis Streams（§10.2 已预留） |
| **Q4** | 实际事件量测量 > 100K/day |
| **Q5** | 无 — 基于 PG 已有基建 |
| **Q6** | 无 — 事件驱动是真实需求 |
| **Q7** | 无 |
| **Q8** | PG Outbox 轮询延迟在高峰期可能 > 5s |
| **Counterexample** | 若 Outbox 表与业务表同库，高频写入导致锁竞争 |
| **Counterfactual** | 事件量 > 100K/day → Redis Streams；延迟要求 < 1s → 改用 LISTEN/NOTIFY |
| **Reversibility** | REVERSIBLE — 可平滑迁移到 Redis Streams（消费者模式不变） |
| **Reassessment Trigger** | 事件量 > 100K/day；延迟要求 < 1s |

### D4：BotHot 采集基座

| 评审项 | 内容 |
|--------|------|
| **Socratic Q1** | AideanBot 已完整接入 SSO+网关+余额，BotHot 尚未接网关 — 过渡期风险 |
| **Q2** | BotHot 是 AideanBot 升级版（AGENTS.md 明确） |
| **Q3** | BotHot 接入网关失败 → 保留 AideanBot |
| **Q4** | BotHot 某渠道适配器不稳定 |
| **Q5** | 无 |
| **Q6** | 无 |
| **Q7** | 无 |
| **Q8** | 过渡期两套采集系统并存，维护成本翻倍 |
| **Counterexample** | 若 BotHot 某渠道适配器质量低于 AideanBot，迁移后能力退化 |
| **Counterfactual** | BotHot 接入失败 → 保留 AideanBot；渠道需求变化 → 适配器扩展 |
| **Reversibility** | PARTIALLY_REVERSIBLE — AideanBot 退役后恢复成本高 |
| **Reassessment Trigger** | BotHot 接入网关失败；渠道需求超出 BotHot 适配器能力 |

### D5：AideanWiki 延期

| 评审项 | 内容 |
|--------|------|
| **Socratic Q1** | 知识适配器接口可能无法覆盖所有 KB 查询模式 |
| **Q2** | Wiki 无仓库无端口段 |
| **Q3** | 知识量 > 100GB → 提取独立服务 |
| **Q4** | 跨平台知识检索需多跳，性能不可接受 |
| **Q5** | 无 |
| **Q6** | 无 — 一期适配器是合理的渐进策略 |
| **Q7** | 无 |
| **Q8** | BotHot KB 和 Thesis knowledge 数据模型差异大，适配器复杂度超预期 |
| **Counterexample** | 若跨平台知识检索是核心场景，适配器多跳延迟影响用户体验 |
| **Counterfactual** | 知识量 > 100GB → 独立服务；检索延迟 > 2s → 独立服务 |
| **Reversibility** | REVERSIBLE — 适配器可平滑迁移到独立服务 |
| **Reassessment Trigger** | 知识量 > 100GB；跨平台检索延迟 > 2s |

### D6：Thesis OIDC 替换

| 评审项 | 内容 |
|--------|------|
| **Socratic Q1** | Thesis 本地 Organization/Role 模型与 OIDC scope 的映射可能不完整 |
| **Q2** | ADR-0003 铁律 1（sub 为唯一身份键） |
| **Q3** | 映射不完整 → 需补充 OIDC custom claim |
| **Q4** | Thesis 有依赖自建 JWT 的第三方集成 |
| **Q5** | 无 |
| **Q6** | 无 — 身份统一是真实需求 |
| **Q7** | 无 |
| **Q8** | Thesis 已有用户数据，迁移到 OIDC 后需数据迁移脚本 |
| **Counterexample** | 若 Thesis 有外部 API 消费者依赖其 JWT token，替换后需协调 |
| **Counterfactual** | 用户规模变化 → OIDC scope 扩展；Thesis 独立部署 → OIDC 配置变更 |
| **Reversibility** | IRREVERSIBLE — 删除 jwt_provider.py 后，回退需重新实现 |
| **Reassessment Trigger** | Thesis 外部集成需求；OIDC scope 不足 |

### D7：统一 Provenance

| 评审项 | 内容 |
|--------|------|
| **Socratic Q1** | Provenance 模型可能过于复杂，各平台实现成本高 |
| **Q2** | DOC-02 指出 "provenance as flat JSON" 是失败点 |
| **Q3** | 简化模型 → 溯源链不完整 |
| **Q4** | 各平台产出物不携带 Provenance 的实例 |
| **Q5** | 无 |
| **Q6** | 无 — 溯源是学术场景核心需求 |
| **Q7** | 无 |
| **Q8** | Provenance 图查询性能在大数据量下退化 |
| **Counterexample** | 若某平台产出物无法追溯（如手动导入），Provenance 链断裂 |
| **Counterfactual** | 数据量增长 → Provenance 归档 OBS；查询性能不足 → 图数据库 |
| **Reversibility** | PARTIALLY_REVERSIBLE — 模型可简化但已有数据迁移成本 |
| **Reassessment Trigger** | Provenance 查询延迟 > 1s；数据量 > 10M 条 |

### D8：计费预聚合

| 评审项 | 内容 |
|--------|------|
| **Socratic Q1** | 小时级聚合可能不够实时，当日实时查询走 UsageLog 可能慢 |
| **Q2** | DOC-03 指出 "billing hot queries" 是失败点 |
| **Q3** | 聚合频率提高 → 写入压力增加 |
| **Q4** | 实时查询延迟 > 50ms 的实例 |
| **Q5** | 无 |
| **Q6** | 无 — 计费查询性能是真实需求 |
| **Q7** | 无 |
| **Q8** | 聚合任务故障导致 usage_daily 不一致 |
| **Counterexample** | 若聚合任务故障，用户看到过期数据 |
| **Counterfactual** | 数据量增长 → 分钟级聚合；实时性要求提高 → 物化视图 |
| **Reversibility** | REVERSIBLE — 聚合策略可调整 |
| **Reassessment Trigger** | 实时查询延迟 > 50ms；聚合任务故障率 > 1% |

### D9：端口分配

| 评审项 | 内容 |
|--------|------|
| **Socratic Q1** | 半开区间预留空间可能浪费（每段 100 个端口） |
| **Q2** | 各平台 AGENTS.md 已固化 |
| **Q3** | 平台数 > 10 → 端口段不够 |
| **Q4** | 端口冲突的实例 |
| **Q5** | 无 |
| **Q6** | 无 — 端口管理是真实运维需求 |
| **Q7** | 无 |
| **Q8** | AideanCompany 端口段未定（Q5 待确认） |
| **Counterexample** | 若某平台需要 > 100 个端口（微服务拆分），半开区间不够 |
| **Counterfactual** | 平台数 > 10 → 重评端口策略 |
| **Reversibility** | PARTIALLY_REVERSIBLE — 端口迁移有成本但可执行 |
| **Reassessment Trigger** | 平台数 > 10；某平台需 > 100 端口 |

### D10：LLM Gateway 统一

| 评审项 | 内容 |
|--------|------|
| **Socratic Q1** | 网关单点故障导致全生态无法调用 LLM |
| **Q2** | 网关已落地五态 billingPath |
| **Q3** | 网关故障 → 子平台无法工作 |
| **Q4** | 网关故障 incident 报告 |
| **Q5** | 无 |
| **Q6** | 无 — 统一网关是真实需求（计费/限流/缓存） |
| **Q7** | 无 |
| **Q8** | 网关成为性能瓶颈（所有 LLM 调用经过） |
| **Counterexample** | 若某子平台需要特殊模型参数（网关不支持），需网关扩展 |
| **Counterfactual** | QPS > 1000 → 网关水平扩展；provider 故障 → 回退策略 |
| **Reversibility** | PARTIALLY_REVERSIBLE — 子平台删除直连后恢复需重新实现 |
| **Reassessment Trigger** | QPS > 1000；网关可用性 < 99.9%；新 provider 需求 |

### 决策可逆性总表

| 决策 | 可逆性 | 理由 |
|------|:---:|------|
| D1 Hub-and-Spoke | PARTIALLY | 子平台已接入 OIDC 后回退成本高 |
| D2 Fleet 编排器 | REVERSIBLE | HttpExecutor 可移除 |
| D3 PG Outbox | REVERSIBLE | 可迁移到 Redis Streams |
| D4 BotHot 基座 | PARTIALLY | AideanBot 退役后恢复成本高 |
| D5 Wiki 延期 | REVERSIBLE | 适配器可迁移到独立服务 |
| D6 Thesis OIDC | **IRREVERSIBLE** | 删除 jwt_provider.py 后回退需重新实现 |
| D7 Provenance | PARTIALLY | 模型可简化但数据迁移有成本 |
| D8 预聚合 | REVERSIBLE | 聚合策略可调整 |
| D9 端口分配 | PARTIALLY | 端口迁移有成本 |
| D10 网关统一 | PARTIALLY | 子平台删除直连后恢复需重新实现 |


---

## 六、NFR 审查与压力测试

### 6.1 NFR 指标化审查

| NFR | 当前指标 | 验收标准 | 指标来源 | 状态 |
|-----|----------|----------|----------|:---:|
| OIDC 登录延迟 | < 500ms | P95 < 500ms | §10.1 | ✅ 已有 |
| 网关 overhead | < 100ms | P95 < 100ms | §10.1 | ✅ 已有 |
| 事件传递延迟 | < 5s | P99 < 5s | §10.1 | ✅ 已有 |
| 余额查询延迟 | < 50ms | P95 < 50ms | §10.1 | ✅ 已有 |
| 预聚合执行 | < 10s | 执行时间 | §10.1 | ✅ 已有 |
| 系统可用性 | — | >= 99.9% | — | **【指标缺失】** |
| 事件幂等性 | — | 重复无副作用 | — | **【指标缺失：无量化】** |
| HMAC 防篡改 | — | 篡改被拒绝 | — | **【指标缺失：无量化】** |
| 备份 RTO | — | < 30min | — | **【指标缺失】** |
| 降级模式 | — | 网关不可用时只读 | — | **【指标缺失：无量化】** |
| JWKS 缓存宽限 | — | kid 双活已落地 | D1 | **【指标缺失：宽限期未量化】** |
| Webhook 重试 | max 5 次 | 指数退避 | D3 | ✅ 已有 |
| 事件保留 | 90 天 | 归档 OBS | D3 | ✅ 已有 |

**需用户/负责人定义的验收标准**：
1. 系统可用性目标（REQ-NF-006）
2. 备份 RTO/RPO（REQ-NF-009）
3. 降级模式具体行为（CONFLICT-004）
4. JWKS 缓存宽限期具体数值

### 6.2 Pressure Test 1：需求压力测试

> 如果最核心需求发生变化，方案还能否维持？

| 变化场景 | 影响范围 | 方案维持性 | 应对 |
|----------|----------|:---:|------|
| 新增第 7 个子平台 | OIDC 注册 + 端口段 + 接入清单 | ✅ | 按接入规范执行 7 步 |
| 某子平台需要独立 LLM provider（非走网关） | D10 网关统一铁律 | ❌ | 需发 ADR 评审偏离 |
| 知识库需求从 100GB 跃增到 500GB | D5 知识适配器 | ✅ | 触发二期独立知识服务 |
| 编排场景超出 10 状态机覆盖 | D2 Fleet 编排器 | ⚠️ | 需扩展状态机 |
| 事件量从 10K/day 增到 200K/day | D3 PG Outbox | ✅ | 触发 Redis Streams 扩展路径 |
| 用户要求子平台可见余额（非只读） | REQ-MN-002 禁止持久化余额 | ❌ | 需发 ADR 评审 |
| Thesis 需要保留自建认证（外部集成） | D6 删 JWT | ❌ | 需发 ADR 评审（IRREVERSIBLE 风险） |

**结论**：7 个变化场景中 3 个可维持、2 个需扩展、2 个需发 ADR。方案对核心需求变化有弹性，但对铁律性约束（D6/D10/MN-002）的变化需要正式评审。

### 6.3 Pressure Test 2：失败压力测试

> 如果关键组件失效，系统如何表现？

| 失效组件 | 影响范围 | 系统表现 | 降级策略 | 严重度 |
|----------|----------|----------|----------|:---:|
| Aidean Hub 完全不可用 | 全生态登录/计费/网关 | 新登录失败、新 LLM 调用失败 | JWKS 缓存宽限内已有 session 可用；子平台只读 | **高** |
| Fleet 编排器不可用 | 跨平台编排任务 | 新 DAG 无法启动 | 各平台内部调度不受影响 | 中 |
| BotHot 采集不可用 | 信息采集 | 无新采集数据 | 已有知识库可用 | 中 |
| PG Outbox 轮询卡死 | 事件传递 | 事件延迟 > 5s | 事件保留在 Outbox 表，轮询恢复后补发 | 中 |
| HMAC 密钥泄露 | 事件安全 | 伪造事件可能被接受 | 密钥轮换 + 事件签名验证 | **高** |
| 网关 provider 全部不可用 | LLM 调用 | 所有 LLM 请求失败 | 返回错误，子平台显示降级提示 | **高** |
| 某子平台数据库故障 | 该平台业务 | 该平台不可用 | 其他平台不受影响（独立数据库） | 低 |

**关键发现**：Hub 不可用是最高风险（全生态影响），当前降级策略"子平台只读"部分缓解但不够完整 — CONFLICT-004 降级模式下编排行为未定义。

### 6.4 Pressure Test 3：变化压力测试

> 如果未来更换 Provider/Model/Database/Deployment/用户规模/外部 API，方案是否需要推翻重建？

| 变化维度 | 变化内容 | 影响评估 | 需要推翻重建？ |
|----------|----------|----------|:---:|
| Provider 更换 | 网关新增/替换 LLM provider | 网关配置变更，子平台无感 | ❌ |
| Model 更换 | 新模型上线 | UserTierMapping 调整 | ❌ |
| Database 迁移 | Fleet SQLite → PG | §10.2 已预留扩展路径 | ❌ |
| Deployment 变化 | 从单机到 K8s | 各平台容器化已就绪 | ❌ |
| 用户规模 ×10 | 10K → 100K 用户 | 网关水平扩展 + 事件量重评 | ❌（触发扩展路径） |
| 用户规模 ×100 | 100K → 1M 用户 | 可能需成品 IAM + Kafka | ⚠️（ADR-0003 L5 触发） |
| 外部 API 失效 | PaperFree 查重 API 下线 | Thesis 查重功能不可用 | ❌（仅影响单一功能） |
| 新增外部集成 | 微信/支付宝支付 | payment 域新增 adapter | ❌ |


---

## 七、Code Reality Check（设计意图 vs 实际代码）

> 对每个平台声称的能力，与实际源码状态做 MATCH/PARTIAL/DIVERGED/MISSING 标注。
> **数据来源：子代理 explorer-3 对 6 个平台源码的逐文件检查（2026-09-30）**

### 7.1 Aidean（Hub / 主平台）

| 声称能力 | 实际状态 | 评级 | 证据 |
|----------|----------|:---:|------|
| 自研 IdP（OIDC 7+ 端点） | 全部实现：authorize/token/userinfo/introspect/revoke/consent + discovery + jwks | **MATCH** | `app/oauth/*/route.ts` 全部存在；RS256 签名；PKCE S256；Prisma: OidcClient, OidcUserConsent |
| LLM Gateway（/api/v1/gateway/chat） | 完整编排器：双格式解析/通道路由/预扣费/SSE 透传/幂等 | **MATCH** | `app/api/v1/gateway/chat/route.ts` + `lib/features/gateway/service.ts` |
| 统一计费（余额/套餐/预留/对账） | 三表分离：wallets(状态) + ledger_entries(不可变) + balance_holds | **MATCH** | 8 个 Prisma 模型；乐观锁 lockVersion；`/api/v1/billing/wallet` + `/internal/billing/wallet` |
| PG Outbox 事件 | **未实现** | **MISSING** | Prisma schema 无 outbox 模型；全代码库无 Outbox 字符串（仅 .example/history/ 归档有） |
| Provenance 模型 | **未实现** | **MISSING** | 无溯源相关代码 |
| OIDC client 注册端点 | **未实现** | **MISSING** | 无 client 注册 API |

**惊喜发现**：
- `lib/sync/` 有完整同步编排器（adapters/mappers/writers/cross-validator），但这是数据同步，非事件 Outbox
- **55+ Prisma 模型**，远超设计描述（含 LadderChart, FeatureFlag, SystemConfig, ScheduledScript 等）
- `packages/shared` 包含 Zod schemas + constants（billing/gateway/ladder/news）— 已有契约包雏形

### 7.2 AideanBot（Bot 平台）

| 声称能力 | 实际状态 | 评级 | 证据 |
|----------|----------|:---:|------|
| SSO 接入（完整 OIDC 流程） | authorize→token→userinfo→upsert→session 全链路 | **MATCH** | `providers/aidean/client.py` AideanProviderClient + `services/auth/service.py` |
| OIDC back-channel logout | 已实现，含本地 JWKS 验签 | **MATCH** | `logout_token.py` + `JwksVerifier` — 比最低要求更完整 |
| 余额查询（不落库铁律） | 实时查询 Hub `/api/v1/internal/billing/wallet` | **MATCH** | `AideanProviderClient.wallet()` |
| 网关代理调用 LLM | **未接入** — 直连 8 个 provider | **MISSING** | `providers/` 有 dajiala/detail/discovery/justoneapi/langbot/redfox/tikhub/wellbyte，无 gateway 调用 |
| 计费回写 | 无回写/充值/对账集成 | **PARTIAL** | 仅有 `channel_spend.py` 本地日预算护栏（非平台计费） |
| 多渠道采集 | 8 个内容 provider | **MATCH** | — |
| 状态机 | 独立 job 生命周期状态机 | **MATCH** | `services/state_machine.py` |

**关键修正**：AideanBot **未接入网关**，仍直连 LLM provider — 与设计声称的"已接入网关"冲突。

### 7.3 BotHot（热点平台）

| 声称能力 | 实际状态 | 评级 | 证据 |
|----------|----------|:---:|------|
| SSO 接入 | **已接入** — 与 AideanBot 相同实现 | **MATCH** | `providers/aidean/client.py` + `services/auth/` 完整 SSO |
| 10 渠道推送适配器 | 精确 10 个：bark/dingtalk/email/feishu/slack/telegram/web/webhook/wechat_clawbot/wechat_work | **MATCH** | `providers/push/` 每渠道独立 .py + base.py 抽象基类 |
| 热点聚簇 | 完整实现：embedding 召回 + 余弦相似 + LLM 批量判断 + 24h 半衰评分 | **MATCH** | `services/hot_cluster.py` + HotTopic/HotTopicArticle 模型 |
| 日报生成 | 自动日报 | **MATCH** | `services/daily_report.py` |
| 事件推送 | 定时推送编排 | **MATCH** | `services/event_push.py` + `services/push_scheduler.py` |
| KB/LangBot | 知识库服务 + LangBot provider | **MATCH** | `services/kb.py` + `providers/langbot/client.py` |
| 网关代理调用 LLM | **未接入**（设计标注 "NOT YET"） | **MISSING** | 无 gateway 代码 — **符合设计预期** |
| 余额查询 | **未接入** | **MISSING** | — |
| DDD 脚手架 | `apps/api/src/modules/` 9 模块四层分层但全是 .gitkeep | **DIVERGED** | 空脚手架 — 真实后端在 `backend/app/`（99 .py 文件） |

**关键修正**：BotHot **已接入 SSO**（我之前错误标注为 MISSING）。仍有 2 个 MISSING（网关/余额），但 SSO 已完成。

### 7.4 AideanCompany（企业平台）

| 声称能力 | 实际状态 | 评级 | 证据 |
|----------|----------|:---:|------|
| Fleet 编排系统 | 完整但独立实现（与 AideanFleet 平行） | **DIVERGED** | `fleet/console/console.py` 2276 行 + runner + dispatcher + DAG；设计未承认此重复 |
| 多 Agent 角色编排 | 11+ 角色配置（backend/frontend/PM/reviewer/worker 变体） | **MATCH** | `fleet/configs/` 11+ skill-backup 目录 |
| 契约系统 | 6 个 JSON schema（task_pack/state/event/evidence/completion/contracts-v1） | **MATCH** | `fleet/contracts/` |
| 实际执行状态 | 有真实任务输出（reply 文件/PRD/transcript） | **MATCH** | `fleet/projects/` + `fleet/state/` 有迁移审查/备份快照 |
| 薄后端（AideanBot 派生） | 2207 行：engines/subscriptions/kb/jobs | **PARTIAL** | `backend/app/` — AideanBot 派生的薄后端 |
| OIDC/SSO 接入 | **未接入** — 仅有本地 bearer token | **MISSING** | — |
| 网关接入 | **未接入** | **MISSING** | — |
| 端口段 | **未定** | **MISSING** | Q5 待确认 |
| Hermes A2A 集成 | 有计划文档 + skills-backup | **PARTIAL** | `实施方案-Hermes-A2A多Agent系统.md` 21KB |

**重大修正**：AideanCompany **不是设计阶段项目** — 有完整 fleet 编排系统（1973 .py 文件）、真实执行状态、11+ 角色配置。是与 AideanFleet **平行的** 编排系统实现（Windows 路径 + stdlib-only vs AideanFleet 的跨平台 + pip 依赖）。

### 7.5 AideanFleet（编排平台）

| 声称能力 | 实际状态 | 评级 | 证据 |
|----------|----------|:---:|------|
| DAG 编排 | 纯 Python DAG 引擎：get_ready_tasks/assert_acyclic/release_dependents | **MATCH** | `fleet/manager/dag.py` — 确定性依赖解析，无 LLM 参与 |
| 10 状态机 | **1 个状态机含 10 状态**（DRAFT→ASSIGNED→DOING→SUBMITTED→REVIEWING→DONE/PARTIAL/REWORK/BLOCKED/ESCALATED） | **DIVERGED** | 设计称"10 状态机"，实际是"10 状态的 1 个状态机" |
| HttpExecutor | 无此类名；有 `http_chat_transport()` + Transport 抽象 | **PARTIAL** | `fleet/models/transport.py` — 9 个 executor 适配器（claudecode/cline/codex/gemini/grok/hermes/opencode/fake/mock） |
| 零依赖（C 铁律） | SQLite + JSONL，无外部服务依赖 | **MATCH** | — |
| 预算门/审批门 | machine gates → LLM review → PASS/PARTIAL/REWORK/BLOCKED | **MATCH** | `fleet/manager/reviewer.py` + `fleet/gates/verify.py` |
| 治理模块 | approval/budget/report/store/usage | **MATCH** | `fleet/governance/` — 设计未明确提及的完整治理系统 |
| OIDC 接入 | **未接入**（设计标注 "NOT YET"） | **MISSING** | 仅基本 session auth（project-name unlock） |
| 网关接入 | **未接入** | **MISSING** | — |
| Hermes 启动模式 | 可通过 Hermes agent 启动 | **MATCH** | `fleet/launcher/hermes_entry.py` — 设计未提及 |

**关键修正**：设计声称"10 状态机"实际为"1 个 10 状态的状态机"——概念误称。

### 7.6 AideanThesis（论文平台）

| 声称能力 | 实际状态 | 评级 | 证据 |
|----------|----------|:---:|------|
| Python/FastAPI + DDD 架构 | **最规范的 DDD 架构** — 8 模块四层分层 | **MATCH** | `apps/api/src/modules/{ai,check,identity,knowledge,notification,review,system,thesis}/` 每域 domain/application/infrastructure/interfaces |
| 自建 JWT 认证 | python-jose + bcrypt（HS256 对称签名） | **MATCH** | `modules/identity/infrastructure/jwt_provider.py` — **D6 要求替换为 OIDC** |
| SSO/OIDC 接入 | **未接入**（设计标注 "NOT YET"） | **MISSING** | 无 OIDC 端点（from_cline.md 声称有误，已确认） |
| 写作/模板/导出 | 已实现 | **MATCH** | — |
| 审阅/查重 | 已实现（check + review 独立模块） | **MATCH** | — |
| 事件总线 + Celery | 异步任务处理 | **MATCH** | `src/core/event_bus.py` + `src/shared/celery_app.py` — 设计未提及 |
| SSE 支持 | Server-Sent Events | **MATCH** | `src/shared/sse.py` — 设计未提及 |
| 网关接入 | 待确认 | **PARTIAL** | — |

**关键发现**：AideanThesis 是**架构最规范的子平台**（严格 DDD 四层分层），但使用 HS256 对称 JWT（非 RS256），与 D6 OIDC 替换决策冲突。

### 7.7 代码现实检查总表（修正版）

| 平台 | MATCH | PARTIAL | DIVERGED | MISSING | 总能力数 |
|------|:---:|:---:|:---:|:---:|:---:|
| Aidean | 3 | 0 | 0 | 3 | 6 |
| AideanBot | 4 | 1 | 0 | 1 | 6 |
| BotHot | 6 | 0 | 1 | 2 | 9 |
| AideanCompany | 3 | 2 | 1 | 3 | 9 |
| AideanFleet | 5 | 1 | 1 | 2 | 9 |
| AideanThesis | 6 | 1 | 0 | 1 | 8 |
| **合计** | **27** | **5** | **3** | **12** | **47** |

### 7.8 跨平台接入状态矩阵（修正版）

| 平台 | SSO/OIDC | 网关 | 余额/计费 | 事件 Outbox | 关键差异 |
|------|:---:|:---:|:---:|:---:|------|
| **Aidean** | ✅ IdP (7+ 端点) | ✅ 完整网关 | ✅ 三表分离 | ❌ **未实现** | 设计声称有 Outbox 但代码无 |
| **AideanBot** | ✅ 完整 + backchannel | ❌ **直连 provider** | ⚠️ 只读查询 | ❌ | **网关未接入** — 与设计冲突 |
| **BotHot** | ✅ 已接入 | ❌ 未接入（符合设计） | ❌ 未接入 | ❌ | DDD 脚手架空壳 |
| **AideanCompany** | ❌ 本地 token | ❌ | ❌ | ❌ | **有完整 fleet**（非设计阶段） |
| **AideanFleet** | ❌ 基本 session | ❌ | ❌ | ❌ | 10 状态→1 个状态机 |
| **AideanThesis** | ❌ 本地 JWT | ⚠️ 待确认 | ❌ | ❌ | **架构最规范**（严格 DDD） |

### 7.9 关键发现（修正版）

1. **AideanBot 网关未接入**（MISSING）— 设计声称"已接入网关"，实际直连 8 个 provider — **设计-代码事实冲突**
2. **BotHot SSO 已接入**（MATCH）— 之前分析错误，BotHot 有与 AideanBot 相同的完整 SSO 实现
3. **AideanCompany 有完整 fleet 系统**（MATCH）— 非设计阶段项目，有 1973 .py 文件、真实执行状态、11+ 角色配置
4. **AideanFleet "10 状态机"是概念误称**（DIVERGED）— 实际为 1 个 10 状态的状态机
5. **AideanThesis 架构最规范**（MATCH）— 严格 DDD 四层分层，但 JWT→OIDC 替换是 IRREVERSIBLE
6. **Aidean 事件 Outbox 未实现**（MISSING）— 设计声称 PG Outbox + HMAC Webhook，代码完全不存在
7. **from_cline.md 事实冲突已确认** — 声称 Thesis 有 SSO 模块，实际不存在（SSOT vs SSO 混淆）
8. **BotHot DDD 脚手架是空壳**（DIVERGED）— `apps/api/src/modules/` 9 模块四层分层但全是 .gitkeep


---

## 八、源码级关键发现总结

> 以下 7 项发现来自子代理对 6 个平台源码的逐文件验证，是设计-代码差距的最终结论。

### 8.1 设计-代码重大差距

| # | 发现 | 严重度 | 设计声称 | 代码现实 |
|:---:|------|:---:|----------|----------|
| F1 | **事件 Outbox 完全未实现** | **高** | PG Outbox + HMAC Webhook + 7 事件类型 | Prisma 55+ 模型中无 outbox；全代码库无 Outbox/HMAC 事件签名代码 |
| F2 | **AideanCompany/AideanFleet 平行编排** | **高** | AideanFleet 是唯一编排器 | AideanCompany 有独立 fleet（1973 .py vs 62 .py），设计未承认此重复 |
| F3 | **AideanBot 网关未接入** | **高** | 已接入网关 | 直连 8 个 provider（tikhub/redfox/justoneapi/...），无 gateway 调用 |
| F4 | **"10 状态机"是概念误称** | 中 | 10 个状态机 | 1 个状态机含 10 状态（DRAFT→...→ESCALATED） |
| F5 | **BotHot DDD 脚手架是空壳** | 中 | 已迁移 DDD 架构 | `apps/api/src/modules/` 9 模块全是 .gitkeep；真实后端在 `backend/app/` |
| F6 | **AideanCompany 非设计阶段** | 中 | 早期阶段 | 有活跃执行状态、真实任务输出、11+ 角色配置、2276 行 console |
| F7 | **from_cline.md 事实冲突** | 低 | Thesis 有 SSO 模块 | 无 SSO（SSOT vs SSO 混淆） |

### 8.2 设计-代码正向惊喜

| # | 发现 | 说明 |
|:---:|------|------|
| P1 | **SSO 比设计更完整** | AideanBot + BotHot 均实现 backchannel logout + JWKS 验签，超出最低要求 |
| P2 | **AideanThesis 架构最规范** | 严格 DDD 四层分层 × 8 模块 + 事件总线 + Celery + Redis + SSE |
| P3 | **Aidean 55+ Prisma 模型** | 远超设计描述，含 FeatureFlag/SystemConfig/ScheduledScript 等运维模型 |
| P4 | **packages/shared 已有契约雏形** | Zod schemas + constants（billing/gateway/ladder/news）— 可直接演化为 contracts/ |
| P5 | **AideanFleet 有治理模块** | governance/（approval/budget/report/store/usage）— 设计未提及的完整治理系统 |
| P6 | **BotHot 有日报+定时推送** | daily_report.py + push_scheduler.py — 设计未提及的额外能力 |

### 8.3 最终行动优先级

| 优先级 | 行动项 | 阻塞阶段 |
|:---:|------|------|
| **P0** | Aidean 实现事件 Outbox（F1） | 跨平台事件通信 |
| **P0** | AideanBot 接入网关，消除直连 provider（F3） | D10 网关统一铁律 |
| **P0** | 明确 AideanCompany vs AideanFleet 编排分工（F2） | 架构一致性 |
| **P1** | BotHot 接入网关/余额（SSO 已完成） | 融合接入 |
| **P1** | Thesis JWT→OIDC 迁移（IRREVERSIBLE） | D6 身份统一 |
| **P1** | BotHot DDD 脚手架填充或删除（F5） | 架构清理 |
| **P2** | 修正设计文档"10 状态机"→"10 状态状态机"（F4） | 文档准确性 |
| **P2** | AideanCompany 纳入设计文档（F6） | 设计-代码对齐 |
