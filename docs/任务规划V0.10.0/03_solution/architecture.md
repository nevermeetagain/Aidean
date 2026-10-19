# 架构说明（规划视角）

> 版本: v0.4 | 更新: 2026-10-14 | 变更: V0.4.0——新增 lib/monitoring 层（DESIGN-004）

> V0.10.0 承接说明（2026-10-19）：本文件正文承接 V0.9.0（及更早）原文，其中「未开工/待回补」等表述均指当时；**当前事实以 `25_执行记录.md`、`17h_V0.9.0到V0.10.0差异.md`、`05_execution/task-index.md` 为准**（外部 12 卡已完成并审查；007 由 085 满足；新增 095–099）。

> V0.9.0 承接说明（2026-10-19）：本文件正文为 **V0.8.0 原文**（基线 c2da219），其中「待裁决 B-0'/APPROVE/U-22」「未开工」等表述均指当时；**当前事实以 `25_执行记录.md`、`17g_V0.8.0到V0.9.0差异.md`、`05_execution/task-index.md` 为准**（B-0' 已裁决 A'；089/026/082/027/056/058/060/057 已完成）。契约唯一源仍为 `docs/任务规划V0.5.0/contracts/`。


## 现状（main@59e83dd，已确认）
- 单体 Next.js 15.0.0 App Router（apps/web）+ packages/{shared,ui,config}，pnpm 9 + turbo；PostgreSQL 16（Prisma 6.19.3，68 model / 37 enum / 16 迁移）+ Redis；148 route.ts / 56 page.tsx。
- 分层：`app/api/v1/**/route.ts`（withApi 信封）→ `lib/features/<域>/{service,repository}` → Prisma；跨端契约在 `packages/shared`（zod）。
- 异步面：无消息队列；`revalidateTag/Path` 做缓存失效；scheduler sidecar 每分钟 run-due；OIDC back-channel HTTP。

## 本规划引入的结构变化（全部为增量，不改分层）
| 层 | 新增 | 切片 |
|---|---|---|
| 契约 | errors.ts 唯一源、system/feature-flags/favorites/promotion/search schema、price-normalization 纯函数 | S0/S2/S3/S4/S5 |
| 领域 | lib/features/{system,flags,favorites,pricing,search} | S0/S2/S3/S4/S5 |
| 数据 | 唯一一条迁移 M-001（部分唯一索引） | S1 |
| 守卫 | scripts/guard/*、scripts/audit/*、scripts/contract/*、CI e2e-skeleton job、CI lint/ui 步骤 | S0/S4/S6 |
| 生效价 | 选行（优惠优先）+ 归一（CNY/M）单函数，计费与展示共用（DESIGN-003） | S4 |

## 端口
Aidean 3000（区间 3000–3100，已确认）；子平台区间与 OIDC 回调口径见 ADR-P006（P-1/P-2 待裁决）。

## V0.4.0 架构增量
- 新增 `apps/web/lib/monitoring/{catalog,keyed,diff,probe}`（Agent-API），写入器在 `lib/sync/writers/{catalog-snapshot,offering-sync}.ts`（Agent-Data），调度脚本 `scripts/crawl/monitor_catalogs.ts`（Agent-Guard）。
- 依赖方向：monitoring → security/url-policy、db/prisma、sync/writers；**禁止** monitoring 被 components 直接 import（沿用 TASK-007 module-boundary 规则）。
- 详见 `03_solution/design/DESIGN-004-模型源监控体系.md`、`decisions/ADR-P007-第三方数据源条款凭证与监控表.md`。


## V0.7.0 增补（2026-10-17）
- 架构不变（业务树 77c7952）。新增仓库拓扑约束：执行目标仓 = 规划推送仓（ADR-P008）；在 B-0 裁决前不得在任一线上开始实现卡。
