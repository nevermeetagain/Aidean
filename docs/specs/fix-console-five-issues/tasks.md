# Tasks · 控制台五问题修复（原子化任务书）

> change-id: `fix-console-five-issues` | 版本: v1 | 四级层级说明见 [_template/tasks.md](../_template/tasks.md)《层级图例》

---

## 轨道 M · 控制台五问题分层修复

> **本级职责（L1）**：按 M1→M6 顺序穿透底层修复 5 个控制台缺口并做治理收口。前置：无。交付物：物理删除通路 + Key 用途弹窗 + CRUD 补齐 + 报表日期/多维 + 四接入格式 + 全绿门禁 + 文档同步。

### Task M.1 API Key 物理删除 【目标: 删除即消失 | 依赖: 无 | 产出: deleteApiKey 物理删除】

- [x] #### SubTask M.1.1 删除路由改物理删除
  - 【目标】`DELETE /api/v1/user/api-keys/[id]` 由 `isActive=false` 改为移除整行。
  - 【范围】修改 `apps/web/app/api/v1/user/api-keys/[id]/route.ts`、`apps/web/lib/features/apikey/service.ts`（`deleteApiKey`）。
  - 【验收】删除后行不存在、verify 该明文 → 10004；非本人/不存在 → 40000。
  - 【验证命令】`pnpm --filter web exec vitest run lib/features/apikey`
  - 【产出】apikey.spec.ts ⑩b 物理删除用例绿。
  - 【依赖】无

### Task M.2 可读性加固 + 创建 Key 用途弹窗 + 一键复制 【目标: Key 面板可读可用 | 依赖: M.1 | 产出: ApiKeysPanel 改造】

- [x] #### SubTask M.2.1 对比度加固与用途弹窗
  - 【目标】修复 `ak_…·gateway:chat·默认 60/min` 文本对比度；创建 Key 弹窗三档用途预设 + 明文一键复制。
  - 【范围】修改 `apps/web/components/console/ApiKeysPanel.tsx`（引入 `@aidean/ui` Dialog/Button/Input）。
  - 【验收】明文仅创建响应返回一次；复制按钮可用；用途预设映射 name+permissions。
  - 【验证命令】`pnpm --filter web typecheck`
  - 【产出】ApiKeysPanel 新增 `@aidean/ui` import（aidean-ui-refs 48→49）。
  - 【依赖】M.1

### Task M.3 station-keys/custom-channels CRUD 补齐 + 站点下拉 【目标: 增删改全通路 | 依赖: 无 | 产出: 2 新路由 + 面板改造】

- [x] #### SubTask M.3.1 站点下拉数据源路由
  - 【目标】提供可选站点列表供自有密钥录入下拉。
  - 【范围】新建 `apps/web/app/api/v1/user/station-keys/stations/route.ts`；补齐 `station-keys/[id]/route.ts`。
  - 【验收】未登录 10004；返回本人可见站点；route.ts 计数 +2。
  - 【验证命令】`pnpm --filter web exec vitest run lib/features/apikey`
  - 【产出】2 个新 route.ts。
  - 【依赖】无

- [x] #### SubTask M.3.2 面板 CRUD 与说明文字加固
  - 【目标】`StationKeysPanel`/`CustomChannelsPanel` CRUD 全接 + 说明文字对比度修复。
  - 【范围】修改对应 `components/console/*.tsx`。
  - 【验收】创建/更新/删除三通路 UI 可用；文字可读。
  - 【验证命令】`pnpm --filter web typecheck`
  - 【产出】两面板改造。
  - 【依赖】M.3.1

### Task M.4 统计报表日期区间 + 多维 【目标: 指定日期 + 渠道×模型×计费路径 | 依赖: 无 | 产出: breakdown 端点 + 面板】

- [x] #### SubTask M.4.1 shared 窗口校验与多维 schema
  - 【目标】新增 `validateUsageWindow`/`USAGE_STATS_MAX_WINDOW_DAYS`/`UsageBreakdown*` 契约。
  - 【范围】修改 `packages/shared/src/schemas/gateway.schema.ts`。
  - 【验收】越界窗口 → 校验失败；类型经 `index.ts` 汇出。
  - 【验证命令】`pnpm --filter @aidean/shared test`
  - 【产出】shared 契约扩展。
  - 【依赖】无

- [x] #### SubTask M.4.2 仓储多维 groupBy + 名称回填
  - 【目标】`usage_logs` 有界窗口 `groupBy([stationId,channelId,model,billingPath])` + 站点/渠道名回填（限本人）。
  - 【范围】修改 `apps/web/lib/features/gateway/repository.ts`。
  - 【验收】channel/station 名回填不越权。
  - 【验证命令】`pnpm --filter web exec vitest run lib/features/gateway`
  - 【产出】`groupUsageBySource`/`findStationNamesByIds`/`findChannelNamesByIds`。
  - 【依赖】M.4.1

