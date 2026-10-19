# EVD-028：后台限时优惠端点 /api/v1/admin/prices/promotions

> 版本: v1.0 | 更新: 2026-10-19 | 变更: TASK-028 交付取证（REQ-F-038 / REQ-F-12；DESIGN-002；API-008..011）

关联卡：`docs/任务规划V0.9.0/05_execution/tasks/TASK-028.md`

## 1. 交付物（全部落在允许路径）

- `apps/web/app/api/v1/admin/prices/promotions/route.ts`（新建）：GET（API-008 分页列优惠）+ POST（API-009 新建优惠）。
- `apps/web/app/api/v1/admin/prices/promotions/[id]/route.ts`（新建）：PATCH（API-010）+ DELETE（API-011）。
- `apps/web/lib/features/auth/__tests__/admin-promotions.spec.ts`（新建，Prisma/guard mock，16 用例）。

## 2. 建模与关键设计（实测事实）

- **优惠即价格行**：`ModelPrice` 中 `sourceType=PROMOTION`、`isCurrent=false`，窗口为半开区间 `[effectiveFrom, effectiveUntil)`（schema `effective_until` 可空，但优惠必填）。
- **不撞部分唯一索引**：`20261014000000_model_prices_partial_current_unique` 强制「每模型至多一条 `is_current=true`」。优惠恒 `isCurrent=false`，故与当前价并存且互不冲突（这也是根治「过期后被当当前价」的写侧保证）。
- **计费口径继承（防 R9-04 漂移）**：`PromotionPriceCreateSchema` 不含 billing 字段，故 POST 从该模型当前价（`findFirst{isCurrent:true}`）派生 `billingMode/billingUnit/billingCurrency` 直落优惠行；**无当前价 → 40000**（口径无从一致）。PATCH 不改这三列，天然维持一致。
- **窗口重叠**：`findFirst{modelId, sourceType:PROMOTION, effectiveFrom<until, effectiveUntil>from}`（半开区间重叠式 `aFrom<bUntil && bFrom<aUntil`）；PATCH 追加 `id:{not:自身}`。命中 → 40000。
- **小数位 ≤6**：`Decimal(19,6)` 会静默舍入，故对提交的价格串显式判小数位 >6 → 40000（E9-11）。`DecimalStr` 正则不限制位宽，须写侧兜底。

## 3. 错误码映射（对齐 shared/src/errors.ts §错误路径）

| 场景 | 码 | HTTP |
| --- | --- | --- |
| 窗口非法（until≤from）/ 与既有重叠 | `BAD_REQUEST` 40000 | 400 |
| 计费口径无从一致（模型无当前价） | `BAD_REQUEST` 40000 | 400 |
| 价格小数位 >6 | `BAD_REQUEST` 40000 | 400 |
| 删除/修改目标非 PROMOTION | `BAD_REQUEST` 40000 | 400 |
| 指向不存在模型 | `MODEL_NOT_FOUND` 20001 | 400（不在 DEFAULT_STATUS 覆盖表，落默认） |
| zod 校验失败（含 PatchSchema.strict 拒未知键） | `BAD_REQUEST` 40000 | 400 |

## 4. 写侧不可篡改证明（验收 L42）

- POST：`PromotionPriceCreateSchema` 非 strict，`isCurrent/sourceType` 等未知键被 zod 剥离；路由再显式硬编码 `isCurrent:false, sourceType:"PROMOTION"`。单测「注入 isCurrent=true/sourceType=OFFICIAL → create data 仍 false/PROMOTION」。
- PATCH：`PromotionPricePatchSchema` 为 `.strict()`，含 `isCurrent` 的请求体直接 safeParse 失败 → 40000，`update` 未被调用；且 update data 从不写 `isCurrent/sourceType/modelId/billing`。

## 5. 验收对照（卡面 L40–L46）

| 卡面验收 | 实测（`verify.txt`） | 结论 |
| --- | --- | --- |
| 单测 ≥8 全绿 | 16 passed，`SPEC_EXIT=0` | ✅ |
| 删除 OFFICIAL 行 → 40000 | DELETE 用例（sourceType≠PROMOTION）→ 400，未删 | ✅ |
| 优惠强制 is_current=false / source_type=PROMOTION；请求体无法写 isCurrent=true | POST 注入用例 create data 恒 false/PROMOTION | ✅ |
| effectiveUntil 必填 > from；重叠 → 40000 | schema refine + 路由重叠用例 → 400 | ✅ |
| billing 三元组与当前价一致，否则 40000 | 派生当前价；无当前价 → 400 用例 | ✅ |
| 价格小数位 ≤6（E9-11） | `priceInput="1.1234567"` → 400 用例 | ✅ |
| diff 仅落允许范围 | `git status` 仅 3 项（2 路由目录/文件 + spec），`diff --name-only` 空 | ✅ |

回归四连：`WEB_TEST=0`（1232 passed \| 5 skipped；= 基线 1216 + 本卡 16）、`SHARED_TSC=0`、`SHARED_TEST=0`（210）、`WEB_TSC=0`。

## 6. 复现

见本目录 `verify.txt` 底部命令。
