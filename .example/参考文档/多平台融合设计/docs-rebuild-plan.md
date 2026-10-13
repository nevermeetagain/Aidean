# 文档体系重建方案

> 基于《项目完整文档体系 v1.1》规范，对 Aidean 项目 docs/ 目录进行审计、目标设计、迁移规划。
> 生成日期：2026-09-30

---

## 一、现状审计

### 1.1 当前 docs/ 结构

```
docs/
├── ADR/                          # 7 个 ADR (ADR-0001 ~ ADR-0007)
├── architecture/                 # 6 个架构文档（API/技术/数据库/网关计费时序）
├── governance/                   # 5 个治理文档（开发流程/术语表/目录结构/经验教训）
├── plans/                        # 4 个计划文档（待决事项/待执行/未完成事项）
├── engineering/                  # 4 个工程文档（开发环境/测试验收/部署运维）
├── research/                     # 1 个研究文档（sso-balance-final-plan）
├── product/                      # 产品文档（requirements/ + design/ + modules/）
├── specs/                        # 20+ 个 spec 目录（每个含 spec.md, tasks.md, checklist.md）
├── archive/                      # 5 个归档文件
├── assets/                       # 静态资源
├── README.md                     # 19KB 文档根索引
├── 文档索引.md                   # 15KB 文档索引
└── 执行过程.md                   # 85KB 执行过程记录
```

### 1.2 与规范目标结构的差距矩阵

| 规范目标目录 | 当前对应 | 状态 | 差距描述 |
|-------------|----------|:---:|----------|
| `00_governance/` | governance/ + 文档索引.md | PARTIAL | 缺 project-map, stakeholders, risks, assumptions, dependencies |
| `01_product/` | product/ | PARTIAL | 缺 vision, roadmap, personas, scenarios |
| `02_requirements/` | product/requirements/ | PARTIAL | 缺 REQ-F/REQ-NF/REQ-C 三分类；缺 YAML front matter |
| `03_solution/` | architecture/ + ADR/ | PARTIAL | ADR 缺标准模板；缺 SOL 设计决策文档；缺反向追溯 |
| `04_planning/` | plans/ | PARTIAL | 缺 roadmap, milestones；现有文档为非正式格式 |
| `05_work-packages/` | specs/ | PARTIAL | 20+ 个 spec 缺 WP-ID 编号、缺 YAML front matter |
| `06_tasks/` | specs/*/tasks.md | PARTIAL | 任务内嵌于 specs，缺独立 Task-ID 编号 |
| `07_validation/` | engineering/测试与验收.md | MISSING | 缺独立验证文档、缺 VAL-ID 编号 |
| `08_knowledge/` | governance/经验教训.md + research/ | PARTIAL | 缺标准格式；research/ 内容单薄 |
| `09_archive/` | archive/ | PARTIAL | 缺归档原因记录、缺历史追溯链接 |

### 1.3 关键差距

1. **无 YAML front matter**：所有文档缺少规范要求的元数据
2. **无文档分类编号**：缺少 REQ-F-001, SOL-001, WP-001 等标准编号
3. **无双向追溯**：需求→设计→代码之间无双向链接
4. **无规范 document-index.md**：现有索引非规范格式
5. **无 project-map.md**：缺项目全景图
6. **specs/ 过度膨胀**：20+ 个 spec 目录无优先级分类
7. **执行过程.md 过大**：85KB 单文件，应拆分


---

## 二、目标文档结构设计

### 2.1 目标目录树

```
docs/
├── 00_governance/
│   ├── project-map.md              # 项目全景图：平台拓扑、端口分配、技术栈
│   ├── document-index.md           # 全文档注册表（规范格式）
│   ├── glossary.md                 # 术语表
│   ├── stakeholders.md             # 干系人清单
│   ├── risks.md                    # 风险登记册
│   ├── assumptions.md              # 假设清单
│   └── dependencies.md             # 外部依赖清单
│
├── 01_product/
│   ├── vision.md                   # 产品愿景：Aidean 生态定位
│   ├── roadmap.md                  # 产品路线图（Phase 0-4）
│   ├── personas.md                 # 5 类用户画像
│   └── scenarios.md                # 12 个能力场景
│
├── 02_requirements/
│   ├── REQ-F-001-身份统一.md
│   ├── REQ-F-002-LLM网关.md
│   ├── REQ-F-003-事件通信.md
│   ├── REQ-F-004-统一计费.md
│   ├── REQ-F-005-编排调度.md
│   ├── REQ-F-006-信息采集.md
│   ├── REQ-F-007-知识管理.md
│   ├── REQ-F-008-论文写作.md
│   ├── REQ-F-009-溯源追踪.md
│   ├── REQ-F-010-降级容错.md
│   ├── REQ-NF-001-性能.md
│   ├── REQ-NF-002-可用性.md
│   ├── REQ-NF-003-安全.md
│   └── REQ-C-001-约束.md
│
├── 03_solution/
│   ├── architecture.md             # 技术架构总览
│   ├── api-contract.md             # API 契约文档
│   ├── database-schema.md          # 数据库 schema
│   ├── gateway-billing-sequence.md
│   ├── SOL-001-hub-spoke.md        # 10 个设计决策文档
│   ├── SOL-002-fleet-orchestrator.md
│   ├── SOL-003-pg-outbox-event.md
│   ├── SOL-004-bothot-base.md
│   ├── SOL-005-wiki-defer.md
│   ├── SOL-006-thesis-oidc.md
│   ├── SOL-007-unified-provenance.md
│   ├── SOL-008-billing-preagg.md
│   ├── SOL-009-port-allocation.md
│   ├── SOL-010-llm-gateway.md
│   ├── ADR-0001 ~ ADR-0007.md     # 保留现有 7 个 ADR
│   └── _template-adr.md
│
├── 04_planning/
│   ├── roadmap.md                  # 实施路线图（Phase 0-4）
│   ├── current-plan.md
│   ├── milestones.md
│   └── pending-decisions.md
│
├── 05_work-packages/
│   ├── WP-001-bot-hot-onboarding.md
│   ├── WP-002-oidc-idp-impl.md
│   ├── WP-003-event-infra.md
│   ├── WP-004-thesis-jwt-migration.md
│   ├── WP-005-provenance-model.md
│   ├── WP-006-billing-unification.md
│   ├── WP-007-company-impl.md
│   └── _template-wp.md
│
├── 06_tasks/
│   ├── TASK-001 ~ TASK-N.md       # 从 specs/*/tasks.md 提取
│   └── _template-task.md
│
├── 07_validation/
│   ├── VAL-001-oidc-integration-test.md
│   ├── VAL-002-gateway-perf-test.md
│   ├── VAL-003-event-delivery-test.md
│   └── _template-val.md
│
├── 08_knowledge/
│   ├── lessons-learned.md
│   ├── research-sso-balance.md
│   ├── fusion-design-summary.md
│   └── reference-docs-index.md
│
├── 09_archive/
│   ├── README.md
│   └── (现有归档文件迁移)
│
└── assets/
```

### 2.2 文档编号规则

| 前缀 | 类型 | 格式 | 示例 |
|------|------|------|------|
| REQ-F | 功能需求 | REQ-F-NNN | REQ-F-001 |
| REQ-NF | 非功能需求 | REQ-NF-NNN | REQ-NF-001 |
| REQ-C | 约束 | REQ-C-NNN | REQ-C-001 |
| SOL | 设计决策 | SOL-NNN | SOL-001 |
| ADR | 架构决策记录 | ADR-NNNN | ADR-0001 |
| WP | 工作包 | WP-NNN | WP-001 |
| TASK | 任务 | TASK-NNNN | TASK-0001 |
| VAL | 验证 | VAL-NNN | VAL-001 |

### 2.3 YAML Front Matter 模板

```yaml
---
doc_id: REQ-F-001
title: 身份统一（OIDC）
type: requirement
status: current            # draft|current|superseded|archived
priority: MUST             # MUST|SHOULD|COULD|MUST-NOT
created: 2026-09-30
updated: 2026-09-30
author: Aidean Team
links:
  satisfies: []
  satisfied_by: [SOL-001, ADR-0003, ADR-0005]
  related: [REQ-F-002, REQ-NF-003]
  supersedes: []
  superseded_by: []
