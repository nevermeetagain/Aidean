# 控制台五问题修复 Spec

> change-id: `fix-console-five-issues` | 语言: 中文 | 版本: v1 | 创建: 2026-10-08 | 更新: 2026-10-08

> 关联：网关能力见 [implement-gateway-module](../implement-gateway-module/spec.md)；控制台工作区前身见 [redesign-console-workspace](../redesign-console-workspace/spec.md)。总规范见 [docs/governance/开发流程.md](../../governance/开发流程.md)。

---

## 为什么（Why）

用户报告 `/user/console` 控制台存在 5 个体验/能力缺口，均需穿透底层修复而非表层补丁：

1. **P1 API Key 应物理删除而非吊销**：旧 `DELETE /api/v1/user/api-keys/[id]` 仅置 `isActive=false`，Key 行残留列表；用户期望删除即消失。
2. **P2 Key 详情白字看不清 + 创建后缺用途/名称弹窗与一键复制**：`ak_…·gateway:chat·默认 60/min` 文本对比度不足；创建 Key 后无用途引导、明文复制不便。
3. **P3 自有密钥/自定义渠道说明文字看不清 + 增删改不全**：`station-keys`/`custom-channels` 板块 CRUD 通路不完整、缺站点选择器。
4. **P4 统计报表须支持指定日期 + 多渠道×模型消耗**：旧 `stats` 仅 `range` 三档预设（只读日汇总表），无法自定义区间，也无渠道×模型×计费路径多维视图。
5. **P5 调用测试台至少支持 4 种接入格式**：`CallPlayground` 与网关仅支持 OpenAI Chat / Anthropic Messages，缺 OpenAI Responses API 与 Gemini Native `generateContent`。

---

## 变更清单（What Changes）

- **M1**：`DELETE /api/v1/user/api-keys/[id]` 由吊销改为**物理删除**（`deleteApiKey` 移除整行；`UsageLog` 不引用 `apiKeyId`，删不破坏历史明细）。
- **M2**：Key 详情/列表对比度加固；创建 Key 弹窗提供三档用途预设（映射 `name`+`permissions`）+ 明文一键复制（明文仅创建响应返回一次，UI-only，API 契约不变）。
- **M3**：`station-keys`/`custom-channels` CRUD 增删改全通路补齐；新增 `GET /api/v1/user/station-keys/stations`（站点下拉数据源）；说明文字对比度加固。
- **M4**：`GET /api/v1/user/usage/stats` 新增 `dateFrom`/`dateTo` 自定义有界窗口（`USAGE_STATS_MAX_WINDOW_DAYS`）；新增 `GET /api/v1/user/usage/breakdown`（渠道×模型×计费路径多维，读 `usage_logs` 有界窗口 `groupBy`，来源优先级 channel>station>platform）；`UsageStatsPanel` 预设/自定义切换 + 多维矩阵表。
- **M5**：shared 网关契约新增**正交「接入格式层」**（`GATEWAY_ACCESS_FORMATS`=openai/anthropic/openai-responses/gemini + `detectAccessFormat`/`normalizeAccessRequest`/`serializeAccessResponse`）；chat route 边界归一为内部 OpenAI Chat（上游适配层不变）；`CallPlayground` 四种格式请求体构造与响应解析。
- **M6**：治理质量收口——tsc/lint/vitest/build 全绿 + 文档同步（API接口文档 v1.41 / CHANGELOG / check-docs-facts 基线）。

> **BREAKING**：`DELETE /api/v1/user/api-keys/[id]` 语义变更（吊销 → 物理删除）；无历史 Key 行迁移需求（删除路径无外键引用）。上游/渠道协议格式枚举 `GATEWAY_FORMATS`（openai/anthropic）保持不变，接入格式层为正交扩展、非破坏。

---

## 影响面（Impact）

