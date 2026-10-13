# 余额账本模块 Spec

> change-id: `implement-billing-module` | 语言: 中文 | 版本: v1 | 创建: 2026-08-28 | 更新: 2026-08-28

---

## 为什么（Why）

- MVP 四模块（天梯图 → 用户系统 → **余额** → 统一计费网关）已完成前两块并实机验收；余额账本是网关扣费的前置依赖——[implement-gateway-module](../implement-gateway-module/spec.md) 的 hold 预扣/捕获能力由本模块提供。
- 需求口径（[需求文档.md](../../product/requirements/需求文档.md) §3.5、§7）：余额制预付费，充值档位五档，付费操作预扣费失败退还，消费记录按日期分组，不足提示。
- 现状缺口：`lib/features/billing`、`lib/features/wallet` 均为 `TODO(feature)` 占位；schema v2.0 账本三表（wallets / ledger_entries / balance_holds）+ recharge_orders 已就绪未接线；API 文档无财务端点段；shared `LEDGER_ENTRY_TYPES` 与 prisma `LedgerEntryType` 枚举值不同名（契约偏差，无消费方，可安全对齐）。
- 支付渠道现实约束：微信/支付宝商户凭据未下发 → 支付以渠道抽象层承接，MVP 提供 dev mock 渠道跑通订单闭环；真实渠道接入仅替换适配器。

---

## 变更清单（What Changes）

- 实装 `lib/features/billing`：账本双录记账、hold 预扣/捕获/释放/过期懒清理、充值订单创建与渠道回调入账、流水查询、钱包完整性对账。
- 实装 `lib/features/wallet` 读侧：钱包概览（balance/held/available）。
- 新增 API 路由四组：`/api/v1/billing/wallet`、`/api/v1/billing/ledger`、`/api/v1/billing/recharge-orders`（POST 创建 + GET 列表）、`/api/v1/billing/recharge-orders/[id]/notify`。
- shared 契约对齐与扩展：`LEDGER_ENTRY_TYPES` 对齐 prisma 实况（**BREAKING** 值更替，当前零消费方，无迁移负担，不涉及归档）；`billing.schema.ts` 新增钱包/流水/下单 Zod schema。
- 错误码先登记后实现：API 文档 §4 财务段新增 40002~40005，随后回填 `errors.ts`。
- API 文档新增 §5.9 财务 billing 段（铁律 2 双向锚点互引 + 铁律 3 版本锚更新）。
- 控制台新增余额页 `/user/balance`（余额概览卡 + 充值档位下单 + 流水日期分组），控制台页加入口。

---

## 影响面（Impact）

- Affected specs: [implement-gateway-module](../implement-gateway-module/spec.md)（消费 hold 能力与扣费入账）；[establish-dev-workflow](../establish-dev-workflow/checklist.md)（Phase 3 进度 3/4）。
- Affected code:
  - 新建类：`apps/web/lib/features/billing/__tests__/*.spec.ts`、`apps/web/app/api/v1/billing/**`、`apps/web/app/(web)/user/balance/page.tsx`
  - 修改类：`packages/shared/src/constants/billing.constants.ts`、`packages/shared/src/schemas/billing.schema.ts`、`apps/web/app/api/v1/_lib/errors.ts`、`apps/web/lib/features/billing/*.ts`（占位 → 实装）、`apps/web/lib/features/wallet/{service,repository}.ts`（占位 → 读侧实装）、`apps/web/app/(web)/user/console/page.tsx`（入口）、`docs/architecture/API接口文档.md`

---

## ADDED Requirements

### Requirement: 账本双录记账

任何资金变动 SHALL 在单数据库事务内写入一条 `LedgerEntry`（direction、amountMinor 恒正、entryType、sourceType/sourceId 回链）并以乐观锁（`lockVersion` 条件更新）同步 `Wallet` 聚合列；同一 `idempotencyKey` 重复提交 SHALL 幂等返回首次结果而非报错或重复入账。

#### Scenario: 充值入账幂等

- **WHEN** 渠道回调携带同一 idempotencyKey 重放两次
- **THEN** 首次入账成功，第二次返回与首次相同的成功结果，钱包余额不变、流水仅一条
- **AND** 单测以 mock prisma 事务断言幂等分支；真实 PG 以重复 notify 请求取证

### Requirement: hold 预扣生命周期

预扣 SHALL 校验可用额（balance − held）充足，不足抛 `INSUFFICIENT_BALANCE(40001)`；创建时冻结额入账；捕获（capture）SHALL 按实际额扣减余额并释放剩余冻结、写 CONSUME 流水；作废（void）与过期 SHALL 全额释放冻结；任何 hold 操作 SHALL 顺带懒清理已过期 AUTHORIZED holds。

#### Scenario: 预扣-捕获-差额释放

- **WHEN** 用户余额 10.00 元，预扣 2.00 元后捕获实际 1.50 元
- **THEN** 余额变为 8.50 元、held 归零、流水记 CONSUME 1.50 元一条
- **AND** 余额 1.00 元时预扣 2.00 元抛 40001，wallet 与 holds 状态零变化

### Requirement: 充值订单闭环

创建订单 SHALL 生成 PENDING 订单并返回支付参数（MVP：dev mock 渠道）；渠道回调 SHALL 验签后单事务完成「订单置 PAID + TOPUP/BONUS 双条入账」；非法验签抛 40005；对非 PENDING 订单回调 SHALL 幂等返回成功。

#### Scenario: mock 渠道充值闭环

- **WHEN** dev 环境创建 55 元订单并调用 mock 回调
- **THEN** 订单 PAID、paidAt 落库，钱包余额 +55.00 元、流水 TOPUP 一条（bonus 为 0 时无 BONUS 条目）
- **AND** 错误签名回调返回 40005 且订单状态不变

### Requirement: 流水与钱包查询

钱包查询 SHALL 返回 balance/held/available（available = balance − held，分转元）；流水查询 SHALL 返回分页（默认 20 条/页）与按日期分组视图，仅限本人数据；未登录返回 10004。

#### Scenario: 未登录访问

- **WHEN** 未携带有效会话请求 GET /api/v1/billing/wallet
- **THEN** 返回 code=10004 的错误信封，HTTP 401

### Requirement: 钱包完整性对账

billing 服务 SHALL 导出 `verifyWalletIntegrity(walletId)`：校验 ΣSETTLED 流水（CREDIT−DEBIT）等于钱包 `postedCredits−postedDebits` 派生额、活跃 holds 合计等于 `heldMinor`；不一致返回差异明细。

#### Scenario: 闭环后自洽

- **WHEN** mock 充值 + 预扣捕获完成后调用对账
- **THEN** 对账通过（diff 为零），单测覆盖不一致分支的差异明细结构

### Requirement: 文档同步与错误码先行

API 文档 SHALL 新增 §5.9 财务段（含全部新端点行），文首版本锚更新；§4 错误码表 SHALL 先登记 40002~40005 再回填 `errors.ts`；§5.9 末尾 SHALL 有指向 [API架构设计方案.md](../../architecture/API架构设计方案.md) 对应锚点的互引。

#### Scenario: 铁律核验

- **WHEN** 对 API 文档执行版本标记与锚点 grep
- **THEN** 版本锚含本次日期与变更简述；§5.9 存在且含互引锚点；errors.ts 与文档码位一致
- **AND** 以 Select-String 命令取证

---

## MODIFIED Requirements

（无）

---

## REMOVED Requirements

（无）