tags: [oidc, identity, sso]
---
```


---

## 三、迁移映射表

| 源文件 | 目标位置 | 操作 |
|--------|----------|:---:|
| docs/README.md | 00_governance/project-map.md | 改写 |
| docs/文档索引.md | 00_governance/document-index.md | 重构 |
| docs/governance/术语表.md | 00_governance/glossary.md | 迁移+YAML |
| docs/governance/开发流程.md | 00_governance/development-process.md | 迁移+YAML |
| docs/governance/目录结构文档.md | 00_governance/project-map.md | 合并 |
| docs/governance/经验教训.md | 08_knowledge/lessons-learned.md | 迁移+YAML |
| docs/product/requirements/需求文档.md | 02_requirements/ (拆分) | 拆分 |
| docs/product/design/功能设计文档.md | 03_solution/architecture.md | 合并 |
| docs/product/modules/子平台SSO接入指南.md | 03_solution/ (引用) | 引用 |
| docs/architecture/* | 03_solution/ | 迁移+YAML |
| docs/ADR/* | 03_solution/ | 迁移+YAML |
| docs/plans/* | 04_planning/ | 迁移+YAML |
| docs/engineering/测试与验收.md | 07_validation/ | 迁移+YAML |
| docs/engineering/部署运维.md | 04_planning/ | 迁移+YAML |
| docs/research/* | 08_knowledge/ | 迁移+YAML |
| docs/specs/*/spec.md | 05_work-packages/WP-NNN-*.md | 提取+YAML |
| docs/specs/*/tasks.md | 06_tasks/TASK-NNNN-*.md | 提取+YAML |
| docs/archive/* | 09_archive/ | 迁移 |
| docs/执行过程.md | 06_tasks/ (拆分) | 拆分 |

---

## 四、核心文档内容设计

### 4.1 project-map.md 内容大纲

- **平台拓扑图**：Hub-and-Spoke（Aidean Hub → 5 子平台）
- **端口分配表**：6 平台半开区间
- **技术栈矩阵**：各平台语言/框架/数据库
- **接入状态矩阵**：SSO/网关/余额/事件 各平台接入状态
- **CI/CD 拓扑**：各平台构建/部署流水线
- **外部依赖图**：LLM providers / PaperFree / 微信支付 / etc.

### 4.2 risks.md 内容大纲

从 gap-analysis.md §六.3 压力测试和 §十.2 关键风险提取：

| 风险 ID | 描述 | 严重度 | 概率 | 缓解策略 |
|---------|------|:---:|:---:|----------|
| RISK-001 | Hub 单点故障 | 高 | 低 | 多副本+健康探针+降级模式 |
| RISK-002 | BotHot 过渡期 3 个 MISSING | 高 | 高 | Phase 0 优先接入 |
| RISK-003 | D6 Thesis JWT→OIDC 不可逆 | 高 | 中 | 执行前确认无外部 JWT 依赖 |
| RISK-004 | HMAC 密钥泄露 | 高 | 低 | 密钥轮换+签名验证 |
| RISK-005 | AideanCompany 完全 MISSING | 中 | — | Phase 1 实现需 I-05 |
| RISK-006 | CONFLICT-004 降级模式未定义 | 高 | 中 | 需用户补充 I-03 |

### 4.3 REQ-F-001-身份统一.md 内容大纲

```markdown
---
doc_id: REQ-F-001
title: 身份统一（OIDC）
type: requirement
status: current
priority: MUST
created: 2026-09-30
updated: 2026-09-30
links:
  satisfied_by: [SOL-001, ADR-0003, ADR-0005]
  related: [REQ-F-002, REQ-NF-003, REQ-C-001]
