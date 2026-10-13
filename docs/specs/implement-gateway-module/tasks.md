# Tasks · implement-gateway-module

> 所属 Phase: 3 模块 4/4（MVP 收官）| 四级层级 · 六字段 | 顺序 C(契约+错误码)→R(路由链/渠道)→P(协议+计费)→U(用量/配置)→V(核验)

---

## Task G.1 契约与错误码先行 【依赖: 无 | 产出: shared gateway 契约 + 3xxxx 错误码登记】

- [x] #### SubTask G.1.1 shared 网关契约
  - 【目标】gateway.schema.ts：OpenAI 入口请求（model/messages/stream/max_tokens/temperature…）/ Anthropic 入口请求（model/messages/max_tokens/system…）判别 union；上游响应与 usage（两种命名）；GatewayUsageView 等视图 schema；gateway.constants.ts（缺省 max_tokens=4096、上游超时、冷却阈值等）
  - 【范围】新建 `packages/shared/src/schemas/gateway.schema.ts`、`packages/shared/src/constants/gateway.constants.ts`；index.ts 出口补齐
  - 【验收】shared 测试新增契约样例 parse 通过；入口判别 union 对两种格式样例各归一类
  - 【验证命令】`pnpm --filter @aidean/shared test`
  - 【产出】网关契约层
  - 【依赖】无

- [x] #### SubTask G.1.2 错误码登记与回填（先文档后代码）
  - 【目标】API 文档 §4 登记 30002 GATEWAY_NO_ROUTE / 30003 GATEWAY_ALL_FAILED / 30004 UPSTREAM_ERROR；回填 errors.ts
  - 【范围】修改 `docs/architecture/API接口文档.md`（§4 + 文首版本锚 v1.6，铁律 3）与 `apps/web/app/api/v1/_lib/errors.ts`
  - 【验收】文档码位与 errors.ts 键值一致
  - 【验证命令】Select-String 双向 grep
  - 【产出】错误码双源对齐
  - 【依赖】无

## Task G.2 路由链与渠道供给（features/gateway 核心 A） 【依赖: G.1 | 产出: 路由/渠道/Key 池】

- [x] #### SubTask G.2.1 repository：网关域数据访问
  - 【目标】路由配置三读（tier_mappings/priorities/free_quotas+当期用量）、站点候选查询（baseUrl 非空 + models 蕴含）、station_keys 加权可选与失败/冷却状态更新、custom_channels 本人查询、usage_logs 写入与分页
  - 【范围】实装 `apps/web/lib/features/gateway/repository.ts`
  - 【验收】全部查询 BigInt/Int 口径与 schema 一致；加权轮询确定性可测（注入随机源）
  - 【验证命令】单测覆盖
  - 【产出】gatewayRepository
  - 【依赖】G.1.1

- [x] #### SubTask G.2.2 service：路由链构造与降级编排
  - 【目标】buildRouteChain：请求模型链首 → 等级映射(1/2/3/4)与优先级(1~99)合并取优去重 → free 兜底（额度未耗尽）；链空 30002；免费额度 UPSERT 记账（billingPath=FREE_QUOTA）
  - 【范围】实装 `apps/web/lib/features/gateway/service.ts`（本子任务先落路由链纯函数与额度记账，调用编排随 G.3）
  - 【验收】双形态合并/取优/去重/free 尾部全分支单测；额度耗尽出链
  - 【验证命令】`pnpm --filter web test gateway`
  - 【产出】路由链能力
  - 【依赖】G.2.1

## Task G.3 协议适配与计费接线（features/gateway 核心 B） 【依赖: G.2 | 产出: 端到端调用链】

- [x] #### SubTask G.3.1 协议适配器
  - 【目标】入口 OpenAI/Anthropic 判别；上游 OpenAI（POST {base}/chat/completions, Bearer）/ Anthropic（POST {base}/v1/messages, x-api-key）双客户端；字段级双向转换（system/messages/usage 命名映射）；上游非 2xx 归一 UPSTREAM_ERROR(30004) 语义
  - 【范围】新建 `apps/web/lib/features/gateway/adapters.ts`
  - 【验收】转换往返单测（Anthropic 入口样例 → OpenAI 上游 → 回转断言语义等价）；流式入口 40000
  - 【验证命令】`pnpm --filter web test gateway`
  - 【产出】协议层
  - 【依赖】G.1.1