- **Affected specs**：`implement-gateway-module`（网关 chat 与用量报表）、`redesign-console-workspace`（控制台面板）。
- **Affected code**：
  - 新建：`apps/web/app/api/v1/user/usage/breakdown/route.ts`、`apps/web/app/api/v1/user/station-keys/stations/route.ts`、`apps/web/app/api/v1/user/station-keys/[id]/route.ts`
  - 修改：`packages/shared/src/schemas/gateway.schema.ts`、`apps/web/app/api/v1/gateway/chat/route.ts`、`apps/web/lib/features/gateway/{service,repository,stream-parse}.ts`、`apps/web/app/api/v1/user/usage/stats/route.ts`、`apps/web/app/api/v1/user/api-keys/[id]/route.ts`、`apps/web/components/console/{ApiKeysPanel,StationKeysPanel,CustomChannelsPanel,UsageStatsPanel,CallPlayground}.tsx` 及配套 `__tests__/*.spec.ts`
  - 移动：无

---

## ADDED Requirements

### Requirement: 接入格式归一层（Access Format Normalization）

网关 SHALL 在 route 边界识别四种接入格式（`openai` Chat Completions / `anthropic` Messages / `openai-responses` Responses API / `gemini` generateContent），并将 responses/gemini 归一为内部 OpenAI Chat 后复用既有编排，上游/渠道协议适配层 SHALL NOT 因此改动。

#### Scenario: Gemini generateContent 请求归一并回填

- **WHEN** 客户端以 `{ contents:[{ role, parts:[{text}] }], systemInstruction }` 形态调用 `POST /api/v1/gateway/chat`
- **THEN** `detectAccessFormat` 判别为 `gemini`，`normalizeAccessRequest` 转为内部 OpenAI Chat 送入 `executeChat`
- **AND** 响应经 `serializeAccessResponse` 回填为 `{ candidates:[{ content:{ role:"model", parts:[{text}] } }], usageMetadata }` 体裁（强制聚合非流式）

### Requirement: 用量多维明细聚合（Usage Breakdown）

系统 SHALL 提供 `GET /api/v1/user/usage/breakdown`，按渠道×模型×计费路径多维聚合，且 SHALL 仅在有界日期窗口内读 `usage_logs` 明细（受 `USAGE_STATS_MAX_WINDOW_DAYS` 上限约束），并 SHALL 仅返回本人数据（越权防护）。

#### Scenario: 自定义窗口多维聚合来源优先级

- **WHEN** 已登录用户传 `dateFrom`+`dateTo`（跨度未越界）
- **THEN** 仓储 `groupBy([stationId,channelId,model,billingPath])` 聚合，来源优先级 channel>station>platform，名称回填限本人可见
- **AND** 非法/越界窗口 → 40000

### Requirement: 统计报表自定义日期窗口

`GET /api/v1/user/usage/stats` SHALL 在既有 `range` 三档之外支持 `dateFrom`/`dateTo`（YYYY-MM-DD）自定义窗口，二者 SHALL 成对出现，跨度 SHALL 受 `USAGE_STATS_MAX_WINDOW_DAYS` 校验，`date` 优先于 `range`。

#### Scenario: 自定义窗口零填充序列

- **WHEN** 传合法 `dateFrom`+`dateTo`
- **THEN** 只读 `usage_daily_stats` 日表返回该区间按天零填充序列 + 模型 TopN + 区间汇总
- **AND** 非法 range/窗口 → 40000

---

## MODIFIED Requirements

### Requirement: 平台 API Key 删除语义（原 `implement-gateway-module` GW-KEY-01）

原文：`DELETE /api/v1/user/api-keys/[id]` 置 `isActive=false`（吊销，留审计痕迹）。
差异（M1）：改为**物理删除**——`deleteApiKey` 移除整行；`UsageLog` 不引用 `apiKeyId`，删除不破坏历史消耗明细；0 行（不存在/非本人）→ 40000。

---

## REMOVED Requirements

（无）
