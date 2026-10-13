# 多平台融合设计 — 三部分深度分析总报告

> 生成日期：2026-09-30
> 分析协议：AI Project Decision Review Protocol V2.1
> 分析对象：summary.md（696 行，13 章节）
> 参考文档：8 份评审文档 + 3 份规范文档 + 6 个平台源码

---

## 一、执行概要

本报告是对 Aidean 多平台融合设计方案的三部分深度分析成果汇总：

| 部分 | 任务 | 输出文档 | 状态 |
|:---:|------|----------|:---:|
| Part 1 | 交叉验证 + 查漏补缺 | `gap-analysis.md`（721 行） | ✅ 完成 |
| Part 2 | 文档体系重建 | `docs-rebuild-plan.md`（348 行） | ✅ 完成 |
| Part 3 | 项目结构重建 | `structure-rebuild-plan.md`（527 行） | ✅ 完成 |

---

## 二、Part 1：差距分析核心发现

### 2.1 需求基线

- **42 个原子需求**：22 功能（REQ-F）+ 10 非功能（REQ-NF）+ 10 约束（REQ-C）
- **6 个 MUST NOT 约束**：禁止子平台直连 LLM、禁止持久化余额等
- **4 个内部冲突**：3 个已解决，1 个未解决（CONFLICT-004 降级模式未定义）

### 2.2 证据模型

- 12 份文档已分类（CURRENT/DRAFT/REFERENCE/SUPERSEDED）
- 10 个关键声明已标注证据类型（SC/S/A/P/Authority）
- 5 个声明已检查独立性，无伪共识

### 2.3 冲突矩阵

- 5 个跨文档冲突：1 事实冲突 + 2 方案冲突 + 1 阶段冲突 + 1 假设冲突
- **CF-003 事实冲突已确认**：from_cline.md 声称 Thesis 有 SSO 模块，实际不存在

### 2.4 决策深审

- D1-D10 全部完成 Socratic 8 问 + 可逆性评估 + 重评触发条件
- **1 个不可逆决策**：D6（Thesis JWT→OIDC 替换）
- 5 个部分可逆，4 个可逆

### 2.5 代码现实检查

| 评级 | 数量 | 说明 |
|------|:---:|------|
| MATCH | 28 | 设计与代码一致 |
| PARTIAL | 5 | 部分实现 |
| DIVERGED | 2 | Fleet "10 状态机"概念误称 + BotHot DDD 空壳 |
| MISSING | 12 | Aidean Outbox/Provenance + AideanBot 网关 + BotHot 网关/余额 + ... |

### 2.6 压力测试

- **需求变化**：7 场景中 3 个可维持、2 个需扩展、2 个需发 ADR
- **组件失效**：7 场景中 3 个高风险（Hub/HMAC/网关）
- **技术变化**：8 场景中 7 个无需推翻重建

### 2.7 关键风险（修正版）

1. **AideanBot 网关未接入**：直连 8 个 provider，与设计声称冲突 — 需接入网关
2. **Aidean 事件 Outbox 未实现**：设计声称 PG Outbox + HMAC Webhook，代码完全不存在
3. **CONFLICT-004**：降级模式未定义 — 需用户补充
4. **D6 不可逆**：Thesis JWT→OIDC — 执行前需确认无外部依赖
5. **AideanCompany 平行 fleet**：与 AideanFleet 是两个独立编排系统，需明确分工
6. **BotHot 网关/余额未接入**：SSO 已接入（修正），但网关/余额仍 MISSING

### 2.8 关键修正（vs 初版分析）

| 初版判断 | 修正后 | 修正原因 |
|----------|--------|----------|
| Aidean OIDC = PARTIAL | **MATCH** | 子代理确认 7+ 端点全部实现 |
| BotHot SSO = MISSING | **MATCH** | 子代理发现与 AideanBot 相同 SSO 实现 |
| AideanBot 网关 = MATCH | **MISSING** | 子代理确认直连 8 个 provider |
| AideanCompany = 全 MISSING | **4 MATCH** | 子代理发现完整 fleet 系统（1973 .py） |
| Fleet "10 状态机" = MATCH | **DIVERGED** | 实际为 1 个 10 状态的状态机 |


### 3.2 核心产出

- 42 个需求文档（REQ-F/REQ-NF/REQ-C）
- 10 个设计决策文档（SOL-001 ~ SOL-010）
- 7 个工作包（WP-001 ~ WP-007）
- 全文档双向追溯链接
- 规范 document-index.md + project-map.md