tags: [oidc, identity, sso]
---

# REQ-F-001：身份统一（OIDC）

## 需求描述
所有子平台用户通过 Aidean Hub 的 OIDC IdP 统一认证，
sub 为唯一身份键，各平台禁止自建独立认证体系。

## 验收标准
- OIDC 登录延迟 P95 < 500ms
- 7 个 OIDC 端点全部实现
- JWKS 缓存宽限期内 Hub 故障不影响已有 session
- 所有子平台接入 OIDC（BotHot 待接入 = 风险）

## 追溯
- 满足：用户场景 S1（统一登录）
- 被满足于：SOL-001（Hub-and-Spoke）, ADR-0003, ADR-0005
- 相关约束：REQ-C-001（端口分配）, REQ-NF-003（安全）
```

### 4.4 SOL-001-hub-spoke.md 内容大纲

```markdown
---
doc_id: SOL-001
title: Hub-and-Spoke 拓扑
type: decision
status: current
priority: MUST
created: 2026-09-30
updated: 2026-09-30
links:
  satisfies: [REQ-F-001, REQ-F-002, REQ-F-004]
  related: [ADR-0003, SOL-006, SOL-010]
tags: [architecture, topology, hub-spoke]
---

# SOL-001：Hub-and-Spoke 拓扑

## 决策
Aidean 作为 Hub，5 个子平台作为 Spoke，通过 OIDC+网关+事件连接。

## 钢人论证
[从 summary.md D1 提取]

## Socratic Challenge
[从 gap-analysis.md §五 D1 提取]

## 可逆性
PARTIALLY_REVERSIBLE — 子平台已接入 OIDC 后回退成本高

## 重评触发条件
- 平台数 > 10
- Hub 可用性 < 99.9%
- ADR-0003 L5 触发
```

---

## 五、实施步骤

### Phase 1：创建目录结构 + 治理文档

1. 创建 `00_governance/` ~ `09_archive/` 目录
2. 生成 project-map.md（从 README.md + 目录结构文档.md 提取）
3. 生成 document-index.md（全文档注册表）
4. 迁移 glossary.md, stakeholders.md, risks.md, assumptions.md, dependencies.md

### Phase 2：生成需求 + 解决方案文档

5. 从 summary.md 12 个能力拆分为 REQ-F-001 ~ REQ-F-010
6. 从 gap-analysis.md NFR 拆分为 REQ-NF-001 ~ REQ-NF-003
7. 从 summary.md D1-D10 生成 SOL-001 ~ SOL-010
8. 为现有 7 个 ADR 补充标准 YAML front matter
9. 建立双向追溯链接

### Phase 3：迁移计划 + 工作包 + 任务

10. 迁移 plans/ → 04_planning/
11. 从 summary.md Phase 0-4 生成 roadmap.md
12. 从 specs/ 提取工作包 → 05_work-packages/
13. 从 specs/*/tasks.md 提取任务 → 06_tasks/

### Phase 4：迁移验证 + 知识 + 归档

14. 迁移 engineering/测试验收 → 07_validation/
15. 迁移 governance/经验教训 + research/ → 08_knowledge/
16. 迁移 archive/ → 09_archive/
17. 拆分 执行过程.md → 06_tasks/ 各任务执行记录

### Phase 5：验证

18. 检查所有文档 YAML front matter 完整性
19. 检查双向追溯链接有效性
20. 生成最终 document-index.md
