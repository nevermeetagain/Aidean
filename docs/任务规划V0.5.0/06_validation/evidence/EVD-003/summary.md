# EVD-003 — TASK-003 GET /api/v1/system/ready（DB+Redis 就绪探针）

> 卡：TASK-003（S0 L1，REQ-NF-002 可运维性；Depends on TASK-002；Blocks 005/009/043）
> 执行者：Hark(主Agent) ｜ 所有权：Agent-API
> 时间：2026-10-15（本地）

## 交付物（均在「允许修改」范围内）

| 文件 | 动作 | 内容 |
|---|---|---|
| `apps/web/lib/features/system/readiness.ts` | 新建 | `checkDb`（`prisma.user.count({take:1})` 轻查询）/ `checkRedis`（ioredis 直连 PING+`on("error")`静默+即断）/ `getReadiness`（DB→Redis 顺序短路聚合）；各 1s `withTimeout`（对原 promise 挂 onRejected 防未处理拒绝）；判 false 前输出一行**结构化根因日志** |
| `apps/web/app/api/v1/system/ready/route.ts` | 新建 | `force-dynamic`；不可达抛 `ApiError(SERVICE_UNAVAILABLE=50010, "依赖不可用: db|redis")`；可达 `SystemReadySchema.parse(...)` 出口 |
| `apps/web/lib/features/system/__tests__/readiness.spec.ts` | 新建 | mock ioredis(on/ping/disconnect)+prisma；6 例：聚合三分支 + 超时/bad-pong/no-url 边界 + 反泄断言 |
| `apps/web/lib/features/system/__tests__/ready-route.spec.ts` | 新建 | 真调 `route.GET`，HTTP 层 3 例：200 信封 / 503+50010 "db" / 503+50010 "redis" |

## 关键设计决策（证据链）

1. **DB 探活不用裸 SQL**：规格步骤1 明示 `prisma.$queryRaw` 触发 facts 门禁 `queryraw-biz=0` → 改用 `prisma.user.count({ take: 1 })`。Grep `queryRaw` 于 `lib/features/system` = **0 匹配**；`node scripts/check-docs-facts.mjs` 复核 `✔ queryraw-biz: expected=0, actual=0`。
2. **Redis 探活不复用 `lib/db/redis.ts`**：源码坐实 `RedisLike` 无 `ping` 且 `call()` **fail-open 吞错返 fallback**（与「键不存在」同形），用它探活必把宕机判成 ok（假绿）。故在允许范围 `lib/features/system/**` 内独立用 ioredis 直连 PING + `lazyConnect`+`maxRetriesPerRequest:1`+即刻 `disconnect`。**未触碰禁改 `lib/db/**`** → 规格「阻塞条件（redis.ts 缺 ping 需改→升级 Agent-Data）」不触发。`pong==="PONG"` 严格相等，无假绿残留。
3. **HTTP 503 映射链路**：`withApi`（`app/api/v1/_lib/handler.ts`）捕获 `ApiError` 时丢弃 httpStatus，仅 `errorResponse(code,message)`；503 完全由 `DEFAULT_STATUS_BY_CODE[50010]=503`（`packages/shared/src/errors.ts`）映射。ready-route.spec 真调 handler 覆盖全链路（缺该映射会回落 400 → 断言立红，可证伪）。
4. **可运维性根因日志（REQ-NF-002）**：判 false 前输出 `{"tag":"ready-probe","dep","reason(timeout/error/bad-pong/no-url)","name","code"}`。**安全边界**：只记错误类别与原语 code，**绝不落 `error.message`**（Prisma 连接错误 message 可能内嵌含口令的连接串）与 URL。readiness.spec 以 `not.toContain("SECRET-CONN-STRING")` 反证不泄漏。
5. **route 相对 import 5 级** `../../../../../lib/...`（与既有 `api/v1/navigation/route.ts` 同构）。

## 验收逐条（证据文件）

| 验收项（TASK-003.md L38-41） | 结果 | 证据 |
|---|---|---|
| `readiness.spec.ts` 3 例通过 | **2 files / 9 tests passed**（readiness 6 + ready-route 3） | `vitest-system.txt` |
| 本地无 DB 时 curl = 503 | **live 直证**：dev:3011 指向 dead `:5499` → `HTTP 503 {code:50010,message:"依赖不可用: db"}`；依赖可达 → dev:3010 `HTTP 200 checks:{db:ok,redis:ok}` | `curl-ready-live.txt` |
| grep queryRaw 无输出 | **NO MATCH (0)** + facts `queryraw-biz=0` | `diff-scope.txt` 附注 / 本目录 |
| diff 仅在允许范围 | 仅 `app/api/v1/system/ready/**`、`lib/features/system/**`；禁改路径零改动 | `diff-scope.txt` |
| （验证命令）`pnpm --filter web exec tsc --noEmit` | **exit 0** | `tsc.txt` |

## R-1 子智能体审查（CodeReview）· 裁定 + 采纳

初审对 **4 目标文件实现/契约本身判 PASS**（核验点 1-6 全 ✅：范围合规、无假绿、503 链路真实、queryRaw 0、单测可证伪、契约严格匹配），另开列需闭环项，逐条处置：

- **B-1（Blocker，CI facts 计数门禁）**：`check-docs-facts.mjs` 的 `lib-features-count/route-count/spec-count` 因新增目录/路由/spec 而红。**驳回「本卡内 bump 计数」修法**，理由：①越出 TASK-003 允许范围（该脚本未列允许清单）；②违反 L40 显式分工「计数类断言由 TASK-009 同步」；③实测 `spec-count` 在 HEAD 已红（157≠156，TASK-077 引入未 bump），属**全 S0 批次统一让渡 TASK-009**，非本卡回归；④后续 005/006/007 仍会增路由/spec，计数须于批次末一次性同步。**采纳让渡登记**：本卡不动脚本，TASK-009 落地时 bump 三条计数，且 TASK-003 与 TASK-009 同分支于 push 前合入，红不外溢至远端主干。状态：`规划内让渡·交 TASK-009`。
- **M-1（Major）**：越界临时探针 `_t003_probe.mjs` → **已删除**，diff-scope.txt 已订正。
- **M-2（Major）+ m-1（Minor）**：503 无根因留痕、ioredis error 事件噪声 → **已实现**结构化根因日志 + `on("error")` 静默（对齐 redis.ts 既有约定），并补反泄断言。
- **m-2（Minor）**：`/ready` 与 Redis fail-open 语义冲突（接 healthcheck 风险）→ **已加头注交接注记**（强依赖；非强制 Redis 应改用 `/system/health`）；契约 503 保持不变。
- **m-3/m-4（Minor）**：summary 曾缺 `tsc.txt`/自相矛盾、验收#2 仅单测替代 → **已补 tsc.txt**、**已做 live dead-DB curl 直证 503**、措辞订正。
- **m-5（Minor）**：timeout/bad-pong/no-url 三分支无用例 → readiness.spec **已补至 6 例**。

复审采纳后复验：`vitest lib/features/system` 9 passed / `tsc --noEmit` exit 0 / live curl 双向（200 + 503）齐备。

## 完成度

四文件实现自洽、契约严格匹配、范围合规；四路验收全绿并经 R-1 审查闭环（唯一遗留 B-1 为**规划内跨卡让渡**，归 TASK-009，不阻断本卡逐卡提交）。判定：**通过，可逐卡提交并进入下一步**。
