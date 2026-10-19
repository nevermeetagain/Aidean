# DESIGN-002：限时优惠计费生效

> 版本: v0.2 | 更新: 2026-10-14 | 变更: V0.2.0 复核沿用（V0.1.0 原文保留，增补见文末「V0.2.0 复核」）

> V0.8.0 承接说明（2026-10-19）：本文件正文为 **V0.7.0 历史表述**（基线 ffa158c，业务树 77c7952），其中的「现状/镜像/待执行」均指当时；**当前事实以 V0.8.0 的 `02_事实基线.md`、`03a_统一需求追溯矩阵.md`、`24_叠加同步与开发线裁决.md` 为准**。契约唯一源仍为 `docs/任务规划V0.5.0/contracts/`（终审 Q1 逐字核对一致）。

## 1. 规则（唯一口径，契约① EffectivePrice）
- 生效价(modelId, at) = 若存在 `source_type=PROMOTION ∧ effective_from ≤ at < effective_until` 的行（取 effective_from 最新）→ 该行价格；否则 `is_current=true` 行。
- 同一模型的优惠窗口不得重叠（写侧校验，40000）。优惠行 `is_current=false`（依赖 M-001）。
- 计费公式不变：`扣费 = (生效价 × 平台加价率) × (Token × Token 倍率)`；加价率/倍率仍只在服务端内部相乘，**不进入任何 DTO**（开发流程 §五.3）。
- 价格为 0 → 计费为 0（需求 §3.6「免费时该模型计费为 0」），usage_log 仍记录 token 与 quotaMinor=0（可观测）。
- 套餐直连（PACKAGE 路径）与用户自有 Key（UPSTREAM 路径）不受影响（它们不按平台单价计费）。

## 2. 接入点（证据）
- 网关取价：`apps/web/lib/features/gateway/repository.ts:89,109`（`where: { isCurrent: true }`）→ 改调 `resolveEffectivePrice`（TASK-027）。
- 前台展示：`/pricing`（`app/(site)/pricing/page.tsx` 读 modelPrice）、`/api/v1/models/[id]` → 返回 EffectivePrice（含原价供划线）。
- 采集写价（`lib/sync/writers`）只处理 OFFICIAL/CRAWLER 行，不得触碰 PROMOTION 行（TASK-012 验收含此断言）。

## 3. 时间与时区
存储 UTC（timestamptz）；后台输入与前台展示按 Asia/Shanghai；窗口为半开区间 [from, until)。

## 4. 测试
- 单测（TASK-027）：窗口前/中/边界(from 含、until 不含)/后、免费、无优惠、多优惠不重叠取最新、DTO 无敏感键。
- e2e（TASK-030）：mock-upstream 下「限时免费→不扣费；删除优惠→按原价逐分扣费」。

## 5. 风险
资金路径：任何 gateway 既有单测失败即回滚该接入（TASK-027 升级条件）。

## V0.2.0 复核

- 沿用，并由 **DESIGN-003** 扩展：生效价解析器在选出价格行之后、返回之前统一做币种/计价单位归一（TASK-048）。优惠行同样按其 billing_currency/billing_unit 归一。
