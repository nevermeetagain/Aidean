# EVD-028：偏差记录（authorized-deviations）

> 版本: v1.0 | 更新: 2026-10-19 | 变更: TASK-028 收尾记录

## D-1 「计费口径一致」实现为「派生 + 需存在当前价」

- 卡面 L44：`billingCurrency/billingUnit/billingMode` 与该模型当前价一致，不一致 → 40000。
- 事实：`PromotionPriceCreateSchema`（冻结契约，禁改 `packages/shared/**`）**不含**这三列入参；客户端无从提交不同的 billing 值。
- 处置：POST 从模型当前价（`isCurrent=true` 行）派生三元组直落优惠行 → 由构造保证一致；**唯一可失败的分支是「模型无当前价」**，此时口径无从确立 → 40000。单测覆盖该分支与「成功派生」两路，验证 L44。
- 理由：这是对「契约欠定 + schema 冻结」下最贴近验收语义的实现；不伪造 billing，也不放宽约束。

## D-2 PATCH 合并后 `until>from` 路由校验为纵深防御

- `PromotionPricePatchSchema` 顶层 `.refine` 同时含两界且 until≤from 时即拒（schema 层）；仅提供单界时另一界为 undefined → `new Date(undefined)` Invalid → refine 亦拒（schema 层）。故路由层合并后再判 `until>from` 对「schema 合法输入」几乎不可达，保留为防御（防未来 refine 松动/直接落库前的最后一道）。

## D-3 `idempotencyKey` 仅经 schema 校验，未落库/未去重

- Create schema 含可选 `idempotencyKey`（8..64）。项目当前无幂等键存储设施；姊妹路由 `/prices` 亦无。窗口重叠校验已提供实质去重（同窗口二填必 40000）。本卡不新增基础设施（越出允许路径），故接受字段但不持久化。属契约字段的软处理，不影响验收。

## D-4 未用 `$transaction` 包裹「查重叠→写入」

- 对齐既有 `admin/prices` 兄弟路由（`findFirst` 后直接 `create/update/delete`，无事务），保持同目录一致风格与可测性（spec 直挂 `prisma.modelPrice.*`）。后台为单管理员手工录入，重叠并发窗口极小；如需强并发保证可后续在写侧加 advisory lock（非本卡范围）。

## D-5 非 PROMOTION 行的修改/删除统一用 40000

- 卡面对「删除 OFFICIAL → 40000」明确；PATCH 目标非 PROMOTION、DELETE 记录不存在亦沿用 `BAD_REQUEST` 40000（`errors.ts` §窗口非法/参数类归 40000；无专用码）。未新增错误码（避免触碰 shared 冻结码表）。

## 范围声明

本卡改动仅落 3 个允许项：`apps/web/app/api/v1/admin/prices/promotions/route.ts`、`apps/web/app/api/v1/admin/prices/promotions/[id]/route.ts`、`apps/web/lib/features/auth/__tests__/admin-promotions.spec.ts`，另加 `EVD-028/**`。GET 的 `paged(Promotion)` 投影为路由内定义（shared 无独立 Promotion 响应 DTO，且禁止新增）。未触碰禁止路径：`apps/web/app/api/v1/admin/prices/route.ts`、`apps/web/app/api/v1/admin/prices/[id]/**`、`packages/shared/**`、`docs/任务规划V0.5.0/contracts/**`、历代规划、`AGENTS.md`、`.example/history/**`。
