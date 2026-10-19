# EVD-093 · 授权偏差与勘误登记

> 版本: v0.1 | 更新: 2026-10-19 | 变更: TASK-093 交付偏差登记

## 勘误（卡面事实与实测不符，以实测为准）

- **K-1 价格读取点位数**：卡面「目标」/Execution Steps 1 称 3 处（:27/:38/:180）。实测 :27 是 `scores`（模型评分 compositeScore，非价格），价格读取仅 :38、:180 两处。已按「数字/事实以实测为准」改 2 处价格读取，未动 scores（改 scores 语义错误，且卡面「升级条件」要求排名口径保守）。

## 偏差（在允许范围内、不改公开契约的实现裁量）

- **D-1 返回数组长度收敛**：findModelByIdentifier 原样返回 prices 全数组；本卡改为 `prices: picked ? [picked.effective] : []`（0 或 1 条全字段行）。理由：消费方（models/[id] route、models/[slug] page）本就只读 `prices[0]`，收敛后形状兼容且不暴露多余候选行；仍保留 ModelPrice 全字段（billingMode/billingCurrency 等）以兼容详情。
- **D-2 末位可选 at 参数**：两方法加 `at: Date = new Date()`（默认当前时刻），仅为单测注入时刻，不改既有调用签名（默认参数向后兼容），返回形状不变。
- **D-3 候选行 select 面**：getModelsForMatrix 的 prices select 补齐 `PriceRowLike` 所需 6 字段（原仅 priceInput/priceOutput），以供 pickEffectivePrice 判定 isCurrent/sourceType/窗口；未新增查询次数，仍单次 findMany。

## 未偏离声明

- 未修改 `apps/web/lib/features/pricing/**`（仅只读复用三 helper）。
- 未修改 `packages/shared/**`、`docs/任务规划V0.5.0/contracts/**`（契约/DTO 冻结）。
- 未触 AGENTS.md、.example/history/**、历代规划文档。
