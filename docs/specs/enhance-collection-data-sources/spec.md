# 采集基础数据支撑来源 Spec

> change-id: `enhance-collection-data-sources` | 语言: 中文 | 版本: v1 | 创建: 2026-10-10 | 更新: 2026-10-10

> 归档说明：本 spec 为 L1-L5 全量路线实施后的 CLOSE 归档工件，忠实回填已交付内容（PLAN→SPEC→APPROVE→IMPLEMENT→VERIFY→CLOSE 循环的追溯记录）。

---

## 为什么（Why）

采集功能需增加基础数据支撑来源，且后续由用户手动添加来源。两类需求：

1. **模型信息采集**（自定义频率覆盖）：quanzil.com / arena.ai / openrouter.ai 等源需按可配置周期自动同步，并暴露到后台管理。
2. **模型 API 站信息采集**（自定义频率覆盖）：llmtest.cn / leaderboard 等站点榜单需纳入发现管线，产出候选供后台审核 promote。

现状缺口（L0 实证基线）：模型同步缺「单一真源源注册表 + 按源频率周期化」；`admin/scripts` 仅有 GET 列表 + POST 触发、缺 CUD 闭环与自定义频率管理；站点发现 crawl 源为空桩；采集出网缺健壮性重试与代理注入。

---

## 变更清单（What Changes）

- 新建模型同步**单一真源注册表**：`lib/sync/sources/registry.ts`（`SYNC_SOURCES` 11 源纯数据 + `MODEL_AGGREGATION_CROSS_KEYS`）+ `adapters.ts`（服务端工厂 `ADAPTER_REGISTRY`/`buildAdapter`/`buildCrossAdapters`）+ `registry.spec.ts` 防漂移。
- SyncManager UI 暴露三源（quanzil/arena/openrouter）按源频率周期化。
- `admin/scripts` 扩为**全 CRUD 闭环**：GET（全局 `deletedAt` 过滤 + 序列化 `params`）/POST（新建）/[id] PATCH（白名单 + 频率/启停重算 `nextRunAt`）/[id] DELETE（软删）/[id]/trigger（触发自集合 POST 迁出）；`script-executor` 补软删过滤。
- 抽出校验真源 `lib/features/admin/script-validation.ts`（`isValidScriptPath`/`validateCron`/`computeNextRunForSchedule`）。
- `ScriptsManager.tsx` 重写为完整 CUD UI（新建/编辑 Dialog + 启停 + 触发 + 历史）。
- 新建站点发现 crawl 源 `lib/discovery/llmtest.ts`（composite 榜单 → `DiscoveryCandidate`，domain 守卫 + 同批去重）；`candidate-discovery.ts` 填充 `discoverFromCrawl`（safeFetch + 逐域预检幂等），默认源加 `crawl`。
- 新建调度脚本 `scripts/crawl/crawl_llmtest.ts`（薄封装，支持 `--limit`/`--dry-run`/`--help`）；`seed.ts` 登记 llmtest 采集 ScheduledScript 行。
- 安全出网健壮性：`url-policy.ts` 新增 `resolveOutboundProxy`/`getOutboundDispatcher`（HTTP(S)_PROXY env 门控 ProxyAgent，**默认无代理与 `getSecureDispatcher` 完全等价**）；`base.ts fetchJson` 改 `safeFetchWithRetry`（5xx/网络错误 3 次退避、`UnsafeUrlError` 不重试）。

**BREAKING**：集合级 `POST /api/v1/admin/scripts` 语义由「触发」改为「新建」；触发迁至子资源 `POST /api/v1/admin/scripts/[id]/trigger`（前端与文档同步，无外部公开消费方）。

---

## 影响面（Impact）

- Affected specs：延续 `establish-dev-workflow`（流程权威）、`rebuild-admin-console-and-harden-auth`（admin 域基线）。
- Affected code：
  - 新建：`lib/sync/sources/registry.ts`、`lib/sync/sources/adapters.ts`、`lib/features/admin/script-validation.ts`、`app/api/v1/admin/scripts/[id]/route.ts`、`app/api/v1/admin/scripts/[id]/trigger/route.ts`、`lib/discovery/llmtest.ts`、`scripts/crawl/crawl_llmtest.ts`、对应 `*.spec.ts`。
  - 修改：`app/api/v1/admin/scripts/route.ts`、`lib/features/admin/script-executor.ts`、`components/admin/ScriptsManager.tsx`、`lib/discovery/candidate-discovery.ts`、`lib/security/url-policy.ts`、`lib/sync/adapters/base.ts`、`prisma/seed.ts`。
- Affected docs：《API接口文档》v1.45（§5.8.4 修订 + §5.8.5 新增）、《功能设计文档》v0.8.4、《项目需求更新分析》v7.1、《未完成事项目录》#30、CHANGELOG、`check-docs-facts.mjs`（route 128 / spec 126）。

---

## ADDED Requirements

### Requirement: 自定义频率管理闭环

后台 SHALL 提供 `ScheduledScript` 的完整增删改查与手动触发，软删行 MUST NOT 被调度或列举。

#### Scenario: 新建按频率调度

- **WHEN** 管理员 POST `/api/v1/admin/scripts` 提供 `name`、白名单内 `scriptPath`、`cronExpression` 或 `intervalDays` 至少其一
- **THEN** 校验通过后按 `intervalDays` 优先→cron 计算 `nextRunAt` 落库，写审计 action=1
- **AND** 缺频率或路径非法 → 40000

#### Scenario: 软删不再被消费

- **WHEN** DELETE `/api/v1/admin/scripts/[id]`
- **THEN** `deletedAt=now` + `isActive=false` + `nextRunAt=null`，写审计 action=3
- **AND** 后续 GET 列表与 run-due 批跑均过滤该行

### Requirement: llmtest.cn 站点采集

系统 SHALL 周期性拉取 llmtest.cn composite 榜单公开数据，映射为 `DiscoveryCandidate` 并幂等入库。

#### Scenario: dry-run 端到端探测

- **WHEN** 运行 `scripts/crawl/crawl_llmtest.ts --dry-run`
- **THEN** 经 safeFetch 拉取 composite、映射候选、按 domain 去重
- **AND** L0 基线实测输出 50 候选（与探测吻合）

### Requirement: 出网健壮性与代理注入（SSRF 现状零变化）

采集适配器 SHALL 对 5xx/网络错误退避重试；出网 MUST 在默认无代理环境下保持 SSRF 策略不变。

#### Scenario: 默认无代理等价

- **WHEN** 未配置 HTTP(S)_PROXY
- **THEN** `getOutboundDispatcher()` 与 `getSecureDispatcher()` 返回同一实例
- **AND** `UnsafeUrlError` 不触发重试立即抛出

---

## MODIFIED Requirements

集合级 `POST /api/v1/admin/scripts` 由「触发」改为「新建」（见《API接口文档》v1.45 §5.8.5）。

---

## REMOVED Requirements

（无）
