# EVD-093 · ladder 读侧生效价（取证与验收映射）

> 版本: v0.1 | 更新: 2026-10-19 | 变更: TASK-093 交付取证（卡面 3 处勘误为实测 2 处；返回形状兼容性核验）

## 一、卡面 vs 实测（勘误）

卡面「目标」与 Execution Steps 1 称 repository.ts 中读 isCurrent 价格「3 处（:27/:38/:180）」改为生效价。
以实测为准逐处核对 `apps/web/lib/features/ladder/repository.ts`：

| 卡面点位 | 实为 | 是否价格读取 | 处置 |
|---|---|---|---|
| :27 | `scores: { where: { isCurrent: true }, take: 1 }` | **否**（模型评分 compositeScore 等，非价格） | **不改**（改 scores 语义错误；卡面「升级条件」要求排名口径保守） |
| :38（现活动行 40-44） | `prices: { where: { isCurrent: true }, take: 1 }`（getModelsForMatrix） | 是 | 改走 `effectivePriceWhere(at)` + `pickEffectivePrice` |
| :180（现活动行 184） | `prices` include（findModelByIdentifier） | 是 | 改走 `effectivePriceWhere(at)` + 收敛为 `[生效行]` |

**结论**：价格读取实为 **2 处**（非卡面所述 3 处）；:27 系 scores，未改并在此登记勘误。

## 二、实现要点

1. 复用只读 `apps/web/lib/features/pricing/effective-price.ts`（禁改）三 helper：
   - `effectivePriceWhere(at)` → `{OR:[{isCurrent:true},{sourceType:"PROMOTION",effectiveFrom:{lte:at},effectiveUntil:{gt:at}}]}`；
   - `pickEffectivePrice(rows, at)?.effective` → 生效行（current 分支排除 PROMOTION 脏数据、promo 优先、多条取 effectiveFrom 最新）；
   - `EFFECTIVE_PRICE_CANDIDATE_TAKE=5` 候选上限。
2. 两方法末位加可选 `at: Date = new Date()`（默认当前时刻；测试传显式 at），返回形状不变。
3. getModelsForMatrix：prices `select` 补齐 `PriceRowLike` 所需字段（priceInput/priceOutput/isCurrent/sourceType/effectiveFrom/effectiveUntil）；map 内 `const price = pickEffectivePrice(m.prices, at)?.effective ?? null;`，下游 `numOrNull(price?.priceInput/priceOutput)` 不变。
4. findModelByIdentifier：prices 候选 orderBy effectiveFrom desc；`if (!model) return null;` 后 `const picked = pickEffectivePrice(model.prices, at); return { ...model, prices: picked ? [picked.effective] : [] };`——收敛为 1 条**全字段**生效行，保留详情消费方读取的 `prices[0].billingMode/billingCurrency`（见 §三）。

## 三、消费点兼容性核验（回归不破）

- `apps/web/app/api/v1/models/[id]/route.ts`、`apps/web/app/(site)/models/[slug]/page.tsx` 均读 `m.prices[0]`（含 billingMode/billingCurrency）→ findModelByIdentifier 仍返回全字段 ModelPrice 行（仅数组长度收敛为 0/1），消费形状不变。
- gateway 的 `collapseToEffectivePrice` 仅保留 3 字段，属另一路径；ladder 保留整行，两者口径同源（`effectivePriceWhere`/`pickEffectivePrice`）。
- `ladder.spec.ts` 直接 stub `getModelsForMatrix`，不依赖 prices 内部装配 → 不受影响（已随定向 vitest 全绿）。

## 四、验收标准逐条核对

- [x] ladder 相关 vitest 全绿：定向 `vitest run lib/features/ladder` = 40 passed（3 文件，含新 spec 6 例），LADDER_SPEC_EXIT=0。
- [x] 新单测 ≥3 例：`ladder-effective-price.spec.ts` = 6 例（窗口内=优惠价 / 窗口外=当前价 / 无价=null 各覆盖矩阵与详情；并断言透传 where === `effectivePriceWhere(at)`）。
- [x] web tsc exit 0：WEB_TSC_EXIT=0。
- [x] diff 仅落在允许范围：`git diff --name-only` = `apps/web/lib/features/ladder/repository.ts`；新增仅 `ladder-effective-price.spec.ts` 与 `EVD-093/**`；未触 pricing/**、packages/shared/**、契约。
- [x] 返回形状不变 + Decimal 精度：select 后仍经 `numOrNull`（矩阵）/ 原 Prisma Decimal 透传（详情），未引入 Number 精度损失。

## 五、回归四连（占位 DATABASE_URL）

- web test：1238 passed | 5 skipped（= 028 基线 1232 + 本卡 6）。
- shared tsc exit 0；shared test 210 passed。
- 完整输出见同目录 `verify.txt`。

## 六、允许范围（git diff --name-only + 新增）

```
 M apps/web/lib/features/ladder/repository.ts
?? apps/web/lib/features/ladder/__tests__/ladder-effective-price.spec.ts
?? docs/任务规划V0.9.0/06_validation/evidence/EVD-093/**
```