### 3.3 迁移步骤

5 个 Phase：创建目录 → 生成需求/方案 → 迁移计划/工作包 → 迁移验证/知识 → 验证

---

## 四、Part 3：项目结构重建核心方案

### 4.1 现状 → 目标

- **Aidean Hub**：`lib/features/` 15 个扁平模块 → `apps/api/modules/` 5 核心域 + 3 业务域，每域四层分层
- **子平台**：各自异构 → 统一 `apps/<platform>/modules/` + 4 接入模块（oidc/gateway/billing/event）
- **关键差距**：无模块分层、无 contracts/、无架构 guard、无 .local/ 隔离、无 AGENTS.md

### 4.2 核心设计

1. **apps/api/ 独立提取**：API 从 Next.js 内嵌提取为独立服务
2. **四层分层**：domain → application → interfaces → infrastructure
3. **contracts/ 跨平台共享**：OIDC/计费/事件/网关/溯源 TypeScript 类型
4. **四层 Guard**：ESLint 模块边界 + dependency-cruiser + Makefile guard + CI pipeline
5. **.local/ 隔离**：data/logs/cache 全部 gitignored

### 4.3 迁移路线图

4 个 Phase（8 周）：准备 → Hub 重组 → Guard 配置 → 子平台对齐 → 验证

---

## 五、待用户确认事项

| # | 事项 | 优先级 | 阻塞 |
|:---:|------|:---:|------|
| 1 | 系统可用性目标（99.9%/99.95%） | 高 | NFR 验收 |
| 2 | 降级模式具体行为定义 | 高 | Hub 故障应对 |
| 3 | 各子平台生产域名 | 高 | OIDC redirect_uri |
| 4 | 备份 RTO/RPO 目标 | 中 | 灾备设计 |
| 5 | JWKS 缓存宽限期数值 | 中 | OIDC 实现 |
| 6 | AideanCompany 需求文档 | 中 | Phase 1 |
| 7 | HMAC 密钥生成/分发方法 | 中 | Phase 0 |
| 8 | AideanWiki 仓库地址 | 低 | Phase 2 |
| 9 | PaperFree 官方凭证 | 低 | Thesis 查重 |

---

## 六、评审协议自检清单

| # | 检查项 | 状态 |
|:---:|------|:---:|
| 1 | 需求基线已建立（原子化 + 优先级分类） | ✅ |
| 2 | 文档生命周期已标记 | ✅ |
| 3 | 证据模型已建立（SC/S/A/P/Authority） | ✅ |
| 4 | 跨文档冲突矩阵已完成（七分类） | ✅ |
| 5 | 伪共识已检查 | ✅ |
| 6 | 决策点 Socratic Challenge 已完成 | ✅ |
| 7 | 决策可逆性已评估 | ✅ |
| 8 | 重评触发条件已定义 | ✅ |
| 9 | 代码现实检查已完成 | ✅ |
| 10 | NFR 指标化已完成（缺失项已标注） | ✅ |
| 11 | 压力测试已执行（需求/失败/变化） | ✅ |
| 12 | 负证据已记录 | ✅ |
| 13 | 追溯矩阵 | ⚠️ 待建立 |
| 14 | 分析复现步骤 | ⚠️ 待定义 |
| 15 | 反证实验 | ⚠️ 待定义 |

**完成度：12/15 = 80%**，剩余 3 项为后续补充项。

---

## 七、产出文档清单

| 文档 | 路径 | 行数 | 内容 |
|------|------|:---:|------|
| 差距分析报告 | `gap-analysis.md` | 721 | 需求基线+证据+冲突+决策深审+代码现实+NFR+压力测试 |
| 文档体系重建方案 | `docs-rebuild-plan.md` | 348 | 现状审计+目标结构+迁移映射+实施步骤 |
| 项目结构重建方案 | `structure-rebuild-plan.md` | 527 | 现状审计+目标结构+Guard配置+AGENTS.md+迁移路线图 |
| **本总报告** | `executive-summary.md` | — | 三部分汇总+核心发现+待确认事项+自检清单 |

所有文档位于：`.example/参考文档/多平台融合设计/`

---

*本报告由 AI Project Decision Review Protocol V2.1 驱动生成。*
*分析范围：1 份设计方案 + 8 份评审文档 + 3 份规范文档 + 6 个平台源码 + 29 个协议模块*
