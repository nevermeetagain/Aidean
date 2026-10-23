# V0.12.0 架构说明（增量）

> 版本: v1.0 | 更新: 2026-10-23 | 变更: V0.12.0 规划首版（基线 main@3b9f88c）

## 一、不变的骨架
Next.js 15 App Router 单体（`apps/web`）：`app/(site)` 用户端、`app/(admin)` 管理端、`app/api/v1` REST；领域逻辑在 `lib/features/*` 与 `lib/monitoring`、`lib/discovery`；数据 Prisma → PG16；缓存/限流 Redis（可失组件 fail-open）；共享契约 `packages/shared`；UI 原语 `packages/ui`；采集脚本 `scripts/crawl/*` 由 ScheduledScript + run-due（sidecar）调度；依赖方向由 `scripts/guard/*` 守卫（features 不得反向依赖 app，业务 barrel 禁用）。

## 二、本版新增/改变的结构
```text
admin UI ──POST run──▶ monitor_run_requests(pending) ◀──领取── monitor_catalogs (run-due 每 15 分钟)
                                                              │  dueSources(cadenceCron, now)
                                                              ▼
                                                monitoring_sources.last_* / offerings
crawl_llmtest ──upsert──▶ reliability_observations(UNIQUE entity,window) ──▶ GET /stations/{id}/reliability ──▶ ReliabilitySpark
auth: change/reset ──事务──▶ users.token_version++ + refresh 吊销 ──▶ requireUserApi 比对 claims.ver
middleware(Edge) ──只依赖──▶ edge-constants.ts（零 node 依赖）
custom-channel probe ──▶ lib/features/gateway/probe.ts（https-only，解析后 IP 判定，禁重定向，3s）
@aidean/ui ── tokens.ts + PanelState ──▶ 用户端/管理端组件（codemod + raw-palette 守卫）
```

## 三、关键决策（详见 decisions/）
- ADR-0011 监控执行模型：意图表 + 调度领取，取代「只占锁」。
- ADR-0012 会话版本与 Edge 依赖隔离：ver 比对进既有回库查询；middleware 闭包零 node 依赖。
- ADR-0013 语义色令牌与主题：单一 `--color-*` 命名，六族语义类，旧名别名保留一个版本；monorepo 内 Tailwind/vitest 版本对齐。

## 四、扩展点
- 新监控源：只需实现 collector 并在 `monitoring_sources` 加行；调度、立即运行、历史、后台展示全部复用。
- 新观测来源（自有探针等）：写入同一唯一键表，`source` 维度可在后续版本加列（本版不提前建）。
- 新安全类开关：遵循 Q-12-08 的 fail-closed 口径。
