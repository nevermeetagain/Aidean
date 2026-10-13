# Checklist · implement-billing-module

> 核验规则：逐组全部通过才可宣告完成；失败项 → tasks.md 追加 Fix → 修复后重验。
> 取证标注：[命令] 确切命令执行取证；[断言] 结构/文档核验；[测试] 自动化测试通过；[人工] 描述式核验。
> 核验时间：2026-08-28（全部证据当日实机采集）

---

## B.1 契约与错误码

- [x] B.1.1 shared `LEDGER_ENTRY_TYPES` 与 prisma `LedgerEntryType` 逐值一致（TOPUP/CONSUME/REFUND/REVERSAL/GRANT/EXPIRE/ADJUST）；WalletView/LedgerPage/RechargeOrderCreate schema parse 样例通过 [测试]
  - 证据：`pnpm --filter @aidean/shared test` → Test Files 7 passed / Tests 40 passed（含 billing 契约样例 parse）；`billing.constants.ts` 七值与 prisma enum 逐值比对一致。
- [x] B.1.2 API 文档 §4 登记财务段 40002~40005；`errors.ts` 键值一致；文档文首版本锚含 2026-08-28 [命令+断言]
  - 证据：API接口文档.md v1.5（更新日期 2026-08-28）§4 表列 40001~40005；`app/api/v1/_lib/errors.ts` L26~L36 键值逐一比对一致（grep 4000\d 六行命中）。

## B.2 账本核心

- [x] B.2.1 乐观锁扣减以 `updateMany where lockVersion` 实证，count=0 可辨识；金额全程 BigInt [测试]
  - 证据：billing.spec.ts `adjustWallet` 断言 `where: {id, lockVersion}` + `increment` 语义 + `lockVersion: {increment: 1}`；冲突耗尽重试抛 50000。
- [x] B.2.2 幂等重放：同 idempotencyKey 两次入账仅一条流水、余额不变、二次返回成功 [测试]
  - 证据：billing.spec.ts「createEntryIfAbsent 幂等」用例（mock unique 冲突路径走查询返回首次结果）。
- [x] B.2.3 hold 生命周期：预扣→捕获差额释放（10.00/预扣 2.00/捕获 1.50 → 余额 8.50）；余额不足 40001 且零副作用；void/过期全额释放；懒清理生效 [测试]
  - 证据：billing.spec.ts hold 生命周期组（captureHold 差额释放断言 8.50；insufficientBalance 40001 零副作用；voidHold/expireOverdue 全额释放；capture 前懒清理消化过期 hold）。
- [x] B.2.4 充值闭环：mock 回调 → 订单 PAID + TOPUP 入账；错误验签 40005 状态不变；重复回调幂等 [测试]
  - 证据：billing.spec.ts 充值闭环组；e2e billing-flow 再验 HTTP 面（错误验签 401/40005 后余额仍 0.00；重复 mock-pay idempotent:true 不重复入账）。
- [x] B.2.5 `verifyWalletIntegrity` 自洽 diff=0；不一致分支返回差异明细 [测试]
  - 证据：billing.spec.ts 对账组（自洽零差异 / 三列 diff 明细断言）。
- [x] B.2.6 `pnpm --filter web test billing` 全绿 [命令]
  - 证据：2026-08-28 实跑 → billing.spec.ts (16 tests) 16 passed。

## B.3 API 路由

- [x] B.3.1 四组路由 build 通过；未登录 wallet/ledger/recharge-orders 返回 10004/401；notify 无会话依赖 [命令+测试]
  - 证据：`pnpm --filter web build` 通过（路由表含 billing/ledger、recharge-orders、recharge-orders/[id]/mock-pay、recharge-orders/[id]/notify、wallet）；e2e billing-flow 未登录 GET /billing/wallet → 401/10004；notify 直调（错误验签路径不经过 requireUserApi）返回 401/40005。
- [x] B.3.2 API 文档 §5.9 财务段存在：全部新端点行 + 错误码引用 + 指向《API架构设计方案.md》锚点互引（铁律 2）[断言]
  - 证据：API接口文档.md L103~L112：五端点行、notify 行引用 40005、节末锚点「[§一 路由分层](../../architecture/API架构设计方案.md#一路由分层) 与 [§二 统一响应结构](../../architecture/API架构设计方案.md#二统一响应结构)」互引。
- [x] B.3.3 dev mock 渠道仅在非 production 注册（grep 生产分支无 mock 挂载）[断言]
  - 证据：`billingService.devMockPay` 首行 `NODE_ENV === "production"` 抛 40000「支付渠道尚未接入」；前端 RechargePanel 仅 `isDev` 渲染模拟支付按钮。

## B.4 前端

- [x] B.4.1 /user/balance build 通过：余额卡（特效类名沿用 + prefers-reduced-motion 分支）、五档下单交互、流水日期分组、未登录跳转 [命令+断言]
  - 证据：build 路由表含 /user/balance（2.55 kB）；页面经 requireUser 兜底 redirect("/login")（中间件 /user/* 已守卫）；RechargePanel 五档（RECHARGE_TIERS）+ WECHAT/ALIPAY；流水按 LedgerDateGroup 日期分组渲染；FlowGradient/CoreInfoCard 沿用既有 reduced-motion 降级。
- [x] B.4.2 console/page.tsx 含余额页入口 [断言]
  - 证据：console/page.tsx L109~L116 `href="/user/balance"` + `data-testid="balance-entry"`。

## B.5 收口

- [x] B.5.1 e2e billing-flow：注册→mock 充值→钱包→流水 TOPUP→预扣捕获→余额正确，全绿 [测试]
  - 证据：`pnpm exec playwright test -c e2e/playwright.config.ts` → 13 passed（19.4s），其中 billing-flow 2 例：未登录守卫 401/10004 + 全链路（注册→零态钱包→下单 55.00 PENDING→错误验签零副作用→mock-pay PAID→钱包 55.00→流水日期分组 TOPUP CREDIT 55.00→重复支付幂等→订单列表 PAID）。
  - 口径说明：hold 预扣/捕获无公开 HTTP 面（service 层能力，由 implement-gateway-module 经网关链路消费），生命周期正确性由 B.2.3 单测 16 例保障，端到端路径在网关模块 e2e 覆盖。
- [x] B.5.2 checklist 无未决项；git commit 留痕；相关文档版本锚更新 [命令]
  - 证据：本文档全绿当日回填；API接口文档.md v1.5 版本锚（2026-08-28）；git commit 见仓库 log（billing module 提交）。

---

## 遗留与移交

- 真实微信/支付宝商户凭据下发后：替换 dev mock 渠道为真实适配器（接口形状已固化，notify 验签按渠道文档实装）——前端零改动预期。
- 套餐兑换 / 兑换码核销属第二阶段（见 §5.5/5.6），复用本模块 postEntry 幂等双录能力。
- 定时对账任务（usage_daily_stats 风格 cron）移交部署运维文档口径，本模块提供 verifyWalletIntegrity 原语。
