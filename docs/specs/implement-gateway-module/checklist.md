# Checklist · implement-gateway-module

> 核验规则：逐组全部通过才可宣告完成；失败项 → tasks.md 追加 Fix → 修复后重验。
> 取证标注：[命令] 确切命令执行取证；[断言] 结构/文档核验；[测试] 自动化测试通过；[人工] 描述式核验。

---

## G.1 契约与错误码

- [x] G.1.1 shared gateway 契约：入口双格式判别 union 样例 parse 各归一类；上游 usage 两命名 schema parse 通过 [测试]
  - 取证：`pnpm --filter @aidean/shared test` → 8 文件 46/46 绿（含 src/__tests__/gateway.spec.ts 6 例：双格式判别/usage 归一/渠道 upsert 契约）。
- [x] G.1.2 API 文档 §4 登记 30002~30004；errors.ts 键值一致；文首版本锚 v1.6 含 2026-08-28 [命令+断言]
  - 取证：文档锚 `> 版本：v1.6 | 更新日期：2026-08-28 | 变更：§4 增网关段登记表（30001~30004）…` grep 命中；errors.ts GATEWAY_NO_ROUTE/GATEWAY_ALL_FAILED/UPSTREAM_ERROR 与文档码位一致。

## G.2 路由链与渠道供给

- [x] G.2.1 repository：加权轮询确定性（注入随机源）断言；站点候选查询含 baseUrl 蕴含过滤 [测试]
  - 取证：gateway-svc.spec.ts `pickKeyWeighted` 注入 rng 断言确定性；listCallableStations where `baseUrl: { not: null }` + `models.has(nameDisplay)`（repository.ts:121）。
- [x] G.2.2 路由链：双形态合并取优去重（同模型 tier 1 vs priority 10 → 取 1）；请求模型链首；free 尾部且额度耗尽出链；链空 30002 [测试]
  - 取证：gateway-svc.spec.ts 9 例全绿（合并取优/链首/耗尽出链/模型缺失 30002）。

## G.3 协议与计费

- [x] G.3.1 协议适配：Anthropic 入口 → OpenAI 上游 → 回转语义等价（system/messages/usage 映射）；stream=true 40000 [测试]
  - 取证：gateway-adapters.spec.ts 12 例全绿（往返转换/超时/非 2xx 归一 30004/非 JSON）。
- [x] G.3.2 计费接线：预扣高估（缺省 max_tokens 4096）→ 捕获差额释放（实耗 < 预扣，余额按实扣、held 归零）；40001 降级下一候选；上游失败 void 零副作用；requestId 重放幂等；Key 失败达阈值冷却、冷却期流量切换 [测试]
  - 取证：gateway-orchestrator.spec.ts 13 例全绿（差额捕获/void/降级/幂等/冷却切换/自定义渠道优先）。
- [x] G.3.3 `pnpm --filter web test gateway` 全绿 [命令]
  - 取证：gateway 3 文件 34/34 绿；全量回归 `pnpm --filter web test` → 13 文件 130/130 绿（2026-08-28）。

## G.4 路由面

- [x] G.4.1 gateway/chat 未登录 401/10004；custom-channels CRUD 本人隔离 + apiKey 掩码不回显；usage 分页仅本人；生产构建无 mock 可达路径 [命令+测试]
  - 取证：routes-gateway.spec.ts 10 例全绿（未登录/40000 校验不触库/直通响应+x-aidean-* 头/掩码 `sk-****7890` 且全文无明文/0 行删除 40000）；生产构建 `pnpm --filter web build` 通过；mock 上游运行时守卫（AIDEAN_ENABLE_MOCK_UPSTREAM≠1 → 404，生产缺省不可达）。
  - Fix 记录（实施期修复，均被单测/构建捕获）：① withApi 丢弃第二参数 ctx → 动态路由 [id] PUT/DELETE 运行时 500（handler.ts 签名扩展 `(req, ctx?)`）；② repository `accountTier` 字段名错误（schema 实为 `tier`）→ 网关调用 500；③ mock 路由 `_mock/*` 为 Next 私有文件夹不生成路由 → 迁移 `mock-upstream/[...path]` catch-all；④ buildRouteChain Map 值类型缺 freeCycle → build 类型错误。
- [x] G.4.2 API 文档 §5.4 v2.0 口径重写：gateway/chat + custom-channels + usage 行、删 station-apis、API Key 行标注第二阶段、节末锚点互引（铁律 2）[断言]
  - 取证：文档 v1.6 §5.4 重写完成（G.1.2 一并落地），§2 API Key 标注第二阶段。

## G.5 收口

- [x] G.5.1 e2e gateway-flow 全绿：充值→配置→网关调用→按实扣费→usage/流水→失败 void 降级→余额恢复 [测试]
  - 取证：`pnpm exec playwright test -c e2e/playwright.config.ts` → **15/15 全绿**（含 gateway-flow 2 例：未登录 401；注册→充值 55→网关调用（故障站 30004 void → Mock 站捕获）→x-aidean-* 计费头→usage 1 条 PLATFORM 且 quotaYuan×100=quotaMinor→钱包 balance=55−实扣、held=0→流水 TOPUP+CONSUME→requestId 重放 40000 零副作用）。
  - 数据前提：seed.ts 3.9 幂等块（网关E2E故障站 rating 9.9 / 网关E2E Mock站 9.8，isVerified=false 不进公开榜单；models 蕴含 Claude 3.7 Sonnet）。
- [x] G.5.2 checklist 无未决项；git commit 留痕；MVP 四模块收官注记（天梯图/用户/余额/网关）[命令]
  - 取证：git commit 于 G.5.2 完成时落库（见仓库 log）；**MVP 四模块全部收官**：天梯图（models/stations 双榜）→ 用户系统（邮箱+JWT 双令牌）→ 余额账本（双录/hold/幂等）→ 统一计费网关（路由链/双协议/预扣捕获/免费额度/自定义渠道）。

---

## 遗留与移交

- API Key 网关鉴权（user_api_keys 表）第二阶段建表后开放；当前仅 JWT 会话。
- 流式（SSE）透传与流内降级：MVP 收敛非流式，入口 stream=true 40000 明确提示；移交第二阶段。
- /user/station-apis（用户自有站点 Key 管理）：v2.0 无表支撑，第二阶段随 user_api_keys 一并设计。
- 套餐直连计费路径（billingPath=PACKAGE）：随第二阶段套餐兑换模块接线。
- usage_logs 分区（PARTITION BY RANGE）：部署期以 raw SQL migration 落地（沿用 usage_daily_stats cron 口径）。
- ~~vitest 不做类型检查（esbuild 转译），本模块 4 个 Fix 中 2 个（Map 类型/字段名）仅 build/运行时暴露——后续可评估在 CI 加 `tsc --noEmit` 门禁。~~ ✅ 已落地（2026-08-28）：`.github/workflows/ci.yml` 实装双包 tsc --noEmit 门禁（顺带修复 2 个测试文件类型错误使门禁可绿）。
