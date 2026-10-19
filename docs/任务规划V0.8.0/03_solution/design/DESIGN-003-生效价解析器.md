# DESIGN-003 · 生效价解析器（限时优惠 + 计价口径归一）

> 版本: v0.2 | 更新: 2026-10-14 | 变更: 首次落档（任务规划V0.2.0）——合并 DESIGN-002 选行规则与 ADR-P005 归一规则为单一函数

> V0.8.0 承接说明（2026-10-19）：本文件正文为 **V0.7.0 历史表述**（基线 ffa158c，业务树 77c7952），其中的「现状/镜像/待执行」均指当时；**当前事实以 V0.8.0 的 `02_事实基线.md`、`03a_统一需求追溯矩阵.md`、`24_叠加同步与开发线裁决.md` 为准**。契约唯一源仍为 `docs/任务规划V0.5.0/contracts/`（终审 Q1 逐字核对一致）。

## 函数
`resolveEffectivePrice(modelId, at = now) → EffectivePrice`（`apps/web/lib/features/pricing/effective-price.ts`）

1. **选行**（DESIGN-002，TASK-027）：存在 `source_type=PROMOTION ∧ effective_from ≤ at < effective_until` 的行 → 取 effective_from 最新者；否则取 `is_current=true` 行（M-001 后至多 1 条）；都没有 → `null`（候选不可计费）。
2. **归一**（ADR-P005，TASK-048）：`normalizeUnitPrice(row.priceInput/priceOutput/priceCache, row.billingCurrency, row.billingUnit, fx)`；fx 读 `SystemConfig[pricing.fxUsdCny]`（请求内缓存）；不可归一 → `null` + warn 日志（不抛 500）。
3. **组装 DTO**：契约① `EffectivePriceSchema`（v0.2）；绝不包含 markupRate / tokenMultiplier。

## 调用方
| 调用方 | 现状（证据） | 改为 | 任务 |
|---|---|---|---|
| 网关候选取价 | `gateway/repository.ts:89,109` `where:{isCurrent:true}` | 调用解析器，返回与原 `prices[]` 同形（单元素） | 027（选行）/048（归一） |
| 网关预扣/结算 | `gateway/service.ts:681-704,990-1003` 读 `prices[0]` | **不改**（输入已归一） | — |
| 模型详情 / 价格页 | `/models/[slug]`、`/pricing` 读原始行 | 读 EffectivePrice | 029/053 |

## 边界
- 窗口半开 [from, until)；存 UTC，展示 Asia/Shanghai。
- per_request 计费模式不在本函数范围（billingMode≠PER_TOKEN → 原样返回并标记 `unit` 不适用：TASK-047 若发现存量 per_request 行 >0 则停止上报）。
- 精度：Decimal 字符串进入 `calcCharge` 的 decompose，归一乘法在 Decimal 字符串层完成（禁止 JS 浮点相乘后再转字符串）。

## 测试矩阵（TASK-048 至少覆盖）
CNY/per_million（恒等）· CNY/per_1k（×1000）· USD/per_million（×fx）· USD/per_1k（×1000×fx）· 未知币种 · fx 缺失 · PROMOTION 价为 0（免费）· 窗口外回落 current。