- [x] #### SubTask M.4.3 service 窗口分支 + getUsageBreakdown
  - 【目标】`getUsageStats` 增日期窗口分支；新增 `getUsageBreakdown` + 纯函数 `buildUsageBreakdown`。
  - 【范围】修改 `apps/web/lib/features/gateway/service.ts`。
  - 【验收】来源优先级 channel>station>platform；billingPath 越界回落 PLATFORM；排序稳定。
  - 【验证命令】`pnpm --filter web exec vitest run lib/features/gateway/__tests__/usage-stats.spec.ts`
  - 【产出】buildUsageBreakdown 单测绿。
  - 【依赖】M.4.2

- [x] #### SubTask M.4.4 路由 + UsageStatsPanel UI
  - 【目标】stats 解析 dateFrom/dateTo；新建 breakdown 路由；面板预设/自定义切换 + 矩阵表。
  - 【范围】修改 `usage/stats/route.ts`；新建 `usage/breakdown/route.ts`；改 `components/console/UsageStatsPanel.tsx`。
  - 【验收】route.ts 计数 +1；自定义窗口生效；矩阵表渲染。
  - 【验证命令】`pnpm --filter web typecheck`
  - 【产出】breakdown 端点（route-count 124→125）。
  - 【依赖】M.4.3

### Task M.5 调用测试台 4 种接入格式 【目标: openai/anthropic/responses/gemini | 依赖: M.4 | 产出: 接入格式层】

- [x] #### SubTask M.5.1 shared 接入格式归一层
  - 【目标】`GATEWAY_ACCESS_FORMATS` + `detectAccessFormat`/`normalizeAccessRequest`/`serializeAccessResponse`（正交于 `GATEWAY_FORMATS`）。
  - 【范围】修改 `packages/shared/src/schemas/gateway.schema.ts`。
  - 【验收】responses/gemini 归一为内部 OpenAI Chat；剔除 stream；空 messages 兜底。
  - 【验证命令】`pnpm --filter @aidean/shared test`
  - 【产出】gateway.spec.ts「接入格式归一层」+5 例。
  - 【依赖】无

- [x] #### SubTask M.5.2 chat route 边界归一 + 序列化
  - 【目标】route 检测接入格式 → 归一 → 复用编排 → 回填响应体裁。
  - 【范围】修改 `apps/web/app/api/v1/gateway/chat/route.ts`、`lib/features/gateway/stream-parse.ts`（`parseAccessAggregatedBody`）。
  - 【验收】openai/anthropic 直通/流式；responses/gemini 聚合回填。
  - 【验证命令】`pnpm --filter web exec vitest run lib/features/gateway/__tests__/routes-gateway.spec.ts`
  - 【产出】routes-gateway.spec.ts ⑰ Responses + ⑱ Gemini e2e。
  - 【依赖】M.5.1

- [x] #### SubTask M.5.3 CallPlayground 四格式 UI
  - 【目标】格式选择 4 项 + 请求体构造 + 响应解析 + 流式开关（responses/gemini 强制聚合）。
  - 【范围】修改 `apps/web/components/console/CallPlayground.tsx`。
  - 【验收】四格式请求可发出、响应可解析展示。
  - 【验证命令】`pnpm --filter web typecheck`
  - 【产出】CallPlayground 接入格式改造。
  - 【依赖】M.5.2

### Task M.6 治理质量收口 【目标: 全绿门禁 + 文档同步 | 依赖: M.1-M.5 | 产出: 门禁 + 文档】

- [x] #### SubTask M.6.1 类型/测试/构建门禁
  - 【目标】tsc（web+shared）+ vitest（web+shared）+ lint + build 全绿。
  - 【范围】全仓验证命令。
  - 【验收】typecheck 0 error；web 858 tests、shared 109 tests 全绿；build `Compiled successfully` exit 0。
  - 【验证命令】`pnpm --filter web typecheck; pnpm --filter web exec vitest run; pnpm --filter @aidean/shared test; pnpm --filter web build`
  - 【产出】门禁全绿（见 checklist 全局回归）。
  - 【依赖】M.1-M.5

- [x] #### SubTask M.6.2 文档同步（铁律 3/6）
  - 【目标】API接口文档 v1.41、CHANGELOG 登记、check-docs-facts 基线同步。
  - 【范围】`docs/architecture/API接口文档.md`、`CHANGELOG.md`、`scripts/check-docs-facts.mjs`。
  - 【验收】`node scripts/check-docs-facts.mjs` 14/14；`node scripts/check-docs-rule.mjs` PASS。
  - 【验证命令】`node scripts/check-docs-facts.mjs`
  - 【产出】route-count 125 / aidean-ui-refs 49 / spec-count 115 基线对齐。
  - 【依赖】M.6.1
