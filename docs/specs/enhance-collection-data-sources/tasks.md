# Tasks · 采集基础数据支撑来源（原子化任务书 · 归档）

> change-id: `enhance-collection-data-sources` | 版本: v1 | 四级层级说明见 `docs/specs/_template/tasks.md`《层级图例》

> 归档说明：以下 L2 任务全部完成并勾选，VERIFY 证据见各任务【验证命令】实跑结果与 checklist.md。

---

## 轨道 L0 · 现状实证基线

> **本级职责（L1）**：三源实跑探测 + llmtest 端点探测 + 调度带参核验，坐实缺口。交付物：L0 基线数据。

- [x] Task 0.1 三源与 llmtest 探测核验（openrouter/arena 需代理，llmtest composite 实测 ~50 候选，run-due 带参链路核验）

## 轨道 L1 · 模型三源周期化 + 源注册表

- [x] Task 1.1 单一真源注册表
  - 【目标】`SYNC_SOURCES` 11 源纯数据 + `MODEL_AGGREGATION_CROSS_KEYS`，与服务端工厂解耦
  - 【范围】新建 `lib/sync/sources/registry.ts`、`adapters.ts`、`registry.spec.ts`
  - 【验收】`pnpm --filter web exec vitest run lib/sync` 全绿；tsc exit 0
- [x] Task 1.2 SyncManager UI 暴露三源按源频率

## 轨道 L2 · 自定义频率管理闭环

- [x] Task 2.1 校验真源抽取
  - 【范围】新建 `lib/features/admin/script-validation.ts` + `script-validation.spec.ts`（7 用例）
  - 【验收】vitest 通过；tsc exit 0
- [x] Task 2.2 scripts CUD API
  - 【范围】改 `route.ts`（GET/POST）、新建 `[id]/route.ts`（PATCH/DELETE）、`[id]/trigger/route.ts`；`script-executor` 补软删过滤
  - 【验收】路由直调测试通过；next build 路由表含 `[id]`、`[id]/trigger`
- [x] Task 2.3 ScriptsManager 完整 CUD UI（新建/编辑 Dialog + 启停 + 触发 + 历史）

## 轨道 L3 · llmtest.cn 站点采集

- [x] Task 3.1 纯映射模块
  - 【范围】新建 `lib/discovery/llmtest.ts` + `llmtest.spec.ts`（5 用例）
  - 【验收】vitest 绿；tsc exit 0
- [x] Task 3.2 crawl 桩填充
  - 【范围】`candidate-discovery.ts` `discoverFromCrawl`（safeFetch + 逐域预检幂等），默认源加 crawl
- [x] Task 3.3 调度脚本 + seed 登记
  - 【范围】新建 `scripts/crawl/crawl_llmtest.ts`；`seed.ts` 追加 llmtest ScheduledScript 行
  - 【验证命令】`./node_modules/.bin/tsx.cmd ../../scripts/crawl/crawl_llmtest.ts --dry-run` 实测发现 50 候选

## 轨道 L4 · 安全与出网健壮性

- [x] Task 4.1 代理注入
  - 【范围】`url-policy.ts` `resolveOutboundProxy`/`getOutboundDispatcher`；新建 `url-policy-outbound.spec.ts`（默认无代理等价 getSecureDispatcher）
- [x] Task 4.2 fetchJson 重试
  - 【范围】`base.ts` `safeFetchWithRetry`（3 次退避，UnsafeUrlError 不重试）；`aggregation-adapters.spec.ts` 加 `vi.mock('node:dns/promises')` 保持 hermetic
  - 【验收】全量 vitest 959 绿；tsc exit 0

## 轨道 L5 · 门禁与文档收口

- [x] Task 5.1 三大门禁：tsc exit 0 / vitest 97 文件 959 用例 exit 0 / next build exit 0
- [x] Task 5.2 文档收口：《API接口文档》v1.45 §5.8.5、《功能设计文档》v0.8.4、《项目需求更新分析》v7.1、CHANGELOG、《未完成事项目录》#30、`check-docs-facts` 计数同步（14/14 PASS）
- [x] Task 5.3 归档本 spec
