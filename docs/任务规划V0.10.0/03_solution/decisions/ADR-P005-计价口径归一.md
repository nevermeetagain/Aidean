# ADR-P005 · 计价口径归一（币种 CNY + 每百万 Token）

> 版本: v0.2 | 更新: 2026-10-14 | 变更: 首次落档（任务规划V0.2.0）——提议状态（PROPOSED），汇率数值待 U-15 裁决

> V0.10.0 承接说明（2026-10-19）：本文件正文承接 V0.9.0（及更早）原文，其中「未开工/待回补」等表述均指当时；**当前事实以 `25_执行记录.md`、`17h_V0.9.0到V0.10.0差异.md`、`05_execution/task-index.md` 为准**（外部 12 卡已完成并审查；007 由 085 满足；新增 095–099）。

> V0.9.0 承接说明（2026-10-19）：本文件正文为 **V0.8.0 原文**（基线 c2da219），其中「待裁决 B-0'/APPROVE/U-22」「未开工」等表述均指当时；**当前事实以 `25_执行记录.md`、`17g_V0.8.0到V0.9.0差异.md`、`05_execution/task-index.md` 为准**（B-0' 已裁决 A'；089/026/082/027/056/058/060/057 已完成）。契约唯一源仍为 `docs/任务规划V0.5.0/contracts/`。


## 状态
PROPOSED。结构性决策（单一归一函数、计费与展示同口径、不可归一 fail-closed）由本规划提出；**汇率取值（5 / 7.2 / 后台可配）与是否追溯存量账单属用户裁决 U-15**，未裁决前 TASK-048/053/054 不下发。

## 背景（证据）
| # | 事实 | 证据 | 标签 |
|---|---|---|---|
| 1 | 需求：参数表价格统一 ￥/M Tokens，¥5=$1 换算 | `docs/product/requirements/需求文档.md` §3.2 | 已确认 |
| 2 | 网关预扣与结算直接把 `prices[0].priceInput/priceOutput` 当作「每百万 Token 人民币」传入 `calcCharge`，不读 `billingCurrency`、`billingUnit` | `apps/web/lib/features/gateway/service.ts:673-704`（estimatePrepayMinor）、`:985-1003`（settle）；`packages/shared/src/utils/billing.ts:49-64` | 已确认（静态读码） |
| 3 | 种子价格 82 条：USD 48、CNY 34 | `grep -o "priceCurrency: *'[A-Z]*'" apps/web/prisma/seed.ts \| sort \| uniq -c` | 已确认 |
| 4 | 采集 writer 写入 `billingCurrency = price.currency`（openrouter/llmstats/artificial-analysis 均为 USD），`billingUnit` 默认 `per_1k_tokens` | `apps/web/lib/sync/writers/index.ts:87-97`；`lib/sync/adapters/openrouter.ts:97` 等 | 已确认 |
| 5 | /pricing 以行内币种符号展示（USD→$），单位写死「每百万 Tokens」 | `apps/web/app/(site)/pricing/page.tsx:6,80-83` | 已确认 |
| 6 | 发现引擎价格换算用 1:7.2 | `apps/web/lib/discovery/pricing-extraction.ts:217-220` | 已确认 |
| 7 | 展示侧另有 provider-pricing 纯函数做 K→M 换算，但注释声明「不参与实际扣费链路」 | `packages/shared/src/utils/provider-pricing.ts:1-15` | 已确认 |

**推论（部分确认）**：若某 USD 计价模型走 PLATFORM 计费路径，扣费 = USD 数值按人民币计（约少收 1/5–1/7.2）；若 `billing_unit=per_1k_tokens` 的行真实含义为每千 Token，则又少收 1000 倍。是否已有真实用户扣费受影响**证据不足**（无生产环境、无真实账单数据）——TASK-049 盘点存量行口径。

## 决策（提议）
1. **唯一归一函数**：`normalizeUnitPrice(value, sourceCurrency, sourceUnit, fx)`（packages/shared，TASK-047），结果恒为 CNY / per_million_tokens。
2. **计费与展示同口径**：生效价解析器（DESIGN-002/003）返回归一价；网关、`/api/v1/models/[id]`、`/pricing` 一律消费它（TASK-048/053）。
3. **原价可见**：EffectivePrice 同时携带 sourceCurrency/sourceUnit/sourcePrice*，前台并列「官方 $y / M」（满足需求 §五.6「展示价与官方一致」——原价不被替换为换算价）。
4. **fail-closed**：未知币种、汇率缺失或 ≤0 → 该候选不可计费，降级链继续；全部不可用 → 30002。
5. **汇率不写死**：配置键 `pricing.fxUsdCny`（SystemConfig，复用既有 admin configs 端点 + 审计 + revalidatePath）。

## 被否决/待裁决的备选
- A：维持现状（不归一）——与需求 §3.2 直接冲突，且存在少收风险；否决理由来自证据 2–4。
- B：入库时统一换算为 CNY（改 writer/seed）——丢失官方原价，违反 §五.6；且需数据迁移。不选。
- C（本 ADR）：读时归一，原价保留。
- 汇率取值：①需求原文 5；②discovery 现用 7.2；③后台可配（默认值由用户给）——**U-15 BLOCKING（局部）**。

## 影响
- 资金路径：上线后 USD 模型扣费金额会上升（按汇率倍数），属用户可感变更 → 需用户确认上线时机与是否公告（U-15 子项）。
- 不改 `calcCharge` 签名与精度（BigInt 定点），故不触发 fable 券；若需改则 TASK-047 升 fable。

## 两向论证
- 支持：证据 2/3/4 同时成立时缺陷必然发生；修复点集中在一个解析器，回归面小。
- 反对：可能存在「seed 的 USD priceInput 实为已换算的人民币数值、仅币种字段写错」——若如此，归一会重复换算导致多收。**排除办法**：TASK-049 盘点 + 抽样比对官方价（人工）后再下发 TASK-048；此反证目前**未被排除**，故 TASK-048 为条件卡。