- [x] #### SubTask G.3.2 调用编排：预扣 → 上游 → 捕获/释放 → usage_log
  - 【目标】沿候选链×站点×Key 逐级尝试：平台路径高估预扣（requestId 幂等键，40001 移除候选续降级）→ 调用 → 2xx 按实 tokens×(单价×markup×倍率) captureHold、失败 voidHold；FREE_PROXY 路径不扣费；每请求一条 usage_logs（requestId 幂等）；Key 失败计数/冷却；全链失败 30003
  - 【范围】扩展 `apps/web/lib/features/gateway/service.ts`；复用 billingService hold 原语
  - 【验收】单测（mock 上游 + mock billing）：差额释放金额、40001 降级、void 零副作用、requestId 重放幂等、Key 冷却切换
  - 【验证命令】`pnpm --filter web test gateway`
  - 【产出】网关调用编排
  - 【依赖】G.2.2、G.3.1

## Task G.4 API 路由与 mock 上游 【依赖: G.3 | 产出: /api/v1/gateway/chat + 配置/用量 + mock】

- [x] #### SubTask G.4.1 路由三组 + dev mock 上游
  - 【目标】POST /api/v1/gateway/chat（requireUserApi → 判别 schema → 编排 → 入口同格式响应）；/api/v1/user/custom-channels GET/POST/PUT/DELETE（本人、key 掩码不回显）；GET /api/v1/user/usage（分页）；dev mock 上游仅运行时开关可用（可配置延迟/失败率/固定响应，供 e2e）
  - 【范围】新建 `apps/web/app/api/v1/gateway/chat/route.ts`、`apps/web/app/api/v1/user/custom-channels/route.ts`（+ [id] 子路由）、`apps/web/app/api/v1/user/usage/route.ts`、`apps/web/app/api/v1/mock-upstream/[...path]/route.ts`
  - 【实施注记】mock 路由原计划 `_mock/upstream/chat`——Next.js App Router `_` 前缀目录为私有文件夹不生成路由，实测 404 不可达；改为 `mock-upstream/[...path]`（catch-all 同时覆盖 OpenAI `/chat/completions` 与 Anthropic `/v1/messages` 端点后缀）+ 运行时守卫（AIDEAN_ENABLE_MOCK_UPSTREAM=1，生产缺省 404）。另修复 withApi 丢 ctx（动态路由 [id] PUT/DELETE 运行时 500）与 repository accountTier 字段名（实为 tier）。
  - 【验收】未登录 10004；Zod 失败 40000；stream=true 40000；掩码断言；生产构建无 mock 可达路径
  - 【验证命令】`pnpm --filter web build` + 路由单测
  - 【产出】网关路由面
  - 【依赖】G.3.2

## Task G.5 核验收口 【依赖: G.4 | 产出: checklist 全绿 + MVP 收官】

- [x] #### SubTask G.5.1 e2e + checklist 核验
  - 【目标】e2e 新增 gateway-flow 用例（seed mock 站点/Key/计费规则 → 注册充值 → 配置优先级 → 网关调用成功 → 余额按实扣减 → usage/流水取证 → 上游失败 void 降级 → 余额恢复）；checklist 逐条取证；CL 提交；MVP 四模块收官注记
  - 【范围】`e2e/tests/gateway-flow.spec.ts`；`docs/specs/implement-gateway-module/checklist.md`；涉及文档版本锚
  - 【验收】e2e 全绿；checklist 无未决项；git log 留痕
  - 【验证命令】`pnpm exec playwright test -c e2e/playwright.config.ts`
  - 【产出】可验收的统一计费网关 + MVP 收官
  - 【依赖】G.4.1
  - 【实施注记】e2e 15/15 全绿（含 gateway-flow 2 例）；checklist 已逐条取证；生产构建通过。用户配置类步骤（tier-mappings/priorities PUT）由既有 routes-user 单测覆盖，e2e 主链走请求模型链首+故障降级路径。
